/** Messages between the image tool UIs and their Web Workers. */
import type { InputFormat, OutputChoice, RasterFormat, ResizeSpec } from "./formats";

export interface JobSettings {
  output: OutputChoice;
  /** 1-100, used by lossy encoders. */
  quality: number;
  /** Downscale-only bounds (compress, home desk). Ignored when `resize` is set. */
  maxWidth?: number | null;
  maxHeight?: number | null;
  /** Exact resize (image-resize): may also enlarge or stretch. Takes precedence over maxWidth/maxHeight. */
  resize?: ResizeSpec | null;
}

export interface JobRequest {
  id: number;
  /** Original file bytes (transferred). */
  buffer: ArrayBuffer;
  settings: JobSettings;
}

/**
 * Error codes; the UI maps them to translated strings (img.error.<code>, "generic" -> tool.error.generic).
 * "noFit": image-target-size could not get the file under the target size, even made small.
 */
export type JobErrorCode = "decode" | "unsupported" | "memory" | "noFit" | "generic";

/**
 * A more precise reason, sent next to the error code. A UI that has a string for it shows
 * img.error.<kind>; any other UI shows the code's string, which still fits.
 *   cmyk ("unsupported"): a CMYK or YCCK JPEG, which the decoder cannot read.
 *   webpTooLarge ("memory"): WebP output over WEBP_MAX_SIDE (16383 px) on a side.
 *   avifTooLarge ("memory"): the AVIF encoder ran out of memory; JPG or WebP still work.
 *   canvasTooLarge ("memory"): the browser would not give a canvas this big (iOS: about 16.7 MP).
 *   browser ("unsupported"): this browser lacks a feature the tool needs (OffscreenCanvas, createImageBitmap).
 */
export type JobErrorKind = "cmyk" | "webpTooLarge" | "avifTooLarge" | "canvasTooLarge" | "browser";

/** An error with a code (and optional kind) the UI translates. Its message starts with the code, for workers that classify by message. */
export class JobError extends Error {
  constructor(
    readonly code: JobErrorCode,
    readonly kind?: JobErrorKind,
    detail?: string,
  ) {
    super([kind ? `${code}: ${kind}` : code, detail].filter(Boolean).join(" - "));
  }
}

export type JobResponse =
  | {
      id: number;
      ok: true;
      buffer: ArrayBuffer;
      input: InputFormat;
      format: RasterFormat;
      width: number;
      height: number;
      /** Decoded size before any resize. */
      sourceWidth?: number;
      sourceHeight?: number;
      /** An exact resize would have enlarged the image and enlarging was off (see targetSize). */
      notEnlarged?: boolean;
      /** True when transparent pixels were flattened onto white for JPEG. */
      flattened: boolean;
      /** Quality the output was encoded with, when a tool chose it per file (image-target-size). */
      quality?: number;
      /**
       * The buffer is the original file's own encoded image, not re-encoded (image-target-size: already
       * under the target; its metadata is stripped losslessly). The UI keeps the original file name.
       */
      unchanged?: boolean;
      /** The source was an animated PNG; only its first frame was kept. */
      firstFrameOnly?: boolean;
    }
  | { id: number; ok: false; error: JobErrorCode; kind?: JobErrorKind; detail?: string };
