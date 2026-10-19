/**
 * Entry point for the EXIF remover's byte work: detect the format, report what a file reveals, and
 * rewrite it without its metadata. `analyze` never throws; a broken or unsupported file comes back as
 * an error code.
 */
import { cleanJpeg, inspectJpeg } from "./jpeg";
import { cleanPng, inspectPng } from "./png";
import { cleanWebp, inspectWebp } from "./webp";
import { startsWith } from "./tiff";
import type { Cleaned, Format, Mode, Report } from "./types";

export type Detected = Format | "heic" | "avif" | "gif" | "tiff";

/** The real format, from the first bytes (names and MIME types lie). */
export function detect(b: Uint8Array): Detected | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "gif";
  if (b.length >= 4 && (ascii(0, 4) === "II*\0" || ascii(0, 4) === "MM\0*")) return "tiff";
  if (b.length >= 12 && ascii(4, 8) === "ftyp") {
    const brands: string[] = [];
    for (let i = 8; i + 4 <= Math.min(b.length, 64); i += 4) if (i !== 12) brands.push(ascii(i, i + 4));
    if (brands.some((x) => x === "avif" || x === "avis")) return "avif";
    if (brands.some((x) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(x))) return "heic";
  }
  return null;
}

/** "heic" and "avif" get their own message: converting them to JPG on this site drops the metadata. */
export type AnalyzeError = "decode" | "unsupported" | "heic" | "avif";

export type Analysis =
  | { ok: true; report: Report; cleaned: Cleaned }
  | { ok: false; error: AnalyzeError };

const INSPECT: Record<Format, (b: Uint8Array) => Report> = { jpg: inspectJpeg, png: inspectPng, webp: inspectWebp };
const CLEAN: Record<Format, (b: Uint8Array, mode: Mode) => Cleaned> = { jpg: cleanJpeg, png: cleanPng, webp: cleanWebp };

/** Read a file's metadata (report) and make its clean copy for `mode`. Never throws. */
export function analyze(b: Uint8Array, mode: Mode): Analysis {
  const format = detect(b);
  if (format === "heic" || format === "avif") return { ok: false, error: format };
  if (format === "gif" || format === "tiff") return { ok: false, error: "unsupported" };
  if (!format) return { ok: false, error: "decode" };
  try {
    return { ok: true, report: INSPECT[format](b), cleaned: CLEAN[format](b, mode) };
  } catch {
    return { ok: false, error: "decode" };
  }
}

/** Anything worth reporting (and removing)? */
export function hasMetadata(r: Report): boolean {
  if (r.exifUnreadable || r.gps !== null || r.blocks.length > 0) return true;
  const e = r.exif;
  return !!e && (e.hasGpsBlock || !!e.make || !!e.model || !!e.date || !!e.software || e.otherTags > 0);
}

/** Round to 2 decimals (about 1 km), as shown in the list. */
export const roundCoord = (v: number): string => (Math.round(v * 100) / 100).toFixed(2);

/** "2024:07:14 18:32:05" -> its parts, or null when it is not a real date. */
export function parseExifDate(s: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  const [year, month, day, hour, minute] = [m[1], m[2], m[3], m[4] ?? "0", m[5] ?? "0"].map(Number) as [number, number, number, number, number];
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return { year, month, day, hour, minute };
}

/** Camera line: "Google Pixel 7"; skips the make when the model already starts with it ("Canon EOS R5"). */
export function cameraName(make?: string, model?: string): string | undefined {
  if (!make) return model;
  if (!model) return make;
  return model.toLowerCase().startsWith(make.toLowerCase().split(" ")[0]!) ? model : `${make} ${model}`;
}
