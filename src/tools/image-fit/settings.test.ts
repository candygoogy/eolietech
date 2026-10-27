import { describe, expect, it } from "vitest";
import { matchesAccept } from "../../lib/tool-ui";
import { DEFAULT_COLOR, DEFAULT_QUALITY, DEFAULT_WIDTH, FIT_ACCEPT, allowsTransparent, fitSettings, formFromPreset, frameWidth, parseHex } from "./settings";

const file = (name: string, type: string) => new File([new Uint8Array(4)], name, { type });

describe("image-fit settings", () => {
  it("maps variant presets to the initial form", () => {
    expect(formFromPreset({})).toEqual({
      aspect: "1:1",
      background: "white",
      color: DEFAULT_COLOR,
      size: "photo",
      width: String(DEFAULT_WIDTH),
      output: "original",
      quality: String(DEFAULT_QUALITY),
    });
    expect(formFromPreset({ aspect: "16:9" }).aspect).toBe("16:9");
    expect(formFromPreset({ aspect: "9:16" }).aspect).toBe("9:16");
    expect(formFromPreset({ aspect: "3:2" })).toEqual(formFromPreset({}));
    for (const name of ["a.jpg", "a.png", "a.webp", "a.avif"]) expect(matchesAccept(file(name, ""), FIT_ACCEPT)).toBe(true);
    expect(matchesAccept(file("a.heic", "image/heic"), FIT_ACCEPT)).toBe(false);
  });

  it("maps the form to job settings", () => {
    expect(fitSettings(formFromPreset({}))).toEqual({
      output: "original",
      quality: DEFAULT_QUALITY,
      fit: { aspect: "1:1", width: null, background: { kind: "color", rgb: [255, 255, 255] } },
    });
    const form = { ...formFromPreset({ aspect: "9:16" }), size: "width" as const, width: "1080", output: "webp" as const, quality: "70" };
    expect(fitSettings({ ...form, background: "blur" })).toEqual({
      output: "webp",
      quality: 70,
      fit: { aspect: "9:16", width: 1080, background: { kind: "blur" } },
    });
    expect(fitSettings({ ...form, background: "black" }).fit.background).toEqual({ kind: "color", rgb: [0, 0, 0] });
    expect(fitSettings({ ...form, background: "color", color: "#FF8000" }).fit.background).toEqual({ kind: "color", rgb: [255, 128, 0] });
    expect(fitSettings({ ...form, quality: "0" }).quality).toBe(DEFAULT_QUALITY);
  });

  it("offers transparency only for PNG and WebP, and falls back to white elsewhere", () => {
    expect(allowsTransparent("png")).toBe(true);
    expect(allowsTransparent("webp")).toBe(true);
    expect(allowsTransparent("jpg")).toBe(false);
    expect(allowsTransparent("original")).toBe(false);
    const form = { ...formFromPreset({}), background: "transparent" as const };
    expect(fitSettings({ ...form, output: "png" }).fit.background).toEqual({ kind: "transparent" });
    expect(fitSettings({ ...form, output: "jpg" }).fit.background).toEqual({ kind: "color", rgb: [255, 255, 255] });
    expect(fitSettings({ ...form, output: "original" }).fit.background).toEqual({ kind: "color", rgb: [255, 255, 255] });
  });

  it("keeps the last width while the width field is empty or invalid", () => {
    const form = { ...formFromPreset({}), size: "width" as const };
    expect(frameWidth({ ...form, width: "" })).toBeUndefined();
    expect(frameWidth({ ...form, width: "0" })).toBeUndefined();
    expect(frameWidth({ ...form, width: "99999" })).toBe(20000);
    expect(frameWidth({ ...form, size: "photo", width: "" })).toBeNull();
    expect(fitSettings({ ...form, width: " " }, 640).fit.width).toBe(640);
    expect(fitSettings({ ...form, width: "abc" }).fit.width).toBe(DEFAULT_WIDTH);
  });

  it("parses colour input values", () => {
    expect(parseHex("#000000")).toEqual([0, 0, 0]);
    expect(parseHex("#a0B1c2")).toEqual([160, 177, 194]);
    expect(parseHex("#fff")).toBeNull();
    expect(parseHex("red")).toBeNull();
    expect(fitSettings({ ...formFromPreset({}), background: "color", color: "nope" }).fit.background).toEqual({
      kind: "color",
      rgb: parseHex(DEFAULT_COLOR),
    });
  });
});
