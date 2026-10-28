import { describe, expect, it } from "vitest";
import { userToView, viewSize, viewToUser, visibleBox, type Box, type Rotation } from "../pdf-shared/page-box";
import {
  alongBaseline,
  ASCENT,
  DESCENT,
  formatLabel,
  labelOrigin,
  numbering,
  parseDecimal,
  parseWhole,
  placeLabel,
  POSITIONS,
  type Position,
} from "./layout";

const ROTATIONS: Rotation[] = [0, 90, 180, 270];
/** A media box with a CropBox well inside it, off-centre on both axes. */
const MEDIA: Box = { x: 0, y: 0, width: 600, height: 800 };
const CROP: Box = { x: 50, y: 100, width: 400, height: 500 };

describe("numbering", () => {
  it("numbers every page from 1 by default", () => {
    expect(numbering(5, 1, 1)).toEqual({ numbers: [1, 2, 3, 4, 5], total: 5 });
  });

  it("skips pages before the first page to number (a cover)", () => {
    expect(numbering(5, 2, 1)).toEqual({ numbers: [null, 1, 2, 3, 4], total: 4 });
  });

  it("starts counting at any number", () => {
    expect(numbering(3, 1, 10)).toEqual({ numbers: [10, 11, 12], total: 12 });
    expect(numbering(4, 3, 0)).toEqual({ numbers: [null, null, 0, 1], total: 1 });
  });

  it("keeps the first page inside the document", () => {
    expect(numbering(2, 9, 1)).toEqual({ numbers: [null, 1], total: 1 });
    expect(numbering(2, 0, 1)).toEqual({ numbers: [1, 2], total: 2 });
  });
});

describe("formatLabel", () => {
  it("formats each style", () => {
    expect(formatLabel("number", 1, 12, "Page {n} of {total}")).toBe("1");
    expect(formatLabel("slash", 1, 12, "Page {n} of {total}")).toBe("1 / 12");
    expect(formatLabel("words", 1, 12, "Page {n} of {total}")).toBe("Page 1 of 12");
  });

  it("uses the localised words", () => {
    expect(formatLabel("words", 3, 12, "Pagina {n} di {total}")).toBe("Pagina 3 di 12");
  });

  it("writes plain digits, no grouping", () => {
    expect(formatLabel("slash", 1000, 12000, "")).toBe("1000 / 12000");
  });
});

describe("parsing fields", () => {
  it("parseWhole takes whole numbers in range only", () => {
    expect(parseWhole(" 2 ", 1, 5)).toBe(2);
    expect(parseWhole("0", 0, 5)).toBe(0);
    expect(parseWhole("6", 1, 5)).toBeNull();
    expect(parseWhole("1.5", 1, 5)).toBeNull();
    expect(parseWhole("-1", 0, 5)).toBeNull();
    expect(parseWhole("", 0, 5)).toBeNull();
  });

  it("parseDecimal takes a point or a comma", () => {
    expect(parseDecimal("10", 0, 50)).toBe(10);
    expect(parseDecimal("12,5", 0, 50)).toBe(12.5);
    expect(parseDecimal("7.25", 0, 50)).toBe(7.25);
    expect(parseDecimal("51", 0, 50)).toBeNull();
    expect(parseDecimal("abc", 0, 50)).toBeNull();
  });
});

describe("labelOrigin (in the view)", () => {
  const page = { width: 400, height: 500 };
  const size = 10;
  const w = 30;
  const m = 20;
  const top = m + ASCENT * size;
  const bottom = 500 - m - DESCENT * size;
  const cases: [Position, number, number][] = [
    ["top-left", m, top],
    ["top-center", (400 - w) / 2, top],
    ["top-right", 400 - m - w, top],
    ["bottom-left", m, bottom],
    ["bottom-center", (400 - w) / 2, bottom],
    ["bottom-right", 400 - m - w, bottom],
  ];
  it.each(cases)("%s", (position, x, y) => {
    const o = labelOrigin(page, position, m, w, size);
    expect(o.x).toBeCloseTo(x, 6);
    expect(o.y).toBeCloseTo(y, 6);
  });

  it("pulls a label that does not fit back onto the page", () => {
    const o = labelOrigin({ width: 100, height: 60 }, "bottom-right", 80, 50, 10);
    expect(o.x).toBe(0);
    expect(o.y).toBeCloseTo(ASCENT * 10, 6);
  });
});

describe("placeLabel (rotation and CropBox aware)", () => {
  const size = 11;
  const w = 42;
  const margin = 28;

  for (const r of ROTATIONS) {
    for (const position of POSITIONS) {
      it(`${position} on a page turned ${r}° with an offset CropBox`, () => {
        const box = visibleBox(MEDIA, CROP);
        const view = viewSize(box, r);
        const p = placeLabel(box, r, position, margin, w, size);
        // The baseline starts where the layout wants it, as the reader sees the page.
        const want = labelOrigin(view, position, margin, w, size);
        const start = userToView(p.x, p.y, box, r);
        expect(start.x).toBeCloseTo(want.x, 9);
        expect(start.y).toBeCloseTo(want.y, 9);
        // And it reads left to right on screen: the end of the baseline is `w` to the right.
        const end = userToView(alongBaseline(p, w).x, alongBaseline(p, w).y, box, r);
        expect(end.x).toBeCloseTo(want.x + w, 9);
        expect(end.y).toBeCloseTo(want.y, 9);
        expect(p.rotate).toBe(r);
        // The whole text box sits inside the CropBox, `margin` from the edges it is anchored to.
        for (const [a, b] of [
          [0, -ASCENT * size],
          [w, -ASCENT * size],
          [0, DESCENT * size],
          [w, DESCENT * size],
        ] as const) {
          const u = viewToUser(want.x + a, want.y + b, box, r);
          expect(u.x).toBeGreaterThanOrEqual(CROP.x - 1e-9);
          expect(u.x).toBeLessThanOrEqual(CROP.x + CROP.width + 1e-9);
          expect(u.y).toBeGreaterThanOrEqual(CROP.y - 1e-9);
          expect(u.y).toBeLessThanOrEqual(CROP.y + CROP.height + 1e-9);
        }
      });
    }
  }

  it("puts bottom centre at the right spot in user space for each rotation", () => {
    const box = CROP;
    const d = DESCENT * 10;
    // Unrotated: centred on the crop's width, `margin + descent` above its bottom edge.
    expect(placeLabel(box, 0, "bottom-center", 20, 10, 10)).toEqual({ x: 50 + 195, y: 100 + 20 + d, rotate: 0 });
    // Turned 90° clockwise on screen: the crop's right edge is the bottom; text runs up the page.
    let p = placeLabel(box, 90, "bottom-center", 20, 10, 10);
    expect(p.x).toBeCloseTo(450 - 20 - d, 9);
    expect(p.y).toBeCloseTo(100 + 245, 9);
    expect(p.rotate).toBe(90);
    // Upside down: the crop's top edge is the bottom; text runs right to left.
    p = placeLabel(box, 180, "bottom-center", 20, 10, 10);
    expect(p.x).toBeCloseTo(450 - 195, 9);
    expect(p.y).toBeCloseTo(600 - 20 - d, 9);
    // Turned 270°: the crop's left edge is the bottom; text runs down the page.
    p = placeLabel(box, 270, "bottom-center", 20, 10, 10);
    expect(p.x).toBeCloseTo(50 + 20 + d, 9);
    expect(p.y).toBeCloseTo(600 - 245, 9);
  });
});
