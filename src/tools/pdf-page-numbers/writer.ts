/**
 * Add page numbers: the pdf-lib side (DOM-free, unit-tested in Node). It only adds text in Helvetica,
 * one of the PDF standard fonts, so nothing is embedded but a font reference; the existing content,
 * forms and metadata are left as they were (pdf-lib wraps the old content in q/Q first, so the
 * numbers land in plain page space). The client imports this module lazily, with pdf-lib.
 */
import { degrees, rgb, StandardFontEmbedder, StandardFonts, type PDFDocument } from "pdf-lib";
import {
  formatLabel,
  numbering,
  placeLabel,
  toRotation,
  viewSize,
  visibleBox,
  type LabelFormat,
  type Position,
  type Size,
} from "./layout";

export { loadPdf } from "../pdf-shared/pdf-ops";

export interface NumberSettings {
  position: Position;
  format: LabelFormat;
  /** The number printed on `firstPage`. */
  startAt: number;
  /** 1-based; earlier pages get no number. */
  firstPage: number;
  /** Font size in points. */
  size: number;
  /** Gap between the page edge and the text, in points. */
  margin: number;
  /** Localised "Page {n} of {total}" template for the "words" format. */
  words: string;
}

// The same "Helvetica" name under @pdf-lib/standard-fonts' own enum type.
const metrics = StandardFontEmbedder.for(StandardFonts.Helvetica as unknown as Parameters<typeof StandardFontEmbedder.for>[0]);

/** Width of `text` in Helvetica at `size` points (for the preview, which uses the same layout). */
export const textWidth = (text: string, size: number): number => metrics.widthOfTextAtSize(text, size);

/** The size of every page as displayed (rotation and CropBox applied), in points. */
export function pageViews(doc: PDFDocument): Size[] {
  return doc.getPages().map((p) => viewSize(visibleBox(p.getMediaBox(), p.getCropBox()), toRotation(p.getRotation().angle)));
}

/** Draw the numbers onto `doc` and save it. Pages before `firstPage` are left untouched. */
export async function addPageNumbers(doc: PDFDocument, s: NumberSettings): Promise<Uint8Array> {
  const pages = doc.getPages();
  const plan = numbering(pages.length, s.firstPage, s.startAt);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [i, page] of pages.entries()) {
    const n = plan.numbers[i];
    if (n === null || n === undefined) continue;
    const text = formatLabel(s.format, n, plan.total, s.words);
    const box = visibleBox(page.getMediaBox(), page.getCropBox());
    const p = placeLabel(box, toRotation(page.getRotation().angle), s.position, s.margin, font.widthOfTextAtSize(text, s.size), s.size);
    page.drawText(text, { x: p.x, y: p.y, size: s.size, font, color: rgb(0, 0, 0), rotate: degrees(p.rotate) });
  }
  // Leave form fields exactly as they were (pdf-lib would otherwise redraw their appearances).
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}
