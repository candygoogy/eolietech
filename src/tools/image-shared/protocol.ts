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

/** Error codes; the UI maps them to translated strings. */
export type JobErrorCode = "decode" | "unsupported" | "memory" | "generic";

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
    }
  | { id: number; ok: false; error: JobErrorCode; detail?: string };
