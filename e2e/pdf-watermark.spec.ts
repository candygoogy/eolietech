import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib";

/**
 * Add a watermark to a PDF: a text watermark on a page range, a logo on every page, and the message
 * for characters the standard PDF fonts can't draw. Results are checked with PDF.js (text) and pdf-lib
 * (pages, images). Nothing may leave the origin.
 * Fixtures: e2e/fixtures/pdf/five-pages.pdf, e2e/fixtures/image/sample.png.
 */
const pdfFixture = (name: string) => fileURLToPath(new URL(`./fixtures/pdf/${name}`, import.meta.url));
const imageFixture = (name: string) => fileURLToPath(new URL(`./fixtures/image/${name}`, import.meta.url));

function watchNetwork(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const offending: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol === "data:") return;
    // blob: URLs carry their creator's origin ("blob:http://localhost:8787/<uuid>").
    const reqOrigin = url.protocol === "blob:" ? new URL(url.pathname).origin : url.origin;
    if (reqOrigin !== origin) offending.push(`cross-origin ${req.method()} ${req.url()}`);
    if (req.method() !== "GET" && req.method() !== "HEAD") offending.push(`${req.method()} ${req.url()}`);
  });
  return offending;
}

async function download(page: Page, trigger: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  return { name: dl.suggestedFilename(), bytes: await readFile(await dl.path()) };
}

async function openTool(page: Page, path: string) {
  await page.goto(path);
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await expect(root).toBeVisible();
  await root.locator(".tool-drop input[type=file]").setInputFiles(pdfFixture("five-pages.pdf"));
  await expect(root.getByText(/five-pages\.pdf: 5 pages/)).toBeVisible();
  await expect(root.locator(".wm-preview__caption")).toHaveText(/Preview of page 1 of 5/);
  return root;
}

/** The text of each page, as PDF.js reads it. */
async function pageTexts(bytes: Buffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 }).promise;
  try {
    const out: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      out.push(content.items.map((i) => ("str" in i ? i.str : "")).join(" "));
    }
    return out;
  } finally {
    await doc.loadingTask.destroy();
  }
}

/** Distinct image XObjects on each page. */
async function pageImages(bytes: Buffer): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => {
    const xobjects = p.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    const refs = new Map((xobjects?.values() ?? []).map((v) => [v.toString(), v as PDFRef]));
    return [...refs.values()]
      .map((ref) => doc.context.lookup(ref))
      .filter((s) => s instanceof PDFRawStream && s.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")).length;
  });
}

/** Share of the overlay canvas's pixels that carry some paint. */
async function paintedShare(root: Locator): Promise<number> {
  return root.locator(".wm-preview__mark").evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) n++;
    return n / (c.width * c.height);
  });
}

test("/add-watermark-to-pdf/ writes a text watermark on a page range only", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/add-watermark-to-pdf/");

  await root.getByRole("textbox", { name: "Text", exact: true }).fill("COPIA PER MARIO");
  await root.locator(".wm-seg__option", { hasText: "Repeated" }).click();
  await root.getByLabel("Only some pages").check();
  await root.getByRole("textbox", { name: "Pages", exact: true }).fill("2-3, 5");
  // The preview follows the first chosen page and paints the tiled text over it.
  await expect(root.locator(".wm-preview__caption")).toHaveText("Preview of page 2 of 5");
  await expect.poll(() => paintedShare(root)).toBeGreaterThan(0.02);

  await root.getByRole("button", { name: "Add watermark" }).click();
  await expect(root.locator("p[role=status]")).toHaveText(/Done: watermark on 3 pages/);
  const pdf = await download(page, root.getByRole("button", { name: "Download five-pages-watermarked.pdf" }));
  expect(pdf.name).toBe("five-pages-watermarked.pdf");

  const texts = await pageTexts(pdf.bytes);
  expect(texts).toHaveLength(5);
  const marked = texts.map((t) => t.includes("COPIA PER MARIO"));
  expect(marked).toEqual([false, true, true, false, true]);
  // The pages' own text is still there.
  for (const [i, t] of texts.entries()) expect(t).toContain(`five-pages page ${i + 1}`);
  expect(await pageImages(pdf.bytes)).toEqual([0, 0, 0, 0, 0]);

  expect(offending).toEqual([]);
});

test("/add-watermark-to-pdf/ puts a logo on every page", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/add-watermark-to-pdf/");

  await root.locator(".wm-seg__option", { hasText: "Image" }).click();
  await root.locator(".wm-panel input[type=file]").setInputFiles(imageFixture("sample.png"));
  await expect(root.getByText(/sample\.png, \d+ × \d+ px/)).toBeVisible();
  await root.getByLabel("Position").selectOption("bottom-right");
  await expect.poll(() => paintedShare(root)).toBeGreaterThan(0.005);

  await root.getByRole("button", { name: "Add watermark" }).click();
  await expect(root.locator("p[role=status]")).toHaveText(/Done: watermark on 5 pages/);
  const pdf = await download(page, root.getByRole("button", { name: "Download five-pages-watermarked.pdf" }));
  expect(await pageImages(pdf.bytes)).toEqual([1, 1, 1, 1, 1]);
  const doc = await PDFDocument.load(pdf.bytes);
  expect(doc.getPageCount()).toBe(5);

  expect(offending).toEqual([]);
});

test("/add-watermark-to-pdf/ names characters the PDF fonts can't draw", async ({ page }) => {
  const root = await openTool(page, "/add-watermark-to-pdf/");
  const field = root.getByRole("textbox", { name: "Text", exact: true });
  await field.fill("Approvato ✓ 漢");
  const message = root.getByRole("alert").filter({ hasText: "can't draw these characters" });
  await expect(message).toBeVisible();
  await expect(message).toContainText("✓ 漢");
  await expect(field).toHaveAttribute("aria-invalid", "true");

  // Saving is refused, and nothing is offered for download.
  await root.getByRole("button", { name: "Add watermark" }).click();
  await expect(field).toBeFocused();
  await expect(root.getByRole("button", { name: /^Download / })).toBeHidden();

  // Accented Latin text is fine.
  await field.fill("Approvato è già così");
  await expect(message).toBeHidden();
});

test("/it/filigrana-pdf/ saves with the Italian file name", async ({ page }) => {
  const root = await (async () => {
    await page.goto("/it/filigrana-pdf/");
    const r = page.locator("[data-tool-root][data-mounted='true']");
    await expect(r).toBeVisible();
    await r.locator(".tool-drop input[type=file]").setInputFiles(pdfFixture("two-pages.pdf"));
    await expect(r.getByText(/two-pages\.pdf: 2 pagine/)).toBeVisible();
    return r;
  })();
  await expect(root.getByRole("textbox", { name: "Testo", exact: true })).toHaveValue("RISERVATO");
  await root.getByRole("button", { name: "Aggiungi la filigrana" }).click();
  const pdf = await download(page, root.getByRole("button", { name: "Scarica two-pages-filigrana.pdf" }));
  expect(pdf.name).toBe("two-pages-filigrana.pdf");
  expect((await pageTexts(pdf.bytes)).every((t) => t.includes("RISERVATO"))).toBe(true);
});
