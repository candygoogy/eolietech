import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/**
 * Add page numbers: number a fixture, then read the result back with PDF.js (text) and pdf-lib (page
 * count). Nothing may leave the origin. Fixture: e2e/fixtures/pdf/five-pages.pdf ("five-pages page N").
 */
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/pdf/${name}`, import.meta.url));

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
  await root.locator(".tool-drop input[type=file]").setInputFiles(fixture("five-pages.pdf"));
  await expect(root.locator(".pn-sheet canvas")).toBeVisible();
  return root;
}

test("/add-page-numbers-to-pdf/ numbers every page as “Page N of 5”", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/add-page-numbers-to-pdf/");
  await expect(root.getByText(/five-pages\.pdf: 5 pages/)).toBeVisible();
  // Bottom centre is the default position.
  await expect(root.getByRole("radio", { name: "Bottom centre" })).toBeChecked();

  await root.getByLabel("Format").selectOption("words");
  await expect(root.locator(".pn-label")).toHaveText("Page 1 of 5");
  await expect(root.locator(".pn-preview figcaption")).toHaveText("Page 1 will read “Page 1 of 5”");

  await root.getByRole("button", { name: "Add page numbers" }).click();
  const out = await download(page, root.getByRole("button", { name: "Download five-pages-numbered.pdf" }));
  expect(out.name).toBe("five-pages-numbered.pdf");

  expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(5);
  const texts = await pageTexts(out.bytes);
  expect(texts).toHaveLength(5);
  for (const [i, text] of texts.entries()) {
    expect(text).toContain(`five-pages page ${i + 1}`);
    expect(text).toContain(`Page ${i + 1} of 5`);
  }

  expect(offending).toEqual([]);
});

test("/add-page-numbers-to-pdf/ skips the cover and moves the preview to page 2", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/add-page-numbers-to-pdf/");

  await root.getByRole("radio", { name: "Top right" }).check({ force: true });
  await root.getByLabel("Format").selectOption("slash");
  await root.getByLabel("First page to number").fill("2");
  await expect(root.locator(".pn-label")).toHaveText("1 / 4");
  await expect(root.locator(".pn-preview figcaption")).toHaveText("Page 2 will read “1 / 4”");

  // A page outside the document is refused, with the field marked.
  await root.getByLabel("First page to number").fill("9");
  await root.getByRole("button", { name: "Add page numbers" }).click();
  await expect(root.getByText("First page to number must be a page of this PDF, from 1 to 5.")).toBeVisible();
  await expect(root.getByLabel("First page to number")).toHaveAttribute("aria-invalid", "true");
  await root.getByLabel("First page to number").fill("2");

  await root.getByRole("button", { name: "Add page numbers" }).click();
  const out = await download(page, root.getByRole("button", { name: "Download five-pages-numbered.pdf" }));
  const texts = await pageTexts(out.bytes);
  expect(texts).toHaveLength(5);
  expect(texts[0]).toBe("five-pages page 1");
  for (let i = 1; i < 5; i++) expect(texts[i]).toContain(`${i} / 4`);

  expect(offending).toEqual([]);
});

test("/it/numerare-pagine-pdf/ writes the numbers in Italian", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/it/numerare-pagine-pdf/");
  await root.getByLabel("Formato").selectOption("words");
  await root.getByLabel("Inizia a contare da").fill("3");
  await expect(root.locator(".pn-label")).toHaveText("Pagina 3 di 7");

  await root.getByRole("button", { name: "Aggiungi i numeri di pagina" }).click();
  const out = await download(page, root.getByRole("button", { name: "Scarica five-pages-numerato.pdf" }));
  expect(out.name).toBe("five-pages-numerato.pdf");
  const texts = await pageTexts(out.bytes);
  expect(texts[0]).toContain("Pagina 3 di 7");
  expect(texts[4]).toContain("Pagina 7 di 7");

  expect(offending).toEqual([]);
});

test("/add-page-numbers-to-pdf/ points a password-protected PDF to Unlock PDF", async ({ page }) => {
  await page.goto("/add-page-numbers-to-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await expect(root).toBeVisible();
  // A minimal PDF whose trailer declares an /Encrypt dictionary.
  const encrypted = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n3 0 obj<</Filter/Standard/V 1/R 2/O(x)/U(x)/P -4>>endobj\ntrailer<</Root 1 0 R/Encrypt 3 0 R>>\n%%EOF",
  );
  await root.locator(".tool-drop input[type=file]").setInputFiles({ name: "locked.pdf", mimeType: "application/pdf", buffer: encrypted });
  await expect(root.getByRole("alert")).toContainText("locked.pdf is password-protected or encrypted. Remove the password with Unlock PDF");
});
