import { describe, expect, it } from "vitest";
import {
  aspectFromPreset,
  clampRect,
  croppedName,
  fitAspect,
  moveRect,
  nudge,
  ratioLabel,
  ratioOf,
  resizeRect,
  setField,
  turnedFromPreset,
  type Rect,
} from "./crop";

const W = 4000;
const H = 3000;
const inside = (r: Rect, w = W, h = H) => r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= w && r.y + r.h <= h;

describe("aspect choices", () => {
  it("reads the variant preset and falls back to free", () => {
    expect(aspectFromPreset({ aspect: "1:1" })).toBe("1:1");
    expect(aspectFromPreset({ aspect: "16:9" })).toBe("16:9");
    expect(aspectFromPreset({})).toBe("free");
    expect(aspectFromPreset({ aspect: "7:3" })).toBe("free");
  });

  it("starts turned only when the preset asks for it on a ratio that turns", () => {
    expect(turnedFromPreset({ aspect: "16:9", turned: true })).toBe(true);
    expect(turnedFromPreset({ aspect: "16:9" })).toBe(false);
    expect(turnedFromPreset({ aspect: "1:1", turned: true })).toBe(false);
    expect(turnedFromPreset({ turned: true })).toBe(false);
  });

  it("turns fixed ratios but not free, original or square", () => {
    expect(ratioOf("free", W, H)).toBeNull();
    expect(ratioOf("original", W, H, true)).toBeCloseTo(4 / 3);
    expect(ratioOf("4:5", W, H)).toBeCloseTo(0.8);
    expect(ratioOf("4:5", W, H, true)).toBeCloseTo(1.25);
    expect(ratioOf("1:1", W, H, true)).toBe(1);
    expect(ratioOf("3:4", W, H)).toBeCloseTo(0.75);
    expect(ratioLabel("3:4", true)).toBe("4:3");
    expect(ratioLabel("16:9", true)).toBe("9:16");
    expect(ratioLabel("1:1", true)).toBe("1:1");
  });
});

describe("fitAspect", () => {
  it("selects the whole image when free", () => {
    expect(fitAspect(W, H, null)).toEqual({ x: 0, y: 0, w: W, h: H });
  });

  it("makes the largest centred box of the ratio", () => {
    expect(fitAspect(W, H, 16 / 9)).toEqual({ x: 0, y: 375, w: 4000, h: 2250 });
    expect(fitAspect(W, H, 1)).toEqual({ x: 500, y: 0, w: 3000, h: 3000 });
  });

  it("centres on the current box but stays inside the image", () => {
    expect(fitAspect(W, H, 1, { x: 3800, y: 0, w: 200, h: 200 })).toEqual({ x: 1000, y: 0, w: 3000, h: 3000 });
  });
});

describe("clamp and move", () => {
  it("rounds and keeps the box inside", () => {
    expect(clampRect({ x: -5.4, y: 2990, w: 100.6, h: 50 }, W, H)).toEqual({ x: 0, y: 2950, w: 101, h: 50 });
    expect(clampRect({ x: 0, y: 0, w: 0, h: 9999 }, W, H)).toEqual({ x: 0, y: 0, w: 1, h: H });
  });

  it("stops at the edges when moving", () => {
    const r = { x: 100, y: 100, w: 1000, h: 1000 };
    expect(moveRect(r, -500, 50, W, H)).toEqual({ x: 0, y: 150, w: 1000, h: 1000 });
    expect(moveRect(r, 9999, 9999, W, H)).toEqual({ x: 3000, y: 2000, w: 1000, h: 1000 });
  });
});

describe("resizeRect", () => {
  const start = { x: 1000, y: 1000, w: 1000, h: 1000 };

  it("free: moves only the dragged edges, keeping the opposite side", () => {
    expect(resizeRect(start, "se", 200, -100, W, H, null)).toEqual({ x: 1000, y: 1000, w: 1200, h: 900 });
    expect(resizeRect(start, "w", -300, 999, W, H, null)).toEqual({ x: 700, y: 1000, w: 1300, h: 1000 });
  });

  it("free: stops at the image edge and at the minimum size", () => {
    expect(resizeRect(start, "nw", -5000, -5000, W, H, null)).toEqual({ x: 0, y: 0, w: 2000, h: 2000 });
    expect(resizeRect(start, "e", -5000, 0, W, H, null, 40)).toEqual({ x: 1000, y: 1000, w: 40, h: 1000 });
  });

  it("locked ratio: corners keep the ratio and the anchor, and fit inside", () => {
    const r = resizeRect(start, "se", 500, 0, W, H, 16 / 9);
    expect(r).toEqual({ x: 1000, y: 1000, w: 1500, h: 844 });
    const big = resizeRect(start, "se", 9000, 9000, W, H, 16 / 9);
    expect(inside(big)).toBe(true);
    expect(big.x).toBe(1000);
    expect(big.w / big.h).toBeCloseTo(16 / 9, 2);
    const nw = resizeRect(start, "nw", -400, -100, W, H, 1);
    expect(nw).toEqual({ x: 600, y: 600, w: 1400, h: 1400 });
  });

  it("locked ratio: an edge grows the other side around its centre, pushed back inside", () => {
    expect(resizeRect(start, "e", 1000, 0, W, H, 1)).toEqual({ x: 1000, y: 500, w: 2000, h: 2000 });
    const top = { x: 0, y: 0, w: 1000, h: 1000 };
    expect(resizeRect(top, "e", 500, 0, W, H, 1)).toEqual({ x: 0, y: 0, w: 1500, h: 1500 });
    expect(resizeRect(start, "s", 0, 9999, W, H, 2)).toEqual({ x: 0, y: 1000, w: 4000, h: 2000 });
  });
});

describe("keyboard and number fields", () => {
  const r = { x: 100, y: 100, w: 1600, h: 900 };

  it("arrows move by the step; with resize they change the size from the bottom-right", () => {
    expect(nudge(r, "ArrowRight", 10, false, W, H, null)).toEqual({ ...r, x: 110 });
    expect(nudge(r, "ArrowUp", 1, false, W, H, null)).toEqual({ ...r, y: 99 });
    expect(nudge(r, "ArrowLeft", 1, true, W, H, null)).toEqual({ ...r, w: 1599 });
    expect(nudge(r, "ArrowDown", 10, true, W, H, null)).toEqual({ ...r, h: 910 });
    const locked = nudge(r, "ArrowRight", 16, true, W, H, 16 / 9);
    expect(locked).toEqual({ x: 100, y: 100, w: 1616, h: 909 });
  });

  it("number fields clamp, and a locked ratio drives the other side", () => {
    expect(setField(r, "x", 99999, W, H, null)).toEqual({ ...r, x: 2400 });
    expect(setField(r, "w", 3990, W, H, null)).toEqual({ ...r, x: 10, w: 3990 });
    expect(setField(r, "h", 1080, W, H, 16 / 9)).toEqual({ x: 100, y: 100, w: 1920, h: 1080 });
    expect(setField(r, "w", 100000, W, H, 1)).toEqual({ x: 100, y: 0, w: 3000, h: 3000 });
    expect(setField(r, "w", Number.NaN, W, H, null)).toBe(r);
  });
});

describe("croppedName", () => {
  it("adds the suffix and keeps or replaces the extension", () => {
    expect(croppedName("holiday.JPEG", true, "jpg", "cropped")).toBe("holiday-cropped.JPEG");
    expect(croppedName("holiday.jpeg", false, "webp", "cropped")).toBe("holiday-cropped.webp");
    expect(croppedName("scan", true, "png", "ritagliata")).toBe("scan-ritagliata.png");
  });
});
