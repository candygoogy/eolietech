import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Image tools (image-compress + variants, heic-to-jpg): drop a file, wait for the in-browser
 * result, download it, and prove nothing left the origin. Fixtures: e2e/fixtures/image/ (synthetic
 * gradients made by generate.py, including a hand-built HEIC).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(1, 4).toString("latin1") === "PNG",
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  avif: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" && b.subarray(8, 12).toString("latin1") === "avif",
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b,
};

/** Records every request (pages and workers) and console errors for the privacy assertions. */
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

async function download(page: Page, button: ReturnType<Page["getByRole"]>) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

async function convertOne(page: Page, url: string, input: string, expectedExt: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture(input));
  const item = page.locator(".tool-item").first();
  await expect(item).toHaveAttribute("data-state", "done", { timeout: 60_000 });
  // Same-format compression of a tiny fixture may come out larger; the tool then offers the original.
  const btn = item.getByRole("button", { name: /^Download (?!the original)/ }).first();
  const out = await download(page, btn);
  expect(out.name.toLowerCase().endsWith(`.${expectedExt}`), `${out.name} ends with .${expectedExt}`).toBe(true);
  expect(MAGIC[expectedExt]!(out.bytes), `${out.name} is a real ${expectedExt}`).toBe(true);
  await expect(page.locator(".tool-note[role=status]")).toContainText("1 of 1");
}

const variants: [slug: string, input: string, ext: string][] = [
  ["webp-to-png", "sample.webp", "png"],
  ["webp-to-jpg", "sample.webp", "jpg"],
  ["png-to-webp", "sample.png", "webp"],
  ["jpg-to-webp", "sample.jpg", "webp"],
  ["png-to-jpg", "sample.png", "jpg"],
  ["jpg-to-png", "sample.jpg", "png"],
  ["png-to-avif", "sample.png", "avif"],
  ["jpg-to-avif", "sample.jpg", "avif"],
  ["avif-to-jpg", "sample.avif", "jpg"],
  ["avif-to-png", "sample.avif", "png"],
];

for (const [slug, input, ext] of variants) {
  test(`/${slug}/ converts ${input} to ${ext} on the device`, async ({ page, baseURL }) => {
    const w = watch(page, baseURL!);
    await convertOne(page, `/${slug}/`, input, ext);
    w.assertPrivate();
  });
}

test("/heic-to-jpg/ converts a HEIC photo to JPG on the device", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await convertOne(page, "/heic-to-jpg/", "sample.heic", "jpg");
  w.assertPrivate();
});

test("/heic-to-png/ starts on PNG and converts a HEIC photo to PNG", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await convertOne(page, "/heic-to-png/", "sample.heic", "png");
  w.assertPrivate();
});

test("a file pasted anywhere on the page goes to the tool", async ({ page, baseURL, browserName }) => {
  // Firefox empties the clipboardData of a paste event made by script (a real Ctrl+V keeps its files).
  test.skip(browserName === "firefox", "script-made paste events carry no files in Firefox");
  const w = watch(page, baseURL!);
  await page.goto("/compress-image/");
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 8;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const data = new DataTransfer();
    data.items.add(new File([blob], "pasted.png", { type: "image/png" }));
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(1, { timeout: 60_000 });
  w.assertPrivate();
});

test("/compress-image/ compresses a batch and downloads it as a zip", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/compress-image/");
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await page
    .locator('.tool-drop input[type="file"]')
    .setInputFiles([fixture("sample.jpg"), fixture("sample.png"), fixture("sample.webp"), fixture("sample.avif")]);
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(4, { timeout: 90_000 });
  await expect(page.locator(".tool-note[role=status]")).toContainText("4 of 4");

  // Keep original format: each output keeps its own type (or the original is offered when not smaller).
  const jpgItem = page.locator(".tool-item").first();
  const one = await download(page, jpgItem.getByRole("button", { name: /^Download/ }).first());
  expect(MAGIC.jpg!(one.bytes)).toBe(true);

  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toMatch(/\.zip$/);
  expect(MAGIC.zip!(zip.bytes)).toBe(true);

  // Unsupported files are rejected with an alert, not processed.
  await page.locator('.tool-drop input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await expect(page.locator(".tool-error[role=alert]")).toContainText("notes.txt");
  w.assertPrivate();
});
