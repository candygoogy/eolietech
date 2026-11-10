// @vitest-environment node
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  boxFromDrag,
  moveBox,
  nudgeBox,
  coveredBy,
  outputPageSize,
  renderSize,
  resizeBox,
  spanOf,
  textBox,
  toPixels,
  type TextPiece,
} from "./geometry";
import { findPattern, noteBoxes, readNotes } from "./match";

/** One 300 x 400 pt page with "Hello SECRET world" at (40, 340), size 18, as PDF.js sees it. */
async function pageFor(edit: (page: import("pdf-lib").PDFPage) => void) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 400]);
  page.drawText("Hello SECRET world", { x: 40, y: 340, size: 18, font });
  edit(page);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: await doc.save(), verbosity: 0 }).promise;
  const p = await pdf.getPage(1);
  const viewport = p.getViewport({ scale: 1 });
  const items: TextPiece[] = (await p.getTextContent()).items.flatMap((i) => ("str" in i ? [i] : []));
  // Where the glyphs really are: the PDF's own font metrics.
  const at = (s: string) => 40 + font.widthOfTextAtSize(s, 18);
  return { viewport, item: items[0]!, at };
}

const PAD = 18 * 0.2;

const close = (actual: number, expected: number, within = 0.6) => expect(Math.abs(actual - expected)).toBeLessThan(within);

describe("textBox: a substring's box in viewport points", () => {
  it("places SECRET where its glyphs are, padded, on an upright page", async () => {
    const { viewport, item, at } = await pageFor(() => {});
    const b = textBox(item, 6, 12, viewport.transform);
    // Baseline 340 pt is 60 pt from the top.
    close(b.x, at("Hello ") - PAD);
    close(b.x + b.w, at("Hello SECRET") + PAD);
    close(b.y, 60 - 18 * 0.95);
    close(b.y + b.h, 60 + 18 * 0.3);
  });

  it("follows /Rotate 90: the text runs down the right side of the visible page", async () => {
    const { viewport, item, at } = await pageFor((page) => page.setRotation(degrees(90)));
    expect([viewport.width, viewport.height]).toEqual([400, 300]);
    const b = textBox(item, 6, 12, viewport.transform);
    // 40 pt from the original left edge is now 40 pt from the top; 60 pt from the original top is 60 pt from the right.
    close(b.y, at("Hello ") - PAD);
    close(b.y + b.h, at("Hello SECRET") + PAD);
    close(b.x, 340 - 18 * 0.3);
    close(b.x + b.w, 340 + 18 * 0.95);
  });

  it("measures from the CropBox corner, not the MediaBox", async () => {
    const { viewport, item } = await pageFor((page) => page.setCropBox(20, 30, 260, 350));
    expect([viewport.width, viewport.height]).toEqual([260, 350]);
    const b = textBox(item, 0, 5, viewport.transform);
    close(b.x, 20 - PAD);
    close(b.y + b.h, 380 - 340 + 18 * 0.3);
  });
});

describe("glyph widths", () => {
  it("spreads an item's width by typical letter widths, accents and all", () => {
    const [a, b] = spanOf("Email: mario", 7, 12);
    // "Email: " is 3056 of 5556 thousandths of an em, not 7/12 of the line.
    close(a, 3056 / 5556, 0.001);
    expect(b).toBe(1);
    expect(spanOf("città", 0, 5)).toEqual([0, 1]);
    expect(spanOf("ab", 1, 2)[0]).toBe(0.5);
  });

  it("shares a Courier line out evenly, so the box covers the start of the match", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Courier);
    // Wide capitals before the match, narrow letters in it: where Helvetica's widths mislead most.
    const line = "EMAIL:lilli.gilli@tin.it";
    doc.addPage([400, 400]).drawText(line, { x: 40, y: 340, size: 12, font });
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const page = await (await pdfjs.getDocument({ data: await doc.save(), verbosity: 0 }).promise).getPage(1);
    const content = await page.getTextContent();
    const item = content.items.flatMap((i) => ("str" in i ? [i] : []))[0]!;
    expect(item.str).toBe(line);
    // What client.ts reads to set `mono`.
    expect(content.styles[item.fontName]?.fontFamily).toBe("monospace");
    const from = line.indexOf("lilli");
    const start = 40 + font.widthOfTextAtSize(line.slice(0, from), 12);
    const transform = page.getViewport({ scale: 1 }).transform;
    const b = textBox({ ...item, mono: true }, from, line.length, transform);
    close(b.x, start - 12 * 0.2);
    close(b.x + b.w, 40 + font.widthOfTextAtSize(line, 12) + 12 * 0.2);
    // Helvetica's widths would start the box more than a letter (7.2 pt) inside the match, padding included.
    expect(textBox(item, from, line.length, transform).x).toBeGreaterThan(start + 7.2);
  });
});

describe("form fields", () => {
  it("finds a filled-in field as PDF.js reports it and boxes its rectangle", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 400]);
    const field = doc.getForm().createTextField("cf");
    field.setText("RSSMRA85T10A562S");
    field.addToPage(page, { x: 40, y: 200, width: 200, height: 20, borderWidth: 0 });
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const p = await (await pdfjs.getDocument({ data: await doc.save(), verbosity: 0 }).promise).getPage(1);
    // The page's own text does not hold the field's value: only the annotation does.
    expect((await p.getTextContent()).items).toHaveLength(0);
    const { notes, unread } = readNotes(await p.getAnnotations());
    expect(unread).toBe(0);
    expect(notes).toHaveLength(1);
    const boxes = noteBoxes(notes, (text) => findPattern(text, "cf"), p.getViewport({ scale: 1 }).transform, 300, 400);
    // 200 pt from the bottom of a 400 pt page, 20 pt tall: 180 to 200 pt from the top.
    expect(boxes).toEqual([[{ x: 40, y: 180, w: 200, h: 20 }]]);
  });
});

describe("box editing", () => {
  it("draws in any direction, moves and resizes inside the page", () => {
    expect(boxFromDrag(100, 80, 20, 10, 300, 400)).toEqual({ x: 20, y: 10, w: 80, h: 70 });
    expect(boxFromDrag(-50, -5, 400, 20, 300, 400)).toEqual({ x: 0, y: 0, w: 300, h: 20 });
    const b = { x: 10, y: 10, w: 50, h: 20 };
    expect(moveBox(b, 1000, -1000, 300, 400)).toEqual({ x: 250, y: 0, w: 50, h: 20 });
    expect(resizeBox(b, "nw", -20, 5, 300, 400)).toEqual({ x: 0, y: 15, w: 60, h: 15 });
    expect(resizeBox(b, "e", -100, 0, 300, 400).w).toBe(2);
    expect(nudgeBox(b, "ArrowRight", 10, false, 300, 400)).toEqual({ x: 20, y: 10, w: 50, h: 20 });
    expect(nudgeBox(b, "ArrowDown", 1, true, 300, 400)).toEqual({ x: 10, y: 10, w: 50, h: 21 });
  });

  it("measures how much of a box another box already covers", () => {
    expect(coveredBy({ x: 2, y: 2, w: 4, h: 4 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(1);
    expect(coveredBy({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 })).toBe(0.5);
    expect(coveredBy({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(0);
  });
});

describe("rendering sizes", () => {
  it("renders A4 at 200 dpi and caps a poster", () => {
    const a4 = renderSize(595, 842, 200);
    expect([a4.width, a4.height, a4.capped]).toEqual([1652, 2338, false]);
    const poster = renderSize(2384, 3370, 200);
    expect(poster.capped).toBe(true);
    expect(poster.width * poster.height).toBeLessThanOrEqual(4096 * 4096);
  });

  it("grows a box outwards to whole pixels", () => {
    expect(toPixels({ x: 10.2, y: 0.5, w: 5, h: 2 }, 2, 100, 100)).toEqual({ x: 20, y: 1, w: 11, h: 4 });
    expect(toPixels({ x: 45, y: 45, w: 20, h: 20 }, 2, 100, 100)).toEqual({ x: 90, y: 90, w: 10, h: 10 });
  });

  it("keeps the output page within the largest size readers accept", () => {
    expect(outputPageSize(595, 842)).toEqual({ width: 595, height: 842 });
    expect(outputPageSize(28800, 7200)).toEqual({ width: 14400, height: 3600 });
  });
});
