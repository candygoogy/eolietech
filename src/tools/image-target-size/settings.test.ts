import { describe, expect, it } from "vitest";
import { DEFAULT_KB, MAX_KB, TARGET_ACCEPT, formFromPreset, isTargetOutput, parseKb, targetSettings } from "./settings";

describe("formFromPreset", () => {
  it("starts at 100 KB as JPG on the base page", () => {
    expect(formFromPreset({})).toEqual({ kb: String(DEFAULT_KB), output: "jpg" });
  });

  it("preselects the variant's size", () => {
    for (const kb of [20, 50, 100, 200]) expect(formFromPreset({ targetKb: kb }).kb).toBe(String(kb));
  });

  it("ignores invalid presets", () => {
    expect(formFromPreset({ targetKb: "50" }).kb).toBe("100");
    expect(formFromPreset({ targetKb: 0 }).kb).toBe("100");
    expect(formFromPreset({ targetKb: -5 }).kb).toBe("100");
  });
});

describe("parseKb", () => {
  it("accepts whole and decimal sizes, rounding down so the file still fits", () => {
    expect(parseKb("50")).toBe(50);
    expect(parseKb(" 99.9 ")).toBe(99);
    expect(parseKb("99,9")).toBe(99);
  });

  it("rejects empty, zero, negative and non-numbers, and caps huge values", () => {
    for (const v of ["", " ", "0", "0.5", "-3", "abc"]) expect(parseKb(v)).toBeNull();
    expect(parseKb("999999")).toBe(MAX_KB);
  });
});

describe("targetSettings", () => {
  it("counts 1 KB as 1000 bytes", () => {
    expect(targetSettings({ kb: "20", output: "jpg" })).toMatchObject({ output: "jpg", targetBytes: 20_000 });
    expect(targetSettings({ kb: "200", output: "webp" })).toMatchObject({ output: "webp", targetBytes: 200_000 });
  });

  it("keeps the last valid size while the field is empty", () => {
    expect(targetSettings({ kb: "", output: "jpg" }, 50).targetBytes).toBe(50_000);
    expect(targetSettings({ kb: "x", output: "jpg" }).targetBytes).toBe(DEFAULT_KB * 1000);
  });
});

it("accepts every raster format and only offers JPG and WebP out", () => {
  expect(TARGET_ACCEPT).toContain("image/png");
  expect(TARGET_ACCEPT).toContain("image/avif");
  expect(TARGET_ACCEPT).not.toContain("heic");
  expect(isTargetOutput("jpg") && isTargetOutput("webp")).toBe(true);
  expect(isTargetOutput("png")).toBe(false);
});
