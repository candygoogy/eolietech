/**
 * image-target-size: a file already under the target in the chosen format is kept as it is, with its
 * metadata (GPS, camera, dates, XMP...) removed losslessly by the EXIF remover's own cleaners ("all"
 * mode: only the rotation flag stays, so the photo is still upright). Pure, unit-tested.
 */
import { cleanJpeg } from "../exif-remover/jpeg";
import { cleanPng } from "../exif-remover/png";
import { cleanWebp } from "../exif-remover/webp";
import type { Cleaned, Mode } from "../exif-remover/types";
import type { InputFormat, RasterFormat } from "../image-shared/formats";

/** Formats with a lossless metadata cleaner. Others (AVIF) go through the normal search instead. */
const CLEAN: Partial<Record<RasterFormat, (b: Uint8Array, mode: Mode) => Cleaned>> = {
  jpg: cleanJpeg,
  png: cleanPng,
  webp: cleanWebp,
};

/**
 * The original file without its metadata, as a standalone ArrayBuffer, when it is already in the
 * output format and fits `targetBytes`; null when it has to be re-encoded (other format, too big,
 * no cleaner, or the cleaner could not read it).
 */
export function keepAsIs(buffer: ArrayBuffer, input: InputFormat, output: RasterFormat, targetBytes: number): ArrayBuffer | null {
  if (input !== output || buffer.byteLength > targetBytes) return null;
  const clean = CLEAN[output];
  if (!clean) return null;
  let bytes: Uint8Array;
  try {
    bytes = clean(new Uint8Array(buffer), "all").bytes;
  } catch {
    return null;
  }
  if (bytes.byteLength > targetBytes) return null;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
