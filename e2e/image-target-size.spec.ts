import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { inspectJpeg } from "../src/tools/exif-remover/jpeg";

/**
 * Compress an image to a size in KB: a photo-like image shrinks under 20 KB as JPG, a file already
 * under the target keeps its image but loses its metadata, WebP output, an impossible target fails per file, and
 * nothing leaves the origin. The fixtures in e2e/fixtures/image/ are 64 x 48, too small to need
 * shrinking, so the large image is drawn in the page (seeded, so every run gets the same picture).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

const isJpg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isWebp = (b: Buffer) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
const isZip = (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b;

function watch(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.context().on("request", (r) => requests.push({ url: r.url(), method: r.method() }));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return {
    assertPrivate() {
      const offOrigin = requests.filter((r) => !r.url.startsWith("data:") && !r.url.startsWith("blob:") && new URL(r.url).origin !== origin);
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      expect(errors.filter((e) => !/favicon/i.test(e)), "console errors / CSP violations").toEqual([]);
    },
  };
}

async function download(page: Page, button: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

async function setNumber(field: Locator, value: string) {
  await field.fill(value);
  await field.press("Enter");
  await field.blur();
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

const done = (row: Locator) => expect(row).toHaveAttribute("data-state", "done", { timeout: 90_000 });

/**
 * A 2400 x 1800 photo-like JPG (gradients, shapes, grain), about 1 to 2 MB: far over 20 KB at full
 * size, comfortably under it once scaled down. Drawn on a canvas in the page, no file committed.
 */
async function photo(page: Page, name = "photo.jpg") {
  const base64 = await page.evaluate(async () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const c = new OffscreenCanvas(2400, 1800);
    const g = c.getContext("2d")!;
    const sky = g.createLinearGradient(0, 0, 0, 1800);
    sky.addColorStop(0, "#5b8bd0");
    sky.addColorStop(0.6, "#e8d2a8");
    sky.addColorStop(1, "#4d6b3a");
    g.fillStyle = sky;
    g.fillRect(0, 0, 2400, 1800);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `hsl(${Math.floor(rnd() * 360)} ${30 + rnd() * 50}% ${25 + rnd() * 50}% / ${0.3 + rnd() * 0.6})`;
      g.beginPath();
      g.arc(rnd() * 2400, rnd() * 1800, 10 + rnd() * 160, 0, Math.PI * 2);
      g.fill();
    }
    const img = g.getImageData(0, 0, 2400, 1800);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rnd() - 0.5) * 24;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return { name, mimeType: "image/jpeg", buffer: Buffer.from(base64, "base64") };
}

test("/compress-image-to-20kb/ gets a large photo under 20,000 bytes as JPG", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/compress-image-to-20kb/");
  await expect(page.getByLabel("Target size (KB)")).toHaveValue("20");
  await expect(page.getByLabel("Save as")).toHaveValue("jpg");
  await expect(page.locator(".tool-options .tool-note").first()).toContainText("20,000 bytes");
  const file = await photo(page);
  expect(file.buffer.length).toBeGreaterThan(200_000);
  await page.locator('.tool-drop input[type="file"]').setInputFiles(file);
  const row = page.locator(".tool-item").first();
  await done(row);
  // Made smaller in pixels, keeping its 4:3 shape, and the quality is reported.
  await expect(row).toContainText(/2400 × 1800 → \d+ × \d+ px/);
  await expect(row).toContainText(/Quality \d+/);
  const out = await download(page, row.getByRole("button", { name: "Download photo.jpg" }));
  expect(out.name).toBe("photo.jpg");
  expect(isJpg(out.bytes)).toBe(true);
  expect(out.bytes.length).toBeLessThanOrEqual(20_000);
  // Not needlessly tiny: the search uses most of the budget.
  expect(out.bytes.length).toBeGreaterThan(12_000);
  // Sizes in the target's units (1 KB = 1000 bytes, rounded down): never "19 KB" for 19,8xx bytes.
  const kb = (Math.floor(out.bytes.length / 100) / 10).toFixed(1);
  await expect(row).toContainText(`→ ${kb} KB`);
  w.assertPrivate();
});

/** The entropy-coded image data of a JPEG (first SOS to EOI): equal means the image was not re-encoded. */
function scanData(b: Buffer): Buffer {
  return b.subarray(b.indexOf(Buffer.from([0xff, 0xda])), b.lastIndexOf(Buffer.from([0xff, 0xd9])) + 2);
}

test("a file already under the target keeps its image but loses its metadata", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/compress-image-to-20kb/");
  // 64 x 48 JPG with GPS, camera, date, XMP and a rotation flag (shown upright as 48 x 64).
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("exif-gps.jpg"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText("image kept as it is, without metadata");
  await expect(row).toContainText("48 × 64 px");
  await expect(row).not.toContainText("Quality");
  const out = await download(page, row.getByRole("button", { name: "Download exif-gps.jpg" }));
  expect(out.name).toBe("exif-gps.jpg");
  const original = await readFile(fixture("exif-gps.jpg"));
  expect(out.bytes.length).toBeLessThan(original.length);
  expect(scanData(out.bytes).equals(scanData(original))).toBe(true);
  // Nothing left but the rotation flag, so the photo stays upright.
  const report = inspectJpeg(out.bytes);
  expect(report.gps).toBeNull();
  expect(report.exif).toMatchObject({ orientation: 6, otherTags: 0, hasGpsBlock: false });
  expect(report.exif?.make).toBeUndefined();
  expect(report.blocks).toEqual([]);
  expect(out.bytes.includes("GPS")).toBe(false);
  expect(out.bytes.includes("Pixel")).toBe(false);

  // Same file, but WebP was asked for: it is converted, not kept.
  await page.getByLabel("Save as").selectOption("webp");
  await expect(row.getByRole("button", { name: "Download exif-gps.webp" })).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText("Quality 92");
  w.assertPrivate();
});

test("/compress-image-to-kb/ saves WebP under the typed size, and a batch zips", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/compress-image-to-kb/");
  await expect(page.getByLabel("Target size (KB)")).toHaveValue("100");
  await setNumber(page.getByLabel("Target size (KB)"), "60");
  await page.getByLabel("Save as").selectOption("webp");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([
    await photo(page),
    { name: "sample.png", mimeType: "image/png", buffer: await readFile(fixture("sample.png")) },
  ]);
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(2, { timeout: 90_000 });
  const row = page.locator(".tool-item").first();
  const out = await download(page, row.getByRole("button", { name: "Download photo.webp" }));
  expect(isWebp(out.bytes)).toBe(true);
  expect(out.bytes.length).toBeLessThanOrEqual(60_000);
  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("compressed-images.zip");
  expect(isZip(zip.bytes)).toBe(true);
  w.assertPrivate();
});

test("an impossible target fails that file with a clear message", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/compress-image-to-kb/");
  await setNumber(page.getByLabel("Target size (KB)"), "1");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(await photo(page));
  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "error", { timeout: 90_000 });
  await expect(row).toContainText("does not get under the target, even at 200 px");
  // An empty size is flagged, said once, and keeps the last size.
  await page.getByLabel("Target size (KB)").fill("");
  await expect(page.getByLabel("Target size (KB)")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator('.tool-options [aria-live="polite"]')).toHaveText("Type a size from 1 to 50,000 KB.");
  w.assertPrivate();
});

test("/it/comprimere-foto-a-100kb/ works in Italian at 360px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/comprimere-foto-a-100kb/");
  await expect(page.getByLabel("Peso massimo (KB)")).toHaveValue("100");
  await expect(page.locator(".tool-options .tool-note").first()).toContainText("100.000 byte");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(await photo(page, "foto.jpg"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText(/Qualità \d+/);
  await expect(page.locator(".tool-note[role=status]")).toContainText("Immagini pronte: 1 su 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});
