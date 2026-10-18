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
 */
import decodeJpeg, { init as initJpegDec } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEnc } from "@jsquash/jpeg/encode.js";
import decodePng, { init as initPngDec } from "@jsquash/png/decode.js";
import decodeWebp, { init as initWebpDec } from "@jsquash/webp/decode.js";
import encodeWebp, { init as initWebpEnc } from "@jsquash/webp/encode.js";
import decodeAvif, { init as initAvifDec } from "@jsquash/avif/decode.js";
import avifEncFactory from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions as avifDefaults } from "@jsquash/avif/meta.js";
import { initEmscriptenModule } from "@jsquash/avif/utils.js";
import initOxipng, { optimise_raw } from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
import resizeImage, { initResize } from "@jsquash/resize";

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

import { encodeParams, fitWithin, flattenAlpha, type InputFormat, type RasterFormat } from "./formats";

/** Emscripten `locateFile`: map the codec's own wasm file name to our emitted asset URL. */
const locate =
  (files: Record<string, string>) =>
  (path: string): string =>
    files[path] ?? path;

const once = <T>(fn: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= fn());
};

const jpegDecReady = once(() => initJpegDec({ locateFile: locate({ "mozjpeg_dec.wasm": jpegDecWasm }) }));
const jpegEncReady = once(() => initJpegEnc({ locateFile: locate({ "mozjpeg_enc.wasm": jpegEncWasm }) }));
const pngReady = once(() => initPngDec(pngWasm));
const webpDecReady = once(() => initWebpDec({ locateFile: locate({ "webp_dec.wasm": webpDecWasm }) }));
const webpEncReady = once(() =>
  initWebpEnc({ locateFile: locate({ "webp_enc.wasm": webpEncWasm, "webp_enc_simd.wasm": webpEncSimdWasm }) }),
);
const avifDecReady = once(() => initAvifDec({ locateFile: locate({ "avif_dec.wasm": avifDecWasm }) }));
const avifEncReady = once(() =>
  initEmscriptenModule(avifEncFactory, undefined, { locateFile: locate({ "avif_enc.wasm": avifEncWasm }) }),
);
const oxipngReady = once(() => initOxipng(oxipngWasm));
const resizeReady = once(() => initResize(resizeWasm));

/** Decode a still image to 8-bit RGBA. HEIC is handled by the heic-to-jpg worker itself. */
export async function decode(buffer: ArrayBuffer, format: Exclude<InputFormat, "heic">): Promise<ImageData> {
  switch (format) {
    case "jpg":
      await jpegDecReady();
      // preserveOrientation: apply the EXIF orientation so phone photos come out upright.
      return decodeJpeg(buffer, { preserveOrientation: true });
    case "png":
      await pngReady();
      return decodePng(buffer);
    case "webp":
      await webpDecReady();
      return decodeWebp(buffer);
    case "avif": {
      await avifDecReady();
      const img = await decodeAvif(buffer);
      if (!img) throw new Error("AVIF decode failed");
      return img as ImageData;
    }
  }
}

/** Downscale to fit max bounds (Lanczos3, linear light); returns the input when no resize is needed. */
export async function fit(img: ImageData, maxW?: number | null, maxH?: number | null): Promise<ImageData> {
  const { width, height } = fitWithin(img.width, img.height, maxW, maxH);
  return resizeTo(img, width, height);
}

/** Resample to exactly width x height (Lanczos3, linear light; up or down); returns the input when the size is unchanged. */
export async function resizeTo(img: ImageData, width: number, height: number): Promise<ImageData> {
  if (width === img.width && height === img.height) return img;
  await resizeReady();
  return resizeImage(img, { width, height, method: "lanczos3", fitMethod: "stretch", premultiply: true, linearRGB: true });
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
      await jpegEncReady();
      return { buffer: await encodeJpeg(img, options), flattened };
    }
    case "webp":
      await webpEncReady();
      return { buffer: await encodeWebp(img, options), flattened: false };
    case "avif": {
      const mod = await avifEncReady();
      const out = mod.encode(new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength), img.width, img.height, {
        ...avifDefaults,
        ...options,
      });
      if (!out) throw new Error("AVIF encode failed");
      return { buffer: copyOut(out), flattened: false };
    }
    case "png": {
      await oxipngReady();
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
