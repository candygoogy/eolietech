import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, GS_WASM_BYTES, gsArgs, initialPreset, isPreset, parseProgress } from "./presets";

describe("pdf-compress presets", () => {
  it("maps a preset to a safe pdfwrite command line", () => {
    const args = gsArgs("screen");
    expect(args).toContain("-sDEVICE=pdfwrite");
    expect(args).toContain("-dPDFSETTINGS=/screen");
    expect(args).toContain("-dSAFER");
    expect(args).toContain("-dBATCH");
    expect(args.at(-2)).toBe("-sOutputFile=/out.pdf");
    expect(args.at(-1)).toBe("/in.pdf");
    expect(gsArgs("printer")).toContain("-dPDFSETTINGS=/printer");
    expect(isPreset("ebook")).toBe(true);
    expect(isPreset("prepress")).toBe(false);
  });

  it("starts on the variant preset's quality, else the default", () => {
    expect(initialPreset({ quality: "screen" })).toBe("screen");
    expect(initialPreset({})).toBe(DEFAULT_PRESET);
    expect(initialPreset({ quality: "prepress" })).toBe(DEFAULT_PRESET);
  });

  it("parses Ghostscript progress lines", () => {
    expect(parseProgress("Processing pages 1 through 12.")).toEqual({ total: 12 });
    expect(parseProgress("Page 3")).toEqual({ page: 3 });
    expect(parseProgress("GPL Ghostscript 10.06.0")).toBeNull();
  });

  it("advertises the real gs.wasm download size", () => {
    const require = createRequire(import.meta.url);
    expect(statSync(require.resolve("@okathira/ghostpdl-wasm/gs.wasm")).size).toBe(GS_WASM_BYTES);
  });
});
