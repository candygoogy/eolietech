/**
 * WebP (RIFF): walk the chunks, report the metadata, and rewrite the file without it. The image
 * chunks (VP8, VP8L, ALPH, ANIM, ANMF) and ICCP are copied byte for byte; the VP8X flags and the
 * RIFF size are updated to match.
 */
import { TiffError, ascii, concat, orientationOnlyExif, readExif, removeGpsInPlace, startsWith, tiffStart, type ExifInfo } from "./tiff";
import { blankXmpGps, xmpGps } from "./xmp";
import type { Block, Cleaned, Mode, Report } from "./types";

export class WebpError extends Error {
  constructor(message = "malformed WebP") {
    super(message);
    this.name = "WebpError";
  }
}

export interface RiffChunk {
  fourcc: string;
  start: number;
  data: number;
  size: number;
  /** One past the chunk, including its pad byte. */
  end: number;
}

/** VP8X flag bits. */
export const FLAG_EXIF = 0x08;
export const FLAG_XMP = 0x04;

export function walkWebp(b: Uint8Array): RiffChunk[] {
  if (!(startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8))) throw new WebpError("not a WebP");
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // Trust the RIFF size only as far as the file goes.
  const limit = Math.min(b.length, dv.getUint32(4, true) + 8);
  const chunks: RiffChunk[] = [];
  let p = 12;
  while (p + 8 <= limit) {
    const fourcc = String.fromCharCode(b[p]!, b[p + 1]!, b[p + 2]!, b[p + 3]!);
    const size = dv.getUint32(p + 4, true);
    if (size > limit - p - 8) throw new WebpError("chunk overruns the file");
    const end = Math.min(limit, p + 8 + size + (size & 1));
    chunks.push({ fourcc, start: p, data: p + 8, size, end });
    p = end;
  }
  if (!chunks.some((c) => c.fourcc === "VP8 " || c.fourcc === "VP8L" || c.fourcc === "ANMF")) {
    throw new WebpError("no image data");
  }
  return chunks;
}

const data = (b: Uint8Array, c: RiffChunk) => b.subarray(c.data, c.data + c.size);

export function inspectWebp(b: Uint8Array): Report {
  const chunks = walkWebp(b);
  const blocks = new Set<Block>();
  let exif: ExifInfo | null = null;
  let exifUnreadable = false;
  let xmp: Report["gps"] = null;
  for (const c of chunks) {
    if (c.fourcc === "EXIF" && !exif && !exifUnreadable) {
      const d = data(b, c);
      try {
        exif = readExif(d.subarray(tiffStart(d)));
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
        exifUnreadable = true;
      }
    } else if (c.fourcc === "XMP ") {
      blocks.add("xmp");
      xmp ??= xmpGps(data(b, c));
    }
  }
  if (exif?.thumbnail) blocks.add("thumbnail");
  return { format: "webp", exif, exifUnreadable, gps: exif?.gps ?? xmp ?? null, blocks: [...blocks] };
}

export function cleanWebp(b: Uint8Array, mode: Mode): Cleaned {
  const chunks = walkWebp(b);
  const parts: Uint8Array[] = [];
  let keptOrientation: number | null = null;
  let droppedUnreadable = false;
  let hasExif = false;
  let hasXmp = false;
  let exifSeen = false;

  for (const c of chunks) {
    const whole = b.subarray(c.start, c.end);
    if (c.fourcc === "EXIF") {
      if (exifSeen) continue;
      exifSeen = true;
      const d = data(b, c).slice();
      const tiff = d.subarray(tiffStart(d));
      try {
        if (mode === "all") {
          const o = readExif(tiff).orientation;
          if (o !== 1) {
            parts.push(riffChunk("EXIF", orientationOnlyExif(o)));
            keptOrientation = o;
            hasExif = true;
          }
        } else {
          parts.push(removeGpsInPlace(tiff) ? riffChunk("EXIF", d) : whole);
          hasExif = true;
        }
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
        if (mode === "gps") droppedUnreadable = true;
      }
    } else if (c.fourcc === "XMP ") {
      if (mode === "all") continue;
      const d = data(b, c).slice();
      parts.push(blankXmpGps(d) ? riffChunk("XMP ", d) : whole);
      hasXmp = true;
    } else {
      parts.push(whole);
    }
  }

  // VP8X flags must match the chunks that are left; the RIFF size covers everything after it.
  const body = concat(parts);
  const first = chunks[0]!;
  if (first.fourcc === "VP8X" && first.size >= 1 && body.length > 8) {
    let flags = body[8]!;
    if (!hasExif) flags &= ~FLAG_EXIF;
    if (!hasXmp) flags &= ~FLAG_XMP;
    body[8] = flags;
  }
  const out = concat([b.subarray(0, 12), body]);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return { bytes: out, keptOrientation, droppedUnreadable };
}

/** Build a RIFF chunk (little-endian size, padded to an even length). */
export function riffChunk(fourcc: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length + (body.length & 1));
  out.set(ascii(fourcc));
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
}
