/**
 * Page boxes and /Rotate for the PDF tools that draw onto pages (Sign, Page numbers, Watermark).
 * Pure (no DOM, no pdf-lib) so it is unit-testable.
 *
 * Two coordinate systems:
 * - the view: the page as the reader sees it (and PDF.js draws it at scale 1), in PDF points, origin at
 *   the top-left corner, y down, after the page's /Rotate is applied and clipped to its visible box;
 * - PDF user space: points, origin at the bottom-left of the media, y up, before /Rotate.
 */

import { normaliseAngle } from "./rotation";

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

/** Any angle in degrees -> 0 | 90 | 180 | 270 (the PDF spec only allows multiples of 90). */
export const toRotation = (angle: number): Rotation => normaliseAngle(angle) as Rotation;

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
