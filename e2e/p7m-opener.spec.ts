import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * P7M opener: unwrap signed .p7m files, list the signers and the signature check, download the
 * document byte for byte, and prove nothing left the origin. Fixtures: e2e/fixtures/document/*.p7m
 * and e2e/fixtures/document/p7m/ (copies of src/tools/signed-shared/fixtures, made by its make.sh:
 * a throwaway CA, signers "Mario Rossi" (RSA) and "Giulia Bianchi" (ECDSA)).
 */
const E2E = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(E2E, "fixtures", name);
const PAYLOAD_PDF = fixture("pdf/two-pages.pdf");

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

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

const upload = (page: Page, names: string[]) =>
  page.locator('.tool-drop input[type="file"]').setInputFiles(names.map(fixture));

const status = (page: Page) => page.locator(".tool-note[role=status]");

test("/open-p7m-file/ opens a signed PDF, shows the signer and downloads the original bytes", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/open-p7m-file/");
  // Only the drop well until files arrive.
  await expect(page.locator(".p7m-note")).toBeHidden();
  await upload(page, ["document/sample.pdf.p7m"]);
  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "done");
  await expect(row).toHaveAttribute("data-check", "valid");
  await expect(row.locator(".tool-item__name")).toHaveText("sample.pdf");
  await expect(row).toContainText("PDF document");
  await expect(row.locator(".p7m-signer__name")).toHaveText("Mario Rossi");
  await expect(row).toContainText("Tax code: RSSMRA80A01H501U");
  await expect(row).toContainText("Organization: Example CA");
  await expect(row).toContainText("Certificate issued by: Example Trust CA 3, Example Trust Services S.p.A., IT");
  await expect(row).toContainText(/Certificate valid from \w+ \d+, \d{4} to \w+ \d+, \d{4}/);
  await expect(row.locator(".p7m-check")).toHaveText(/^Signature intact: the document hasn't changed/);
  await expect(status(page)).toHaveText("1 document extracted. The signature is intact.");
  await expect(page.locator(".p7m-note")).toBeVisible();
  await expect(page.locator(".p7m-note a")).toHaveAttribute("href", "https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica");
  await expect(page.getByRole("button", { name: "Download all (.zip)" })).toBeHidden();

  const openLink = row.getByRole("link", { name: "Open sample.pdf in a new tab" });
  await expect(openLink).toHaveAttribute("href", /^blob:/);
  await expect(openLink).toHaveAttribute("target", "_blank");
  await expect(openLink).toHaveAttribute("rel", /noopener/);

  const out = await download(page, row.getByRole("button", { name: "Download sample.pdf" }));
  expect(out.name).toBe("sample.pdf");
  expect(out.bytes.equals(await readFile(PAYLOAD_PDF))).toBe(true);
  w.assertPrivate();
});

test("/open-p7m-file/ flags tampering, detached signatures and plain files, and zips the rest", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/open-p7m-file/");
  await upload(page, [
    "document/IT01234567890_00001.xml.p7m",
    "document/p7m/tampered.xml.p7m",
    "document/p7m/detached.xml.p7m",
    "pdf/two-pages.pdf",
    "document/p7m/double.pdf.p7m.p7m",
    "document/p7m/rsa-nocerts.xml.p7m",
  ]);
  const rows = page.locator(".tool-item");
  await expect(rows).toHaveCount(6);
  await expect(status(page)).toHaveText(
    "4 documents extracted. 1 has a signature that doesn't match. 1 could not be checked. 2 could not be opened.",
  );

  const invoice = rows.nth(0);
  await expect(invoice).toHaveAttribute("data-check", "valid");
  await expect(invoice).toContainText("XML file");
  await expect(invoice.getByRole("link", { name: "e-invoice viewer" })).toHaveAttribute("href", "/fatturapa-viewer/");
  await expect(invoice.getByRole("link", { name: /^Open/ })).toHaveCount(0);

  const tampered = rows.nth(1);
  await expect(tampered).toHaveAttribute("data-check", "invalid");
  await expect(tampered.locator(".p7m-check")).toHaveText("Doesn't match: the document was changed after it was signed.");

  await expect(rows.nth(2)).toHaveAttribute("data-state", "error");
  await expect(rows.nth(2)).toContainText("detached.xml.p7m: it holds only the signature, not the document.");
  await expect(rows.nth(3)).toHaveAttribute("data-state", "error");
  await expect(rows.nth(3)).toContainText("two-pages.pdf: this isn't a signed .p7m file.");

  const double = rows.nth(4);
  await expect(double.locator(".tool-item__name")).toHaveText("double.pdf");
  await expect(double.locator(".p7m-layer")).toHaveText(["Envelope 1 of 2 (the outer one, signed last)", "Envelope 2 of 2 (the one holding the document)"]);
  await expect(double.locator(".p7m-signer__name")).toHaveText(["Mario Rossi", "Giulia Bianchi"]);
  await expect(double).toHaveAttribute("data-check", "valid");

  const nocerts = rows.nth(5);
  await expect(nocerts).toHaveAttribute("data-check", "unsupported");
  await expect(nocerts.locator(".p7m-check")).toHaveText(/^Not checked: the file doesn't include the signer's certificate/);
  await expect(nocerts).not.toContainText("Certificate valid");

  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("documents-from-p7m.zip");
  expect(isZip(zip.bytes)).toBe(true);

  // Removing a row keeps focus inside the list.
  await rows.nth(2).getByRole("button", { name: "Remove detached.xml.p7m from the list" }).click();
  await expect(rows).toHaveCount(5);
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", "Remove two-pages.pdf from the list");
  w.assertPrivate();
});

test("/it/aprire-file-p7m/ works in Italian at 360px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/aprire-file-p7m/");
  await expect(page.locator("h1")).toHaveText("Aprire file P7M");
  await upload(page, ["document/sample.pdf.p7m", "document/IT01234567890_00001.xml.p7m"]);
  const rows = page.locator(".tool-item");
  await expect(rows.nth(0)).toContainText("Codice fiscale: RSSMRA80A01H501U");
  await expect(rows.nth(0)).toContainText(/Certificato valido (dal |dall')\d+°? \w+ \d{4} (al |all')\d+°? \w+ \d{4}/);
  await expect(rows.nth(0)).toContainText(/Firmato (il |l')\d/);
  await expect(rows.nth(0).locator(".p7m-check")).toHaveText(/^Firma integra/);
  await expect(rows.nth(1).getByRole("link", { name: "visualizzatore di fatture elettroniche" })).toHaveAttribute(
    "href",
    "/it/visualizzare-fattura-elettronica/",
  );
  await expect(status(page)).toHaveText("Documenti estratti: 2. Tutte le 2 firme sono integre.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});

test("/p7m-to-pdf/ leads with Download PDF and points e-invoices to the PDF maker", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/p7m-to-pdf/");
  await expect(page.locator("h1")).toHaveText("P7M to PDF");
  await upload(page, ["document/sample.pdf.p7m", "document/IT01234567890_00001.xml.p7m"]);
  const rows = page.locator(".tool-item");
  const pdf = rows.nth(0).getByRole("button", { name: "Download PDF sample.pdf" });
  await expect(pdf).toHaveText("Download PDF");
  await expect(pdf).toHaveClass(/btn--primary/);
  await expect(rows.nth(1).getByRole("link", { name: "FatturaPA to PDF" })).toHaveAttribute("href", "/fatturapa-to-pdf/");
  const out = await download(page, pdf);
  expect(out.bytes.equals(await readFile(PAYLOAD_PDF))).toBe(true);
  w.assertPrivate();
});

test("/it/p7m-in-pdf/ loads in Italian", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/it/p7m-in-pdf/");
  await expect(page.locator("h1")).toHaveText("Da P7M a PDF");
  await upload(page, ["document/sample.pdf.p7m"]);
  await expect(page.locator(".tool-item").first().getByRole("button", { name: "Scarica il PDF sample.pdf" })).toBeVisible();
  w.assertPrivate();
});
