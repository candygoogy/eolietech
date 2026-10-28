/**
 * Add a watermark to a PDF: the writer (pdf-lib, DOM-free, unit-tested in Node). It only appends drawing
 * operators to the chosen pages, after their existing content, so the watermark lands on top. Text,
 * links, form fields and metadata stay as they were (pdf-lib wraps the existing content in q/Q first,
 * so the watermark is drawn in plain page space). One ExtGState carries the opacity for every page.
 * The client imports this module lazily, so pdf-lib loads only when a file is opened.
 */
import {
  degrees,
  drawImage,
  drawText,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setGraphicsState,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFOperator,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";
import { toRotation, viewSize, visibleBox, type Box, type Rotation, type Size } from "../pdf-shared/page-box";
import { imageDraw, imageRect, planText, textDraws, type AngleChoice, type Layout, type Position } from "./geometry";

export { loadPdf } from "../pdf-shared/pdf-ops";

export interface TextMark {
  kind: "text";
  /** Already cleaned and checked (winansi.ts): pdf-lib throws on characters WinAnsi can't encode. */
  text: string;
  bold: boolean;
  size: number | "fit";
  /** r, g, b in 0..1. */
  color: [number, number, number];
  opacity: number;
  angle: AngleChoice;
  layout: Layout;
}

export interface ImageMark {
  kind: "image";
  bytes: Uint8Array;
  format: "png" | "jpg";
  /** Fraction of the page width. */
  scale: number;
  opacity: number;
  position: Position;
}

export type Watermark = TextMark | ImageMark;

interface PageGeometry {
  box: Box;
  rotation: Rotation;
  view: Size;
}

function geometry(page: PDFPage): PageGeometry {
  const box = visibleBox(page.getMediaBox(), page.getCropBox());
  const rotation = toRotation(page.getRotation().angle);
  return { box, rotation, view: viewSize(box, rotation) };
}

/** The size of every page as displayed (rotation and CropBox applied), in points. */
export function pageViews(doc: PDFDocument): Size[] {
  return doc.getPages().map((p) => geometry(p).view);
}

let measuring: Promise<{ regular: PDFFont; bold: PDFFont }> | undefined;

/**
 * A text measurer for the preview: width of a (checked) text at size 1, in the font the PDF will use.
 * Standard fonts carry their metrics in pdf-lib, so this needs no file and no network.
 */
export async function createMeasurer(): Promise<(text: string, bold: boolean) => number> {
  measuring ??= PDFDocument.create().then((d) => ({
    regular: d.embedStandardFont(StandardFonts.Helvetica),
    bold: d.embedStandardFont(StandardFonts.HelveticaBold),
  }));
  const fonts = await measuring;
  return (text, bold) => (bold ? fonts.bold : fonts.regular).widthOfTextAtSize(text, 1);
}

/** Draw the watermark on the given 0-based pages of `doc` and save it. `doc` is changed in place. */
export async function watermarkPdf(doc: PDFDocument, mark: Watermark, pages: number[]): Promise<Uint8Array> {
  const all = doc.getPages();
  const opacity = Math.min(1, Math.max(0, mark.opacity));
  const gs: PDFRef = doc.context.register(doc.context.obj({ Type: "ExtGState", ca: opacity, CA: opacity }));

  let font: PDFFont | null = null;
  let image: PDFImage | null = null;
  if (mark.kind === "text") font = doc.embedStandardFont(mark.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  else image = mark.format === "png" ? await doc.embedPng(mark.bytes) : await doc.embedJpg(mark.bytes);

  for (const index of new Set(pages)) {
    const page = all[index];
    if (!page) throw new Error(`pdf-watermark: no page ${index}`);
    const g = geometry(page);
    const gsKey = page.node.newExtGState("GS", gs);
    const ops: PDFOperator[] = [pushGraphicsState(), setGraphicsState(gsKey)];
    if (mark.kind === "text" && font) {
      const plan = planText({ width1: font.widthOfTextAtSize(mark.text, 1), size: mark.size, angle: mark.angle, layout: mark.layout }, g.view);
      const fontKey = page.node.newFontDictionary(font.name, font.ref);
      const encoded = font.encodeText(mark.text);
      const color = rgb(...mark.color);
      for (const d of textDraws(plan, g.box, g.rotation)) {
        ops.push(
          ...drawText(encoded, {
            color,
            font: fontKey,
            size: plan.size,
            rotate: degrees(d.rotate),
            xSkew: degrees(0),
            ySkew: degrees(0),
            x: d.x,
            y: d.y,
          }),
        );
      }
    } else if (mark.kind === "image" && image) {
      const rect = imageRect(g.view, image.width / image.height, mark.scale, mark.position);
      const d = imageDraw(rect, g.box, g.rotation);
      const name = page.node.newXObject("Image", image.ref);
      ops.push(
        ...drawImage(name, {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          rotate: degrees(d.rotate),
          xSkew: degrees(0),
          ySkew: degrees(0),
        }),
      );
    }
    ops.push(popGraphicsState());
    page.pushOperators(...ops);
  }
  // Leave form fields exactly as they were (pdf-lib would otherwise redraw their appearances).
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}
