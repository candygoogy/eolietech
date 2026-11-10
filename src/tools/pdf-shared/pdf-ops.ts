/**
 * pdf-lib operations shared by the PDF tools. DOM-free (runs in Node for unit tests).
 * Client code imports this module lazily, so pdf-lib is only fetched once a file is picked.
 */
import {
  decodePDFRawStream,
  degrees,
  EncryptedPDFError,
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFObjectCopier,
  PDFPage,
  PDFPageLeaf,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
  type PDFContext,
  type PDFObject,
} from "pdf-lib";
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

// ---------- small readers that never throw on a malformed file ----------

const N = (key: string): PDFName => PDFName.of(key);
const deref = (ctx: PDFContext, v: PDFObject | undefined): PDFObject | undefined => (v instanceof PDFRef ? ctx.lookup(v) : v);
const nameOf = (v: PDFObject | undefined): string | undefined => (v instanceof PDFName ? v.decodeText() : undefined);

function dictAt(dict: PDFDict | undefined, key: string): PDFDict | undefined {
  const v = dict && deref(dict.context, dict.get(N(key)));
  return v instanceof PDFDict ? v : undefined;
}

function arrayAt(dict: PDFDict | undefined, key: string): PDFObject[] {
  const v = dict && deref(dict.context, dict.get(N(key)));
  return v instanceof PDFArray ? v.asArray() : [];
}

// ---------- which resources a content stream calls by name ----------

/** The resource dictionaries whose entries content streams call by name. */
const RESOURCE_KINDS = ["XObject", "Font", "ExtGState", "ColorSpace", "Pattern", "Shading", "Properties"] as const;
type ResourceKind = (typeof RESOURCE_KINDS)[number];
type UsedNames = Record<ResourceKind, Set<string>>;

const OPERATOR_KIND: Record<string, ResourceKind | undefined> = {
  Do: "XObject",
  Tf: "Font",
  gs: "ExtGState",
  cs: "ColorSpace",
  CS: "ColorSpace",
  scn: "Pattern",
  SCN: "Pattern",
  sh: "Shading",
  BDC: "Properties",
  DP: "Properties",
};

/** Colour spaces a viewer applies without the content naming them. */
const IMPLICIT_COLOR_SPACES = new Set(["DefaultGray", "DefaultRGB", "DefaultCMYK"]);

const emptyUse = (): UsedNames => ({ XObject: new Set(), Font: new Set(), ExtGState: new Set(), ColorSpace: new Set(), Pattern: new Set(), Shading: new Set(), Properties: new Set() });

const isSpace = (b: number | undefined): boolean => b === 0 || b === 9 || b === 10 || b === 12 || b === 13 || b === 32;
// ( ) < > [ ] { } / %
const isDelimiter = (b: number): boolean => b === 40 || b === 41 || b === 60 || b === 62 || b === 91 || b === 93 || b === 123 || b === 125 || b === 47 || b === 37;

/** Index just past the EI that ends the inline image whose data starts at `from` (as PDF.js finds it: EI, a space, then text rather than binary). */
function endOfInlineImage(bytes: Uint8Array, from: number, filters: readonly string[]): number {
  const n = bytes.length;
  let i = from;
  // ASCII-armoured data can spell "EI" itself: skip to its own end marker first.
  const marker = filters.includes("A85") || filters.includes("ASCII85Decode") ? 126 : filters.includes("AHx") || filters.includes("ASCIIHexDecode") ? 62 : -1;
  if (marker >= 0) {
    const at = bytes.indexOf(marker, i);
    if (at >= 0) i = at;
  }
  for (; i + 1 < n; i++) {
    if (bytes[i] !== 69 || bytes[i + 1] !== 73) continue;
    if (i + 2 < n && !isSpace(bytes[i + 2])) continue;
    let text = true;
    for (let k = i + 2; k < Math.min(n, i + 12) && text; k++) {
      const c = bytes[k]!;
      text = isSpace(c) || (c >= 32 && c < 127);
    }
    if (text) return i + 2;
  }
  return n;
}

/** Add to `used` every resource name the content stream `bytes` calls, by the operator that calls it. */
export function scanContent(bytes: Uint8Array, used: UsedNames): void {
  const n = bytes.length;
  let i = 0;
  let names: string[] = [];
  const word = (): string => {
    const start = i;
    while (i < n && !isSpace(bytes[i]) && !isDelimiter(bytes[i]!)) i++;
    let s = "";
    for (let k = start; k < i; k++) s += String.fromCharCode(bytes[k]!);
    return s;
  };
  while (i < n) {
    const b = bytes[i]!;
    if (isSpace(b)) i++;
    else if (b === 37) {
      // % comment
      while (i < n && bytes[i] !== 10 && bytes[i] !== 13) i++;
    } else if (b === 40) {
      // (literal string), with nested parentheses and backslash escapes
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        const c = bytes[i++];
        if (c === 92) i++;
        else if (c === 40) depth++;
        else if (c === 41) depth--;
      }
    } else if (b === 60 && bytes[i + 1] !== 60) {
      // <hex string>
      while (i < n && bytes[i] !== 62) i++;
      i++;
    } else if (b === 47) {
      i++;
      names.push(word().replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
    } else if (isDelimiter(b)) {
      i += (b === 60 || b === 62) && bytes[i + 1] === b ? 2 : 1;
    } else {
      const op = word();
      if (/^[+\-.\d]/.test(op) || op === "true" || op === "false" || op === "null") continue; // an operand
      if (op === "ID") {
        // Inline image: its dictionary may name a colour space; its data is skipped.
        for (const name of names) used.ColorSpace.add(name);
        i = endOfInlineImage(bytes, i, names);
      } else {
        const kind = OPERATOR_KIND[op];
        if (kind) for (const name of names) used[kind].add(name);
      }
      names = [];
    }
  }
}

/** Do these two bytes open a zlib stream (deflate method, valid check bits, no preset dictionary)? */
const isZlibHeader = (cmf: number | undefined, flg: number | undefined): boolean =>
  cmf !== undefined && flg !== undefined && (cmf & 0x0f) === 8 && ((cmf << 8) + flg) % 31 === 0 && (flg & 0x20) === 0;

/**
 * Decoded bytes of a content stream, or null when it cannot be read here. An empty stream draws
 * nothing, whatever filter it names. Flate data written without its zlib header (raw deflate, which
 * viewers read) goes through pdf-lib's own inflater with a header put in front. Anything else that
 * does not decode stays unreadable, and callers then refuse the file (strict) or keep the
 * resources whole: guessing at content that cannot be read could drop something it draws.
 */
function contentBytes(stream: PDFObject | undefined): Uint8Array | null {
  if (!(stream instanceof PDFRawStream)) return null;
  const data = stream.contents;
  if (data.length === 0) return new Uint8Array(0);
  try {
    return decodePDFRawStream(stream).decode();
  } catch {
    // Only raw deflate is retried: data that has a zlib header and still fails is damaged.
    const filter = stream.dict.lookup(N("Filter"));
    const first = filter instanceof PDFArray ? filter.lookup(0) : filter;
    if (nameOf(first) !== "FlateDecode" || isZlibHeader(data[0], data[1])) return null;
    const framed = new Uint8Array(data.length + 2);
    framed.set([0x78, 0x9c]);
    framed.set(data, 2);
    try {
      return decodePDFRawStream(PDFRawStream.of(stream.dict, framed)).decode();
    } catch {
      return null;
    }
  }
}

/** A page's content streams as one run of bytes (operands and operator may sit in different streams). */
function pageContent(ctx: PDFContext, page: PDFDict): Uint8Array | null {
  const contents = deref(ctx, page.get(N("Contents")));
  if (contents === undefined || contents === PDFNull) return new Uint8Array(0);
  const parts: Uint8Array[] = [];
  for (const item of contents instanceof PDFArray ? contents.asArray() : [contents]) {
    const stream = deref(ctx, item);
    if (stream === undefined || stream === PDFNull) continue; // a missing object draws nothing
    const bytes = contentBytes(stream);
    if (!bytes) return null;
    parts.push(bytes, Uint8Array.of(10));
  }
  const all = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  return all;
}

/** Cuts resources dictionaries down to the names their content calls (see `resourceTrimmer`). */
interface Trimmer {
  /** A resources dictionary for one page holding only what the page and the given annotations draw with; null when some of that content cannot be read, undefined when the page has no resources. */
  page(page: PDFPageLeaf, annots: readonly PDFDict[]): PDFDict | null | undefined;
  /** Some content (of a nested form, pattern, soft mask or glyph) could not be read, so its resources were kept whole. */
  readonly incomplete: boolean;
}

/**
 * Resources cut down to what is drawn with them. Content is drawn from a page, and from there by
 * every content stream it reaches: Form XObjects (Do), tiling patterns, the soft-mask groups of
 * graphics states (gs, or the /ExtGState of a shading pattern), Type 3 glyphs and annotation
 * appearances. A stream that has no resources of its own borrows those of whatever draws it, so its
 * content counts there. One that has its own (or a Type 3 font that has) gets a copy with them cut
 * down by its own content, the same way and recursively: pages that share one dictionary often hand
 * it to their forms and soft masks too, and kept whole it would bring along the images of every page.
 * Each object is cut down once (its own content decides what it keeps), which also ends cycles.
 * `replace` receives the edited copy of each such stream or font, for the reference it replaces or,
 * for a font written straight into its Font dictionary, for that dictionary itself.
 */
function resourceTrimmer(ctx: PDFContext, replace: (original: PDFRef | PDFDict, copy: PDFDict | PDFStream) => void): Trimmer {
  const handled = new Set<PDFObject>();
  let incomplete = false;

  /** Give a stream or Type 3 font that has resources of its own a copy with them cut down. */
  const own = (raw: PDFObject | undefined): void => {
    const owner = deref(ctx, raw);
    if (!raw || !owner || handled.has(owner)) return;
    // Streams are always indirect; a font dictionary can be written in place.
    if (!(raw instanceof PDFRef) && !(owner instanceof PDFDict)) return;
    handled.add(owner);
    const dict = owner instanceof PDFStream ? owner.dict : owner instanceof PDFDict ? owner : undefined;
    const resources = deref(ctx, dict?.get(N("Resources")));
    if (!dict || !(resources instanceof PDFDict)) return;
    const trimmed =
      owner instanceof PDFStream
        ? trim(resources, [contentBytes(owner)], [])
        : trim(
            resources,
            [],
            (dictAt(dict, "CharProcs")?.entries() ?? []).map(([, glyph]) => glyph),
          );
    if (!trimmed) {
      incomplete = true;
      return;
    }
    const copy = owner instanceof PDFRawStream ? owner.clone(ctx) : (owner as PDFDict).clone(ctx);
    (copy instanceof PDFStream ? copy.dict : copy).set(N("Resources"), trimmed);
    replace(raw instanceof PDFRef ? raw : (owner as PDFDict), copy);
  };

  /** `resources` with only the names `contents` (and the streams in `drawn`) call; null when some of it cannot be read. */
  const trim = (resources: PDFDict, contents: readonly (Uint8Array | null)[], drawn: readonly PDFObject[]): PDFDict | null => {
    const used = emptyUse();
    const borrowers: PDFStream[] = [];
    const seen = new Set<PDFStream>();
    /** A content stream drawn from here: cut down by its own content, or counted here when it borrows these resources. */
    const draws = (raw: PDFObject | undefined): void => {
      const stream = deref(ctx, raw);
      if (!(stream instanceof PDFStream)) return;
      if (deref(ctx, stream.dict.get(N("Resources"))) instanceof PDFDict) own(raw);
      else borrowers.push(stream);
    };
    const font = (raw: PDFObject | undefined): void => {
      const target = deref(ctx, raw);
      if (!(target instanceof PDFDict) || nameOf(target.get(N("Subtype"))) !== "Type3") return;
      if (deref(ctx, target.get(N("Resources"))) instanceof PDFDict) own(raw);
      else for (const [, glyph] of dictAt(target, "CharProcs")?.entries() ?? []) draws(glyph);
    };
    /** A graphics state draws its soft mask's group, and its /Font when that is a Type 3 font. */
    const graphicsState = (raw: PDFObject | undefined): void => {
      const state = deref(ctx, raw);
      if (!(state instanceof PDFDict)) return;
      const mask = deref(ctx, state.get(N("SMask")));
      if (mask instanceof PDFDict) draws(mask.get(N("G")));
      const fontAndSize = deref(ctx, state.get(N("Font")));
      if (fontAndSize instanceof PDFArray && fontAndSize.size()) font(fontAndSize.get(0));
    };
    /** A tiling pattern is a content stream; a shading pattern can carry a graphics state. */
    const pattern = (raw: PDFObject | undefined): void => {
      const target = deref(ctx, raw);
      if (target instanceof PDFStream) draws(raw);
      else if (target instanceof PDFDict) graphicsState(target.get(N("ExtGState")));
    };
    const scan = (bytes: Uint8Array | null): boolean => {
      if (!bytes) return false;
      const found = emptyUse();
      scanContent(bytes, found);
      for (const kind of RESOURCE_KINDS) {
        for (const name of found[kind]) {
          if (used[kind].has(name)) continue;
          used[kind].add(name);
          const raw = dictAt(resources, kind)?.get(N(name));
          const target = deref(ctx, raw);
          if (kind === "XObject" && target instanceof PDFStream && nameOf(target.dict.get(N("Subtype"))) === "Form") draws(raw);
          else if (kind === "Pattern") pattern(raw);
          else if (kind === "ExtGState") graphicsState(raw);
          else if (kind === "Font") font(raw);
        }
      }
      return true;
    };
    for (const raw of drawn) draws(raw);
    for (const bytes of contents) if (!scan(bytes)) return null;
    while (borrowers.length) {
      const stream = borrowers.pop()!;
      if (seen.has(stream)) continue;
      seen.add(stream);
      if (!scan(contentBytes(stream))) return null;
    }

    const out = ctx.obj({});
    for (const [key, value] of resources.entries()) {
      const kind = RESOURCE_KINDS.find((k) => k === key.decodeText());
      if (!kind) {
        if (key === N("ProcSet")) out.set(key, value);
        continue;
      }
      const entries = deref(ctx, value);
      if (!(entries instanceof PDFDict)) continue;
      const kept = ctx.obj({});
      for (const [name, v] of entries.entries()) {
        const text = name.decodeText();
        if (used[kind].has(text) || (kind === "ColorSpace" && IMPLICIT_COLOR_SPACES.has(text))) kept.set(name, v);
      }
      if (kept.keys().length) out.set(key, kept);
    }
    return out;
  };

  return {
    page(page, annots) {
      const resources = deref(ctx, page.getInheritableAttribute(N("Resources")));
      if (!(resources instanceof PDFDict)) return undefined;
      const drawn: PDFObject[] = [];
      for (const annot of annots) {
        for (const [, look] of dictAt(annot, "AP")?.entries() ?? []) {
          const v = deref(ctx, look);
          if (v instanceof PDFStream) drawn.push(look);
          else if (v instanceof PDFDict) for (const [, state] of v.entries()) drawn.push(state);
        }
      }
      return trim(resources, [pageContent(ctx, page)], drawn);
    },
    get incomplete() {
      return incomplete;
    },
  };
}

// ---------- copying pages without what they point at elsewhere in the file ----------

/** Named destinations of a document: the catalog's /Dests dictionary and the /Names /Dests name tree. */
function namedDestinations(src: PDFDocument): (key: PDFObject) => PDFObject | undefined {
  const ctx = src.context;
  const bytesKey = (s: PDFString | PDFHexString): string => String.fromCharCode(...s.asBytes());
  let tree: Map<string, PDFObject> | undefined;
  const readTree = (): Map<string, PDFObject> => {
    const map = new Map<string, PDFObject>();
    const seen = new Set<PDFDict>();
    const stack = [dictAt(dictAt(src.catalog, "Names"), "Dests")];
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      const pairs = arrayAt(node, "Names");
      for (let k = 0; k + 1 < pairs.length; k += 2) {
        const key = deref(ctx, pairs[k]);
        if (key instanceof PDFString || key instanceof PDFHexString) map.set(bytesKey(key), pairs[k + 1]!);
      }
      for (const kid of arrayAt(node, "Kids")) {
        const v = deref(ctx, kid);
        if (v instanceof PDFDict) stack.push(v);
      }
    }
    return map;
  };
  return (key) => {
    if (key instanceof PDFName) return dictAt(src.catalog, "Dests")?.get(key);
    if (key instanceof PDFString || key instanceof PDFHexString) return (tree ??= readTree()).get(bytesKey(key));
    return undefined;
  };
}

export interface CopyOptions {
  /** Fail with PdfToolError("invalid") rather than keep a page's whole resources when its content cannot be read. */
  strict?: boolean;
}

/**
 * Copy pages of `src` into `out` (not yet added to its page tree), like pdf-lib's copyPages but
 * without anything of the pages that are not copied. pdf-lib follows every reference from a page,
 * so a link to another page, a form field shown on two pages or an article thread would bring that
 * other page along, content included, as an object no viewer shows. Here:
 *
 * - references to a copied page land on its copy, so links inside the document keep working
 *   (named destinations are resolved first: the name tree is not carried over);
 * - links and GoTo actions that target a page left behind are removed, and any other reference to
 *   such a page, to the page tree, the catalog, the outline or the structure tree becomes null;
 * - the form-field tree above a copied widget is cut down to the fields shown on copied pages, and
 *   those are listed in `out`'s /AcroForm (with /NeedAppearances, so filled values without an
 *   appearance stream still show);
 * - article beads (/B) and private application data (/PieceInfo, of pages and of the forms they
 *   draw) go, and each page gets its own resources dictionary with only the entries it uses, since
 *   a dictionary shared between pages holds the images of all of them (so do the forms, patterns
 *   and soft masks that reach it: each is cut down by its own content);
 * - the layers (/OCProperties) the copied content uses keep their on/off state and order.
 *
 * `src` is left as it was, so it can be copied from again. Call once per source document; layers
 * and form fields of several sources add up in `out`.
 */
export async function copyPagesDetached(out: PDFDocument, src: PDFDocument, indices: readonly number[], options: CopyOptions = {}): Promise<PDFPage[]> {
  await src.flush();
  const ctx = src.context;
  const outCtx = out.context;
  const srcPages = src.getPages();
  const kept = [...new Set(indices)];
  const keptRefs = new Set(kept.map((i) => srcPages[i]!.ref));

  const copier = PDFObjectCopier.for(ctx, outCtx);
  // The copier's own memo (source object or reference -> its copy). Filling it in before copying is
  // what redirects references; pdf-lib has no public way to do that.
  const mapped = (copier as unknown as { traversedObjects: Map<PDFObject, PDFObject> }).traversedObjects;
  if (!(mapped instanceof Map)) throw new Error("pdf-lib's PDFObjectCopier has no traversedObjects map");

  // Whatever still points at these after the clean-up below gets null, never the object.
  for (const ref of [ctx.trailerInfo.Root, ctx.trailerInfo.Info, ...["Pages", "Outlines", "StructTreeRoot", "Names", "AcroForm"].map((k) => src.catalog.get(N(k)))]) {
    if (ref instanceof PDFRef) mapped.set(ref, PDFNull);
  }
  src.catalog.Pages().traverse((_, ref) => mapped.set(ref, PDFNull));
  const pageRefs = new Map(kept.map((i) => [i, outCtx.nextRef()]));
  for (const i of kept) mapped.set(srcPages[i]!.ref, pageRefs.get(i)!);

  /** Edited copies of source objects (annotations, form fields, streams with trimmed resources), keyed by the reference they replace. */
  const replacements = new Map<PDFRef, PDFDict | PDFStream>();
  const edit = (ref: PDFRef): PDFDict => {
    let copy = replacements.get(ref) as PDFDict | undefined;
    if (!copy) {
      copy = (ctx.lookup(ref) as PDFDict).clone(ctx);
      replacements.set(ref, copy);
    }
    return copy;
  };
  /** Edited copies of objects written in place (a Type 3 font with trimmed resources), keyed by the original. */
  const inPlace = new Map<PDFDict, PDFDict>();
  const trimmer = resourceTrimmer(ctx, (original, copy) => (original instanceof PDFRef ? replacements.set(original, copy) : inPlace.set(original, copy as PDFDict)));

  // --- destinations and actions ---
  const named = namedDestinations(src);
  /** The explicit destination array behind `raw`, pointing at a copied page; null when it leads nowhere any more. */
  const remapDest = (raw: PDFObject | undefined): PDFObject | null => {
    let dest = deref(ctx, raw);
    for (let hop = 0; hop < 4 && dest && !(dest instanceof PDFArray); hop++) {
      dest = deref(ctx, dest instanceof PDFDict ? dest.get(N("D")) : named(dest));
    }
    if (!(dest instanceof PDFArray) || dest.size() === 0) return null;
    const first = dest.get(0);
    const target = first instanceof PDFNumber ? srcPages[first.asNumber()]?.ref : first;
    if (!(target instanceof PDFRef) || !keptRefs.has(target)) return null;
    if (dest === raw && target === first) return raw;
    return ctx.obj([target, ...dest.asArray().slice(1)]);
  };
  /** The action with GoTo targets remapped, here and down its /Next chain; null when it would jump to a page left behind. */
  const cleanAction = (raw: PDFObject | undefined, depth = 0): PDFObject | null => {
    const action = deref(ctx, raw);
    if (!(action instanceof PDFDict) || depth > 8) return null;
    const goTo = nameOf(action.get(N("S"))) === "GoTo";
    const next = action.get(N("Next"));
    if (!goTo && next === undefined) return raw!;
    let copy: PDFDict;
    if (goTo) {
      // Rebuilt from scratch: PDF 2.0's /SD would lead into the structure tree of the whole file.
      const d = remapDest(action.get(N("D")));
      if (!d) return null;
      copy = ctx.obj({ S: "GoTo", D: d });
    } else {
      copy = action.clone(ctx);
      copy.delete(N("Next"));
    }
    const chain = deref(ctx, next);
    const followers = (chain instanceof PDFArray ? chain.asArray() : next === undefined ? [] : [next]).map((a) => cleanAction(a, depth + 1)).filter((a) => a !== null);
    if (followers.length) copy.set(N("Next"), followers.length === 1 ? followers[0]! : ctx.obj(followers));
    return copy;
  };

  // --- form fields: widgets on copied pages, and the fields above them ---
  const fieldNodes = new Set<PDFRef>();
  const roots = new Set<PDFRef>();
  const signatureRoots = new Set<PDFRef>();
  const noteWidget = (widget: PDFRef): void => {
    const chain = new Set<PDFRef>();
    let type: string | undefined;
    let cur = widget;
    for (;;) {
      chain.add(cur);
      fieldNodes.add(cur);
      const node = ctx.lookup(cur) as PDFDict;
      type ??= nameOf(deref(ctx, node.get(N("FT"))));
      const parent = node.get(N("Parent"));
      if (!(parent instanceof PDFRef) || chain.has(parent) || !(ctx.lookup(parent) instanceof PDFDict)) break;
      cur = parent;
    }
    (type === "Sig" ? signatureRoots : roots).add(cur);
  };

  // --- each page: its annotations, then the page dictionary itself ---
  const cleanPages = new Map<number, PDFPageLeaf>();
  for (const i of kept) {
    const page = srcPages[i]!.node.clone(ctx);
    page.delete(N("B"));
    // Private application data: Illustrator and others keep a copy of the whole document there.
    page.delete(N("PieceInfo"));
    const annots: PDFObject[] = [];
    const annotDicts: PDFDict[] = [];
    for (const raw of arrayAt(page, "Annots")) {
      const original = deref(ctx, raw);
      if (!(original instanceof PDFDict)) continue;
      const subtype = nameOf(original.get(N("Subtype")));
      // An annotation written straight into the array has no reference to stand in for: use a copy.
      const direct = raw instanceof PDFRef ? undefined : original.clone(ctx);
      const editable = (): PDFDict => direct ?? edit(raw as PDFRef);
      let dead = false;
      if (subtype === "Link" && original.has(N("Dest"))) {
        const d = remapDest(original.get(N("Dest")));
        if (!d) dead = true;
        else if (d !== original.get(N("Dest"))) editable().set(N("Dest"), d);
      }
      if (original.has(N("A"))) {
        const a = cleanAction(original.get(N("A")));
        if (a === null && subtype === "Link" && !original.has(N("Dest"))) dead = true;
        else if (a === null) editable().delete(N("A"));
        else if (a !== original.get(N("A"))) editable().set(N("A"), a);
      }
      if (dead) {
        if (raw instanceof PDFRef) replacements.delete(raw);
        continue;
      }
      if (subtype === "Widget") {
        if (raw instanceof PDFRef) noteWidget(raw);
        else direct!.delete(N("Parent"));
      }
      annots.push(direct ?? raw);
      annotDicts.push(original);
    }
    if (page.has(N("Annots"))) {
      if (annots.length) page.set(N("Annots"), ctx.obj(annots));
      else page.delete(N("Annots"));
    }
    const resources = trimmer.page(page, annotDicts);
    if (resources) page.set(N("Resources"), resources);
    else if (resources === null && options.strict) throw new PdfToolError("invalid");
    cleanPages.set(i, page);
  }
  if (options.strict && trimmer.incomplete) throw new PdfToolError("invalid");

  // Annotations and form fields of the pages left behind (a reply or popup can point at one, a
  // form action can list fields) become null as well: their comments and values stay behind.
  const keptAnnots = new Set<PDFObject>();
  for (const page of cleanPages.values()) for (const raw of arrayAt(page, "Annots")) keptAnnots.add(raw);
  srcPages.forEach((p, i) => {
    if (cleanPages.has(i)) return;
    for (const raw of arrayAt(p.node, "Annots")) if (raw instanceof PDFRef && !keptAnnots.has(raw)) mapped.set(raw, PDFNull);
  });
  const fieldsSeen = new Set<PDFRef>();
  const fieldStack = arrayAt(dictAt(src.catalog, "AcroForm"), "Fields");
  while (fieldStack.length) {
    const ref = fieldStack.pop();
    if (!(ref instanceof PDFRef) || fieldsSeen.has(ref)) continue;
    fieldsSeen.add(ref);
    if (!fieldNodes.has(ref) && !keptAnnots.has(ref)) mapped.set(ref, PDFNull);
    const node = ctx.lookup(ref);
    if (node instanceof PDFDict) fieldStack.push(...arrayAt(node, "Kids"));
  }

  // A field keeps only the kids that are shown on copied pages (or lead to one).
  for (const ref of fieldNodes) {
    const node = ctx.lookup(ref) as PDFDict;
    if (!node.has(N("Kids"))) continue;
    edit(ref).set(N("Kids"), ctx.obj(arrayAt(node, "Kids").filter((kid) => kid instanceof PDFRef && fieldNodes.has(kid))));
  }
  // The form: fields the source lists, minus signatures (their widgets stay as pictures: the
  // signature cannot be valid in a new file, and listing it would only make viewers say so).
  const form = dictAt(src.catalog, "AcroForm");
  const formRoots = arrayAt(form, "Fields").filter((r): r is PDFRef => r instanceof PDFRef && roots.has(r) && !signatureRoots.has(r));
  // What fields inherit from the form itself moves onto them: the next source may say otherwise.
  for (const key of ["DA", "Q"]) {
    const inherited = form?.get(N(key));
    if (inherited === undefined) continue;
    for (const root of formRoots) if (!(ctx.lookup(root) as PDFDict).has(N(key))) edit(root).set(N(key), inherited);
  }
  // Two files can name their fields alike (two filled copies of one form), and viewers treat equal
  // names as one field with one value. Such a source goes under a parent field of its own.
  const outForm = dictAt(out.catalog, "AcroForm");
  const fieldName = (field: PDFObject | undefined): string | undefined => {
    const t = field instanceof PDFDict ? deref(field.context, field.get(N("T"))) : undefined;
    return t instanceof PDFString || t instanceof PDFHexString ? t.decodeText() : undefined;
  };
  const taken = new Set(arrayAt(outForm, "Fields").map((f) => fieldName(deref(outCtx, f))));
  let wrapper: { name: string; srcRef: PDFRef; ref: PDFRef } | undefined;
  if (formRoots.some((r) => fieldName(ctx.lookup(r)) !== undefined && taken.has(fieldName(ctx.lookup(r))))) {
    let n = 2;
    while (taken.has(`doc${n}`)) n++;
    // A reference of the source that holds nothing, only to stand for the parent while copying.
    wrapper = { name: `doc${n}`, srcRef: ctx.nextRef(), ref: outCtx.nextRef() };
    mapped.set(wrapper.srcRef, wrapper.ref);
    for (const root of formRoots) edit(root).set(N("Parent"), wrapper.srcRef);
  }

  // --- copy ---
  const replacementRefs = new Map<PDFRef, PDFRef>();
  for (const ref of replacements.keys()) {
    const to = outCtx.nextRef();
    replacementRefs.set(ref, to);
    mapped.set(ref, to);
  }
  // The copier finds an object written in place by identity: its edited copy stands in for it.
  for (const [original, copy] of inPlace) mapped.set(original, copier.copy(copy));
  const done = new Set<number>();
  const pages = indices.map((i) => {
    // A page asked for twice gets a second dictionary over the same content, as with pdf-lib.
    const ref = done.has(i) ? outCtx.nextRef() : pageRefs.get(i)!;
    done.add(i);
    const node = copier.copy(cleanPages.get(i)!);
    outCtx.assign(ref, node);
    return PDFPage.of(node, ref, out);
  });
  for (const [ref, copy] of replacements) outCtx.assign(replacementRefs.get(ref)!, copier.copy(copy));

  // --- the form ---
  if (form && formRoots.length) {
    const target = outForm ?? outCtx.obj({ Fields: [] });
    if (!outForm) out.catalog.set(N("AcroForm"), outCtx.register(target));
    const copiedRoots = formRoots.map((r) => copier.copy(r));
    if (wrapper) outCtx.assign(wrapper.ref, outCtx.obj({ T: PDFString.of(wrapper.name), Kids: copiedRoots }));
    const fields = target.lookup(N("Fields"), PDFArray);
    for (const ref of wrapper ? [wrapper.ref] : copiedRoots) fields.push(ref);
    if (deref(ctx, form.get(N("NeedAppearances"))) === PDFBool.True) target.set(N("NeedAppearances"), PDFBool.True);
    // The fonts that default appearance strings name; the first source to use a name keeps it.
    const fonts = dictAt(dictAt(form, "DR"), "Font");
    if (fonts) {
      if (!dictAt(target, "DR")) target.set(N("DR"), outCtx.obj({}));
      const resources = dictAt(target, "DR")!;
      if (!dictAt(resources, "Font")) resources.set(N("Font"), outCtx.obj({}));
      const targetFonts = dictAt(resources, "Font")!;
      for (const [key, font] of fonts.entries()) if (!targetFonts.has(key)) targetFonts.set(key, copier.copy(font));
    }
  }

  // --- layers: the groups the copied content really uses, with their state in the default configuration ---
  const layers = dictAt(src.catalog, "OCProperties");
  const groups = arrayAt(layers, "OCGs").filter((g): g is PDFRef => g instanceof PDFRef && mapped.has(g));
  if (layers && groups.length) {
    const config = dictAt(layers, "D");
    const isGroup = new Set<PDFObject>(groups);
    const on = new Set(arrayAt(config, "ON"));
    const off = new Set(arrayAt(config, "OFF"));
    const baseOff = nameOf(config?.get(N("BaseState"))) === "OFF";
    const hidden = (g: PDFRef): boolean => (baseOff ? !on.has(g) : off.has(g));
    const copies = (list: readonly PDFObject[]): PDFObject[] => list.filter((g) => isGroup.has(g)).map((g) => copier.copy(g));
    /** /Order: groups, sub-arrays and their labels; a branch with no group left goes, label included. */
    const order = (list: readonly PDFObject[]): PDFObject[] => {
      const left: PDFObject[] = [];
      for (const item of list) {
        const v = deref(ctx, item);
        if (isGroup.has(item)) left.push(copier.copy(item));
        else if (v instanceof PDFString || v instanceof PDFHexString) left.push(v.clone());
        else if (v instanceof PDFArray) {
          const sub = order(v.asArray());
          if (sub.some((s) => s instanceof PDFRef || s instanceof PDFArray)) left.push(outCtx.obj(sub));
        }
      }
      return left;
    };

    let target = dictAt(out.catalog, "OCProperties");
    if (!target) {
      target = outCtx.obj({ OCGs: [], D: { ON: [], OFF: [], Order: [] } });
      out.catalog.set(N("OCProperties"), target);
    }
    const targetConfig = dictAt(target, "D")!;
    const append = (dict: PDFDict, key: string, items: readonly PDFObject[]): void => {
      if (!items.length) return;
      if (!(dict.get(N(key)) instanceof PDFArray)) dict.set(N(key), outCtx.obj([]));
      for (const item of items) (dict.get(N(key)) as PDFArray).push(item);
    };
    append(target, "OCGs", copies(groups));
    append(targetConfig, "ON", copies(groups.filter((g) => !hidden(g))));
    append(targetConfig, "OFF", copies(groups.filter(hidden)));
    append(targetConfig, "Order", order(arrayAt(config, "Order")).filter((s) => s instanceof PDFRef || s instanceof PDFArray));
    append(targetConfig, "Locked", copies(arrayAt(config, "Locked")));
    const radio = arrayAt(config, "RBGroups").map((g) => copies(deref(ctx, g) instanceof PDFArray ? (deref(ctx, g) as PDFArray).asArray() : []));
    append(targetConfig, "RBGroups", radio.filter((g) => g.length > 1).map((g) => outCtx.obj(g)));
    // Automatic states (show on screen, hide in print...) for the groups that are left.
    const auto: PDFObject[] = [];
    for (const item of arrayAt(config, "AS")) {
      const usage = deref(ctx, item);
      if (!(usage instanceof PDFDict)) continue;
      const members = copies(arrayAt(usage, "OCGs"));
      if (!members.length) continue;
      const copy = outCtx.obj({ OCGs: members });
      for (const key of ["Event", "Category"]) {
        const v = usage.get(N(key));
        if (v !== undefined) copy.set(N(key), copier.copy(v));
      }
      auto.push(copy);
    }
    append(targetConfig, "AS", auto);
  }

  // A Form XObject can carry /PieceInfo as a page does. It goes from every form this call copied;
  // what it pointed at is left unreferenced, for the pruneUnreachable that every caller runs.
  for (const copy of mapped.values()) {
    const stream = copy instanceof PDFRef ? outCtx.lookup(copy) : undefined;
    if (stream instanceof PDFStream && nameOf(stream.dict.get(N("Subtype"))) === "Form") stream.dict.delete(N("PieceInfo"));
  }

  return pages;
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

async function save(doc: PDFDocument): Promise<Uint8Array> {
  await doc.flush();
  pruneUnreachable(doc.context);
  return doc.save({ useObjectStreams: true });
}

/** Concatenate every page of `docs`, in order. */
export async function mergeDocuments(docs: PDFDocument[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const src of docs) {
    const pages = await copyPagesDetached(out, src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }
  return save(out);
}

/** A new PDF with the given 0-based pages of `src`, in the given order. */
export async function extractPages(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const pages = await copyPagesDetached(out, src, indices);
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
  const pages = await copyPagesDetached(
    out,
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
