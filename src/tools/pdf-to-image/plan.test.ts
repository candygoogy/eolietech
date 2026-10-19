import { describe, expect, it } from "vitest";
import { MAX_PIXELS, MAX_SIDE, initialFormat, padPage, pageSize, planPages } from "./plan";

describe("pageSize", () => {
  it("converts points to pixels at the chosen dpi", () => {
    // A4 is 595 x 842 pt.
    expect(pageSize(595, 842, 72)).toEqual({ scale: 1, width: 595, height: 842, capped: false });
    expect(pageSize(595, 842, 150)).toMatchObject({ width: 1239, height: 1754, capped: false });
    expect(pageSize(595, 842, 300)).toMatchObject({ width: 2479, height: 3508, capped: false });
  });

  it("scales a huge page down proportionally to the pixel cap", () => {
    // A0 poster (2384 x 3370 pt) at 300 dpi would be about 138 MP.
    const s = pageSize(2384, 3370, 300);
    expect(s.capped).toBe(true);
    expect(s.width * s.height).toBeLessThanOrEqual(MAX_PIXELS);
    expect(s.width * s.height).toBeGreaterThan(MAX_PIXELS * 0.99);
    expect(s.width / s.height).toBeCloseTo(2384 / 3370, 2);
  });

  it("caps the longest side of a long strip", () => {
    const s = pageSize(100, 20000, 300);
    expect(s.capped).toBe(true);
    expect(s.height).toBeLessThanOrEqual(MAX_SIDE);
    expect(s.width).toBeGreaterThanOrEqual(1);
  });

  it("never returns a zero-sized image", () => {
    expect(pageSize(0.1, 0.1, 72)).toMatchObject({ width: 1, height: 1 });
  });
});

describe("planPages", () => {
  it("selects every page", () => {
    expect(planPages({ kind: "all" }, 3)).toEqual({ ok: true, pages: [1, 2, 3] });
  });

  it("parses ranges into sorted, unique page numbers", () => {
    expect(planPages({ kind: "ranges", input: "5, 1-3, 2" }, 6)).toEqual({ ok: true, pages: [1, 2, 3, 5] });
    expect(planPages({ kind: "ranges", input: "4-" }, 6)).toEqual({ ok: true, pages: [4, 5, 6] });
  });

  it("reports the shared range errors", () => {
    expect(planPages({ kind: "ranges", input: " " }, 3)).toEqual({ ok: false, error: { code: "empty" } });
    expect(planPages({ kind: "ranges", input: "9" }, 3)).toMatchObject({ ok: false, error: { code: "outOfRange", pages: 3 } });
    expect(planPages({ kind: "ranges", input: "3-1" }, 3)).toMatchObject({ ok: false, error: { code: "reversed" } });
    expect(planPages({ kind: "ranges", input: "a" }, 3)).toMatchObject({ ok: false, error: { code: "syntax" } });
  });
});

describe("padPage", () => {
  it("pads to the page count width, at least two digits", () => {
    expect(padPage(1, 1)).toBe("01");
    expect(padPage(3, 9)).toBe("03");
    expect(padPage(12, 40)).toBe("12");
    expect(padPage(7, 120)).toBe("007");
  });
});

describe("initialFormat", () => {
  it("starts with JPG unless the preset asks for PNG", () => {
    expect(initialFormat({})).toBe("jpg");
    expect(initialFormat({ from: "pdf", to: "png" })).toBe("png");
  });
});
