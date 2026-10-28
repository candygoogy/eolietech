/**
 * Page numbers: labels and placement (pure, unit-tested; no DOM, no pdf-lib).
 *
 * Two coordinate systems, as in Sign PDF:
 * - the view: the page as the reader sees it (and PDF.js draws it at scale 1), in PDF points, origin at
 *   the top-left corner, y down, after the page's /Rotate is applied and clipped to its visible box;
 * - PDF user space: points, origin at the bottom-left of the media, y up, before /Rotate.
 * The boxes, /Rotate and the mapping between the two live in ../pdf-shared/page-box.ts.
 * A label is laid out in the view (where the reader expects it) and then turned into pdf-lib drawText
 * parameters: the baseline origin in user space plus the rotation that keeps the text upright on screen.
 */

import { viewSize, viewToUser, type Box, type Point, type Rotation, type Size } from "../pdf-shared/page-box";

export const POSITIONS = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const;
export type Position = (typeof POSITIONS)[number];
export const DEFAULT_POSITION: Position = "bottom-center";
export const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);

/** "1", "1 / 12", "Page 1 of 12" (the words come from the UI strings). */
export const FORMATS = ["number", "slash", "words"] as const;
export type LabelFormat = (typeof FORMATS)[number];
export const DEFAULT_FORMAT: LabelFormat = "number";
export const isFormat = (v: unknown): v is LabelFormat => FORMATS.includes(v as LabelFormat);

/** Font sizes in points. */
export const SIZES = { small: 9, medium: 11, large: 14 } as const;
export type SizeName = keyof typeof SIZES;
export const DEFAULT_SIZE: SizeName = "medium";
export const MIN_SIZE = 6;
export const MAX_SIZE = 72;

/** Distance from the visible page edge to the nearest edge of the text, in millimetres. */
export const DEFAULT_MARGIN_MM = 10;
export const MAX_MARGIN_MM = 50;
export const MAX_START = 99999;

/** Helvetica's ascender and descender (AFM, per unit of font size): the text's top and bottom around the baseline. */
export const ASCENT = 0.718;
export const DESCENT = 0.207;

export const mmToPt = (mm: number): number => (mm * 72) / 25.4;

// ---------- labels ----------

export interface Numbering {
  /** The number printed on each page (by 0-based index), or null for pages left unnumbered. */
  numbers: (number | null)[];
  /** The last number printed: the "12" of "1 / 12". */
  total: number;
}

/**
 * Which number goes on which page. Pages before `firstPage` (1-based) get none; `firstPage` gets
 * `startAt` and the count goes up by one per page from there.
 */
export function numbering(pageCount: number, firstPage: number, startAt: number): Numbering {
  const first = Math.min(Math.max(1, Math.floor(firstPage)), Math.max(1, pageCount));
  const numbers = Array.from({ length: pageCount }, (_, i) => (i + 1 < first ? null : startAt + (i + 1 - first)));
  return { numbers, total: startAt + Math.max(0, pageCount - first) };
}

/** The label for page number `n` of `total`. `words` is the localised "Page {n} of {total}" template. */
export function formatLabel(format: LabelFormat, n: number, total: number, words: string): string {
  switch (format) {
    case "number":
      return String(n);
    case "slash":
      return `${n} / ${total}`;
    case "words":
      return words.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));
  }
}

/** A whole number from a form field, or null when it is empty, not whole or outside [min, max]. */
export function parseWhole(value: string, min: number, max: number): number | null {
  const s = value.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

/** A number (decimals allowed, comma or point) from a form field, or null outside [min, max]. */
export function parseDecimal(value: string, min: number, max: number): number | null {
  const s = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

// ---------- placement ----------

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Where the label's baseline starts in the view (points from the top-left of the page as displayed).
 * `margin` is the gap between the page edge and the text: its side for left/right, its top (ascender)
 * or bottom (descender) for top/bottom, so the baseline stays put whatever the digits are. A label too
 * big for the margin is pulled back onto the page.
 */
export function labelOrigin(page: Size, position: Position, margin: number, textWidth: number, size: number): Point {
  const [vertical, horizontal] = position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
  const ascent = ASCENT * size;
  const descent = DESCENT * size;
  let x: number;
  if (horizontal === "left") x = margin;
  else if (horizontal === "right") x = page.width - margin - textWidth;
  else x = (page.width - textWidth) / 2;
  const y = vertical === "top" ? margin + ascent : page.height - margin - descent;
  return {
    x: clamp(x, 0, page.width - textWidth),
    y: clamp(y, ascent, page.height - descent),
  };
}

export interface TextPlacement {
  /** Baseline origin in user space (pdf-lib drawText x, y). */
  x: number;
  y: number;
  /** Counter-clockwise rotation around (x, y), in degrees, so the text reads upright on screen. */
  rotate: Rotation;
}

/**
 * pdf-lib drawText options for a label on a page whose visible box is `box`, shown turned clockwise
 * by `rotation`. The text is drawn turned the other way around its baseline origin, so it reads upright.
 */
export function placeLabel(box: Box, rotation: Rotation, position: Position, margin: number, textWidth: number, size: number): TextPlacement {
  const o = labelOrigin(viewSize(box, rotation), position, margin, textWidth, size);
  const u = viewToUser(o.x, o.y, box, rotation);
  return { x: u.x, y: u.y, rotate: rotation };
}

/** A point `along` the baseline of a label placed with `p`, in user space (for tests and sanity checks). */
export function alongBaseline(p: TextPlacement, along: number): Point {
  const rad = (p.rotate * Math.PI) / 180;
  return { x: p.x + along * Math.round(Math.cos(rad)), y: p.y + along * Math.round(Math.sin(rad)) };
}
