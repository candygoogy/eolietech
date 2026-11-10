/**
 * PNG: walk the chunks, report the metadata, and rewrite the file without it. "Everything" keeps an
 * allow-list of the chunks needed to show the image (IHDR, PLTE, IDAT, IEND, colour, animation) and
 * drops every other chunk, private ones included. Kept chunks are copied byte for byte.
 */
import { TiffError, ascii, concat, orientationOnlyExif, readExif, removeGpsInPlace, startsWith, tiffStart, type Coords, type ExifInfo } from "./tiff";
import { blankXmpGps, isLocationName, latin1, xmpGps } from "./xmp";
import type { Block, Cleaned, Mode, Report } from "./types";

export class PngError extends Error {
  constructor(message = "malformed PNG") {
    super(message);
    this.name = "PngError";
  }
}

export const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface Chunk {
  type: string;
  /** Offset of the length field. */
  start: number;
  /** Offset of the data. */
  data: number;
  length: number;
  /** One past the CRC. */
  end: number;
}

/**
 * Chunks kept in "all" mode: image, transparency, colour (ICC kept, as in JPEG), HDR and animation.
 * pHYs (pixel density) stays too, like the density in a JPEG's JFIF header: it only sets the print size.
 */
const KEEP_ALL = new Set([
  "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "cICP", "mDCV", "cLLI", "acTL", "fcTL", "fdAT", "pHYs",
]);
const TEXT = new Set(["tEXt", "zTXt", "iTXt"]);

export function walkPng(b: Uint8Array): { chunks: Chunk[]; end: number } {
  if (!startsWith(b, PNG_SIG)) throw new PngError("no signature");
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: Chunk[] = [];
  let p = 8;
  while (p + 12 <= b.length) {
    const length = dv.getUint32(p);
    if (length > b.length - p - 12) throw new PngError("chunk overruns the file");
    const type = String.fromCharCode(b[p + 4]!, b[p + 5]!, b[p + 6]!, b[p + 7]!);
    if (!/^[A-Za-z]{4}$/.test(type)) throw new PngError("bad chunk type");
    const chunk = { type, start: p, data: p + 8, length, end: p + 12 + length };
    chunks.push(chunk);
    p = chunk.end;
    if (type === "IEND") return { chunks, end: p };
  }
  if (!chunks.some((c) => c.type === "IDAT")) throw new PngError("no image data");
  return { chunks, end: p };
}

const data = (b: Uint8Array, c: Chunk) => b.subarray(c.data, c.data + c.length);

/** Text chunk keyword (Latin-1, up to 79 bytes before the NUL). */
function keyword(b: Uint8Array, c: Chunk): string {
  const d = data(b, c).subarray(0, 80);
  const nul = d.indexOf(0);
  return latin1(nul >= 0 ? d.subarray(0, nul) : d);
}

/**
 * Where a text chunk's text starts (in chunk data) and whether it is compressed. tEXt: keyword\0 text;
 * zTXt: keyword\0 method, compressed text; iTXt: keyword\0 flag method lang\0 translated\0 text.
 */
function textAt(b: Uint8Array, c: Chunk): { at: number; compressed: boolean } | null {
  const d = data(b, c);
  const k = d.indexOf(0);
  if (k < 0) return null;
  if (c.type === "tEXt") return { at: k + 1, compressed: false };
  if (c.type === "zTXt") return { at: k + 2, compressed: true };
  if (k + 3 > d.length) return null;
  const compressed = d[k + 1] === 1;
  const lang = d.indexOf(0, k + 3);
  if (lang < 0) return null;
  const tr = d.indexOf(0, lang + 1);
  return tr < 0 ? null : { at: tr + 1, compressed };
}

const isXmp = (b: Uint8Array, c: Chunk) => TEXT.has(c.type) && keyword(b, c) === "XML:com.adobe.xmp";
/** A text note keyed like a location (ImageMagick writes "exif:GPSLatitude" and friends as tEXt). */
const isLocationText = (b: Uint8Array, c: Chunk) => TEXT.has(c.type) && !isXmp(b, c) && isLocationName(keyword(b, c));

/** "38/1, 28/1, 4068/100" (degrees, minutes, seconds as rationals) or a plain decimal, signed by its ref (N, S, E, W). */
function parseTextCoordinate(value: string, ref: string, max: number): number | null {
  if (value.length > 80) return null;
  const r = /^\s*(\d+)\s*\/\s*(\d+)\s*,\s*(\d+)\s*\/\s*(\d+)\s*,\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(value);
  const dec = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);
  let v: number;
  if (r) {
    const [d, m, s] = [1, 3, 5].map((i) => Number(r[i]) / Number(r[i + 1])) as [number, number, number];
    v = d + m / 60 + s / 3600;
  } else if (dec) v = Number(dec[1]);
  else return null;
  if (/^\s*[SW]/i.test(ref)) v = -Math.abs(v);
  return Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

/** Location from text notes: coordinates, "unreadable" when a latitude or longitude note does not parse, or null. */
function textGps(notes: Map<string, string>): Coords | "unreadable" | null {
  const find = (word: RegExp) => [...notes].find(([k]) => word.test(k) && !/ref$/i.test(k));
  const ref = (key: string) => notes.get(`${key}Ref`) ?? "";
  const latNote = find(/latitude/i);
  const lonNote = find(/longt?itude/i);
  if (!latNote && !lonNote) return null;
  const lat = latNote ? parseTextCoordinate(latNote[1], ref(latNote[0]), 90) : null;
  const lon = lonNote ? parseTextCoordinate(lonNote[1], ref(lonNote[0]), 180) : null;
  return lat !== null && lon !== null ? { lat, lon } : "unreadable";
}
/** ImageMagick and exiftool store raw EXIF/XMP as hex in compressed text ("Raw profile type exif"). */
const isRawProfile = (b: Uint8Array, c: Chunk) => TEXT.has(c.type) && /^Raw profile type /i.test(keyword(b, c));

export function inspectPng(b: Uint8Array): Report {
  const { chunks } = walkPng(b);
  const blocks = new Set<Block>();
  let exif: ExifInfo | null = null;
  let exifUnreadable = false;
  let xmp: Report["gps"] = null;
  const notes = new Map<string, string>();
  for (const c of chunks) {
    if (c.type === "eXIf") {
      if (exif || exifUnreadable) continue;
      const d = data(b, c);
      try {
        exif = readExif(d.subarray(tiffStart(d)));
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
        exifUnreadable = true;
      }
    } else if (isXmp(b, c)) {
      blocks.add("xmp");
      const t = textAt(b, c);
      if (t && !t.compressed) xmp ??= xmpGps(data(b, c).subarray(t.at));
    } else if (TEXT.has(c.type)) {
      blocks.add("text");
      if (isLocationText(b, c)) {
        const t = textAt(b, c);
        notes.set(keyword(b, c), t && !t.compressed ? latin1(data(b, c).subarray(t.at, t.at + 81)) : "");
      }
    } else if (c.type === "tIME") {
      blocks.add("time");
    } else if (!KEEP_ALL.has(c.type)) {
      blocks.add("app");
    }
  }
  if (exif?.thumbnail) blocks.add("thumbnail");
  return { format: "png", exif, exifUnreadable, gps: exif?.gps ?? xmp ?? textGps(notes), blocks: [...blocks] };
}

export function cleanPng(b: Uint8Array, mode: Mode): Cleaned {
  const { chunks, end } = walkPng(b);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let keptOrientation: number | null = null;
  let droppedUnreadable = false;
  let droppedXmp = false;
  let exifSeen = false;

  for (const c of chunks) {
    const whole = b.subarray(c.start, c.end);
    if (mode === "all") {
      if (KEEP_ALL.has(c.type)) {
        parts.push(whole);
      } else if (c.type === "eXIf" && !exifSeen) {
        exifSeen = true;
        const d = data(b, c);
        try {
          const o = readExif(d.subarray(tiffStart(d))).orientation;
          if (o !== 1) {
            parts.push(chunk("eXIf", orientationOnlyExif(o)));
            keptOrientation = o;
          }
        } catch (err) {
          if (!(err instanceof TiffError)) throw err;
        }
      }
      continue;
    }

    // "gps": same chunks, with the location cut out of EXIF and XMP.
    if (c.type === "eXIf") {
      const d = data(b, c).slice();
      try {
        if (removeGpsInPlace(d.subarray(tiffStart(d)))) parts.push(chunk("eXIf", d));
        else parts.push(whole);
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
        droppedUnreadable = true;
      }
    } else if (isXmp(b, c)) {
      const t = textAt(b, c);
      // Compressed XMP cannot be checked without inflating it, so it goes rather than risk a location.
      if (!t || t.compressed) {
        droppedXmp = true;
        continue;
      }
      const d = data(b, c).slice();
      const edit = blankXmpGps(d.subarray(t.at));
      if (edit === "unsafe") droppedXmp = true;
      else parts.push(edit === "blanked" ? chunk(c.type, d) : whole);
    } else if (isRawProfile(b, c) || isLocationText(b, c)) {
      // Hex-encoded EXIF or XMP copies, and notes keyed like a location: may hold it, cannot be edited in place.
      continue;
    } else {
      parts.push(whole);
    }
  }
  // Bytes after IEND are not part of the image and cannot be checked for a location: both modes leave them out.
  return { bytes: concat(parts), keptOrientation, droppedUnreadable, droppedXmp, droppedTrailer: mode === "gps" && b.length - end > 16 };
}

/** Build a chunk with its length and CRC. */
export function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, body.length);
  out.set(ascii(type), 4);
  out.set(body, 8);
  dv.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

let table: Uint32Array | undefined;

export function crc32(b: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
