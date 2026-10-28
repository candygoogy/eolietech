/**
 * Box math for the image redactor (pure, unit-tested; no DOM). Every box is in pixels of the
 * decoded source image (EXIF orientation already applied), with integer x/y/w/h inside 0..W, 0..H.
 * Moving, resizing and keyboard nudges are the cropper's (free ratio); this adds what several
 * boxes need: drawing one by dragging, a starting box for the keyboard, and the preview mapping.
 */
import { clampRect, moveRect, nudge, resizeRect, type ArrowKey, type Handle, type Rect } from "../image-crop/crop";

export { HANDLES, isArrowKey, sameRect, croppedName as redactedName } from "../image-crop/crop";
export type { ArrowKey, Handle };

export type Box = Rect;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** A point on the preview (client px, relative to the frame's bounding box) in source pixels, kept on the image. */
export function toImagePoint(
  clientX: number,
  clientY: number,
  frame: { left: number; top: number; width: number; height: number },
  W: number,
  H: number,
): { x: number; y: number } {
  const x = frame.width > 0 ? ((clientX - frame.left) / frame.width) * W : 0;
  const y = frame.height > 0 ? ((clientY - frame.top) / frame.height) * H : 0;
  return { x: clamp(x, 0, W), y: clamp(y, 0, H) };
}

/**
 * The box spanned by a drag from (x0, y0) to (x1, y1), in either direction, grown outwards to whole
 * pixels so it covers everything the pointer passed over, kept on the image, at least 1 x 1.
 */
export function boxFromDrag(x0: number, y0: number, x1: number, y1: number, W: number, H: number): Box {
  const ax = clamp(Math.floor(Math.min(x0, x1)), 0, W - 1);
  const ay = clamp(Math.floor(Math.min(y0, y1)), 0, H - 1);
  const bx = clamp(Math.ceil(Math.max(x0, x1)), ax + 1, W);
  const by = clamp(Math.ceil(Math.max(y0, y1)), ay + 1, H);
  return { x: ax, y: ay, w: bx - ax, h: by - ay };
}

export const moveBox = (b: Box, dx: number, dy: number, W: number, H: number): Box => moveRect(b, dx, dy, W, H);

/** Drag a handle from the box `start` had when the drag began; the opposite side stays put. */
export const resizeBox = (start: Box, handle: Handle, dx: number, dy: number, W: number, H: number, min = 1): Box =>
  resizeRect(start, handle, dx, dy, W, H, null, min);

/** Arrows move by `step` px; with `resize`, Right/Down grow and Left/Up shrink from the bottom-right corner. */
export const nudgeBox = (b: Box, key: ArrowKey, step: number, resize: boolean, W: number, H: number): Box =>
  nudge(b, key, step, resize, W, H, null);

/**
 * A new box for the Add button: a square a quarter of the image's shorter side, about the size of
 * a face in a group photo, centred. Each further box steps down and right so they don't stack.
 */
export function defaultBox(W: number, H: number, index = 0): Box {
  const side = Math.max(1, Math.round(Math.min(W, H) / 4));
  const step = Math.round(side / 3) * (index % 5);
  return clampRect({ x: (W - side) / 2 + step, y: (H - side) / 2 + step, w: side, h: side }, W, H);
}

/**
 * A source box on a preview `pw` x `ph` px that shows the W x H image, grown outwards to whole
 * pixels so no edge pixel of the box escapes the effect. Empty (w or h 0) only for an empty preview.
 */
export function toPreview(b: Box, W: number, H: number, pw: number, ph: number): Box {
  const kx = pw / W;
  const ky = ph / H;
  const x0 = clamp(Math.floor(b.x * kx), 0, pw);
  const y0 = clamp(Math.floor(b.y * ky), 0, ph);
  const x1 = clamp(Math.ceil((b.x + b.w) * kx), 0, pw);
  const y1 = clamp(Math.ceil((b.y + b.h) * ky), 0, ph);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The part of a box inside a W x H image, rounded to whole pixels, or null when none of it is. */
export function clipBox(b: Box, W: number, H: number): Box | null {
  const x0 = clamp(Math.floor(b.x), 0, W);
  const y0 = clamp(Math.floor(b.y), 0, H);
  const x1 = clamp(Math.ceil(b.x + b.w), 0, W);
  const y1 = clamp(Math.ceil(b.y + b.h), 0, H);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
