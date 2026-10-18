/// <reference lib="webworker" />
/**
 * Background remover worker: BiRefNet_lite (512x512 export, MIT) on ONNX Runtime Web.
 * The model comes from this origin in verified chunks (../ai-shared/model-files.ts). Each image
 * is decoded here, squeezed to 512x512 for the model, and the predicted mask is scaled back up
 * and applied to the full-resolution image as its alpha channel, so output keeps the original size.
 */
import { loadModel } from "../ai-shared/model-files";
import type { Device } from "../ai-shared/backend";
import { ort, setupRuntime } from "../ai-shared/runtime";
import { logitsToMask, MAX_PIXELS, MODEL_SIZE, toInputTensor } from "./mask";

export const MODEL_ID = "birefnet-lite-512";
const MODEL_FILE = "onnx/model_fp16.onnx";

export type BgRequest = { type: "load"; device: Device } | { type: "run"; id: number; file: Blob };

export type BgResponse =
  | { type: "progress"; loaded: number; total: number; downloaded: number }
  | { type: "ready"; device: Device; threads: number; fromCache: boolean }
  | { type: "result"; id: number; png: Blob; width: number; height: number; ms: number }
  | { type: "error"; id: number | null; code: "load" | "decode" | "tooLarge" | "failed"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: BgResponse) => scope.postMessage(msg);

let session: ort.InferenceSession | null = null;
let inputName = "input_image";
let outputName = "output_image";
let queue: Promise<void> = Promise.resolve();

scope.addEventListener("message", (event: MessageEvent<BgRequest>) => {
  const msg = event.data;
  // One job at a time: ORT sessions are not re-entrant.
  if (msg.type === "load") queue = queue.then(() => load(msg.device));
  else if (msg.type === "run") queue = queue.then(() => run(msg.id, msg.file));
});

async function createSession(bytes: Uint8Array, device: Device): Promise<{ session: ort.InferenceSession; device: Device }> {
  if (device === "webgpu") {
    try {
      return { session: await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"], logSeverityLevel: 3 }), device };
    } catch (err) {
      console.warn("[background-remover] WebGPU failed, using WebAssembly", err);
    }
  }
  return { session: await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], logSeverityLevel: 3 }), device: "wasm" };
}

async function load(device: Device) {
  if (session) return;
  try {
    const backend = setupRuntime(device);
    const model = await loadModel(MODEL_ID, {
      onProgress: (p) => post({ type: "progress", ...p }),
    });
    const bytes = model.files.get(MODEL_FILE);
    if (!bytes) throw new Error(`${MODEL_FILE} missing from the manifest`);
    model.files.clear();
    const created = await createSession(bytes, backend.device);
    session = created.session;
    inputName = session.inputNames[0] ?? inputName;
    outputName = session.outputNames[0] ?? outputName;
    post({ type: "ready", device: created.device, threads: backend.threads, fromCache: model.fromCache });
  } catch (err) {
    console.error(err);
    post({ type: "error", id: null, code: "load", message: String(err) });
  }
}

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  return ctx;
}

async function run(id: number, file: Blob) {
  const started = performance.now();
  if (!session) {
    post({ type: "error", id, code: "load", message: "model not loaded" });
    return;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    post({ type: "error", id, code: "decode", message: String(err) });
    return;
  }
  try {
    const { width, height } = bitmap;
    if (width * height > MAX_PIXELS) {
      post({ type: "error", id, code: "tooLarge", message: `${width}x${height}` });
      return;
    }
    // Model input: the whole image squeezed into 512x512 (what the model was trained on).
    const small = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
    const sctx = context2d(small);
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(bitmap, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const input = toInputTensor(sctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data);
    const result = await session.run({ [inputName]: new ort.Tensor("float32", input, [1, 3, MODEL_SIZE, MODEL_SIZE]) });
    const logits = result[outputName];
    if (!logits) throw new Error("no model output");
    const data = (await logits.getData()) as Float32Array;
    for (const t of Object.values(result)) t.dispose();

    // 512x512 mask -> scaled (bilinear) onto the full-size image with destination-in.
    const maskCanvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
    context2d(maskCanvas).putImageData(new ImageData(logitsToMask(data), MODEL_SIZE, MODEL_SIZE), 0, 0);
    const out = new OffscreenCanvas(width, height);
    const octx = context2d(out);
    octx.drawImage(bitmap, 0, 0);
    octx.globalCompositeOperation = "destination-in";
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(maskCanvas, 0, 0, width, height);
    const png = await out.convertToBlob({ type: "image/png" });
    post({ type: "result", id, png, width, height, ms: Math.round(performance.now() - started) });
  } catch (err) {
    console.error(err);
    post({ type: "error", id, code: "failed", message: String(err) });
  } finally {
    bitmap.close();
  }
}
