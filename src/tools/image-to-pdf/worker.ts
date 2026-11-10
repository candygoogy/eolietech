/// <reference lib="webworker" />
/**
 * image-to-pdf worker. Builds one PDF from a list of images, one page each, in list order.
 *   - JPG and PNG are embedded as they are (pdf-lib embedJpg / embedPng): no re-encoding. A JPEG's
 *     EXIF orientation is applied by the page's drawing matrix (pdf-build.ts), not by touching pixels.
 *     Its metadata (EXIF with GPS, XMP, comments) is cut out first, losslessly, with the EXIF
 *     remover's segment rewriter, so the PDF does not carry where a photo was taken. A JPEG the
 *     rewriter cannot walk is re-encoded from its pixels instead, never embedded with its metadata.
 *   - WebP, AVIF (jSquash) and HEIC (heic-to, as in heic-to-jpg/worker.ts) have no PDF form, so they
 *     are decoded and re-encoded once: PNG when the source is lossless or transparent, else JPG 92.
 *   - A JPG or PNG that pdf-lib cannot parse (odd encoder, animated PNG) takes that decode route too.
 *     An animated PNG gives its first frame; the done message lists those files.
 * Files arrive as File objects (no copy) and are read one at a time, so memory holds one source
 * image plus the PDF so far.
 */
import { PDFDocument, type PDFImage } from "pdf-lib";
import { cleanJpeg } from "../exif-remover/jpeg";
import { decodeHeic } from "../heic-to-jpg/heic";
import { decode, encode } from "../image-shared/codecs";
import { isAnimatedPng, sniffFormat } from "../image-shared/formats";
import { JobError, type JobErrorCode, type JobErrorKind } from "../image-shared/protocol";
import { classify } from "../image-shared/run-job";
import { hasTransparency, jpegOrientation, webpIsLossless, type PdfOptions } from "./layout";
import { addImagePage, savePdf } from "./pdf-build";

export interface ToPdfRequest {
  id: number;
  files: File[];
  options: PdfOptions;
}

export type ToPdfResponse =
  | { type: "progress"; id: number; done: number; total: number }
  /** `firstFrameOnly`: indices of animated PNGs, of which only the first frame is in the PDF. */
  | { type: "done"; id: number; buffer: ArrayBuffer; pages: number; firstFrameOnly: number[] }
  /** `index`: the file that failed, or -1 when the failure was not about one file. */
  | { type: "error"; id: number; index: number; code: JobErrorCode; kind?: JobErrorKind; detail?: string };

/** Quality for the images that have to be re-encoded as JPG (photos from WebP, AVIF, HEIC). */
const JPEG_QUALITY = 92;

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: ToPdfResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

scope.addEventListener("message", (event: MessageEvent<ToPdfRequest>) => void build(event.data));

async function build({ id, files, options }: ToPdfRequest) {
  const total = files.length;
  let index = -1;
  try {
    const doc = await PDFDocument.create();
    const firstFrameOnly: number[] = [];
    for (index = 0; index < total; index++) {
      post({ type: "progress", id, done: index, total });
      const bytes = new Uint8Array(await files[index]!.arrayBuffer());
      const { image, orientation } = await embed(doc, bytes);
      if (sniffFormat(bytes.subarray(0, 64)) === "png" && isAnimatedPng(bytes)) firstFrameOnly.push(index);
      addImagePage(doc, image, orientation, options);
    }
    index = -1;
    post({ type: "progress", id, done: total, total });
    const buffer = await savePdf(doc);
    post({ type: "done", id, buffer, pages: total, firstFrameOnly }, [buffer]);
  } catch (err) {
    const { code, kind } = classify(err, "generic");
    post({ type: "error", id, index, code, ...(kind ? { kind } : {}), detail: String(err) });
  }
}

async function embed(doc: PDFDocument, bytes: Uint8Array): Promise<{ image: PDFImage; orientation: number }> {
  const format = sniffFormat(bytes.subarray(0, 64));
  if (!format) throw new JobError("decode");
  if (format === "jpg") {
    const clean = withoutMetadata(bytes);
    if (clean) {
      try {
        return { image: await doc.embedJpg(clean), orientation: jpegOrientation(bytes) };
      } catch {
        // pdf-lib cannot parse it: re-encoded below.
      }
    }
    // Decoded with its orientation applied, so the re-encoded copy is already upright. The new JPEG
    // carries no metadata; if it cannot be decoded either, the file fails as unreadable.
    return { image: await embedPixels(doc, await decodeAs(bytes, "jpg"), false), orientation: 1 };
  }
  if (format === "png") {
    try {
      return { image: await doc.embedPng(bytes), orientation: 1 };
    } catch {
      return { image: await embedPixels(doc, await decodeAs(bytes, "png"), true), orientation: 1 };
    }
  }
  const lossless = format === "webp" && webpIsLossless(bytes);
  const img = format === "heic" ? await decodeHeicFile(bytes) : await decodeAs(bytes, format);
  return { image: await embedPixels(doc, img, lossless), orientation: 1 };
}

/** The JPEG with its metadata segments removed (image data untouched); null if it cannot be walked. */
function withoutMetadata(bytes: Uint8Array): Uint8Array | null {
  try {
    return cleanJpeg(bytes, "all").bytes;
  } catch {
    return null;
  }
}

async function decodeAs(bytes: Uint8Array, format: "jpg" | "png" | "webp" | "avif"): Promise<ImageData> {
  try {
    return await decode(toBuffer(bytes), format);
  } catch (err) {
    throw asJobError(err, "decode");
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

/** HEIC/HEIF as in heic-to-jpg (heic-to, read back through an OffscreenCanvas). */
async function decodeHeicFile(bytes: Uint8Array): Promise<ImageData> {
  try {
    return await decodeHeic(bytes);
  } catch (err) {
    throw asJobError(err, "decode");
  }
}

const toBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);

/** A decode failure with its code and kind; `fallback` when nothing more precise is known. */
function asJobError(err: unknown, fallback: JobErrorCode): JobError {
  if (err instanceof JobError) return err;
  const { code, kind } = classify(err, fallback);
  return new JobError(code, kind, String(err));
}
