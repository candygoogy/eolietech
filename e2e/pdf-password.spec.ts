import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/**
 * Protect PDF / Unlock PDF (qpdf in a worker). The protected output is checked with pdf-lib, which
 * refuses encrypted files by default, and then unlocked on /unlock-pdf/ with the same password.
 */
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/pdf/${name}`, import.meta.url));
const PASSWORD = "correct horse 7";

/** Nothing may go to another origin and nothing may be POSTed anywhere (same watcher as pdf-tools.spec.ts). */
function watchNetwork(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const offending: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol === "data:") return;
    const reqOrigin = url.protocol === "blob:" ? new URL(url.pathname).origin : url.origin;
    if (reqOrigin !== origin) offending.push(`cross-origin ${req.method()} ${req.url()}`);
    if (req.method() !== "GET" && req.method() !== "HEAD") offending.push(`${req.method()} ${req.url()}`);
    // The password must never end up in a URL.
    if (req.url().includes(encodeURIComponent(PASSWORD)) || req.url().includes(PASSWORD)) offending.push(`password in ${req.url()}`);
  });
  return offending;
}

async function bytesOf(download: Download): Promise<Buffer> {
  return readFile(await download.path());
}

/** The protected download, as a file the drop zone accepts (Playwright's download path has no extension). */
type Picked = { name: string; mimeType: string; buffer: Buffer };

async function protectFixture(page: Page): Promise<{ file: Picked; bytes: Buffer }> {
  await page.goto("/protect-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(fixture("three-pages.pdf"));
  await root.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await root.getByLabel("Confirm password").fill(PASSWORD);
  await root.getByRole("button", { name: "Protect", exact: true }).click();
  const downloadButton = root.getByRole("button", { name: "Download three-pages-protected.pdf" });
  await expect(downloadButton).toBeVisible({ timeout: 30_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  expect(download.suggestedFilename()).toBe("three-pages-protected.pdf");
  const bytes = await bytesOf(download);
  return { file: { name: download.suggestedFilename(), mimeType: "application/pdf", buffer: bytes }, bytes };
}

test.describe.configure({ timeout: 60_000 });

test("protect a PDF with a password, then unlock it with that password", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const { file, bytes } = await protectFixture(page);

  // Really encrypted: pdf-lib refuses it, and the AES-256 (V5) encryption dictionary is there.
  await expect(PDFDocument.load(bytes)).rejects.toThrow(/encrypted/i);
  expect(bytes.toString("latin1")).toMatch(/\/Filter\s*\/Standard/);
  expect(bytes.toString("latin1")).toMatch(/\/V\s*5/);
  expect(bytes.toString("latin1")).not.toContain(PASSWORD);

  await page.goto("/unlock-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(file);
  await root.getByLabel(/^Password/).fill(PASSWORD);
  await root.getByRole("button", { name: "Unlock", exact: true }).click();
  const downloadButton = root.getByRole("button", { name: "Download three-pages-protected-unlocked.pdf" });
  await expect(downloadButton).toBeVisible({ timeout: 30_000 });
  await expect(root.getByText("Password removed.")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  expect(download.suggestedFilename()).toBe("three-pages-protected-unlocked.pdf");
  const unlocked = await PDFDocument.load(await bytesOf(download));
  expect(unlocked.getPageCount()).toBe(3);

  expect(offending).toEqual([]);
});

test("unlock asks for the password, and says when it is wrong", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const { file } = await protectFixture(page);

  await page.goto("/unlock-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(file);
  const unlock = root.getByRole("button", { name: "Unlock", exact: true });
  await unlock.click();
  await expect(root.locator(".tool-item[data-state='error']")).toContainText("needs a password to open", { timeout: 30_000 });

  const field = root.getByLabel(/^Password/);
  await expect(field).toBeFocused();
  await field.fill("not the password");
  await unlock.click();
  await expect(root.locator(".tool-item[data-state='error']")).toContainText("The password does not open");
  await expect(root.getByRole("button", { name: /^Download / })).toHaveCount(0);

  expect(offending).toEqual([]);
});

test("protect checks the confirmation, and unlock says a plain PDF has no password", async ({ page }) => {
  await page.goto("/protect-pdf/");
  let root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(fixture("two-pages.pdf"));
  await root.getByLabel("Password", { exact: true }).fill("one");
  await root.getByLabel("Confirm password").fill("two");
  await root.getByRole("button", { name: "Protect", exact: true }).click();
  await expect(root.locator(".tool-error")).toContainText("do not match");
  await expect(root.getByLabel("Confirm password")).toHaveAttribute("aria-invalid", "true");
  // No password ever lands in an attribute.
  expect(await root.evaluate((el) => el.outerHTML)).not.toMatch(/"one"|"two"/);

  await page.goto("/unlock-pdf/");
  root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(fixture("two-pages.pdf"));
  await root.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(root.locator(".tool-item")).toContainText("has no password or restrictions", { timeout: 30_000 });
  await expect(root.getByRole("button", { name: /^Download / })).toHaveCount(0);
});
