/**
 * Reading HEIC pixels back through a canvas, and telling apart the ways that can fail. Shared by the
 * heic-to-jpg and image-to-pdf workers (and their pages, for the up-front check). No heic-to import
 * here, so a page that only checks support does not reference the decoder.
 */
import { JobError } from "../image-shared/protocol";

/** iOS Safari's canvas limit, about 16.7 million pixels (4096 x 4096). A 24 or 48 MP iPhone photo is over it. */
export const CANVAS_SAFE_PIXELS = 4096 * 4096;

/** Whether this browser (or worker) has what HEIC decoding needs: createImageBitmap and an OffscreenCanvas with a 2d context. */
export function canDecodeHeic(): boolean {
  try {
    return (
      typeof createImageBitmap === "function" &&
      typeof OffscreenCanvas === "function" &&
      new OffscreenCanvas(1, 1).getContext("2d") !== null
    );
  } catch {
    return false;
  }
}

/**
 * True when a grid of sample pixels is all transparent black: what a canvas the browser could not
 * really allocate reads back as. Only asked of images over CANVAS_SAFE_PIXELS, so a transparent
 * HEIF of ordinary size is never taken for a failure.
 */
export function looksBlank(data: Uint8ClampedArray, width: number, height: number): boolean {
  const steps = 16;
  for (let sy = 0; sy < steps; sy++) {
    const y = Math.min(height - 1, Math.floor(((sy + 0.5) * height) / steps));
    for (let sx = 0; sx < steps; sx++) {
      const x = Math.min(width - 1, Math.floor(((sx + 0.5) * width) / steps));
      const i = (y * width + x) * 4;
      if (data[i] || data[i + 1] || data[i + 2] || data[i + 3]) return false;
    }
  }
  return true;
}

/**
 * The bitmap's pixels, through an OffscreenCanvas. A canvas the browser will not give (no context,
 * an exception, or a blank read-back on a very large image) is reported as too large for this
 * browser, not as a damaged photo or a broken file.
 */
export function readPixels(bitmap: ImageBitmap): ImageData {
  const { width, height } = bitmap;
  const tooLarge = (detail: string) => new JobError("memory", "canvasTooLarge", `${width}x${height} ${detail}`);
  let img: ImageData;
  try {
    const ctx = new OffscreenCanvas(width, height).getContext("2d");
    if (!ctx) throw tooLarge("no 2d context");
    ctx.drawImage(bitmap, 0, 0);
    img = ctx.getImageData(0, 0, width, height);
  } catch (err) {
    throw err instanceof JobError ? err : tooLarge(String(err));
  }
  if (width * height > CANVAS_SAFE_PIXELS && looksBlank(img.data, width, height)) throw tooLarge("blank canvas");
  return img;
}

/** heic-to's own failures that mean "out of room" rather than "not a HEIC": a DOM exception from createImageBitmap, or an allocation error from its decoder worker. */
export function isAllocationFailure(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) return true;
  return err instanceof RangeError || /rangeerror|out of memory|allocat/i.test(String(err));
}
