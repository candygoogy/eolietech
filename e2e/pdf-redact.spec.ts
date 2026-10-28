import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/**
 * Redact PDF: search, review, draw, apply and download in the browser; the downloaded file is
 * read back with PDF.js in Node to prove the text is gone. Fixture: e2e/fixtures/pdf/redact/
 * personal-data.pdf (two A4 pages; page 1 holds a name, an email, an IBAN, a codice fiscale and
 * a phone number, page 2 mentions the surname once).
 */
const fixture = fileURLToPath(new URL("./fixtures/pdf/redact/personal-data.pdf", import.meta.url));

/**
 * A Firefox that was just launched next to other workers is slow for its first seconds: measured
 * in a parallel run, its first page load took 4 to 13 s and its first PDF open up to 7 s more,
 * against 0.3 s and 1 s on the same browsers once warm, with the page's own main thread idle the
 * whole time. Each worker's browser (and the new one Playwright starts after a failure) opens a PDF
 * here once, waiting on the tool's own ready signals, so the tests' waits measure the tool.
 */
const WARM_MS = 60_000;
const test = base.extend<object, { warm: void }>({
  warm: [
    async ({ browser }, use, workerInfo) => {
      const page = await browser.newPage({ baseURL: workerInfo.project.use.baseURL });
      await page.goto("/redact-pdf/", { timeout: WARM_MS });
      await page.locator("[data-tool-root][data-mounted='true'] input[type=file]").setInputFiles(fixture, { timeout: WARM_MS });
      await expect(page.locator('.redact-frame[data-page="1"] canvas')).toBeVisible({ timeout: WARM_MS });
      await page.close();
      await use();
    },
    { scope: "worker", auto: true, timeout: 2 * WARM_MS },
  ],
});

function watchNetwork(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const offending: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol === "data:") return;
    const reqOrigin = url.protocol === "blob:" ? new URL(url.pathname).origin : url.origin;
    if (reqOrigin !== origin) offending.push(`cross-origin ${req.method()} ${req.url()}`);
    if (req.method() !== "GET" && req.method() !== "HEAD") offending.push(`${req.method()} ${req.url()}`);
  });
  return offending;
}

async function download(page: Page, trigger: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  return { name: dl.suggestedFilename(), bytes: new Uint8Array(await readFile(await dl.path())) };
}

/** The text PDF.js finds on each page. */
async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    out.push(content.items.map((i) => ("str" in i ? i.str : "")).join(" "));
  }
  await pdf.loadingTask.destroy();
  return out;
}

async function openTool(page: Page, path: string) {
  await page.goto(path);
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await expect(root).toBeVisible();
  await root.locator("input[type=file]").setInputFiles(fixture);
  return root;
}

const boxesOn = (root: Locator, n: number) => root.locator(`.redact-frame[data-page="${n}"] .redact-box`);

test("/redact-pdf/ finds personal data, lets you review it, and removes it from the file", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/redact-pdf/");
  await expect(root.getByText(/personal-data\.pdf: 2 pages/)).toBeVisible();
  await expect(root.getByRole("status")).toHaveText(/^Ready\./);

  await root.getByRole("button", { name: "IBANs" }).click();
  await expect(root.getByRole("status")).toHaveText(/^Found 1 match: page 1 \(1\)\./);
  await root.getByRole("button", { name: "Email addresses" }).click();
  await expect(root.getByRole("status")).toHaveText(/^Found 1 match: page 1 \(1\)\./);
  await root.getByRole("button", { name: "Phone numbers" }).click();
  await root.getByRole("button", { name: "Codici fiscali" }).click();
  await expect(boxesOn(root, 1)).toHaveCount(4);

  await root.getByLabel("Words or numbers").fill("rossi");
  await root.getByRole("button", { name: "Black out every match" }).click();
  // Page 1's "Mario Rossi" gets a box; the email's "rossi" already has one. Page 2 gets its own.
  await expect(root.getByRole("status")).toHaveText(/^Found 3 matches: page 1 \(2\), page 2 \(1\)\./);
  await expect(boxesOn(root, 1)).toHaveCount(5);
  await expect(boxesOn(root, 2)).toHaveCount(1);

  // Review: keep page 2 as it is by removing its box.
  await boxesOn(root, 2).click();
  await root.getByRole("button", { name: "Remove box 1 on page 2" }).click();
  await expect(boxesOn(root, 2)).toHaveCount(0);

  await root.getByRole("button", { name: "Redact and save" }).click();
  await expect(root.getByRole("status")).toHaveText(/^Done\. 1 page redacted/);
  const out = await download(page, root.getByRole("button", { name: "Download personal-data-redacted.pdf" }));
  expect(out.name).toBe("personal-data-redacted.pdf");

  const texts = await pageTexts(out.bytes);
  expect(texts[0]).toBe("");
  expect(texts[1]).toContain("Page two mentions Rossi again.");
  const all = texts.join("\n");
  for (const secret of ["Mario", "mario.rossi@example.com", "X054", "RSSMRA85T10A562S", "333"]) expect(all).not.toContain(secret);
  const doc = await PDFDocument.load(out.bytes, { updateMetadata: false });
  expect(doc.getTitle()).toBeUndefined();
  expect(doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])).toEqual([
    [595, 842],
    [595, 842],
  ]);

  expect(offending).toEqual([]);
});

test("/redact-pdf/ draws a box with the mouse and saves it", async ({ page }) => {
  const root = await openTool(page, "/redact-pdf/");
  const frame = root.locator('.redact-frame[data-page="2"]');
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator("canvas")).toBeVisible();
  const r = (await frame.boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.05, r.y + r.height * 0.08);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.3, r.y + r.height * 0.1, { steps: 5 });
  await page.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.12, { steps: 5 });
  await page.mouse.up();
  await expect(boxesOn(root, 2)).toHaveCount(1);
  const b = (await boxesOn(root, 2).boundingBox())!;
  expect(Math.abs(b.x - (r.x + r.width * 0.05))).toBeLessThan(3);
  expect(Math.abs(b.width - r.width * 0.55)).toBeLessThan(3);
  await expect(root.locator('.redact-page:nth-child(2) .redact-page__meta')).toHaveText("1 box");

  // Move it by dragging from inside, then check it really moved.
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 30, { steps: 4 });
  await page.mouse.up();
  const moved = (await boxesOn(root, 2).boundingBox())!;
  expect(Math.round(moved.x - b.x)).toBe(20);
  expect(Math.round(moved.y - b.y)).toBe(30);

  await root.getByRole("button", { name: "Redact and save" }).click();
  const out = await download(page, root.getByRole("button", { name: "Download personal-data-redacted.pdf" }));
  const texts = await pageTexts(out.bytes);
  expect(texts[0]).toContain("Mario Rossi");
  expect(texts[1]).toBe("");
});

test("/redact-pdf/ works from the keyboard and announces the box", async ({ page }) => {
  const root = await openTool(page, "/redact-pdf/");
  await root.getByRole("button", { name: "Add a box to page 1" }).click();
  const box = root.getByRole("application", { name: "Black box 1 on page 1" });
  await expect(box).toBeFocused();
  const live = root.locator("p.visually-hidden[aria-live]");
  await expect(live).toHaveText("Box 1 added to page 1.");
  const before = (await box.boundingBox())!;
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Alt+ArrowDown");
  await expect(live).toHaveText(/^Box 1 on page 1: \d+% from the left/);
  const after = (await box.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.height).toBeGreaterThan(before.height);
  await page.keyboard.press("Delete");
  await expect(boxesOn(root, 1)).toHaveCount(0);
  await expect(root.getByRole("button", { name: "Add a box to page 1" })).toBeFocused();

  await root.getByRole("button", { name: "Redact and save" }).click();
  await expect(root.getByRole("alert")).toHaveText(/nothing to redact yet/);
});

test("/redact-pdf/ says so when a PDF has no text to search", async ({ page }) => {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]).drawRectangle({ x: 20, y: 20, width: 100, height: 50 });
  await page.goto("/redact-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
  await root.getByRole("button", { name: "Phone numbers" }).click();
  await expect(root.getByRole("status")).toHaveText(/no text that search can read/);
});

test("/it/oscurare-pdf/ works in Italian", async ({ page }) => {
  const root = await openTool(page, "/it/oscurare-pdf/");
  await expect(root.getByText(/personal-data\.pdf: 2 pagine/)).toBeVisible();
  await root.getByLabel("Parole o numeri").fill("Mario Rossi");
  await root.getByRole("button", { name: "Oscura tutti i risultati" }).click();
  await expect(root.getByRole("status")).toHaveText(/^Trovato 1 risultato: pagina 1 \(1\)\./);
  await root.getByRole("button", { name: "Oscura e salva" }).click();
  await expect(root.getByRole("status")).toHaveText(/^Fatto\. 1 pagina oscurata/);
  const out = await download(page, root.getByRole("button", { name: "Scarica personal-data-oscurato.pdf" }));
  expect(out.name).toBe("personal-data-oscurato.pdf");
  expect((await pageTexts(out.bytes)).join(" ")).not.toContain("Mario");
});
