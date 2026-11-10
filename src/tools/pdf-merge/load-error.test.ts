import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./load-error";

describe("isChunkLoadError", () => {
  it("recognises a failed dynamic import in Chromium, Firefox and Safari", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/_astro/pdf-ops.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module: https://x/_astro/pdf-ops.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /_astro/a.css"))).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(isChunkLoadError(new Error("pdf: encrypted"))).toBe(false);
    expect(isChunkLoadError(new RangeError("Array buffer allocation failed"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
