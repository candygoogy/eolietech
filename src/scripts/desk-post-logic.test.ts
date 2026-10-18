import { describe, expect, it } from "vitest";
import { POST_SETTINGS, classifyIntake, isSmaller, postmarkFigure } from "./desk-post-logic";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const ftyp = (brand: string) => new Uint8Array([0, 0, 0, 24, ...ascii("ftyp"), ...ascii(brand), 0, 0, 0, 0, ...ascii("mif1"), ...ascii(brand)]);
const GIF = new Uint8Array(ascii("GIF89a"));
const file = (name: string, type = "", size = 1000) => ({ name, type, size });

describe("classifyIntake", () => {
  it("takes JPG, PNG, WebP and AVIF by their bytes", () => {
    expect(classifyIntake(JPG, file("a.jpg"), 0)).toEqual({ ok: true, format: "jpg" });
    expect(classifyIntake(PNG, file("renamed.jpg"), 0)).toEqual({ ok: true, format: "png" });
    expect(classifyIntake(new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]), file("a.webp"), 0)).toEqual({ ok: true, format: "webp" });
    expect(classifyIntake(ftyp("avif"), file("a.avif"), 0)).toEqual({ ok: true, format: "avif" });
  });

  it("turns HEIC away (by bytes, or by name/type when the bytes say nothing)", () => {
    expect(classifyIntake(ftyp("heic"), file("IMG_1.HEIC"), 0)).toEqual({ ok: false, reason: "heic" });
    expect(classifyIntake(new Uint8Array(8), file("IMG_2.heif"), 0)).toEqual({ ok: false, reason: "heic" });
    expect(classifyIntake(new Uint8Array(8), file("photo", "image/heic"), 0)).toEqual({ ok: false, reason: "heic" });
  });

  it("refuses anything else, whatever its name says", () => {
    expect(classifyIntake(GIF, file("anim.gif", "image/gif"), 0)).toEqual({ ok: false, reason: "type" });
    expect(classifyIntake(new Uint8Array(ascii("%PDF-1.7")), file("fake.jpg", "image/jpeg"), 0)).toEqual({ ok: false, reason: "type" });
    expect(classifyIntake(new Uint8Array(0), file("empty.png"), 0)).toEqual({ ok: false, reason: "type" });
  });

  it("enforces the size limit when there is one", () => {
    expect(classifyIntake(JPG, file("big.jpg", "image/jpeg", 2000), 1000)).toEqual({ ok: false, reason: "tooLarge" });
    expect(classifyIntake(JPG, file("ok.jpg", "image/jpeg", 1000), 1000)).toEqual({ ok: true, format: "jpg" });
    expect(classifyIntake(JPG, file("any.jpg", "image/jpeg", 9e9), 0)).toEqual({ ok: true, format: "jpg" });
  });
});

describe("result", () => {
  it("is only 'smaller' when it really is", () => {
    expect(isSmaller(1000, 999)).toBe(true);
    expect(isSmaller(1000, 1000)).toBe(false);
    expect(isSmaller(1000, 1200)).toBe(false);
  });

  it("strikes the honest figure on the postmark", () => {
    expect(postmarkFigure(2_400_000, 640_000)).toBe("−73%");
    expect(postmarkFigure(1000, 1040)).toBe("+4%");
    expect(postmarkFigure(1000, 1000)).toBe("±0%");
  });

  it("keeps the format, at quality 75, within 2048 px", () => {
    expect(POST_SETTINGS).toEqual({ output: "original", quality: 75, maxWidth: 2048, maxHeight: 2048 });
  });
});
