/**
 * image-fit geometry and pixel helpers (pure, unit-tested; used by ./worker.ts). No DOM, no WASM:
 * pixels are plain RGBA arrays, so the same code runs in the worker and in the tests, and the blurred
 * background comes out the same in every browser (no canvas `filter`).
 */
import { MAX_SIDE } from "../image-shared/formats";

export const ASPECTS = ["1:1", "4:5", "16:9", "9:16"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const RATIOS: Record<Aspect, readonly [number, number]> = {
  "1:1": [1, 1],
  "4:5": [4, 5],
  "16:9": [16, 9],
  "9:16": [9, 16],
};

export const isAspect = (v: unknown): v is Aspect => typeof v === "string" && (ASPECTS as readonly string[]).includes(v);

export type Rgb = readonly [number, number, number];

export type Background = { kind: "color"; rgb: Rgb } | { kind: "transparent" } | { kind: "blur" };

/** What the worker needs to build one frame. `width: null` = "Same as the photo". */
export interface FitSpec {
  aspect: Aspect;
  width: number | null;
  background: Background;
}

/** RGBA pixels, row by row (ImageData has this shape too). */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Layout {
  /** The output image. */
  frameWidth: number;
  frameHeight: number;
  /** The photo inside it, after scaling, and its top-left corner. */
  photoWidth: number;
  photoHeight: number;
  x: number;
  y: number;
  /** photoWidth / source width (1 = full size). */
  scale: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Where a w x h photo goes in a frame of the given ratio.
 *
 * - `frameWidth: null` ("Same as the photo"): the smallest frame of that ratio that holds the photo at
 *   100%. The photo keeps its size and touches two opposite edges; the other side grows to the ratio
 *   (rounded to whole pixels, so a small photo's frame can be off the exact ratio by under a pixel).
 *   Never enlarged; only a frame longer than MAX_SIDE is scaled down, with the photo in it.
 * - `frameWidth: n`: a frame n px wide whose height follows the ratio; the photo is scaled (down or
 *   up) to fit inside it.
 *
 * The photo is centred; an odd leftover pixel goes to the right or bottom.
 */
export function layout(w: number, h: number, aspect: Aspect, frameWidth: number | null): Layout {
  const [rw, rh] = RATIOS[aspect];
  let fw: number;
  let fh: number;
  if (frameWidth === null) {
    // Wider than the frame's ratio: the width stays and the height grows, else the other way round.
    if (w * rh >= h * rw) {
      fw = w;
      fh = Math.max(h, Math.round((w * rh) / rw));
    } else {
      fh = h;
      fw = Math.max(w, Math.round((h * rw) / rh));
    }
  } else {
    fw = clamp(Math.round(frameWidth), 1, MAX_SIDE);
    fh = Math.max(1, Math.round((fw * rh) / rw));
  }
  const longest = Math.max(fw, fh);
  if (longest > MAX_SIDE) {
    const c = MAX_SIDE / longest;
    fw = clamp(Math.round(fw * c), 1, MAX_SIDE);
    fh = clamp(Math.round(fh * c), 1, MAX_SIDE);
  }
  const sx = fw / w;
  const sy = fh / h;
  let s = Math.min(sx, sy);
  if (frameWidth === null) s = Math.min(1, s);
  // The side that limits the scale fills the frame exactly (w * s can round a pixel off).
  const pw = s === sx ? fw : clamp(Math.round(w * s), 1, fw);
  const ph = s === sy ? fh : clamp(Math.round(h * s), 1, fh);
  return {
    frameWidth: fw,
    frameHeight: fh,
    photoWidth: pw,
    photoHeight: ph,
    x: Math.floor((fw - pw) / 2),
    y: Math.floor((fh - ph) / 2),
    scale: pw / w,
  };
}

/** The centred part of a w x h photo with the frame's shape: what shows behind it, scaled to cover. */
export function coverCrop(w: number, h: number, frameWidth: number, frameHeight: number): { x: number; y: number; width: number; height: number } {
  let cw = w;
  let ch = h;
  if (w * frameHeight > h * frameWidth) cw = clamp(Math.round((h * frameWidth) / frameHeight), 1, w);
  else ch = clamp(Math.round((w * frameHeight) / frameWidth), 1, h);
  return { x: Math.floor((w - cw) / 2), y: Math.floor((h - ch) / 2), width: cw, height: ch };
}

/** The blurred background is made small, blurred, then enlarged to the frame: longest side of the small copy. */
export const BLUR_SIDE = 160;
/** Box radius as a share of the small copy's longest side (three passes come close to a Gaussian). */
export const BLUR_RADIUS = 0.04;
export const BLUR_PASSES = 3;
/** RGB multiplier: the background sits a little darker than the photo, so the photo stands out. */
export const BLUR_DARKEN = 0.8;

/** Size of the small copy that gets blurred, and the box radius to use on it. */
export function blurPlan(frameWidth: number, frameHeight: number): { width: number; height: number; radius: number } {
  const s = Math.min(1, BLUR_SIDE / Math.max(frameWidth, frameHeight));
  const width = Math.max(1, Math.round(frameWidth * s));
  const height = Math.max(1, Math.round(frameHeight * s));
  return { width, height, radius: Math.max(1, Math.round(Math.max(width, height) * BLUR_RADIUS)) };
}

/** Copy a rectangle out of an image. */
export function cropPixels(src: Pixels, x: number, y: number, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const from = ((y + row) * src.width + x) * 4;
    out.set(src.data.subarray(from, from + width * 4), row * width * 4);
  }
  return out;
}

/** One box-blur pass along rows (dx = 1) or columns, edges clamped. */
function boxPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean) {
  const lines = horizontal ? h : w;
  const len = horizontal ? w : h;
  const step = horizontal ? 4 : w * 4;
  const div = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * w * 4 : line * 4;
    for (let c = 0; c < 4; c++) {
      const at = (i: number) => src[base + clamp(i, 0, len - 1) * step + c]!;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += at(i);
      for (let i = 0; i < len; i++) {
        dst[base + i * step + c] = Math.round(sum / div);
        sum += at(i + r + 1) - at(i - r);
      }
    }
  }
}

/** Blur in place: `passes` horizontal + vertical box blurs of radius r. */
export function boxBlur(img: Pixels, radius: number, passes = BLUR_PASSES): void {
  const r = Math.max(0, Math.floor(radius));
  if (r === 0 || passes <= 0) return;
  const tmp = new Uint8ClampedArray(img.data.length);
  for (let p = 0; p < passes; p++) {
    boxPass(img.data, tmp, img.width, img.height, r, true);
    boxPass(tmp, img.data, img.width, img.height, r, false);
  }
}

/** Composite onto an opaque colour in place (the blurred copy of a transparent photo gets a white base). */
export function flattenOnto(data: Uint8ClampedArray, rgb: Rgb): void {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]! / 255;
    data[i] = data[i]! * a + rgb[0] * (1 - a);
    data[i + 1] = data[i + 1]! * a + rgb[1] * (1 - a);
    data[i + 2] = data[i + 2]! * a + rgb[2] * (1 - a);
    data[i + 3] = 255;
  }
}

/** Multiply RGB by k in place (alpha untouched). */
export function darken(data: Uint8ClampedArray, k: number): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i]! * k;
    data[i + 1] = data[i + 1]! * k;
    data[i + 2] = data[i + 2]! * k;
  }
}

/** Fill every pixel with one RGBA value. */
export function fill(data: Uint8ClampedArray, rgb: Rgb, alpha = 255): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = alpha;
  }
}

/** Draw src over dst at (x, y) ("source-over", straight alpha). src must fit inside dst. */
export function drawOver(dst: Pixels, src: Pixels, x: number, y: number): void {
  const d = dst.data;
  const s = src.data;
  for (let row = 0; row < src.height; row++) {
    let si = row * src.width * 4;
    let di = ((y + row) * dst.width + x) * 4;
    for (let col = 0; col < src.width; col++, si += 4, di += 4) {
      const sa = s[si + 3]!;
      if (sa === 255) {
        d[di] = s[si]!;
        d[di + 1] = s[si + 1]!;
        d[di + 2] = s[si + 2]!;
        d[di + 3] = 255;
      } else if (sa > 0) {
        const a = sa / 255;
        const ba = (d[di + 3]! / 255) * (1 - a);
        const oa = a + ba;
        for (let c = 0; c < 3; c++) d[di + c] = (s[si + c]! * a + d[di + c]! * ba) / oa;
        d[di + 3] = oa * 255;
      }
    }
  }
}
