import { describe, expect, it, vi } from "vitest";
import { encode, lazy } from "./codecs";
import { JobError } from "./protocol";

describe("lazy codec init", () => {
  it("loads once, but does not keep a failed load: the next file tries again", async () => {
    const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("codec");
    const get = lazy(load);
    await expect(get()).rejects.toThrow("offline");
    await expect(get()).resolves.toBe("codec");
    await expect(get()).resolves.toBe("codec");
    expect(load).toHaveBeenCalledTimes(2);
    get.reset();
    await get();
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe("encode", () => {
  it("turns away WebP over 16383 px on a side before encoding, with its own reason", async () => {
    const wide = { width: 16384, height: 10, data: new Uint8ClampedArray(0) } as unknown as ImageData;
    const err = await encode(wide, "webp", 80).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(JobError);
    expect(err).toMatchObject({ code: "memory", kind: "webpTooLarge" });
  });
});
