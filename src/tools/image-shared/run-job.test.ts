import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSettings } from "./protocol";

// The WASM codecs are replaced by stand-ins that only track sizes.
const img = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(0) }) as unknown as ImageData;
vi.mock("./codecs", () => ({
  decode: vi.fn(async () => img(64, 48)),
  fit: vi.fn(async (i: ImageData, maxW?: number | null) => (maxW && maxW < i.width ? img(maxW, (i.height * maxW) / i.width) : i)),
  resizeTo: vi.fn(async (_i: ImageData, w: number, h: number) => img(w, h)),
  encode: vi.fn(async () => ({ buffer: new ArrayBuffer(1), flattened: false })),
}));

const { fit, resizeTo } = await import("./codecs");
const { runJob } = await import("./run-job");

const PNG = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]).buffer;

describe("runJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resizes to the exact requested size and reports the size before", async () => {
    const { res } = await runJob(
      { id: 1, buffer: PNG(), settings: { output: "original", quality: 80, resize: { mode: "width", width: 128, enlarge: true } } },
      ["png"],
    );
    expect(resizeTo).toHaveBeenCalledWith(expect.anything(), 128, 96);
    expect(fit).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, format: "png", width: 128, height: 96, sourceWidth: 64, sourceHeight: 48, notEnlarged: false });
  });

  it("flags an image too small to enlarge, and keeps the max-bounds path for the other tools", async () => {
    const small = await runJob(
      { id: 2, buffer: PNG(), settings: { output: "jpg", quality: 80, resize: { mode: "width", width: 128, enlarge: false } } },
      ["png"],
    );
    expect(small.res).toMatchObject({ ok: true, format: "jpg", width: 64, height: 48, notEnlarged: true });

    vi.clearAllMocks();
    const compress = await runJob({ id: 3, buffer: PNG(), settings: { output: "original", quality: 75, maxWidth: 32 } }, ["png"]);
    expect(fit).toHaveBeenCalledWith(expect.anything(), 32, undefined);
    expect(resizeTo).not.toHaveBeenCalled();
    expect(compress.res).toMatchObject({ ok: true, width: 32, height: 24, notEnlarged: false });
  });

  it("runs a tool's own transform instead of the resize step, with the settings as posted", async () => {
    const transform = vi.fn(async (_i: ImageData, s: JobSettings) => {
      const size = (s as JobSettings & { fit: { size: number } }).fit.size;
      return img(size, size);
    });
    const settings = { output: "png" as const, quality: 80, resize: { mode: "width" as const, width: 10, enlarge: true }, fit: { size: 100 } };
    const { res } = await runJob({ id: 4, buffer: PNG(), settings }, ["png"], undefined, transform);
    expect(transform).toHaveBeenCalledWith(expect.anything(), settings);
    expect(resizeTo).not.toHaveBeenCalled();
    expect(fit).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, format: "png", width: 100, height: 100, sourceWidth: 64, sourceHeight: 48 });
  });
});
