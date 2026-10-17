/**
 * heic-to-jpg worker. HEIC/HEIF is decoded by heic-to (libheif, LGPL-3.0), using its CSP build that
 * needs no 'unsafe-eval'. heic-to runs libheif in its own nested blob: worker (allowed by
 * worker-src blob:) and hands back an ImageBitmap; we read the pixels through an OffscreenCanvas
 * and encode with MozJPEG (or oxipng for PNG) in this worker. Files that are really JPEG/PNG/WebP/
 * AVIF despite a .heic name are decoded directly.
 */
import { serve } from "../image-shared/run-job";

async function decodeHeic(buffer: ArrayBuffer): Promise<ImageData> {
  if (typeof OffscreenCanvas === "undefined") throw new Error("unsupported: OffscreenCanvas");
  const { heicTo } = await import("heic-to/csp");
  const bitmap = await heicTo({ blob: new Blob([buffer]), type: "bitmap" });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("unsupported: 2d context");
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

serve(["heic", "jpg", "png", "webp", "avif"], decodeHeic);
