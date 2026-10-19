/**
 * Tesseract (tesseract.js + tesseract.js-core, WebAssembly) in a dedicated worker, fully same-origin:
 * - the worker entry (./tess-worker.js), tesseract.js's worker script and the core .js/.wasm are
 *   bundled assets (?url), never jsDelivr; only the LSTM-only core builds ship, and the page picks
 *   relaxed SIMD, SIMD or plain the same way tesseract.js would;
 * - the language data comes from /tessdata/<commit>/ (scripts/fetch-ocr-data.mjs), uncompressed
 *   (gzip: false) and cached by the browser's normal HTTP cache (cacheMethod "none": nothing is
 *   written to IndexedDB).
 * Loaded lazily by ./client.ts when the user presses Start.
 */
import { createWorker, type Page, type Worker as TessWorker } from "tesseract.js";
import workerScriptUrl from "tesseract.js/dist/worker.min.js?url";
import coreLstm from "tesseract.js-core/tesseract-core-lstm.js?url";
import wasmLstm from "tesseract.js-core/tesseract-core-lstm.wasm?url";
import coreSimd from "tesseract.js-core/tesseract-core-simd-lstm.js?url";
import wasmSimd from "tesseract.js-core/tesseract-core-simd-lstm.wasm?url";
import coreRelaxed from "tesseract.js-core/tesseract-core-relaxedsimd-lstm.js?url";
import wasmRelaxed from "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm?url";
import entryUrl from "./tess-worker.js?url";
import { coreVariant, langDataPath, type CoreVariant, type LangCode } from "./sizes";

const CORES: Record<CoreVariant, { js: string; wasm: string }> = {
  "relaxedsimd-lstm": { js: coreRelaxed, wasm: wasmRelaxed },
  "simd-lstm": { js: coreSimd, wasm: wasmSimd },
  lstm: { js: coreLstm, wasm: wasmLstm },
};

const abs = (url: string) => new URL(url, location.href).href;

export type LoadEvent = { kind: "download"; loaded: number } | { kind: "starting" };

export interface RecognizeOptions {
  /** Word boxes and baselines (for the PDF text layer). */
  boxes: boolean;
  /** Straighten slightly skewed photos first (changes box coordinates, so not with `boxes`). */
  deskew: boolean;
  /** Resolution of the image when known (PDF pages): spares Tesseract a guess. */
  dpi?: number;
}

export interface OcrEngine {
  readonly langs: string;
  recognize(image: HTMLCanvasElement, opts: RecognizeOptions, onProgress: (p: number) => void): Promise<Page>;
  terminate(): void;
}

export class EngineStopped extends Error {}

/** Start a worker with `langs` loaded ("eng", "ita", "ita+eng"...). Rejects if the engine or the data cannot load. */
export async function startEngine(langs: LangCode[], signal: AbortSignal, onLoad: (e: LoadEvent) => void): Promise<OcrEngine> {
  const variant = coreVariant();
  const core = CORES[variant];
  const query = new URLSearchParams({ core: abs(core.js), wasm: abs(core.wasm), worker: abs(workerScriptUrl) });
  const downloaded = new Map<string, number>();
  let onRecognize: ((p: number) => void) | null = null;
  let fail: ((err: unknown) => void) | null = null;
  let pending: { reject: (err: unknown) => void } | null = null;
  let stopped = false;

  const failed = new Promise<never>((_, reject) => {
    fail = reject;
    if (signal.aborted) reject(new EngineStopped());
    signal.addEventListener("abort", () => reject(new EngineStopped()), { once: true });
  });
  const created = createWorker(langs.join("+"), 1 /* OEM.LSTM_ONLY */, {
    workerPath: `${abs(entryUrl)}?${query}`,
    workerBlobURL: false,
    corePath: abs(core.js),
    langPath: abs(langDataPath()),
    gzip: false,
    cacheMethod: "none",
    logger: (m) => {
      const msg = m as unknown as { status: string; progress?: number; url?: string; loaded?: number };
      if (msg.status === "eolietech:download" && msg.url) {
        downloaded.set(msg.url, msg.loaded ?? 0);
        onLoad({ kind: "download", loaded: [...downloaded.values()].reduce((a, b) => a + b, 0) });
      } else if (msg.status === "initializing api") {
        onLoad({ kind: "starting" });
      } else if (msg.status === "recognizing text" && typeof msg.progress === "number") {
        onRecognize?.(msg.progress);
      }
    },
    // Without a handler tesseract.js rethrows worker errors as uncaught exceptions on the page.
    errorHandler: (err: unknown) => {
      fail?.(err);
      pending?.reject(err);
    },
  });
  let worker: TessWorker;
  try {
    worker = await Promise.race([created, failed]);
  } catch (err) {
    void created.then((w) => w.terminate()).catch(() => {});
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    fail = null;
  }

  return {
    langs: langs.join("+"),
    async recognize(image, opts, onProgress) {
      if (stopped) throw new EngineStopped();
      onRecognize = onProgress;
      try {
        // Per-call Tesseract parameters (tesseract.js restores them afterwards). debug_file keeps
        // Tesseract's diagnostics ("Estimating resolution as ...") out of the console.
        const params: Record<string, string | boolean> = { rotateAuto: opts.deskew, debug_file: "/dev/null" };
        if (opts.dpi) params.user_defined_dpi = String(opts.dpi);
        return await new Promise<Page>((resolve, reject) => {
          pending = { reject };
          worker
            .recognize(image, params as never, { text: true, blocks: opts.boxes })
            .then((r) => resolve(r.data), reject);
        });
      } finally {
        pending = null;
        onRecognize = null;
      }
    },
    terminate() {
      if (stopped) return;
      stopped = true;
      pending?.reject(new EngineStopped());
      void worker.terminate();
    },
  };
}
