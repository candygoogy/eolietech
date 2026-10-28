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
    }
  | { id: number; ok: false; error: JobErrorCode; detail?: string };
