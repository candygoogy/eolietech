/** image-resize: variant preset -> initial form, form values -> worker job settings (pure, unit-tested). */
import { parseDimension } from "../image-shared/batch-ui";
import { RASTER_FORMATS, acceptFor, isRasterFormat, type OutputChoice, type ResizeSpec } from "../image-shared/formats";
import type { JobSettings } from "../image-shared/protocol";

export const RESIZE_ACCEPT = acceptFor(RASTER_FORMATS);

/** Resizing is about keeping the picture, so a little higher than the compressor's 75 (as heic-to-jpg). */
export const DEFAULT_QUALITY = 85;
/** Base page: a common width for web pages and email that most phone photos are larger than. */
export const DEFAULT_WIDTH = 1600;
export const MAX_PERCENT = 1000;

export const MODES = ["width", "height", "box", "percent"] as const;
export type Mode = (typeof MODES)[number];

/** The form as the client reads it: raw input strings, so the mapping below is testable without a DOM. */
export interface ResizeForm {
  mode: Mode;
  width: string;
  height: string;
  percent: string;
  keepAspect: boolean;
  enlarge: boolean;
  output: OutputChoice;
  quality: string;
}

const presetSide = (v: unknown): string => (typeof v === "number" ? String(parseDimension(String(v)) ?? "") : "");

/**
 * `{}` on /resize-image/. Variants: `{ maxSide: 1600, output: "jpg" }` (email: longest side 1600 px, JPG)
 * and `{ width: 1080 }` (Instagram: 1080 px wide). Unknown or invalid values fall back to the base page.
 */
export function formFromPreset(preset: Record<string, unknown>): ResizeForm {
  const form: ResizeForm = {
    mode: "width",
    width: String(DEFAULT_WIDTH),
    height: "",
    percent: "50",
    keepAspect: true,
    enlarge: false,
    output: isRasterFormat(preset.output) ? preset.output : "original",
    quality: String(DEFAULT_QUALITY),
  };
  const maxSide = presetSide(preset.maxSide);
  const width = presetSide(preset.width);
  const height = presetSide(preset.height);
  if (maxSide) return { ...form, mode: "box", width: maxSide, height: maxSide };
  if (width && height) return { ...form, mode: "box", width, height };
  if (width) return { ...form, mode: "width", width };
  if (height) return { ...form, mode: "height", height };
  return form;
}

/** A whole percentage from 1 to MAX_PERCENT, or null. */
export function parsePercent(value: string): number | null {
  const n = Math.round(Number(value));
  return value.trim() !== "" && Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PERCENT) : null;
}

/** The size inputs the current mode needs, and which of them are missing or invalid. */
export function missingFields(form: ResizeForm): ("width" | "height" | "percent")[] {
  const need: ("width" | "height" | "percent")[] =
    form.mode === "width" ? ["width"] : form.mode === "height" ? ["height"] : form.mode === "box" ? ["width", "height"] : ["percent"];
  return need.filter((f) => (f === "percent" ? parsePercent(form.percent) : parseDimension(form[f])) === null);
}

/** The resize request for the form, or null while a size input it needs is empty or invalid. */
export function resizeSpec(form: ResizeForm): ResizeSpec | null {
  if (missingFields(form).length > 0) return null;
  const { enlarge } = form;
  switch (form.mode) {
    case "width":
      return { mode: "width", width: parseDimension(form.width)!, enlarge };
    case "height":
      return { mode: "height", height: parseDimension(form.height)!, enlarge };
    case "box":
      return { mode: "box", width: parseDimension(form.width)!, height: parseDimension(form.height)!, keepAspect: form.keepAspect, enlarge };
    case "percent":
      return { mode: "percent", percent: parsePercent(form.percent)!, enlarge };
  }
}

/**
 * Job settings for the form. While a size input is empty or invalid, `last` (the previous complete
 * request) is used, so files added meanwhile still get a sensible size.
 */
export function resizeSettings(
  form: ResizeForm,
  last: ResizeSpec = { mode: "width", width: DEFAULT_WIDTH, enlarge: false },
): JobSettings {
  const q = Math.round(Number(form.quality));
  return {
    output: form.output,
    quality: Number.isFinite(q) && q >= 1 && q <= 100 ? q : DEFAULT_QUALITY,
    resize: resizeSpec(form) ?? last,
  };
}
