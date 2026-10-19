// @vitest-environment node
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  StandardFonts,
  type PDFObject,
} from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildRedactedPdf } from "./build";

const SECRET = "ZEBRAQUOKKA";

/**
 * Page 1 holds the secret; page 2 is public but links back to page 1, has a comment quoting the
 * secret and a filled form field whose value is the secret too. The file also has a title, an
 * outline entry and an attachment, all naming the secret.
 */
async function makeSource(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([300, 400]);
  p1.drawText(`Name: ${SECRET}`, { x: 40, y: 340, size: 14, font });
  const p2 = doc.addPage([300, 400]);
  p2.drawText("Public page two", { x: 40, y: 340, size: 14, font });

  const form = doc.getForm();
  const field = form.createTextField("holder");
  field.setText(SECRET);
  field.addToPage(p2, { x: 40, y: 200, width: 200, height: 24, font });
  form.updateFieldAppearances(font);

  const ctx = doc.context;
  const link = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [40, 100, 140, 120], Dest: [p1.ref, "Fit"] }));
  const note = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Text", Rect: [10, 10, 30, 30], Contents: PDFHexString.fromText(SECRET), P: p2.ref }));
  const annots = p2.node.lookup(PDFName.of("Annots"), PDFArray);
  annots.push(link);
  annots.push(note);

  const outline = ctx.register(ctx.obj({ Title: PDFHexString.fromText(SECRET), Dest: [p1.ref, "Fit"] }));
  doc.catalog.set(PDFName.of("Outlines"), ctx.obj({ Type: "Outlines", First: outline, Last: outline, Count: 1 }));
  await doc.attach(new TextEncoder().encode(`attached ${SECRET}`), "secret.txt", { mimeType: "text/plain" });
  doc.setTitle(`Report about ${SECRET}`);
  doc.setAuthor("Someone");
  return doc.save({ useObjectStreams: false });
}

/** A structurally valid JPEG header (SOF0, 1 x 1, greyscale): all pdf-lib reads when embedding. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]);

/** Every piece of text in a PDF: raw bytes, decompressed streams, and decoded strings in any object. */
async function everyText(bytes: Uint8Array): Promise<string> {
  const parts = [Buffer.from(bytes).toString("latin1")];
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const walk = (o: PDFObject | undefined) => {
    if (o instanceof PDFString || o instanceof PDFHexString) parts.push(o.decodeText());
    else if (o instanceof PDFDict) for (const [, v] of o.entries()) walk(v);
    else if (o instanceof PDFArray) o.asArray().forEach(walk);
  };
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      walk(obj.dict);
      try {
        parts.push(Buffer.from(decodePDFRawStream(obj).decode()).toString("latin1"));
      } catch {
        // Image data (DCTDecode): not text.
      }
    } else walk(obj);
  }
  return parts.join("\n");
}

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const tc = await (await pdf.getPage(n)).getTextContent();
    out.push(tc.items.map((i) => ("str" in i ? i.str : "")).join(""));
  }
  return out;
}

describe("buildRedactedPdf", () => {
  it("the source really contains the secret everywhere the test expects", async () => {
    const src = await makeSource();
    expect((await everyText(src)).split(SECRET).length).toBeGreaterThan(5);
    expect((await pageTexts(src))[0]).toContain(SECRET);
  });

  it("replaces the redacted page and leaves the secret nowhere in the file", async () => {
    const out = await buildRedactedPdf(await makeSource(), [{ index: 0, jpeg: JPEG, width: 300, height: 400 }]);
    expect(await pageTexts(out)).toEqual(["", "Public page two"]);
    expect(await everyText(out)).not.toContain(SECRET);

    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([
      [300, 400],
      [300, 400],
    ]);
    // No document properties, XMP, bookmarks, attachments or form.
    expect(doc.context.trailerInfo.Info).toBeUndefined();
    for (const key of ["Metadata", "Outlines", "Names", "AcroForm"]) expect(doc.catalog.get(PDFName.of(key)), key).toBeUndefined();
    // Page 2 keeps its field's look as a stamp and drops the comment and the link into page 1.
    const annots = doc.getPage(1).node.lookup(PDFName.of("Annots"), PDFArray);
    const subtypes = annots.asArray().map((a) => (doc.context.lookup(a) as PDFDict).get(PDFName.of("Subtype"))?.toString());
    expect(subtypes).toEqual(["/Stamp"]);
  });

  it("keeps the order and the size of a rotated page that becomes a picture", async () => {
    const src = await PDFDocument.create();
    src.addPage([100, 200]);
    src.addPage([300, 400]);
    src.addPage([500, 600]);
    const out = await buildRedactedPdf(await src.save(), [{ index: 1, jpeg: JPEG, width: 400, height: 300 }]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight(), p.getRotation().angle])).toEqual([
      [100, 200, 0],
      [400, 300, 0],
      [500, 600, 0],
    ]);
  });
});
