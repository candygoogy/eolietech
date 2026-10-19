/**
 * Redaction box math (pure, unit-tested; no DOM, no PDF.js). Every box lives in the page as the
 * user sees it: PDF.js's viewport at scale 1, so units are PDF points, the origin is the top-left
 * corner of the visible page (CropBox), y grows downwards and /Rotate is already applied. The same
 * numbers drive the on-screen overlay (as percentages), the search boxes and the final painting.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A 2D affine matrix as PDF and PDF.js write it: [a, b, c, d, e, f]. */
export type Matrix = readonly [number, number, number, number, number, number] | readonly number[];

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const HANDLES: readonly Handle[] = ["n", "e", "s", "w", "nw", "ne", "se", "sw"];

/** Smallest side a box can have, in points. */
export const MIN_SIDE = 2;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));
/** Keep boxes on a tenth of a point: enough precision, readable numbers in tests. */
const tidy = (v: number): number => Math.round(v * 10) / 10;

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0]! * x + m[2]! * y + m[4]!, m[1]! * x + m[3]! * y + m[5]!];
}

/** The axis-aligned box around some points. */
export function boundsOf(points: readonly (readonly [number, number])[]): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Force a box inside a W x H page, at least MIN_SIDE on each side. */
export function clampBox(b: Box, W: number, H: number): Box {
  const w = clamp(b.w, Math.min(MIN_SIDE, W), W);
  const h = clamp(b.h, Math.min(MIN_SIDE, H), H);
  return { x: tidy(clamp(b.x, 0, W - w)), y: tidy(clamp(b.y, 0, H - h)), w: tidy(w), h: tidy(h) };
}

/** The part of a box that lies on the page, or null when none of it does. */
export function clipBox(b: Box, W: number, H: number): Box | null {
  const x0 = Math.max(0, b.x);
  const y0 = Math.max(0, b.y);
  const x1 = Math.min(W, b.x + b.w);
  const y1 = Math.min(H, b.y + b.h);
  if (x1 - x0 <= 0 || y1 - y0 <= 0) return null;
  return { x: tidy(x0), y: tidy(y0), w: tidy(x1 - x0), h: tidy(y1 - y0) };
}

/** The box spanned by a drag from (x0, y0) to (x1, y1), in either direction, kept on the page. */
export function boxFromDrag(x0: number, y0: number, x1: number, y1: number, W: number, H: number): Box {
  const ax = clamp(Math.min(x0, x1), 0, W);
  const ay = clamp(Math.min(y0, y1), 0, H);
  const bx = clamp(Math.max(x0, x1), 0, W);
  const by = clamp(Math.max(y0, y1), 0, H);
  return clampBox({ x: ax, y: ay, w: bx - ax, h: by - ay }, W, H);
}

export function moveBox(b: Box, dx: number, dy: number, W: number, H: number): Box {
  return clampBox({ ...b, x: b.x + dx, y: b.y + dy }, W, H);
}

/** Drag a handle by (dx, dy) from the box `start` had when the drag began; the opposite side stays put. */
export function resizeBox(start: Box, handle: Handle, dx: number, dy: number, W: number, H: number, min = MIN_SIDE): Box {
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const minW = Math.min(min, start.w);
  const minH = Math.min(min, start.h);
  const l = handle.includes("w") ? clamp(start.x + dx, 0, right - minW) : start.x;
  const r = handle.includes("e") ? clamp(right + dx, start.x + minW, W) : right;
  const t = handle.includes("n") ? clamp(start.y + dy, 0, bottom - minH) : start.y;
  const b = handle.includes("s") ? clamp(bottom + dy, start.y + minH, H) : bottom;
  return clampBox({ x: l, y: t, w: r - l, h: b - t }, W, H);
}

export type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
export const isArrowKey = (key: string): key is ArrowKey =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

/** Keyboard: arrows move by `step` points; with `resize`, Right/Down grow and Left/Up shrink from the bottom-right corner. */
export function nudgeBox(b: Box, key: ArrowKey, step: number, resize: boolean, W: number, H: number): Box {
  const dx = key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0;
  const dy = key === "ArrowDown" ? step : key === "ArrowUp" ? -step : 0;
  return resize ? resizeBox(b, "se", dx, dy, W, H) : moveBox(b, dx, dy, W, H);
}

/** A new box for the keyboard's Add button: a third of the page wide, a line of text high, centred. */
export function defaultBox(W: number, H: number): Box {
  const w = Math.min(W, Math.max(40, W / 3));
  const h = Math.min(H, 24);
  return clampBox({ x: (W - w) / 2, y: (H - h) / 2, w, h }, W, H);
}

/** How much of box `a` lies inside box `b`, 0..1. */
export function coveredBy(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const area = a.w * a.h;
  return area > 0 ? (ix * iy) / area : 1;
}

/** Box position and size as whole percentages of the page, for screen reader announcements. */
export function boxPercent(b: Box, W: number, H: number): { left: number; top: number; width: number; height: number } {
  const pct = (v: number, of: number) => Math.round((v / of) * 100);
  return { left: pct(b.x, W), top: pct(b.y, H), width: pct(b.w, W), height: pct(b.h, H) };
}

/**
 * A text item from PDF.js getTextContent: `transform` places the text in PDF user space (its first
 * column runs along the baseline, the second points up and its length is the font size), `width`
 * is the advance of the whole string in user space.
 */
export interface TextPiece {
  str: string;
  transform: Matrix;
  width: number;
  height: number;
  hasEOL?: boolean;
}

/** How far a box reaches above the baseline and below it, and past each end, in font sizes. */
const ASCENT = 0.95;
const DESCENT = 0.3;
const SIDE_PAD = 0.2;

/**
 * Relative glyph widths (Helvetica's, in 1/1000 em) for printable ASCII, 32 to 126. PDF.js gives
 * one width per text item, not per letter; spreading it by these widths instead of evenly puts a
 * substring where it really is in most proportional fonts ("Email: " is much narrower than seven
 * average letters). The item's real width still sets the scale.
 */
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Width of one character in 1/1000 em; accented letters count as their base letter. */
export function glyphWidth(ch: string): number {
  const base = ch.normalize("NFD").charCodeAt(0);
  return base >= 32 && base <= 126 ? WIDTHS[base - 32]! : 556;
}

/** Where characters `from` and `to` of `str` fall, as fractions of its whole width. */
export function spanOf(str: string, from: number, to: number): [number, number] {
  const chars = [...str];
  let total = 0;
  let start = 0;
  let end = 0;
  // Offsets are in UTF-16 units (as String.slice); walk code points and track both.
  let unit = 0;
  for (const ch of chars) {
    if (unit === from) start = total;
    if (unit === to) end = total;
    total += glyphWidth(ch);
    unit += ch.length;
  }
  if (to >= unit) end = total;
  if (from >= unit) start = total;
  return total > 0 ? [start / total, end / total] : [0, 1];
}

/**
 * The box (in viewport points) over characters `from` to `to` of a text item. PDF.js gives one
 * width per item, not per character, so the substring's position is estimated from typical glyph
 * widths (spanOf) and padded on every side to make up for the estimate. The four corners go
 * through the viewport matrix, so rotated pages and rotated text come out right.
 */
export function textBox(item: TextPiece, from: number, to: number, viewport: Matrix): Box {
  const [a, b, c, d, e, f] = item.transform as number[];
  const [f0, f1] = spanOf(item.str, from, to);
  const along = Math.hypot(a!, b!) || 1;
  const size = Math.hypot(c!, d!) || item.height || along;
  const ux = a! / along;
  const uy = b! / along;
  const vx = c! / size;
  const vy = d! / size;
  const pad = size * SIDE_PAD;
  const s0 = item.width * f0 - pad;
  const s1 = item.width * f1 + pad;
  const t0 = -size * DESCENT;
  const t1 = size * ASCENT;
  const corner = (s: number, t: number) => applyMatrix(viewport, e! + ux * s + vx * t, f! + uy * s + vy * t);
  const r = boundsOf([corner(s0, t0), corner(s1, t0), corner(s1, t1), corner(s0, t1)]);
  return { x: tidy(r.x), y: tidy(r.y), w: tidy(r.w), h: tidy(r.h) };
}

/** Resolution of the redacted pages: sharp enough to read and print small text. */
export const REDACT_DPI = 200;
/** Same cap as PDF to JPG: about 16.7 megapixels, the largest canvas iOS Safari will draw. */
export const MAX_PIXELS = 4096 * 4096;
export const MAX_SIDE = 16384;

/** Canvas size and PDF.js scale for a page of W x H points at `dpi`, scaled down to the pixel caps. */
export function renderSize(W: number, H: number, dpi: number): { scale: number; width: number; height: number; capped: boolean } {
  let scale = dpi / 72;
  const shrink = Math.min(1, Math.sqrt(MAX_PIXELS / (W * scale * H * scale)), MAX_SIDE / (Math.max(W, H) * scale));
  scale *= shrink;
  return { scale, width: Math.max(1, Math.floor(W * scale)), height: Math.max(1, Math.floor(H * scale)), capped: shrink < 1 };
}

/** A box in canvas pixels at `scale`, grown outwards to whole pixels so no edge pixel escapes. */
export function toPixels(b: Box, scale: number, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const x0 = clamp(Math.floor(b.x * scale), 0, width);
  const y0 = clamp(Math.floor(b.y * scale), 0, height);
  const x1 = clamp(Math.ceil((b.x + b.w) * scale), 0, width);
  const y1 = clamp(Math.ceil((b.y + b.h) * scale), 0, height);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Largest page side PDF readers accept (Acrobat's limit: 200 inches). */
export const MAX_PAGE_PT = 14400;

/** The new page's size in points: the visible size, shrunk proportionally if it is over the limit. */
export function outputPageSize(W: number, H: number): { width: number; height: number } {
  const k = Math.min(1, MAX_PAGE_PT / Math.max(W, H));
  return { width: W * k, height: H * k };
}
