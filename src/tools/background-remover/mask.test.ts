import { describe, expect, it } from "vitest";
import { logitsToMask, outputName, toInputTensor } from "./mask";

describe("BiRefNet pre/post-processing", () => {
  it("normalises RGBA pixels into planar NCHW with ImageNet mean/std", () => {
    // 2x2 image: white, black, red, blue.
    const two = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
    const out = toInputTensor(two, 2);
    expect(out.length).toBe(12);
    expect(out[0]).toBeCloseTo((1 - 0.485) / 0.229, 5); // R plane, pixel 0 (white)
    expect(out[1]).toBeCloseTo((0 - 0.485) / 0.229, 5); // R plane, pixel 1 (black)
    expect(out[4 + 0]).toBeCloseTo((1 - 0.456) / 0.224, 5); // G plane starts after 4 pixels
    expect(out[8 + 3]).toBeCloseTo((1 - 0.406) / 0.225, 5); // B plane, pixel 3 (blue)
    expect(() => toInputTensor(new Uint8ClampedArray(8), 2)).toThrow();
  });

  it("turns logits into an alpha mask with a sigmoid", () => {
    const mask = logitsToMask(new Float32Array([-20, 0, 20]));
    expect(Array.from(mask.filter((_, i) => i % 4 === 3))).toEqual([0, 128, 255]);
    expect(mask[0]).toBe(0);
  });

  it("names outputs as PNG", () => {
    expect(outputName("holiday photo.JPG")).toBe("holiday photo-no-bg.png");
    expect(outputName("scan")).toBe("scan-no-bg.png");
    expect(outputName(".hidden")).toBe(".hidden-no-bg.png");
  });
});
