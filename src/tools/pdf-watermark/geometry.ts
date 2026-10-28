/**
 * Watermark geometry (pure, unit-tested; no DOM, no pdf-lib).
 *
 * Two coordinate systems, as in Sign PDF:
 * - the view: the page as the reader sees it (and PDF.js draws it at scale 1), in PDF points, origin at
 *   the top-left corner, y down, after the page's /Rotate is applied and clipped to its visible box;
 * - PDF user space: points, origin at the bottom-left of the media, y up, before /Rotate.
 * Everything is planned in the view (so the preview can draw it directly) and only then turned into
 * user-space drawing parameters for pdf-lib. Angles are in degrees, counter-clockwise as seen on screen.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** A box in PDF user space (bottom-left corner, y up), as pdf-lib's getMediaBox()/getCropBox() return it. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A rectangle in the view: points from the top-left corner of the page as displayed. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------- page boxes and rotation ----------

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
  return rotation === 90 || rotation === 270 ? { width: box.height, height: box.width } : { width: box.width, height: box.height };
}

/** A point in the view -> PDF user space. */
export function viewToUser(vx: number, vy: number, box: Box, rotation: Rotation): Point {
  const W = box.width;
  const H = box.height;
  // Undo the rotation: (ux, uy) is measured from the unrotated box's top-left, y down.
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
export function userToView(x: number, y: number, box: Box, rotation: Rotation): Point {
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

/** Degrees -> [0, 360). */
export const wrapDegrees = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * The user-space angle that reads as `screenAngle` on a page shown turned clockwise by `rotation`.
 * pdf-lib rotates counter-clockwise in user space, and the viewer then turns everything clockwise.
 */
export const userAngle = (screenAngle: number, rotation: Rotation): number => wrapDegrees(screenAngle + rotation);

// ---------- text ----------

/** Helvetica and Helvetica-Bold share these AFM metrics (per 1 point of font size). */
export const CAP_HEIGHT = 0.718;
export const DESCENT = 0.207;

export type AngleChoice = "diagonal" | "horizontal" | number;
export type Layout = "single" | "tile";

/** The screen angle for a choice: "diagonal" runs from the bottom-left to the top-right corner of this page. */
export function resolveAngle(choice: AngleChoice, view: Size): number {
  if (choice === "horizontal") return 0;
  if (choice === "diagonal") return (Math.atan2(view.height, view.width) * 180) / Math.PI;
  if (!Number.isFinite(choice)) return 0;
  // Into (-180, 180], so 270 and -90 are the same angle.
  const a = wrapDegrees(choice);
  return a > 180 ? a - 360 : a;
}

/** How much of the page a fitted text may span (the rest is margin). */
export const FIT_MARGIN = 0.86;
/** Font sizes the plan will use, in points. */
export const MIN_SIZE = 4;
export const MAX_SIZE = 1000;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/**
 * The largest font size at which one line of text, `width1` points wide at size 1, fits inside the page
 * at the given angle (with FIT_MARGIN to spare). The line's height is taken as the font size.
 */
export function fitSize(width1: number, angle: number, view: Size, margin = FIT_MARGIN): number {
  const rad = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const byWidth = (margin * view.width) / (width1 * c + s);
  const byHeight = (margin * view.height) / (width1 * s + c);
  return clamp(Math.min(byWidth, byHeight), MIN_SIZE, MAX_SIZE);
}

/** Unit vectors in the view (y down) for text at `angle`: along the baseline, and toward the tops of the letters. */
export function textAxes(angle: number): { u: Point; v: Point } {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { u: { x: cos, y: -sin }, v: { x: -sin, y: -cos } };
}

/** Where a line of text starts (left end of the baseline), in the view, so its capitals are centred on `center`. */
export function textOrigin(center: Point, angle: number, width: number, size: number): Point {
  const { u, v } = textAxes(angle);
  const half = (CAP_HEIGHT * size) / 2;
  return { x: center.x - (u.x * width) / 2 - v.x * half, y: center.y - (u.y * width) / 2 - v.y * half };
}

/** Most copies of the text a tiled page gets; wider spacing beyond that. */
export const MAX_TILES = 400;

export interface TextPlanInput {
  /** Width of the text at size 1, in points (pdf-lib widthOfTextAtSize(text, 1)). */
  width1: number;
  /** Font size in points, or fit one line to the page (single layout only; a tiled page uses FIT_TILE). */
  size: number | "fit";
  angle: AngleChoice;
  layout: Layout;
}

export interface TextPlan {
  size: number;
  /** Screen angle in degrees. */
  angle: number;
  /** Text width at `size`. */
  width: number;
  /** Centre of each copy of the text, in the view. */
  centers: Point[];
}

/** "Fit" on a tiled page: each copy about this fraction of what a single fitted line would be. */
export const FIT_TILE = 1 / 3;

/** Lay out one centred line, or a brick pattern of lines covering the whole page, all at the same angle. */
export function planText(input: TextPlanInput, view: Size): TextPlan {
  const angle = resolveAngle(input.angle, view);
  const width1 = Math.max(input.width1, 1e-6);
  let size =
    input.size === "fit"
      ? fitSize(width1, angle, view) * (input.layout === "tile" ? FIT_TILE : 1)
      : clamp(Number.isFinite(input.size) ? input.size : 36, MIN_SIZE, MAX_SIZE);
  size = clamp(size, MIN_SIZE, MAX_SIZE);
  const width = width1 * size;
  const center = { x: view.width / 2, y: view.height / 2 };
  if (input.layout === "single") return { size, angle, width, centers: [center] };
  return { size, angle, width, centers: tileCenters(view, angle, width, size) };
}

/**
 * Centres of a brick pattern laid along the text's own axes: rows of copies spaced along the baseline,
 * every other row shifted by half a step, rows spaced across it. Copies that cannot touch the page
 * are left out.
 */
export function tileCenters(view: Size, angle: number, width: number, size: number): Point[] {
  const { u, v } = textAxes(angle);
  let stepU = width + Math.max(size * 2, 18);
  let stepV = size * 3.5;
  // Rough count over the page's circumscribed square; widen the spacing to stay under MAX_TILES.
  const diag = Math.hypot(view.width, view.height);
  const estimate = (view.width * view.height) / (stepU * stepV);
  if (estimate > MAX_TILES) {
    const k = Math.sqrt(estimate / MAX_TILES);
    stepU *= k;
    stepV *= k;
  }
  const cx = view.width / 2;
  const cy = view.height / 2;
  // Half the diagonal of one copy: a centre farther than this from the page cannot touch it.
  const reach = Math.hypot(width / 2, size);
  const nu = Math.ceil((diag / 2 + reach) / stepU) + 1;
  const nv = Math.ceil((diag / 2 + reach) / stepV) + 1;
  const out: Point[] = [];
  for (let j = -nv; j <= nv; j++) {
    const shift = Math.abs(j) % 2 === 1 ? stepU / 2 : 0;
    for (let i = -nu; i <= nu; i++) {
      const a = i * stepU + shift;
      const b = j * stepV;
      const p = { x: cx + u.x * a + v.x * b, y: cy + u.y * a + v.y * b };
      const dx = Math.max(0, -p.x, p.x - view.width);
      const dy = Math.max(0, -p.y, p.y - view.height);
      if (Math.hypot(dx, dy) <= reach) out.push(p);
      if (out.length >= MAX_TILES * 2) return out;
    }
  }
  return out;
}

export interface TextDraw {
  /** Start of the baseline, in user space. */
  x: number;
  y: number;
  /** Counter-clockwise rotation in user space, degrees. */
  rotate: number;
}

/** pdf-lib drawText parameters for each planned copy, on a page with this visible box and rotation. */
export function textDraws(plan: TextPlan, box: Box, rotation: Rotation): TextDraw[] {
  const rotate = userAngle(plan.angle, rotation);
  return plan.centers.map((c) => {
    const o = textOrigin(c, plan.angle, plan.width, plan.size);
    const p = viewToUser(o.x, o.y, box, rotation);
    return { x: p.x, y: p.y, rotate };
  });
}

// ---------- image ----------

export type Position = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export const POSITIONS: readonly Position[] = ["center", "top-left", "top-right", "bottom-left", "bottom-right"];

/** Gap between a corner image and the page edges, as a fraction of the page's shorter side. */
export const CORNER_MARGIN = 0.05;

/**
 * Where the image goes in the view: `scale` of the page width wide (aspect = width / height kept),
 * shrunk if needed so it stays on the page, centred or in a corner.
 */
export function imageRect(view: Size, aspect: number, scale: number, position: Position): ViewRect {
  const m = position === "center" ? 0 : Math.min(view.width, view.height) * CORNER_MARGIN;
  const room = { width: view.width - 2 * m, height: view.height - 2 * m };
  let w = view.width * clamp(scale, 0.01, 1);
  let h = w / aspect;
  const shrink = Math.min(1, room.width / w, room.height / h);
  w *= shrink;
  h *= shrink;
  const left = position === "top-left" || position === "bottom-left";
  const right = position === "top-right" || position === "bottom-right";
  const top = position === "top-left" || position === "top-right";
  const bottom = position === "bottom-left" || position === "bottom-right";
  const x = left ? m : right ? view.width - m - w : (view.width - w) / 2;
  const y = top ? m : bottom ? view.height - m - h : (view.height - h) / 2;
  return { x, y, w, h };
}

export interface ImageDraw {
  /** Where the image's own bottom-left corner goes, in user space. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Counter-clockwise rotation around (x, y), so the image reads upright on screen. */
  rotate: Rotation;
}

/** pdf-lib drawImage parameters that put an image exactly on `rect` of the displayed page, upright. */
export function imageDraw(rect: ViewRect, box: Box, rotation: Rotation): ImageDraw {
  const anchor = viewToUser(rect.x, rect.y + rect.h, box, rotation);
  return { x: anchor.x, y: anchor.y, width: rect.w, height: rect.h, rotate: rotation };
}

// ---------- colour ----------

/** "#rrggbb" (or "#rgb") -> [r, g, b] in 0..1; anything else -> null. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let s = m[1]!;
  if (s.length === 3) s = [...s].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
}
