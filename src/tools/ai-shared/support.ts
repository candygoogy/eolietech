/**
 * Pure helpers for the AI tool pages (no DOM, no download): what the browser lacks, which download
 * milestone to announce, and why a model failed to load. Usable on the page and in workers.
 */

/** Features an AI tool can need. */
export type Need = "wasm" | "worker" | "offscreenCanvas" | "webAudio";

/** Names shown to the user (technical names, the same in every language). */
const LABELS: Record<Need, string> = {
  wasm: "WebAssembly",
  worker: "Web Workers",
  offscreenCanvas: "OffscreenCanvas",
  webAudio: "Web Audio",
};

/** The smallest module using a SIMD instruction (from wasm-feature-detect). ONNX Runtime Web needs SIMD. */
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

type Scope = Record<string, unknown>;

function has(scope: Scope, need: Need): boolean {
  try {
    switch (need) {
      case "wasm": {
        const wasm = scope.WebAssembly as { validate?: (b: BufferSource) => boolean } | undefined;
        return typeof wasm?.validate === "function" && wasm.validate(SIMD_PROBE);
      }
      case "worker":
        return scope.Worker != null;
      case "offscreenCanvas": {
        // Decoding and drawing in the worker: OffscreenCanvas with a 2D context, and createImageBitmap.
        const Canvas = scope.OffscreenCanvas as (new (w: number, h: number) => { getContext(t: string): unknown }) | undefined;
        return Canvas != null && scope.createImageBitmap != null && new Canvas(1, 1).getContext("2d") != null;
      }
      case "webAudio": {
        const Ctx = scope.OfflineAudioContext as { prototype?: { decodeAudioData?: unknown } } | undefined;
        return Ctx != null && typeof Ctx.prototype?.decodeAudioData === "function";
      }
    }
  } catch {
    return false;
  }
}

/** Which of `needs` this scope (window or worker global) lacks, as names to show. Empty = can run. */
export function missingFeatures(scope: Scope, needs: readonly Need[]): string[] {
  return needs.filter((n) => !has(scope, n)).map((n) => LABELS[n]);
}

/**
 * The download milestone reached: 0, 25, 50, 75 or 100 (percent). The page announces only when it
 * changes, so a screen reader hears start, quarters and done, not every chunk.
 */
export function downloadMilestone(loaded: number, total: number): 0 | 25 | 50 | 75 | 100 {
  if (!(total > 0) || loaded >= total) return 100;
  const quarter = Math.floor((Math.max(0, loaded) / total) * 4);
  return (Math.min(3, quarter) * 25) as 0 | 25 | 50 | 75;
}

/** Name of the error the page raises when its worker script did not load (no message ever came back). */
export const WORKER_LOAD_ERROR = "WorkerLoadError";

/**
 * Why a model or worker did not load, before the first job:
 * - "offline": no connection (navigator.onLine false, or a fetch that failed on the network);
 * - "updated": a script or engine file of this page is gone, usually because the site was deployed
 *   while the tab was open, so only a reload helps;
 * - "other": anything else (memory, a corrupt download).
 * Offline wins: reloading without a connection would lose the page itself.
 */
export function classifyLoadFailure(err: unknown, online: boolean): "offline" | "updated" | "other" {
  if (!online) return "offline";
  const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  // Checked before the network patterns: Chrome words a failed import "Failed to fetch dynamically imported module".
  if (
    text.startsWith(`${WORKER_LOAD_ERROR}:`) ||
    /dynamically imported module|importing a module script failed|unable to preload css|chunkloaderror|mime type|HTTP 404/i.test(text)
  ) {
    return "updated";
  }
  if (/failed to fetch|networkerror|network error|load failed|network connection was lost/i.test(text)) return "offline";
  return "other";
}

/** Join names for a sentence in the page language ("A, B and C"). */
export function joinNames(names: readonly string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}
