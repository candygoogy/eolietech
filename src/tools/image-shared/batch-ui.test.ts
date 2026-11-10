import { describe, expect, it } from "vitest";
import type { ToolCtx } from "../types";
import { claimedFormat, withSuffix, wrongTypeHint } from "./batch-ui";
import { WorkerPool } from "./pool";

const ctx = (toolId: string, locale: "en" | "it" = "en", preset: Record<string, unknown> = {}): ToolCtx => ({
  locale,
  toolId,
  preset,
  limits: { maxBytes: 0, maxFiles: 0 },
  t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
});

describe("withSuffix", () => {
  it("adds the suffix before the last extension", () => {
    expect(withSuffix("photo.jpg", "resized")).toBe("photo-resized.jpg");
    expect(withSuffix("scan.final.png", "compressed")).toBe("scan.final-compressed.png");
    expect(withSuffix("noext", "fit")).toBe("noext-fit");
    expect(withSuffix(".hidden", "fit")).toBe(".hidden-fit");
  });
  it("leaves the name alone without a suffix", () => {
    expect(withSuffix("photo.jpg")).toBe("photo.jpg");
  });
});

describe("claimedFormat", () => {
  it("reads the name first, then the MIME type", () => {
    expect(claimedFormat("IMG.HEIC", "")).toBe("heic");
    expect(claimedFormat("x", "image/heif")).toBe("heic");
    expect(claimedFormat("x", "image/png")).toBe("png");
    expect(claimedFormat("x.txt", "text/plain")).toBeNull();
  });
});

describe("wrongTypeHint", () => {
  it("sends a HEIC to HEIC to JPG, in the visitor's language", () => {
    expect(wrongTypeHint(ctx("image-compress"), "heic")?.href).toBe("/heic-to-jpg/");
    expect(wrongTypeHint(ctx("image-resize", "it"), "heic")?.href).toBe("/it/heic-in-jpg/");
    expect(wrongTypeHint(ctx("heic-to-jpg"), "heic")).toBeNull();
  });
  it("sends a JPG on a WebP converter to the matching converter", () => {
    const hint = wrongTypeHint(ctx("image-compress", "en", { from: "webp", to: "png" }), "jpg");
    expect(hint?.href).toBe("/jpg-to-png/");
    expect(wrongTypeHint(ctx("image-compress", "it", { from: "webp", to: "png" }), "jpg")?.href).toBe("/it/jpg-in-png/");
  });
  it("falls back to Compress images when no converter matches", () => {
    expect(wrongTypeHint(ctx("image-compress", "en", { from: "webp", to: "jpg" }), "jpg")?.href).toBe("/compress-image/");
    expect(wrongTypeHint(ctx("heic-to-jpg"), "png")?.href).toBe("/compress-image/");
  });
  it("has nothing to say on the base compress page or for unknown types", () => {
    expect(wrongTypeHint(ctx("image-compress"), "png")).toBeNull();
    expect(wrongTypeHint(ctx("image-compress"), null)).toBeNull();
  });
});

describe("WorkerPool.terminate", () => {
  it("ends the workers and settles jobs in flight, so the next run starts fresh", async () => {
    const made: { terminated: boolean }[] = [];
    const create = () => {
      const w = {
        terminated: false,
        onmessage: null,
        onerror: null,
        postMessage() {},
        terminate() {
          this.terminated = true;
        },
      };
      made.push(w);
      return w as unknown as Worker;
    };
    const pool = new WorkerPool(create, 1);
    const job = pool.run({ id: 1, buffer: new ArrayBuffer(1), settings: { output: "jpg", quality: 75 } });
    expect(pool.idle).toBe(0);
    pool.terminate();
    const res = await job;
    expect(res.ok).toBe(false);
    expect(made[0]!.terminated).toBe(true);
    expect(pool.idle).toBe(1);
    void pool.run({ id: 2, buffer: new ArrayBuffer(1), settings: { output: "jpg", quality: 75 } });
    expect(made).toHaveLength(2);
  });
});
