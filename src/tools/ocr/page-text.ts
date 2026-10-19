/**
 * Tesseract's block tree -> the flat lines the PDF text layer needs. Pure and pdf-lib-free, so the
 * page can keep these per page (small) without loading pdf-lib until the searchable copy is built.
 */
import type { Box, OcrLine } from "./text-layer";

export type { PageLayer } from "./text-layer";

interface BlockLike {
  paragraphs?: { lines?: { words?: { text?: string; bbox?: Box }[]; baseline?: Box | null }[] }[];
}

/** Every line with at least one non-empty word, in reading order, keeping only text, boxes and the baseline. */
export function linesFromBlocks(blocks: readonly BlockLike[] | null | undefined): OcrLine[] {
  const lines: OcrLine[] = [];
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const words = (line.words ?? [])
          .filter((w): w is { text: string; bbox: Box } => !!w.bbox && typeof w.text === "string" && w.text.trim() !== "")
          .map((w) => ({ text: w.text, bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 } }));
        if (words.length === 0) continue;
        const b = line.baseline;
        lines.push({ words, baseline: b ? { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 } : null });
      }
    }
  }
  return lines;
}
