/**
 * PDF.js for page thumbnails, fully same-origin (CSP: script-src/connect-src 'self', no eval):
 * - the worker is a bundled asset (?url), never a CDN;
 * - CMaps, standard fonts and the JBIG2/OpenJPEG decoders are bundled assets too, served through a
 *   custom BinaryDataFactory that maps PDF.js file names to Vite asset URLs (fetched only on demand);
 * - ICC colour management (qcms) is left off: without `wasmUrl` PDF.js falls back to plain RGB.
 * pdfjs-dist 6 has no eval-based code path (`isEvalSupported` was removed upstream), so no flag is needed.
 * The legacy build carries polyfills for APIs the modern build assumes (Math.sumPrecise, etc.).
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { PdfToolError } from "./pdf-errors";

const urls = (files: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1), url]));

const assets = {
  cMapUrl: urls(
    import.meta.glob<string>("/node_modules/pdfjs-dist/cmaps/*.bcmap", { eager: true, query: "?url", import: "default" }),
  ),
  standardFontDataUrl: urls(
    import.meta.glob<string>("/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ),
  wasmUrl: urls(
    import.meta.glob<string>("/node_modules/pdfjs-dist/wasm/{jbig2,openjpeg}.wasm", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ),
};

/** Passed as getDocument({ BinaryDataFactory }); PDF.js instantiates it and calls fetch(). */
class BundledBinaryDataFactory {
  async fetch({ kind, filename }: { kind: keyof typeof assets; filename: string }): Promise<Uint8Array> {
    const url = assets[kind]?.get(filename);
    if (!url) throw new Error(`PDF.js asset not bundled: ${kind}/${filename}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PDF.js asset ${filename}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

let lib: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;

function loadLib() {
  lib ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
    m.GlobalWorkerOptions.workerSrc = workerUrl;
    return m;
  });
  return lib;
}

/** Open a PDF for rendering. PDF.js takes ownership of `data`, so pass a copy if you still need it. */
export async function openForRender(data: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadLib();
  try {
    return await pdfjs.getDocument({
      data,
      BinaryDataFactory: BundledBinaryDataFactory,
      useWorkerFetch: false,
      enableXfa: false,
      // Keep rendering local and quiet: no system-font probing beyond the bundled standard fonts.
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch (err) {
    if (err instanceof pdfjs.PasswordException) throw new PdfToolError("encrypted");
    throw new PdfToolError("invalid");
  }
}

/** Render a page into a canvas whose longest CSS side is about `cssSize` px. */
export async function renderThumbnail(page: PDFPageProxy, cssSize: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  const scale = (cssSize / Math.max(base.width, base.height)) * ratio;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, viewport }).promise;
  return canvas;
}
