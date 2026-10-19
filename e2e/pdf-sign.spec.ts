import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib";

/**
 * Sign PDF: draw or upload a signature, place it (and the date) on a page, save, and check the result
 * with pdf-lib: same pages, images only where they were placed. Nothing may leave the origin.
 * Fixtures: e2e/fixtures/pdf/two-pages.pdf, e2e/fixtures/pdf/sign/signature-photo.png (blue ink on off-white paper).
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
  return { name: dl.suggestedFilename(), bytes: await readFile(await dl.path()) };
}

async function openTool(page: Page, path: string) {
  await page.goto(path);
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await expect(root).toBeVisible();
  await root.locator(".tool-drop input[type=file]").setInputFiles(fixture("two-pages.pdf"));
  await expect(root.locator(".sign-sheet canvas")).toBeVisible();
  return root;
}

/** A signature-like zigzag drawn with the mouse across the pad. */
async function drawSignature(page: Page, root: Locator) {
  const pad = root.locator(".sign-pad__canvas");
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.6);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(box.x + box.width * (0.15 + i * 0.028), box.y + box.height * (i % 2 ? 0.35 : 0.65), { steps: 3 });
  }
  await page.mouse.up();
}

/** Click the displayed page at a fraction of its width and height. */
async function clickPage(root: Locator, fx: number, fy: number) {
  const layer = root.locator(".sign-layer");
  const box = (await layer.boundingBox())!;
  await layer.click({ position: { x: box.width * fx, y: box.height * fy } });
}

/** Distinct image XObjects on a page (0-based). */
async function pageImages(bytes: Buffer, index: number) {
  const doc = await PDFDocument.load(bytes);
  const xobjects = doc.getPage(index).node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  const refs = new Map((xobjects?.values() ?? []).map((v) => [v.toString(), v as PDFRef]));
  const images = [...refs.values()]
    .map((ref) => doc.context.lookup(ref))
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream && s.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"));
  return { pages: doc.getPageCount(), images };
}

test("/sign-pdf/ draws a signature, places it and the date on page 2, and saves", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/sign-pdf/");
  await expect(root.getByText(/two-pages\.pdf: 2 pages/)).toBeVisible();

  await drawSignature(page, root);
  await expect(root.getByRole("button", { name: "Undo stroke" })).toBeEnabled();

  await root.locator(".sign-nav__select").selectOption({ index: 1 });
  await expect(root.locator(".sign-nav__select")).toHaveValue("1");
  await clickPage(root, 0.5, 0.8);
  const sig = root.locator(".sign-box[data-kind=sig]");
  await expect(sig).toHaveCount(1);
  await expect(sig).toBeFocused();

  // Keyboard: Shift+Right moves it 10 points, Alt+Right makes it 1 point wider.
  const before = await sig.evaluate((el) => [el.style.left, el.style.width]);
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Alt+ArrowRight");
  const after = await sig.evaluate((el) => [el.style.left, el.style.width]);
  expect(parseFloat(after[0]!)).toBeGreaterThan(parseFloat(before[0]!));
  expect(parseFloat(after[1]!)).toBeGreaterThan(parseFloat(before[1]!));

  await root.locator(".sign-seg__option", { hasText: "Date" }).click();
  await clickPage(root, 0.5, 0.6);
  await expect(root.locator(".sign-box[data-kind=date]")).toHaveCount(1);
  await expect(root.locator(".sign-nav__select option").nth(1)).toHaveText("Page 2 of 2, 2 items placed");

  await root.getByRole("button", { name: "Save signed PDF" }).click();
  await expect(root.getByRole("status")).toHaveText(/Done: signed on 1 page/);
  const pdf = await download(page, root.getByRole("button", { name: "Download two-pages-signed.pdf" }));
  expect(pdf.name).toBe("two-pages-signed.pdf");
  expect((await pageImages(pdf.bytes, 0)).images).toHaveLength(0);
  const second = await pageImages(pdf.bytes, 1);
  expect(second.pages).toBe(2);
  // The signature and the date: two images, each with a transparency mask.
  expect(second.images).toHaveLength(2);
  for (const img of second.images) expect(img.dict.get(PDFName.of("SMask"))).toBeTruthy();

  expect(offending).toEqual([]);
});

test("/sign-pdf/ uses a photo of a signature, placed and removed with the keyboard", async ({ page }) => {
  const root = await openTool(page, "/sign-pdf/");
  await root.locator(".sign-seg__option", { hasText: "Use a photo" }).click();
  await root.locator(".sign-mode input[type=file]").setInputFiles(fixture("sign/signature-photo.png"));
  await expect(root.getByRole("img", { name: "Your signature with the paper removed" })).toBeVisible();
  await expect(root.getByLabel("Remove the paper")).toBeVisible();

  // The paper is gone: the preview's corner pixel is transparent and the ink kept its blue.
  const pixels = await root.locator(".sign-photo__preview").evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext("2d")!;
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let blue = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]! > 200 && d[i + 2]! > d[i]! + 40) blue++;
    return { corner: d[3], blue, width: c.width, height: c.height };
  });
  expect(pixels.corner).toBe(0);
  expect(pixels.blue).toBeGreaterThan(100);
  // Cropped to the ink, not the whole 360 x 140 photo.
  expect(pixels.width).toBeLessThan(300);

  const add = root.getByRole("button", { name: "Add signature to this page" });
  await add.click();
  const sig = root.locator(".sign-box[data-kind=sig]");
  await expect(sig).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(sig).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await expect(sig).toHaveCount(1);

  await root.getByRole("button", { name: "Save signed PDF" }).click();
  const pdf = await download(page, root.getByRole("button", { name: "Download two-pages-signed.pdf" }));
  const first = await pageImages(pdf.bytes, 0);
  expect(first.pages).toBe(2);
  expect(first.images).toHaveLength(1);
  expect((await pageImages(pdf.bytes, 1)).images).toHaveLength(0);
});

test("/it/firmare-pdf/ works in Italian", async ({ page }) => {
  const root = await openTool(page, "/it/firmare-pdf/");
  await expect(root.getByText(/two-pages\.pdf: 2 pagine/)).toBeVisible();
  await expect(root.getByRole("heading", { name: "La tua firma" })).toBeVisible();

  // No signature yet: clicking the page explains what to do first.
  await clickPage(root, 0.5, 0.5);
  await expect(root.getByRole("alert")).toHaveText(/Prima disegna la tua firma/);

  await drawSignature(page, root);
  await clickPage(root, 0.5, 0.5);
  await expect(root.locator(".sign-box")).toHaveCount(1);
  await root.getByRole("button", { name: "Salva il PDF firmato" }).click();
  const pdf = await download(page, root.getByRole("button", { name: "Scarica two-pages-firmato.pdf" }));
  expect(pdf.name).toBe("two-pages-firmato.pdf");
});
