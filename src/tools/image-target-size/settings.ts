/** image-target-size: variant preset -> initial form, form values -> worker job settings (pure, unit-tested). */
import { RASTER_FORMATS, acceptFor } from "../image-shared/formats";
import type { JobSettings } from "../image-shared/protocol";
import { Q_MAX } from "./search";

export const TARGET_ACCEPT = acceptFor(RASTER_FORMATS);

/** Base page: a common limit on upload forms. */
export const DEFAULT_KB = 100;
export const MAX_KB = 50_000;
/** Bytes per KB. 1000, not 1024: a file under N x 1000 bytes is also under N x 1024. */
export const KB = 1000;

export const OUTPUTS = ["jpg", "webp"] as const;
export type TargetOutput = (typeof OUTPUTS)[number];

/** The form as the client reads it: raw input strings, so the mapping below is testable without a DOM. */
export interface TargetForm {
  kb: string;
  output: TargetOutput;
}

/** Settings posted to the worker: the shared fields plus the byte budget. */
export type TargetSettings = JobSettings & { output: TargetOutput; targetBytes: number };

/** A whole number of KB from 1 to MAX_KB, or null. Decimals are accepted and rounded down (fits the limit). */
export function parseKb(value: string): number | null {
  const n = Math.floor(Number(value.trim().replace(",", ".")));
  return value.trim() !== "" && Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_KB) : null;
}

/** `{}` on the base page; `{ targetKb: N }` on the variants. Invalid values fall back to the base page. */
export function formFromPreset(preset: Record<string, unknown>): TargetForm {
  const kb = typeof preset.targetKb === "number" ? parseKb(String(preset.targetKb)) : null;
  return { kb: String(kb ?? DEFAULT_KB), output: "jpg" };
}

/** Job settings for the form; while the size field is empty or invalid, `lastKb` is used. */
export function targetSettings(form: TargetForm, lastKb = DEFAULT_KB): TargetSettings {
  const kb = parseKb(form.kb) ?? lastKb;
  return { output: form.output, quality: Q_MAX, targetBytes: kb * KB };
}

export const isTargetOutput = (v: unknown): v is TargetOutput => (OUTPUTS as readonly unknown[]).includes(v);
