import { describe, expect, it } from "vitest";
import { applyTransforms, avifTransforms, formatDecimalBytes, isAnimatedPng, jpegComponents, outputName } from "./formats";

describe("formatDecimalBytes", () => {
  it("counts 1 KB as 1000 bytes, with one decimal", () => {
    expect(formatDecimalBytes(999, "en")).toBe("999 B");
    expect(formatDecimalBytes(2_400, "en")).toBe("2.4 KB");
    expect(formatDecimalBytes(19_850, "en")).toBe("19.8 KB");
    expect(formatDecimalBytes(192_300, "en")).toBe("192.3 KB");
    expect(formatDecimalBytes(4_266_483, "en")).toBe("4.2 MB");
  });

  it("rounds down, so a file under a limit never reads as over or equal to it", () => {
    expect(formatDecimalBytes(19_999, "en")).toBe("19.9 KB");
    expect(formatDecimalBytes(20_000, "en")).toBe("20.0 KB");
    expect(formatDecimalBytes(999_999, "en")).toBe("999.9 KB");
  });

  it("uses the page's decimal separator", () => {
    expect(formatDecimalBytes(19_850, "it")).toBe("19,8 KB");
  });
});

describe("outputName", () => {
  it("names the file after the real output format, even when the format did not change", () => {
    expect(outputName("photo.heic", "jpg", "jpg")).toBe("photo.jpg");
    expect(outputName("IMG_1.HEIC", "heic", "png")).toBe("IMG_1.png");
    expect(outputName("photo.jpeg", "jpg", "jpg")).toBe("photo.jpeg");
    expect(outputName("scan.png", "png", "png")).toBe("scan.png");
  });
});

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("isAnimatedPng", () => {
  const chunk = (type: string, len = 0) => [...be32(len), ...ascii(type), ...new Array(len).fill(0), 0, 0, 0, 0];
  const sig = [0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10];
  it("finds acTL before the image data, and nothing in a still PNG", () => {
    expect(isAnimatedPng(new Uint8Array([...sig, ...chunk("IHDR", 13), ...chunk("acTL", 8), ...chunk("IDAT", 4)]))).toBe(true);
    expect(isAnimatedPng(new Uint8Array([...sig, ...chunk("IHDR", 13), ...chunk("IDAT", 4), ...chunk("acTL", 8)]))).toBe(false);
    expect(isAnimatedPng(new Uint8Array([...sig, ...chunk("IHDR", 13), ...chunk("IEND")]))).toBe(false);
  });
});

describe("jpegComponents", () => {
  const sof = (components: number) => [0xff, 0xc0, 0, 8 + 3 * components, 8, 0, 16, 0, 16, components, ...new Array(3 * components).fill(1)];
  it("reads the component count from the frame header, past APP segments", () => {
    const app14 = [0xff, 0xee, 0, 14, ...ascii("Adobe"), 0, 100, 0, 0, 0, 0, 2];
    expect(jpegComponents(new Uint8Array([0xff, 0xd8, ...app14, ...sof(4), 0xff, 0xda]))).toBe(4);
    expect(jpegComponents(new Uint8Array([0xff, 0xd8, ...sof(3), 0xff, 0xda]))).toBe(3);
    expect(jpegComponents(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
  });
});

/** A minimal AVIF: ftyp, then meta with pitm, iprp/ipco (the given properties) and one ipma. */
function avif(props: number[][], links: { item: number; indices: number[] }[], primary = 1): Uint8Array {
  const box = (type: string, ...body: number[][]) => {
    const payload = body.flat();
    return [...be32(8 + payload.length), ...ascii(type), ...payload];
  };
  const full = (version: number, flags = 0) => [version, 0, 0, flags];
  const ipma = box(
    "ipma",
    full(0),
    be32(links.length),
    ...links.map((l) => [(l.item >> 8) & 255, l.item & 255, l.indices.length, ...l.indices]),
  );
  return new Uint8Array([
    ...box("ftyp", ascii("avif"), be32(0), ascii("avifmif1")),
    ...box("meta", full(0), box("hdlr", full(0), be32(0), ascii("pict"), new Array(13).fill(0)), box("pitm", full(0), [0, primary]), box("iprp", box("ipco", ...props), ipma)),
  ]);
}

describe("avifTransforms", () => {
  const ispe = (w: number, h: number) => [...be32(20), ...ascii("ispe"), 0, 0, 0, 0, ...be32(w), ...be32(h)];
  const irot = (turns: number) => [...be32(9), ...ascii("irot"), turns];
  const imir = (axis: number) => [...be32(9), ...ascii("imir"), axis];

  it("returns the primary item's irot and imir, in ipma order (essential flag ignored)", () => {
    const file = avif([ispe(4, 2), irot(3), imir(1)], [{ item: 1, indices: [1, 0x80 | 2, 3] }]);
    expect(avifTransforms(file)).toEqual([{ rotate: 3 }, { mirror: 1 }]);
  });

  it("ignores properties linked to other items, and files without any", () => {
    expect(avifTransforms(avif([ispe(4, 2), irot(1)], [{ item: 2, indices: [1, 2] }, { item: 1, indices: [1] }]))).toEqual([]);
    expect(avifTransforms(avif([ispe(4, 2), irot(0)], [{ item: 1, indices: [1, 2] }]))).toEqual([]);
    expect(avifTransforms(new Uint8Array([0, 0, 0, 8, ...ascii("ftyp")]))).toEqual([]);
  });
});

describe("applyTransforms", () => {
  // 3 x 2 pixels numbered 0..5 in reading order, one byte per pixel channel R carrying the number.
  const grid = () => ({ data: new Uint8ClampedArray([0, 1, 2, 3, 4, 5].flatMap((n) => [n, 0, 0, 255])), width: 3, height: 2 });
  const read = (p: { data: Uint8ClampedArray; width: number; height: number }) => ({
    size: `${p.width}x${p.height}`,
    px: [...p.data].filter((_, i) => i % 4 === 0),
  });

  it("turns anticlockwise in quarter turns", () => {
    // 0 1 2      2 5
    // 3 4 5  ->  1 4
    //            0 3
    expect(read(applyTransforms(grid(), [{ rotate: 1 }]))).toEqual({ size: "2x3", px: [2, 5, 1, 4, 0, 3] });
    expect(read(applyTransforms(grid(), [{ rotate: 2 }]))).toEqual({ size: "3x2", px: [5, 4, 3, 2, 1, 0] });
    expect(read(applyTransforms(grid(), [{ rotate: 3 }]))).toEqual({ size: "2x3", px: [3, 0, 4, 1, 5, 2] });
  });

  it("mirrors left-right (axis 1) and top-bottom (axis 0), applying the steps in order", () => {
    expect(read(applyTransforms(grid(), [{ mirror: 1 }]))).toEqual({ size: "3x2", px: [2, 1, 0, 5, 4, 3] });
    expect(read(applyTransforms(grid(), [{ mirror: 0 }]))).toEqual({ size: "3x2", px: [3, 4, 5, 0, 1, 2] });
    // Turn a quarter clockwise, then flip left-right: the transpose.
    expect(read(applyTransforms(grid(), [{ rotate: 3 }, { mirror: 1 }]))).toEqual({ size: "2x3", px: [0, 3, 1, 4, 2, 5] });
  });
});
