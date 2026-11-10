/** Helpers for the PDF unit tests (Node only): what a file really holds, beyond what a viewer shows. */
import { deflateSync } from "node:zlib";
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFStream, PDFString, type PDFObject } from "pdf-lib";

/** Every piece of text in a PDF: raw bytes, decompressed streams, and decoded strings in any object. */
export async function everyText(bytes: Uint8Array): Promise<string> {
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

/** Is `needle` anywhere in the file, as plain text or as the hex string pdf-lib's drawText writes? */
export async function holds(bytes: Uint8Array, needle: string): Promise<boolean> {
  const text = (await everyText(bytes)).toUpperCase();
  return text.includes(needle.toUpperCase()) || text.includes(Buffer.from(needle, "latin1").toString("hex").toUpperCase());
}

/** The text PDF.js extracts from each page. */
export async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const tc = await (await pdf.getPage(n)).getTextContent();
    out.push(tc.items.map((i) => ("str" in i ? i.str : "")).join(""));
  }
  await pdf.loadingTask.destroy();
  return out;
}

/** "Type/Subtype WxH" of every stream in the file that is an image or a Form XObject. */
export async function xobjects(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const out: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFStream)) continue;
    const subtype = obj.dict.get(PDFName.of("Subtype"));
    if (subtype === PDFName.of("Image")) out.push(`Image ${String(obj.dict.get(PDFName.of("Width")))}x${String(obj.dict.get(PDFName.of("Height")))}`);
    else if (subtype === PDFName.of("Form")) out.push("Form");
  }
  return out.sort();
}

/** A real one-colour PNG, so an embedded image has a recognisable size. */
export function png(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Uint8Array) => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set(rgb, y * (width * 3 + 1) + 1 + x * 3);
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

/** How page 1 of `sharedResourcesPdf` reaches a content stream that was given the shared dictionary as its own resources. */
export type SharedRoute = "none" | "soft mask" | "shading pattern" | "type 3 font";

/**
 * Two pages with one resources dictionary, which holds three images: Im1 (11x1), Im2 (22x1) and
 * Im3 (33x1). Page 2 draws Im2 only. Page 1 draws Im1, and by `route` a stream that has the shared
 * dictionary as its own resources and draws Im3: the group of a soft mask set by `gs`, the same
 * soft mask carried by a shading pattern, or the glyph of a Type 3 font written in place. Image 22x1
 * belongs to page 2 alone. `page1` replaces page 1's content stream (its raw bytes and filter).
 */
export async function sharedResourcesPdf(route: SharedRoute, page1?: { data: Uint8Array; filter?: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const image = (width: number) => ctx.register(ctx.stream(new Uint8Array(width), { Type: "XObject", Subtype: "Image", Width: width, Height: 1, ColorSpace: "DeviceGray", BitsPerComponent: 8 }));
  const shared = ctx.nextRef();
  const draw3 = "q 10 0 0 10 0 0 cm /Im3 Do Q";
  const group = ctx.register(ctx.stream(draw3, { Type: "XObject", Subtype: "Form", BBox: [0, 0, 10, 10], Group: { S: "Transparency", CS: "DeviceGray" }, Resources: shared }));
  const mask = { SMask: { S: "Luminosity", G: group } };
  const shading = { ShadingType: 2, ColorSpace: "DeviceGray", Coords: [0, 0, 10, 0], Function: { FunctionType: 2, Domain: [0, 1], C0: [0], C1: [1], N: 1 } };
  const glyph = ctx.register(ctx.stream(`1 0 0 0 1 1 d1 ${draw3}`));
  const type3 = { Type: "Font", Subtype: "Type3", FontBBox: [0, 0, 1, 1], FontMatrix: [1, 0, 0, 1, 0, 0], CharProcs: { a: glyph }, Encoding: { Type: "Encoding", Differences: [97, "a"] }, FirstChar: 97, LastChar: 97, Widths: [1], Resources: shared };
  ctx.assign(
    shared,
    ctx.obj({
      XObject: { Im1: image(11), Im2: image(22), Im3: image(33) },
      ExtGState: { GS1: mask },
      Pattern: { P1: ctx.register(ctx.obj({ PatternType: 2, Shading: shading, ExtGState: mask })) },
      Font: { F3: type3 },
    }),
  );
  const via = { none: "", "soft mask": "/GS1 gs", "shading pattern": "q /Pattern cs /P1 scn 0 0 50 50 re f Q", "type 3 font": "BT /F3 1 Tf (a) Tj ET" }[route];
  const content = (text: string) => ctx.register(ctx.stream(text));
  const p1 = doc.addPage([100, 100]);
  p1.node.set(PDFName.of("Resources"), shared);
  p1.node.set(
    PDFName.of("Contents"),
    page1 ? ctx.register(PDFRawStream.of(ctx.obj(page1.filter ? { Filter: page1.filter } : {}), page1.data)) : content(`q ${via} 10 0 0 10 0 0 cm /Im1 Do Q`),
  );
  const p2 = doc.addPage([100, 100]);
  p2.node.set(PDFName.of("Resources"), shared);
  p2.node.set(PDFName.of("Contents"), content("q 10 0 0 10 0 0 cm /Im2 Do Q"));
  return doc.save({ useObjectStreams: false });
}
