/// <reference lib="webworker" />
/**
 * image-to-pdf worker. Builds one PDF from a list of images, one page each, in list order.
 *   - JPG and PNG are embedded as they are (pdf-lib embedJpg / embedPng): no re-encoding. A JPEG's
 *     EXIF orientation is applied by the page's drawing matrix (pdf-build.ts), not by touching pixels.
 *     Its metadata (EXIF with GPS, XMP, comments) is cut out first, losslessly, with the EXIF
 *     remover's segment rewriter, so the PDF does not carry where a photo was taken.
 *   - WebP, AVIF (jSquash) and HEIC (heic-to, as in heic-to-jpg/worker.ts) have no PDF form, so they
 *     are decoded and re-encoded once: PNG when the source is lossless or transparent, else JPG 92.
 *   - A JPG or PNG that pdf-lib cannot parse (odd encoder, animated PNG) takes that decode route too.
 * Files arrive as File objects (no copy) and are read one at a time, so memory holds one source
 * image plus the PDF so far.
 */
import { PDFDocument, type PDFImage } from "pdf-lib";
import { cleanJpeg } from "../exif-remover/jpeg";
import { decode, encode } from "../image-shared/codecs";
import { sniffFormat } from "../image-shared/formats";
import type { JobErrorCode } from "../image-shared/protocol";
import { hasTransparency, jpegOrientation, webpIsLossless, type PdfOptions } from "./layout";
import { addImagePage, savePdf } from "./pdf-build";

export interface ToPdfRequest {
  id: number;
  files: File[];
  options: PdfOptions;
}

export type ToPdfResponse =
  | { type: "progress"; id: number; done: number; total: number }
  | { type: "done"; id: number; buffer: ArrayBuffer; pages: number }
  /** `index`: the file that failed, or -1 when the failure was not about one file. */
  | { type: "error"; id: number; index: number; code: JobErrorCode; detail?: string };

/** Quality for the images that have to be re-encoded as JPG (photos from WebP, AVIF, HEIC). */
const JPEG_QUALITY = 92;

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: ToPdfResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

class ImageError extends Error {
  constructor(readonly code: JobErrorCode) {
    super(code);
  }
}

scope.addEventListener("message", (event: MessageEvent<ToPdfRequest>) => void build(event.data));

async function build({ id, files, options }: ToPdfRequest) {
  const total = files.length;
  let index = -1;
  try {
    const doc = await PDFDocument.create();
    for (index = 0; index < total; index++) {
      post({ type: "progress", id, done: index, total });
      const bytes = new Uint8Array(await files[index]!.arrayBuffer());
      const { image, orientation } = await embed(doc, bytes);
      addImagePage(doc, image, orientation, options);
    }
    index = -1;
    post({ type: "progress", id, done: total, total });
    const buffer = await savePdf(doc);
    post({ type: "done", id, buffer, pages: total }, [buffer]);
  } catch (err) {
    const code = err instanceof ImageError ? err.code : classify(err, "generic");
    post({ type: "error", id, index, code, detail: String(err) });
  }
}

async function embed(doc: PDFDocument, bytes: Uint8Array): Promise<{ image: PDFImage; orientation: number }> {
  const format = sniffFormat(bytes.subarray(0, 64));
  if (!format) throw new ImageError("decode");
  if (format === "jpg") {
    try {
      return { image: await doc.embedJpg(withoutMetadata(bytes)), orientation: jpegOrientation(bytes) };
    } catch {
      // Decoded with its orientation applied, so the re-encoded copy is already upright.
      return { image: await embedPixels(doc, await decodeAs(bytes, "jpg"), false), orientation: 1 };
    }
  }
  if (format === "png") {
    try {
      return { image: await doc.embedPng(bytes), orientation: 1 };
    } catch {
      return { image: await embedPixels(doc, await decodeAs(bytes, "png"), true), orientation: 1 };
    }
  }
  const lossless = format === "webp" && webpIsLossless(bytes);
  const img = format === "heic" ? await decodeHeic(bytes) : await decodeAs(bytes, format);
  return { image: await embedPixels(doc, img, lossless), orientation: 1 };
}

/** The JPEG with its metadata segments removed (image data untouched); unchanged if it cannot be walked. */
function withoutMetadata(bytes: Uint8Array): Uint8Array {
  try {
    return cleanJpeg(bytes, "all").bytes;
  } catch {
    return bytes;
  }
}

async function decodeAs(bytes: Uint8Array, format: "jpg" | "png" | "webp" | "avif"): Promise<ImageData> {
  try {
    return await decode(toBuffer(bytes), format);
  } catch (err) {
    throw new ImageError(classify(err, "decode"));
  }
}

/** Pixels -> PNG (lossless sources, transparency) or JPG (photos), embedded. */
async function embedPixels(doc: PDFDocument, img: ImageData, lossless: boolean): Promise<PDFImage> {
  if (lossless || hasTransparency(img.data)) {
    const { buffer } = await encode(img, "png", 100);
    return doc.embedPng(new Uint8Array(buffer));
  }
  const { buffer } = await encode(img, "jpg", JPEG_QUALITY);
  return doc.embedJpg(new Uint8Array(buffer));
}

/** HEIC/HEIF via heic-to's CSP build (libheif in its own nested worker), read back through an OffscreenCanvas. */
async function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  try {
    if (typeof OffscreenCanvas === "undefined") throw new Error("unsupported: OffscreenCanvas");
    const { heicTo } = await import("heic-to/csp");
    const bitmap = await heicTo({ blob: new Blob([bytes as BlobPart]), type: "bitmap" });
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("unsupported: 2d context");
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch (err) {
    throw new ImageError(classify(err, "decode"));
  }
}

const toBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);

function classify(err: unknown, fallback: JobErrorCode): JobErrorCode {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("unsupported")) return "unsupported";
  if (err instanceof RangeError || msg.includes("memory") || msg.includes("allocation")) return "memory";
  return fallback;
}
