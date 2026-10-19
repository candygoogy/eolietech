import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

/**
 * JPG to PDF (/jpg-to-pdf/ and variants): add images, reorder them from the keyboard, make one PDF
 * and check it with pdf-lib: page count, page order (JPG pages carry DCTDecode, PNG pages Flate),
 * page sizes, and a sideways phone photo (EXIF orientation 6) on an upright page.
 * Fixtures: e2e/fixtures/image/ (64 x 48).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heic: "image/heic" };
/** A fixture as an in-memory file (Playwright cannot mix paths and buffers in one setInputFiles). */
const file = async (name: string) => ({ name, mimeType: MIME[name.split(".").pop()!]!, buffer: await readFile(fixture(name)) });

// The first run in a fresh dev server compiles the codecs and the worker.
test.describe.configure({ timeout: 120_000 });

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
      const offOrigin = requests.filter((r) => {
        const url = new URL(r.url);
        if (url.protocol === "data:") return false;
        // blob: URLs carry their creator's origin ("blob:http://localhost:4341/<uuid>").
        return (url.protocol === "blob:" ? new URL(url.pathname).origin : url.origin) !== origin;
      });
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      expect(errors.filter((e) => !/favicon/i.test(e)), "console errors / CSP violations").toEqual([]);
    },
  };
}

/** sample.jpg with an EXIF block saying "rotate 90° clockwise to display" (orientation 6), as phones write it. */
async function sidewaysJpeg(): Promise<Buffer> {
  const jpg = await readFile(fixture("sample.jpg"));
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF header, IFD at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, // Orientation (SHORT) = 6
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]), payload]);
  let at = 2;
  if (jpg[2] === 0xff && jpg[3] === 0xe0) at = 4 + jpg.readUInt16BE(4);
  return Buffer.concat([jpg.subarray(0, at), app1, jpg.subarray(at)]);
}

async function openTool(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

async function createAndDownload(page: Page, button: string, download: RegExp) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const btn = page.getByRole("button", { name: download });
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  const doc = await PDFDocument.load(await readFile((await dl.path())!));
  return { name: dl.suggestedFilename(), doc };
}

/** The image filter on each page: "/DCTDecode" for an embedded JPG, "/FlateDecode" for PNG. */
function imageFilters(doc: PDFDocument): string[] {
  return doc.getPages().map((p) => {
    const xobjects = p.node.Resources()!.lookup(PDFName.of("XObject"), PDFDict);
    const [key] = xobjects.keys();
    const stream = xobjects.lookup(key!);
    if (!(stream instanceof PDFRawStream)) throw new Error("page has no image stream");
    return String(stream.dict.get(PDFName.of("Filter")));
  });
}

const sizes = (doc: PDFDocument) =>
  doc.getPages().map((p) => {
    const { width, height } = p.getSize();
    return [Math.round(width * 100) / 100, Math.round(height * 100) / 100];
  });

test("three images, reordered from the keyboard, become one upright PDF", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/jpg-to-pdf/");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([
    await file("sample.jpg"),
    await file("sample.png"),
    { name: "phone.jpg", mimeType: "image/jpeg", buffer: await sidewaysJpeg() },
  ]);
  const rows = page.locator(".tool-item");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1).locator(".tool-item__meta")).toHaveText(/^PNG · /);

  // Move the PNG to the top with its keyboard-reachable button; focus stays on the moved row.
  const up = page.getByRole("button", { name: "Move sample.png up" });
  await up.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "sample.png is now page 1 of 3." })).toBeVisible();
  await expect(rows.nth(0).locator(".tool-item__name")).toHaveText("sample.png");
  await expect(page.getByRole("button", { name: "Move sample.png down" })).toBeFocused();

  const { name, doc } = await createAndDownload(page, "Create PDF", /^Download PDF \(3 pages, /);
  expect(name).toBe("images.pdf");
  expect(doc.getPageCount()).toBe(3);
  expect(imageFilters(doc)).toEqual(["/FlateDecode", "/DCTDecode", "/DCTDecode"]);
  // Fit to image: one pixel per point; the sideways photo gets a portrait page.
  expect(sizes(doc)).toEqual([
    [64, 48],
    [64, 48],
    [48, 64],
  ]);
  w.assertPrivate();
});

test("A4 with a margin: pages follow each image's orientation", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/jpg-to-pdf/");
  const margin = page.getByLabel("Margin");
  await expect(margin).toBeDisabled();
  await page.getByLabel("Page size").selectOption("a4");
  await expect(margin).toBeEnabled();
  await margin.selectOption("small");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([
    await file("sample.jpg"),
    { name: "phone.jpg", mimeType: "image/jpeg", buffer: await sidewaysJpeg() },
  ]);
  await expect(page.locator(".tool-item")).toHaveCount(2);
  const { doc } = await createAndDownload(page, "Create PDF", /^Download PDF \(2 pages, /);
  expect(sizes(doc)).toEqual([
    [841.89, 595.28],
    [595.28, 841.89],
  ]);
  w.assertPrivate();
});

test("Italian page: WebP, AVIF and HEIC go into one PDF", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/it/jpg-in-pdf/");
  await expect(page.locator(".tool-drop__label")).toHaveText("Scegli le immagini o trascinale qui");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([fixture("sample.webp"), fixture("sample.avif"), fixture("sample.heic")]);
  await expect(page.locator(".tool-item")).toHaveCount(3);
  const { name, doc } = await createAndDownload(page, "Crea PDF", /^Scarica il PDF \(3 pagine, /);
  expect(name).toBe("immagini.pdf");
  expect(doc.getPageCount()).toBe(3);
  // Lossy WebP with transparency -> PNG; opaque AVIF and HEIC photos -> JPG.
  expect(imageFilters(doc)).toEqual(["/FlateDecode", "/DCTDecode", "/DCTDecode"]);
  expect(sizes(doc)).toEqual([
    [64, 48],
    [64, 48],
    [64, 48],
  ]);
  w.assertPrivate();
});

test("one image keeps its name; an unreadable file is flagged and left out", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/png-to-pdf/");
  await expect(page.locator(".tool-drop__label")).toHaveText("Choose PNG images or drop them here");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([
    { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not really a png") },
    await file("sample.png"),
  ]);
  await expect(page.locator(".tool-item[data-state='error']")).toContainText("broken.png could not be read as an image");
  const { name, doc } = await createAndDownload(page, "Create PDF", /^Download PDF \(1 page, /);
  expect(name).toBe("sample.pdf");
  expect(doc.getPageCount()).toBe(1);
  w.assertPrivate();
});

test("a photo's camera, date and location stay out of the PDF", async ({ page }) => {
  await openTool(page, "/jpg-to-pdf/");
  await page.locator('.tool-drop input[type="file"]').setInputFiles([fixture("exif-gps.jpg")]);
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  const btn = page.getByRole("button", { name: /^Download PDF/ });
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  const pdf = (await readFile((await dl.path())!)).toString("latin1");
  for (const leak of ["Pixel 7", "2024:07:14", "ns.adobe.com/xap"]) expect(pdf).not.toContain(leak);
  expect((await PDFDocument.load(Buffer.from(pdf, "latin1"))).getPageCount()).toBe(1);
});

for (const [url, label] of [
  ["/heic-to-pdf/", "Choose photos or drop them here"],
  ["/it/png-in-pdf/", "Scegli le immagini PNG o trascinale qui"],
  ["/it/heic-in-pdf/", "Scegli le foto o trascinale qui"],
] as const) {
  test(`variant page ${url} mounts with its own label`, async ({ page }) => {
    await openTool(page, url);
    await expect(page.locator(".tool-drop__label")).toHaveText(label);
  });
}
