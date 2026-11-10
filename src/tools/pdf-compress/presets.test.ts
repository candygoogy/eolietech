import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, GS_WASM_BYTES, gsArgs, initialPreset, isPreset, judgeGsRun, parseProgress, quarter } from "./presets";

describe("pdf-compress presets", () => {
  it("maps a preset to a safe pdfwrite command line", () => {
    const args = gsArgs("screen");
    expect(args).toContain("-sDEVICE=pdfwrite");
    expect(args).toContain("-dPDFSETTINGS=/screen");
    expect(args).toContain("-dSAFER");
    expect(args).toContain("-dBATCH");
    expect(args).toContain("-dPDFSTOPONERROR");
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

  it("only accepts a clean run that kept every page (logs from gs-repro.mjs)", () => {
    const clean = ["Processing pages 1 through 6.", "Page 1", "Page 6"];
    expect(judgeGsRun({ code: 0, log: clean, inputPages: 6, outputPages: 6 })).toBe("ok");
    // Owner-password-only file: warnings, but it opens and every page is there.
    const repaired = ["**** This file had errors that were repaired or ignored.", "/Length present in Encryption dictionary"];
    expect(judgeGsRun({ code: 0, log: repaired, inputPages: 6, outputPages: 6 })).toBe("ok");
    // Exit 0 with a blank one-page output.
    const locked = ["**** This file requires a password for access.", "**** Error: Couldn't initialise file.", "Output may be incorrect."];
    expect(judgeGsRun({ code: 0, log: locked, inputPages: 1, outputPages: 1 })).toBe("encrypted");
    expect(judgeGsRun({ code: 0, log: ["**** Error: page not found."], inputPages: 6, outputPages: 6 })).toBe("failed");
    // Truncated: 3 of 6 pages came back, log clean.
    expect(judgeGsRun({ code: 0, log: clean, inputPages: 6, outputPages: 3 })).toBe("failed");
    expect(judgeGsRun({ code: 0, log: clean, inputPages: 6, outputPages: null })).toBe("failed");
    expect(judgeGsRun({ code: 1, log: clean, inputPages: 6, outputPages: 6 })).toBe("failed");
  });

  it("reports download progress in quarters", () => {
    expect([0, 24, 25, 49, 50, 75, 99, 100].map((n) => quarter(n, 100))).toEqual([0, 0, 1, 1, 2, 3, 3, 4]);
    expect(quarter(5, 0)).toBe(0);
  });

  it("advertises the real gs.wasm download size", () => {
    const require = createRequire(import.meta.url);
    expect(statSync(require.resolve("@okathira/ghostpdl-wasm/gs.wasm")).size).toBe(GS_WASM_BYTES);
  });
});
