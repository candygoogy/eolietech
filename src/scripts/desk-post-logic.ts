/**
 * Decisions for the home postcard (desk-post.ts), kept pure so they are unit-tested: which files it
 * takes, the settings it compresses with, and how a result reads on the postmark. No DOM, no WASM.
 */
import { formatFromName, isRasterFormat, percentSaved, sniffFormat, type RasterFormat } from "../tools/image-shared/formats";
import type { JobSettings } from "../tools/image-shared/protocol";

/** Owner-approved defaults: keep the format, quality 75, longest side at most 2048 px. */
export const POST_SETTINGS: JobSettings = { output: "original", quality: 75, maxWidth: 2048, maxHeight: 2048 };

export type IntakeRefusal = "heic" | "type" | "tooLarge";
export type Intake = { ok: true; format: RasterFormat } | { ok: false; reason: IntakeRefusal };

const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

/**
 * Can the postcard take this file? `head` is its first bytes (64 is plenty). The bytes decide the
 * format; the name and MIME type only help recognise a HEIC whose bytes are unusual. HEIC is turned
 * away before any codec loads: the home does not ship a HEIC decoder.
 */
export function classifyIntake(head: Uint8Array, file: { name: string; type: string; size: number }, maxBytes: number): Intake {
  const sniffed = sniffFormat(head);
  if (sniffed === "heic" || (!sniffed && (HEIC_TYPES.includes(file.type.toLowerCase()) || formatFromName(file.name) === "heic"))) {
    return { ok: false, reason: "heic" };
  }
  if (!isRasterFormat(sniffed)) return { ok: false, reason: "type" };
  if (maxBytes > 0 && file.size > maxBytes) return { ok: false, reason: "tooLarge" };
  return { ok: true, format: sniffed };
}

/** Did it get smaller? Same size or larger is reported honestly as "not smaller". */
export const isSmaller = (before: number, after: number): boolean => after < before;

/** The figure struck in the middle of the postmark: "−73%", "+4%" or "±0%" (true minus sign). */
export function postmarkFigure(before: number, after: number): string {
  const pct = percentSaved(before, after);
  if (pct > 0) return `−${pct}%`;
  if (pct < 0) return `+${-pct}%`;
  return "±0%";
}
