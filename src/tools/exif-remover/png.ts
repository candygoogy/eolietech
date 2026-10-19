/**
 * PNG: walk the chunks, report the metadata, and rewrite the file without it. Image chunks (IHDR,
 * PLTE, IDAT, IEND...) and colour chunks (iCCP, sRGB, gAMA, cHRM, pHYs...) are copied byte for byte.
 */
import { TiffError, ascii, concat, orientationOnlyExif, readExif, removeGpsInPlace, startsWith, tiffStart, type ExifInfo } from "./tiff";
import { blankXmpGps, latin1, xmpGps } from "./xmp";
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

/** Chunks dropped in "all" mode. */
const METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
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

/** iTXt layout: keyword\0 flag method lang\0 translated\0 text. Returns the text offset (in chunk data) and whether it is compressed. */
function itxtText(d: Uint8Array): { at: number; compressed: boolean } | null {
  const k = d.indexOf(0);
  if (k < 0 || k + 3 > d.length) return null;
  const compressed = d[k + 1] === 1;
  const lang = d.indexOf(0, k + 3);
  if (lang < 0) return null;
  const tr = d.indexOf(0, lang + 1);
  return tr < 0 ? null : { at: tr + 1, compressed };
}

const isXmp = (b: Uint8Array, c: Chunk) => c.type === "iTXt" && keyword(b, c) === "XML:com.adobe.xmp";
/** ImageMagick and exiftool store raw EXIF/XMP as hex in compressed text ("Raw profile type exif"). */
const isRawProfile = (b: Uint8Array, c: Chunk) => TEXT.has(c.type) && /^Raw profile type /i.test(keyword(b, c));

export function inspectPng(b: Uint8Array): Report {
  const { chunks } = walkPng(b);
  const blocks = new Set<Block>();
  let exif: ExifInfo | null = null;
  let exifUnreadable = false;
  let xmp: Report["gps"] = null;
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
      const d = data(b, c);
      const t = itxtText(d);
      if (t && !t.compressed) xmp ??= xmpGps(d.subarray(t.at));
    } else if (TEXT.has(c.type)) {
      blocks.add("text");
    } else if (c.type === "tIME") {
      blocks.add("time");
    }
  }
  if (exif?.thumbnail) blocks.add("thumbnail");
  return { format: "png", exif, exifUnreadable, gps: exif?.gps ?? xmp ?? null, blocks: [...blocks] };
}

export function cleanPng(b: Uint8Array, mode: Mode): Cleaned {
  const { chunks, end } = walkPng(b);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let keptOrientation: number | null = null;
  let droppedUnreadable = false;
  let exifSeen = false;

  for (const c of chunks) {
    const whole = b.subarray(c.start, c.end);
    if (mode === "all") {
      if (!METADATA.has(c.type)) {
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
      const d = data(b, c).slice();
      const t = itxtText(d);
      // Compressed XMP cannot be checked without inflating it, so it goes rather than risk a location.
      if (!t || t.compressed) continue;
      parts.push(blankXmpGps(d.subarray(t.at)) ? chunk("iTXt", d) : whole);
    } else if (isRawProfile(b, c)) {
      // Hex-encoded EXIF or XMP copies: may hold the location, cannot be edited in place.
      continue;
    } else {
      parts.push(whole);
    }
  }
  // Bytes after IEND are not part of the image; "all" leaves them out, "gps" keeps the file as it was.
  if (mode === "gps" && end < b.length) parts.push(b.subarray(end));
  return { bytes: concat(parts), keptOrientation, droppedUnreadable };
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
