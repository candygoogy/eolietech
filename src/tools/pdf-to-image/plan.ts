/** PDF to image planning: which pages, how many pixels, which file names. Pure (no DOM, no PDF.js), unit-tested. */
import { parsePageRanges, rangeIndices, type PageRangeError } from "../pdf-shared/ranges";

export type ImageFormat = "jpg" | "png";
export const DPI_CHOICES = [72, 150, 300] as const;
export type Dpi = (typeof DPI_CHOICES)[number];
export const DEFAULT_DPI: Dpi = 150;

/**
 * Pixel cap per page. 16,777,216 px (4096 x 4096) is the largest canvas iOS Safari will draw, and
 * about 64 MB of RGBA in memory: enough for A4 or US Letter at 300 dpi (about 8.7 MP), while a
 * poster-sized page at 300 dpi is scaled down instead of crashing the tab.
 */
export const MAX_PIXELS = 4096 * 4096;
/** Longest side cap, for very long strips that stay under the area cap. */
export const MAX_SIDE = 16384;

/** PDF user space unit: 1/72 inch. */
const POINTS_PER_INCH = 72;

export interface PageSize {
  /** Render scale for PDF.js getViewport (1 = 72 dpi). */
  scale: number;
  width: number;
  height: number;
  /** True when the requested dpi was reduced to fit the caps. */
  capped: boolean;
}

/**
 * Pixel size of a page (in PDF points, rotation already applied) at `dpi`, scaled down
 * proportionally when it would exceed MAX_PIXELS or MAX_SIDE.
 */
export function pageSize(widthPt: number, heightPt: number, dpi: number): PageSize {
  let scale = dpi / POINTS_PER_INCH;
  let capped = false;
  const w = widthPt * scale;
  const h = heightPt * scale;
  const shrink = Math.min(1, Math.sqrt(MAX_PIXELS / (w * h)), MAX_SIDE / Math.max(w, h));
  if (shrink < 1) {
    scale *= shrink;
    capped = true;
  }
  return {
    scale,
    width: Math.max(1, Math.floor(widthPt * scale)),
    height: Math.max(1, Math.floor(heightPt * scale)),
    capped,
  };
}

export type PageSelection = { kind: "all" } | { kind: "ranges"; input: string };

export type PagePlan = { ok: true; pages: number[] } | { ok: false; error: PageRangeError };

/**
 * 1-based page numbers to convert, ascending and without repeats (each page is one image named by
 * its number, so "3, 1-3" is just pages 1 to 3).
 */
export function planPages(selection: PageSelection, pageCount: number): PagePlan {
  if (selection.kind === "all") return { ok: true, pages: Array.from({ length: pageCount }, (_, i) => i + 1) };
  const parsed = parsePageRanges(selection.input, pageCount);
  if (!parsed.ok) return parsed;
  const set = new Set(parsed.ranges.flatMap((r) => rangeIndices(r).map((i) => i + 1)));
  return { ok: true, pages: [...set].sort((a, b) => a - b) };
}

/** Page number padded to the document's page count width, at least two digits: 1 of 9 -> "01", 7 of 120 -> "007". */
export function padPage(page: number, pageCount: number): string {
  return String(page).padStart(Math.max(2, String(pageCount).length), "0");
}

/** The format the tool starts with: the variant preset's `to` when it names one, else JPG. */
export function initialFormat(preset: Record<string, unknown>): ImageFormat {
  return preset.to === "png" ? "png" : "jpg";
}

export const MIME: Record<ImageFormat, string> = { jpg: "image/jpeg", png: "image/png" };

/** JPEG quality for canvas.toBlob: small files with clean text. */
export const JPEG_QUALITY = 0.85;
