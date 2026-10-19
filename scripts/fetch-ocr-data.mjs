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
 * Node >= 22, no dependencies.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_FILE = path.join(ROOT, "src", "tools", "ocr", "tessdata.json");
const OUT_DIR = path.join(ROOT, "public", "tessdata");
const HARD_LIMIT = 25 * 1024 * 1024;
const RETRIES = 3;

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

async function download(spec, lang, pin, file) {
  const url = sourceUrl(spec, lang);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const problem = checkFile(buf, pin);
      if (problem) throw new Error(`${lang}.traineddata: ${problem}`);
      await writeFile(`${file}.partial`, buf);
      await rename(`${file}.partial`, file);
      return;
    } catch (err) {
      await rm(`${file}.partial`, { force: true });
      if (attempt >= RETRIES) throw err;
      log(`  ${lang} failed (${err.message}); retrying (${attempt}/${RETRIES - 1})`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  const spec = JSON.parse(await readFile(SPEC_FILE, "utf8"));
  validateSpec(spec);
  const folder = folderFor(spec.commit);
  const dir = path.join(OUT_DIR, folder);
  await mkdir(dir, { recursive: true });

  let total = 0;
  for (const [lang, pin] of Object.entries(spec.files)) {
    const file = path.join(dir, `${lang}.traineddata`);
    total += pin.size;
    if (await readIfValid(file, pin)) {
      log(`${lang}: up to date (${mib(pin.size)})`);
      continue;
    }
    log(`${lang}: fetching ${spec.repo}@${folder} (${mib(pin.size)})`);
    await download(spec, lang, pin, file);
  }

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
