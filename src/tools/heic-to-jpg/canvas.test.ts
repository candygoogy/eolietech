import { afterEach, describe, expect, it, vi } from "vitest";
import { CANVAS_SAFE_PIXELS, canDecodeHeic, looksBlank, readPixels } from "./canvas";

afterEach(() => vi.unstubAllGlobals());

/** A stand-in OffscreenCanvas whose 2d context is `ctx` (null: the browser would not give one). */
function stubCanvas(ctx: unknown) {
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      getContext() {
        return ctx;
      }
    },
  );
  vi.stubGlobal("createImageBitmap", () => {});
}

const bitmap = (width: number, height: number) => ({ width, height }) as ImageBitmap;

describe("HEIC canvas read-back", () => {
  it("says the browser cannot run the tool when OffscreenCanvas or its 2d context is missing", () => {
    vi.stubGlobal("OffscreenCanvas", undefined);
    expect(canDecodeHeic()).toBe(false);
    stubCanvas(null);
    expect(canDecodeHeic()).toBe(false);
    stubCanvas({});
    expect(canDecodeHeic()).toBe(true);
  });

  it("reports a canvas the browser would not allocate as too large, not as a damaged photo", () => {
    stubCanvas(null);
    expect(() => readPixels(bitmap(8000, 6000))).toThrow(expect.objectContaining({ code: "memory", kind: "canvasTooLarge" }));

    // A 48 MP photo that reads back blank: what iOS gives over its canvas limit.
    // (An empty array reads as zeros at every index, which is all a blank check looks at.)
    const blank = { width: 8064, height: 6048, data: new Uint8ClampedArray(0) };
    expect(8064 * 6048).toBeGreaterThan(CANVAS_SAFE_PIXELS);
    stubCanvas({ drawImage: () => {}, getImageData: () => blank });
    expect(() => readPixels(bitmap(8064, 6048))).toThrow(expect.objectContaining({ kind: "canvasTooLarge" }));
  });

  it("only takes an all-transparent sample grid for blank", () => {
    const data = new Uint8ClampedArray(100 * 100 * 4);
    expect(looksBlank(data, 100, 100)).toBe(true);
    data[(53 * 100 + 53) * 4 + 3] = 255; // one opaque pixel on the sample grid
    expect(looksBlank(data, 100, 100)).toBe(false);
  });
});
