/// <reference lib="webworker" />
/**
 * image-crop worker. "open" decodes the file once (JPEG with its EXIF orientation applied, see
 * image-shared/codecs.ts), keeps the pixels, and sends back a downscaled ImageBitmap of those same
 * pixels for the preview. The preview is never the browser's own decode of the file, so the box the
 * user draws and the rectangle cut here are in one coordinate space even for sideways phone photos.
 * "crop" copies the rectangle out at full resolution and encodes it.
 */
import { decode, encode } from "../image-shared/codecs";
import { sniffFormat, type RasterFormat } from "../image-shared/formats";
import type { JobErrorCode } from "../image-shared/protocol";
import type { Rect } from "./crop";

export type CropRequest =
  | { type: "open"; id: number; buffer: ArrayBuffer; previewMax: number }
  | { type: "crop"; id: number; image: number; rect: Rect; format: RasterFormat; quality: number };

export type CropResponse =
  | { type: "opened"; id: number; width: number; height: number; format: RasterFormat; preview: ImageBitmap }
  | { type: "cropped"; id: number; buffer: ArrayBuffer; width: number; height: number; format: RasterFormat; flattened: boolean }
  | { type: "error"; id: number; code: JobErrorCode; detail?: string };

const ALLOWED: readonly RasterFormat[] = ["jpg", "png", "webp", "avif"];

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: CropResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

/** The open image: decoded once, cropped as often as the user likes. */
let current: { id: number; img: ImageData } | null = null;

scope.addEventListener("message", (event: MessageEvent<CropRequest>) => {
  const msg = event.data;
  if (msg.type === "open") void open(msg.id, msg.buffer, msg.previewMax);
  else void crop(msg.id, msg.image, msg.rect, msg.format, msg.quality);
});

async function open(id: number, buffer: ArrayBuffer, previewMax: number) {
  // Free the previous image before decoding the next one.
  current = null;
  const format = sniffFormat(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64)));
  if (!format) return post({ type: "error", id, code: "decode" });
  if (format === "heic" || !ALLOWED.includes(format)) return post({ type: "error", id, code: "unsupported" });
  try {
    const img = await decode(buffer, format);
    const preview = await previewOf(img, previewMax);
    current = { id, img };
    post({ type: "opened", id, width: img.width, height: img.height, format, preview }, [preview]);
  } catch (err) {
    post({ type: "error", id, code: classify(err, "decode"), detail: String(err) });
  }
}

/** A bitmap of the decoded pixels, scaled to fit `max` on its long side. */
async function previewOf(img: ImageData, max: number): Promise<ImageBitmap> {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1) return createImageBitmap(img);
  const resizeWidth = Math.max(1, Math.round(img.width * scale));
  const resizeHeight = Math.max(1, Math.round(img.height * scale));
  try {
    return await createImageBitmap(img, { resizeWidth, resizeHeight, resizeQuality: "high" });
  } catch {
    // Browsers without the resize options: full size works, it only costs memory.
    return createImageBitmap(img);
  }
}

async function crop(id: number, image: number, rect: Rect, format: RasterFormat, quality: number) {
  if (!current || current.id !== image) return post({ type: "error", id, code: "generic", detail: "no image" });
  try {
    const src = current.img;
    const x = Math.max(0, Math.min(Math.round(rect.x), src.width - 1));
    const y = Math.max(0, Math.min(Math.round(rect.y), src.height - 1));
    const w = Math.max(1, Math.min(Math.round(rect.w), src.width - x));
    const h = Math.max(1, Math.min(Math.round(rect.h), src.height - y));
    // Always a copy: the JPEG encoder flattens transparency in place, and the source must stay intact.
    const out = new Uint8ClampedArray(w * h * 4);
    const rowBytes = w * 4;
    for (let row = 0; row < h; row++) {
      const from = ((y + row) * src.width + x) * 4;
      out.set(src.data.subarray(from, from + rowBytes), row * rowBytes);
    }
    const encoded = await encode(new ImageData(out, w, h), format, quality);
    post({ type: "cropped", id, buffer: encoded.buffer, width: w, height: h, format, flattened: encoded.flattened }, [encoded.buffer]);
  } catch (err) {
    post({ type: "error", id, code: classify(err, "generic"), detail: String(err) });
  }
}

function classify(err: unknown, fallback: JobErrorCode): JobErrorCode {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("unsupported")) return "unsupported";
  if (err instanceof RangeError || msg.includes("memory") || msg.includes("allocation")) return "memory";
  return fallback;
}
