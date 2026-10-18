/**
 * Same-origin model files for the AI tools. scripts/fetch-models.mjs publishes every pinned file
 * (src/tools/ai-shared/models.json) as public/models/<id>/manifest.json plus content-addressed
 * chunks below 25 MiB. This module fetches the manifest, downloads the chunks with progress,
 * verifies each chunk's sha256, reassembles the files and keeps the chunks in the Cache API so a
 * second visit does not download them again. Works in workers and on the page; no DOM.
 */
import { ENGINE_BYTES, type Device } from "./backend";
import spec from "./models.json";

export type ModelId = keyof typeof spec.models;

/** Where fetch-models.mjs publishes the models (public/models/ -> /models/). */
export const MODELS_BASE = "/models/";
/** Cache API bucket for model chunks. Chunk names contain the file hash, so entries never go stale. */
export const MODEL_CACHE = "eolietech-models-v1";

export interface ChunkInfo {
  name: string;
  size: number;
  sha256: string;
}

export interface ManifestFile {
  path: string;
  size: number;
  sha256: string;
  chunks: ChunkInfo[];
}

export interface ModelManifest {
  id: string;
  repo: string;
  revision: string;
  license?: string;
  chunkBytes: number;
  totalBytes: number;
  files: ManifestFile[];
}

export interface DownloadProgress {
  /** Bytes available so far (downloaded or read from the browser cache). */
  loaded: number;
  total: number;
  /** Bytes that actually came over the network so far. */
  downloaded: number;
}

/** Minimal Cache API surface (lets tests pass a fake). */
export interface ChunkCache {
  match(request: string): Promise<Response | undefined>;
  put(request: string, response: Response): Promise<void>;
  keys?(): Promise<readonly Request[]>;
  delete?(request: string | Request): Promise<boolean>;
}

export class ModelIntegrityError extends Error {
  constructor(public readonly chunk: string) {
    super(`model chunk ${chunk} failed its integrity check`);
    this.name = "ModelIntegrityError";
  }
}

interface PinnedFile {
  path: string;
  size: number;
  /** Only needed by these backends (absent = all). */
  devices?: string[];
}

/** Does the given backend need this pinned file? */
export function fileFilter(id: ModelId, device: Device): (path: string) => boolean {
  const files: PinnedFile[] = spec.models[id].files;
  const skip = new Set(files.filter((f) => f.devices && !f.devices.includes(device)).map((f) => f.path));
  return (path) => !skip.has(path);
}

/** One-time model download for a backend, from the pinned spec (known at build time, shown before any download). */
export function modelBytes(id: ModelId, device: Device): number {
  const wanted = fileFilter(id, device);
  return (spec.models[id].files as PinnedFile[]).filter((f) => wanted(f.path)).reduce((n, f) => n + f.size, 0);
}

/** What the user downloads the first time: the model files plus the inference engine. */
export const firstDownloadBytes = (id: ModelId, device: Device): number => modelBytes(id, device) + ENGINE_BYTES[device];

export const modelBase = (id: string): string => `${MODELS_BASE}${id}/`;

export function isManifest(value: unknown): value is ModelManifest {
  const m = value as ModelManifest;
  return (
    !!m &&
    typeof m.id === "string" &&
    typeof m.totalBytes === "number" &&
    Array.isArray(m.files) &&
    m.files.every(
      (f) =>
        typeof f.path === "string" &&
        typeof f.size === "number" &&
        Array.isArray(f.chunks) &&
        f.chunks.length > 0 &&
        f.chunks.reduce((n, c) => n + c.size, 0) === f.size,
    )
  );
}

export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Copy chunks into one buffer of `size` bytes (throws when the sizes do not add up). */
export function concatChunks(parts: Uint8Array[], size: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    if (offset + p.byteLength > size) throw new Error("chunks exceed the file size");
    out.set(p, offset);
    offset += p.byteLength;
  }
  if (offset !== size) throw new Error(`chunks add up to ${offset} bytes, expected ${size}`);
  return out;
}

/** Absolute base for chunk URLs (they double as Cache API keys). */
const pageBase = (): string => {
  const loc = globalThis.location;
  return loc && /^https?:$/.test(loc.protocol) ? loc.href : "http://localhost/";
};

export async function openChunkCache(): Promise<ChunkCache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(MODEL_CACHE);
  } catch {
    // Private windows and some embedded browsers have no Cache API: download every time.
    return null;
  }
}

async function readBody(res: Response, onBytes: (n: number) => void): Promise<Uint8Array> {
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onBytes(buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.byteLength;
    onBytes(value.byteLength);
  }
  return concatChunks(parts, size);
}

export interface LoadOptions {
  /** Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Defaults to the Cache API bucket; pass null to skip caching. */
  cache?: ChunkCache | null;
  onProgress?: (p: DownloadProgress) => void;
  /** Only load these logical paths (default: every file in the manifest). */
  only?: (path: string) => boolean;
}

export interface LoadedModel {
  manifest: ModelManifest;
  /** Logical path (e.g. "onnx/model_fp16.onnx") -> file bytes. */
  files: Map<string, Uint8Array<ArrayBuffer>>;
  /** True when nothing had to come over the network. */
  fromCache: boolean;
}

/**
 * Fetch a model's manifest and all of its files from this origin. Chunks are verified against
 * the manifest's sha256 before they are cached or used.
 */
export async function loadModel(id: string, opts: LoadOptions = {}): Promise<LoadedModel> {
  const doFetch = opts.fetch ?? fetch.bind(globalThis);
  const cache = opts.cache === undefined ? await openChunkCache() : opts.cache;
  const base = modelBase(id);
  const res = await doFetch(`${base}manifest.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`model manifest ${id}: HTTP ${res.status}`);
  const manifest: unknown = await res.json();
  if (!isManifest(manifest)) throw new Error(`model manifest ${id} is malformed`);

  const wanted = manifest.files.filter((f) => !opts.only || opts.only(f.path));
  const total = wanted.reduce((n, f) => n + f.size, 0);
  const progress: DownloadProgress = { loaded: 0, total, downloaded: 0 };
  const report = () => opts.onProgress?.({ ...progress });
  report();

  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const file of wanted) {
    const parts: Uint8Array[] = [];
    for (const chunk of file.chunks) {
      const url = new URL(`${base}${chunk.name}`, pageBase()).href;
      let bytes: Uint8Array | null = null;
      const hit = cache ? await cache.match(url).catch(() => undefined) : undefined;
      if (hit) {
        const buf = new Uint8Array(await hit.arrayBuffer());
        if (buf.byteLength === chunk.size) {
          bytes = buf;
          progress.loaded += buf.byteLength;
          report();
        }
      }
      if (!bytes) {
        const r = await doFetch(url);
        if (!r.ok) throw new Error(`model chunk ${chunk.name}: HTTP ${r.status}`);
        const before = progress.loaded;
        bytes = await readBody(r, (n) => {
          progress.loaded += n;
          progress.downloaded += n;
          report();
        });
        if (bytes.byteLength !== chunk.size || (await sha256Hex(bytes as Uint8Array<ArrayBuffer>)) !== chunk.sha256) {
          progress.loaded = before;
          throw new ModelIntegrityError(chunk.name);
        }
        if (cache) {
          await cache
            .put(url, new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/octet-stream" } }))
            .catch(() => undefined); // Quota exceeded: still usable, just not cached.
        }
      }
      parts.push(bytes);
    }
    files.set(file.path, concatChunks(parts, file.size));
  }

  if (cache?.keys && cache.delete) await pruneCache(cache, base, manifest);
  return { manifest, files, fromCache: progress.downloaded === 0 };
}

/** Drop cached chunks of this model that the current manifest no longer lists (older pins). */
async function pruneCache(cache: ChunkCache, base: string, manifest: ModelManifest): Promise<void> {
  try {
    const current = new Set(manifest.files.flatMap((f) => f.chunks.map((c) => c.name)));
    for (const req of (await cache.keys?.()) ?? []) {
      const path = new URL(req.url).pathname;
      if (path.startsWith(base) && !current.has(path.slice(base.length))) await cache.delete?.(req);
    }
  } catch {
    // Housekeeping only.
  }
}
