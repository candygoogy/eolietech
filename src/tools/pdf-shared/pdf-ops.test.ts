// @vitest-environment node
import { deflateRawSync } from "node:zlib";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString, StandardFonts, type PDFPage } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPages, loadPdf, mergeDocuments, PdfToolError, rearrangePages, scanContent } from "./pdf-ops";
import { holds, pageTexts, sharedResourcesPdf, xobjects } from "./test-fixtures";

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

const SECRET = "SECRETSALARY98765";

/** Three pages of text, each naming itself ("PAGE1TEXT", ...); page 2 also holds the secret. */
async function threePages(): Promise<{ doc: PDFDocument; pages: PDFPage[] }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = [1, 2, 3].map((n) => {
    const page = doc.addPage([300, 300]);
    page.drawText(n === 2 ? `PAGE2TEXT ${SECRET}` : `PAGE${n}TEXT`, { x: 20, y: 250, size: 14, font });
    return page;
  });
  return { doc, pages };
}

const annotsOf = (page: PDFPage): PDFDict[] => {
  const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  return annots ? annots.asArray().map((a) => page.doc.context.lookup(a, PDFDict)) : [];
};

/** The output page a link jumps to (0-based), or the URI it opens, or "dead". */
function linkTargets(doc: PDFDocument, pageIndex: number): (number | string)[] {
  const refs = doc.getPages().map((p) => p.ref);
  return annotsOf(doc.getPage(pageIndex)).map((annot) => {
    const action = annot.lookupMaybe(PDFName.of("A"), PDFDict);
    const uri = action?.lookupMaybe(PDFName.of("URI"), PDFString);
    if (uri) return uri.asString();
    const dest = annot.lookupMaybe(PDFName.of("Dest"), PDFArray) ?? action?.lookupMaybe(PDFName.of("D"), PDFArray);
    const target = dest?.get(0);
    const index = target instanceof PDFRef ? refs.indexOf(target) : -1;
    return index >= 0 ? index : "dead";
  });
}

describe("pages that are dropped are really gone", () => {
  it("split does not carry a page that a kept page links to", async () => {
    const { doc, pages } = await threePages();
    const ctx = doc.context;
    const link = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [20, 240, 200, 265], Dest: [pages[1]!.ref, "Fit"], P: pages[0]!.ref }));
    pages[0]!.node.set(PDFName.of("Annots"), ctx.obj([link]));
    // An article thread running over pages 1 and 2 (/B beads point at each other and at their pages).
    const bead1 = ctx.nextRef();
    const bead2 = ctx.nextRef();
    ctx.assign(bead1, ctx.obj({ Type: "Bead", P: pages[0]!.ref, N: bead2, V: bead2, R: [0, 0, 300, 300] }));
    ctx.assign(bead2, ctx.obj({ Type: "Bead", P: pages[1]!.ref, N: bead1, V: bead1, R: [0, 0, 300, 300] }));
    pages[0]!.node.set(PDFName.of("B"), ctx.obj([bead1]));
    pages[1]!.node.set(PDFName.of("B"), ctx.obj([bead2]));
    const source = await doc.save({ useObjectStreams: false });
    expect(await holds(source, SECRET)).toBe(true);

    const src = await loadPdf(source);
    const first = await extractPages(src, [0]);
    expect(await pageTexts(first)).toEqual(["PAGE1TEXT"]);
    expect(await holds(first, SECRET)).toBe(false);
    expect(await holds(first, "PAGE2TEXT")).toBe(false);
    expect(await holds(first, "PAGE3TEXT")).toBe(false);
    expect(linkTargets(await PDFDocument.load(first), 0)).toEqual([]);

    // The same loaded document serves the next part: the first split must not have changed it.
    const both = await extractPages(src, [0, 1]);
    expect(await pageTexts(both)).toEqual(["PAGE1TEXT", `PAGE2TEXT ${SECRET}`]);
    expect(linkTargets(await PDFDocument.load(both), 0)).toEqual([1]);

    const organized = await rearrangePages(await loadPdf(source), [{ index: 0, rotate: 0 }]);
    expect(await holds(organized, SECRET)).toBe(false);
  });

  it("split does not carry the fields and widgets of other pages through the form tree", async () => {
    const { doc, pages } = await threePages();
    const ctx = doc.context;
    const applicant = ctx.nextRef();
    const widget = (page: PDFPage, extra: Record<string, unknown>) =>
      ctx.register(ctx.obj({ Type: "Annot", Subtype: "Widget", Rect: [20, 200, 220, 224], P: page.ref, ...extra }));
    // applicant.name is shown on pages 1 and 2; applicant.salary lives on page 2 only.
    const nameField = ctx.nextRef();
    const name1 = widget(pages[0]!, { Parent: nameField });
    const name2 = widget(pages[1]!, { Parent: nameField });
    ctx.assign(nameField, ctx.obj({ FT: "Tx", T: PDFString.of("name"), V: PDFString.of("VISIBLENAME"), Parent: applicant, Kids: [name1, name2] }));
    const salary = widget(pages[1]!, { FT: "Tx", T: PDFString.of("salary"), V: PDFString.of("FIELDSECRET4242"), Parent: applicant });
    ctx.assign(applicant, ctx.obj({ T: PDFString.of("applicant"), Kids: [nameField, salary] }));
    pages[0]!.node.set(PDFName.of("Annots"), ctx.obj([name1]));
    pages[1]!.node.set(PDFName.of("Annots"), ctx.obj([name2, salary]));
    doc.catalog.set(PDFName.of("AcroForm"), ctx.obj({ Fields: [applicant], DA: PDFString.of("/Helv 0 Tf 0 g") }));
    const source = await doc.save({ useObjectStreams: false });

    const out = await extractPages(await loadPdf(source), [0]);
    expect(await holds(out, "FIELDSECRET4242")).toBe(false);
    expect(await holds(out, SECRET)).toBe(false);
    expect(await holds(out, "VISIBLENAME")).toBe(true);

    // The form survives with the kept field only: applicant -> name -> the one widget on page 1.
    const loaded = await PDFDocument.load(out);
    const fields = loaded.catalog.lookup(PDFName.of("AcroForm"), PDFDict).lookup(PDFName.of("Fields"), PDFArray);
    expect(fields.size()).toBe(1);
    const root = fields.lookup(0, PDFDict);
    expect(root.lookup(PDFName.of("T"), PDFString).asString()).toBe("applicant");
    const kids = root.lookup(PDFName.of("Kids"), PDFArray);
    expect(kids.size()).toBe(1);
    const leaf = kids.lookup(0, PDFDict).lookup(PDFName.of("Kids"), PDFArray);
    expect(leaf.asArray()).toEqual(loaded.getPage(0).node.lookup(PDFName.of("Annots"), PDFArray).asArray());
  });
});

describe("resources a page does not use", () => {
  const scan = (content: Uint8Array | string) => {
    const used = { XObject: new Set<string>(), Font: new Set<string>(), ExtGState: new Set<string>(), ColorSpace: new Set<string>(), Pattern: new Set<string>(), Shading: new Set<string>(), Properties: new Set<string>() };
    scanContent(typeof content === "string" ? Buffer.from(content, "latin1") : content, used);
    return Object.fromEntries(Object.entries(used).flatMap(([kind, names]) => (names.size ? [[kind, [...names].sort()]] : [])));
  };

  it("finds the names content calls, past strings, comments and inline image data", () => {
    expect(
      scan("q /GS1 gs /Cs1 cs /P#31 scn BT /F1 12 Tf (not /Fake Do \\) still (nested) text) Tj <2F46616B65> Tj ET % /Comment Do\n/Im1 Do /Sh1 sh /OC /MC0 BDC /Fm1 Do EMC /Span <</Lang (it)>> BDC EMC Q"),
    ).toEqual({ XObject: ["Fm1", "Im1"], Font: ["F1"], ExtGState: ["GS1"], ColorSpace: ["Cs1"], Pattern: ["P1"], Shading: ["Sh1"], Properties: ["Lang", "MC0", "OC", "Span"] });

    // Binary image data with an unbalanced parenthesis and a false "EI" must not swallow what follows.
    const image = Buffer.concat([Buffer.from("BI /W 4 /H 1 /CS /Indexed1 /BPC 8 ID ", "latin1"), Buffer.from([0x28, 0x45, 0x49, 0x20, 0x00, 0xff, 0x28, 0x2f]), Buffer.from("\nEI\n/After Do", "latin1")]);
    expect(scan(image)).toEqual({ XObject: ["After"], ColorSpace: ["CS", "Indexed1", "W", "H", "BPC"].sort() });
  });

  it("go, also when pages share one resources dictionary and a form borrows the page's", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const ctx = doc.context;
    const image = (width: number) => ctx.register(ctx.stream(new Uint8Array(width), { Type: "XObject", Subtype: "Image", Width: width, Height: 1, ColorSpace: "DeviceGray", BitsPerComponent: 8 }));
    // Fm1 has no /Resources: it draws Im3 out of the page's. Fm2 has its own, cut down the same way.
    // Fm3 was given the shared dictionary itself as its own, which must not bring page 1's image along.
    const shared = ctx.nextRef();
    const borrowing = ctx.register(ctx.stream("/Im3 Do", { Type: "XObject", Subtype: "Form", BBox: [0, 0, 9, 9] }));
    const own = ctx.register(ctx.stream("/Inner Do", { Type: "XObject", Subtype: "Form", BBox: [0, 0, 9, 9], Resources: { XObject: { Inner: image(44), Spare: image(45) } } }));
    const sharing = ctx.register(ctx.stream("/Im2 Do", { Type: "XObject", Subtype: "Form", BBox: [0, 0, 9, 9], Resources: shared }));
    ctx.assign(
      shared,
      ctx.obj({ ProcSet: ["PDF"], Font: { F1: font.ref }, XObject: { Im1: image(11), Im2: image(22), Im3: image(33), Fm1: borrowing, Fm2: own, Fm3: sharing }, ColorSpace: { DefaultRGB: "DeviceRGB", Cs9: "DeviceGray" } }),
    );
    const contents = ["/Im1 Do", "BT /F1 9 Tf (TWO) Tj ET /Im2 Do /Fm1 Do /Fm3 Do /Fm2", "Do"].map((c) => ctx.register(ctx.stream(c)));
    const p1 = doc.addPage([100, 100]);
    p1.node.set(PDFName.of("Resources"), shared);
    p1.node.set(PDFName.of("Contents"), contents[0]!);
    const p2 = doc.addPage([100, 100]);
    p2.node.set(PDFName.of("Resources"), shared);
    // Operands and operator in different streams of one page, which the format allows.
    p2.node.set(PDFName.of("Contents"), ctx.obj([contents[1]!, contents[2]!]));
    const source = await doc.save({ useObjectStreams: false });

    const out = await extractPages(await loadPdf(source), [1]);
    expect(await xobjects(out)).toEqual(["Form", "Form", "Form", "Image 22x1", "Image 33x1", "Image 44x1"]);
    const resources = (await PDFDocument.load(out)).getPage(0).node.Resources()!;
    const keys = (kind: string) => resources.lookup(PDFName.of(kind), PDFDict).keys().map((k) => k.decodeText());
    expect(keys("XObject").sort()).toEqual(["Fm1", "Fm2", "Fm3", "Im2", "Im3"]);
    expect(keys("ColorSpace")).toEqual(["DefaultRGB"]);
    expect(keys("Font")).toEqual(["F1"]);
    expect(resources.has(PDFName.of("ProcSet"))).toBe(true);
    expect(await pageTexts(out)).toEqual(["TWO"]);
  });
});

describe("links inside the document", () => {
  /** Page 1 links to page 3 (explicit), to page 2 (named destination), to page 3 (GoTo action) and to a web page. */
  async function linked(): Promise<Uint8Array> {
    const { doc, pages } = await threePages();
    const ctx = doc.context;
    const link = (extra: Record<string, unknown>) => ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [20, 240, 200, 265], ...extra }));
    const annots = [
      link({ Dest: [pages[2]!.ref, "Fit"] }),
      link({ Dest: PDFString.of("chap2") }),
      link({ A: { S: "GoTo", D: [pages[2]!.ref, "XYZ", 0, 300, null] } }),
      link({ A: { S: "URI", URI: PDFString.of("https://example.com/") } }),
    ];
    pages[0]!.node.set(PDFName.of("Annots"), ctx.obj(annots));
    const names = ctx.register(ctx.obj({ Names: [PDFString.of("chap2"), { D: [pages[1]!.ref, "Fit"] }] }));
    doc.catalog.set(PDFName.of("Names"), ctx.obj({ Dests: { Kids: [names] } }));
    return doc.save({ useObjectStreams: false });
  }

  it("still resolve to the right page after organize, and links to removed pages go", async () => {
    const source = await linked();
    const reversed = await rearrangePages(await loadPdf(source), [2, 1, 0].map((index) => ({ index, rotate: 0 })));
    expect(linkTargets(await PDFDocument.load(reversed), 2)).toEqual([0, 1, 0, "https://example.com/"]);

    const without2 = await rearrangePages(await loadPdf(source), [2, 0].map((index) => ({ index, rotate: 0 })));
    expect(linkTargets(await PDFDocument.load(without2), 1)).toEqual([0, 0, "https://example.com/"]);
    expect(await holds(without2, "PAGE2TEXT")).toBe(false);
  });

  it("still resolve inside each file after merge and split", async () => {
    const source = await linked();
    const merged = await PDFDocument.load(await mergeDocuments([await loadPdf(source), await loadPdf(source)]));
    expect(merged.getPageCount()).toBe(6);
    expect(linkTargets(merged, 0)).toEqual([2, 1, 2, "https://example.com/"]);
    expect(linkTargets(merged, 3)).toEqual([5, 4, 5, "https://example.com/"]);

    const split = await extractPages(await loadPdf(source), [0, 1]);
    expect(linkTargets(await PDFDocument.load(split), 0)).toEqual([1, "https://example.com/"]);
  });
});

describe("layers", () => {
  /** Page 1 draws one hidden and one visible layer; page 2 draws a third, hidden one. */
  async function layered(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const ctx = doc.context;
    const ocg = (label: string) => ctx.register(ctx.obj({ Type: "OCG", Name: PDFString.of(label) }));
    const hidden = ocg("Hidden notes");
    const shown = ocg("Shown");
    const other = ocg("LAYEROFPAGETWO");
    const draw = (text: string, layers: string[]) =>
      ctx.register(ctx.stream(layers.map((key, i) => `/OC /${key} BDC BT /F1 12 Tf 20 ${250 - i * 30} Td (${text}${i}) Tj ET EMC`).join("\n")));
    const resources = (properties: Record<string, PDFRef>) => ctx.obj({ Font: { F1: font.ref }, Properties: properties });
    const p1 = doc.addPage([300, 300]);
    p1.node.set(PDFName.of("Resources"), resources({ MC0: hidden, MC1: shown }));
    p1.node.set(PDFName.of("Contents"), draw("ONE", ["MC0", "MC1"]));
    const p2 = doc.addPage([300, 300]);
    p2.node.set(PDFName.of("Resources"), resources({ MC0: other }));
    p2.node.set(PDFName.of("Contents"), draw("TWO", ["MC0"]));
    doc.catalog.set(
      PDFName.of("OCProperties"),
      ctx.obj({ OCGs: [hidden, shown, other], D: { OFF: [hidden, other], Order: [hidden, shown, [PDFString.of("Second page"), other]] } }),
    );
    return doc.save({ useObjectStreams: false });
  }

  /** Layer names by state, read from the output's /OCProperties, checked against the groups the pages really use. */
  function layers(doc: PDFDocument): { all: string[]; off: string[]; order: string } {
    const ocp = doc.catalog.lookup(PDFName.of("OCProperties"), PDFDict);
    const label = (ref: unknown) => doc.context.lookup(ref as PDFRef, PDFDict).lookup(PDFName.of("Name"), PDFString).asString();
    const used = new Set<PDFRef>();
    for (const page of doc.getPages()) {
      const props = page.node.Resources()?.lookupMaybe(PDFName.of("Properties"), PDFDict);
      for (const [, v] of props?.entries() ?? []) used.add(v as PDFRef);
    }
    const all = ocp.lookup(PDFName.of("OCGs"), PDFArray).asArray();
    expect(new Set(all)).toEqual(used);
    const d = ocp.lookup(PDFName.of("D"), PDFDict);
    const walk = (a: PDFArray): string =>
      `[${a
        .asArray()
        .map((v) => (v instanceof PDFArray ? walk(v) : v instanceof PDFString ? `"${v.asString()}"` : label(v)))
        .join(" ")}]`;
    return { all: all.map(label), off: d.lookup(PDFName.of("OFF"), PDFArray).asArray().map(label), order: walk(d.lookup(PDFName.of("Order"), PDFArray)) };
  }

  it("a hidden layer stays hidden after split and organize, and layers of dropped pages go", async () => {
    const source = await layered();
    const split = await extractPages(await loadPdf(source), [0]);
    expect(layers(await PDFDocument.load(split))).toEqual({ all: ["Hidden notes", "Shown"], off: ["Hidden notes"], order: "[Hidden notes Shown]" });
    expect(await holds(split, "LAYEROFPAGETWO")).toBe(false);

    const organized = await rearrangePages(await loadPdf(source), [{ index: 1, rotate: 0 }]);
    expect(layers(await PDFDocument.load(organized))).toEqual({ all: ["LAYEROFPAGETWO"], off: ["LAYEROFPAGETWO"], order: '[["Second page" LAYEROFPAGETWO]]' });
  });

  it("merge combines the layers of every file", async () => {
    const source = await layered();
    const merged = await mergeDocuments([await loadPdf(source), await loadPdf(await makePdf(1)), await loadPdf(source)]);
    const got = layers(await PDFDocument.load(merged));
    expect(got.all).toEqual(["Hidden notes", "Shown", "LAYEROFPAGETWO", "Hidden notes", "Shown", "LAYEROFPAGETWO"]);
    expect(got.off).toEqual(["Hidden notes", "LAYEROFPAGETWO", "Hidden notes", "LAYEROFPAGETWO"]);
  });
});

describe("forms", () => {
  /** A filled text field with no appearance stream: viewers draw the value because the form says /NeedAppearances. */
  async function filled(value: string): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const ctx = doc.context;
    const page = doc.addPage([300, 300]);
    doc.addPage([300, 300]);
    const field = ctx.register(
      ctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Tx", T: PDFString.of("holder"), V: PDFString.of(value), Rect: [20, 200, 280, 224], P: page.ref, F: 4 }),
    );
    page.node.set(PDFName.of("Annots"), ctx.obj([field]));
    doc.catalog.set(PDFName.of("AcroForm"), ctx.obj({ Fields: [field], NeedAppearances: true, DA: PDFString.of("/Helv 12 Tf 0 g"), DR: { Font: { Helv: font.ref } } }));
    return doc.save({ useObjectStreams: false });
  }

  /** The strings PDF.js draws on each page, annotations included (what a viewer shows). */
  async function drawn(bytes: Uint8Array): Promise<string[]> {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false, verbosity: 0 }).promise;
    const out: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const ops = await (await pdf.getPage(n)).getOperatorList();
      const glyphs = ops.fnArray.flatMap((fn, i) => (fn === pdfjs.OPS.showText ? (ops.argsArray[i][0] as { unicode?: string }[]) : []));
      out.push(glyphs.map((g) => g.unicode ?? "").join(""));
    }
    await pdf.loadingTask.destroy();
    return out;
  }

  it("a filled field without an appearance stream still shows its value after split, organize and merge", async () => {
    const source = await filled("FILLED VALUE");
    expect(await drawn(source)).toEqual(["FILLED VALUE", ""]);
    expect(await drawn(await extractPages(await loadPdf(source), [0]))).toEqual(["FILLED VALUE"]);
    expect(await drawn(await rearrangePages(await loadPdf(source), [{ index: 1, rotate: 0 }, { index: 0, rotate: 0 }]))).toEqual(["", "FILLED VALUE"]);

    // Two filled copies of one form: same field name, different values, and each keeps its own.
    const merged = await mergeDocuments([await loadPdf(source), await loadPdf(await filled("SECOND COPY"))]);
    expect(await drawn(merged)).toEqual(["FILLED VALUE", "", "SECOND COPY", ""]);
    const loaded = await PDFDocument.load(merged);
    const fields = loaded.catalog.lookup(PDFName.of("AcroForm"), PDFDict).lookup(PDFName.of("Fields"), PDFArray);
    const rootNames = fields.asArray().map((_, i) => fields.lookup(i, PDFDict).lookup(PDFName.of("T"), PDFString).asString());
    expect(new Set(rootNames).size).toBe(2);
  });
});

describe("content that reaches a resources dictionary shared with removed pages", () => {
  it.each(["soft mask", "shading pattern", "type 3 font"] as const)("is cut down by its own content when reached through a %s", async (route) => {
    const source = await sharedResourcesPdf(route);
    // Page 1 draws Im1, and Im3 through the route; Im2 is page 2's alone.
    const first = await extractPages(await loadPdf(source), [0]);
    expect((await xobjects(first)).filter((x) => x.startsWith("Image"))).toEqual(["Image 11x1", "Image 33x1"]);
    const second = await extractPages(await loadPdf(source), [1]);
    expect(await xobjects(second)).toEqual(["Image 22x1"]);
  });

  it("reads a page whose content is empty but filtered, or deflated without a zlib header", async () => {
    const images = async (bytes: Uint8Array) => xobjects(await extractPages(await loadPdf(bytes), [0]));
    expect(await images(await sharedResourcesPdf("none", { data: new Uint8Array(0), filter: "FlateDecode" }))).toEqual([]);
    const raw = new Uint8Array(deflateRawSync(Buffer.from("q 10 0 0 10 0 0 cm /Im1 Do Q")));
    expect(await images(await sharedResourcesPdf("none", { data: raw, filter: "FlateDecode" }))).toEqual(["Image 11x1"]);
    // Damaged data (a zlib header, then a block type that does not exist) cannot be read: the page keeps all its resources.
    const damaged = Uint8Array.of(0x78, 0x9c, 0xff, 0xff, 0xff);
    expect((await images(await sharedResourcesPdf("none", { data: damaged, filter: "FlateDecode" }))).filter((x) => x.startsWith("Image"))).toEqual(["Image 11x1", "Image 22x1", "Image 33x1"]);
  });

  it("drops the private application data (/PieceInfo) of a kept page and of the forms it draws", async () => {
    const doc = await PDFDocument.create();
    const ctx = doc.context;
    const piece = (secret: string) => ctx.obj({ Illustrator: { LastModified: PDFString.of("D:20260101"), Private: ctx.register(ctx.stream(secret)) } });
    const borrowing = ctx.register(ctx.stream("0 0 1 1 re f", { Type: "XObject", Subtype: "Form", BBox: [0, 0, 9, 9], PieceInfo: piece("BORROWINGFORMPIECE") }));
    const owning = ctx.register(ctx.stream("0 0 1 1 re f", { Type: "XObject", Subtype: "Form", BBox: [0, 0, 9, 9], Resources: {}, PieceInfo: piece("OWNINGFORMPIECE") }));
    const page = doc.addPage([100, 100]);
    page.node.set(PDFName.of("Resources"), ctx.obj({ XObject: { Fm1: borrowing, Fm2: owning } }));
    page.node.set(PDFName.of("Contents"), ctx.register(ctx.stream("/Fm1 Do /Fm2 Do")));
    page.node.set(PDFName.of("PieceInfo"), piece("PAGEPIECESECRET"));
    const source = await doc.save({ useObjectStreams: false });
    expect(await holds(source, "PAGEPIECESECRET")).toBe(true);

    for (const out of [await extractPages(await loadPdf(source), [0]), await mergeDocuments([await loadPdf(source)])]) {
      for (const secret of ["PAGEPIECESECRET", "BORROWINGFORMPIECE", "OWNINGFORMPIECE"]) expect(await holds(out, secret), secret).toBe(false);
      expect(await xobjects(out)).toEqual(["Form", "Form"]);
    }
  });
});
