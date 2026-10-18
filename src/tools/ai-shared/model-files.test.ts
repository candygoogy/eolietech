import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_BYTES } from "./backend";
import {
  type ChunkCache,
  concatChunks,
  fileFilter,
  firstDownloadBytes,
  isManifest,
  loadModel,
  ModelIntegrityError,
  modelBytes,
  type ModelManifest,
} from "./model-files";
import spec from "./models.json";

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** A fake published model: two files, the first split into three chunks (like fetch-models.mjs does). */
function fixture() {
  const big = Uint8Array.from({ length: 25 }, (_, i) => i);
  const small = new TextEncoder().encode('{"ok":true}');
  const parts = [big.slice(0, 10), big.slice(10, 20), big.slice(20)];
  const manifest: ModelManifest = {
    id: "demo",
    repo: "org/demo",
    revision: "abc",
    chunkBytes: 10,
    totalBytes: big.length + small.length,
    files: [
      { path: "onnx/model.onnx", size: big.length, sha256: sha(big), chunks: parts.map((p, i) => ({ name: `aaaa-${i}.bin`, size: p.length, sha256: sha(p) })) },
      { path: "config.json", size: small.length, sha256: sha(small), chunks: [{ name: "bbbb-0.bin", size: small.length, sha256: sha(small) }] },
    ],
  };
  const served = new Map<string, Uint8Array>([
    ["/models/demo/aaaa-0.bin", parts[0]!],
    ["/models/demo/aaaa-1.bin", parts[1]!],
    ["/models/demo/aaaa-2.bin", parts[2]!],
    ["/models/demo/bbbb-0.bin", small],
  ]);
  const requests: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL) => {
    const p = new URL(String(input), "http://localhost/").pathname;
    requests.push(p);
    if (p === "/models/demo/manifest.json") return new Response(JSON.stringify(manifest));
    const body = served.get(p);
    return body ? new Response(body.slice()) : new Response(null, { status: 404 });
  }) as typeof fetch;
  return { big, small, manifest, served, requests, fetchFn };
}

function memoryCache(): ChunkCache & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>();
  return {
    store,
    async match(url) {
      const b = store.get(url);
      return b ? new Response(b.slice()) : undefined;
    },
    async put(url, res) {
      store.set(url, new Uint8Array(await res.arrayBuffer()));
    },
  };
}

describe("model chunk loading", () => {
  it("reassembles chunked files, verifies them, reports progress and serves the next load from the cache", async () => {
    const f = fixture();
    const cache = memoryCache();
    const progress: number[] = [];
    const first = await loadModel("demo", { fetch: f.fetchFn, cache, onProgress: (p) => progress.push(p.loaded) });
    expect(first.files.get("onnx/model.onnx")).toEqual(f.big);
    expect(first.files.get("config.json")).toEqual(f.small);
    expect(first.fromCache).toBe(false);
    expect(progress.at(-1)).toBe(f.manifest.totalBytes);
    expect(cache.store.size).toBe(4);

    f.requests.length = 0;
    const second = await loadModel("demo", { fetch: f.fetchFn, cache });
    expect(second.fromCache).toBe(true);
    expect(second.files.get("onnx/model.onnx")).toEqual(f.big);
    expect(f.requests).toEqual(["/models/demo/manifest.json"]);
  });

  it("loads only the requested files", async () => {
    const f = fixture();
    const out = await loadModel("demo", { fetch: f.fetchFn, cache: null, only: (p) => p === "config.json" });
    expect([...out.files.keys()]).toEqual(["config.json"]);
    expect(f.requests.filter((r) => r.includes("aaaa"))).toEqual([]);
  });

  it("rejects a corrupted chunk and does not cache it", async () => {
    const f = fixture();
    f.served.set("/models/demo/aaaa-1.bin", new Uint8Array(10).fill(7));
    const cache = memoryCache();
    await expect(loadModel("demo", { fetch: f.fetchFn, cache })).rejects.toBeInstanceOf(ModelIntegrityError);
    expect([...cache.store.keys()].some((k) => k.endsWith("aaaa-1.bin"))).toBe(false);
  });

  it("validates manifests and chunk sizes", () => {
    expect(isManifest(fixture().manifest)).toBe(true);
    const bad = fixture().manifest;
    bad.files[0]!.chunks.pop();
    expect(isManifest(bad)).toBe(false);
    expect(() => concatChunks([new Uint8Array(3)], 4)).toThrow();
  });
});

describe("pinned models", () => {
  it("pins every file to a commit revision with sha256 and keeps chunks under the 25 MiB asset limit", () => {
    expect(spec.chunkBytes).toBeLessThan(25 * 1024 * 1024);
    for (const model of Object.values(spec.models)) {
      expect(model.revision).toMatch(/^[0-9a-f]{40}$/);
      for (const f of model.files) expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("downloads only the encoder a backend needs and shows honest sizes", () => {
    const wasm = fileFilter("whisper-base", "wasm");
    const gpu = fileFilter("whisper-base", "webgpu");
    expect(wasm("onnx/encoder_model_quantized.onnx")).toBe(true);
    expect(wasm("onnx/encoder_model_fp16.onnx")).toBe(false);
    expect(gpu("onnx/encoder_model_fp16.onnx")).toBe(true);
    expect(gpu("onnx/decoder_model_merged_quantized.onnx")).toBe(true);
    expect(modelBytes("birefnet-lite-512", "wasm")).toBe(98_484_532);
    expect(firstDownloadBytes("whisper-base", "wasm")).toBe(modelBytes("whisper-base", "wasm") + ENGINE_BYTES.wasm);
  });

  it("matches the shipped ONNX Runtime engine sizes", () => {
    const dist = path.resolve(__dirname, "../../../node_modules/onnxruntime-web/dist");
    expect(fs.statSync(path.join(dist, "ort-wasm-simd-threaded.wasm")).size).toBe(ENGINE_BYTES.wasm);
    expect(fs.statSync(path.join(dist, "ort-wasm-simd-threaded.jspi.wasm")).size).toBe(ENGINE_BYTES.webgpu);
  });

  // The progress line reads "{total} for the model, then its engine": total must be the model alone,
  // and model plus engine must be the one-time size the page announces.
  it("reports the model alone as the progress total, the engine on top of it", async () => {
    for (const id of Object.keys(spec.models) as (keyof typeof spec.models)[]) {
      for (const device of ["wasm", "webgpu"] as const) {
        const files = spec.models[id].files.map((f) => ({ path: f.path, size: f.size, sha256: f.sha256, chunks: [{ name: `${f.sha256}.bin`, size: f.size, sha256: f.sha256 }] }));
        const manifest: ModelManifest = { id, repo: "r", revision: "x", chunkBytes: 1, totalBytes: 0, files };
        const fetchFn = (async (input: RequestInfo | URL) =>
          String(input).endsWith("manifest.json") ? new Response(JSON.stringify(manifest)) : new Response(null, { status: 404 })) as typeof fetch;
        const totals: number[] = [];
        await loadModel(id, { fetch: fetchFn, cache: null, only: fileFilter(id, device), onProgress: (p) => totals.push(p.total) }).catch(() => undefined);
        expect(totals[0], `${id} ${device}`).toBe(modelBytes(id, device));
        expect(totals[0]! + ENGINE_BYTES[device]).toBe(firstDownloadBytes(id, device));
      }
    }
  });
});
