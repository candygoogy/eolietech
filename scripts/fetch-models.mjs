#!/usr/bin/env node
/**
 * Fetch the pinned AI model files for the on-device AI tools and publish them as static assets.
 *
 *   node scripts/fetch-models.mjs          (runs before `astro build`, see package.json)
 *
 * Reads src/tools/ai-shared/models.json (repo, commit revision, path, size and sha256 of every
 * file), downloads each file from Hugging Face at that exact revision, verifies size and sha256,
 * and splits it into chunks smaller than the 25 MiB per-file limit of Cloudflare static assets.
 * Output, per model: public/models/<id>/manifest.json plus content-addressed <sha16>-<n>.bin chunks.
 * public/models/ is gitignored; Astro copies it into dist/ (and serves it in `astro dev`).
 *
 * Idempotent: a model whose manifest matches the pins and whose chunks are present with the right
 * size and sha256 is left alone (no network). Stale files in a model folder are removed.
 * Node >= 22, no dependencies.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_FILE = path.join(ROOT, "src", "tools", "ai-shared", "models.json");
const OUT_DIR = path.join(ROOT, "public", "models");
const HF = "https://huggingface.co";
const HARD_LIMIT = 25 * 1024 * 1024;
const RETRIES = 3;

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

/** Download one pinned file, streaming it into chunk files; verifies size and sha256 before publishing the chunks. */
async function downloadFile(dir, model, pin, chunkBytes) {
  const url = `${HF}/${model.repo}/resolve/${model.revision}/${pin.path}`;
  const prefix = pin.sha256.slice(0, 16);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`);

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

  for await (const part of res.body) {
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

  const digest = whole.digest("hex");
  const cleanup = () => Promise.all(chunks.map((c) => rm(path.join(dir, `${c.name}.partial`), { force: true })));
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

async function withRetries(label, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRIES) throw err;
      log(`  ${label} failed (${err.message}); retrying (${attempt}/${RETRIES - 1})`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
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
  log(`all models ready: ${mib(total)}`);
}

main().catch((err) => {
  console.error(`[fetch-models] ${err.stack ?? err}`);
  process.exit(1);
});
