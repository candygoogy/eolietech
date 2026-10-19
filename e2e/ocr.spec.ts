import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

/**
 * Image to text (OCR): the page starts as the drop well only, shows the first-run download size,
 * reads real text with Tesseract (English and Italian), turns a scanned PDF into a searchable one
 * (keeping a page that already has text), stops on request, and never talks to another origin.
 * Fixtures: e2e/fixtures/document/ocr/ (made by make-fixtures.mjs there).
 *
 * Under `astro dev` there are no _headers, so every HTML and JS response gets the production CSP
 * and COEP here when it has none: the Tesseract worker, its core and the language data must load
 * under exactly those rules. Against `npm run preview` the real headers are already present.
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixture = (name: string) => path.join(FIXTURES, name);

const CSP =
  "default-src 'self'; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/** Model OCR runs; the first one also downloads and compiles the engine. */
test.setTimeout(240_000);

/** Fills in the production headers where missing; returns the URLs that went through the route. */
async function enforceHeaders(context: BrowserContext, origin: string): Promise<string[]> {
  const routed: string[] = [];
  await context.route(
    (url) => url.origin === origin,
    async (route) => {
      routed.push(route.request().url());
      const response = await route.fetch();
      const headers = response.headers();
      const type = headers["content-type"] ?? "";
      if (!headers["content-security-policy"] && /html|javascript/.test(type)) {
        headers["content-security-policy"] = CSP;
        headers["cross-origin-embedder-policy"] = "credentialless";
        headers["cross-origin-opener-policy"] = "same-origin";
      }
      await route.fulfill({ response, headers });
    },
  );
  return routed;
}

async function watch(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const routed = await enforceHeaders(page.context(), origin);
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.context().on("request", (r) => requests.push({ url: r.url(), method: r.method() }));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return {
    requests,
    routed,
    assertPrivate() {
      const offOrigin = requests.filter((r) => !/^(data|blob):/.test(r.url) && new URL(r.url).origin !== origin);
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      // Under astro dev, the enforced CSP also blocks Vite's own inline styles and HMR socket.
      const dev = requests.some((r) => r.url.includes("/@vite/client"));
      const devNoise = /Applying inline style violates|blocked an inline style|WebSocket connection to 'ws:|\[vite\]|Failed to send error to Vite server/;
      const real = errors.filter((e) => !/favicon/i.test(e) && !(dev && devNoise.test(e)));
      expect(real, "console errors / CSP violations").toEqual([]);
    },
  };
}

async function download(page: Page, button: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

const upload = (page: Page, names: string[]) => page.locator('.tool-drop input[type="file"]').setInputFiles(names.map(fixture));

/** Text of every page of a PDF, extracted with PDF.js in the test runner. */
async function pdfText(bytes: Buffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    pages.push(content.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : " ") : "")).join(""));
  }
  await doc.loadingTask.destroy();
  return pages;
}

test("/image-to-text/ reads English text from a screenshot, same-origin only", async ({ page, baseURL }) => {
  const w = await watch(page, baseURL!);
  await open(page, "/image-to-text/");
  // Only the drop well until files are added.
  await expect(page.locator(".tool--ocr > :not([hidden]):not(:empty)")).toHaveCount(1);
  await expect(page.getByLabel("Language of the text")).toBeHidden();

  await upload(page, ["document/ocr/english.png"]);
  await expect(page.getByLabel("Language of the text")).toHaveValue("eng");
  await expect(page.locator(".tool--ocr").getByText(/The first time, your browser downloads .* \(\d+(\.\d)? MB\)/)).toBeVisible();
  await expect(page.getByLabel("Also read pages that already have text")).toBeHidden();
  // Nothing of the engine is fetched before the click.
  expect(w.requests.filter((r) => /tesseract|\.traineddata/.test(r.url))).toEqual([]);

  await page.getByRole("button", { name: "Read text from 1 file" }).click();
  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "done", { timeout: 200_000 });
  const text = row.getByRole("region", { name: "Text from english.png" });
  await expect(text).toContainText("Invoice number 4821");
  await expect(text).toContainText("quick brown fox jumps over the lazy dog");
  await expect(page.locator(".tool-note[role=status]")).toHaveText("Text from 1 file ready.");
  await expect(page.locator(".tool--ocr").getByText(/The first time/)).toBeHidden();

  const txt = await download(page, row.getByRole("button", { name: "Download the text from english.png" }));
  expect(txt.name).toBe("english.txt");
  expect(txt.bytes.toString("utf8")).toContain("Payment due within thirty days.");

  const loaded = w.requests.map((r) => new URL(r.url).pathname);
  expect(loaded.some((p) => /\/tessdata\/[0-9a-f]{12}\/eng\.traineddata$/.test(p))).toBe(true);
  expect(loaded.some((p) => /ita\.traineddata/.test(p))).toBe(false);
  expect(loaded.some((p) => /tesseract-core-(relaxedsimd-|simd-)?lstm(\.[\w-]+)?\.wasm$/.test(p))).toBe(true);
  // The worker entry and the scripts it imports were served with the production headers too.
  expect(w.routed.some((u) => /tess-worker[^/]*\.js/.test(u))).toBe(true);
  expect(w.routed.some((u) => /worker\.min[^/]*\.js/.test(u))).toBe(true);
  w.assertPrivate();
});

test("/it/estrarre-testo-da-immagine/ reads Italian accents and points HEIC to the converter", async ({ page, baseURL }) => {
  const w = await watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/estrarre-testo-da-immagine/");
  await upload(page, ["document/ocr/italian.png", "image/sample.heic"]);
  await expect(page.getByLabel("Lingua del testo")).toHaveValue("ita");
  const rows = page.locator(".tool-item");
  await expect(rows.nth(1)).toHaveAttribute("data-state", "error");
  await expect(rows.nth(1).getByRole("link", { name: "da HEIC a JPG" })).toHaveAttribute("href", "/it/heic-in-jpg/");

  await page.getByRole("button", { name: "Leggi il testo di 1 file" }).click();
  await expect(rows.nth(0)).toHaveAttribute("data-state", "done", { timeout: 200_000 });
  const text = rows.nth(0).getByRole("region", { name: "Testo di italian.png" });
  await expect(text).toContainText("Fattura numero 4821");
  await expect(text).toContainText("Perché la città è più bella di sera?");
  await expect(page.locator(".tool-note[role=status]")).toContainText("Testo di 1 file pronto.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});

test("/ocr-pdf/ makes a scanned PDF searchable and keeps a page that already has text", async ({ page, baseURL }) => {
  const w = await watch(page, baseURL!);
  await open(page, "/ocr-pdf/");
  await expect(page.getByText("Choose a scanned PDF or drop it here")).toBeVisible();
  await upload(page, ["document/ocr/scan.pdf"]);
  await expect(page.getByLabel("Also read pages that already have text")).not.toBeChecked();
  await page.getByRole("button", { name: "Read text from 1 file" }).click();

  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "done", { timeout: 200_000 });
  await expect(row).toContainText("Page 2 already had text, so it was kept as it is");
  const text = row.getByRole("region", { name: "Text from scan.pdf" });
  await expect(text).toContainText("[Page 1]");
  await expect(text).toContainText("quick brown fox");
  await expect(text).toContainText("Already searchable page");

  const pdf = await download(page, row.getByRole("button", { name: "Download the searchable PDF of scan.pdf" }));
  expect(pdf.name).toBe("scan-ocr.pdf");
  const pages = await pdfText(pdf.bytes);
  expect(pages).toHaveLength(2);
  expect(pages[0]).toContain("Invoice number 4821");
  expect(pages[0]).toContain("quick brown fox jumps over the lazy dog");
  expect(pages[1]).toContain("Already searchable page");
  w.assertPrivate();
});

test("/image-to-text/ stops on request and can start again", async ({ page, baseURL }) => {
  const w = await watch(page, baseURL!);
  await open(page, "/image-to-text/");
  await upload(page, ["document/ocr/english.png"]);
  await page.getByRole("button", { name: "Read text from 1 file" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.locator(".tool-note[role=status]")).toContainText("Stopped.");
  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "pending");
  await page.getByRole("button", { name: "Read text from 1 file" }).click();
  await expect(row).toHaveAttribute("data-state", "done", { timeout: 200_000 });
  await expect(row.getByRole("region", { name: "Text from english.png" })).toContainText("4821");
  w.assertPrivate();
});
