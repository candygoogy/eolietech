import { describe, expect, it } from "vitest";
import { toRotation, userToView, viewSize, viewToUser, visibleBox, type Box, type Rotation } from "./page-box";

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

describe("toRotation", () => {
  it("normalises angles", () => {
    expect([0, 90, 180, 270, 360, -90, 450].map(toRotation)).toEqual([0, 90, 180, 270, 0, 270, 90]);
  });
});

describe("a CropBox inside a larger MediaBox", () => {
  /** A Letter-ish page whose visible box is offset from the origin (CropBox inside a larger MediaBox). */
  const media: Box = { x: 0, y: 0, width: 700, height: 900 };
  const crop: Box = { x: 50, y: 30, width: 600, height: 800 };
  const box = visibleBox(media, crop);

  it("uses the CropBox clipped to the MediaBox and swaps sides for quarter turns", () => {
    expect(box).toEqual(crop);
    expect(visibleBox(media, { x: -10, y: 850, width: 100, height: 100 })).toEqual({ x: 0, y: 850, width: 90, height: 50 });
    expect(viewSize(box, 0)).toEqual({ width: 600, height: 800 });
    expect(viewSize(box, 90)).toEqual({ width: 800, height: 600 });
    expect(toRotation(-90)).toBe(270);
    expect(toRotation(450)).toBe(90);
  });

  it("falls back to the MediaBox for a CropBox off the media and normalises reversed corners", () => {
    expect(box).toEqual(crop);
    expect(visibleBox(media, { x: -10, y: 850, width: 100, height: 100 })).toEqual({ x: 0, y: 850, width: 90, height: 50 });
    // A CropBox entirely off the media falls back to the MediaBox; reversed corners are normalised.
    expect(visibleBox(media, { x: 800, y: 0, width: 10, height: 10 })).toEqual(media);
    expect(visibleBox({ x: 700, y: 900, width: -700, height: -900 }, crop)).toEqual(crop);
    expect(viewSize(box, 0)).toEqual({ width: 600, height: 800 });
    expect(viewSize(box, 270)).toEqual({ width: 800, height: 600 });
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

  it.each(ROTATIONS)("round-trips points at rotation %i", (r) => {
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

  it("round-trips view <-> user space for every rotation", () => {
    for (const r of ROTATIONS) {
      for (const [vx, vy] of [
        [0, 0],
        [123, 45],
        [viewSize(box, r).width, viewSize(box, r).height],
      ] as const) {
        const u = viewToUser(vx, vy, box, r);
        const back = userToView(u.x, u.y, box, r);
        expect(back.x).toBeCloseTo(vx, 6);
        expect(back.y).toBeCloseTo(vy, 6);
      }
    }
    // The displayed top-left corner is the box's top-left (0), bottom-left (90), bottom-right (180), top-right (270).
    expect(viewToUser(0, 0, box, 0)).toEqual({ x: 50, y: 830 });
    expect(viewToUser(0, 0, box, 90)).toEqual({ x: 50, y: 30 });
    expect(viewToUser(0, 0, box, 180)).toEqual({ x: 650, y: 30 });
    expect(viewToUser(0, 0, box, 270)).toEqual({ x: 650, y: 830 });
  });
});

describe("a CropBox off-centre on both axes", () => {
  /** A media box with a CropBox well inside it, off-centre on both axes. */
  const MEDIA: Box = { x: 0, y: 0, width: 600, height: 800 };
  const CROP: Box = { x: 50, y: 100, width: 400, height: 500 };

  it("clips the CropBox to the MediaBox", () => {
    expect(visibleBox(MEDIA, CROP)).toEqual(CROP);
    expect(visibleBox(MEDIA, { x: -50, y: 700, width: 200, height: 200 })).toEqual({ x: 0, y: 700, width: 150, height: 100 });
    // A CropBox outside the media falls back to the media.
    expect(visibleBox(MEDIA, { x: 900, y: 900, width: 10, height: 10 })).toEqual(MEDIA);
  });

  it.each(ROTATIONS)("viewToUser and userToView are inverses at %i°", (r) => {
    for (const [vx, vy] of [
      [0, 0],
      [12, 34],
      [123.5, 77.25],
    ] as const) {
      const u = viewToUser(vx, vy, CROP, r);
      const back = userToView(u.x, u.y, CROP, r);
      expect(back.x).toBeCloseTo(vx, 9);
      expect(back.y).toBeCloseTo(vy, 9);
    }
  });
});
