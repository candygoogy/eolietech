/** image-fit: variant preset -> initial form, form values -> worker job settings (pure, unit-tested). */
import { parseDimension } from "../image-shared/batch-ui";
import { RASTER_FORMATS, acceptFor, type OutputChoice } from "../image-shared/formats";
import type { JobSettings } from "../image-shared/protocol";
import { isAspect, type Aspect, type Background, type FitSpec, type Rgb } from "./fit";

export const FIT_ACCEPT = acceptFor(RASTER_FORMATS);

/** As the resizer: the photo is the point, so a little higher than the compressor's 75. */
export const DEFAULT_QUALITY = 85;
/** A fixed frame starts at Instagram's width (1080 x 1080, 1080 x 1350, 1080 x 1920). */
export const DEFAULT_WIDTH = 1080;
export const DEFAULT_COLOR = "#f0f0f0";

export const BACKGROUNDS = ["white", "black", "color", "blur", "transparent"] as const;
export type BackgroundChoice = (typeof BACKGROUNDS)[number];

export const SIZES = ["photo", "width"] as const;
export type SizeChoice = (typeof SIZES)[number];

/** Save as: no AVIF here (slow to encode and not taken by the places square photos go). */
export const OUTPUTS = ["original", "jpg", "png", "webp"] as const satisfies readonly OutputChoice[];
export type FitOutput = (typeof OUTPUTS)[number];

/** The form as the client reads it: raw input values, so the mapping is testable without a DOM. */
export interface FitForm {
  aspect: Aspect;
  background: BackgroundChoice;
  /** <input type="color"> value, "#rrggbb". */
  color: string;
  size: SizeChoice;
  width: string;
  output: FitOutput;
  quality: string;
}

/** Job settings plus the frame request (createBatch posts the whole object to the worker). */
export type FitSettings = JobSettings & { fit: FitSpec };

/** `{}` on /make-image-square/ (1:1); `{ aspect: "16:9" }` and `{ aspect: "9:16" }` on the variants. */
export function formFromPreset(preset: Record<string, unknown>): FitForm {
  return {
    aspect: isAspect(preset.aspect) ? preset.aspect : "1:1",
    background: "white",
    color: DEFAULT_COLOR,
    size: "photo",
    width: String(DEFAULT_WIDTH),
    output: "original",
    quality: String(DEFAULT_QUALITY),
  };
}

/** Only an explicit PNG or WebP keeps transparency ("Same as original" is JPG for most photos). */
export const allowsTransparent = (output: FitOutput): boolean => output === "png" || output === "webp";

/** "#rrggbb" -> [r, g, b], or null. */
export function parseHex(value: string): Rgb | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : null;
}

export function background(form: FitForm): Background {
  switch (form.background) {
    case "black":
      return { kind: "color", rgb: [0, 0, 0] };
    case "color":
      return { kind: "color", rgb: parseHex(form.color) ?? parseHex(DEFAULT_COLOR)! };
    case "blur":
      return { kind: "blur" };
    case "transparent":
      // Offered only for PNG and WebP; any other output gets white, as JPG would anyway.
      return allowsTransparent(form.output) ? { kind: "transparent" } : { kind: "color", rgb: [255, 255, 255] };
    default:
      return { kind: "color", rgb: [255, 255, 255] };
  }
}

/** The frame width the form asks for: null for "Same as the photo", undefined while the field is empty or invalid. */
export function frameWidth(form: FitForm): number | null | undefined {
  if (form.size === "photo") return null;
  return parseDimension(form.width) ?? undefined;
}

/**
 * Job settings for the form. While the width field is empty or invalid, `lastWidth` (the previous
 * valid width) is used, so files added meanwhile still get a sensible frame.
 */
export function fitSettings(form: FitForm, lastWidth: number = DEFAULT_WIDTH): FitSettings {
  const q = Math.round(Number(form.quality));
  const width = frameWidth(form);
  return {
    output: form.output,
    quality: Number.isFinite(q) && q >= 1 && q <= 100 ? q : DEFAULT_QUALITY,
    fit: { aspect: form.aspect, width: width === undefined ? lastWidth : width, background: background(form) },
  };
}
