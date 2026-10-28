import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectJpeg } from "../exif-remover/jpeg";
import { inspectWebp } from "../exif-remover/webp";
import { keepAsIs } from "./keep";

const FIXTURES = path.resolve(__dirname, "../../../e2e/fixtures/image");
const load = (name: string): ArrayBuffer => {
  const b = readFileSync(path.join(FIXTURES, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const text = (b: ArrayBuffer) => Buffer.from(b).toString("latin1");

describe("keepAsIs", () => {
  it("keeps a JPG under the target without its metadata, only the rotation flag", () => {
    const original = load("exif-gps.jpg");
    const kept = keepAsIs(original, "jpg", "jpg", 20_000)!;
    expect(kept).not.toBeNull();
    expect(kept.byteLength).toBeLessThan(original.byteLength);
    const report = inspectJpeg(new Uint8Array(kept));
    expect(report.gps).toBeNull();
    expect(report.exif).toMatchObject({ orientation: 6, otherTags: 0, hasGpsBlock: false });
    expect(report.exif?.make).toBeUndefined();
    expect(report.blocks).toEqual([]);
    expect(text(kept)).not.toContain("GPS");
  });

  it("keeps a WebP the same way", () => {
    const kept = keepAsIs(load("exif-gps.webp"), "webp", "webp", 20_000)!;
    const report = inspectWebp(new Uint8Array(kept));
    expect(report.gps).toBeNull();
    expect(report.blocks).toEqual([]);
    expect(text(kept)).not.toContain("GPS");
  });

  it("re-encodes when the format differs, the file is too big, or there is no cleaner", () => {
    const jpg = load("exif-gps.jpg");
    expect(keepAsIs(jpg, "jpg", "webp", 20_000)).toBeNull();
    expect(keepAsIs(jpg, "jpg", "jpg", 100)).toBeNull();
    expect(keepAsIs(load("sample.avif"), "avif", "avif", 20_000)).toBeNull();
  });

  it("only keeps files whose original already fits, and re-encodes unreadable ones", () => {
    const original = load("exif-gps.jpg");
    const cleaned = keepAsIs(original, "jpg", "jpg", original.byteLength)!;
    // Over the target as uploaded, even though the cleaned copy would fit: re-encoded.
    expect(keepAsIs(original, "jpg", "jpg", cleaned.byteLength)).toBeNull();
    // A JPEG the cleaner cannot walk.
    expect(keepAsIs(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 4, 1]).buffer, "jpg", "jpg", 20_000)).toBeNull();
  });
});
