import { describe, expect, it } from "vitest";
import { MAX_SIDE } from "../image-shared/formats";
import {
  ASPECTS,
  BLUR_SIDE,
  RATIOS,
  blurPlan,
  boxBlur,
  coverCrop,
  cropPixels,
  darken,
  drawOver,
  fill,
  flattenOnto,
  layout,
  type Pixels,
} from "./fit";

const px = (width: number, height: number, rgba: [number, number, number, number] = [0, 0, 0, 0]): Pixels => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { data, width, height };
};
const at = (img: Pixels, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];

/** Every layout: the photo sits inside the frame, and the frame has (about) the requested ratio. */
function checkInvariants(w: number, h: number, l: ReturnType<typeof layout>, ratio: number) {
  expect(l.x).toBeGreaterThanOrEqual(0);
  expect(l.y).toBeGreaterThanOrEqual(0);
  expect(l.x + l.photoWidth).toBeLessThanOrEqual(l.frameWidth);
  expect(l.y + l.photoHeight).toBeLessThanOrEqual(l.frameHeight);
  expect(l.photoWidth).toBeGreaterThanOrEqual(1);
  expect(l.photoHeight).toBeGreaterThanOrEqual(1);
  // Centred: the leftover splits evenly, the odd pixel going right or down.
  expect(l.frameWidth - l.photoWidth - 2 * l.x).toBeGreaterThanOrEqual(0);
  expect(l.frameWidth - l.photoWidth - 2 * l.x).toBeLessThanOrEqual(1);
  expect(l.frameHeight - l.photoHeight - 2 * l.y).toBeLessThanOrEqual(1);
  // The photo touches two opposite edges (it is as big as it may be).
  expect(l.photoWidth === l.frameWidth || l.photoHeight === l.frameHeight).toBe(true);
  // Within one pixel of the exact ratio.
  expect(Math.abs(l.frameHeight * ratio - l.frameWidth)).toBeLessThanOrEqual(Math.max(1, ratio));
  void w;
  void h;
}

describe("layout: same as the photo", () => {
  it("makes the smallest frame of each ratio around a landscape photo, at full size", () => {
    expect(layout(4000, 3000, "1:1", null)).toEqual({ frameWidth: 4000, frameHeight: 4000, photoWidth: 4000, photoHeight: 3000, x: 0, y: 500, scale: 1 });
    expect(layout(4000, 3000, "4:5", null)).toMatchObject({ frameWidth: 4000, frameHeight: 5000, x: 0, y: 1000 });
    expect(layout(4000, 3000, "16:9", null)).toMatchObject({ frameWidth: 5333, frameHeight: 3000, x: 666, y: 0, scale: 1 });
    expect(layout(4000, 3000, "9:16", null)).toMatchObject({ frameWidth: 4000, frameHeight: 7111, x: 0, y: 2055 });
  });

  it("works the same way for portrait photos and leaves a photo of the right shape alone", () => {
    expect(layout(3000, 4000, "1:1", null)).toMatchObject({ frameWidth: 4000, frameHeight: 4000, photoWidth: 3000, x: 500, y: 0 });
    expect(layout(3000, 4000, "16:9", null)).toMatchObject({ frameWidth: 7111, frameHeight: 4000, x: 2055 });
    expect(layout(1080, 1350, "4:5", null)).toEqual({ frameWidth: 1080, frameHeight: 1350, photoWidth: 1080, photoHeight: 1350, x: 0, y: 0, scale: 1 });
    expect(layout(1920, 1080, "16:9", null)).toMatchObject({ frameWidth: 1920, frameHeight: 1080, x: 0, y: 0 });
  });

  it("handles odd sizes and tiny images", () => {
    // Odd leftover: one more pixel below than above.
    expect(layout(5, 2, "1:1", null)).toEqual({ frameWidth: 5, frameHeight: 5, photoWidth: 5, photoHeight: 2, x: 0, y: 1, scale: 1 });
    expect(layout(1, 1, "1:1", null)).toEqual({ frameWidth: 1, frameHeight: 1, photoWidth: 1, photoHeight: 1, x: 0, y: 0, scale: 1 });
    expect(layout(1, 1, "16:9", null)).toMatchObject({ frameWidth: 2, frameHeight: 1, photoWidth: 1, photoHeight: 1, x: 0 });
    expect(layout(1, 1, "9:16", null)).toMatchObject({ frameWidth: 1, frameHeight: 2, y: 0 });
    expect(layout(64, 48, "1:1", null)).toMatchObject({ frameWidth: 64, frameHeight: 64, x: 0, y: 8 });
    expect(layout(64, 48, "16:9", null)).toMatchObject({ frameWidth: 85, frameHeight: 48, x: 10, y: 0 });
  });

  it("never enlarges, and scales down only a frame longer than MAX_SIDE", () => {
    for (const aspect of ASPECTS) {
      for (const [w, h] of [[7, 3], [3, 7], [101, 99], [4032, 3024]] as const) {
        const l = layout(w, h, aspect, null);
        expect(l.scale).toBe(1);
        expect([l.photoWidth, l.photoHeight]).toEqual([w, h]);
        const [rw, rh] = RATIOS[aspect];
        checkInvariants(w, h, l, rw / rh);
      }
    }
    // A very wide panorama in a tall frame: the frame would be 35,556 px tall.
    const pano = layout(20000, 10, "9:16", null);
    expect(pano).toMatchObject({ frameWidth: 11250, frameHeight: MAX_SIDE, photoWidth: 11250, photoHeight: 6 });
    expect(pano.scale).toBeCloseTo(0.5625);
    // A very tall strip in a wide frame.
    expect(layout(3, 15000, "16:9", null)).toMatchObject({ frameWidth: MAX_SIDE, frameHeight: 11250, photoHeight: 11250, photoWidth: 2 });
  });
});

describe("layout: fixed frame width", () => {
  it("makes the frame that wide, its height by the ratio", () => {
    expect(layout(4000, 3000, "1:1", 1080)).toMatchObject({ frameWidth: 1080, frameHeight: 1080, photoWidth: 1080, photoHeight: 810, x: 0, y: 135 });
    expect(layout(4000, 3000, "4:5", 1080)).toMatchObject({ frameWidth: 1080, frameHeight: 1350, photoWidth: 1080, photoHeight: 810 });
    expect(layout(3000, 4000, "16:9", 1920)).toMatchObject({ frameWidth: 1920, frameHeight: 1080, photoWidth: 810, photoHeight: 1080, x: 555 });
    expect(layout(4000, 3000, "9:16", 1080)).toMatchObject({ frameWidth: 1080, frameHeight: 1920, photoWidth: 1080, photoHeight: 810, y: 555 });
    // 16:9 of an odd width rounds the height.
    expect(layout(100, 100, "16:9", 1001)).toMatchObject({ frameWidth: 1001, frameHeight: 563, photoWidth: 563, photoHeight: 563 });
  });

  it("scales a photo down to a smaller frame and up to a larger one", () => {
    const down = layout(4000, 3000, "1:1", 100);
    expect(down).toMatchObject({ frameWidth: 100, frameHeight: 100, photoWidth: 100, photoHeight: 75, scale: 0.025 });
    const up = layout(64, 48, "1:1", 640);
    expect(up).toMatchObject({ frameWidth: 640, frameHeight: 640, photoWidth: 640, photoHeight: 480, scale: 10 });
    for (const aspect of ASPECTS) {
      for (const [w, h] of [[1, 1], [1, 5000], [5000, 1], [333, 777]] as const) {
        for (const width of [1, 7, 1080, 4321]) {
          const [rw, rh] = RATIOS[aspect];
          checkInvariants(w, h, layout(w, h, aspect, width), rw / rh);
        }
      }
    }
  });

  it("keeps a tiny frame at least 1 px and caps the frame at MAX_SIDE", () => {
    expect(layout(5000, 1, "16:9", 1)).toMatchObject({ frameWidth: 1, frameHeight: 1, photoWidth: 1, photoHeight: 1 });
    expect(layout(100, 100, "9:16", MAX_SIDE)).toMatchObject({ frameWidth: 11250, frameHeight: MAX_SIDE });
    expect(layout(100, 100, "1:1", 99999)).toMatchObject({ frameWidth: MAX_SIDE, frameHeight: MAX_SIDE });
  });
});

describe("blurred background helpers", () => {
  it("crops the centred part with the frame's shape", () => {
    expect(coverCrop(400, 300, 100, 100)).toEqual({ x: 50, y: 0, width: 300, height: 300 });
    expect(coverCrop(300, 400, 160, 90)).toEqual({ x: 0, y: 115, width: 300, height: 169 });
    expect(coverCrop(20000, 1, 90, 160)).toEqual({ x: 9999, y: 0, width: 1, height: 1 });
    expect(coverCrop(64, 48, 64, 48)).toEqual({ x: 0, y: 0, width: 64, height: 48 });
  });

  it("blurs a small copy, never bigger than the frame", () => {
    expect(blurPlan(4000, 4000)).toEqual({ width: BLUR_SIDE, height: BLUR_SIDE, radius: 6 });
    expect(blurPlan(1080, 1920)).toEqual({ width: 90, height: BLUR_SIDE, radius: 6 });
    expect(blurPlan(64, 64)).toEqual({ width: 64, height: 64, radius: 3 });
    expect(blurPlan(1, 1)).toEqual({ width: 1, height: 1, radius: 1 });
    expect(blurPlan(20000, 1)).toMatchObject({ width: BLUR_SIDE, height: 1 });
  });

  it("copies a rectangle out of an image", () => {
    const img = px(3, 2);
    for (let i = 0; i < 6; i++) img.data[i * 4] = i;
    expect([...cropPixels(img, 1, 0, 2, 2)].filter((_, i) => i % 4 === 0)).toEqual([1, 2, 4, 5]);
  });

  it("box blur keeps a flat image flat, spreads a dot evenly and stays inside the image", () => {
    const flat = px(9, 5, [10, 200, 30, 255]);
    boxBlur(flat, 2);
    expect(at(flat, 0, 0)).toEqual([10, 200, 30, 255]);
    expect(at(flat, 8, 4)).toEqual([10, 200, 30, 255]);

    const dot = px(21, 21, [0, 0, 0, 255]);
    dot.data.set([255, 255, 255, 255], (10 * 21 + 10) * 4);
    boxBlur(dot, 2, 1);
    // One pass of radius 2: a 5 x 5 square of 255 / 25 around the dot, nothing outside.
    expect(at(dot, 10, 10)[0]).toBe(10);
    expect(at(dot, 8, 12)[0]).toBe(10);
    expect(at(dot, 7, 10)[0]).toBe(0);
    // Symmetric.
    expect(at(dot, 12, 9)).toEqual(at(dot, 8, 11));

    // Three passes: smoother, still symmetric and peaked at the dot.
    const dot3 = px(21, 21, [0, 0, 0, 255]);
    dot3.data.set([255, 255, 255, 255], (10 * 21 + 10) * 4);
    boxBlur(dot3, 2);
    expect(at(dot3, 10, 10)[0]).toBeGreaterThan(at(dot3, 12, 10)[0]!);
    expect(at(dot3, 4, 10)[0]).toBe(at(dot3, 16, 10)[0]);

    // 1 x 1 and radius 0 are harmless.
    const one = px(1, 1, [1, 2, 3, 4]);
    boxBlur(one, 5);
    expect(at(one, 0, 0)).toEqual([1, 2, 3, 4]);
    boxBlur(dot, 0);
  });

  it("flattens, darkens and fills", () => {
    const img = px(2, 1, [200, 100, 0, 0]);
    img.data.set([200, 100, 0, 255], 4);
    flattenOnto(img.data, [255, 255, 255]);
    expect(at(img, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(at(img, 1, 0)).toEqual([200, 100, 0, 255]);
    darken(img.data, 0.5);
    expect(at(img, 1, 0)).toEqual([100, 50, 0, 255]);
    fill(img.data, [1, 2, 3]);
    expect(at(img, 0, 0)).toEqual([1, 2, 3, 255]);
  });
});

describe("drawOver", () => {
  it("copies opaque pixels at the offset and leaves the rest of the frame alone", () => {
    const frame = px(4, 3, [255, 255, 255, 255]);
    drawOver(frame, px(2, 1, [10, 20, 30, 255]), 1, 1);
    expect(at(frame, 0, 1)).toEqual([255, 255, 255, 255]);
    expect(at(frame, 1, 1)).toEqual([10, 20, 30, 255]);
    expect(at(frame, 2, 1)).toEqual([10, 20, 30, 255]);
    expect(at(frame, 3, 1)).toEqual([255, 255, 255, 255]);
    expect(at(frame, 1, 0)).toEqual([255, 255, 255, 255]);
  });

  it("blends semi-transparent pixels and keeps transparency over a transparent frame", () => {
    const onWhite = px(1, 1, [255, 255, 255, 255]);
    drawOver(onWhite, px(1, 1, [0, 0, 0, 128]), 0, 0);
    expect(at(onWhite, 0, 0)).toEqual([127, 127, 127, 255]);

    const clear = px(2, 1);
    const half = px(2, 1, [200, 0, 0, 128]);
    half.data.set([9, 9, 9, 0], 4);
    drawOver(clear, half, 0, 0);
    expect(at(clear, 0, 0)).toEqual([200, 0, 0, 128]);
    expect(at(clear, 1, 0)).toEqual([0, 0, 0, 0]);
  });
});
