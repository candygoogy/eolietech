/**
 * Pure image-format helpers shared by the image tools (main thread and workers). No DOM, no WASM:
 * everything here is unit-testable.
 */

export type RasterFormat = "jpg" | "png" | "webp" | "avif";
export type InputFormat = RasterFormat | "heic";
/** "original" keeps each file's own format (compress only). */
export type OutputChoice = RasterFormat | "original";

export const RASTER_FORMATS: readonly RasterFormat[] = ["jpg", "png", "webp", "avif"];

export const MIME: Record<InputFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
};

/** <input accept> fragments per format (MIME types plus extensions, since some systems send no MIME type). */
const ACCEPT: Record<InputFormat, string[]> = {
  jpg: ["image/jpeg", ".jpg", ".jpeg", ".jfif"],
  png: ["image/png", ".png"],
  webp: ["image/webp", ".webp"],
  avif: ["image/avif", ".avif"],
  heic: ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", ".heic", ".heif", ".hif"],
};

export const acceptFor = (formats: readonly InputFormat[]): string => formats.flatMap((f) => ACCEPT[f]).join(",");

export const isRasterFormat = (v: unknown): v is RasterFormat =>
  typeof v === "string" && (RASTER_FORMATS as readonly string[]).includes(v);

/** Lossy formats take a quality setting; PNG is always lossless. */
export const isLossy = (f: RasterFormat): boolean => f !== "png";

/** Formats that can carry an alpha channel. */
export const supportsAlpha = (f: RasterFormat): boolean => f !== "jpg";

/** Detect the real format from the first bytes (file names and MIME types lie). */
export function sniffFormat(bytes: Uint8Array): InputFormat | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp") {
    // ISO-BMFF: major brand at 8..12, compatible brands from 16 up to the end of the ftyp box.
    const boxSize = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
    const end = Math.min(b.length, Math.max(16, boxSize || 16));
    const brands = [ascii(8, 12)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(i, i + 4));
    if (brands.some((x) => x === "avif" || x === "avis")) return "avif";
    if (brands.some((x) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(x))) return "heic";
  }
  return null;
}

/** Best guess from the file name, used only for display before the bytes are read. */
export function formatFromName(name: string): InputFormat | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  for (const f of Object.keys(ACCEPT) as InputFormat[]) {
    if (ACCEPT[f].includes(`.${ext}`)) return f;
  }
  return null;
}

/** Output name: same base name with the target extension; keeps the original extension when the format is unchanged. */
export function outputName(inputName: string, inputFormat: InputFormat | null, outFormat: RasterFormat): string {
  const dot = inputName.lastIndexOf(".");
  const base = dot > 0 ? inputName.slice(0, dot) : inputName;
  if (inputFormat === outFormat && dot > 0) return inputName;
  return `${base}.${outFormat}`;
}

/** Make names unique inside one zip: "a.jpg", "a.jpg" -> "a.jpg", "a (2).jpg". Case-insensitive. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    let n = 2;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    while (seen.has(candidate.toLowerCase())) candidate = `${base} (${n++})${ext}`;
    seen.add(candidate.toLowerCase());
    return candidate;
  });
}

/** The output format for one file, given the user's choice. */
export const resolveOutput = (choice: OutputChoice, input: InputFormat): RasterFormat =>
  choice === "original" ? (input === "heic" ? "jpg" : input) : choice;

/**
 * One 1-100 quality slider drives every lossy encoder. JPEG and WebP use it directly. AVIF's scale is
 * stricter (50 looks roughly like JPEG 75), so it is remapped: 75 -> 50, 100 -> 100, linear in between.
 */
export function avifQuality(q: number): number {
  const v = Math.max(1, Math.min(100, Math.round(q)));
  return v <= 75 ? Math.round((v * 50) / 75) : Math.round(50 + (v - 75) * 2);
}

export interface EncodeParams {
  format: RasterFormat;
  /** Encoder-specific options, merged over the codec defaults. */
  options: Record<string, number | boolean>;
}

/** Settings -> encoder parameters (kept here so the mapping is testable without WASM). */
export function encodeParams(format: RasterFormat, quality: number): EncodeParams {
  const q = Math.max(1, Math.min(100, Math.round(quality)));
  switch (format) {
    case "jpg":
      return { format, options: { quality: q, progressive: true, optimize_coding: true } };
    case "webp":
      return { format, options: { quality: q, method: 4, alpha_quality: 100 } };
    case "avif":
      return { format, options: { quality: avifQuality(q), speed: 7, subsample: 1 } };
    case "png":
      // oxipng: level 2 is its default speed/size balance; optimiseAlpha only touches fully transparent pixels.
      return { format, options: { level: 2, interlace: false, optimiseAlpha: true } };
  }
}

/** Fit (w, h) inside optional max bounds, keeping the aspect ratio and never upscaling. */
export function fitWithin(w: number, h: number, maxW?: number | null, maxH?: number | null): { width: number; height: number } {
  let scale = 1;
  if (maxW && maxW > 0 && w > maxW) scale = Math.min(scale, maxW / w);
  if (maxH && maxH > 0 && h > maxH) scale = Math.min(scale, maxH / h);
  if (scale === 1) return { width: w, height: h };
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Largest output side an exact resize may produce (the dimension inputs share this ceiling). */
export const MAX_SIDE = 20000;

/**
 * An exact resize request (image-resize). "width", "height" and "percent" keep the aspect ratio;
 * "box" fits inside width x height when keepAspect is on, and stretches to exactly that size when off.
 * With enlarge off, an image is never made bigger on any side.
 */
export type ResizeSpec =
  | { mode: "width"; width: number; enlarge: boolean }
  | { mode: "height"; height: number; enlarge: boolean }
  | { mode: "box"; width: number; height: number; keepAspect: boolean; enlarge: boolean }
  | { mode: "percent"; percent: number; enlarge: boolean };

export interface TargetSize {
  width: number;
  height: number;
  /** The request would have enlarged the image (on at least one side), and enlarging was off. */
  notEnlarged: boolean;
}

const side = (n: number): number => Math.min(MAX_SIDE, Math.max(1, Math.round(n)));

/** Output size for an exact resize request. */
export function targetSize(w: number, h: number, spec: ResizeSpec): TargetSize {
  if (spec.mode === "box" && !spec.keepAspect) {
    // Stretch: each side independently; without enlarging, a side smaller than the target stays as it is.
    let tw = spec.width;
    let th = spec.height;
    let notEnlarged = false;
    if (!spec.enlarge && tw > w) [tw, notEnlarged] = [w, true];
    if (!spec.enlarge && th > h) [th, notEnlarged] = [h, true];
    return { width: side(tw), height: side(th), notEnlarged };
  }
  const s =
    spec.mode === "width"
      ? spec.width / w
      : spec.mode === "height"
        ? spec.height / h
        : spec.mode === "percent"
          ? spec.percent / 100
          : Math.min(spec.width / w, spec.height / h);
  if (s > 1 && !spec.enlarge) return { width: w, height: h, notEnlarged: true };
  // Enlarging stops where the longer side reaches MAX_SIDE.
  const k = s > 1 ? Math.max(1, Math.min(s, MAX_SIDE / Math.max(w, h))) : s;
  let width = side(w * k);
  let height = side(h * k);
  // The side the user typed comes out exactly as typed (w * s can round one pixel off).
  if (k === s && spec.mode === "width") width = side(spec.width);
  if (k === s && spec.mode === "height") height = side(spec.height);
  return { width, height, notEnlarged: false };
}

/** Composite RGBA pixels onto a solid background in place (JPEG has no alpha; transparent areas would turn black). */
export function flattenAlpha(data: Uint8ClampedArray | Uint8Array, bg: [number, number, number] = [255, 255, 255]): boolean {
  let changed = false;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a === 255) continue;
    changed = true;
    const k = a / 255;
    data[i] = Math.round(data[i]! * k + bg[0] * (1 - k));
    data[i + 1] = Math.round(data[i + 1]! * k + bg[1] * (1 - k));
    data[i + 2] = Math.round(data[i + 2]! * k + bg[2] * (1 - k));
    data[i + 3] = 255;
  }
  return changed;
}

/** Percentage saved (positive) or added (negative), rounded. */
export const percentSaved = (before: number, after: number): number =>
  before > 0 ? Math.round(((before - after) / before) * 100) : 0;
