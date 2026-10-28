// @vitest-environment node
import { crc32, deflateSync } from "node:zlib";
import { degrees, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { CAP_HEIGHT } from "./geometry";
import { createMeasurer, loadPdf, pageViews, watermarkPdf, type TextMark } from "./writer";

/** A tiny RGBA PNG (one opaque dark pixel, then transparent ones). */
function png(width: number, height: number): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  raw.set([0, 20, 20, 20, 255], 0);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/**
 * Four pages: a plain one; one rotated 90 degrees with a CropBox offset inside its MediaBox; one rotated
 * 270; one rotated 180 with a CropBox. Each carries a line of its own text.
 */
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const a = doc.addPage([300, 400]);
  a.drawText("Plain page", { x: 40, y: 340, size: 14, font });
  const b = doc.addPage([500, 600]);
  b.setCropBox(50, 40, 400, 500);
  b.setRotation(degrees(90));
  b.drawText("Rotated cropped page", { x: 80, y: 300, size: 14, font });
  const c = doc.addPage([400, 300]);
  c.setRotation(degrees(270));
  c.drawText("Turned page", { x: 40, y: 200, size: 14, font });
  const d = doc.addPage([612, 792]);
  d.setMediaBox(-20, -10, 612, 792);
  d.setCropBox(30, 60, 500, 600);
  d.setRotation(degrees(180));
  d.drawText("Upside down page", { x: 100, y: 300, size: 14, font });
  return doc.save();
}

/** Distinct image XObjects in a page's resources. */
function images(doc: PDFDocument, index: number): PDFRawStream[] {
  const xobjects = doc.getPage(index).node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjects) return [];
  const refs = new Map(xobjects.values().map((v) => [v.toString(), v as PDFRef]));
  return [...refs.values()]
    .map((ref) => doc.context.lookup(ref))
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream && s.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"));
}

interface Item {
  str: string;
  /** Baseline start and end, in the page's displayed coordinates (scale 1, y down). */
  start: { x: number; y: number };
  end: { x: number; y: number };
  size: number;
}

/** Every text run on each page, as PDF.js reads it, mapped into the displayed page (rotation and CropBox applied). */
async function readPages(bytes: Uint8Array): Promise<{ width: number; height: number; items: Item[] }[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false, verbosity: 0 }).promise;
  try {
    const out = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: Item[] = [];
      for (const i of content.items) {
        if (!("str" in i) || !i.str.trim()) continue;
        const m = pdfjs.Util.transform(viewport.transform, i.transform);
        const size = Math.hypot(m[2]!, m[3]!);
        // m maps text space (already scaled by the font size) to the screen; the run is i.width long in user space.
        const len = i.width;
        const dir = { x: m[0]! / Math.hypot(m[0]!, m[1]!), y: m[1]! / Math.hypot(m[0]!, m[1]!) };
        items.push({ str: i.str, start: { x: m[4]!, y: m[5]! }, end: { x: m[4]! + dir.x * len, y: m[5]! + dir.y * len }, size });
      }
      out.push({ width: viewport.width, height: viewport.height, items });
    }
    return out;
  } finally {
    await doc.loadingTask.destroy();
  }
}

const text = (over: Partial<TextMark> = {}): TextMark => ({
  kind: "text",
  text: "CONFIDENTIAL",
  bold: true,
  size: "fit",
  color: [0.5, 0.5, 0.5],
  opacity: 0.3,
  angle: "horizontal",
  layout: "single",
  ...over,
});

describe("watermarkPdf", () => {
  it("reports each page's displayed size", async () => {
    const doc = await loadPdf(await makePdf());
    expect(pageViews(doc)).toEqual([
      { width: 300, height: 400 },
      { width: 500, height: 400 },
      { width: 300, height: 400 },
      { width: 500, height: 600 },
    ]);
  });

  it("writes the text on the chosen pages only, centred and level as displayed, on rotated and cropped pages", async () => {
    const out = await watermarkPdf(await loadPdf(await makePdf()), text(), [1, 2, 3]);
    const pages = await readPages(out);
    expect(pages).toHaveLength(4);
    expect(pages[0]!.items.map((i) => i.str)).toEqual(["Plain page"]);
    for (const [n, own] of [
      [1, "Rotated cropped page"],
      [2, "Turned page"],
      [3, "Upside down page"],
    ] as const) {
      const page = pages[n]!;
      expect(page.items.map((i) => i.str)).toContain(own);
      const mark = page.items.find((i) => i.str === "CONFIDENTIAL");
      expect(mark, `page ${n + 1}`).toBeTruthy();
      // Level on screen, reading left to right.
      expect(mark!.end.y).toBeCloseTo(mark!.start.y, 3);
      expect(mark!.end.x).toBeGreaterThan(mark!.start.x);
      // Centred: the middle of the baseline sits half a cap height below the page centre.
      expect((mark!.start.x + mark!.end.x) / 2).toBeCloseTo(page.width / 2, 1);
      expect(mark!.start.y - (CAP_HEIGHT * mark!.size) / 2).toBeCloseTo(page.height / 2, 1);
      // Fitted to the displayed width.
      expect(mark!.end.x - mark!.start.x).toBeCloseTo(page.width * 0.86, 0);
    }
  });

  it("runs a diagonal from the bottom-left toward the top-right of the displayed page", async () => {
    const out = await watermarkPdf(await loadPdf(await makePdf()), text({ angle: "diagonal" }), [1, 3]);
    const pages = await readPages(out);
    for (const n of [1, 3]) {
      const page = pages[n]!;
      const mark = page.items.find((i) => i.str === "CONFIDENTIAL")!;
      const angle = (Math.atan2(-(mark.end.y - mark.start.y), mark.end.x - mark.start.x) * 180) / Math.PI;
      expect(angle).toBeCloseTo((Math.atan2(page.height, page.width) * 180) / Math.PI, 1);
    }
  });

  it("tiles many copies at the given size and shares one transparency setting", async () => {
    const doc = await loadPdf(await makePdf());
    const out = await watermarkPdf(doc, text({ text: "Copy for Mario Rossi", bold: false, size: 18, layout: "tile", angle: 30 }), [0, 1]);
    const pages = await readPages(out);
    // PDF.js joins copies that share a baseline into one run, so count the words.
    const copies = pages[0]!.items.filter((i) => i.str.includes("Mario"));
    const count = copies.reduce((n, i) => n + i.str.split("Mario").length - 1, 0);
    expect(count).toBeGreaterThan(6);
    for (const c of copies) expect(c.size).toBeCloseTo(18, 3);
    expect(pages[2]!.items.some((i) => i.str.includes("Mario"))).toBe(false);

    const saved = await PDFDocument.load(out);
    const states = [0, 1].map((i) => {
      const gs = saved.getPage(i).node.Resources()!.lookup(PDFName.of("ExtGState"), PDFDict);
      return gs.values().map((v) => v.toString());
    });
    expect(states[0]).toHaveLength(1);
    expect(states[0]).toEqual(states[1]);
    const gs = saved.context.lookup(PDFRef.of(Number(states[0]![0]!.split(" ")[0])), PDFDict);
    expect((gs.get(PDFName.of("ca")) as PDFNumber).asNumber()).toBeCloseTo(0.3);
  });

  it("embeds an image once and draws it on each chosen page", async () => {
    const out = await watermarkPdf(
      await loadPdf(await makePdf()),
      { kind: "image", bytes: png(4, 2), format: "png", scale: 0.4, opacity: 0.5, position: "bottom-right" },
      [0, 1, 3],
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(4);
    expect(images(doc, 0)).toHaveLength(1);
    expect(images(doc, 2)).toHaveLength(0);
    expect(images(doc, 0)[0]).toBe(images(doc, 3)[0]);
    expect(images(doc, 0)[0]!.dict.get(PDFName.of("SMask"))).toBeTruthy();
    // Page boxes and rotation are untouched.
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getCropBox()).toEqual({ x: 50, y: 40, width: 400, height: 500 });
    const pages = await readPages(out);
    expect(pages[1]!.items.map((i) => i.str)).toEqual(["Rotated cropped page"]);
  });

  it("measures text the way the writer draws it", async () => {
    const measure = await createMeasurer();
    const doc = await PDFDocument.create();
    const bold = doc.embedStandardFont(StandardFonts.HelveticaBold);
    expect(measure("BOZZA", true)).toBe(bold.widthOfTextAtSize("BOZZA", 1));
    expect(measure("BOZZA", false)).toBeLessThan(measure("BOZZA", true));
  });

  it("refuses an encrypted PDF with a clear error", async () => {
    const bytes = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n3 0 obj<</Filter/Standard/V 1/R 2/O(x)/U(x)/P -4>>endobj\ntrailer<</Root 1 0 R/Encrypt 3 0 R>>\n%%EOF",
    );
    await expect(loadPdf(bytes)).rejects.toEqual(new PdfToolError("encrypted"));
  });
});
