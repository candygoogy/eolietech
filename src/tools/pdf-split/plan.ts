/** Split planning: which output files to produce from which pages. Pure, unit-tested. */
import { chunkRanges, parsePageRanges, rangeIndices, rangeLabel, type PageRangeError } from "../pdf-shared/ranges";

export type SplitMode =
  | { kind: "ranges"; input: string; combine: boolean }
  | { kind: "every"; size: number };

export interface SplitPart {
  /** 0-based source page indices, in output order. */
  indices: number[];
  /** Human/filename label, e.g. "1-3" or "1-3_5". */
  label: string;
}

export type SplitPlan = { ok: true; parts: SplitPart[] } | { ok: false; error: PageRangeError | { code: "size" } };

export function planSplit(mode: SplitMode, pageCount: number): SplitPlan {
  if (mode.kind === "every") {
    if (!Number.isInteger(mode.size) || mode.size < 1 || mode.size > pageCount) {
      return { ok: false, error: { code: "size" } };
    }
    return {
      ok: true,
      parts: chunkRanges(pageCount, mode.size).map((r) => ({ indices: rangeIndices(r), label: rangeLabel(r) })),
    };
  }
  const parsed = parsePageRanges(mode.input, pageCount);
  if (!parsed.ok) return parsed;
  const parts = parsed.ranges.map((r) => ({ indices: rangeIndices(r), label: rangeLabel(r) }));
  if (mode.combine) {
    return {
      ok: true,
      parts: [{ indices: parts.flatMap((p) => p.indices), label: parts.map((p) => p.label).join("_") }],
    };
  }
  return { ok: true, parts };
}
