/**
 * JPEG: walk the marker segments, report the metadata, and rewrite the file without it. The
 * compressed image data (every scan, from SOS to the next marker) is copied byte for byte, never
 * decoded or re-encoded.
 */
import { EXIF_HEADER, TiffError, ascii, concat, orientationOnlyExif, readExif, removeGpsInPlace, startsWith, type ExifInfo } from "./tiff";
import { blankXmpGps, latin1, xmpGps } from "./xmp";
import type { Block, Cleaned, Mode, Report } from "./types";

export class JpegError extends Error {
  constructor(message = "malformed JPEG") {
    super(message);
    this.name = "JpegError";
  }
}

export type SegmentKind =
  | "soi"
  | "eoi"
  | "scan"
  | "core"
  | "jfif"
  | "exif"
  | "xmp"
  | "xmpExt"
  | "icc"
  | "adobe"
  | "iptc"
  | "comment"
  | "mpf"
  | "app";

export interface Segment {
  marker: number;
  kind: SegmentKind;
  /** First byte (including any fill bytes before the marker). */
  start: number;
  /** One past the last byte; for a scan, the end of its entropy-coded data. */
  end: number;
  /** Payload after the 2-byte length (APPn/COM), up to `end`; -1 for markers without one. */
  data: number;
}

export interface JpegLayout {
  segments: Segment[];
  /** One past EOI (or the end of the data when EOI is missing). */
  end: number;
}

const XMP_SIG = ascii("http://ns.adobe.com/xap/1.0/\0");
const XMP_EXT_SIG = ascii("http://ns.adobe.com/xmp/extension/\0");
const ICC_SIG = ascii("ICC_PROFILE\0");
const MPF_SIG = ascii("MPF\0");
const JFIF_SIG = ascii("JFIF\0");
/** JFIF extension APP0: a thumbnail (JPEG, palette or RGB) and nothing else. */
const JFXX_SIG = ascii("JFXX\0");
const ADOBE_SIG = ascii("Adobe");
const EXIF_SIG = ascii("Exif\0");

function classify(b: Uint8Array, marker: number, data: number): SegmentKind {
  if (marker === 0xe0) return startsWith(b, JFIF_SIG, data) ? "jfif" : "app";
  if (marker === 0xe1) {
    if (startsWith(b, EXIF_SIG, data)) return "exif";
    if (startsWith(b, XMP_SIG, data)) return "xmp";
    if (startsWith(b, XMP_EXT_SIG, data)) return "xmpExt";
    return "app";
  }
  if (marker === 0xe2) {
    if (startsWith(b, ICC_SIG, data)) return "icc";
    if (startsWith(b, MPF_SIG, data)) return "mpf";
    return "app";
  }
  if (marker === 0xed) return "iptc";
  if (marker === 0xee) return startsWith(b, ADOBE_SIG, data) ? "adobe" : "app";
  if (marker >= 0xe3 && marker <= 0xef) return "app";
  if (marker === 0xfe) return "comment";
  return "core";
}

/** Walk one JPEG starting at `from` (its SOI). Throws JpegError on a broken structure. */
export function walkJpeg(b: Uint8Array, from = 0): JpegLayout {
  const n = b.length;
  if (!(b[from] === 0xff && b[from + 1] === 0xd8)) throw new JpegError("no SOI");
  const segments: Segment[] = [{ marker: 0xd8, kind: "soi", start: from, end: from + 2, data: -1 }];
  let p = from + 2;
  while (p < n) {
    if (b[p] !== 0xff) throw new JpegError("expected a marker");
    let q = p;
    while (q < n && b[q] === 0xff) q++;
    if (q >= n) break;
    const marker = b[q]!;
    const start = p;
    p = q + 1;
    if (marker === 0xd9) {
      segments.push({ marker, kind: "eoi", start, end: p, data: -1 });
      return { segments, end: p };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      segments.push({ marker, kind: "core", start, end: p, data: -1 });
      continue;
    }
    if (marker === 0x00 || marker === 0xd8) throw new JpegError("unexpected marker");
    if (p + 2 > n) throw new JpegError("truncated length");
    const len = (b[p]! << 8) | b[p + 1]!;
    if (len < 2 || p + len > n) throw new JpegError("bad segment length");
    const data = p + 2;
    let end = p + len;
    if (marker === 0xda) {
      // Entropy-coded data runs to the next marker that is not a stuffed 0x00, a restart or fill.
      let s = end;
      for (;;) {
        s = b.indexOf(0xff, s);
        if (s < 0 || s + 1 >= n) {
          s = n;
          break;
        }
        const next = b[s + 1]!;
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) s += 2;
        else if (next === 0xff) s += 1;
        else break;
      }
      end = s;
      segments.push({ marker, kind: "scan", start, end, data });
    } else {
      segments.push({ marker, kind: classify(b, marker, data), start, end, data });
    }
    p = end;
  }
  // No EOI: a truncated file. Keep what is there; viewers show such files too.
  return { segments, end: n };
}

const payload = (b: Uint8Array, s: Segment) => b.subarray(s.data, s.end);

/** APP1 Exif segment wrapping a TIFF block. */
function app1Exif(tiff: Uint8Array): Uint8Array {
  const len = 2 + EXIF_HEADER.length + tiff.length;
  return concat([new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff]), EXIF_HEADER, tiff]);
}

export function inspectJpeg(b: Uint8Array): Report {
  const layout = walkJpeg(b);
  const blocks = new Set<Block>();
  let exif: ExifInfo | null = null;
  let exifUnreadable = false;
  let xmp: Report["gps"] = null;
  for (const s of layout.segments) {
    switch (s.kind) {
      case "exif":
        if (exif || exifUnreadable) break;
        try {
          exif = readExif(payload(b, s).subarray(6));
        } catch (err) {
          if (!(err instanceof TiffError)) throw err;
          exifUnreadable = true;
        }
        break;
      case "xmp":
      case "xmpExt":
        blocks.add("xmp");
        xmp ??= xmpGps(payload(b, s));
        break;
      case "iptc":
        blocks.add("iptc");
        break;
      case "comment":
        blocks.add("comment");
        break;
      case "mpf":
        blocks.add("extra");
        break;
      case "jfif":
        if (jfifThumbnail(b, s)) blocks.add("thumbnail");
        break;
      case "app":
        blocks.add(s.marker === 0xe0 && startsWith(b, JFXX_SIG, s.data) ? "thumbnail" : "app");
        break;
    }
  }
  if (b.length - layout.end > 16) blocks.add("extra");
  if (exif?.thumbnail) blocks.add("thumbnail");
  return { format: "jpg", exif, exifUnreadable, gps: exif?.gps ?? xmp ?? null, blocks: [...blocks] };
}

/**
 * Where the images listed in the primary image's MPF index (APP2 "MPF\0") start, those after the
 * primary only. Offsets count from the index's TIFF header. An unreadable index gives what was read.
 */
function mpfImageStarts(b: Uint8Array, primary: JpegLayout): number[] {
  const seg = primary.segments.find((s) => s.kind === "mpf");
  if (!seg) return [];
  const t = seg.data + 4;
  const starts: number[] = [];
  try {
    const dv = new DataView(b.buffer, b.byteOffset + t, seg.end - t);
    const order = dv.getUint16(0);
    if (order !== 0x4949 && order !== 0x4d4d) return [];
    const le = order === 0x4949;
    const ifd = dv.getUint32(4, le);
    const n = Math.min(dv.getUint16(ifd, le), 64);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (dv.getUint16(e, le) !== 0xb002) continue;
      const count = Math.min(Math.floor(dv.getUint32(e + 4, le) / 16), 64);
      const list = dv.getUint32(e + 8, le);
      for (let k = 0; k < count; k++) {
        const at = t + dv.getUint32(list + k * 16 + 8, le);
        if (at >= primary.end && at + 3 <= b.length && b[at] === 0xff && b[at + 1] === 0xd8 && b[at + 2] === 0xff) starts.push(at);
      }
    }
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
  }
  return starts;
}

const KEEP_ALL_MODE = new Set<SegmentKind>(["soi", "eoi", "scan", "core", "icc", "adobe"]);

/** JFIF APP0 payload: "JFIF\0", version (2), units (1), densities (4), thumbnail width and height (1 + 1), then RGB pixels. */
const JFIF_HEAD = 12;

/** The JFIF segment carries a thumbnail (or trailing bytes after its header). */
function jfifThumbnail(b: Uint8Array, s: Segment): boolean {
  const len = s.end - s.data;
  return len > JFIF_HEAD + 2 || (len === JFIF_HEAD + 2 && (b[s.data + JFIF_HEAD] !== 0 || b[s.data + JFIF_HEAD + 1] !== 0));
}

export function cleanJpeg(b: Uint8Array, mode: Mode): Cleaned {
  return mode === "all" ? cleanAll(b) : cleanGps(b);
}

/**
 * Keep JFIF (without its thumbnail), ICC, Adobe and the image itself; everything else goes,
 * including JFXX thumbnails and data after EOI.
 */
function cleanAll(b: Uint8Array): Cleaned {
  const { segments } = walkJpeg(b);
  const parts: Uint8Array[] = [];
  let keptOrientation: number | null = null;
  let exifSeen = false;
  for (const s of segments) {
    if (KEEP_ALL_MODE.has(s.kind)) {
      parts.push(b.subarray(s.start, s.end));
    } else if (s.kind === "jfif") {
      if (!jfifThumbnail(b, s) || s.end - s.data < JFIF_HEAD + 2) parts.push(b.subarray(s.start, s.end));
      // Same header, thumbnail size 0 x 0 and no pixels.
      else parts.push(concat([new Uint8Array([0xff, 0xe0, 0, JFIF_HEAD + 4]), b.subarray(s.data, s.data + JFIF_HEAD), new Uint8Array(2)]));
    } else if (s.kind === "exif" && !exifSeen) {
      exifSeen = true;
      // Keep only the rotation flag, where the old EXIF was, so the photo stays upright.
      try {
        const o = readExif(payload(b, s).subarray(6)).orientation;
        if (o !== 1) {
          parts.push(app1Exif(orientationOnlyExif(o)));
          keptOrientation = o;
        }
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
      }
    }
  }
  return { bytes: concat(parts), keptOrientation, droppedUnreadable: false, droppedXmp: false, droppedTrailer: false };
}

/** Extended XMP chunk: signature, GUID (32), full length (4), offset (4), then a slice of the packet. */
const XMP_EXT_HEAD = XMP_EXT_SIG.length + 32 + 4 + 4;

/**
 * Remove GPS only, in place: the GPS IFD is cut out of each EXIF block and location properties are
 * blanked in XMP, all without changing any length, so maker notes, multi-picture offsets and images
 * stored after EOI (HDR gain maps, depth maps) keep working. Those embedded images are cleaned the
 * same way. An EXIF block that cannot be parsed, or an XMP packet that cannot be cleaned with
 * certainty, is dropped whole. Anything after the last image (a motion photo's video, which can
 * carry its own location) is dropped too, with the XMP pointers to it.
 */
function cleanGps(b: Uint8Array): Cleaned {
  const out = b.slice();
  const drop: Segment[] = [];
  const done = new Set<number>();
  const images: JpegLayout[] = [];
  let droppedUnreadable = false;
  let droppedXmp = false;
  const cleanImage = (from: number): JpegLayout => {
    done.add(from);
    const layout = walkJpeg(out, from);
    for (const s of layout.segments) {
      if (s.kind !== "exif") continue;
      try {
        removeGpsInPlace(out.subarray(s.data + 6, s.end));
      } catch (err) {
        if (!(err instanceof TiffError)) throw err;
        drop.push(s);
        droppedUnreadable = true;
      }
    }
    images.push(layout);
    return layout;
  };

  const primary = cleanImage(0);
  // Images stored after the main one (Multi-Picture Format): clean each while they parse.
  let p = primary.end;
  for (let guard = 0; guard < 64 && p + 4 <= out.length; guard++) {
    const next = out.indexOf(0xff, p);
    if (next < 0 || out[next + 1] !== 0xd8 || out[next + 2] !== 0xff) break;
    try {
      p = cleanImage(next).end;
    } catch (err) {
      if (!(err instanceof JpegError)) throw err;
      break;
    }
  }
  // Then every image the MPF index points to, in case other data sits between the images.
  for (const at of mpfImageStarts(out, primary)) {
    if (done.has(at)) continue;
    try {
      cleanImage(at);
    } catch (err) {
      if (!(err instanceof JpegError)) throw err;
    }
  }

  // Data after the last image cannot be checked for a location, so it goes (a few bytes of padding
  // are not worth a mention).
  const imageEnd = Math.max(...images.map((l) => l.end));
  const trailing = imageEnd < out.length;
  const droppedTrailer = out.length - imageEnd > 16;

  for (const layout of images) {
    const ext = new Map<string, Segment[]>();
    for (const s of layout.segments) {
      if (s.kind === "xmp") {
        if (blankXmpGps(out.subarray(s.data, s.end), trailing) === "unsafe") {
          drop.push(s);
          droppedXmp = true;
        }
      } else if (s.kind === "xmpExt") {
        const guid = s.end - s.data >= XMP_EXT_HEAD ? latin1(out.subarray(s.data + XMP_EXT_SIG.length, s.data + XMP_EXT_SIG.length + 32)) : "";
        ext.set(guid, [...(ext.get(guid) ?? []), s]);
      }
    }
    // Extended XMP is one packet split over several segments, so a property can straddle two of
    // them: check the joined packet, and keep or drop all its segments together.
    for (const [guid, segs] of ext) {
      const offset = (s: Segment) => new DataView(out.buffer, out.byteOffset + s.data + XMP_EXT_HEAD - 4, 4).getUint32(0);
      const joined = guid ? concat(segs.sort((x, y) => offset(x) - offset(y)).map((s) => out.subarray(s.data + XMP_EXT_HEAD, s.end))) : null;
      if (!joined || blankXmpGps(joined, trailing) !== "unchanged") {
        drop.push(...segs);
        droppedXmp = true;
      }
    }
  }

  if (drop.length === 0 && !trailing) return { bytes: out, keptOrientation: null, droppedUnreadable, droppedXmp, droppedTrailer };
  const parts: Uint8Array[] = [];
  let at = 0;
  for (const s of drop.sort((x, y) => x.start - y.start)) {
    if (s.start < at) continue; // an index pointing into an image already cut: skip the overlap
    parts.push(out.subarray(at, s.start));
    at = s.end;
  }
  parts.push(out.subarray(at, imageEnd));
  return { bytes: concat(parts), keptOrientation: null, droppedUnreadable, droppedXmp, droppedTrailer };
}
