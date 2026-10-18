import { describe, expect, it } from "vitest";
import { matchesAccept } from "../../lib/tool-ui";
import { MAX_SIDE, targetSize } from "../image-shared/formats";
import { DEFAULT_QUALITY, DEFAULT_WIDTH, RESIZE_ACCEPT, formFromPreset, missingFields, resizeSettings } from "./settings";

const file = (name: string, type: string) => new File([new Uint8Array(4)], name, { type });

describe("image-resize settings", () => {
  it("maps variant presets to the initial form", () => {
    expect(formFromPreset({})).toMatchObject({ mode: "width", width: String(DEFAULT_WIDTH), output: "original", enlarge: false });
    // Email: longest side 1600 px as JPG.
    expect(formFromPreset({ maxSide: 1600, output: "jpg" })).toMatchObject({
      mode: "box",
      width: "1600",
      height: "1600",
      keepAspect: true,
      output: "jpg",
    });
    // Instagram: 1080 px wide, height by aspect.
    expect(formFromPreset({ width: 1080 })).toMatchObject({ mode: "width", width: "1080", output: "original" });
    expect(formFromPreset({ width: "big", output: "gif" })).toEqual(formFromPreset({}));
    for (const name of ["a.jpg", "a.png", "a.webp", "a.avif"]) expect(matchesAccept(file(name, ""), RESIZE_ACCEPT)).toBe(true);
    expect(matchesAccept(file("a.heic", "image/heic"), RESIZE_ACCEPT)).toBe(false);
  });

  it("maps the form to job settings and keeps the last size while a field is incomplete", () => {
    const form = { ...formFromPreset({}), mode: "box" as const, width: "800", height: "600", keepAspect: false, quality: "70" };
    expect(resizeSettings(form)).toEqual({
      output: "original",
      quality: 70,
      resize: { mode: "box", width: 800, height: 600, keepAspect: false, enlarge: false },
    });
    expect(resizeSettings({ ...form, mode: "percent", percent: "5000", quality: "x" })).toMatchObject({
      quality: DEFAULT_QUALITY,
      resize: { mode: "percent", percent: 1000 },
    });

    const blank = { ...form, mode: "height" as const, height: " " };
    expect(missingFields(blank)).toEqual(["height"]);
    expect(missingFields({ ...form, width: "0", height: "" })).toEqual(["width", "height"]);
    const last = { mode: "width" as const, width: 500, enlarge: true };
    expect(resizeSettings(blank, last).resize).toEqual(last);
  });
});

describe("targetSize (exact resize)", () => {
  it("resizes by one side, both sides or a percentage", () => {
    expect(targetSize(4000, 3000, { mode: "width", width: 1080, enlarge: false })).toEqual({ width: 1080, height: 810, notEnlarged: false });
    expect(targetSize(3000, 4000, { mode: "height", height: 999, enlarge: false })).toEqual({ width: 749, height: 999, notEnlarged: false });
    // Fit inside a 1600 box: the longer side becomes 1600, either orientation.
    expect(targetSize(4000, 3000, { mode: "box", width: 1600, height: 1600, keepAspect: true, enlarge: false })).toMatchObject({ width: 1600, height: 1200 });
    expect(targetSize(3000, 4000, { mode: "box", width: 1600, height: 1600, keepAspect: true, enlarge: false })).toMatchObject({ width: 1200, height: 1600 });
    // Aspect ratio off: exactly the box.
    expect(targetSize(4000, 3000, { mode: "box", width: 1000, height: 1000, keepAspect: false, enlarge: false })).toMatchObject({ width: 1000, height: 1000 });
    expect(targetSize(64, 48, { mode: "percent", percent: 50, enlarge: false })).toEqual({ width: 32, height: 24, notEnlarged: false });
    expect(targetSize(3, 3, { mode: "percent", percent: 1, enlarge: false })).toMatchObject({ width: 1, height: 1 });
  });

  it("never enlarges unless allowed, and caps enlarging at MAX_SIDE", () => {
    expect(targetSize(800, 600, { mode: "width", width: 1600, enlarge: false })).toEqual({ width: 800, height: 600, notEnlarged: true });
    expect(targetSize(800, 600, { mode: "width", width: 1600, enlarge: true })).toEqual({ width: 1600, height: 1200, notEnlarged: false });
    expect(targetSize(800, 600, { mode: "width", width: 800, enlarge: false })).toEqual({ width: 800, height: 600, notEnlarged: false });
    expect(targetSize(64, 48, { mode: "percent", percent: 200, enlarge: false })).toMatchObject({ width: 64, height: 48, notEnlarged: true });
    // Stretch without enlarging: the side that is already small enough stays, the other shrinks.
    expect(targetSize(2000, 500, { mode: "box", width: 1000, height: 1000, keepAspect: false, enlarge: false })).toEqual({
      width: 1000,
      height: 500,
      notEnlarged: true,
    });
    expect(targetSize(10000, 5000, { mode: "percent", percent: 1000, enlarge: true })).toMatchObject({ width: MAX_SIDE, height: MAX_SIDE / 2 });
  });
});
