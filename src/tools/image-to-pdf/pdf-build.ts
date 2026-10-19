/**
 * image-to-pdf: the pdf-lib part (DOM-free, unit-tested in Node). One image per page; the image
 * XObject is drawn with our own matrix so a JPEG stored sideways (EXIF orientation) comes out upright
 * without re-encoding it.
 */
import { concatTransformationMatrix, drawObject, popGraphicsState, pushGraphicsState, type PDFDocument, type PDFImage } from "pdf-lib";
import { pageLayout, placeImage, turnsSideways, type PdfOptions } from "./layout";

/** Add one page showing `image`, upright for `orientation` (EXIF, 1 to 8), laid out per `opts`. */
export function addImagePage(doc: PDFDocument, image: PDFImage, orientation: number, opts: PdfOptions): void {
  const sideways = turnsSideways(orientation);
  const w = sideways ? image.height : image.width;
  const h = sideways ? image.width : image.height;
  const layout = pageLayout(w, h, opts);
  const page = doc.addPage([layout.width, layout.height]);
  const name = page.node.newXObject("Image", image.ref);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(...placeImage(orientation, layout.box)),
    drawObject(name),
    popGraphicsState(),
  );
}

/** Serialise; the returned buffer is standalone (safe to transfer). */
export async function savePdf(doc: PDFDocument): Promise<ArrayBuffer> {
  const bytes = await doc.save({ useObjectStreams: true });
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer as ArrayBuffer;
  return bytes.slice().buffer as ArrayBuffer;
}
