/** Messages between the image tool UIs and their Web Workers. */
import type { InputFormat, OutputChoice, RasterFormat } from "./formats";

export interface JobSettings {
  output: OutputChoice;
  /** 1-100, used by lossy encoders. */
  quality: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
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
      /** True when transparent pixels were flattened onto white for JPEG. */
      flattened: boolean;
    }
  | { id: number; ok: false; error: JobErrorCode; detail?: string };
