import { PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPages, loadPdf, mergeDocuments, PdfToolError, rearrangePages } from "./pdf-ops";

/** A PDF whose pages have distinct widths (100, 101, ...) so order can be checked after saving. */
async function makePdf(pages: number, firstWidth = 100): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([firstWidth + i, 200]);
  return doc.save();
}

const widths = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()));

describe("pdf-ops", () => {
  it("merges documents in order", async () => {
    const a = await loadPdf(await makePdf(2, 100));
    const b = await loadPdf(await makePdf(3, 200));
    expect(await widths(await mergeDocuments([b, a]))).toEqual([200, 201, 202, 100, 101]);
  });

  it("extracts, reorders, drops and rotates pages", async () => {
    const src = await loadPdf(await makePdf(4));
    expect(await widths(await extractPages(src, [3, 0]))).toEqual([103, 100]);

    const out = await PDFDocument.load(
      await rearrangePages(src, [
        { index: 2, rotate: 90 },
        { index: 0, rotate: -90 },
        { index: 1, rotate: 360 },
      ]),
    );
    expect(out.getPages().map((p) => Math.round(p.getWidth()))).toEqual([102, 100, 101]);
    expect(out.getPages().map((p) => p.getRotation().angle)).toEqual([90, 270, 0]);
  });

  it("rejects non-PDF and encrypted input with friendly error codes", async () => {
    await expect(loadPdf(new TextEncoder().encode("hello"))).rejects.toMatchObject({ code: "invalid" });
    await expect(loadPdf(new TextEncoder().encode("%PDF-1.7\ngarbage"))).rejects.toBeInstanceOf(PdfToolError);

    const doc = await PDFDocument.create();
    doc.addPage();
    doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: PDFName.of("Standard") }));
    await expect(loadPdf(await doc.save({ useObjectStreams: false }))).rejects.toMatchObject({ code: "encrypted" });
  });
});
