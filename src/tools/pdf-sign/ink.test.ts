import { describe, expect, it } from "vitest";
import {
  extractSignature,
  inkBounds,
  knockOutPaper,
  strengthToThreshold,
  suggestThreshold,
  thresholdToStrength,
  trimToInk,
  type Rgba,
} from "./ink";

/** A width x height image filled with one colour. */
function fill(width: number, height: number, [r, g, b, a]: [number, number, number, number]): Rgba {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, a], i);
  return { data, width, height };
}

function set(img: Rgba, x: number, y: number, rgba: [number, number, number, number]) {
  img.data.set(rgba, (y * img.width + x) * 4);
}

const alphaAt = (img: Rgba, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

describe("ink", () => {
  it("makes paper transparent, keeps ink and its colour, and fades the edge", () => {
    const img = fill(3, 1, [230, 228, 220, 255]); // greyish paper
    set(img, 0, 0, [20, 40, 140, 255]); // blue ballpoint
    set(img, 1, 0, [150, 150, 150, 255]); // a soft edge pixel
    knockOutPaper(img.data, 160);
    expect([...img.data.subarray(0, 4)]).toEqual([20, 40, 140, 255]);
    expect(alphaAt(img, 1, 0)).toBeGreaterThan(0);
    expect(alphaAt(img, 1, 0)).toBeLessThan(255);
    expect(alphaAt(img, 2, 0)).toBe(0);
  });

  it("suggests a threshold below the paper, even on grey paper", () => {
    const img = fill(20, 20, [170, 170, 170, 255]); // dim photo of white paper
    for (let x = 2; x < 18; x++) set(img, x, 10, [30, 30, 30, 255]);
    const t = suggestThreshold(img.data);
    expect(t).toBeLessThan(170);
    expect(t).toBeGreaterThan(30);
    expect(thresholdToStrength(strengthToThreshold(37))).toBe(37);
  });

  it("trims a photo to the signature and ignores a speck at the border", () => {
    const img = fill(40, 20, [240, 240, 240, 255]);
    for (let x = 10; x < 30; x++) for (let y = 8; y < 12; y++) set(img, x, y, [10, 10, 10, 255]);
    set(img, 39, 0, [0, 0, 0, 255]); // dust in the corner
    const out = extractSignature(img, 160)!;
    // 20 x 4 of ink plus 2 px of room on each side.
    expect([out.width, out.height]).toEqual([24, 8]);
    expect(alphaAt(out, 0, 0)).toBe(0);
    expect(alphaAt(out, 2, 2)).toBe(255);
  });

  it("trims a drawn signature to its strokes, and finds nothing on a blank pad", () => {
    const img = fill(10, 10, [0, 0, 0, 0]);
    set(img, 3, 4, [17, 17, 17, 255]);
    set(img, 6, 7, [17, 17, 17, 200]);
    expect(inkBounds(img)).toEqual({ x: 3, y: 4, w: 4, h: 4 });
    const t = trimToInk(img, 1)!;
    expect([t.width, t.height]).toEqual([6, 6]);
    expect(trimToInk(fill(5, 5, [0, 0, 0, 0]), 2)).toBeNull();
    expect(extractSignature(fill(5, 5, [250, 250, 250, 255]), 160)).toBeNull();
  });
});
