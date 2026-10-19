// @vitest-environment node
import { crc32, deflateSync } from "node:zlib";
import { degrees, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { loadPdf, pageViews, signPdf } from "./writer";

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

/** Two text pages; the second is rotated 90 degrees and has a CropBox offset from its MediaBox. */
async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const a = doc.addPage([300, 400]);
  a.drawText("Contract page one", { x: 40, y: 340, size: 14, font });
  const b = doc.addPage([500, 600]);
  b.setCropBox(50, 40, 400, 500);
  b.setRotation(degrees(90));
  b.drawText("Signature goes here", { x: 80, y: 300, size: 14, font });
  return doc.save();
}

/** Distinct image XObjects in a page's resources (pdf-lib names each draw, but they share one object). */
function images(doc: PDFDocument, index: number): PDFRawStream[] {
  const xobjects = doc.getPage(index).node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjects) return [];
  const refs = new Map(xobjects.values().map((v) => [v.toString(), v as PDFRef]));
  return [...refs.values()]
    .map((ref) => doc.context.lookup(ref))
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream && s.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"));
}

async function pageText(bytes: Uint8Array, page: number): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false, verbosity: 0 }).promise;
  try {
    const content = await (await doc.getPage(page)).getTextContent();
    return content.items.map((i) => ("str" in i ? i.str : "")).join("");
  } finally {
    await doc.loadingTask.destroy();
  }
}

describe("signPdf", () => {
  it("reports each page's displayed size", async () => {
    const doc = await loadPdf(await makePdf());
    expect(pageViews(doc)).toEqual([
      { width: 300, height: 400 },
      { width: 500, height: 400 },
    ]);
  });

  it("adds images to the chosen page only and keeps everything else", async () => {
    const source = await makePdf();
    const sig = png(6, 2);
    const date = png(8, 1);
    const out = await signPdf(await loadPdf(source), { sig, date }, [
      { page: 1, image: "sig", rect: { x: 300, y: 300, w: 150, h: 50 } },
      { page: 1, image: "sig", rect: { x: 20, y: 20, w: 60, h: 20 } },
      { page: 1, image: "date", rect: { x: 300, y: 360, w: 80, h: 10 } },
    ]);

    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(images(doc, 0)).toHaveLength(0);
    // Two placements of the signature share one embedded image.
    expect(images(doc, 1)).toHaveLength(2);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getCropBox()).toEqual({ x: 50, y: 40, width: 400, height: 500 });

    expect(await pageText(out, 1)).toContain("Contract page one");
    expect(await pageText(out, 2)).toContain("Signature goes here");
  });

  it("refuses an encrypted PDF with a clear error", async () => {
    // A minimal trailer with /Encrypt is enough for pdf-lib to refuse it.
    const bytes = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n3 0 obj<</Filter/Standard/V 1/R 2/O(x)/U(x)/P -4>>endobj\ntrailer<</Root 1 0 R/Encrypt 3 0 R>>\n%%EOF",
    );
    await expect(loadPdf(bytes)).rejects.toEqual(new PdfToolError("encrypted"));
  });
});
