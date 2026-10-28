// @vitest-environment node
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { DESCENT, labelOrigin, mmToPt, type Position } from "./layout";
import { addPageNumbers, loadPdf, pageViews, textWidth, type NumberSettings } from "./writer";

const WORDS = "Page {n} of {total}";
const base: NumberSettings = {
  position: "bottom-center",
  format: "number",
  startAt: 1,
  firstPage: 1,
  size: 11,
  margin: mmToPt(10),
  words: WORDS,
};

/** Pages turned 0, 90, 180 and 270 degrees, each with a CropBox offset inside a larger MediaBox. */
async function awkwardPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const angle of [0, 90, 180, 270]) {
    const page = doc.addPage([600, 800]);
    page.drawText(`body ${angle}`, { x: 100, y: 400, size: 20, font });
    page.setCropBox(50, 100, 400, 500);
    page.setRotation(degrees(angle));
  }
  return doc.save();
}

async function plainPdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return doc.save();
}

interface Found {
  str: string;
  /** Baseline origin and a point 10 units along the baseline, in the view (PDF.js viewport at scale 1). */
  start: [number, number];
  ahead: [number, number];
}

/** Read the result back with PDF.js, independently of our own geometry: every text run, as displayed. */
async function readBack(bytes: Uint8Array): Promise<Found[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: Found[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    out.push(
      content.items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        const [a, b, c, d, e, f] = item.transform as number[];
        // Unit vector along the baseline (the transform includes the font size).
        const len = Math.hypot(a!, b!) || 1;
        void c;
        void d;
        const start = viewport.convertToViewportPoint(e!, f!) as [number, number];
        const ahead = viewport.convertToViewportPoint(e! + (a! / len) * 10, f! + (b! / len) * 10) as [number, number];
        return [{ str: item.str, start, ahead }];
      }),
    );
  }
  await pdf.loadingTask.destroy();
  return out;
}

describe("addPageNumbers", () => {
  it("keeps the page count and numbers every page", async () => {
    const doc = await loadPdf(await plainPdf(5));
    const out = await addPageNumbers(doc, { ...base, format: "words" });
    const pages = await readBack(out);
    expect(pages).toHaveLength(5);
    expect(pages.map((p) => p.map((f) => f.str).join(" "))).toEqual([1, 2, 3, 4, 5].map((n) => `Page ${n} of 5`));
  });

  it("skips the pages before the first page to number and counts from the start number", async () => {
    const doc = await loadPdf(await plainPdf(4));
    const out = await addPageNumbers(doc, { ...base, format: "slash", firstPage: 2, startAt: 7 });
    const pages = await readBack(out);
    expect(pages.map((p) => p.map((f) => f.str).join(" "))).toEqual(["", "7 / 9", "8 / 9", "9 / 9"]);
  });

  it("writes Italian words in Helvetica", async () => {
    const doc = await loadPdf(await plainPdf(2));
    const out = await addPageNumbers(doc, { ...base, format: "words", words: "Pagina {n} di {total}" });
    const pages = await readBack(out);
    expect(pages[1]!.map((f) => f.str).join(" ")).toBe("Pagina 2 di 2");
  });

  it("measures the page as displayed (rotation and CropBox)", async () => {
    const doc = await loadPdf(await awkwardPdf());
    expect(pageViews(doc)).toEqual([
      { width: 400, height: 500 },
      { width: 500, height: 400 },
      { width: 400, height: 500 },
      { width: 500, height: 400 },
    ]);
  });

  const positions: Position[] = ["bottom-center", "top-left", "bottom-right", "top-right"];
  it.each(positions)("puts %s upright, where the reader sees it, on rotated and cropped pages", async (position) => {
    const bytes = await awkwardPdf();
    const doc = await loadPdf(bytes);
    const views = pageViews(doc);
    const out = await addPageNumbers(doc, { ...base, position, format: "words" });
    const pages = await readBack(out);
    for (const [i, found] of pages.entries()) {
      const label = `Page ${i + 1} of 4`;
      const hit = found.find((f) => f.str === label);
      expect(hit, `page ${i + 1}: ${found.map((f) => f.str).join(" | ")}`).toBeDefined();
      const want = labelOrigin(views[i]!, position, base.margin, textWidth(label, base.size), base.size);
      expect(hit!.start[0]).toBeCloseTo(want.x, 3);
      expect(hit!.start[1]).toBeCloseTo(want.y, 3);
      // Upright: the baseline runs to the right on screen.
      expect(hit!.ahead[0] - hit!.start[0]).toBeCloseTo(10, 3);
      expect(hit!.ahead[1] - hit!.start[1]).toBeCloseTo(0, 3);
      // Inside the visible page.
      expect(hit!.start[1] + DESCENT * base.size).toBeLessThanOrEqual(views[i]!.height);
    }
  });

  it("rejects a password-protected PDF with the shared error", async () => {
    const bytes = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n3 0 obj<</Filter/Standard/V 1/R 2/O(x)/U(x)/P -4>>endobj\ntrailer<</Root 1 0 R/Encrypt 3 0 R>>\n%%EOF",
    );
    await expect(loadPdf(bytes)).rejects.toEqual(new PdfToolError("encrypted"));
  });
});
