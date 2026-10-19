/**
 * Page geometry for Sign PDF (pure, unit-tested; no DOM, no pdf-lib).
 *
 * Two coordinate systems:
 * - the view: the page as the reader sees it (and PDF.js draws it at scale 1), in PDF points, origin at
 *   the top-left corner, y down, after the page's /Rotate is applied and clipped to its visible box;
 * - PDF user space: points, origin at the bottom-left of the media, y up, before /Rotate.
 * Placements are stored as rectangles in the view, upright as the user placed them. The writer turns
 * each into pdf-lib drawImage parameters that put the image at the same spot, upright on screen.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** A box in PDF user space (bottom-left corner, y up), as pdf-lib's getMediaBox()/getCropBox() return it. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A rectangle in the view: points from the top-left corner of the page as displayed. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Any angle in degrees -> 0 | 90 | 180 | 270 (the PDF spec only allows multiples of 90). */
export const toRotation = (angle: number): Rotation => ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;

/** A box with a positive width and height (a PDF rectangle may list its corners in any order). */
export function normaliseBox(b: Box): Box {
  return {
    x: Math.min(b.x, b.x + b.width),
    y: Math.min(b.y, b.y + b.height),
    width: Math.abs(b.width),
    height: Math.abs(b.height),
  };
}

/** The visible part of the page: CropBox clipped to MediaBox, as PDF readers (and PDF.js) show it. */
export function visibleBox(media: Box, crop: Box): Box {
  const m = normaliseBox(media);
  const c = normaliseBox(crop);
  const x0 = Math.max(m.x, c.x);
  const y0 = Math.max(m.y, c.y);
  const x1 = Math.min(m.x + m.width, c.x + c.width);
  const y1 = Math.min(m.y + m.height, c.y + c.height);
  if (x1 - x0 <= 0 || y1 - y0 <= 0) return m;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Width and height of the page as displayed. */
export function viewSize(box: Box, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270
    ? { width: box.height, height: box.width }
    : { width: box.width, height: box.height };
}

/** A point in the view -> PDF user space. */
export function viewToUser(vx: number, vy: number, box: Box, rotation: Rotation): { x: number; y: number } {
  const W = box.width;
  const H = box.height;
  // First undo the rotation: (ux, uy) is measured from the unrotated box's top-left, y down.
  let ux: number;
  let uy: number;
  switch (rotation) {
    case 0:
      ux = vx;
      uy = vy;
      break;
    case 90:
      ux = vy;
      uy = H - vx;
      break;
    case 180:
      ux = W - vx;
      uy = H - vy;
      break;
    case 270:
      ux = W - vy;
      uy = vx;
      break;
  }
  return { x: box.x + ux, y: box.y + H - uy };
}

/** A point in PDF user space -> the view (the inverse of viewToUser). */
export function userToView(x: number, y: number, box: Box, rotation: Rotation): { x: number; y: number } {
  const W = box.width;
  const H = box.height;
  const ux = x - box.x;
  const uy = box.y + H - y;
  switch (rotation) {
    case 0:
      return { x: ux, y: uy };
    case 90:
      return { x: H - uy, y: ux };
    case 180:
      return { x: W - ux, y: H - uy };
    case 270:
      return { x: uy, y: W - ux };
  }
}

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
