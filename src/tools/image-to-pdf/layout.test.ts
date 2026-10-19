import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  MAX_PAGE_SIDE,
  PAPER,
  SMALL_MARGIN,
  hasTransparency,
  jpegOrientation,
  pageLayout,
  pdfName,
  placeImage,
  readOptions,
  turnsSideways,
  webpIsLossless,
  type Matrix,
} from "./layout";
import { addImagePage } from "./pdf-build";

const fixture = (name: string) => new Uint8Array(readFileSync(path.resolve(__dirname, "../../../e2e/fixtures/image", name)));

/** A minimal JPEG header: SOI, optional JFIF APP0, an APP1 Exif block with one Orientation entry, then SOS. */
function jpegWith(orientation: number, opts: { littleEndian?: boolean; app0?: boolean; xmpFirst?: boolean } = {}): Uint8Array {
  const le = !!opts.littleEndian;
  const u16 = (v: number) => (le ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) => (le ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24] : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]);
  const tiff = [
    ...(le ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(2), // two entries: ImageWidth first, then Orientation
    ...u16(0x0100), ...u16(3), ...u32(1), ...u16(64), 0, 0,
    ...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0,
    ...u32(0),
  ];
  const segment = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
  const exif = segment(0xe1, [...Array.from("Exif\0\0", (c) => c.charCodeAt(0)), ...tiff]);
  const xmp = segment(0xe1, Array.from("http://ns.adobe.com/xap/1.0/\0<x/>", (c) => c.charCodeAt(0)));
  const app0 = segment(0xe0, Array.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", (c) => c.charCodeAt(0)));
  return new Uint8Array([
    0xff, 0xd8,
    ...(opts.app0 ? app0 : []),
    ...(opts.xmpFirst ? xmp : []),
    ...exif,
    0xff, 0xda, 0x00, 0x02,
  ]);
}

/** Apply a PDF matrix to a point. */
const apply = ([a, b, c, d, e, f]: Matrix, u: number, v: number) => [a * u + c * v + e, b * u + d * v + f].map((n) => Math.round(n * 1000) / 1000 + 0);

describe("jpegOrientation", () => {
  it("reads every orientation, big and little endian, after JFIF and XMP segments", () => {
    for (let o = 1; o <= 8; o++) {
      expect(jpegOrientation(jpegWith(o))).toBe(o);
      expect(jpegOrientation(jpegWith(o, { littleEndian: true, app0: true, xmpFirst: true }))).toBe(o);
    }
  });

  it("falls back to 1 for no EXIF, junk and out-of-range values", () => {
    expect(jpegOrientation(fixture("sample.jpg"))).toBe(1);
    expect(jpegOrientation(fixture("sample.png"))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8]))).toBe(1);
    expect(jpegOrientation(jpegWith(9))).toBe(1);
    expect(jpegOrientation(jpegWith(6).subarray(0, 30))).toBe(1);
  });
});

describe("placeImage", () => {
  const box = { x: 10, y: 20, width: 48, height: 64 };
  // Corners of the stored image in its unit square (v up): top left is (0, 1).
  const storedTopLeft = [0, 1] as const;

  it("draws orientation 1 straight into the box", () => {
    expect(placeImage(1, box)).toEqual([48, 0, 0, 64, 10, 20]);
  });

  it("turns a sideways phone photo (6) a quarter clockwise: stored top left lands top right", () => {
    expect(apply(placeImage(6, box), ...storedTopLeft)).toEqual([58, 84]);
    // Stored top right (1, 1) -> bottom right; stored bottom left (0, 0) -> top left.
    expect(apply(placeImage(6, box), 1, 1)).toEqual([58, 20]);
    expect(apply(placeImage(6, box), 0, 0)).toEqual([10, 84]);
  });

  it("maps the stored top left corner where each orientation says it is shown", () => {
    const [l, r, b, t] = [10, 58, 20, 84];
    const expected: Record<number, number[]> = {
      1: [l, t], // top left
      2: [r, t], // top right
      3: [r, b], // bottom right
      4: [l, b], // bottom left
      5: [l, t], // top left (transposed)
      6: [r, t], // top right
      7: [r, b], // bottom right
      8: [l, b], // bottom left
    };
    for (let o = 1; o <= 8; o++) expect(apply(placeImage(o, box), ...storedTopLeft), `orientation ${o}`).toEqual(expected[o]);
  });

  it("keeps the image inside the box for every orientation", () => {
    for (let o = 1; o <= 8; o++) {
      const m = placeImage(o, box);
      const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
      expect(Math.min(...pts.map((p) => p[0]!))).toBe(10);
      expect(Math.max(...pts.map((p) => p[0]!))).toBe(58);
      expect(Math.min(...pts.map((p) => p[1]!))).toBe(20);
      expect(Math.max(...pts.map((p) => p[1]!))).toBe(84);
    }
  });

  it("knows which orientations swap width and height", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(turnsSideways)).toEqual([false, false, false, false, true, true, true, true]);
    expect(turnsSideways(0)).toBe(false);
  });
});

describe("pageLayout", () => {
  it("fit: the page is the image, one pixel per point, margin ignored", () => {
    expect(pageLayout(640, 480, { pageSize: "fit", margin: "small" })).toEqual({
      width: 640,
      height: 480,
      box: { x: 0, y: 0, width: 640, height: 480 },
    });
  });

  it("fit: scales huge images down to the largest page readers accept", () => {
    const { width, height } = pageLayout(28800, 7200, { pageSize: "fit", margin: "none" });
    expect(width).toBe(MAX_PAGE_SIDE);
    expect(height).toBe(3600);
  });

  it("A4: portrait for portrait and square images, landscape for landscape ones", () => {
    const [short, long] = PAPER.a4;
    expect(pageLayout(300, 400, { pageSize: "a4", margin: "none" })).toMatchObject({ width: short, height: long });
    expect(pageLayout(400, 400, { pageSize: "a4", margin: "none" })).toMatchObject({ width: short, height: long });
    expect(pageLayout(400, 300, { pageSize: "a4", margin: "none" })).toMatchObject({ width: long, height: short });
  });

  it("Letter: scales to fit (up or down) and centres, inside the small margin", () => {
    const small = pageLayout(100, 50, { pageSize: "letter", margin: "small" });
    expect(small.width).toBe(792);
    expect(small.height).toBe(612);
    expect(small.box.width).toBe(792 - 2 * SMALL_MARGIN);
    expect(small.box.height).toBe((792 - 2 * SMALL_MARGIN) / 2);
    expect(small.box.x).toBe(SMALL_MARGIN);
    expect(small.box.y).toBeCloseTo((612 - small.box.height) / 2);

    const big = pageLayout(1000, 4000, { pageSize: "letter", margin: "none" });
    expect(big.box.height).toBe(792);
    expect(big.box.width).toBe(198);
    expect(big.box.x).toBe((612 - 198) / 2);
    expect(big.box.y).toBe(0);
  });
});

describe("small helpers", () => {
  it("reads options defensively", () => {
    expect(readOptions("a4", "small")).toEqual({ pageSize: "a4", margin: "small" });
    expect(readOptions("tabloid", "huge")).toEqual({ pageSize: "fit", margin: "none" });
  });

  it("tells lossless WebP from lossy", () => {
    expect(webpIsLossless(fixture("sample.webp"))).toBe(false);
    const riff = (chunk: string) => new Uint8Array([...Array.from(`RIFF\0\0\0\0WEBP${chunk}`, (c) => c.charCodeAt(0)), 0, 0, 0, 0]);
    expect(webpIsLossless(riff("VP8L"))).toBe(true);
    expect(webpIsLossless(riff("VP8 "))).toBe(false);
    expect(webpIsLossless(fixture("sample.png"))).toBe(false);
  });

  it("spots transparency", () => {
    expect(hasTransparency(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(false);
    expect(hasTransparency(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 254]))).toBe(true);
  });

  it("names the PDF after a single image, else uses the fallback", () => {
    expect(pdfName(["IMG_0042.HEIC"], "images.pdf")).toBe("IMG_0042.pdf");
    expect(pdfName(["a.jpg", "b.png"], "images.pdf")).toBe("images.pdf");
  });
});

describe("addImagePage (pdf-lib)", () => {
  it("embeds a JPG and a PNG as they are, one page each, sized to the image", async () => {
    const doc = await PDFDocument.create();
    const jpg = fixture("sample.jpg");
    const png = fixture("sample.png");
    addImagePage(doc, await doc.embedJpg(jpg), 1, { pageSize: "fit", margin: "none" });
    addImagePage(doc, await doc.embedPng(png), 1, { pageSize: "a4", margin: "small" });
    const saved = await PDFDocument.load(await doc.save());
    expect(saved.getPageCount()).toBe(2);
    expect(saved.getPage(0).getSize()).toEqual({ width: 64, height: 48 });
    expect(saved.getPage(1).getSize()).toEqual({ width: PAPER.a4[1], height: PAPER.a4[0] });
    // The JPEG's own bytes are in the file: no re-encoding.
    const bytes = await doc.save({ useObjectStreams: false });
    const haystack = Buffer.from(bytes);
    expect(haystack.includes(Buffer.from(jpg.subarray(0, 200)))).toBe(true);
  });

  it("gives a sideways phone photo (orientation 6) an upright page", async () => {
    const doc = await PDFDocument.create();
    addImagePage(doc, await doc.embedJpg(fixture("sample.jpg")), 6, { pageSize: "fit", margin: "none" });
    expect(doc.getPage(0).getSize()).toEqual({ width: 48, height: 64 });
    const a4 = await PDFDocument.create();
    addImagePage(a4, await a4.embedJpg(fixture("sample.jpg")), 6, { pageSize: "a4", margin: "none" });
    // 64 x 48 stored, 48 x 64 shown: a portrait page.
    expect(a4.getPage(0).getSize()).toEqual({ width: PAPER.a4[0], height: PAPER.a4[1] });
  });
});
