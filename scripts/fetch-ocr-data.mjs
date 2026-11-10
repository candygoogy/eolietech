#!/usr/bin/env node
/**
 * Fetch the pinned Tesseract language data for the OCR tool and publish it as static assets.
 *
 *   node scripts/fetch-ocr-data.mjs          (runs before `astro dev` and `astro build`, see package.json)
 *
 * Reads src/tools/ocr/tessdata.json (GitHub repo, commit, size and sha256 of every
 * <lang>.traineddata), downloads each file at that exact commit, verifies size and sha256 and
 * writes it to public/tessdata/<commit 12>/<lang>.traineddata (uncompressed: the OCR worker loads
 * it with gzip: false). public/tessdata/ is gitignored; Astro copies it into dist/.
 *
 * Idempotent: files already present with the pinned size and sha256 are left alone (no network).
 * Anything else in public/tessdata/ (older commits, interrupted downloads) is removed.
 *
 * Build cache: verified files are also kept under node_modules/.astro/eolietech-assets/tessdata/,
 * which Workers Builds restores between builds for Astro projects (build cache on), and restored
 * from there (size and sha256 checked again) before anything is downloaded. Downloads: per-request
 * timeout, and on HTTP 429 / 5xx or a network error a backoff of up to a few minutes that honours
 * Retry-After.
 * Node >= 22, no dependencies.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_FILE = path.join(ROOT, "src", "tools", "ocr", "tessdata.json");
const OUT_DIR = path.join(ROOT, "public", "tessdata");
const CACHE_DIR = path.join(ROOT, "node_modules", ".astro", "eolietech-assets", "tessdata");
const HARD_LIMIT = 25 * 1024 * 1024;
/** Attempts per file, the longest single wait, and the most waiting per file before giving up. */
const ATTEMPTS = 8;
const MAX_WAIT_MS = 180_000;
const WAIT_BUDGET_MS = 360_000;
/** Whole-request timeout (the files are a few MiB each). */
const REQUEST_TIMEOUT_MS = 120_000;

const log = (msg) => console.log(`[fetch-ocr-data] ${msg}`);
const mib = (n) => `${(n / 1024 / 1024).toFixed(1)} MiB`;
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Folder name for a pinned commit (also the URL segment the client uses). */
export const folderFor = (commit) => commit.slice(0, 12);

/** Raw download URL of one file at the pinned commit. */
export const sourceUrl = (spec, lang) => `https://raw.githubusercontent.com/${spec.repo}/${spec.commit}/${lang}.traineddata`;

/** Throws unless the spec is usable: full commit hash, safe language codes, sane pins under the asset limit. */
export function validateSpec(spec) {
  if (!/^[0-9a-f]{40}$/.test(spec?.commit ?? "")) throw new Error("commit must be a full 40-character hash");
  if (!/^[\w.-]+\/[\w.-]+$/.test(spec?.repo ?? "")) throw new Error("repo must be owner/name");
  const entries = Object.entries(spec.files ?? {});
  if (entries.length === 0) throw new Error("no files pinned");
  for (const [lang, pin] of entries) {
    if (!/^[a-z]{3}(_[a-z]+)?$/.test(lang)) throw new Error(`bad language code ${lang}`);
    if (!Number.isInteger(pin.size) || pin.size <= 0 || pin.size >= HARD_LIMIT) throw new Error(`${lang}: size must be a positive integer below 25 MiB`);
    if (!/^[0-9a-f]{64}$/.test(pin.sha256)) throw new Error(`${lang}: sha256 must be 64 hex characters`);
  }
}

/** null when `buf` matches the pin, else a reason. */
export function checkFile(buf, pin) {
  if (buf.length !== pin.size) return `expected ${pin.size} bytes, got ${buf.length}`;
  const digest = sha256(buf);
  if (digest !== pin.sha256) return `sha256 mismatch (expected ${pin.sha256}, got ${digest})`;
  return null;
}

async function readIfValid(file, pin) {
  try {
    return checkFile(await readFile(file), pin) === null;
  } catch {
    return false;
  }
}

/** Retry-After as milliseconds: delta-seconds or an HTTP date; null when absent or unreadable. */
export function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

/** An HTTP failure worth retrying (408, 429, 5xx) or not (404, 403...), with the server's Retry-After if any. */
class HttpError extends Error {
  constructor(url, res) {
    super(`${url}: HTTP ${res.status}`);
    this.retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    this.retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
  }
}

/**
 * Downloads and verifies one file. HTTP 408 / 429 / 5xx, timeouts, network errors and bad bytes are
 * retried after the server's Retry-After or an exponential backoff (5s, 10s, 20s... with jitter),
 * each wait capped at MAX_WAIT_MS and all of them at WAIT_BUDGET_MS; other HTTP errors fail at once.
 */
async function download(spec, lang, pin, file) {
  const url = sourceUrl(spec, lang);
  let waited = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!res.ok) throw new HttpError(url, res);
      const buf = Buffer.from(await res.arrayBuffer());
      const problem = checkFile(buf, pin);
      if (problem) throw new Error(`${lang}.traineddata: ${problem}`);
      await writeFile(`${file}.partial`, buf);
      await rename(`${file}.partial`, file);
      return;
    } catch (err) {
      await rm(`${file}.partial`, { force: true });
      if (err instanceof HttpError && !err.retryable) throw err;
      const backoff = Math.min(MAX_WAIT_MS, 5000 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.4);
      const hinted = err instanceof HttpError && err.retryAfterMs != null ? err.retryAfterMs : backoff;
      const wait = Math.round(Math.min(MAX_WAIT_MS, hinted));
      if (attempt >= ATTEMPTS || waited + wait > WAIT_BUDGET_MS) throw err;
      waited += wait;
      log(`  ${lang} failed (${err.message}); retrying in ${Math.ceil(wait / 1000)}s (${attempt}/${ATTEMPTS - 1})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** Copies a verified file from the build cache into place; false when the cache has no valid copy. */
async function restoreFromCache(folder, lang, pin, file) {
  const cached = path.join(CACHE_DIR, folder, `${lang}.traineddata`);
  if (!(await readIfValid(cached, pin))) return false;
  await copyFile(cached, `${file}.partial`);
  // Checked again where it lands: a copy is only published once it matches the pin.
  if (!(await readIfValid(`${file}.partial`, pin))) {
    await rm(`${file}.partial`, { force: true });
    return false;
  }
  await rename(`${file}.partial`, file);
  return true;
}

/** Mirrors the published folder into the build cache. A cache problem never fails the build. */
async function saveToCache(spec, folder, dir) {
  try {
    const cacheFolder = path.join(CACHE_DIR, folder);
    await mkdir(cacheFolder, { recursive: true });
    for (const [lang, pin] of Object.entries(spec.files)) {
      const target = path.join(cacheFolder, `${lang}.traineddata`);
      if (await readIfValid(target, pin)) continue;
      await copyFile(path.join(dir, `${lang}.traineddata`), `${target}.partial`);
      await rename(`${target}.partial`, target);
    }
    const keep = new Set(Object.keys(spec.files).map((lang) => `${lang}.traineddata`));
    for (const entry of await readdir(CACHE_DIR, { withFileTypes: true })) {
      if (entry.name !== folder) await rm(path.join(CACHE_DIR, entry.name), { recursive: true, force: true });
    }
    for (const name of await readdir(cacheFolder)) if (!keep.has(name)) await rm(path.join(cacheFolder, name), { recursive: true, force: true });
  } catch (err) {
    log(`warning: could not update the build cache (${err.message})`);
  }
}

async function main() {
  const spec = JSON.parse(await readFile(SPEC_FILE, "utf8"));
  validateSpec(spec);
  const folder = folderFor(spec.commit);
  const dir = path.join(OUT_DIR, folder);
  await mkdir(dir, { recursive: true });

  let total = 0;
  let changed = false;
  for (const [lang, pin] of Object.entries(spec.files)) {
    const file = path.join(dir, `${lang}.traineddata`);
    total += pin.size;
    if (await readIfValid(file, pin)) {
      log(`${lang}: up to date (${mib(pin.size)})`);
      continue;
    }
    changed = true;
    if (await restoreFromCache(folder, lang, pin, file).catch(() => false)) {
      log(`${lang}: restored from the build cache (${mib(pin.size)})`);
      continue;
    }
    log(`${lang}: fetching ${spec.repo}@${folder} (${mib(pin.size)})`);
    await download(spec, lang, pin, file);
  }
  if (changed) await saveToCache(spec, folder, dir);

  // Remove whatever the pins do not name: other commits, other languages, leftovers.
  const keep = new Set(Object.keys(spec.files).map((lang) => `${lang}.traineddata`));
  for (const entry of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (entry.name !== folder) await rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
  }
  for (const name of await readdir(dir)) if (!keep.has(name)) await rm(path.join(dir, name), { recursive: true, force: true });
  log(`language data ready: ${mib(total)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[fetch-ocr-data] ${err.stack ?? err}`);
    process.exit(1);
  });
}
