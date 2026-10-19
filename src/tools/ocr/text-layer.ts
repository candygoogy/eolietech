/**
 * Searchable PDF: the original pages, copied unchanged with pdf-lib, plus an invisible text layer
 * (text render mode 3, Helvetica) placed from Tesseract's word boxes. DOM-free and PDF.js-free so it
 * runs in Node for unit tests; the page passes in PDF.js's viewport transform for each OCR'd page.
 *
 * Coordinates: Tesseract boxes are in pixels of the rendered page image. PDF.js renders with
 * `viewport.transform` (default user space -> image pixels, rotation and crop box included), so its
 * inverse maps a box back to the page's own coordinates, whatever /Rotate or box origin it has.
 */
import {
  beginText,
  endText,
  PDFContentStream,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  StandardFonts,
  TextRenderingMode,
  type PDFFont,
  type PDFOperator,
  type PDFPage,
} from "pdf-lib";
import { loadPdf } from "../pdf-shared/pdf-ops";

/** Affine matrix [a, b, c, d, e, f], as in PDF and PDF.js: x' = a*x + c*y + e, y' = b*x + d*y + f. */
export type Matrix = [number, number, number, number, number, number];

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: Box;
}

export interface OcrLine {
  words: OcrWord[];
  /** Baseline end points in image pixels, when Tesseract found one. */
  baseline?: Box | null;
}

/** One OCR'd page: its lines and the PDF.js viewport transform the image was rendered with. */
export interface PageLayer {
  lines: OcrLine[];
  transform: Matrix;
}

// ---------- WinAnsi (the encoding of the standard Helvetica font) ----------

/** The 27 characters WinAnsiEncoding puts in 0x80..0x9F; with printable ASCII and Latin-1 they make the whole set. */
const WIN_ANSI_EXTRA = new Set(
  "\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178",
);

/** Common characters outside WinAnsi that have a close WinAnsi spelling. */
const SUBSTITUTES: Record<string, string> = {
  " ": " ", // no-break space
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  "­": "", // soft hyphen
  "​": "", // zero-width space
  "﻿": "",
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "−": "-", // minus sign
  "′": "'", // prime
  "″": '"',
  "‛": "'",
  "‟": '"',
  "⁄": "/",
  "∕": "/",
  "∙": "•",
  "‧": "·",
  "ﬀ": "ff",
  "ﬁ": "fi",
  "ﬂ": "fl",
  "ﬃ": "ffi",
  "ﬄ": "ffl",
  "ı": "i", // dotless i
  "Ł": "L", // letters with a stroke do not decompose
  "ł": "l",
  "Đ": "D",
  "đ": "d",
  "№": "No",
  "←": "<-",
  "→": "->",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "≈": "~",
};

const inWinAnsi = (ch: string): boolean => {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || WIN_ANSI_EXTRA.has(ch);
};

/**
 * Text that the standard Helvetica font can encode: NFC-composed, common look-alikes mapped
 * (ligatures, special spaces and hyphens, primes), control characters dropped, anything else "?".
 */
export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (ch in SUBSTITUTES) out += SUBSTITUTES[ch];
    else if (inWinAnsi(ch)) out += ch;
    else if (/\s/.test(ch)) out += " ";
    else if ((ch.codePointAt(0) ?? 0) < 0x20) continue;
    else {
      // A letter with an accent WinAnsi lacks (e.g. "ő"): keep the base letter.
      const base = ch.normalize("NFD").replace(/\p{M}+/gu, "");
      out += base.length > 0 && [...base].every(inWinAnsi) ? base : "?";
    }
  }
  return out;
}

// ---------- geometry ----------

export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) throw new Error("matrix is not invertible");
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

export const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Helvetica's ascender over the em (718/1000), rounded: box top to baseline is about this much of the font size. */
const ASCENT = 0.75;

/** Baseline height (image y) under a word: from the line's baseline when Tesseract has one, else near the box bottom. */
export function baselineY(word: Box, baseline?: Box | null): number {
  const h = word.y1 - word.y0;
  let y = word.y1 - h * 0.2;
  if (baseline && baseline.x1 !== baseline.x0) {
    const mid = (word.x0 + word.x1) / 2;
    const t = (mid - baseline.x0) / (baseline.x1 - baseline.x0);
    y = baseline.y0 + t * (baseline.y1 - baseline.y0);
  } else if (baseline) {
    y = baseline.y0;
  }
  // Keep it inside the lower half of the word box (a wild baseline must not move the word).
  return Math.min(word.y1, Math.max(word.y0 + h * 0.5, y));
}

/**
 * Text matrix (with font size 1) that lays a word of advance width `width1` (text units at size 1)
 * exactly over its image box: starts at the box's left edge on the baseline, ends at its right
 * edge, glyphs about as tall as the box. `inverse` maps image pixels to PDF user space.
 */
export function wordMatrix(box: Box, baseY: number, width1: number, inverse: Matrix): Matrix | null {
  const w = box.x1 - box.x0;
  const size = Math.max(1, (baseY - box.y0) / ASCENT);
  if (!(w > 0) || !(width1 > 0)) return null;
  const [ox, oy] = apply(inverse, box.x0, baseY);
  const [rx, ry] = apply(inverse, box.x1, baseY);
  const [ux, uy] = apply(inverse, box.x0, baseY - size);
  return [(rx - ox) / width1, (ry - oy) / width1, ux - ox, uy - oy, ox, oy];
}

// ---------- writing ----------

/** pdf-lib operators that draw one page's words invisibly. Each word but the last on a line carries a trailing space, so text extraction keeps word gaps. */
export function textLayerOperators(layer: PageLayer, font: PDFFont, fontKey: Parameters<typeof setFontAndSize>[0]): PDFOperator[] {
  const inverse = invert(layer.transform);
  const ops: PDFOperator[] = [];
  for (const line of layer.lines) {
    const words = line.words
      .map((w) => ({ ...w, text: toWinAnsi(w.text).trim() }))
      .filter((w) => w.text.length > 0 && w.bbox.x1 > w.bbox.x0 && w.bbox.y1 > w.bbox.y0);
    words.forEach((word, i) => {
      const width1 = font.widthOfTextAtSize(word.text, 1);
      const m = wordMatrix(word.bbox, baselineY(word.bbox, line.baseline), width1, inverse);
      if (!m || !m.every(Number.isFinite)) return;
      const shown = i < words.length - 1 ? `${word.text} ` : word.text;
      ops.push(setTextMatrix(...m), showText(font.encodeText(shown)));
    });
  }
  if (ops.length === 0) return [];
  return [pushGraphicsState(), beginText(), setFontAndSize(fontKey, 1), setTextRenderingMode(TextRenderingMode.Invisible), ...ops, endText(), popGraphicsState()];
}

/** Append the invisible text to a page, after wrapping its existing content in q/Q so any leftover graphics state cannot move it. */
export function addTextLayer(page: PDFPage, font: PDFFont, layer: PageLayer): boolean {
  const node = page.node;
  node.normalize();
  const fontKey = node.newFontDictionary(font.name, font.ref);
  const ops = textLayerOperators(layer, font, fontKey);
  if (ops.length === 0) return false;
  const context = page.doc.context;
  const stream = (operators: PDFOperator[]) => context.register(PDFContentStream.of(context.obj({}), operators));
  node.wrapContentStreams(stream([pushGraphicsState()]), stream([popGraphicsState()]));
  node.addContentStream(stream(ops));
  return true;
}

/**
 * The searchable copy: every page of `source` copied unchanged (pdf-lib copyPages), with an
 * invisible text layer on the pages that have one in `layers` (indexed by 0-based page number).
 */
export async function buildSearchablePdf(source: Uint8Array, layers: (PageLayer | null | undefined)[]): Promise<Uint8Array> {
  const src = await loadPdf(source);
  const out = await PDFDocument.create({ updateMetadata: false });
  const title = src.getTitle();
  if (title) out.setTitle(title);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((page, i) => {
    out.addPage(page);
    const layer = layers[i];
    if (layer && layer.lines.length > 0) addTextLayer(page, font, layer);
  });
  return out.save({ useObjectStreams: true });
}
