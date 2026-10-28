import { describe, expect, it } from "vitest";
import {
  MIN_SIDE,
  Q_MAX,
  Q_MIN,
  minScale,
  nextQuality,
  scaledSize,
  scaleForBytes,
  searchFit,
  slopeFrom,
  type Size,
} from "./search";

/**
 * A stand-in encoder: bytes = k * pixels^exp * e^(slope * (q - 40)), monotonic in size and quality
 * like a real one. With the defaults, 12 MP at q 40 is about 630 KB.
 */
function model({ k = 0.6, exp = 0.85, slope = 0.03 } = {}) {
  const bytes = (s: Size, q: number) => Math.round(k * Math.pow(s.width * s.height, exp) * Math.exp(slope * (q - 40)));
  const calls: { size: Size; q: number }[] = [];
  const encode = async (size: Size, q: number) => {
    calls.push({ size, q });
    return bytes(size, q);
  };
  return { bytes, calls, encode };
}

describe("helpers", () => {
  it("scales and clamps sizes", () => {
    expect(scaledSize(4000, 3000, 1)).toEqual({ width: 4000, height: 3000 });
    expect(scaledSize(4000, 3000, 0.25)).toEqual({ width: 1000, height: 750 });
    expect(scaledSize(4000, 3000, 0.00001)).toEqual({ width: 1, height: 1 });
    expect(minScale(4000, 3000)).toBe(MIN_SIDE / 4000);
    expect(minScale(150, 100)).toBe(1);
  });

  it("estimates the scale for a byte budget from bytes ~ pixels^0.85", () => {
    // Four times fewer bytes: pixels / 4^(1/0.85), so the side shrinks by 4^(1/1.7).
    expect(scaleForBytes(1, 400_000, 100_000)).toBeCloseTo(Math.pow(0.25, 1 / 1.7), 6);
  });

  it("learns the quality slope, within plausible bounds", () => {
    expect(slopeFrom({ quality: 40, bytes: 1000 }, { quality: 80, bytes: 1000 * Math.exp(1.2) })).toBeCloseTo(0.03, 6);
    expect(slopeFrom({ quality: 40, bytes: 1000 }, { quality: 80, bytes: 1000 })).toBe(0.005);
    expect(slopeFrom({ quality: 40, bytes: 1000 }, { quality: 40, bytes: 2000 })).toBe(0.03);
  });
});

describe("nextQuality", () => {
  it("stops when the bracket is closed or a bound is reached", () => {
    expect(nextQuality({ quality: 70, bytes: 90 }, { quality: 71, bytes: 101 }, 100, 0.03)).toBeNull();
    expect(nextQuality({ quality: Q_MAX, bytes: 50 }, null, 100, 0.03)).toBeNull();
    expect(nextQuality(null, { quality: Q_MIN, bytes: 150 }, 100, 0.03)).toBeNull();
    expect(nextQuality(null, null, 100, 0.03)).toBeNull();
  });

  it("stays strictly inside a bracket", () => {
    for (const [lo, hi] of [[40, 43], [50, 90], [70, 72]] as const) {
      const q = nextQuality({ quality: lo, bytes: 80 }, { quality: hi, bytes: 120 }, 100, 0.03)!;
      expect(q).toBeGreaterThan(lo);
      expect(q).toBeLessThan(hi);
    }
  });

  it("moves up from a fit and down from an overshoot, within the quality range", () => {
    expect(nextQuality({ quality: 60, bytes: 50 }, null, 100, 0.03)).toBeGreaterThan(60);
    expect(nextQuality({ quality: 90, bytes: 10 }, null, 100, 0.03)).toBe(Q_MAX);
    expect(nextQuality(null, { quality: 80, bytes: 200 }, 100, 0.03)).toBeLessThan(80);
    expect(nextQuality(null, { quality: 45, bytes: 10_000 }, 100, 0.03)).toBe(Q_MIN);
  });
});

describe("searchFit", () => {
  it("keeps the full size at the top quality when that already fits", async () => {
    const m = model();
    const r = await searchFit({ width: 300, height: 200, targetBytes: 10_000_000, encode: m.encode });
    expect(r).toMatchObject({ ok: true, fit: { width: 300, height: 200, quality: Q_MAX } });
  });

  it("finds the highest quality that fits at full size", async () => {
    const m = model();
    // 800 x 600 at q 40 is ~ 49 KB with this model; 80 KB fits somewhere in between.
    const r = await searchFit({ width: 800, height: 600, targetBytes: 80_000, encode: m.encode });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fit).toMatchObject({ width: 800, height: 600 });
    expect(r.fit.bytes).toBeLessThanOrEqual(80_000);
    expect(r.fit.quality).toBeGreaterThan(Q_MIN);
    expect(m.bytes(r.fit, r.fit.quality + 1)).toBeGreaterThan(80_000);
    expect(r.encodes).toBeLessThanOrEqual(6);
  });

  for (const target of [20_000, 50_000, 100_000, 200_000]) {
    it(`scales a 12 MP photo down to fit ${target / 1000} KB, near the largest size that can`, async () => {
      const m = model();
      const r = await searchFit({ width: 4000, height: 3000, targetBytes: target, encode: m.encode });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.fit.bytes).toBeLessThanOrEqual(target);
      expect(r.fit.bytes).toBe(m.bytes(r.fit, r.fit.quality));
      expect(r.fit.width / r.fit.height).toBeCloseTo(4 / 3, 1);
      expect(r.fit.quality).toBeGreaterThanOrEqual(Q_MIN);
      // Not needlessly small: 10% larger would not fit even at the quality floor.
      expect(m.bytes(scaledSize(4000, 3000, (r.fit.width * 1.1) / 4000), Q_MIN)).toBeGreaterThan(target);
      // Highest quality at that size.
      if (r.fit.quality < Q_MAX) expect(m.bytes(r.fit, r.fit.quality + 1)).toBeGreaterThan(target);
      // Big encodes are the slow part: the full 12 MP image is never encoded.
      expect(m.calls.every((c) => c.size.width < 4000)).toBe(true);
      expect(r.encodes).toBeLessThanOrEqual(10);
    });
  }

  it("still converges when the image compresses differently from the estimate", async () => {
    for (const shape of [{ exp: 1 }, { exp: 0.7 }, { slope: 0.06 }, { slope: 0.012 }, { k: 3 }]) {
      const m = model(shape);
      const r = await searchFit({ width: 6000, height: 4000, targetBytes: 100_000, encode: m.encode });
      expect(r.ok, JSON.stringify(shape)).toBe(true);
      if (!r.ok) continue;
      expect(r.fit.bytes).toBeLessThanOrEqual(100_000);
      expect(r.encodes, JSON.stringify(shape)).toBeLessThanOrEqual(16);
    }
  });

  it("fails cleanly when even the smallest size at the quality floor is too big", async () => {
    const m = model();
    const r = await searchFit({ width: 4000, height: 3000, targetBytes: 1_000, encode: m.encode });
    expect(r.ok).toBe(false);
    // It went down to MIN_SIDE before giving up, and no further.
    const smallest = Math.min(...m.calls.map((c) => Math.max(c.size.width, c.size.height)));
    expect(smallest).toBe(MIN_SIDE);
    expect(r.encodes).toBeLessThanOrEqual(20);
  });

  it("never scales an image already smaller than the minimum side", async () => {
    const m = model();
    const r = await searchFit({ width: 120, height: 90, targetBytes: 100, encode: m.encode });
    expect(r.ok).toBe(false);
    expect(m.calls.every((c) => c.size.width === 120 && c.size.height === 90)).toBe(true);
  });

  it("keeps portrait images portrait", async () => {
    const m = model();
    const r = await searchFit({ width: 3000, height: 4000, targetBytes: 50_000, encode: m.encode });
    expect(r.ok && r.fit.height > r.fit.width).toBe(true);
  });
});
