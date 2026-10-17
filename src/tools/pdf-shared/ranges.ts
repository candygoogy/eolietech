/**
 * Page-range parsing for the PDF tools. Pure (no DOM, no pdf-lib) so it is unit-testable.
 *
 * Syntax (1-based, inclusive): "1-3, 5, 8-" -> pages 1..3, 5, 8..last. "-4" means 1..4.
 * Commas, semicolons and whitespace separate parts; en/em dashes count as hyphens.
 */

export interface PageRange {
  /** 1-based, inclusive. */
  start: number;
  /** 1-based, inclusive. */
  end: number;
}

export type PageRangeError =
  | { code: "empty" }
  | { code: "syntax"; part: string }
  | { code: "outOfRange"; part: string; pages: number }
  | { code: "reversed"; part: string };

export type RangeResult = { ok: true; ranges: PageRange[] } | { ok: false; error: PageRangeError };

const PART = /^(\d+)?\s*-\s*(\d+)?$|^(\d+)$/;

export function parsePageRanges(input: string, pageCount: number): RangeResult {
  // Collapse spaces around hyphens first ("3 - 5" -> "3-5") so whitespace never splits a range.
  const normalised = input
    .replace(/[‒-―−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (normalised.length === 0) return { ok: false, error: { code: "empty" } };

  const ranges: PageRange[] = [];
  for (const part of normalised) {
    const m = PART.exec(part);
    if (!m || part === "-") return { ok: false, error: { code: "syntax", part } };
    let start: number;
    let end: number;
    if (m[3] !== undefined) {
      start = end = Number(m[3]);
    } else {
      start = m[1] !== undefined ? Number(m[1]) : 1;
      end = m[2] !== undefined ? Number(m[2]) : pageCount;
    }
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      return { ok: false, error: { code: "outOfRange", part, pages: pageCount } };
    }
    if (start > end) return { ok: false, error: { code: "reversed", part } };
    ranges.push({ start, end });
  }
  return { ok: true, ranges };
}

/** 0-based page indices covered by a range. */
export function rangeIndices(range: PageRange): number[] {
  const out: number[] = [];
  for (let p = range.start; p <= range.end; p++) out.push(p - 1);
  return out;
}

/** Consecutive chunks of `size` pages: every page (size 1), every N pages. */
export function chunkRanges(pageCount: number, size: number): PageRange[] {
  const n = Math.max(1, Math.floor(size));
  const out: PageRange[] = [];
  for (let start = 1; start <= pageCount; start += n) {
    out.push({ start, end: Math.min(pageCount, start + n - 1) });
  }
  return out;
}

/** "1-3" or "5": used in output filenames and result lists. */
export const rangeLabel = (r: PageRange): string => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`);
