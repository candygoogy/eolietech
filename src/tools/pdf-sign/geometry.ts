/**
 * Page geometry for Sign PDF (pure, unit-tested; no DOM, no pdf-lib).
 *
 * Two coordinate systems:
 * - the view: the page as the reader sees it (and PDF.js draws it at scale 1), in PDF points, origin at
 *   the top-left corner, y down, after the page's /Rotate is applied and clipped to its visible box;
 * - PDF user space: points, origin at the bottom-left of the media, y up, before /Rotate.
 * The boxes, /Rotate and the mapping between the two live in ../pdf-shared/page-box.ts.
 * Placements are stored as rectangles in the view, upright as the user placed them. The writer turns
 * each into pdf-lib drawImage parameters that put the image at the same spot, upright on screen.
 */

import { viewToUser, type Box, type Rotation, type Size, type ViewRect } from "../pdf-shared/page-box";

export interface DrawParams {
  /** Where the image's own bottom-left corner goes, in user space. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Counter-clockwise rotation around (x, y), in degrees, so the image reads upright on screen. */
  rotate: Rotation;
}

/**
 * pdf-lib drawImage options that put an image exactly on `rect` of the displayed page, upright.
 * The page is shown turned clockwise by `rotation`, so the image is drawn turned the other way: its
 * bottom-left corner (as seen on screen) is the anchor, and pdf-lib rotates counter-clockwise around it.
 */
export function drawParams(rect: ViewRect, box: Box, rotation: Rotation): DrawParams {
  const anchor = viewToUser(rect.x, rect.y + rect.h, box, rotation);
  return { x: anchor.x, y: anchor.y, width: rect.w, height: rect.h, rotate: rotation };
}

/** The four corners of an image drawn with `p`, in user space (for tests and sanity checks). */
export function drawnCorners(p: DrawParams): { x: number; y: number }[] {
  const rad = (p.rotate * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  return [
    [0, 0],
    [p.width, 0],
    [p.width, p.height],
    [0, p.height],
  ].map(([a, b]) => ({ x: p.x + a! * cos - b! * sin, y: p.y + a! * sin + b! * cos }));
}

// ---------- placing, moving and resizing in the view ----------

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Keep a rectangle inside the page; one that is larger than the page is scaled down first (aspect kept). */
export function fitInside(r: ViewRect, page: Size): ViewRect {
  let { w, h } = r;
  const scale = Math.min(1, page.width / w, page.height / h);
  w *= scale;
  h *= scale;
  return { x: clamp(r.x, 0, page.width - w), y: clamp(r.y, 0, page.height - h), w, h };
}

/** A new placement of `width` points and the given aspect (w / h), centred on (cx, cy). */
export function placeAt(cx: number, cy: number, width: number, aspect: number, page: Size): ViewRect {
  const w = width;
  const h = width / aspect;
  return fitInside({ x: cx - w / 2, y: cy - h / 2, w, h }, page);
}

export function moveRect(r: ViewRect, dx: number, dy: number, page: Size): ViewRect {
  return fitInside({ ...r, x: r.x + dx, y: r.y + dy }, page);
}

export type Corner = "nw" | "ne" | "se" | "sw";
export const CORNERS: readonly Corner[] = ["nw", "ne", "se", "sw"];

/**
 * Drag a corner by (dx, dy) from the rectangle `start` had when the drag began. The opposite corner
 * stays put and the aspect ratio is kept: the width follows whichever axis moved further.
 * `min` is the smallest width allowed.
 */
export function resizeFromCorner(start: ViewRect, corner: Corner, dx: number, dy: number, page: Size, min: number): ViewRect {
  const aspect = start.w / start.h;
  const east = corner === "ne" || corner === "se";
  const south = corner === "se" || corner === "sw";
  const ax = east ? start.x : start.x + start.w;
  const ay = south ? start.y : start.y + start.h;
  const byW = start.w + (east ? dx : -dx);
  const byH = (start.h + (south ? dy : -dy)) * aspect;
  const want = Math.abs(byW - start.w) >= Math.abs(byH - start.w) ? byW : byH;
  const maxW = Math.min(east ? page.width - ax : ax, (south ? page.height - ay : ay) * aspect);
  const w = clamp(want, Math.min(min, maxW), maxW);
  const h = w / aspect;
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
}

export type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
export const isArrowKey = (key: string): key is ArrowKey =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

/** Keyboard: arrows move by `step`; with `resize`, Right/Down grow and Left/Up shrink from the bottom-right corner. */
export function nudge(r: ViewRect, key: ArrowKey, step: number, resize: boolean, page: Size, min: number): ViewRect {
  const dx = key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0;
  const dy = key === "ArrowDown" ? step : key === "ArrowUp" ? -step : 0;
  if (!resize) return moveRect(r, dx, dy, page);
  // One step changes the width by `step` whichever arrow is pressed.
  const grow = dx + dy;
  return resizeFromCorner(r, "se", grow, 0, page, min);
}

/** A placement whose image changed shape (a new signature): same top-left and width, new height. */
export function refit(r: ViewRect, aspect: number, page: Size): ViewRect {
  return fitInside({ x: r.x, y: r.y, w: r.w, h: r.w / aspect }, page);
}

/** Points -> whole millimetres, for announcements. */
export const toMm = (pt: number): number => Math.round((pt * 25.4) / 72);
