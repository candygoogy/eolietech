#!/usr/bin/env node
/**
 * Fetch the pinned AI model files for the on-device AI tools and publish them as static assets.
 *
 *   node scripts/fetch-models.mjs          (runs before `astro build`, see package.json)
 *
 * Reads src/tools/ai-shared/models.json (repo, commit revision, path, size and sha256 of every
 * file), downloads each file from Hugging Face at that exact revision, verifies size and sha256,
 * and splits it into chunks smaller than the 25 MiB per-file limit of Cloudflare static assets.
 * Output, per model: public/models/<id>/manifest.json plus content-addressed chunks named
 * <file sha256, 16>-<chunkBytes>-<n>.bin (a name never changes content, so public/_headers serves
 * them immutable). public/models/ is gitignored; Astro copies it into dist/ (and serves it in `astro dev`).
 *
 * Idempotent: a model whose manifest matches the pins and whose chunks are present with the right
 * size and sha256 is left alone (no network). Stale files in a model folder are removed.
 *
 * Build cache: verified chunks are also kept under node_modules/.astro/eolietech-assets/models/,
 * which Workers Builds restores between builds for Astro projects (build cache on), and restored
 * from there (size and sha256 checked again, per chunk and per file) before anything is downloaded.
 * Downloads: idle timeout per request, and on HTTP 429 / 5xx or a network error a backoff of up to
 * a few minutes that honours Retry-After (Hugging Face rate-limits build machines). HF_TOKEN, when
 * set (a build secret), is sent as a Bearer token.
 * Node >= 22, no dependencies.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_FILE = path.join(ROOT, "src", "tools", "ai-shared", "models.json");
const OUT_DIR = path.join(ROOT, "public", "models");
const CACHE_DIR = path.join(ROOT, "node_modules", ".astro", "eolietech-assets", "models");
const HF = "https://huggingface.co";
const HARD_LIMIT = 25 * 1024 * 1024;
/** Attempts per file, the longest single wait, and the most waiting per file before giving up. */
const ATTEMPTS = 8;
const MAX_WAIT_MS = 180_000;
const WAIT_BUDGET_MS = 360_000;
/** A request that sends no bytes for this long is aborted (and retried). */
const IDLE_TIMEOUT_MS = 60_000;

const log = (msg) => console.log(`[fetch-models] ${msg}`);
const mib = (n) => `${(n / 1024 / 1024).toFixed(1)} MiB`;
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/** Does an existing manifest describe exactly the pinned files, and are all its chunks intact on disk? */
async function upToDate(dir, id, model, manifest, chunkBytes) {
  if (!manifest || manifest.id !== id || manifest.repo !== model.repo || manifest.revision !== model.revision) return false;
  if (manifest.chunkBytes !== chunkBytes || manifest.files?.length !== model.files.length) return false;
  for (const [i, pin] of model.files.entries()) {
    const f = manifest.files[i];
    if (!f || f.path !== pin.path || f.size !== pin.size || f.sha256 !== pin.sha256) return false;
    let total = 0;
    for (const c of f.chunks) {
      const file = path.join(dir, c.name);
      if (!(await exists(file))) return false;
      const buf = await readFile(file);
      if (buf.length !== c.size || sha256(buf) !== c.sha256) return false;
      total += c.size;
    }
    if (total !== f.size) return false;
  }
  return true;
}

/** An HTTP failure worth retrying (408, 429, 5xx) or not (404, 401...), with the server's Retry-After if any. */
class HttpError extends Error {
  constructor(url, res) {
    super(`${url}: HTTP ${res.status}`);
    this.retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    this.retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
  }
}

/** Retry-After as milliseconds: delta-seconds or an HTTP date; null when absent or unreadable. */
function parseRetryAfter(value) {
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

/**
 * fetch() with an idle timeout: the request is aborted when no response (or, through `touch`, no
 * body bytes) arrives for IDLE_TIMEOUT_MS. Call `done` once the body is read.
 */
async function timedFetch(url, headers) {
  const controller = new AbortController();
  let timer;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error(`no data for ${IDLE_TIMEOUT_MS / 1000}s`)), IDLE_TIMEOUT_MS);
  };
  const done = () => clearTimeout(timer);
  touch();
  try {
    const res = await fetch(url, { redirect: "follow", headers, signal: controller.signal });
    return { res, touch, done };
  } catch (err) {
    done();
    throw err;
  }
}

/** Hugging Face token (build secret), if any. Never logged; fetch drops it on the cross-origin CDN redirect. */
const authHeaders = () => (process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {});

/** Download one pinned file, streaming it into chunk files; verifies size and sha256 before publishing the chunks. */
async function downloadFile(dir, model, pin, chunkBytes) {
  const url = `${HF}/${model.repo}/resolve/${model.revision}/${pin.path}`;
  // The chunk size is part of the name: re-chunking a file never reuses a URL for other bytes.
  const prefix = `${pin.sha256.slice(0, 16)}-${chunkBytes}`;
  const { res, touch, done } = await timedFetch(url, authHeaders());
  if (!res.ok || !res.body) {
    done();
    throw new HttpError(url, res);
  }

  const whole = createHash("sha256");
  const chunks = [];
  let pending = [];
  let pendingBytes = 0;
  let received = 0;
  let lastLog = 0;

  const flush = async () => {
    if (pendingBytes === 0) return;
    const buf = Buffer.concat(pending, pendingBytes);
    const name = `${prefix}-${chunks.length}.bin`;
    await writeFile(path.join(dir, `${name}.partial`), buf);
    chunks.push({ name, size: buf.length, sha256: sha256(buf) });
    pending = [];
    pendingBytes = 0;
  };

  const cleanup = () => Promise.all(chunks.map((c) => rm(path.join(dir, `${c.name}.partial`), { force: true })));
  try {
    for await (const part of res.body) {
      touch();
      let piece = Buffer.from(part);
      whole.update(piece);
      received += piece.length;
      while (piece.length > 0) {
        const take = Math.min(piece.length, chunkBytes - pendingBytes);
        pending.push(piece.subarray(0, take));
        pendingBytes += take;
        piece = piece.subarray(take);
        if (pendingBytes === chunkBytes) await flush();
      }
      if (received - lastLog > 16 * 1024 * 1024) {
        lastLog = received;
        log(`  ${pin.path}: ${mib(received)} of ${mib(pin.size)}`);
      }
    }
    await flush();
  } catch (err) {
    await cleanup();
    throw err;
  } finally {
    done();
  }

  const digest = whole.digest("hex");
  if (received !== pin.size) {
    await cleanup();
    throw new Error(`${pin.path}: expected ${pin.size} bytes, got ${received}`);
  }
  if (digest !== pin.sha256) {
    await cleanup();
    throw new Error(`${pin.path}: sha256 mismatch (expected ${pin.sha256}, got ${digest})`);
  }
  for (const c of chunks) await rename(path.join(dir, `${c.name}.partial`), path.join(dir, c.name));
  return { path: pin.path, size: pin.size, sha256: pin.sha256, chunks };
}

/**
 * Runs `fn` until it succeeds. HTTP 408 / 429 / 5xx, timeouts and network errors are retried after
 * the server's Retry-After or an exponential backoff (5s, 10s, 20s... with jitter), each wait capped
 * at MAX_WAIT_MS and all of them at WAIT_BUDGET_MS; other HTTP errors (404, 401...) fail at once.
 */
async function withRetries(label, fn) {
  let waited = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof HttpError && !err.retryable) throw err;
      const backoff = Math.min(MAX_WAIT_MS, 5000 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.4);
      const hinted = err instanceof HttpError && err.retryAfterMs != null ? err.retryAfterMs : backoff;
      const wait = Math.round(Math.min(MAX_WAIT_MS, hinted));
      if (attempt >= ATTEMPTS || waited + wait > WAIT_BUDGET_MS) throw err;
      waited += wait;
      log(`  ${label} failed (${err.message}); retrying in ${Math.ceil(wait / 1000)}s (${attempt}/${ATTEMPTS - 1})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** Size and sha256 of a file rebuilt from its chunks in `dir`, in order; null when a chunk is missing or wrong. */
async function verifyChunks(dir, entry) {
  const whole = createHash("sha256");
  let total = 0;
  for (const c of entry.chunks) {
    let buf;
    try {
      buf = await readFile(path.join(dir, c.name));
    } catch {
      return null;
    }
    if (buf.length !== c.size || sha256(buf) !== c.sha256) return null;
    whole.update(buf);
    total += buf.length;
  }
  return { size: total, sha256: whole.digest("hex") };
}

/**
 * Restores one pinned file from the build cache into `dir`: only when the cached chunks add up to
 * exactly the pinned size and sha256 (checked again here, not taken from the cache's manifest).
 */
async function restoreFromCache(id, dir, pin, chunkBytes) {
  const cacheDir = path.join(CACHE_DIR, id);
  const cached = await readJson(path.join(cacheDir, "manifest.json"));
  if (!cached || cached.chunkBytes !== chunkBytes) return null;
  const entry = cached.files?.find((f) => f.path === pin.path && f.size === pin.size && f.sha256 === pin.sha256);
  if (!entry || !Array.isArray(entry.chunks) || entry.chunks.length === 0) return null;
  if (entry.chunks.some((c) => typeof c?.name !== "string" || c.name !== path.basename(c.name))) return null;
  const check = await verifyChunks(cacheDir, entry);
  if (!check || check.size !== pin.size || check.sha256 !== pin.sha256) {
    log(`  ${pin.path}: build cache entry does not match the pin, downloading instead`);
    return null;
  }
  for (const c of entry.chunks) await copyFile(path.join(cacheDir, c.name), path.join(dir, c.name));
  return { path: pin.path, size: pin.size, sha256: pin.sha256, chunks: entry.chunks.map(({ name, size, sha256 }) => ({ name, size, sha256 })) };
}

/** Mirrors a finished model folder into the build cache. A cache problem never fails the build. */
async function saveToCache(id, dir, manifest) {
  const cacheDir = path.join(CACHE_DIR, id);
  try {
    await mkdir(cacheDir, { recursive: true });
    const chunks = manifest.files.flatMap((f) => f.chunks);
    for (const c of chunks) {
      const target = path.join(cacheDir, c.name);
      const present = await stat(target).then((st) => st.size === c.size, () => false);
      if (present) continue;
      await copyFile(path.join(dir, c.name), `${target}.partial`);
      await rename(`${target}.partial`, target);
    }
    const keep = new Set(["manifest.json", ...chunks.map((c) => c.name)]);
    for (const name of await readdir(cacheDir)) if (!keep.has(name)) await rm(path.join(cacheDir, name), { force: true, recursive: true });
    await writeFile(path.join(cacheDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (err) {
    log(`  warning: could not update the build cache for ${id} (${err.message})`);
  }
}

async function fetchModel(id, model, chunkBytes) {
  const dir = path.join(OUT_DIR, id);
  await mkdir(dir, { recursive: true });
  const manifestFile = path.join(dir, "manifest.json");
  const current = await readJson(manifestFile);
  if (await upToDate(dir, id, model, current, chunkBytes)) {
    log(`${id}: up to date (${mib(current.totalBytes)})`);
    return current.totalBytes;
  }

  log(`${id}: fetching ${model.repo}@${model.revision.slice(0, 12)}`);
  const files = [];
  for (const pin of model.files) {
    // Reuse a file whose chunks from a previous run are still intact.
    const prev = current?.files?.find((f) => f.path === pin.path && f.sha256 === pin.sha256 && f.size === pin.size);
    if (prev && current.chunkBytes === chunkBytes && (await upToDate(dir, id, { ...model, files: [pin] }, { ...current, files: [prev] }, chunkBytes))) {
      files.push(prev);
      continue;
    }
    const restored = await restoreFromCache(id, dir, pin, chunkBytes).catch(() => null);
    if (restored) {
      log(`  ${pin.path} (${mib(pin.size)}): restored from the build cache`);
      files.push(restored);
      continue;
    }
    log(`  ${pin.path} (${mib(pin.size)})`);
    files.push(await withRetries(pin.path, () => downloadFile(dir, model, pin, chunkBytes)));
  }

  const manifest = {
    id,
    repo: model.repo,
    revision: model.revision,
    license: model.license,
    chunkBytes,
    totalBytes: files.reduce((n, f) => n + f.size, 0),
    files,
  };
  // Remove anything the new manifest does not reference (old chunks, interrupted downloads).
  const keep = new Set(["manifest.json", ...files.flatMap((f) => f.chunks.map((c) => c.name))]);
  for (const name of await readdir(dir)) if (!keep.has(name)) await rm(path.join(dir, name), { force: true, recursive: true });
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  await saveToCache(id, dir, manifest);
  log(`${id}: done (${mib(manifest.totalBytes)} in ${files.reduce((n, f) => n + f.chunks.length, 0)} chunks)`);
  return manifest.totalBytes;
}

async function main() {
  const spec = JSON.parse(await readFile(SPEC_FILE, "utf8"));
  const chunkBytes = spec.chunkBytes;
  if (!Number.isInteger(chunkBytes) || chunkBytes <= 0 || chunkBytes >= HARD_LIMIT) {
    throw new Error(`chunkBytes must be a positive integer below ${HARD_LIMIT}`);
  }
  await mkdir(OUT_DIR, { recursive: true });
  let total = 0;
  for (const [id, model] of Object.entries(spec.models)) total += await fetchModel(id, model, chunkBytes);
  // Folders of models that are no longer pinned.
  for (const entry of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !(entry.name in spec.models)) {
      await rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
      log(`removed unpinned model folder ${entry.name}`);
    }
  }
  for (const entry of await readdir(CACHE_DIR, { withFileTypes: true }).catch(() => [])) {
    if (!(entry.isDirectory() && entry.name in spec.models)) await rm(path.join(CACHE_DIR, entry.name), { recursive: true, force: true });
  }
  log(`all models ready: ${mib(total)}`);
}

main().catch((err) => {
  console.error(`[fetch-models] ${err.stack ?? err}`);
  process.exit(1);
});
