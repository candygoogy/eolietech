import { describe, expect, it } from "vitest";
import { matchesAccept } from "../../lib/tool-ui";
import {
  avifQuality,
  encodeParams,
  fitWithin,
  flattenAlpha,
  outputName,
  resolveOutput,
  sniffFormat,
  uniqueNames,
} from "../image-shared/formats";
import { configFromPreset } from "./settings";

const file = (name: string, type: string) => new File([new Uint8Array(4)], name, { type });

describe("image-compress settings", () => {
  it("maps variant presets to a narrowed accept list and a preselected output", () => {
    const webpToPng = configFromPreset({ from: "webp", to: "png" });
    expect(webpToPng).toMatchObject({ inputs: ["webp"], output: "png", isConversion: true });
    expect(matchesAccept(file("a.webp", "image/webp"), webpToPng.accept)).toBe(true);
    expect(matchesAccept(file("a.png", "image/png"), webpToPng.accept)).toBe(false);

    const jpgToAvif = configFromPreset({ from: "jpg", to: "avif" });
    expect(matchesAccept(file("photo.JPEG", ""), jpgToAvif.accept)).toBe(true);

    const base = configFromPreset({});
    expect(base).toMatchObject({ output: "original", isConversion: false });
    for (const name of ["a.jpg", "a.png", "a.webp", "a.avif"]) expect(matchesAccept(file(name, ""), base.accept)).toBe(true);
    expect(matchesAccept(file("a.heic", "image/heic"), base.accept)).toBe(false);
    // Unknown preset values fall back to the base page.
    expect(configFromPreset({ from: "gif", to: "png" }).isConversion).toBe(false);
  });

  it("maps quality to encoder parameters", () => {
    expect(encodeParams("jpg", 75).options.quality).toBe(75);
    expect(encodeParams("webp", 0).options.quality).toBe(1);
    expect(encodeParams("png", 10).options).not.toHaveProperty("quality");
    expect(avifQuality(75)).toBe(50);
    expect(avifQuality(100)).toBe(100);
    expect(avifQuality(30)).toBe(20);
    expect(encodeParams("avif", 75).options.quality).toBe(50);
  });

  it("names outputs and dedupes zip entries", () => {
    expect(outputName("photo.jpeg", "jpg", "jpg")).toBe("photo.jpeg");
    expect(outputName("photo.jpeg", "jpg", "webp")).toBe("photo.webp");
    expect(outputName("scan.final.png", "png", "avif")).toBe("scan.final.avif");
    expect(resolveOutput("original", "png")).toBe("png");
    expect(resolveOutput("webp", "png")).toBe("webp");
    expect(uniqueNames(["a.jpg", "A.jpg", "a.jpg", "b.png"])).toEqual(["a.jpg", "A (2).jpg", "a (3).jpg", "b.png"]);
  });

  it("sniffs formats, fits dimensions and flattens alpha for JPG", () => {
    const bytes = (...parts: (number[] | string)[]) =>
      new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
    expect(sniffFormat(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffFormat(bytes([0x89], "PNG", [13, 10, 26, 10]))).toBe("png");
    expect(sniffFormat(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("webp");
    expect(sniffFormat(bytes([0, 0, 0, 28], "ftypavif", [0, 0, 0, 0], "avifmif1miaf"))).toBe("avif");
    expect(sniffFormat(bytes([0, 0, 0, 24], "ftypheic", [0, 0, 0, 0], "mif1heic"))).toBe("heic");
    expect(sniffFormat(bytes("GIF89a"))).toBeNull();

    expect(fitWithin(4000, 3000, 2000, null)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(4000, 3000, 2000, 1000)).toEqual({ width: 1333, height: 1000 });
    expect(fitWithin(800, 600, 2000, 2000)).toEqual({ width: 800, height: 600 });

    const px = new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 128]);
    expect(flattenAlpha(px)).toBe(true);
    expect([...px]).toEqual([255, 255, 255, 255, 255, 0, 0, 255, 127, 127, 127, 255]);
  });
});
