import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Image fitter (/make-image-square/ and its 16:9 variant): fit the whole photo into a frame of the
 * chosen shape, check the output's pixel size, the blurred background and the formats, and prove
 * nothing left the origin. Fixtures: e2e/fixtures/image/ (64 x 48 gradients).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

const isJpg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b: Buffer) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isZip = (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b;

/** Pixel size from the PNG IHDR chunk or the JPEG start-of-frame segment. */
function pixelSize(b: Buffer): { width: number; height: number } {
  if (isPng(b)) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) throw new Error(`bad JPEG marker at ${i}`);
    const marker = b[i + 1]!;
    const len = b.readUInt16BE(i + 2);
    // SOF0..SOF15, except DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  throw new Error("no frame header");
}

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
      const offOrigin = requests.filter((r) => !r.url.startsWith("data:") && new URL(r.url).origin !== origin);
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

/** Type into a number field and commit it, as a keyboard user would. */
async function setNumber(field: Locator, value: string) {
  await field.fill(value);
  await field.press("Enter");
  await field.blur();
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

const done = (row: Locator) => expect(row).toHaveAttribute("data-state", "done", { timeout: 60_000 });
const option = (page: Page, text: string) => page.locator(".fit-choice__option", { hasText: text });
const checked = (page: Page, legend: string) =>
  page.locator(".fit-choice", { has: page.locator("legend", { hasText: legend }) }).locator(".fit-choice__option:has(input:checked)");

test("/make-image-square/ makes a square PNG and JPG of the whole photo", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/make-image-square/");
  await expect(checked(page, "Shape")).toHaveText("1:1");
  await expect(checked(page, "Background")).toHaveText("White");
  // "Same as original" keeps a JPG, so Transparent is not offered.
  await expect(option(page, "Transparent")).toBeHidden();

  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.png"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText("64 × 48 → 64 × 64 px");
  const png = await download(page, row.getByRole("button", { name: "Download sample.png" }));
  expect(isPng(png.bytes)).toBe(true);
  expect(pixelSize(png.bytes)).toEqual({ width: 64, height: 64 });

  await page.getByLabel("Save as").selectOption("jpg");
  await expect(row.getByRole("button", { name: "Download sample.jpg" })).toBeVisible({ timeout: 60_000 });
  const jpg = await download(page, row.getByRole("button", { name: "Download sample.jpg" }));
  expect(jpg.name).toBe("sample.jpg");
  expect(isJpg(jpg.bytes)).toBe(true);
  expect(pixelSize(jpg.bytes)).toEqual({ width: 64, height: 64 });

  // A fixed frame width: the photo is scaled up to fill it.
  await page.getByLabel("Size", { exact: true }).selectOption("width");
  await setNumber(page.getByLabel("Frame width (px)"), "100");
  await expect(page.locator(".tool-options .tool-note").first()).toContainText("100 × 100 px");
  await expect(row).toContainText("64 × 48 → 100 × 100 px", { timeout: 60_000 });

  // 4:5 with the same width.
  await option(page, "4:5").click();
  await expect(row).toContainText("64 × 48 → 100 × 125 px", { timeout: 60_000 });
  await done(row);
  w.assertPrivate();
});

test("/fit-image-to-16-9/ starts on 16:9", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/fit-image-to-16-9/");
  await expect(checked(page, "Shape")).toHaveText("16:9");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.jpg"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText("64 × 48 → 85 × 48 px");
  const out = await download(page, row.getByRole("button", { name: "Download sample.jpg" }));
  expect(pixelSize(out.bytes)).toEqual({ width: 85, height: 48 });
  w.assertPrivate();
});

test("blurred, coloured and transparent backgrounds produce files", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/make-image-square/");
  await option(page, "Blurred photo").click();
  await page.locator('.tool-drop input[type="file"]').setInputFiles([fixture("sample.jpg"), fixture("sample.webp")]);
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(2, { timeout: 90_000 });
  const row = page.locator(".tool-item").first();
  await expect(row).toContainText("64 × 48 → 64 × 64 px");
  const blurred = await download(page, row.getByRole("button", { name: "Download sample.jpg" }));
  expect(isJpg(blurred.bytes)).toBe(true);
  expect(pixelSize(blurred.bytes)).toEqual({ width: 64, height: 64 });
  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("framed-images.zip");
  expect(isZip(zip.bytes)).toBe(true);

  // Colour shows the picker; PNG offers Transparent.
  await expect(page.getByLabel("Background colour")).toBeHidden();
  await option(page, "Colour").click();
  await expect(page.getByLabel("Background colour")).toBeVisible();
  await page.getByLabel("Save as").selectOption("png");
  await option(page, "Transparent").click();
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(2, { timeout: 90_000 });
  const clear = await download(page, row.getByRole("button", { name: "Download sample.png" }));
  expect(isPng(clear.bytes)).toBe(true);
  // The frame around the photo is transparent: an alpha channel (colour type 4 or 6) or a palette with tRNS.
  expect([4, 6].includes(clear.bytes[25]!) || clear.bytes.includes("tRNS")).toBe(true);
  // Back to JPG: Transparent goes away and White is chosen again.
  await page.getByLabel("Save as").selectOption("jpg");
  await expect(option(page, "Transparent")).toBeHidden();
  await expect(checked(page, "Background")).toHaveText("White");
  w.assertPrivate();
});

test("/it/foto-quadrata-senza-tagliare/ works in Italian at 360px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/foto-quadrata-senza-tagliare/");
  await option(page, "Foto sfocata").click();
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.png"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText("64 × 48 → 64 × 64 px");
  await expect(page.locator(".tool-note[role=status]")).toContainText("Immagini pronte: 1 su 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});
