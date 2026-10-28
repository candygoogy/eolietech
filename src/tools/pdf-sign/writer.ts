/**
 * Sign PDF writer (pdf-lib, DOM-free, unit-tested in Node). It only adds images: each distinct PNG is
 * embedded once and drawn wherever it was placed. Page content, text, forms and metadata are left as
 * they were (pdf-lib wraps the existing content in q/Q first, so the images land in plain page space).
 * The client imports this module lazily, so pdf-lib loads only when a file is opened.
 */
import { degrees, type PDFDocument, type PDFImage } from "pdf-lib";
import { toRotation, viewSize, visibleBox, type Size, type ViewRect } from "../pdf-shared/page-box";
import { drawParams } from "./geometry";

export { loadPdf } from "../pdf-shared/pdf-ops";

export interface Placement {
  /** 0-based page index. */
  page: number;
  /** Key into the images map. */
  image: string;
  /** Where the image goes on the page as displayed (points from its top-left corner). */
  rect: ViewRect;
}

/** The size of every page as displayed (rotation and CropBox applied), in points. */
export function pageViews(doc: PDFDocument): Size[] {
  return doc.getPages().map((p) => viewSize(visibleBox(p.getMediaBox(), p.getCropBox()), toRotation(p.getRotation().angle)));
}

/** Draw the placements onto `doc` and save it. `images` maps keys to PNG bytes. */
export async function signPdf(doc: PDFDocument, images: Record<string, Uint8Array>, placements: Placement[]): Promise<Uint8Array> {
  const pages = doc.getPages();
  const embedded = new Map<string, PDFImage>();
  for (const p of placements) {
    const page = pages[p.page];
    const png = images[p.image];
    if (!page || !png) throw new Error(`pdf-sign: bad placement (page ${p.page}, image ${p.image})`);
    let image = embedded.get(p.image);
    if (!image) {
      image = await doc.embedPng(png);
      embedded.set(p.image, image);
    }
    const box = visibleBox(page.getMediaBox(), page.getCropBox());
    const d = drawParams(p.rect, box, toRotation(page.getRotation().angle));
    page.drawImage(image, { x: d.x, y: d.y, width: d.width, height: d.height, rotate: degrees(d.rotate) });
  }
  // Leave form fields exactly as they were (pdf-lib would otherwise redraw their appearances).
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}
