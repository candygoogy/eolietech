import { describe, expect, it } from "vitest";
import {
  DEFAULT_STRENGTH,
  applyAll,
  applyEffect,
  blur,
  blurRadius,
  cellSize,
  effectFromPreset,
  pixelate,
  type Pixels,
} from "./effects";
import type { Box } from "./geometry";

/** A w x h image whose pixels are all different: a busy pattern, as a face or text would be. */
function busy(w: number, h: number, alpha = 255): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = (x * 37 + y * 11) % 256;
      data[i + 1] = (x * 5 + y * 53) % 256;
      data[i + 2] = ((x ^ y) * 29) % 256;
      data[i + 3] = alpha;
    }
  }
  return { data, width: w, height: h };
}

const copy = (p: Pixels): Pixels => ({ data: new Uint8ClampedArray(p.data), width: p.width, height: p.height });
const px = (p: Pixels, x: number, y: number) => Array.from(p.data.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 4));
const inBox = (b: Box, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

/** Every pixel outside `b` is exactly as it was. */
function outsideUnchanged(before: Pixels, after: Pixels, b: Box) {
  for (let y = 0; y < before.height; y++) {
    for (let x = 0; x < before.width; x++) {
      if (inBox(b, x, y)) continue;
      expect(px(after, x, y), `pixel ${x},${y}`).toEqual(px(before, x, y));
    }
  }
}

/** Mean absolute change per channel inside `b`. */
function meanChange(before: Pixels, after: Pixels, b: Box): number {
  let sum = 0;
  let n = 0;
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      const i = (y * before.width + x) * 4;
      for (let c = 0; c < 3; c++) sum += Math.abs(before.data[i + c]! - after.data[i + c]!);
      n += 3;
    }
  }
  return sum / n;
}

describe("presets", () => {
  it("starts on the variant's effect, else a black box", () => {
    expect(effectFromPreset({})).toBe("black");
    expect(effectFromPreset({ effect: "blur" })).toBe("blur");
    expect(effectFromPreset({ effect: "pixelate" })).toBe("pixelate");
    expect(effectFromPreset({ effect: "sepia" })).toBe("black");
  });
});

describe("strength scales with the box", () => {
  it("makes pixelate cells and blur radius grow with the box's shorter side", () => {
    expect(cellSize(400, 200, DEFAULT_STRENGTH)).toBeGreaterThan(cellSize(100, 50, DEFAULT_STRENGTH));
    expect(blurRadius(400, 200, DEFAULT_STRENGTH)).toBeGreaterThan(blurRadius(100, 50, DEFAULT_STRENGTH));
    // The shorter side decides: a wide strip over a line of text is not blurred by its length.
    expect(cellSize(2000, 40, 5)).toBe(cellSize(40, 40, 5));
  });

  it("gets stronger with the strength setting", () => {
    for (let s = 2; s <= 10; s++) {
      expect(cellSize(300, 300, s)).toBeGreaterThanOrEqual(cellSize(300, 300, s - 1));
      expect(blurRadius(300, 300, s)).toBeGreaterThanOrEqual(blurRadius(300, 300, s - 1));
    }
    expect(cellSize(300, 300, 10)).toBeGreaterThan(cellSize(300, 300, 1));
  });

  it("hides a face by default: few cells across, a wide blur", () => {
    // A 200 px face: about 7 cells across, blurred with a sigma of about a tenth of its size.
    expect(200 / cellSize(200, 200, DEFAULT_STRENGTH)).toBeLessThanOrEqual(8);
    expect(blurRadius(200, 200, DEFAULT_STRENGTH)).toBeGreaterThanOrEqual(20);
  });

  it("never does nothing, even on tiny boxes, and clamps odd strengths", () => {
    expect(cellSize(1, 1, 1)).toBe(2);
    expect(blurRadius(1, 1, 1)).toBe(1);
    expect(cellSize(300, 300, 99)).toBe(cellSize(300, 300, 10));
    expect(cellSize(300, 300, -3)).toBe(cellSize(300, 300, 1));
    expect(cellSize(300, 300, Number.NaN)).toBe(cellSize(300, 300, DEFAULT_STRENGTH));
  });
});

describe("black box", () => {
  it("paints the box opaque black and nothing else", () => {
    const before = busy(40, 30, 128);
    const after = copy(before);
    const b = { x: 5, y: 6, w: 10, h: 8 };
    applyEffect(after, b, "black", 5);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) expect(px(after, x, y)).toEqual([0, 0, 0, 255]);
    outsideUnchanged(before, after, b);
  });

  it("clips a box that runs off the image", () => {
    const before = busy(20, 20);
    const after = copy(before);
    applyEffect(after, { x: 15, y: 15, w: 50, h: 50 }, "black", 5);
    expect(px(after, 19, 19)).toEqual([0, 0, 0, 255]);
    outsideUnchanged(before, after, { x: 15, y: 15, w: 5, h: 5 });
  });
});

describe("pixelate", () => {
  it("fills each cell with its mean colour", () => {
    const img: Pixels = { data: new Uint8ClampedArray(4 * 2 * 4), width: 4, height: 2 };
    // Left cell 2 x 2: values 0, 10, 20, 30 -> 15. Right cell: 100, 100, 200, 200 -> 150.
    const vals = [0, 10, 100, 100, 20, 30, 200, 200];
    vals.forEach((v, i) => img.data.set([v, v, v, 255], i * 4));
    pixelate(img, { x: 0, y: 0, w: 4, h: 2 }, 2);
    expect(px(img, 0, 0)).toEqual([15, 15, 15, 255]);
    expect(px(img, 1, 1)).toEqual([15, 15, 15, 255]);
    expect(px(img, 3, 0)).toEqual([150, 150, 150, 255]);
  });

  it("weights colours by alpha, and cuts the last cells to the box", () => {
    const img: Pixels = { data: new Uint8ClampedArray(3 * 1 * 4), width: 3, height: 1 };
    img.data.set([200, 0, 0, 255, 0, 200, 0, 0, 9, 9, 9, 255]);
    pixelate(img, { x: 0, y: 0, w: 3, h: 1 }, 2);
    // The transparent green pixel does not tint the cell; alpha is the mean.
    expect(px(img, 0, 0)).toEqual([200, 0, 0, 128]);
    expect(px(img, 1, 0)).toEqual([200, 0, 0, 128]);
    // A one-pixel last cell keeps its own colour.
    expect(px(img, 2, 0)).toEqual([9, 9, 9, 255]);
  });

  it("changes the inside of a busy box and nothing outside", () => {
    const before = busy(80, 60);
    const after = copy(before);
    const b = { x: 20, y: 10, w: 40, h: 30 };
    applyEffect(after, b, "pixelate", DEFAULT_STRENGTH);
    expect(meanChange(before, after, b)).toBeGreaterThan(20);
    outsideUnchanged(before, after, b);
  });
});

describe("blur", () => {
  it("leaves a flat colour as it is", () => {
    const img: Pixels = { data: new Uint8ClampedArray(10 * 10 * 4).fill(77), width: 10, height: 10 };
    blur(img, { x: 0, y: 0, w: 10, h: 10 }, 3);
    expect(px(img, 5, 5)).toEqual([77, 77, 77, 77]);
    expect(px(img, 0, 9)).toEqual([77, 77, 77, 77]);
  });

  it("smooths a busy box, reads only inside it and changes nothing outside", () => {
    const before = busy(80, 60);
    // Outside the box: white. A blur that sampled outside would pull the box towards white.
    for (let y = 0; y < 60; y++) for (let x = 0; x < 80; x++) if (!inBox({ x: 20, y: 10, w: 40, h: 30 }, x, y)) before.data.set([255, 255, 255, 255], (y * 80 + x) * 4);
    const after = copy(before);
    const b = { x: 20, y: 10, w: 40, h: 30 };
    applyEffect(after, b, "blur", DEFAULT_STRENGTH);
    expect(meanChange(before, after, b)).toBeGreaterThan(20);
    outsideUnchanged(before, after, b);
    // Same result as blurring the box on its own: nothing from outside leaked in.
    const alone = { data: new Uint8ClampedArray(40 * 30 * 4), width: 40, height: 30 };
    for (let y = 0; y < 30; y++) alone.data.set(before.data.subarray(((y + 10) * 80 + 20) * 4, ((y + 10) * 80 + 60) * 4), y * 40 * 4);
    applyEffect(alone, { x: 0, y: 0, w: 40, h: 30 }, "blur", DEFAULT_STRENGTH);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) expect(px(after, x + 20, y + 10)).toEqual(px(alone, x, y));
  });

  it("does not let invisible colours bleed into visible ones", () => {
    const img: Pixels = { data: new Uint8ClampedArray(6 * 1 * 4), width: 6, height: 1 };
    // Three opaque red pixels, then three fully transparent green ones.
    for (let x = 0; x < 6; x++) img.data.set(x < 3 ? [255, 0, 0, 255] : [0, 255, 0, 0], x * 4);
    blur(img, { x: 0, y: 0, w: 6, h: 1 }, 2);
    for (let x = 0; x < 6; x++) {
      const [r, g, , a] = px(img, x, 0);
      if (a! > 0) {
        expect(r).toBe(255);
        expect(g).toBe(0);
      }
    }
  });

  it("gives the same bytes every time (no canvas, no platform maths)", () => {
    const a = busy(50, 40);
    const b = copy(a);
    applyEffect(a, { x: 3, y: 4, w: 30, h: 20 }, "blur", 6);
    applyEffect(b, { x: 3, y: 4, w: 30, h: 20 }, "blur", 6);
    expect(a.data).toEqual(b.data);
  });
});

describe("several boxes", () => {
  it("applies each in order and leaves the rest of the image alone", () => {
    const before = busy(60, 40);
    const after = copy(before);
    const boxes = [
      { x: 2, y: 2, w: 10, h: 10 },
      { x: 30, y: 20, w: 20, h: 15 },
    ];
    applyAll(after, boxes, "black", 5);
    expect(px(after, 5, 5)).toEqual([0, 0, 0, 255]);
    expect(px(after, 40, 30)).toEqual([0, 0, 0, 255]);
    expect(px(after, 20, 5)).toEqual(px(before, 20, 5));
    expect(px(after, 59, 0)).toEqual(px(before, 59, 0));
  });
});
