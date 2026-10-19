/**
 * EXIF (TIFF structure) reader, in-place GPS remover and orientation-only writer. Pure byte work,
 * shared by the JPEG, PNG and WebP modules. Nothing in the file is trusted: every offset and count is
 * bounds-checked, and a broken header or first IFD throws TiffError (callers turn it into "could not
 * read"). Sub-IFDs (Exif, GPS, thumbnail) are read best-effort.
 */

export class TiffError extends Error {
  constructor(message = "malformed TIFF") {
    super(message);
    this.name = "TiffError";
  }
}

export interface Coords {
  lat: number;
  lon: number;
}

export interface ExifInfo {
  /** Coordinates; "unreadable" when latitude/longitude tags exist but cannot be decoded. */
  gps: Coords | "unreadable" | null;
  /** A GPS IFD is present (with or without coordinates). */
  hasGpsBlock: boolean;
  make?: string;
  model?: string;
  /** Raw EXIF date "YYYY:MM:DD HH:MM:SS" (DateTimeOriginal, else DateTimeDigitized, else DateTime). */
  date?: string;
  software?: string;
  /** 1 to 8; 1 when absent or invalid. */
  orientation: number;
  /** Tags not reported above (orientation, pointers and GPS tags excluded). */
  otherTags: number;
  /** IFD1 carries a small preview image. */
  thumbnail: boolean;
}

const TAG = {
  make: 0x010f,
  model: 0x0110,
  orientation: 0x0112,
  software: 0x0131,
  dateTime: 0x0132,
  exifIfd: 0x8769,
  gpsIfd: 0x8825,
  interopIfd: 0xa005,
  dateOriginal: 0x9003,
  dateDigitized: 0x9004,
  thumbOffset: 0x0201,
} as const;

const POINTERS = new Set<number>([TAG.exifIfd, TAG.gpsIfd, TAG.interopIfd]);

/** Bytes per value for TIFF field types 1 to 13 (0 = unknown type). */
const TYPE_SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];
/** No real file has more entries in one IFD; a larger count means garbage. */
const MAX_ENTRIES = 1000;

interface Entry {
  tag: number;
  type: number;
  count: number;
  /** Offset of the 12-byte entry. */
  at: number;
  /** Offset of the value, or -1 when the type is unknown or the value lies outside the data. */
  valueAt: number;
  byteLen: number;
}

interface Ifd {
  offset: number;
  entries: Entry[];
  /** End of the entry table (where the next-IFD offset sits). */
  end: number;
  next: number;
}

class Reader {
  readonly dv: DataView;
  readonly le: boolean;
  readonly ifd0: number;

  constructor(readonly b: Uint8Array) {
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (b.length < 8) throw new TiffError("too short");
    if (b[0] === 0x49 && b[1] === 0x49) this.le = true;
    else if (b[0] === 0x4d && b[1] === 0x4d) this.le = false;
    else throw new TiffError("bad byte order");
    if (this.u16(2) !== 42) throw new TiffError("bad magic");
    this.ifd0 = this.u32(4);
  }

  u16(o: number): number {
    if (!(o >= 0 && o + 2 <= this.b.length)) throw new TiffError("out of bounds");
    return this.dv.getUint16(o, this.le);
  }

  u32(o: number): number {
    if (!(o >= 0 && o + 4 <= this.b.length)) throw new TiffError("out of bounds");
    return this.dv.getUint32(o, this.le);
  }

  ifd(offset: number): Ifd {
    const n = this.b.length;
    if (!(offset >= 8 && offset + 2 <= n)) throw new TiffError("IFD out of bounds");
    const count = this.u16(offset);
    if (count > MAX_ENTRIES) throw new TiffError("too many entries");
    const end = offset + 2 + count * 12;
    if (end > n) throw new TiffError("IFD truncated");
    const entries: Entry[] = [];
    for (let i = 0; i < count; i++) {
      const at = offset + 2 + i * 12;
      const tag = this.u16(at);
      const type = this.u16(at + 2);
      const cnt = this.u32(at + 4);
      const size = TYPE_SIZE[type] ?? 0;
      const byteLen = size * cnt;
      let valueAt = -1;
      if (size > 0 && byteLen <= n) {
        if (byteLen <= 4) valueAt = at + 8;
        else {
          const p = this.u32(at + 8);
          if (p >= 8 && p + byteLen <= n) valueAt = p;
        }
      }
      entries.push({ tag, type, count: cnt, at, valueAt, byteLen });
    }
    // Some writers end the data right after the table; treat a missing next pointer as "none".
    const next = end + 4 <= n ? this.u32(end) : 0;
    return { offset, entries, end, next };
  }

  text(e: Entry | undefined): string | undefined {
    if (!e || e.valueAt < 0 || (e.type !== 2 && e.type !== 1 && e.type !== 7)) return undefined;
    let bytes = this.b.subarray(e.valueAt, e.valueAt + Math.min(e.byteLen, 256));
    const nul = bytes.indexOf(0);
    if (nul >= 0) bytes = bytes.subarray(0, nul);
    const s = new TextDecoder("utf-8").decode(bytes).replace(/[\u0000-\u001f\u007f�]/g, " ").replace(/\s+/g, " ").trim();
    return s ? s.slice(0, 80) : undefined;
  }

  short(e: Entry | undefined): number | undefined {
    if (!e || e.valueAt < 0 || e.count < 1) return undefined;
    if (e.type === 3) return this.u16(e.valueAt);
    if (e.type === 4) return this.u32(e.valueAt);
    return undefined;
  }

  pointer(e: Entry | undefined): number | undefined {
    if (!e || e.count !== 1 || (e.type !== 4 && e.type !== 13)) return undefined;
    return this.u32(e.at + 8);
  }

  rationals(e: Entry | undefined): number[] | undefined {
    if (!e || e.valueAt < 0 || e.type !== 5 || e.count < 1) return undefined;
    const out: number[] = [];
    for (let i = 0; i < Math.min(e.count, 3); i++) {
      const num = this.u32(e.valueAt + i * 8);
      const den = this.u32(e.valueAt + i * 8 + 4);
      if (den === 0) return undefined;
      out.push(num / den);
    }
    return out;
  }
}

const find = (ifd: Ifd | undefined, tag: number) => ifd?.entries.find((e) => e.tag === tag);

/** Read the IFD at `offset` unless it is missing, already seen or broken. */
function tryIfd(r: Reader, offset: number | undefined, seen: Set<number>): Ifd | undefined {
  if (!offset || seen.has(offset)) return undefined;
  seen.add(offset);
  try {
    return r.ifd(offset);
  } catch {
    return undefined;
  }
}

function coordinate(r: Reader, value: Entry | undefined, ref: Entry | undefined, max: number): number | null {
  const parts = r.rationals(value);
  if (!parts) return null;
  const [d = 0, m = 0, s = 0] = parts;
  let v = d + m / 60 + s / 3600;
  const dir = r.text(ref)?.charAt(0).toUpperCase();
  if (dir === "S" || dir === "W") v = -v;
  return Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

/** Parse an EXIF TIFF block. Throws TiffError when the header or IFD0 is broken. */
export function readExif(b: Uint8Array): ExifInfo {
  const r = new Reader(b);
  const seen = new Set<number>([r.ifd0]);
  const ifd0 = r.ifd(r.ifd0);
  const exif = tryIfd(r, r.pointer(find(ifd0, TAG.exifIfd)), seen);
  const gpsPtr = r.pointer(find(ifd0, TAG.gpsIfd));
  const gps = tryIfd(r, gpsPtr, seen);
  const interop = tryIfd(r, r.pointer(find(exif, TAG.interopIfd)), seen);
  const ifd1 = tryIfd(r, ifd0.next, seen);

  const counted = new Set<Entry>();
  const take = (e: Entry | undefined) => {
    if (e) counted.add(e);
    return e;
  };
  const read = (fn: () => string | undefined) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };

  const make = read(() => r.text(take(find(ifd0, TAG.make))));
  const model = read(() => r.text(take(find(ifd0, TAG.model))));
  const software = read(() => r.text(take(find(ifd0, TAG.software))));
  const dates = [find(exif, TAG.dateOriginal), find(exif, TAG.dateDigitized), find(ifd0, TAG.dateTime)].map(take);
  const date = dates.map((e) => read(() => r.text(e))).find((d) => d && /^\d{4}:\d{2}:\d{2}/.test(d));
  const o = read(() => String(r.short(take(find(ifd0, TAG.orientation))) ?? ""));
  const orientation = o && Number(o) >= 1 && Number(o) <= 8 ? Number(o) : 1;

  let coords: ExifInfo["gps"] = null;
  if (gps) {
    for (const e of gps.entries) counted.add(e);
    const hasLatLon = !!find(gps, 2) || !!find(gps, 4);
    if (hasLatLon) {
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        lat = coordinate(r, find(gps, 2), find(gps, 1), 90);
        lon = coordinate(r, find(gps, 4), find(gps, 3), 180);
      } catch {
        // Out-of-bounds values: reported as unreadable below.
      }
      coords = lat !== null && lon !== null ? { lat, lon } : "unreadable";
    }
  }

  let otherTags = 0;
  for (const ifd of [ifd0, exif, interop, ifd1]) {
    for (const e of ifd?.entries ?? []) if (!counted.has(e) && !POINTERS.has(e.tag)) otherTags++;
  }

  return {
    gps: coords,
    hasGpsBlock: gpsPtr !== undefined,
    make,
    model,
    date,
    software,
    orientation,
    otherTags,
    thumbnail: !!find(ifd1, TAG.thumbOffset),
  };
}

/**
 * Remove the GPS IFD in place, without changing the length of the block (so every other offset in
 * the file stays valid): the GPS pointer entry leaves IFD0 and the GPS IFD and its values are zeroed.
 * Returns false when there was no GPS pointer. Throws TiffError when the header or IFD0 is broken.
 */
export function removeGpsInPlace(b: Uint8Array): boolean {
  const r = new Reader(b);
  const ifd0 = r.ifd(r.ifd0);
  const index = ifd0.entries.findIndex((e) => e.tag === TAG.gpsIfd);
  if (index < 0) return false;
  const entry = ifd0.entries[index]!;

  // Never zero the header or IFD0's own table (a hostile pointer could aim at them).
  const tableEnd = Math.min(ifd0.end + 4, b.length);
  const zero = (from: number, to: number) => {
    if (from < 8 || to > b.length || from >= to) return;
    if (from < tableEnd && to > r.ifd0) return;
    b.fill(0, from, to);
  };
  try {
    const gps = r.ifd(r.u32(entry.at + 8));
    for (const e of gps.entries) if (e.valueAt >= 0 && e.byteLen > 4) zero(e.valueAt, e.valueAt + e.byteLen);
    zero(gps.offset, Math.min(gps.end + 4, b.length));
  } catch {
    // Unreadable GPS IFD: dropping the pointer below still hides it from every reader.
  }

  // Shift the later entries (and the next-IFD offset) up by one slot, then shorten the count.
  b.copyWithin(entry.at, entry.at + 12, tableEnd);
  b.fill(0, tableEnd - 12, tableEnd);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  dv.setUint16(r.ifd0, ifd0.entries.length - 1, r.le);
  return true;
}

/** A minimal big-endian EXIF TIFF holding only the Orientation tag (26 bytes). */
export function orientationOnlyExif(orientation: number): Uint8Array {
  const out = new Uint8Array(26);
  const dv = new DataView(out.buffer);
  out.set([0x4d, 0x4d, 0x00, 0x2a]);
  dv.setUint32(4, 8);
  dv.setUint16(8, 1);
  dv.setUint16(10, TAG.orientation);
  dv.setUint16(12, 3);
  dv.setUint32(14, 1);
  dv.setUint16(18, orientation);
  dv.setUint32(22, 0);
  return out;
}

/** "Exif\0\0" in front of the TIFF header (JPEG APP1 always, WebP and PNG sometimes). */
export const EXIF_HEADER = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

/** Offset of the TIFF header inside an EXIF payload: skips an "Exif\0\0" prefix when there is one. */
export function tiffStart(payload: Uint8Array): number {
  return startsWith(payload, [0x45, 0x78, 0x69, 0x66, 0x00]) && payload.length >= 6 ? 6 : 0;
}

export function startsWith(b: Uint8Array, prefix: ArrayLike<number>, at = 0): boolean {
  if (at < 0 || at + prefix.length > b.length) return false;
  for (let i = 0; i < prefix.length; i++) if (b[at + i] !== prefix[i]) return false;
  return true;
}

export const ascii = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0));

/** Join byte arrays. */
export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
