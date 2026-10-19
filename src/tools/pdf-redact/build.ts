/**
 * The redacted PDF, built with pdf-lib (DOM-free, unit-tested in Node). Pages with boxes arrive as
 * JPEG pictures already painted black by the client; each becomes a new page of the same visible
 * size holding only that picture, so no text, font or drawing of the original page survives.
 * Pages without boxes are copied from the original, minus anything that could carry text from
 * elsewhere in the file (comments, form fields, links into other pages). The document gets no
 * properties, no XMP, no bookmarks, no attachments and no form, and objects nothing points to
 * are dropped before saving, so the original of a redacted page cannot ride along unseen.
 */
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFStream, type PDFContext, type PDFObject } from "pdf-lib";
import { loadPdf } from "../pdf-shared/pdf-ops";

export interface RedactedPage {
  /** 0-based index in the original document. */
  index: number;
  /** The rendered page with its boxes painted black. */
  jpeg: Uint8Array;
  /** Visible size of the original page in points (CropBox, rotation applied). */
  width: number;
  height: number;
}

/** Page entries a copied page keeps; everything else (metadata, thumbnails, structure links, actions) goes. */
const PAGE_KEYS = new Set([
  "Type",
  "Parent",
  "MediaBox",
  "CropBox",
  "BleedBox",
  "TrimBox",
  "ArtBox",
  "Rotate",
  "UserUnit",
  "Resources",
  "Contents",
  "Group",
  "Annots",
]);

/** Annotations that hold text the page does not show, or files, or are pending redactions. */
const DROP_ANNOTS = new Set(["Popup", "Text", "FileAttachment", "Sound", "Movie", "Screen", "RichMedia", "3D", "Redact"]);

/** What a kept annotation keeps: where it is and how it looks. No /Contents, /T, /P, /Parent, /Popup. */
const ANNOT_KEYS = ["Type", "Subtype", "Rect", "AP", "AS", "F", "Border", "BS", "C", "CA", "QuadPoints"];

const name = (v: PDFObject | undefined): string | undefined => (v instanceof PDFName ? v.decodeText() : undefined);

/** A copy of an annotation reduced to its appearance, or null when it should not be carried over. */
function cleanAnnotation(ctx: PDFContext, raw: PDFObject | undefined): PDFRef | null {
  const dict = raw instanceof PDFRef ? ctx.lookup(raw) : raw;
  if (!(dict instanceof PDFDict)) return null;
  const subtype = name(dict.get(PDFName.of("Subtype")));
  if (!subtype || DROP_ANNOTS.has(subtype)) return null;
  if (subtype === "Widget") return flattenWidget(ctx, dict);
  const out = ctx.obj({}) as PDFDict;
  for (const key of ANNOT_KEYS) {
    const v = dict.get(PDFName.of(key));
    if (v !== undefined) out.set(PDFName.of(key), v);
  }
  if (subtype === "Link") {
    // Web links stay; links into the document point at pages, which may be redacted ones.
    const action = dict.lookupMaybe(PDFName.of("A"), PDFDict);
    const uri = action?.get(PDFName.of("URI"));
    if (name(action?.get(PDFName.of("S"))) !== "URI" || !uri) return null;
    out.set(PDFName.of("A"), ctx.obj({ S: "URI", URI: uri }));
  } else if (!dict.get(PDFName.of("AP"))) {
    return null;
  }
  return ctx.register(out);
}

/**
 * A form field keeps its look but stops being a field: its current appearance becomes a stamp.
 * The field's name, value and its links to the rest of the form (other pages included) are left behind.
 */
function flattenWidget(ctx: PDFContext, dict: PDFDict): PDFRef | null {
  const ap = dict.lookupMaybe(PDFName.of("AP"), PDFDict);
  let normal: PDFObject | undefined = ap?.get(PDFName.of("N"));
  const states = normal instanceof PDFRef ? ctx.lookup(normal) : normal;
  if (states instanceof PDFDict && !(states instanceof PDFStream)) {
    // Check boxes and radio buttons: one appearance per state, /AS says which is showing.
    const state = dict.get(PDFName.of("AS"));
    normal = state instanceof PDFName ? states.get(state) : undefined;
  }
  const rect = dict.get(PDFName.of("Rect"));
  if (!normal || !rect) return null;
  const out = ctx.obj({ Type: "Annot", Subtype: "Stamp", Rect: rect, AP: { N: normal } }) as PDFDict;
  const flags = dict.get(PDFName.of("F"));
  if (flags) out.set(PDFName.of("F"), flags);
  return ctx.register(out);
}

/** Strip a source page down to what draws it, before pdf-lib copies it and everything it points to. */
function cleanPage(src: PDFDocument, index: number): void {
  const node = src.getPage(index).node;
  const ctx = src.context;
  const annots = node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  for (const [key] of node.entries()) {
    if (!PAGE_KEYS.has(key.decodeText())) node.delete(key);
  }
  node.delete(PDFName.of("Annots"));
  if (annots) {
    const kept = annots
      .asArray()
      .map((a) => cleanAnnotation(ctx, a))
      .filter((r): r is PDFRef => r !== null);
    if (kept.length) node.set(PDFName.of("Annots"), ctx.obj(kept));
  }
}

/** Delete every indirect object that cannot be reached from the document catalog. */
export function pruneUnreachable(ctx: PDFContext): number {
  const seen = new Set<string>();
  const stack: PDFObject[] = [];
  const root = ctx.trailerInfo.Root;
  if (root) stack.push(root);
  if (ctx.trailerInfo.Info) stack.push(ctx.trailerInfo.Info);
  while (stack.length) {
    const obj = stack.pop()!;
    if (obj instanceof PDFRef) {
      const key = obj.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const target = ctx.lookup(obj);
      if (target) stack.push(target);
    } else if (obj instanceof PDFDict) {
      for (const [, v] of obj.entries()) stack.push(v);
    } else if (obj instanceof PDFArray) {
      stack.push(...obj.asArray());
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict);
    }
  }
  let removed = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!seen.has(ref.toString())) {
      ctx.delete(ref);
      removed++;
    }
  }
  return removed;
}

/**
 * Build the redacted document: `redacted` replaces those pages, every other page of `source` is
 * copied as it is (in the original order).
 */
export async function buildRedactedPdf(source: Uint8Array, redacted: readonly RedactedPage[]): Promise<Uint8Array> {
  const src = await loadPdf(source);
  // No Info dictionary at all: no title, author, subject, keywords, producer, creator or dates.
  const out = await PDFDocument.create({ updateMetadata: false });
  const byIndex = new Map(redacted.map((r) => [r.index, r]));
  const count = src.getPageCount();
  const keep = src.getPageIndices().filter((i) => !byIndex.has(i));
  for (const i of keep) cleanPage(src, i);
  const copied = new Map<number, Awaited<ReturnType<PDFDocument["copyPages"]>>[number]>();
  if (keep.length) (await out.copyPages(src, keep)).forEach((page, k) => copied.set(keep[k]!, page));

  for (let i = 0; i < count; i++) {
    const r = byIndex.get(i);
    if (!r) {
      out.addPage(copied.get(i)!);
      continue;
    }
    const image = await out.embedJpg(r.jpeg);
    const page = out.addPage([r.width, r.height]);
    page.drawImage(image, { x: 0, y: 0, width: r.width, height: r.height });
  }

  await out.flush();
  pruneUnreachable(out.context);
  return out.save({ useObjectStreams: true, updateFieldAppearances: false });
}
