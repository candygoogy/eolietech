/**
 * HEIC/HEIF decoding for the workers (heic-to-jpg, image-to-pdf). heic-to (libheif, LGPL-3.0), in its
 * CSP build that needs no 'unsafe-eval', runs libheif in its own nested blob: worker (allowed by
 * worker-src blob:) and hands back an ImageBitmap, read back here through an OffscreenCanvas.
 */
import { JobError } from "../image-shared/protocol";
import { canDecodeHeic, isAllocationFailure, readPixels } from "./canvas";

export async function decodeHeic(buffer: ArrayBuffer | Uint8Array): Promise<ImageData> {
  if (!canDecodeHeic()) throw new JobError("unsupported", "browser");
  const { heicTo } = await import("heic-to/csp");
  let bitmap: ImageBitmap;
  try {
    bitmap = await heicTo({ blob: new Blob([buffer as BlobPart]), type: "bitmap" });
  } catch (err) {
    if (isAllocationFailure(err)) throw new JobError("memory", "canvasTooLarge", String(err));
    throw err;
  }
  try {
    return readPixels(bitmap);
  } finally {
    bitmap.close();
  }
}
