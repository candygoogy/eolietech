/**
 * Redaction effects on raw RGBA pixels (pure, unit-tested; no DOM, no canvas filters). Plain
 * JavaScript arithmetic, so the preview and the saved file come out the same in Chromium, Firefox
 * and Safari. Every effect reads and writes only the pixels inside its box: nothing outside the
 * box changes, and nothing outside it leaks in.
 *
 * Blur and pixelate scale with the box: strength sets how many cells (or how wide a blur) span the
 * box's shorter side, so one setting hides a large face and a small number plate alike, and the
 * downscaled preview looks like the full-resolution result.
 */
import { clipBox, type Box } from "./geometry";

export const EFFECTS = ["black", "blur", "pixelate"] as const;
export type Effect = (typeof EFFECTS)[number];

const isEffect = (v: unknown): v is Effect => typeof v === "string" && (EFFECTS as readonly string[]).includes(v);

/** Variant preset -> starting effect: `{ effect: "blur" }`, `{ effect: "pixelate" }`; anything else is a black box. */
export const effectFromPreset = (preset: Record<string, unknown>): Effect => (isEffect(preset.effect) ? preset.effect : "black");

export const STRENGTH_MIN = 1;
export const STRENGTH_MAX = 10;
/** Strong enough by default to make a face unrecognisable at the size of its box. */
export const DEFAULT_STRENGTH = 7;

/** Pixelate: cells across the box's shorter side, for strength 1..10. */
const CELLS = [32, 24, 18, 14, 11, 9, 7, 6, 5, 4];
/** Blur: the box's shorter side divided by this is the radius (about the Gaussian sigma) for strength 1..10. */
const BLUR_DIV = [48, 36, 26, 20, 15, 12, 9, 7, 5.5, 4];
/** Three box blurs in a row come within a few per cent of a Gaussian. */
const BLUR_PASSES = 3;

/**
 * Long, thin boxes are almost always over a line of text, where the shorter side is about the
 * height of the letters, and 7 cells or a ninth-of-a-side blur across that leave the text readable.
 * From TEXT_ASPECT_FROM (longer side / shorter side) a floor fades in, and from TEXT_ASPECT_FULL on
 * such a box gets at most TEXT_CELLS cells, and a blur radius of at least 1/TEXT_BLUR_DIV, across
 * its shorter side at the default strength. Stronger settings make it coarser still; weaker ones
 * never make it finer. Small boxes (shorter side under SMALL_BOX px of the full image: a short
 * word, a PIN, a date) get the full floor whatever their shape. Large face-shaped boxes and whole
 * photos (up to 2:1) are not affected.
 */
const TEXT_ASPECT_FROM = 2;
const TEXT_ASPECT_FULL = 3;
const TEXT_CELLS = 3;
const TEXT_BLUR_DIV = 4;
const SMALL_BOX = 48;

const level = (strength: number): number =>
  Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, Math.round(Number.isFinite(strength) ? strength : DEFAULT_STRENGTH))) - 1;

/**
 * How much of the text floor applies: 1 for small boxes; otherwise 0 up to 2:1, rising to 1 at 3:1.
 * `scale` is full-image pixels per box pixel, so the downscaled preview decides as the save does.
 */
const textShape = (w: number, h: number, scale: number): number => {
  const short = Math.min(w, h);
  if (!(short > 0)) return 0;
  if (short * scale < SMALL_BOX) return 1;
  const aspect = Math.max(w, h) / short;
  return Math.min(1, Math.max(0, (aspect - TEXT_ASPECT_FROM) / (TEXT_ASPECT_FULL - TEXT_ASPECT_FROM)));
};

/** Above the default strength the floor follows the table, so a higher setting is always coarser. */
const coarser = (table: readonly number[], i: number): number => Math.min(1, table[i]! / table[DEFAULT_STRENGTH - 1]!);

/** Side of a pixelate cell, in pixels, for a w x h box. At least 2, or nothing would change. */
export const cellSize = (w: number, h: number, strength: number, scale = 1): number => {
  const i = level(strength);
  const short = Math.min(w, h);
  const floor = (short / (TEXT_CELLS * coarser(CELLS, i))) * textShape(w, h, scale);
  return Math.max(2, Math.ceil(short / CELLS[i]!), Math.ceil(floor));
};

/** Box blur radius, in pixels, for a w x h box. At least 1. */
export const blurRadius = (w: number, h: number, strength: number, scale = 1): number => {
  const i = level(strength);
  const short = Math.min(w, h);
  const floor = (short / (TEXT_BLUR_DIV * coarser(BLUR_DIV, i))) * textShape(w, h, scale);
  return Math.max(1, Math.round(short / BLUR_DIV[i]!), Math.round(floor));
};

/** RGBA pixels, as ImageData has them (the worker passes ImageData, tests plain objects). */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Apply one effect to the part of `box` inside the image, in place. `scale`: full-image pixels per
 * pixel of `img` (above 1 for the downscaled preview).
 */
export function applyEffect(img: Pixels, box: Box, effect: Effect, strength: number, scale = 1): void {
  const r = clipBox(box, img.width, img.height);
  if (!r) return;
  if (effect === "black") fillBlack(img, r);
  else if (effect === "pixelate") pixelate(img, r, cellSize(r.w, r.h, strength, scale));
  else blur(img, r, blurRadius(r.w, r.h, strength, scale));
}

/** Opaque black: transparent pixels are covered too, so nothing shows through in any viewer. */
export function fillBlack(img: Pixels, r: Box): void {
  const { data, width } = img;
  for (let y = r.y; y < r.y + r.h; y++) {
    let i = (y * width + r.x) * 4;
    for (let x = 0; x < r.w; x++, i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
}

/**
 * Square cells of side `cell` from the box's top-left corner (the last row and column are cut to
 * the box), each filled with its mean colour. Colours are weighted by alpha, so a half-transparent
 * edge does not darken the cell.
 */
export function pixelate(img: Pixels, r: Box, cell: number): void {
  const { data, width } = img;
  const c = Math.max(1, Math.floor(cell));
  for (let cy = r.y; cy < r.y + r.h; cy += c) {
    const y1 = Math.min(cy + c, r.y + r.h);
    for (let cx = r.x; cx < r.x + r.w; cx += c) {
      const x1 = Math.min(cx + c, r.x + r.w);
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sa = 0;
      let pr = 0;
      let pg = 0;
      let pb = 0;
      let n = 0;
      for (let y = cy; y < y1; y++) {
        let i = (y * width + cx) * 4;
        for (let x = cx; x < x1; x++, i += 4) {
          const a = data[i + 3]!;
          sr += data[i]! * a;
          sg += data[i + 1]! * a;
          sb += data[i + 2]! * a;
          sa += a;
          pr += data[i]!;
          pg += data[i + 1]!;
          pb += data[i + 2]!;
          n++;
        }
      }
      // A fully transparent cell keeps the plain mean of its (invisible) colours.
      const R = sa > 0 ? Math.round(sr / sa) : Math.round(pr / n);
      const G = sa > 0 ? Math.round(sg / sa) : Math.round(pg / n);
      const B = sa > 0 ? Math.round(sb / sa) : Math.round(pb / n);
      const A = Math.round(sa / n);
      for (let y = cy; y < y1; y++) {
        let i = (y * width + cx) * 4;
        for (let x = cx; x < x1; x++, i += 4) {
          data[i] = R;
          data[i + 1] = G;
          data[i + 2] = B;
          data[i + 3] = A;
        }
      }
    }
  }
}

/**
 * A Gaussian-like blur of radius `radius` inside the box: BLUR_PASSES box blurs across, then down,
 * with premultiplied alpha. Samples past the box's edge repeat the edge pixel, so only pixels
 * inside the box are ever read.
 */
export function blur(img: Pixels, r: Box, radius: number): void {
  const { data, width } = img;
  const w = r.w;
  const h = r.h;
  const rad = Math.max(0, Math.floor(radius));
  if (rad === 0 || w * h === 0) return;
  // Premultiplied channels of the box, as floats.
  const buf = new Float32Array(w * h * 4);
  const tmp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    let i = ((r.y + y) * width + r.x) * 4;
    let o = y * w * 4;
    for (let x = 0; x < w; x++, i += 4, o += 4) {
      const a = data[i + 3]! / 255;
      buf[o] = data[i]! * a;
      buf[o + 1] = data[i + 1]! * a;
      buf[o + 2] = data[i + 2]! * a;
      buf[o + 3] = data[i + 3]!;
    }
  }
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    boxLine(buf, tmp, w, h, rad, true);
    boxLine(tmp, buf, w, h, rad, false);
  }
  for (let y = 0; y < h; y++) {
    let i = ((r.y + y) * width + r.x) * 4;
    let o = y * w * 4;
    for (let x = 0; x < w; x++, i += 4, o += 4) {
      const A = buf[o + 3]!;
      const k = A > 0 ? 255 / A : 0;
      data[i] = Math.round(buf[o]! * k);
      data[i + 1] = Math.round(buf[o + 1]! * k);
      data[i + 2] = Math.round(buf[o + 2]! * k);
      data[i + 3] = Math.round(A);
    }
  }
}

/**
 * One box blur of radius `rad` along rows (`across`) or columns of a w x h RGBA float buffer, from
 * `src` into `dst`, with a running sum. Samples outside the buffer clamp to its edge.
 */
function boxLine(src: Float32Array, dst: Float32Array, w: number, h: number, rad: number, across: boolean): void {
  const len = across ? w : h;
  const lines = across ? h : w;
  // Distance between neighbours along the line, and between the starts of two lines, in floats.
  const stride = across ? 4 : w * 4;
  const lineStep = across ? w * 4 : 4;
  const norm = 1 / (2 * rad + 1);
  const last = len - 1;
  for (let line = 0; line < lines; line++) {
    const base = line * lineStep;
    for (let ch = 0; ch < 4; ch++) {
      const start = base + ch;
      const first = src[start]!;
      const end = src[start + last * stride]!;
      let sum = 0;
      for (let p = -rad; p <= rad; p++) sum += p < 0 ? first : p > last ? end : src[start + p * stride]!;
      for (let p = 0; p < len; p++) {
        dst[start + p * stride] = sum * norm;
        const add = p + rad + 1;
        const sub = p - rad;
        sum += (add > last ? end : src[start + add * stride]!) - (sub < 0 ? first : src[start + sub * stride]!);
      }
    }
  }
}

/** Apply every box in order (a later box works on what an earlier one left), in place. */
export function applyAll(img: Pixels, boxes: readonly Box[], effect: Effect, strength: number): void {
  for (const b of boxes) applyEffect(img, b, effect, strength);
}
