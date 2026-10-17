/**
 * pdf-lib operations shared by the PDF tools. DOM-free (runs in Node for unit tests).
 * Client code imports this module lazily, so pdf-lib is only fetched once a file is picked.
 */
import { degrees, EncryptedPDFError, PDFDocument } from "pdf-lib";
import { looksLikePdf, PdfToolError } from "./pdf-errors";
import { normaliseAngle } from "./rotation";

export { PdfToolError };

/** Load a PDF, turning pdf-lib's errors into PdfToolError("encrypted" | "invalid" | "empty"). */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (!looksLikePdf(bytes)) throw new PdfToolError("invalid");
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    // pdf-lib ships ES5 classes, so instanceof fails on its errors: match the message too.
    if (err instanceof EncryptedPDFError || /is encrypted/i.test(String((err as Error)?.message))) {
      throw new PdfToolError("encrypted");
    }
    throw new PdfToolError("invalid");
  }
  let count = 0;
  try {
    count = doc.getPageCount();
  } catch {
    throw new PdfToolError("invalid");
  }
  if (count === 0) throw new PdfToolError("empty");
  return doc;
}

const save = (doc: PDFDocument): Promise<Uint8Array> => doc.save({ useObjectStreams: true });

/** Concatenate every page of `docs`, in order. */
export async function mergeDocuments(docs: PDFDocument[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const src of docs) {
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return save(out);
}

/** A new PDF with the given 0-based pages of `src`, in the given order. */
export async function extractPages(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  for (const page of pages) out.addPage(page);
  return save(out);
}

export interface PageEdit {
  /** 0-based index of the page in the source document. */
  index: number;
  /** Extra clockwise rotation in degrees (any multiple of 90, may be negative). */
  rotate: number;
}

/** A new PDF with pages reordered / dropped / rotated as listed in `layout`. */
export async function rearrangePages(src: PDFDocument, layout: PageEdit[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    src,
    layout.map((p) => p.index),
  );
  pages.forEach((page, i) => {
    const extra = layout[i]!.rotate;
    if (extra % 360 !== 0) page.setRotation(degrees(normaliseAngle(page.getRotation().angle + extra)));
    out.addPage(page);
  });
  return save(out);
}

