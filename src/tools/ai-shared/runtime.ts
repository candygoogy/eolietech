/// <reference lib="webworker" />
/**
 * ONNX Runtime Web setup for the AI tool workers: points ORT at runtime files served from this
 * origin (never a CDN: the CSP only allows connect-src 'self').
 *
 * - wasm: ort-wasm-simd-threaded.{mjs,wasm} (13.6 MiB). Multi-threaded when the page is
 *   cross-origin isolated (tool pages send COOP + COEP), single-threaded otherwise.
 * - webgpu: the JSPI build (16 MiB), which also has the CPU backend for fallbacks.
 *
 * "onnxruntime-web/webgpu" is aliased to ORT's extern-wasm build in astro.config.mjs, so no wasm is
 * bundled implicitly; the ?url imports below are the only ORT binaries that reach dist/.
 */
import * as ort from "onnxruntime-web/webgpu";
import jspiMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.jspi.mjs?url";
import jspiWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.jspi.wasm?url";
import wasmMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import wasmWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import type { Device } from "./backend";

export interface BackendInfo {
  device: Device;
  /** WebAssembly threads (1 when the page is not cross-origin isolated). */
  threads: number;
}

export function wasmThreads(): number {
  if (!self.crossOriginIsolated) return 1;
  const cores = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(4, Math.floor(cores / 2)));
}

let configured: Device | null = null;

/**
 * Configure ORT for the backend the page chose (see ./backend.ts). Call once per worker before
 * creating any session: ORT loads its wasm module once, so later calls keep the first choice.
 */
export function setupRuntime(device: Device): BackendInfo {
  const threads = wasmThreads();
  if (configured) return { device: configured, threads };
  const env = ort.env;
  env.wasm.wasmPaths = device === "webgpu" ? { mjs: jspiMjsUrl, wasm: jspiWasmUrl } : { mjs: wasmMjsUrl, wasm: wasmWasmUrl };
  env.wasm.numThreads = threads;
  env.wasm.proxy = false;
  env.logLevel = "error";
  configured = device;
  return { device, threads };
}

export { ort };
