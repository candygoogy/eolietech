/**
 * Worker-side codecs (jSquash/Squoosh WASM). Only imported from worker.ts files.
 *
 * Every .wasm file is imported with `?url`, so Vite emits it as a same-origin static asset and we
 * hand the URL to the codec explicitly (works in dev, where dependency pre-bundling breaks the
 * codecs' own `new URL(..., import.meta.url)` lookup, and in the production build).
 *
 * Single-threaded builds only: the AVIF encoder and oxipng are imported from their ST entry points,
 * because the packages' auto-detection would pick the multi-threaded builds on cross-origin-isolated
 * pages (oxipng's MT glue needs `new Function`, which the CSP blocks).
 *
 * The codec modules are loaded here rather than through the jSquash wrappers, which keep their first
 * init promise (failed or not) for the life of the worker. The calls into them are the wrappers' own.
 */
import jpegDecFactory from "@jsquash/jpeg/codec/dec/mozjpeg_dec.js";
import jpegEncFactory from "@jsquash/jpeg/codec/enc/mozjpeg_enc.js";
import { defaultOptions as jpegDefaults } from "@jsquash/jpeg/meta.js";
import initPng, { decode as decodePngRgba } from "@jsquash/png/codec/pkg/squoosh_png.js";
import webpDecFactory from "@jsquash/webp/codec/dec/webp_dec.js";
import encodeWebp, { init as initWebpEnc } from "@jsquash/webp/encode.js";
import avifDecFactory from "@jsquash/avif/codec/dec/avif_dec.js";
import avifEncFactory from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions as avifDefaults } from "@jsquash/avif/meta.js";
import { initEmscriptenModule } from "@jsquash/avif/utils.js";
import initOxipng, { optimise_raw } from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
import initResize, { resize as resizeRgba } from "@jsquash/resize/lib/resize/pkg/squoosh_resize.js";

import jpegDecWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?url";
import jpegEncWasm from "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url";
import pngWasm from "@jsquash/png/codec/pkg/squoosh_png_bg.wasm?url";
import webpDecWasm from "@jsquash/webp/codec/dec/webp_dec.wasm?url";
import webpEncWasm from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import webpEncSimdWasm from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";
import avifDecWasm from "@jsquash/avif/codec/dec/avif_dec.wasm?url";
import avifEncWasm from "@jsquash/avif/codec/enc/avif_enc.wasm?url";
import oxipngWasm from "@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url";
import resizeWasm from "@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?url";

import {
  applyTransforms,
  avifTransforms,
  encodeParams,
  fitWithin,
  flattenAlpha,
  jpegComponents,
  WEBP_MAX_SIDE,
  type InputFormat,
  type RasterFormat,
} from "./formats";
import { JobError } from "./protocol";

/** Emscripten `locateFile`: map the codec's own wasm file name to our emitted asset URL. */
const locate =
  (files: Record<string, string>) =>
  (path: string): string =>
    files[path] ?? path;

/**
 * Lazy codec init, shared by every later file. A failed init (offline, a fetch that broke) is not
 * kept: the next file tries again instead of every file failing until the page is reloaded.
 * `reset` drops a loaded instance too (after an abort, so the next file gets a fresh one).
 */
export function lazy<T>(load: () => Promise<T>): (() => Promise<T>) & { reset: () => void } {
  let p: Promise<T> | undefined;
  const get = () =>
    (p ??= Promise.resolve()
      .then(load)
      .catch((err: unknown) => {
        p = undefined;
        throw err;
      }));
  return Object.assign(get, {
    reset: () => {
      p = undefined;
    },
  });
}

const jpegDec = lazy(() =>
  initEmscriptenModule(jpegDecFactory, undefined, { locateFile: locate({ "mozjpeg_dec.wasm": jpegDecWasm }) }),
);
const jpegEnc = lazy(() =>
  initEmscriptenModule(jpegEncFactory, undefined, { locateFile: locate({ "mozjpeg_enc.wasm": jpegEncWasm }) }),
);
const pngDec = lazy(() => initPng(pngWasm));
const webpDec = lazy(() =>
  initEmscriptenModule(webpDecFactory, undefined, { locateFile: locate({ "webp_dec.wasm": webpDecWasm }) }),
);
// jSquash's WebP encoder init picks the SIMD build when it can; every call replaces its module.
const webpEnc = lazy(() =>
  initWebpEnc({ locateFile: locate({ "webp_enc.wasm": webpEncWasm, "webp_enc_simd.wasm": webpEncSimdWasm }) }),
);
const avifDec = lazy(() =>
  initEmscriptenModule(avifDecFactory, undefined, { locateFile: locate({ "avif_dec.wasm": avifDecWasm }) }),
);
const avifEnc = lazy(() =>
  initEmscriptenModule(avifEncFactory, undefined, { locateFile: locate({ "avif_enc.wasm": avifEncWasm }) }),
);
const oxipng = lazy(() => initOxipng(oxipngWasm));
const resizer = lazy(() => initResize(resizeWasm));

const ABORTED = /\baborted\(/i;

/**
 * Run a call into an Emscripten codec. A trap drops the instance, so the next file gets a fresh one
 * (and the memory it grew can be freed). An abort ("Aborted()": in these codecs, malloc failing on
 * a very large image) is reported as out of memory, not as a damaged file.
 */
async function guarded<T>(codec: { reset: () => void }, call: () => T | Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof WebAssembly.RuntimeError || ABORTED.test(String(err))) codec.reset();
    if (ABORTED.test(String(err))) throw new JobError("memory", undefined, String(err));
    throw err;
  }
}

/** Decode a still image to 8-bit RGBA. HEIC is handled by the heic-to-jpg worker itself. */
export async function decode(buffer: ArrayBuffer, format: Exclude<InputFormat, "heic">): Promise<ImageData> {
  switch (format) {
    case "jpg": {
      // The decoder cannot convert CMYK; it would only say "exit(1)", which reads as a damaged file.
      if (jpegComponents(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 1 << 20))) === 4) {
        throw new JobError("unsupported", "cmyk");
      }
      const mod = await jpegDec();
      // preserveOrientation: apply the EXIF orientation so phone photos come out upright.
      return checked(await guarded(jpegDec, () => mod.decode(buffer, true)));
    }
    case "png": {
      await pngDec();
      try {
        return checked(decodePngRgba(new Uint8Array(buffer)));
      } catch (err) {
        // Rust stops with a bare trap both on a bug and when an allocation fails; on a very large
        // image (8-bit RGBA over 256 MB) the allocation is by far the likelier.
        const ihdr = buffer.byteLength >= 24 ? new DataView(buffer, 16, 8) : null;
        const px = ihdr ? ihdr.getUint32(0) * ihdr.getUint32(4) : 0;
        if (err instanceof WebAssembly.RuntimeError && px * 4 > 256 * 2 ** 20) throw new JobError("memory", undefined, String(err));
        throw err;
      }
    }
    case "webp": {
      const mod = await webpDec();
      return checked(await guarded(webpDec, () => mod.decode(buffer)));
    }
    case "avif": {
      const mod = await avifDec();
      const img = checked(await guarded(avifDec, () => mod.decode(buffer, 8)));
      // libavif hands back the pixels as stored; the turn and flip (irot, imir) are applied here.
      const ops = avifTransforms(new Uint8Array(buffer));
      if (ops.length === 0) return img;
      // With at least one step, applyTransforms returns new pixels in a plain ArrayBuffer.
      const out = applyTransforms(img, ops);
      return new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, out.width, out.height);
    }
  }
}

function checked(img: ImageData | null): ImageData {
  if (!img) throw new Error("Decoding error");
  return img;
}

/** Downscale to fit max bounds (Lanczos3, linear light); returns the input when no resize is needed. */
export async function fit(img: ImageData, maxW?: number | null, maxH?: number | null): Promise<ImageData> {
  const { width, height } = fitWithin(img.width, img.height, maxW, maxH);
  return resizeTo(img, width, height);
}

/** Resample to exactly width x height (Lanczos3, linear light; up or down); returns the input when the size is unchanged. */
export async function resizeTo(img: ImageData, width: number, height: number): Promise<ImageData> {
  if (width === img.width && height === img.height) return img;
  await resizer();
  // jSquash resize's own call for lanczos3 (method 3), fitMethod "stretch", premultiplied, linear RGB.
  const src = new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  const out = resizeRgba(src, img.width, img.height, width, height, 3, true, true);
  // wasm-bindgen hands back a copy out of WASM memory, in its own ArrayBuffer.
  return new ImageData(new Uint8ClampedArray(out.buffer as ArrayBuffer, out.byteOffset, out.byteLength), width, height);
}

/** Encode RGBA pixels. For JPEG, transparent pixels are flattened onto white first. */
export async function encode(
  img: ImageData,
  format: RasterFormat,
  quality: number,
): Promise<{ buffer: ArrayBuffer; flattened: boolean }> {
  const { options } = encodeParams(format, quality);
  switch (format) {
    case "jpg": {
      const flattened = flattenAlpha(img.data);
      const mod = await jpegEnc();
      const out = await guarded(jpegEnc, () => mod.encode(img.data, img.width, img.height, { ...jpegDefaults, ...options }));
      return { buffer: copyOut(out), flattened };
    }
    case "webp": {
      // The encoder would only say "Encoding error."; Resize allows sides up to 20000 px.
      if (img.width > WEBP_MAX_SIDE || img.height > WEBP_MAX_SIDE) throw new JobError("memory", "webpTooLarge");
      await webpEnc();
      return { buffer: await guarded(webpEnc, () => encodeWebp(img, options)), flattened: false };
    }
    case "avif": {
      const mod = await avifEnc();
      const pixels = new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);
      const out = await guarded(avifEnc, () => mod.encode(pixels, img.width, img.height, { ...avifDefaults, ...options }));
      if (!out) {
        // Measured: a 12000 x 9000 image fills the encoder's 2 GB and it returns nothing. Drop the
        // instance so that memory can go; JPG and WebP still work at this size.
        avifEnc.reset();
        throw new JobError("memory", "avifTooLarge");
      }
      return { buffer: copyOut(out), flattened: false };
    }
    case "png": {
      await oxipng();
      const out = optimise_raw(
        img.data,
        img.width,
        img.height,
        options.level as number,
        options.interlace as boolean,
        options.optimiseAlpha as boolean,
      );
      return { buffer: copyOut(out), flattened: false };
    }
  }
}

/** Copy a view into a standalone ArrayBuffer (safe to transfer, never a view into WASM memory). */
function copyOut(view: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}
