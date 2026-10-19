/**
 * Test fixtures for the EXIF remover: inject known metadata into the plain sample images from
 * e2e/fixtures/image/. Used by the unit tests, and once (by hand, with Node's TypeScript support) to
 * write e2e/fixtures/image/exif-gps.{jpg,png,webp}. Self-contained on purpose: no imports.
 */

type Val = { tag: number; type: 2 | 3 | 4 | 5; value: string | number[] };

export interface FixtureMeta {
  littleEndian?: boolean;
  make?: string;
  model?: string;
  software?: string;
  date?: string;
  orientation?: number;
  /** [deg, min, sec] with N/S and E/W. */
  gps?: { lat: [number, number, number]; latRef: "N" | "S"; lon: [number, number, number]; lonRef: "E" | "W" };
  /** Add an XMP packet (with GPS when `gps` is set). */
  xmp?: boolean;
  /** Add an ICC profile block (fake bytes; fine for byte tests, not for display). */
  icc?: boolean;
  /** JPEG: COM + APP13; PNG: tEXt + tIME. */
  extras?: boolean;
}

export const DEFAULT_META: FixtureMeta = {
  make: "Google",
  model: "Pixel 7",
  software: "HDR+ 1.0.540104767zd",
  date: "2024:07:14 18:32:05",
  orientation: 6,
  gps: { lat: [38, 28, 2.64], latRef: "N", lon: [14, 57, 13], lonRef: "E" },
  xmp: true,
  extras: true,
};

const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

function valueBytes(v: Val, le: boolean): number[] {
  const out: number[] = [];
  const u16 = (n: number) => (le ? out.push(n & 0xff, n >> 8) : out.push(n >> 8, n & 0xff));
  const u32 = (n: number) =>
    le ? out.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24) : out.push(n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  if (v.type === 2) out.push(...enc(v.value as string), 0);
  else if (v.type === 3) for (const n of v.value as number[]) u16(n);
  else if (v.type === 4) for (const n of v.value as number[]) u32(n);
  else for (const n of v.value as number[]) u32(n);
  return out;
}

const count = (v: Val) => (v.type === 2 ? (v.value as string).length + 1 : v.type === 5 ? (v.value as number[]).length / 2 : (v.value as number[]).length);

/** Write a TIFF with IFD0 plus optional Exif and GPS IFDs (pointers added automatically). */
export function writeTiff(le: boolean, ifd0In: Val[], exif?: Val[], gps?: Val[]): Uint8Array {
  const ifd0 = [...ifd0In];
  if (exif) ifd0.push({ tag: 0x8769, type: 4, value: [0] });
  if (gps) ifd0.push({ tag: 0x8825, type: 4, value: [0] });
  const lists = [ifd0, ...(exif ? [exif] : []), ...(gps ? [gps] : [])].map((l) => [...l].sort((a, b) => a.tag - b.tag));
  let off = 8;
  const at = lists.map((l) => {
    const o = off;
    off += 2 + l.length * 12 + 4;
    return o;
  });
  const pointer = (tag: number) => (tag === 0x8769 ? at[1]! : at[exif ? 2 : 1]!);
  const bytes: number[] = le ? [0x49, 0x49, 42, 0, 8, 0, 0, 0] : [0x4d, 0x4d, 0, 42, 0, 0, 0, 8];
  const data: number[] = [];
  const u16 = (n: number) => (le ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) => (le ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24] : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
  for (const list of lists) {
    bytes.push(...u16(list.length));
    for (const raw of list) {
      const v = raw.tag === 0x8769 || raw.tag === 0x8825 ? { ...raw, value: [pointer(raw.tag)] } : raw;
      const vb = valueBytes(v, le);
      bytes.push(...u16(v.tag), ...u16(v.type), ...u32(count(v)));
      if (vb.length <= 4) bytes.push(...vb, ...new Array(4 - vb.length).fill(0));
      else {
        bytes.push(...u32(off + data.length));
        data.push(...vb);
        if (data.length & 1) data.push(0);
      }
    }
    bytes.push(0, 0, 0, 0);
  }
  return new Uint8Array([...bytes, ...data]);
}

const rational = (parts: [number, number, number]) => parts.flatMap((p) => [Math.round(p * 100), 100]);

export function exifTiff(meta: FixtureMeta = DEFAULT_META): Uint8Array {
  const ifd0: Val[] = [];
  if (meta.make) ifd0.push({ tag: 0x010f, type: 2, value: meta.make });
  if (meta.model) ifd0.push({ tag: 0x0110, type: 2, value: meta.model });
  if (meta.orientation) ifd0.push({ tag: 0x0112, type: 3, value: [meta.orientation] });
  if (meta.software) ifd0.push({ tag: 0x0131, type: 2, value: meta.software });
  if (meta.date) ifd0.push({ tag: 0x0132, type: 2, value: meta.date });
  const exif: Val[] = [
    { tag: 0x829a, type: 5, value: [1, 120] },
    { tag: 0x829d, type: 5, value: [18, 10] },
    { tag: 0x8827, type: 3, value: [100] },
  ];
  if (meta.date) exif.push({ tag: 0x9003, type: 2, value: meta.date });
  const gps: Val[] | undefined = meta.gps
    ? [
        { tag: 0x0000, type: 4, value: [0x02020000] },
        { tag: 0x0001, type: 2, value: meta.gps.latRef },
        { tag: 0x0002, type: 5, value: rational(meta.gps.lat) },
        { tag: 0x0003, type: 2, value: meta.gps.lonRef },
        { tag: 0x0004, type: 5, value: rational(meta.gps.lon) },
      ]
    : undefined;
  return writeTiff(meta.littleEndian ?? false, ifd0, exif, gps);
}

export function xmpPacket(meta: FixtureMeta = DEFAULT_META): string {
  const gps = meta.gps
    ? ` exif:GPSLatitude="${meta.gps.lat[0]},${(meta.gps.lat[1] + meta.gps.lat[2] / 60).toFixed(4)}${meta.gps.latRef}"\n` +
      `   exif:GPSLongitude="${meta.gps.lon[0]},${(meta.gps.lon[1] + meta.gps.lon[2] / 60).toFixed(4)}${meta.gps.lonRef}"`
    : "";
  return (
    `<?xpacket begin="\xEF\xBB\xBF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about="" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n` +
    `   xmp:CreatorTool="Fixture Editor 1.0"${gps}>\n` +
    `   <exif:GPSAltitude>12/1</exif:GPSAltitude>\n` +
    `  </rdf:Description>\n</rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`
  );
}

/** Stand-in ICC profile body (not a valid profile). */
export const FAKE_ICC = new Uint8Array(Array.from({ length: 132 }, (_, i) => (i * 7 + 3) & 0xff));

function segment(marker: number, payload: number[] | Uint8Array): Uint8Array {
  const len = payload.length + 2;
  return new Uint8Array([0xff, marker, len >> 8, len & 0xff, ...payload]);
}

function cat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** The sample JPEG with EXIF (+ XMP, ICC, COM, APP13) inserted after its APP0. */
export function jpegWithMetadata(base: Uint8Array, meta: FixtureMeta = DEFAULT_META): Uint8Array {
  let at = 2;
  if (base[2] === 0xff && base[3] === 0xe0) at = 4 + ((base[4]! << 8) | base[5]!);
  const segs: Uint8Array[] = [segment(0xe1, [...enc("Exif\0\0"), ...exifTiff(meta)])];
  if (meta.xmp) segs.push(segment(0xe1, [...enc("http://ns.adobe.com/xap/1.0/\0"), ...enc(xmpPacket(meta))]));
  if (meta.icc) segs.push(segment(0xe2, [...enc("ICC_PROFILE\0"), 1, 1, ...FAKE_ICC]));
  if (meta.extras) {
    segs.push(segment(0xed, [...enc("Photoshop 3.0\0"), ...enc("8BIM"), 0x04, 0x04, 0, 0, 0, 0, 0, 0]));
    segs.push(segment(0xfe, enc("Taken at home")));
  }
  return cat([base.subarray(0, at), ...segs, base.subarray(at)]);
}

/**
 * A multi-picture JPEG like a phone's HDR photo: `primary` with an MPF index (APP2) inserted after its
 * APP0, then `gap` (bytes some phones store between the images), then `secondary` (say, a gain map),
 * which the index points to.
 */
export function jpegWithMpf(primary: Uint8Array, secondary: Uint8Array, gap: Uint8Array = new Uint8Array()): Uint8Array {
  let at = 2;
  if (primary[2] === 0xff && primary[3] === 0xe0) at = 4 + ((primary[4]! << 8) | primary[5]!);
  // Big-endian TIFF: header, IFD (version, image count, MP entry pointer), then two 16-byte entries.
  const tiff = new Uint8Array(8 + 2 + 3 * 12 + 4 + 32);
  const dv = new DataView(tiff.buffer);
  tiff.set(enc("MM\0*"));
  dv.setUint32(4, 8);
  dv.setUint16(8, 3);
  const entry = (i: number, tag: number, type: number, n: number, value: number) => {
    const e = 10 + i * 12;
    dv.setUint16(e, tag);
    dv.setUint16(e + 2, type);
    dv.setUint32(e + 4, n);
    dv.setUint32(e + 8, value);
  };
  entry(0, 0xb000, 7, 4, 0x30313030); // "0100"
  entry(1, 0xb001, 4, 1, 2);
  entry(2, 0xb002, 7, 32, 50);
  const seg = segment(0xe2, [...enc("MPF\0"), ...tiff]);
  const head = cat([primary.subarray(0, at), seg, primary.subarray(at)]);
  const tiffStart = at + 4 + 4;
  const out = cat([head, gap, secondary]);
  const mp = new DataView(out.buffer, tiffStart + 50, 32);
  mp.setUint32(0, 0x030000); // baseline primary image
  mp.setUint32(4, head.length);
  mp.setUint32(8, 0);
  mp.setUint32(20, secondary.length);
  mp.setUint32(24, head.length + gap.length - tiffStart);
  return out;
}

let crcTable: number[] | undefined;
function crc(b: Uint8Array): number {
  crcTable ??= Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, body: number[] | Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, body.length);
  out.set(enc(type), 4);
  out.set(body, 8);
  dv.setUint32(8 + body.length, crc(out.subarray(4, 8 + body.length)));
  return out;
}

/** The sample PNG with eXIf (+ iTXt XMP, tEXt, tIME, iCCP) inserted after IHDR. */
export function pngWithMetadata(base: Uint8Array, meta: FixtureMeta = DEFAULT_META): Uint8Array {
  const ihdrEnd = 8 + 12 + new DataView(base.buffer, base.byteOffset).getUint32(8);
  const chunks: Uint8Array[] = [];
  if (meta.icc) chunks.push(pngChunk("iCCP", [...enc("fake\0"), 0, ...FAKE_ICC]));
  chunks.push(pngChunk("eXIf", exifTiff(meta)));
  if (meta.xmp) chunks.push(pngChunk("iTXt", [...enc("XML:com.adobe.xmp\0"), 0, 0, 0, 0, ...enc(xmpPacket(meta))]));
  if (meta.extras) {
    chunks.push(pngChunk("tEXt", enc("Comment\0Taken at home")));
    chunks.push(pngChunk("tIME", [0x07, 0xe8, 7, 14, 18, 32, 5]));
  }
  return cat([base.subarray(0, ihdrEnd), ...chunks, base.subarray(ihdrEnd)]);
}

function riff(fourcc: string, body: number[] | Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + body.length + (body.length & 1));
  out.set(enc(fourcc));
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
}

/** The sample WebP (which has a VP8X header) with EXIF and XMP chunks (+ ICCP), flags and size fixed. */
export function webpWithMetadata(base: Uint8Array, meta: FixtureMeta = DEFAULT_META): Uint8Array {
  const vp8xEnd = 12 + 8 + 10;
  const head = base.slice(0, vp8xEnd);
  head[20] = head[20]! | 0x08 | (meta.xmp ? 0x04 : 0) | (meta.icc ? 0x20 : 0);
  const parts: Uint8Array[] = [head];
  if (meta.icc) parts.push(riff("ICCP", FAKE_ICC));
  parts.push(base.subarray(vp8xEnd), riff("EXIF", exifTiff(meta)));
  if (meta.xmp) parts.push(riff("XMP ", enc(xmpPacket(meta))));
  const out = cat(parts);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return out;
}
