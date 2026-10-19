/**
 * Ink processing for Sign PDF (pure, unit-tested; works on plain RGBA buffers, no DOM).
 * - A photo or scan of a signature: paper lighter than a threshold becomes transparent, ink keeps its
 *   colour, with a short ramp so stroke edges stay smooth.
 * - Either source is then trimmed to the ink, ignoring stray specks at the edges.
 */

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Rgba {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Perceived brightness 0..255 (Rec. 709 weights). */
export const luminance = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Width of the brightness ramp between full ink and clear paper. */
export const RAMP = 28;

/**
 * Make the paper transparent, in place: pixels at least as bright as `threshold` become clear,
 * pixels darker than `threshold - RAMP` keep their alpha, and those in between fade.
 */
export function knockOutPaper(data: Uint8ClampedArray, threshold: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const l = luminance(data[i]!, data[i + 1]!, data[i + 2]!);
    if (l >= threshold) data[i + 3] = 0;
    else if (l > threshold - RAMP) data[i + 3] = Math.round((data[i + 3]! * (threshold - l)) / RAMP);
  }
}

/**
 * A starting threshold for a photo of a signature: most of the picture is paper, so a high
 * percentile of brightness is the paper's level (even when it is grey in poor light); the ink is
 * anything clearly darker than that.
 */
export function suggestThreshold(data: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    hist[Math.round(luminance(data[i]!, data[i + 1]!, data[i + 2]!))]!++;
    n++;
  }
  if (n === 0) return 160;
  let seen = 0;
  let paper = 255;
  for (let v = 0; v < 256; v++) {
    seen += hist[v]!;
    if (seen >= n * 0.6) {
      paper = v;
      break;
    }
  }
  return clampThreshold(Math.round(paper * 0.82));
}

export const MIN_THRESHOLD = 40;
export const MAX_THRESHOLD = 250;
export const clampThreshold = (t: number): number => Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, Math.round(t)));

/** The "Clean up the paper" slider (0..100, more = removes more) <-> the threshold it sets. */
export const strengthToThreshold = (s: number): number =>
  clampThreshold(MAX_THRESHOLD - (Math.min(100, Math.max(0, s)) / 100) * (MAX_THRESHOLD - MIN_THRESHOLD));
export const thresholdToStrength = (t: number): number =>
  Math.round(((MAX_THRESHOLD - clampThreshold(t)) / (MAX_THRESHOLD - MIN_THRESHOLD)) * 100);

/**
 * The smallest rectangle holding the ink (alpha >= minAlpha). Edge rows and columns with fewer than
 * `minCount` ink pixels are dropped first, so a speck of dust or a shadow line at the border of a
 * photo does not stretch the box. Null when there is no ink.
 */
export function inkBounds(img: Rgba, minAlpha = 24, minCount = 1): Bounds | null {
  const { data, width, height } = img;
  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);
  let any = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! >= minAlpha) {
        rows[y]!++;
        cols[x]!++;
        any = true;
      }
    }
  }
  if (!any) return null;
  const first = (a: Uint32Array) => a.findIndex((c) => c >= minCount);
  const last = (a: Uint32Array) => {
    for (let i = a.length - 1; i >= 0; i--) if (a[i]! >= minCount) return i;
    return -1;
  };
  let x0 = first(cols);
  let y0 = first(rows);
  let x1 = last(cols);
  let y1 = last(rows);
  if (x0 < 0 || y0 < 0) {
    // Only specks: fall back to every ink pixel.
    x0 = cols.findIndex((c) => c > 0);
    y0 = rows.findIndex((c) => c > 0);
    x1 = width - 1 - [...cols].reverse().findIndex((c) => c > 0);
    y1 = height - 1 - [...rows].reverse().findIndex((c) => c > 0);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Grow bounds by `pad` pixels on each side, staying inside the image. */
export function padBounds(b: Bounds, pad: number, width: number, height: number): Bounds {
  const x = Math.max(0, b.x - pad);
  const y = Math.max(0, b.y - pad);
  return { x, y, w: Math.min(width, b.x + b.w + pad) - x, h: Math.min(height, b.y + b.h + pad) - y };
}

/** Copy a rectangle out of an RGBA image. */
export function cropRgba(img: Rgba, b: Bounds): Rgba {
  const out = new Uint8ClampedArray(b.w * b.h * 4);
  for (let y = 0; y < b.h; y++) {
    const from = ((b.y + y) * img.width + b.x) * 4;
    out.set(img.data.subarray(from, from + b.w * 4), y * b.w * 4);
  }
  return { data: out, width: b.w, height: b.h };
}

/** Trim an image with a transparent background to its ink, plus a little room for soft edges. */
export function trimToInk(img: Rgba, pad: number, minCount = 1): Rgba | null {
  const b = inkBounds(img, 24, minCount);
  if (!b) return null;
  return cropRgba(img, padBounds(b, pad, img.width, img.height));
}

/** A photo of a signature -> transparent ink trimmed to the signature (null when nothing is left). */
export function extractSignature(img: Rgba, threshold: number): Rgba | null {
  const data = new Uint8ClampedArray(img.data);
  knockOutPaper(data, threshold);
  // Specks: an edge row or column needs a few ink pixels, scaled to the picture, to count.
  const minCount = Math.max(2, Math.round(Math.max(img.width, img.height) / 400));
  return trimToInk({ data, width: img.width, height: img.height }, 2, minCount);
}
