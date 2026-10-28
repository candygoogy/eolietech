import { describe, expect, it } from "vitest";
import { boxFromDrag, clipBox, defaultBox, moveBox, nudgeBox, redactedName, resizeBox, toImagePoint, toPreview, type Box } from "./geometry";

const W = 4000;
const H = 3000;
const inside = (b: Box, w = W, h = H) =>
  Number.isInteger(b.x) && Number.isInteger(b.y) && b.x >= 0 && b.y >= 0 && b.w >= 1 && b.h >= 1 && b.x + b.w <= w && b.y + b.h <= h;

describe("preview to image coordinates", () => {
  const frame = { left: 100, top: 50, width: 800, height: 600 };

  it("scales a point on the frame to source pixels", () => {
    expect(toImagePoint(100, 50, frame, W, H)).toEqual({ x: 0, y: 0 });
    expect(toImagePoint(500, 350, frame, W, H)).toEqual({ x: 2000, y: 1500 });
    expect(toImagePoint(900, 650, frame, W, H)).toEqual({ x: 4000, y: 3000 });
  });

  it("keeps points dragged past the frame on the image", () => {
    expect(toImagePoint(0, 0, frame, W, H)).toEqual({ x: 0, y: 0 });
    expect(toImagePoint(5000, 5000, frame, W, H)).toEqual({ x: W, y: H });
  });

  it("survives an empty frame", () => {
    expect(toImagePoint(10, 10, { left: 0, top: 0, width: 0, height: 0 }, W, H)).toEqual({ x: 0, y: 0 });
  });
});

describe("drawing a box", () => {
  it("spans the drag in either direction, grown out to whole pixels", () => {
    expect(boxFromDrag(10.4, 20.6, 50.2, 60.1, W, H)).toEqual({ x: 10, y: 20, w: 41, h: 41 });
    expect(boxFromDrag(50.2, 60.1, 10.4, 20.6, W, H)).toEqual({ x: 10, y: 20, w: 41, h: 41 });
  });

  it("stays on the image and is never empty", () => {
    expect(boxFromDrag(-50, -50, 5000, 5000, W, H)).toEqual({ x: 0, y: 0, w: W, h: H });
    expect(boxFromDrag(30, 30, 30, 30, W, H)).toEqual({ x: 30, y: 30, w: 1, h: 1 });
    expect(boxFromDrag(W, H, W, H, W, H)).toEqual({ x: W - 1, y: H - 1, w: 1, h: 1 });
  });
});

describe("moving and resizing", () => {
  const b: Box = { x: 100, y: 100, w: 200, h: 100 };

  it("moves and stops at the edges", () => {
    expect(moveBox(b, 50, -20, W, H)).toEqual({ x: 150, y: 80, w: 200, h: 100 });
    expect(moveBox(b, -500, 99999, W, H)).toEqual({ x: 0, y: H - 100, w: 200, h: 100 });
  });

  it("resizes from any handle with the opposite side fixed, and keeps a minimum", () => {
    expect(resizeBox(b, "se", 30, 40, W, H)).toEqual({ x: 100, y: 100, w: 230, h: 140 });
    expect(resizeBox(b, "nw", -30, -40, W, H)).toEqual({ x: 70, y: 60, w: 230, h: 140 });
    expect(resizeBox(b, "e", -1000, 0, W, H, 12)).toEqual({ x: 100, y: 100, w: 12, h: 100 });
    expect(resizeBox(b, "n", 0, -1000, W, H)).toEqual({ x: 100, y: 0, w: 200, h: 200 });
  });

  it("nudges with arrows, and resizes from the bottom-right with resize on", () => {
    expect(nudgeBox(b, "ArrowRight", 1, false, W, H)).toEqual({ x: 101, y: 100, w: 200, h: 100 });
    expect(nudgeBox(b, "ArrowUp", 10, false, W, H)).toEqual({ x: 100, y: 90, w: 200, h: 100 });
    expect(nudgeBox(b, "ArrowRight", 10, true, W, H)).toEqual({ x: 100, y: 100, w: 210, h: 100 });
    expect(nudgeBox(b, "ArrowUp", 1, true, W, H)).toEqual({ x: 100, y: 100, w: 200, h: 99 });
    expect(nudgeBox({ x: 0, y: 0, w: 5, h: 5 }, "ArrowLeft", 10, false, W, H)).toEqual({ x: 0, y: 0, w: 5, h: 5 });
  });
});

describe("the Add button's box", () => {
  it("is a centred square a quarter of the shorter side", () => {
    expect(defaultBox(W, H)).toEqual({ x: 1625, y: 1125, w: 750, h: 750 });
    expect(defaultBox(64, 48)).toEqual({ x: 26, y: 18, w: 12, h: 12 });
  });

  it("steps the next boxes down and right, always on the image", () => {
    const first = defaultBox(W, H, 0);
    const second = defaultBox(W, H, 1);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);
    for (let i = 0; i < 12; i++) expect(inside(defaultBox(W, H, i))).toBe(true);
    expect(inside(defaultBox(3, 2, 4), 3, 2)).toBe(true);
    expect(inside(defaultBox(1, 1), 1, 1)).toBe(true);
  });
});

describe("preview mapping", () => {
  it("scales a box to the preview, growing out to cover every pixel it touches", () => {
    expect(toPreview({ x: 100, y: 100, w: 200, h: 100 }, W, H, 1000, 750)).toEqual({ x: 25, y: 25, w: 50, h: 25 });
    expect(toPreview({ x: 101, y: 101, w: 2, h: 2 }, W, H, 1000, 750)).toEqual({ x: 25, y: 25, w: 1, h: 1 });
    expect(toPreview({ x: 3999, y: 2999, w: 1, h: 1 }, W, H, 1000, 750)).toEqual({ x: 999, y: 749, w: 1, h: 1 });
  });

  it("is the identity at full size", () => {
    expect(toPreview({ x: 7, y: 9, w: 11, h: 13 }, 64, 48, 64, 48)).toEqual({ x: 7, y: 9, w: 11, h: 13 });
  });

  it("clips boxes to the image", () => {
    expect(clipBox({ x: -5, y: -5, w: 10, h: 10 }, 64, 48)).toEqual({ x: 0, y: 0, w: 5, h: 5 });
    expect(clipBox({ x: 60, y: 40, w: 10, h: 10 }, 64, 48)).toEqual({ x: 60, y: 40, w: 4, h: 8 });
    expect(clipBox({ x: 70, y: 0, w: 10, h: 10 }, 64, 48)).toBeNull();
  });
});

describe("download name", () => {
  it("adds the suffix, keeping the extension when the format is unchanged", () => {
    expect(redactedName("holiday.jpeg", true, "jpg", "redacted")).toBe("holiday-redacted.jpeg");
    expect(redactedName("holiday.jpeg", false, "png", "redacted")).toBe("holiday-redacted.png");
    expect(redactedName("scan", true, "webp", "oscurata")).toBe("scan-oscurata.webp");
  });
});
