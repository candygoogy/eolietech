/** heic-to-jpg: form values -> worker job settings (pure, unit-tested). */
import { acceptFor } from "../image-shared/formats";
import type { JobSettings } from "../image-shared/protocol";

/** HEIC/HEIF only; files from iPhones often arrive without a MIME type, so extensions are listed too. */
export const HEIC_ACCEPT = acceptFor(["heic"]);

/** Photos: a little higher than the compressor's default, since people convert HEIC to keep the picture, not to shrink it. */
export const HEIC_DEFAULT_QUALITY = 85;

export function heicSettings(format: string, quality: string): JobSettings {
  const q = Math.round(Number(quality));
  return {
    output: format === "png" ? "png" : "jpg",
    quality: Number.isFinite(q) && q >= 1 && q <= 100 ? q : HEIC_DEFAULT_QUALITY,
  };
}
