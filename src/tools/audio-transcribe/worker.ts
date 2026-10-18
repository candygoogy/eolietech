/// <reference lib="webworker" />
/**
 * Transcription worker: Whisper base (multilingual ONNX; see pipelineOptions) through transformers.js
 * on ONNX Runtime Web. Model files come from this origin in verified chunks
 * (../ai-shared/model-files.ts) and are handed to transformers.js through env.fetch; remote models
 * are disabled, so nothing is requested from the Hugging Face hub. Audio arrives as 16 kHz mono
 * samples from the page.
 */
import { env, pipeline, Tensor } from "@huggingface/transformers";
import type { Device } from "../ai-shared/backend";
import { fileFilter, loadModel, MODELS_BASE } from "../ai-shared/model-files";
import { setupRuntime } from "../ai-shared/runtime";
import { CHUNK_S, chunkCount, SAMPLE_RATE, STRIDE_S } from "./audio";
import type { RawChunk } from "./subtitles";

export const MODEL_ID = "whisper-base";

export type AsrRequest =
  | { type: "load"; device: Device }
  | { type: "run"; audio: Float32Array; language: string | null };

export type AsrResponse =
  | { type: "progress"; loaded: number; total: number; downloaded: number }
  | { type: "ready"; device: Device; threads: number; fromCache: boolean }
  | { type: "language"; language: string }
  | { type: "chunk"; done: number; total: number }
  | { type: "result"; text: string; chunks: RawChunk[]; language: string; ms: number }
  | { type: "error"; stage: "load" | "run"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: AsrResponse) => scope.postMessage(msg);

/** The parts of the transformers.js ASR pipeline used here (its generated types are loose). */
interface AsrPipeline {
  (audio: Float32Array, options: Record<string, unknown>): Promise<{ text: string; chunks?: RawChunk[] }>;
  processor: (audio: Float32Array) => Promise<{ input_features: Tensor }>;
  model: {
    generation_config: { lang_to_id?: Record<string, number>; decoder_start_token_id?: number };
    generate: (args: unknown) => Promise<unknown>;
    (inputs: Record<string, unknown>): Promise<{ logits: Tensor }>;
  };
}

let asr: AsrPipeline | null = null;
let queue: Promise<void> = Promise.resolve();

scope.addEventListener("message", (event: MessageEvent<AsrRequest>) => {
  const msg = event.data;
  if (msg.type === "load") queue = queue.then(() => load(msg.device));
  else if (msg.type === "run") queue = queue.then(() => run(msg.audio, msg.language));
});

/**
 * Model options per backend. WebAssembly: 8-bit encoder and decoder. WebGPU: fp16 encoder on the
 * GPU, 8-bit decoder on the CPU. Measured on the 8-bit files, running the decoder on WebGPU was
 * about 4x slower than WebAssembly (its quantized ops fall back to the CPU), and the 8-bit encoder
 * gained nothing on the GPU, while the fp16 encoder on the GPU was about 1.5x faster overall.
 */
function pipelineOptions(device: Device): Record<string, unknown> {
  return device === "webgpu"
    ? { dtype: { encoder_model: "fp16", decoder_model_merged: "q8" }, device: { encoder_model: "webgpu", decoder_model_merged: "wasm" } }
    : { dtype: "q8", device: "wasm" };
}

async function load(requested: Device) {
  if (asr) return;
  try {
    const backend = setupRuntime(requested);
    const model = await loadModel(MODEL_ID, {
      only: fileFilter(MODEL_ID, backend.device),
      onProgress: (p) => post({ type: "progress", ...p }),
    });
    const files = model.files;
    const prefix = `${MODELS_BASE}${MODEL_ID}/`;

    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = MODELS_BASE;
    env.useBrowserCache = false; // we cache the verified chunks ourselves
    env.useWasmCache = false; // it would import ORT's loader from a blob: URL, which the CSP blocks
    env.fetch = async (input: string | URL) => {
      const path = new URL(String(input), self.location.href).pathname;
      const bytes = path.startsWith(prefix) ? files.get(decodeURIComponent(path.slice(prefix.length))) : undefined;
      // Only the pinned files exist; anything else (optional configs) is a quiet 404 without a request.
      if (!bytes) return new Response(null, { status: 404 });
      return new Response(bytes, { status: 200, headers: { "content-length": String(bytes.byteLength) } });
    };

    const create = (device: Device) =>
      pipeline("automatic-speech-recognition", MODEL_ID, pipelineOptions(device) as never) as unknown as Promise<AsrPipeline>;
    let device = backend.device;
    try {
      asr = await create(device);
    } catch (err) {
      if (device !== "webgpu") throw err;
      console.warn("[audio-transcribe] WebGPU failed, using WebAssembly", err);
      // The CPU path needs the 8-bit encoder, which the WebGPU path did not download.
      const wasmOnly = fileFilter(MODEL_ID, "wasm");
      const extra = await loadModel(MODEL_ID, { only: (p) => wasmOnly(p) && !files.has(p) });
      for (const [p, bytes] of extra.files) files.set(p, bytes);
      device = "wasm";
      asr = await create(device);
    }
    files.clear();
    post({ type: "ready", device, threads: backend.threads, fromCache: model.fromCache });
  } catch (err) {
    console.error(err);
    post({ type: "error", stage: "load", message: String(err) });
  }
}

/** Whisper's own language identification: one decoder step after <|startoftranscript|> on the first 30 s. */
async function detectLanguage(pipe: AsrPipeline, audio: Float32Array): Promise<string> {
  const langToId = pipe.model.generation_config.lang_to_id ?? {};
  const sot = pipe.model.generation_config.decoder_start_token_id ?? 50258;
  const { input_features } = await pipe.processor(audio.subarray(0, SAMPLE_RATE * CHUNK_S));
  const { logits } = await pipe.model({
    input_features,
    decoder_input_ids: new Tensor("int64", BigInt64Array.from([BigInt(sot)]), [1, 1]),
  });
  const data = logits.data as Float32Array;
  const vocab = logits.dims.at(-1) ?? data.length;
  const offset = data.length - vocab;
  let best = "en";
  let bestScore = -Infinity;
  for (const [token, id] of Object.entries(langToId)) {
    const score = data[offset + id] ?? -Infinity;
    if (score > bestScore) {
      bestScore = score;
      best = token.replace(/^<\|/, "").replace(/\|>$/, "");
    }
  }
  return best;
}

async function run(audio: Float32Array, requested: string | null) {
  const started = performance.now();
  try {
    if (!asr) throw new Error("model not loaded");
    const pipe = asr;
    const language = requested ?? (await detectLanguage(pipe, audio));
    post({ type: "language", language });

    // The pipeline calls model.generate once per 30 s window: count them for progress.
    const total = chunkCount(audio.length);
    let done = 0;
    post({ type: "chunk", done, total });
    const generate = pipe.model.generate;
    pipe.model.generate = async (args: unknown) => {
      const out = await generate.call(pipe.model, args);
      done++;
      post({ type: "chunk", done: Math.min(done, total), total });
      return out;
    };
    try {
      const out = await pipe(audio, {
        language,
        task: "transcribe",
        return_timestamps: true,
        chunk_length_s: CHUNK_S,
        stride_length_s: STRIDE_S,
      });
      post({
        type: "result",
        text: out.text,
        chunks: (out.chunks ?? []).map((c) => ({ timestamp: [...c.timestamp], text: c.text })),
        language,
        ms: Math.round(performance.now() - started),
      });
    } finally {
      pipe.model.generate = generate;
    }
  } catch (err) {
    console.error(err);
    post({ type: "error", stage: "run", message: String(err) });
  }
}
