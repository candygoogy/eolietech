import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Italian e-invoice viewer: read FatturaPA XML (and a signed .xml.p7m), show a row per invoice, open
 * the readable view, download the PDF copy, and prove nothing left the origin. Fixtures:
 * e2e/fixtures/document/fattura/*.xml (synthetic, copies of src/tools/fattura-viewer/fixtures/) and
 * e2e/fixtures/document/IT01234567890_00001.xml.p7m (signed by the throwaway "Mario Rossi" test cert).
 */
const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "document");
const fattura = (name: string) => path.join(DOCS, "fattura", name);

const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-";
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
      const offOrigin = requests.filter((r) => !/^(data|blob):/.test(r.url) && new URL(r.url).origin !== origin);
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      // Firefox logs "XML Parsing Error" itself whenever DOMParser meets malformed XML (the broken fixture).
      expect(errors.filter((e) => !/favicon|XML Parsing Error/i.test(e)), "console errors / CSP violations").toEqual([]);
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

const upload = (page: Page, files: string[]) => page.locator('.tool-drop input[type="file"]').setInputFiles(files);
const status = (page: Page) => page.locator(".tool > .tool-note[role=status]");

test("/fatturapa-viewer/ shows an invoice, opens it and saves its PDF and attachment", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/fatturapa-viewer/");
  // Only the drop well before a file is added.
  await expect(page.locator(".tool-list")).toBeEmpty();
  await expect(page.locator(".tool > .tool-actions")).toBeHidden();

  await upload(page, [fattura("IT01234567890_00002.xml")]);
  const row = page.locator(".tool-item").first();
  await expect(row.locator(".tool-item__name")).toHaveText("Studio Tecnico Esempio S.r.l.");
  await expect(row.locator(".tool-item__meta")).toHaveText("Invoice no. 2026/118 · Oct 15, 2026 · €1,841.76");
  await expect(status(page)).toHaveText("1 invoice read.");

  const view = row.getByRole("button", { name: "View the invoice from Studio Tecnico Esempio S.r.l." });
  await expect(view).toHaveAttribute("aria-expanded", "false");
  await view.click();
  const sheet = row.locator(".fv-invoice");
  await expect(sheet.getByRole("heading", { level: 2 })).toHaveText("Invoice no. 2026/118");
  await expect(sheet).toContainText("Bottega di Prova S.n.c.");
  await expect(sheet).toContainText("Withholding");
  await expect(sheet).toContainText("Bank transfer (MP05)");
  await expect(sheet.locator(".fv-table").first().locator("tbody tr")).toHaveCount(4);
  await expect(sheet.locator(".fv-table").first()).toContainText("Sopralluogo in cantiere");
  await expect(row.getByRole("button", { name: /Close the invoice/ })).toBeFocused();

  const pdf = await download(page, row.getByRole("button", { name: "Download IT01234567890_00002.pdf" }));
  expect(pdf.name).toBe("IT01234567890_00002.pdf");
  expect(isPdf(pdf.bytes)).toBe(true);

  const att = await download(page, sheet.getByRole("button", { name: "Download the attachment relazione-tecnica.pdf" }));
  expect(att.name).toBe("relazione-tecnica.pdf");
  expect(isPdf(att.bytes)).toBe(true);
  w.assertPrivate();
});

test("/fatturapa-viewer/ reads a signed .p7m, several bodies and other formats, and flags broken XML", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/fatturapa-viewer/");
  await upload(page, [
    path.join(DOCS, "IT01234567890_00001.xml.p7m"),
    fattura("IT01234567890_00007.xml"),
    fattura("IT01234567890_00006.xml"),
    fattura("broken.xml"),
  ]);
  await expect(status(page)).toHaveText("4 invoices read. 1 file could not be read.");
  const rows = page.locator(".tool-item");
  await expect(rows).toHaveCount(5);

  const signed = rows.nth(0);
  await expect(signed.locator(".tool-item__name")).toHaveText("Esempio Società S.r.l.");
  await expect(signed.locator(".fv-signature")).toContainText("Signed by Mario Rossi on");
  await expect(signed.locator(".fv-signature")).toContainText("The signature matches");
  await expect(signed.getByRole("link", { name: "Signature details" })).toHaveAttribute("href", "/open-p7m-file/");

  await expect(rows.nth(1)).toContainText("IT01234567890_00007.xml, invoice 1 of 2");
  await expect(rows.nth(2).locator(".tool-item__meta")).toHaveText("Credit note no. 102 · Oct 12, 2026 · €61.00");
  await expect(rows.nth(3).locator(".tool-item__meta")).toHaveText("Simplified invoice no. S-12 · Oct 5, 2026 · €30.50");

  const broken = rows.nth(4);
  await expect(broken).toHaveAttribute("data-state", "error");
  await expect(broken).toContainText("broken.xml: this is not a readable XML file.");

  const zip = await download(page, page.getByRole("button", { name: "Download all PDFs (.zip)" }));
  expect(zip.name).toBe("invoices-pdf.zip");
  expect(isZip(zip.bytes)).toBe(true);
  for (const name of ["IT01234567890_00001.pdf", "IT01234567890_00007-1.pdf", "IT01234567890_00007-2.pdf", "IT01234567890_00006.pdf"]) {
    expect(zip.bytes.includes(name), name).toBe(true);
  }
  w.assertPrivate();
});

test("/it/visualizzare-fattura-elettronica/ works in Italian at 375px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, "/it/visualizzare-fattura-elettronica/");
  await expect(page.locator("h1")).toHaveText("Visualizzare fatture elettroniche");
  await upload(page, [fattura("IT01234567890_00003.xml")]);
  const row = page.locator(".tool-item").first();
  await expect(row.locator(".tool-item__name")).toHaveText("Niccolò Esempio");
  await expect(row.locator(".tool-item__meta")).toHaveText("Fattura n. 7 · 02/10/2026 · 150,00 €");
  await expect(status(page)).toHaveText("Fatture lette: 1.");
  await row.getByRole("button", { name: "Visualizza la fattura di Niccolò Esempio" }).click();
  const sheet = row.locator(".fv-invoice");
  await expect(sheet).toContainText("Fornitore (cedente/prestatore)");
  await expect(sheet).toContainText("Regime forfettario (RF19)");
  await expect(sheet).toContainText("Non soggette, altri casi (N2.2)");
  await expect(sheet).toContainText("perché è più facile");
  await expect(sheet.getByRole("heading", { name: "Riepilogo IVA" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  const pdf = await download(page, row.getByRole("button", { name: "Scarica IT01234567890_00003.pdf" }));
  expect(isPdf(pdf.bytes)).toBe(true);
  w.assertPrivate();
});

test("the PDF variants load and lead with the PDF button", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/fatturapa-to-pdf/");
  await expect(page.locator("h1")).toHaveText("FatturaPA to PDF");
  await upload(page, [fattura("IT01234567890_00005.xml")]);
  const row = page.locator(".tool-item").first();
  await expect(row.locator(".tool-item__name")).toHaveText("Verde Esempio Soc. Coop.");
  const pdfBtn = row.getByRole("button", { name: "Download IT01234567890_00005.pdf" });
  await expect(pdfBtn).toHaveClass(/btn--primary/);
  const pdf = await download(page, pdfBtn);
  expect(isPdf(pdf.bytes)).toBe(true);

  await open(page, "/it/fattura-elettronica-in-pdf/");
  await expect(page.locator("h1")).toHaveText("Fattura elettronica in PDF");
  w.assertPrivate();
});
