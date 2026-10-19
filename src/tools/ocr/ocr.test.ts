// @vitest-environment node
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { degrees, PDFDocument, pushGraphicsState, scale as scaleOp, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { checkFile, folderFor, sourceUrl, validateSpec } from "../../../scripts/fetch-ocr-data.mjs";
import { linesFromBlocks } from "./page-text";
import { ENGINE_BYTES, firstRunBytes, langDataPath, langsFor } from "./sizes";
import tessdata from "./tessdata.json";
import { apply, baselineY, buildSearchablePdf, invert, toWinAnsi, wordMatrix, type Matrix, type PageLayer } from "./text-layer";

const require = createRequire(import.meta.url);

/** What PDF.js's PageViewport computes for a page (scale, /Rotate, crop box): user space -> image pixels. */
function viewportTransform(view: [number, number, number, number], scale: number, rotation: 0 | 90 | 180 | 270): Matrix {
  const [x0, y0, x1, y1] = view;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const [a, b, c, d] = { 0: [1, 0, 0, -1], 90: [0, 1, 1, 0], 180: [-1, 0, 0, 1], 270: [0, -1, -1, 0] }[rotation];
  const ox = a === 0 ? Math.abs(cy - y0) * scale : Math.abs(cx - x0) * scale;
  const oy = a === 0 ? Math.abs(cx - x0) * scale : Math.abs(cy - y0) * scale;
  return [a * scale, b * scale, c * scale, d * scale, ox - a * scale * cx - c * scale * cy, oy - b * scale * cx - d * scale * cy];
}

interface Extracted {
  text: string;
  /** Origin of the first text item in user space. */
  origin?: [number, number];
  /** Text render modes set on the page (3 = invisible). */
  renderModes: number[];
}

async function extract(bytes: Uint8Array): Promise<Extracted[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false, verbosity: 0 }).promise;
  const pages: Extracted[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const items = content.items.filter((i) => "str" in i);
    const ops = await page.getOperatorList();
    const renderModes = ops.fnArray.flatMap((fn, i) => (fn === pdfjs.OPS.setTextRenderingMode ? [ops.argsArray[i][0] as number] : []));
    const first = items[0];
    pages.push({
      text: items.map((i) => i.str + (i.hasEOL ? "\n" : "")).join(""),
      origin: first ? [first.transform[4], first.transform[5]] : undefined,
      renderModes,
    });
  }
  await doc.loadingTask.destroy();
  return pages;
}

describe("fetch-ocr-data verification", () => {
  it("accepts the pinned spec and builds commit-pinned URLs and folders", () => {
    expect(() => validateSpec(tessdata)).not.toThrow();
    expect(sourceUrl(tessdata, "eng")).toBe(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${tessdata.commit}/eng.traineddata`);
    expect(folderFor(tessdata.commit)).toBe(tessdata.commit.slice(0, 12));
    expect(langDataPath()).toBe(`/tessdata/${tessdata.commit.slice(0, 12)}/`);
  });

  it("rejects branch names, unsafe language codes and oversized pins", () => {
    expect(() => validateSpec({ ...tessdata, commit: "main" })).toThrow(/commit/);
    expect(() => validateSpec({ ...tessdata, files: { "../x": tessdata.files.eng } })).toThrow(/language/);
    expect(() => validateSpec({ ...tessdata, files: { eng: { ...tessdata.files.eng, size: 30 * 1024 * 1024 } } })).toThrow(/25 MiB/);
  });

  it("checks size and sha256", () => {
    const buf = Buffer.from("tessdata");
    const pin = { size: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
    expect(checkFile(buf, pin)).toBeNull();
    expect(checkFile(Buffer.from("tessdatA"), pin)).toMatch(/sha256 mismatch/);
    expect(checkFile(Buffer.from("tess"), pin)).toMatch(/expected 8 bytes, got 4/);
  });
});

describe("engine sizes", () => {
  it("match the installed tesseract.js and tesseract.js-core files", () => {
    const size = (spec: string) => statSync(require.resolve(spec)).size;
    const worker = size("tesseract.js/dist/worker.min.js");
    const coreDir = path.dirname(require.resolve("tesseract.js-core/package.json"));
    for (const variant of Object.keys(ENGINE_BYTES) as (keyof typeof ENGINE_BYTES)[]) {
      const core = statSync(path.join(coreDir, `tesseract-core-${variant}.js`)).size + statSync(path.join(coreDir, `tesseract-core-${variant}.wasm`)).size;
      expect(ENGINE_BYTES[variant], variant).toBe(worker + core);
    }
    expect(firstRunBytes(["eng"], "lstm")).toBe(ENGINE_BYTES.lstm + tessdata.files.eng.size);
  });

  it("puts the page's language first when both are chosen", () => {
    expect(langsFor("both", "it")).toEqual(["ita", "eng"]);
    expect(langsFor("both", "en")).toEqual(["eng", "ita"]);
    expect(langsFor("ita", "en")).toEqual(["ita"]);
  });
});

describe("WinAnsi text", () => {
  it("keeps Latin-1 and the WinAnsi extras, maps look-alikes, replaces the rest", () => {
    expect(toWinAnsi("perché città €5 “ok” – à")).toBe("perché città €5 “ok” – à");
    expect(toWinAnsi("ﬁne ﬂow x−y ‑ ­")).toBe("fine flow x-y - ");
    expect(toWinAnsi("é")).toBe("é"); // decomposed accent composes
    expect(toWinAnsi("Łódź ő")).toBe("Lódz o"); // missing accented letters fall back to the base letter
    expect(toWinAnsi("日本 ✓ \u0007")).toBe("?? ? ");
  });

  it("encodes every mapped string with the standard Helvetica font", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (const s of ["perché città €5 “ok” – à", "ﬁ ← → ≤ ≥ № ı", "Ελληνικά עברית 😀"]) {
      expect(() => font.encodeText(toWinAnsi(s))).not.toThrow();
    }
  });
});

describe("word placement", () => {
  it("inverts a viewport transform", () => {
    const m = viewportTransform([0, 0, 612, 792], 300 / 72, 0);
    const [x, y] = apply(m, 100, 700);
    expect(apply(invert(m), x, y).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 700]);
  });

  it("maps an image box to the page's own coordinates, for every rotation and a shifted crop box", () => {
    const view: [number, number, number, number] = [50, 20, 650, 820];
    const box = { x0: 100, y0: 200, x1: 400, y1: 260 };
    for (const rotation of [0, 90, 180, 270] as const) {
      const t = viewportTransform(view, 2, rotation);
      const inv = invert(t);
      const m = wordMatrix(box, 250, 10, inv)!;
      // Text space (0,0) is the baseline start, (10,0) the baseline end (advance width 10 at size 1).
      const start = apply(t, m[4], m[5]);
      const end = apply(t, m[0] * 10 + m[4], m[1] * 10 + m[5]);
      const top = apply(t, m[2] + m[4], m[3] + m[5]);
      expect(start.map(Math.round), `rotation ${rotation}`).toEqual([100, 250]);
      expect(end.map(Math.round), `rotation ${rotation}`).toEqual([400, 250]);
      expect(top[0]).toBeCloseTo(100);
      expect(top[1]).toBeLessThan(250); // glyphs rise towards the top of the image
    }
  });

  it("takes the baseline from the line when there is one, inside the word box", () => {
    expect(baselineY({ x0: 0, y0: 100, x1: 50, y1: 140 }, { x0: 0, y0: 130, x1: 1000, y1: 140 })).toBeCloseTo(130.25);
    expect(baselineY({ x0: 0, y0: 100, x1: 50, y1: 140 }, null)).toBe(132);
    expect(baselineY({ x0: 0, y0: 100, x1: 50, y1: 140 }, { x0: 0, y0: 400, x1: 10, y1: 400 })).toBe(140);
  });

  it("flattens Tesseract blocks into lines, dropping empty words", () => {
    const blocks = [
      {
        paragraphs: [
          {
            lines: [
              { words: [{ text: "Hello", bbox: { x0: 1, y0: 2, x1: 3, y1: 4 } }, { text: " ", bbox: { x0: 5, y0: 2, x1: 6, y1: 4 } }], baseline: { x0: 1, y0: 4, x1: 3, y1: 4 } },
              { words: [] },
            ],
          },
        ],
      },
    ];
    expect(linesFromBlocks(blocks)).toEqual([{ words: [{ text: "Hello", bbox: { x0: 1, y0: 2, x1: 3, y1: 4 } }], baseline: { x0: 1, y0: 4, x1: 3, y1: 4 } }]);
    expect(linesFromBlocks(null)).toEqual([]);
  });
});

describe("searchable PDF", () => {
  async function scannedPdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setTitle("Scan");
    // An unbalanced graphics state left behind (q + scale, no Q), as some PDF writers do.
    doc.addPage([612, 792]).pushOperators(pushGraphicsState(), scaleOp(0.5, 0.5));
    doc.addPage([612, 792]).setRotation(degrees(90));
    return doc.save();
  }

  const layer = (transform: Matrix, words: string[]): PageLayer => ({
    transform,
    lines: [
      {
        words: words.map((text, i) => ({ text, bbox: { x0: 300 + i * 500, y0: 300, x1: 700 + i * 500, y1: 360 } })),
        baseline: { x0: 300, y0: 350, x1: 1700, y1: 350 },
      },
    ],
  });

  it("keeps every page and adds invisible text that PDF.js extracts", async () => {
    const source = await scannedPdf();
    const scale = 300 / 72;
    const out = await buildSearchablePdf(source, [
      layer(viewportTransform([0, 0, 612, 792], scale, 0), ["Hello", "città"]),
      layer(viewportTransform([0, 0, 612, 792], scale, 90), ["Rotated", "ﬁne"]),
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
    expect(doc.getTitle()).toBe("Scan");
    const [first, second] = await extract(out);
    expect(first!.text).toContain("Hello città");
    expect(second!.text).toContain("Rotated fine");
    expect(first!.renderModes).toEqual([3]);
    // Image (300, 350) at 300 dpi is (72, 792 - 84) in user space, despite the page's leftover scale.
    expect(first!.origin![0]).toBeCloseTo(72, 1);
    expect(first!.origin![1]).toBeCloseTo(708, 1);
  });

  it("leaves pages without a layer unchanged", async () => {
    const source = await scannedPdf();
    const out = await buildSearchablePdf(source, [null, undefined]);
    expect((await extract(out)).map((p) => p.text)).toEqual(["", ""]);
  });
});
