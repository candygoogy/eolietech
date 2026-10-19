/**
 * image-to-pdf: pure helpers (no DOM, no WASM, no pdf-lib), unit-tested.
 *   - jpegOrientation: the EXIF orientation a phone writes into a JPEG. A JPEG embedded as-is in a
 *     PDF is drawn as stored, and PDF readers ignore EXIF, so a sideways-stored photo must be turned
 *     by the drawing matrix instead (placeImage).
 *   - pageLayout: page size and the box the (upright) image is drawn into.
 *   - webpIsLossless: picks PNG over JPG when a WebP has to be re-encoded for the PDF.
 */

export type PageSize = "fit" | "a4" | "letter";
export type Margin = "none" | "small";

export interface PdfOptions {
  pageSize: PageSize;
  margin: Margin;
}

export const DEFAULT_OPTIONS: PdfOptions = { pageSize: "fit", margin: "none" };

/** Portrait paper sizes in PDF points (1/72 inch). */
export const PAPER: Record<Exclude<PageSize, "fit">, readonly [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/** The small margin: 36 pt = half an inch = 12.7 mm. */
export const SMALL_MARGIN = 36;

/** Longest page side most PDF readers accept (Acrobat: 200 inches). Bigger images get a scaled page. */
export const MAX_PAGE_SIDE = 14400;

export const isPageSize = (v: unknown): v is PageSize => v === "fit" || v === "a4" || v === "letter";
export const isMargin = (v: unknown): v is Margin => v === "none" || v === "small";

/** Form values -> options, falling back to the defaults for anything unexpected. */
export function readOptions(pageSize: string, margin: string): PdfOptions {
  return {
    pageSize: isPageSize(pageSize) ? pageSize : DEFAULT_OPTIONS.pageSize,
    margin: isMargin(margin) ? margin : DEFAULT_OPTIONS.margin,
  };
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  width: number;
  height: number;
  /** Where the upright image goes, in PDF coordinates (origin bottom left). */
  box: Box;
}

/**
 * Page for an image of `w` x `h` pixels (as displayed, i.e. after EXIF orientation).
 * "fit": the page is the image, 1 pixel = 1 point (scaled down only past MAX_PAGE_SIDE); no margin.
 * A4 / Letter: portrait, or landscape for a landscape image; the image is scaled to fit inside the
 * margin (up or down) and centred.
 */
export function pageLayout(w: number, h: number, opts: PdfOptions): PageLayout {
  if (opts.pageSize === "fit") {
    const s = Math.min(1, MAX_PAGE_SIDE / Math.max(w, h));
    const width = w * s;
    const height = h * s;
    return { width, height, box: { x: 0, y: 0, width, height } };
  }
  const [short, long] = PAPER[opts.pageSize];
  const landscape = w > h;
  const width = landscape ? long : short;
  const height = landscape ? short : long;
  const m = opts.margin === "small" ? SMALL_MARGIN : 0;
  const s = Math.min((width - 2 * m) / w, (height - 2 * m) / h);
  const bw = w * s;
  const bh = h * s;
  return { width, height, box: { x: (width - bw) / 2, y: (height - bh) / 2, width: bw, height: bh } };
}

/** PDF transformation matrix [a b c d e f]: (u, v) -> (a*u + c*v + e, b*u + d*v + f). */
export type Matrix = [number, number, number, number, number, number];

/**
 * For each EXIF orientation, the map from the stored image's unit square (u right, v up, as a PDF
 * image XObject is drawn) to the upright image's unit square (s right, t up), as [a b c d e f].
 */
const UPRIGHT: Record<number, Matrix> = {
  1: [1, 0, 0, 1, 0, 0], // as stored
  2: [-1, 0, 0, 1, 1, 0], // mirrored left to right
  3: [-1, 0, 0, -1, 1, 1], // upside down
  4: [1, 0, 0, -1, 0, 1], // mirrored top to bottom
  5: [0, -1, -1, 0, 1, 1], // transposed
  6: [0, -1, 1, 0, 0, 1], // needs a quarter turn clockwise (the usual sideways phone photo)
  7: [0, 1, 1, 0, 0, 0], // transverse
  8: [0, 1, -1, 0, 1, 0], // needs a quarter turn anticlockwise
};

const validOrientation = (o: number): number => (Number.isInteger(o) && o >= 1 && o <= 8 ? o : 1);

/** Orientations 5 to 8 swap width and height. */
export const turnsSideways = (orientation: number): boolean => validOrientation(orientation) >= 5;

/** The matrix that draws an image stored with `orientation` upright into `box`. */
export function placeImage(orientation: number, box: Box): Matrix {
  const [a, b, c, d, e, f] = UPRIGHT[validOrientation(orientation)]!;
  return [box.width * a, box.height * b, box.width * c, box.height * d, box.x + box.width * e, box.y + box.height * f];
}

/** EXIF orientation (1 to 8) of a JPEG; 1 when there is none or it cannot be read. */
export function jpegOrientation(bytes: Uint8Array): number {
  const n = bytes.length;
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 <= n) {
    if (bytes[i] !== 0xff) return 1;
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    // Start of scan or end of image: the metadata segments are behind us.
    if (marker === 0xda || marker === 0xd9) return 1;
    // Markers without a length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2) return 1;
    const start = i + 4;
    const end = Math.min(n, i + 2 + len);
    if (marker === 0xe1 && end - start >= 14 && ascii(bytes, start, 6) === "Exif\0\0") {
      const o = tiffOrientation(bytes, start + 6, end);
      if (o) return o;
    }
    i += 2 + len;
  }
  return 1;
}

function ascii(b: Uint8Array, from: number, len: number): string {
  let s = "";
  for (let k = 0; k < len; k++) s += String.fromCharCode(b[from + k] ?? 0);
  return s;
}

/** Orientation tag (0x0112) of IFD0 in a TIFF block at [t, end); 0 when absent or out of range. */
function tiffOrientation(b: Uint8Array, t: number, end: number): number {
  if (t + 8 > end) return 0;
  const order = ascii(b, t, 2);
  if (order !== "II" && order !== "MM") return 0;
  const le = order === "II";
  const u16 = (p: number) => (le ? b[p]! | (b[p + 1]! << 8) : (b[p]! << 8) | b[p + 1]!);
  const u32 = (p: number) => (le ? (u16(p + 2) << 16) | u16(p) : (u16(p) << 16) | u16(p + 2)) >>> 0;
  if (u16(t + 2) !== 42) return 0;
  const ifd = t + u32(t + 4);
  if (ifd + 2 > end) return 0;
  const count = u16(ifd);
  for (let k = 0; k < count; k++) {
    const entry = ifd + 2 + k * 12;
    if (entry + 12 > end) return 0;
    if (u16(entry) !== 0x0112) continue;
    // SHORT (type 3), one value, stored in the first two bytes of the value field.
    const value = u16(entry + 2) === 3 ? u16(entry + 8) : 0;
    return value >= 1 && value <= 8 ? value : 0;
  }
  return 0;
}

/** Is this WebP lossless (a VP8L image chunk)? Lossy WebPs ("VP8 ") are photos, re-encoded as JPG. */
export function webpIsLossless(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return false;
  let i = 12;
  while (i + 8 <= bytes.length) {
    const fourcc = ascii(bytes, i, 4);
    if (fourcc === "VP8L") return true;
    if (fourcc === "VP8 ") return false;
    const size = (bytes[i + 4]! | (bytes[i + 5]! << 8) | (bytes[i + 6]! << 16) | (bytes[i + 7]! << 24)) >>> 0;
    i += 8 + size + (size & 1);
  }
  return false;
}

/** Does any pixel have alpha below 255? */
export function hasTransparency(data: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return true;
  return false;
}

/** File name for the PDF: one image keeps its own name, several get `fallback`. */
export function pdfName(names: string[], fallback: string): string {
  if (names.length !== 1) return fallback;
  const name = names[0]!;
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.pdf`;
}
