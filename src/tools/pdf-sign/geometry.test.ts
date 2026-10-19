import { describe, expect, it } from "vitest";
import {
  drawParams,
  drawnCorners,
  fitInside,
  nudge,
  placeAt,
  resizeFromCorner,
  toRotation,
  userToView,
  viewSize,
  viewToUser,
  visibleBox,
  type Box,
  type Rotation,
  type ViewRect,
} from "./geometry";

/** A Letter-ish page whose visible box is offset from the origin (CropBox inside a larger MediaBox). */
const media: Box = { x: 0, y: 0, width: 700, height: 900 };
const crop: Box = { x: 50, y: 30, width: 600, height: 800 };
const box = visibleBox(media, crop);

/** The rectangle an image drawn with drawParams covers, back in view coordinates. */
function landed(rect: ViewRect, rotation: Rotation): ViewRect {
  const corners = drawnCorners(drawParams(rect, box, rotation)).map((c) => userToView(c.x, c.y, box, rotation));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

describe("view <-> PDF user space", () => {
  it("uses the CropBox clipped to the MediaBox and swaps sides for quarter turns", () => {
    expect(box).toEqual(crop);
    expect(visibleBox(media, { x: -10, y: 850, width: 100, height: 100 })).toEqual({ x: 0, y: 850, width: 90, height: 50 });
    expect(viewSize(box, 0)).toEqual({ width: 600, height: 800 });
    expect(viewSize(box, 90)).toEqual({ width: 800, height: 600 });
    expect(toRotation(-90)).toBe(270);
    expect(toRotation(450)).toBe(90);
  });

  it("maps the displayed top-left corner to the right user-space corner for each rotation", () => {
    // Top-left of the screen is: the box's top-left (0), bottom-left (90), bottom-right (180), top-right (270).
    expect(viewToUser(0, 0, box, 0)).toEqual({ x: 50, y: 830 });
    expect(viewToUser(0, 0, box, 90)).toEqual({ x: 50, y: 30 });
    expect(viewToUser(0, 0, box, 180)).toEqual({ x: 650, y: 30 });
    expect(viewToUser(0, 0, box, 270)).toEqual({ x: 650, y: 830 });
  });

  it.each([0, 90, 180, 270] as Rotation[])("round-trips points at rotation %i", (r) => {
    const { width, height } = viewSize(box, r);
    for (const [vx, vy] of [
      [0, 0],
      [width, height],
      [123.5, 45.25],
      [width / 3, height - 7],
    ]) {
      const u = viewToUser(vx!, vy!, box, r);
      expect(u.x).toBeGreaterThanOrEqual(box.x);
      expect(u.x).toBeLessThanOrEqual(box.x + box.width);
      expect(u.y).toBeGreaterThanOrEqual(box.y);
      expect(u.y).toBeLessThanOrEqual(box.y + box.height);
      const v = userToView(u.x, u.y, box, r);
      expect(v.x).toBeCloseTo(vx!, 9);
      expect(v.y).toBeCloseTo(vy!, 9);
    }
  });

  it.each([0, 90, 180, 270] as Rotation[])("draws an image exactly on the placed rectangle at rotation %i", (r) => {
    const rect = { x: 100, y: 420, w: 150, h: 50 };
    const p = drawParams(rect, box, r);
    expect(p.rotate).toBe(r);
    expect([p.width, p.height]).toEqual([150, 50]);
    const got = landed(rect, r);
    for (const k of ["x", "y", "w", "h"] as const) expect(got[k]).toBeCloseTo(rect[k], 9);
  });

  it("anchors the image at its on-screen bottom-left corner, upright for the reader", () => {
    // Rotated 90: the page is turned clockwise on screen, so the image is drawn turned
    // counter-clockwise: its "up" runs toward -x in user space and its width toward +y.
    const p = drawParams({ x: 10, y: 20, w: 30, h: 5 }, box, 90);
    expect(viewToUser(10, 25, box, 90)).toEqual({ x: p.x, y: p.y });
    const [bl, br, , tl] = drawnCorners(p);
    expect(br!.y - bl!.y).toBeCloseTo(30);
    expect(tl!.x - bl!.x).toBeCloseTo(-5);
  });
});

describe("placing and editing in the view", () => {
  const page = { width: 600, height: 800 };

  it("places centred on the click and keeps the box on the page", () => {
    expect(placeAt(300, 400, 150, 3, page)).toEqual({ x: 225, y: 375, w: 150, h: 50 });
    expect(placeAt(590, 5, 150, 3, page)).toEqual({ x: 450, y: 0, w: 150, h: 50 });
    // Wider than the page: scaled down, aspect kept.
    expect(fitInside({ x: 0, y: 0, w: 1200, h: 100 }, page)).toEqual({ x: 0, y: 0, w: 600, h: 50 });
  });

  it("resizes from a corner with the aspect kept and the opposite corner fixed", () => {
    const start = { x: 100, y: 100, w: 150, h: 50 };
    expect(resizeFromCorner(start, "se", 30, 0, page, 20)).toEqual({ x: 100, y: 100, w: 180, h: 60 });
    const nw = resizeFromCorner(start, "nw", 0, 10, page, 20);
    expect(nw).toEqual({ x: 130, y: 110, w: 120, h: 40 });
    // Never past the page edge or below the minimum.
    expect(resizeFromCorner(start, "se", 5000, 0, page, 20).w).toBe(500);
    expect(resizeFromCorner(start, "se", -5000, 0, page, 20).w).toBe(20);
  });

  it("nudges with arrows and resizes with Alt+arrows", () => {
    const r = { x: 100, y: 100, w: 150, h: 50 };
    expect(nudge(r, "ArrowRight", 10, false, page, 20)).toEqual({ x: 110, y: 100, w: 150, h: 50 });
    expect(nudge(r, "ArrowUp", 1, false, page, 20)).toEqual({ x: 100, y: 99, w: 150, h: 50 });
    expect(nudge({ ...r, x: 0 }, "ArrowLeft", 10, false, page, 20).x).toBe(0);
    expect(nudge(r, "ArrowDown", 15, true, page, 20)).toEqual({ x: 100, y: 100, w: 165, h: 55 });
    expect(nudge(r, "ArrowLeft", 15, true, page, 20)).toEqual({ x: 100, y: 100, w: 135, h: 45 });
  });
});
