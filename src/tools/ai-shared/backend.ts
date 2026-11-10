/**
 * Backend choice for the AI tools, usable on the page and in workers (no ORT import, no download).
 * The page decides once, so the size notice can show exactly what will be downloaded, and passes
 * the decision to the worker.
 *
 * ONNX Runtime Web runs on WebGPU only through its asyncify build (25.6 MiB, over the 25 MiB
 * static-asset limit) or its JSPI build (16 MiB). We ship JSPI, so WebGPU is used when the browser
 * has WebGPU, JSPI and a hardware adapter with shader-f16 (current Chrome and Edge on most
 * computers); everything else runs on WebAssembly.
 */
export type Device = "webgpu" | "wasm";

/**
 * Sizes of the inference engines in onnxruntime-web 1.31.0-dev: ort-wasm-simd-threaded.wasm and
 * ort-wasm-simd-threaded.jspi.wasm (the WebGPU-capable build). A test keeps them honest.
 */
export const ENGINE_BYTES: Record<Device, number> = {
  wasm: 14_264_838,
  webgpu: 16_811_691,
};

export const hasJspi = (): boolean => typeof (WebAssembly as unknown as { Suspending?: unknown }).Suspending === "function";

interface GpuAdapterLike {
  features: { has(name: string): boolean };
  info?: { isFallbackAdapter?: boolean };
  isFallbackAdapter?: boolean;
}

/** WebGPU + JSPI + a hardware adapter that supports fp16 shaders (our GPU models use fp16). */
export async function webgpuUsable(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(o?: object): Promise<GpuAdapterLike | null> } }).gpu;
  if (!gpu || !hasJspi()) return false;
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) return false;
    // A software adapter (SwiftShader) is slower than multi-threaded WebAssembly.
    if (adapter.info?.isFallbackAdapter || adapter.isFallbackAdapter) return false;
    return adapter.features.has("shader-f16");
  } catch {
    return false;
  }
}

/**
 * localStorage key remembering that WebGPU failed on this device. It only ever holds a backend
 * name ("wasm"), never anything about the user's files.
 */
export const BACKEND_STORAGE_KEY = "eolietech-ai-backend";

/** The backend to use: a forced one (testing) first, then a remembered WebGPU failure, then detection. */
export function chooseDevice(o: { forced?: string | null; remembered?: string | null; webgpu: boolean }): Device {
  if (o.forced === "wasm" || o.forced === "webgpu") return o.forced;
  if (o.remembered === "wasm") return "wasm";
  return o.webgpu ? "webgpu" : "wasm";
}

/**
 * After a job failed: the backend to retry it on, or null for no retry. Only a runtime failure on
 * WebGPU (not a bad input file) is retried, on WebAssembly; WebAssembly has nothing to fall back to.
 */
export function retryDevice(device: Device, failure: "runtime" | "input"): Device | null {
  return device === "webgpu" && failure === "runtime" ? "wasm" : null;
}

function readRemembered(): string | null {
  try {
    return localStorage.getItem(BACKEND_STORAGE_KEY);
  } catch {
    return null; // Workers, storage disabled.
  }
}

let detected: Promise<Device> | null = null;

/**
 * WebGPU failed on this device: use WebAssembly for the rest of the session (both AI tools) and
 * after reloads.
 */
export function rememberWasm(): void {
  try {
    localStorage.setItem(BACKEND_STORAGE_KEY, "wasm");
  } catch {
    // Storage disabled: the choice still holds for this page.
  }
  detected = Promise.resolve("wasm");
}

/** The backend to use on this device; `?ai-backend=wasm|webgpu` forces one (testing). */
export function detectDevice(): Promise<Device> {
  const forced = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("ai-backend");
  if (forced === "wasm" || forced === "webgpu") return Promise.resolve(forced);
  if (!detected) {
    const remembered = readRemembered();
    detected =
      remembered === "wasm"
        ? Promise.resolve<Device>("wasm")
        : webgpuUsable().then((webgpu) => chooseDevice({ remembered, webgpu }));
  }
  return detected;
}
