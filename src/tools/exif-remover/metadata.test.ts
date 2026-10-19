import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, cameraName, detect, hasMetadata, parseExifDate, roundCoord } from "./metadata";
import { inspectJpeg, cleanJpeg, walkJpeg } from "./jpeg";
import { cleanPng, crc32, inspectPng, walkPng } from "./png";
import { cleanWebp, inspectWebp, walkWebp, FLAG_EXIF, FLAG_XMP } from "./webp";
import { readExif, removeGpsInPlace, orientationOnlyExif } from "./tiff";
import { parseXmpCoordinate, xmpGps } from "./xmp";
import { DEFAULT_META, exifTiff, jpegWithMetadata, jpegWithMpf, pngWithMetadata, webpWithMetadata } from "./test-fixtures";
import type { Report } from "./types";

const FIXTURES = path.resolve(__dirname, "../../../e2e/fixtures/image");
const sample = (name: string) => new Uint8Array(fs.readFileSync(path.join(FIXTURES, name)));
const JPG = sample("sample.jpg");
const PNG = sample("sample.png");
const WEBP = sample("sample.webp");

const LAT = 38 + 28 / 60 + 2.64 / 3600;
const LON = 14 + 57 / 60 + 13 / 3600;

const has = (b: Uint8Array, s: string) => Buffer.from(b).includes(Buffer.from(s, "latin1"));

function expectCoords(gps: Report["gps"]) {
  expect(gps).not.toBeNull();
  expect(gps).not.toBe("unreadable");
  const c = gps as { lat: number; lon: number };
  expect(c.lat).toBeCloseTo(LAT, 4);
  expect(c.lon).toBeCloseTo(LON, 4);
}

/** JPEG image data: from the first SOS marker to the end of EOI. */
function scanSpan(b: Uint8Array): Uint8Array {
  const { segments } = walkJpeg(b);
  const sos = segments.find((s) => s.kind === "scan")!;
  const eoi = segments.find((s) => s.kind === "eoi")!;
  return b.subarray(sos.start, eoi.end);
}

const pngChunks = (b: Uint8Array, type: string) => walkPng(b).chunks.filter((c) => c.type === type).map((c) => b.subarray(c.start, c.end));
const webpChunks = (b: Uint8Array, fourcc: string) => walkWebp(b).filter((c) => c.fourcc === fourcc).map((c) => b.subarray(c.start, c.end));

describe("EXIF reader", () => {
  it.each([false, true])("reads GPS, camera, date, software and orientation (little endian: %s)", (littleEndian) => {
    const info = readExif(exifTiff({ ...DEFAULT_META, littleEndian }));
    expectCoords(info.gps);
    expect(info).toMatchObject({
      hasGpsBlock: true,
      make: "Google",
      model: "Pixel 7",
      software: "HDR+ 1.0.540104767zd",
      date: "2024:07:14 18:32:05",
      orientation: 6,
      thumbnail: false,
    });
    // Exposure time, f-number, ISO.
    expect(info.otherTags).toBe(3);
  });

  it("reads southern and western coordinates as negative", () => {
    const info = readExif(exifTiff({ ...DEFAULT_META, gps: { lat: [33, 52, 0], latRef: "S", lon: [151, 12, 0], lonRef: "W" } }));
    expect(info.gps).toMatchObject({ lat: expect.closeTo(-33.8667, 3), lon: expect.closeTo(-151.2, 3) });
  });

  it("removes the GPS IFD in place and keeps every other tag", () => {
    const tiff = exifTiff();
    const copy = tiff.slice();
    expect(removeGpsInPlace(copy)).toBe(true);
    expect(copy.length).toBe(tiff.length);
    const info = readExif(copy);
    expect(info.gps).toBeNull();
    expect(info.hasGpsBlock).toBe(false);
    expect(info).toMatchObject({ make: "Google", model: "Pixel 7", orientation: 6, date: "2024:07:14 18:32:05" });
    expect(info.otherTags).toBe(3);
    expect(removeGpsInPlace(copy)).toBe(false);
  });

  it("writes an orientation-only block", () => {
    const info = readExif(orientationOnlyExif(8));
    expect(info).toMatchObject({ orientation: 8, otherTags: 0, gps: null, hasGpsBlock: false });
    expect(info.make).toBeUndefined();
  });

  it("parses XMP coordinates", () => {
    expect(parseXmpCoordinate("38,28.044N", 90)).toBeCloseTo(38.4674, 4);
    expect(parseXmpCoordinate("14,57,13E", 180)).toBeCloseTo(LON, 4);
    expect(parseXmpCoordinate("33,52.0S", 90)).toBeCloseTo(-33.8667, 3);
    expect(parseXmpCoordinate("nonsense", 90)).toBeNull();
    expect(parseXmpCoordinate("95,0.0N", 90)).toBeNull();
    expect(xmpGps(new TextEncoder().encode('<x exif:GPSLatitude="oops"/>'))).toBe("unreadable");
  });
});

describe("JPEG", () => {
  const file = jpegWithMetadata(JPG, { ...DEFAULT_META, icc: true });
  const iccSegment = walkJpeg(file).segments.find((s) => s.kind === "icc")!;
  const icc = file.slice(iccSegment.start, iccSegment.end);

  it("reports what the photo reveals", () => {
    const r = inspectJpeg(file);
    expectCoords(r.gps);
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7", orientation: 6 });
    expect(r.blocks).toEqual(expect.arrayContaining(["xmp", "iptc", "comment"]));
    expect(hasMetadata(r)).toBe(true);
  });

  it("finds GPS in XMP when the EXIF block has none", () => {
    const b = jpegWithMetadata(JPG);
    const exif = walkJpeg(b).segments.find((s) => s.kind === "exif")!;
    removeGpsInPlace(b.subarray(exif.data + 6, exif.end));
    expect(inspectJpeg(b).exif?.gps).toBeNull();
    expectCoords(inspectJpeg(b).gps);
    expect(inspectJpeg(jpegWithMetadata(JPG, { ...DEFAULT_META, gps: undefined })).gps).toBeNull();
  });

  it("removes everything but the image, ICC and the orientation", () => {
    const { bytes, keptOrientation } = cleanJpeg(file, "all");
    expect(keptOrientation).toBe(6);
    for (const s of ["http://ns.adobe.com/xap", "Photoshop 3.0", "Taken at home", "Pixel 7", "Google", "HDR+"]) {
      expect(has(bytes, s), s).toBe(false);
    }
    const kinds = walkJpeg(bytes).segments.map((s) => s.kind);
    expect(kinds.filter((k) => k === "exif")).toHaveLength(1);
    expect(kinds).not.toContain("xmp");
    expect(kinds).not.toContain("iptc");
    expect(kinds).not.toContain("comment");
    const r = inspectJpeg(bytes);
    expect(r.gps).toBeNull();
    expect(r.exif).toMatchObject({ orientation: 6, otherTags: 0, hasGpsBlock: false });
    expect(r.exif!.make).toBeUndefined();
    expect(r.blocks).toEqual([]);
    expect(Buffer.from(scanSpan(bytes)).equals(Buffer.from(scanSpan(file)))).toBe(true);
    expect(has(bytes, Buffer.from(icc).toString("latin1"))).toBe(true);
    // APP0 JFIF still first.
    expect(walkJpeg(bytes).segments[1]!.kind).toBe("jfif");
  });

  it("writes no EXIF at all when the photo is already upright", () => {
    const { bytes, keptOrientation } = cleanJpeg(jpegWithMetadata(JPG, { ...DEFAULT_META, orientation: 1 }), "all");
    expect(keptOrientation).toBeNull();
    expect(walkJpeg(bytes).segments.some((s) => s.kind === "exif")).toBe(false);
    expect(hasMetadata(inspectJpeg(bytes))).toBe(false);
  });

  it("removes only the location in GPS mode, keeping camera, date and length", () => {
    const { bytes, droppedUnreadable } = cleanJpeg(file, "gps");
    expect(droppedUnreadable).toBe(false);
    expect(bytes.length).toBe(file.length);
    const r = inspectJpeg(bytes);
    expect(r.gps).toBeNull();
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7", orientation: 6, hasGpsBlock: false, date: "2024:07:14 18:32:05" });
    expect(r.blocks).toEqual(expect.arrayContaining(["xmp", "iptc", "comment"]));
    expect(has(bytes, "GPSLatitude")).toBe(false);
    expect(has(bytes, "Fixture Editor")).toBe(true);
    expect(Buffer.from(scanSpan(bytes)).equals(Buffer.from(scanSpan(file)))).toBe(true);
  });

  it("cleans images stored after EOI in GPS mode, and drops them in full mode", () => {
    const withTrailer = new Uint8Array([...file, ...jpegWithMetadata(JPG)]);
    expect(inspectJpeg(withTrailer).blocks).toContain("extra");
    const gps = cleanJpeg(withTrailer, "gps").bytes;
    expect(gps.length).toBe(withTrailer.length);
    const second = gps.subarray(file.length);
    expect(inspectJpeg(second).gps).toBeNull();
    expect(inspectJpeg(second).exif?.model).toBe("Pixel 7");
    const all = cleanJpeg(withTrailer, "all").bytes;
    expect(walkJpeg(all).end).toBe(all.length);
  });

  describe("multi-picture photo (HDR gain map, MPO)", () => {
    // The secondary image carries its own EXIF with GPS and its own XMP, as a gain map or the second
    // view of a 3D photo can.
    const secondary = jpegWithMetadata(JPG, { ...DEFAULT_META, extras: false });
    const primary = jpegWithMetadata(JPG, { ...DEFAULT_META, extras: false, xmp: false });
    const imageAt = (b: Uint8Array) => b.length - secondary.length;

    it("drops the secondary images and the MPF index in full mode, leaving a plain photo", () => {
      const file = jpegWithMpf(primary, secondary);
      expect(inspectJpeg(file).blocks).toContain("extra");
      const { bytes } = cleanJpeg(file, "all");
      const kinds = walkJpeg(bytes).segments.map((s) => s.kind);
      expect(kinds).not.toContain("mpf");
      expect(kinds).not.toContain("xmp");
      expect(walkJpeg(bytes).end).toBe(bytes.length);
      // Only the orientation-only EXIF block is left (the primary is rotated).
      expect(inspectJpeg(bytes).exif).toMatchObject({ orientation: 6, otherTags: 0, hasGpsBlock: false });
      for (const s of ["MPF\0", "GPS", "Pixel 7", "Google", "2024:07:14", "http://ns.adobe.com/xap"]) {
        expect(has(bytes, s), s).toBe(false);
      }
      expect(Buffer.from(scanSpan(bytes)).equals(Buffer.from(scanSpan(file)))).toBe(true);
    });

    it("removes GPS from every image the MPF index lists in GPS mode, even with other data between them", () => {
      // A vendor trailer between the images (with 0xFF bytes, so the next image is not found by just
      // reading on after EOI).
      const gap = new Uint8Array([...Buffer.from("VENDOR", "latin1"), 0xff, 0x00, 0xff, 0xe1, 0x12, 0x34, 0, 0]);
      const file = jpegWithMpf(primary, secondary, gap);
      expect(inspectJpeg(file.subarray(imageAt(file))).gps).not.toBeNull();
      const { bytes } = cleanJpeg(file, "gps");
      expect(bytes.length).toBe(file.length);
      expect(has(bytes, "GPSLatitude")).toBe(false);
      const second = inspectJpeg(bytes.subarray(imageAt(bytes)));
      expect(second.gps).toBeNull();
      expect(second.exif).toMatchObject({ model: "Pixel 7", hasGpsBlock: false });
      expect(inspectJpeg(bytes).gps).toBeNull();
      // Everything else, the MPF index and the gap included, is untouched.
      const mpf = walkJpeg(file).segments.find((s) => s.kind === "mpf")!;
      expect(Buffer.from(bytes.subarray(mpf.start, mpf.end)).equals(Buffer.from(file.subarray(mpf.start, mpf.end)))).toBe(true);
      expect(Buffer.from(bytes.subarray(imageAt(bytes) - gap.length, imageAt(bytes))).equals(Buffer.from(gap))).toBe(true);
    });
  });

  it("handles an unreadable EXIF block without throwing", () => {
    const broken = file.slice();
    const exif = walkJpeg(broken).segments.find((s) => s.kind === "exif")!;
    broken.fill(0x41, exif.data + 6, exif.data + 14);
    const r = inspectJpeg(broken);
    expect(r.exifUnreadable).toBe(true);
    expect(hasMetadata(r)).toBe(true);
    const gps = cleanJpeg(broken, "gps");
    expect(gps.droppedUnreadable).toBe(true);
    expect(walkJpeg(gps.bytes).segments.some((s) => s.kind === "exif")).toBe(false);
    expect(cleanJpeg(broken, "all").keptOrientation).toBeNull();
  });
});

describe("PNG", () => {
  const file = pngWithMetadata(PNG, { ...DEFAULT_META, icc: true });
  const idat = (b: Uint8Array) => Buffer.concat(pngChunks(b, "IDAT"));
  const crcOk = (b: Uint8Array) =>
    walkPng(b).chunks.every((c) => new DataView(b.buffer, b.byteOffset).getUint32(c.end - 4) === crc32(b.subarray(c.start + 4, c.end - 4)));

  it("reports eXIf, XMP and text chunks", () => {
    const r = inspectPng(file);
    expectCoords(r.gps);
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7" });
    expect(r.blocks).toEqual(expect.arrayContaining(["xmp", "text", "time"]));
    expect(crcOk(file)).toBe(true);
  });

  it("removes the metadata chunks and keeps the image and colour chunks", () => {
    const { bytes, keptOrientation } = cleanPng(file, "all");
    expect(keptOrientation).toBe(6);
    expect(pngChunks(bytes, "iTXt")).toHaveLength(0);
    expect(pngChunks(bytes, "tEXt")).toHaveLength(0);
    expect(pngChunks(bytes, "tIME")).toHaveLength(0);
    expect(pngChunks(bytes, "iCCP")).toHaveLength(1);
    expect(idat(bytes).equals(idat(file))).toBe(true);
    expect(crcOk(bytes)).toBe(true);
    const r = inspectPng(bytes);
    expect(r.exif).toMatchObject({ orientation: 6, otherTags: 0 });
    expect(r.gps).toBeNull();
    expect(r.blocks).toEqual([]);
  });

  it("removes only the location in GPS mode", () => {
    const { bytes } = cleanPng(file, "gps");
    expect(bytes.length).toBe(file.length);
    expect(crcOk(bytes)).toBe(true);
    const r = inspectPng(bytes);
    expect(r.gps).toBeNull();
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7", hasGpsBlock: false });
    expect(r.blocks).toEqual(expect.arrayContaining(["xmp", "text", "time"]));
    expect(idat(bytes).equals(idat(file))).toBe(true);
  });
});

describe("WebP", () => {
  const file = webpWithMetadata(WEBP, { ...DEFAULT_META, icc: true });
  const image = (b: Uint8Array) => Buffer.concat([...webpChunks(b, "VP8 "), ...webpChunks(b, "VP8L"), ...webpChunks(b, "ALPH")]);
  const flags = (b: Uint8Array) => b[20]!;
  const riffOk = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getUint32(4, true) === b.length - 8;

  it("reports the EXIF and XMP chunks", () => {
    const r = inspectWebp(file);
    expectCoords(r.gps);
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7" });
    expect(r.blocks).toContain("xmp");
  });

  it("removes EXIF and XMP, fixes flags and size, keeps ICC and the image", () => {
    const { bytes, keptOrientation } = cleanWebp(file, "all");
    expect(keptOrientation).toBe(6);
    expect(webpChunks(bytes, "XMP ")).toHaveLength(0);
    expect(webpChunks(bytes, "ICCP")).toHaveLength(1);
    expect(flags(bytes) & FLAG_XMP).toBe(0);
    expect(flags(bytes) & FLAG_EXIF).toBe(FLAG_EXIF);
    expect(flags(bytes) & 0x20).toBe(0x20);
    expect(riffOk(bytes)).toBe(true);
    expect(image(bytes).length).toBeGreaterThan(0);
    expect(image(bytes).equals(image(file))).toBe(true);
    expect(inspectWebp(bytes).exif).toMatchObject({ orientation: 6, otherTags: 0 });

    const upright = cleanWebp(webpWithMetadata(WEBP, { ...DEFAULT_META, orientation: 1 }), "all").bytes;
    expect(webpChunks(upright, "EXIF")).toHaveLength(0);
    expect(flags(upright) & (FLAG_EXIF | FLAG_XMP)).toBe(0);
    expect(riffOk(upright)).toBe(true);
  });

  it("removes only the location in GPS mode", () => {
    const { bytes } = cleanWebp(file, "gps");
    expect(bytes.length).toBe(file.length);
    const r = inspectWebp(bytes);
    expect(r.gps).toBeNull();
    expect(r.exif).toMatchObject({ make: "Google", model: "Pixel 7" });
    expect(image(bytes).equals(image(file))).toBe(true);
  });
});

describe("analyze", () => {
  it("detects formats and turns away HEIC, AVIF and GIF", () => {
    expect(detect(JPG)).toBe("jpg");
    expect(detect(PNG)).toBe("png");
    expect(detect(WEBP)).toBe("webp");
    expect(analyze(sample("sample.heic"), "all")).toEqual({ ok: false, error: "heic" });
    expect(analyze(sample("sample.avif"), "all")).toEqual({ ok: false, error: "avif" });
    expect(analyze(new TextEncoder().encode("GIF89a........"), "all")).toEqual({ ok: false, error: "unsupported" });
    expect(analyze(new TextEncoder().encode("hello world"), "all")).toEqual({ ok: false, error: "decode" });
  });

  it("says an untouched sample has nothing to remove", () => {
    for (const b of [JPG, PNG, WEBP]) {
      const res = analyze(b, "all");
      expect(res.ok).toBe(true);
      if (res.ok) expect(hasMetadata(res.report)).toBe(false);
    }
  });

  it("never throws on truncated or corrupted files", () => {
    const files = [jpegWithMetadata(JPG), pngWithMetadata(PNG), webpWithMetadata(WEBP)];
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const f of files) {
      for (let cut = 0; cut < f.length; cut += 7) {
        for (const mode of ["all", "gps"] as const) expect(() => analyze(f.subarray(0, cut), mode)).not.toThrow();
      }
      for (let i = 0; i < 400; i++) {
        const g = f.slice();
        // Corrupt a few bytes, mostly inside the metadata near the start.
        for (let k = 0; k < 4; k++) g[Math.floor(rand() * Math.min(g.length, 700))] = Math.floor(rand() * 256);
        for (const mode of ["all", "gps"] as const) expect(() => analyze(g, mode)).not.toThrow();
      }
    }
  });
});

describe("display helpers", () => {
  it("rounds coordinates to 2 decimals", () => {
    expect(roundCoord(LAT)).toBe("38.47");
    expect(roundCoord(-LON)).toBe("-14.95");
  });

  it("parses EXIF dates and rejects junk", () => {
    expect(parseExifDate("2024:07:14 18:32:05")).toEqual({ year: 2024, month: 7, day: 14, hour: 18, minute: 32 });
    expect(parseExifDate("0000:00:00 00:00:00")).toBeNull();
    expect(parseExifDate("yesterday")).toBeNull();
  });

  it("names the camera without repeating the make", () => {
    expect(cameraName("Google", "Pixel 7")).toBe("Google Pixel 7");
    expect(cameraName("Canon", "Canon EOS R5")).toBe("Canon EOS R5");
    expect(cameraName("NIKON CORPORATION", "NIKON D750")).toBe("NIKON D750");
    expect(cameraName(undefined, "X")).toBe("X");
    expect(cameraName()).toBeUndefined();
  });

});
