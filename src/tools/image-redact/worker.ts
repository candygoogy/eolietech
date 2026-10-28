/// <reference lib="webworker" />
/**
 * image-redact worker. "open" decodes the file once (JPEG with its EXIF orientation applied, see
 * image-shared/codecs.ts), keeps the pixels, and sends back a downscaled ImageBitmap of those same
 * pixels for the preview, so the boxes drawn on screen and the boxes painted here share one
 * coordinate space even for sideways phone photos (as in the cropper). "redact" copies the full
 * resolution pixels, applies the effect to every box (effects.ts, plain JS) and encodes the copy.
 * The encoders write pixels only, so the saved file carries no EXIF or other metadata.
 */
import { decode, encode } from "../image-shared/codecs";
import { sniffFormat, type RasterFormat } from "../image-shared/formats";
import type { JobErrorCode } from "../image-shared/protocol";
import { applyAll, type Effect } from "./effects";
import type { Box } from "./geometry";

/** "heic": the bytes are a HEIC photo, which the page sends to the converter instead. */
export type RedactErrorCode = JobErrorCode | "heic";

export type RedactRequest =
  | { type: "open"; id: number; buffer: ArrayBuffer; previewMax: number }
  | {
      type: "redact";
      id: number;
      image: number;
      boxes: Box[];
      effect: Effect;
      strength: number;
      format: RasterFormat;
      quality: number;
    };

export type RedactResponse =
  | { type: "opened"; id: number; width: number; height: number; format: RasterFormat; preview: ImageBitmap }
  | { type: "redacted"; id: number; buffer: ArrayBuffer; width: number; height: number; format: RasterFormat; flattened: boolean }
  | { type: "error"; id: number; code: RedactErrorCode; detail?: string };

const ALLOWED: readonly RasterFormat[] = ["jpg", "png", "webp", "avif"];

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: RedactResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

/** The open image: decoded once, redacted as often as the user likes. */
let current: { id: number; img: ImageData } | null = null;

scope.addEventListener("message", (event: MessageEvent<RedactRequest>) => {
  const msg = event.data;
  if (msg.type === "open") void open(msg.id, msg.buffer, msg.previewMax);
  else void redact(msg);
});

async function open(id: number, buffer: ArrayBuffer, previewMax: number) {
  // Free the previous image before decoding the next one.
  current = null;
  const format = sniffFormat(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64)));
  if (!format) return post({ type: "error", id, code: "decode" });
  if (format === "heic") return post({ type: "error", id, code: "heic" });
  if (!ALLOWED.includes(format)) return post({ type: "error", id, code: "unsupported" });
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

async function redact(msg: Extract<RedactRequest, { type: "redact" }>) {
  const { id } = msg;
  if (!current || current.id !== msg.image) return post({ type: "error", id, code: "generic", detail: "no image" });
  try {
    const src = current.img;
    // Always a copy: the source stays intact for the next save, and the JPEG encoder flattens in place.
    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    applyAll(out, msg.boxes, msg.effect, msg.strength);
    const encoded = await encode(out, msg.format, msg.quality);
    post(
      { type: "redacted", id, buffer: encoded.buffer, width: out.width, height: out.height, format: msg.format, flattened: encoded.flattened },
      [encoded.buffer],
    );
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
