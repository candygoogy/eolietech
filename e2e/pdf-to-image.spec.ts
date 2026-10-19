import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/**
 * PDF to JPG / PNG: render pages in the browser, save one image directly or several as a .zip,
 * and prove nothing left the origin. Fixture: e2e/fixtures/pdf/five-pages.pdf (300 x 400 pt pages).
 */
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/pdf/${name}`, import.meta.url));

const isJpg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

/** Width and height from a PNG's IHDR chunk. */
const pngSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

/** Entry names and stored bytes from a .zip (client-zip stores entries uncompressed). */
function unzip(b: Buffer): { name: string; data: Buffer }[] {
  const eocd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(eocd, "end of central directory").toBeGreaterThanOrEqual(0);
  let count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  // ZIP64: client-zip may write 0xffffffff here and the real offset in the ZIP64 record.
  if (p === 0xffffffff || count === 0xffff) {
    const z64 = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x06]));
    count = Number(b.readBigUInt64LE(z64 + 32));
    p = Number(b.readBigUInt64LE(z64 + 48));
  }
  const out: { name: string; data: Buffer }[] = [];
  for (let i = 0; i < count; i++) {
    expect(b.readUInt32LE(p)).toBe(0x02014b50);
    const method = b.readUInt16LE(p + 10);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    let size = b.readUInt32LE(p + 20);
    let local = b.readUInt32LE(p + 42);
    const name = b.toString("utf8", p + 46, p + 46 + nameLen);
    // ZIP64 extra field (id 0x0001) holds sizes/offset that did not fit.
    for (let e = p + 46 + nameLen; e < p + 46 + nameLen + extraLen; ) {
      const id = b.readUInt16LE(e);
      const len = b.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let f = e + 4;
        if (b.readUInt32LE(p + 24) === 0xffffffff) f += 8;
        if (size === 0xffffffff) {
          size = Number(b.readBigUInt64LE(f));
          f += 8;
        }
        if (local === 0xffffffff) local = Number(b.readBigUInt64LE(f));
      }
      e += 4 + len;
    }
    expect(method, `${name} is stored`).toBe(0);
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    out.push({ name, data: b.subarray(start, start + size) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

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
  await root.locator("input[type=file]").setInputFiles(fixture("five-pages.pdf"));
  return root;
}

test("/pdf-to-jpg/ turns every page into a JPG and zips them", async ({ page, baseURL }) => {
  const offending = watchNetwork(page, baseURL!);
  const root = await openTool(page, "/pdf-to-jpg/");
  await expect(root.getByText(/five-pages\.pdf: 5 pages/)).toBeVisible();
  await expect(root.getByLabel("Format")).toHaveValue("jpg");
  await expect(root.getByLabel("Resolution")).toHaveValue("150");

  await root.getByRole("button", { name: "Convert to images" }).click();
  await expect(root.getByRole("status")).toHaveText(/Done: 5 images/);

  const zip = await download(page, root.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("five-pages-jpg.zip");
  const entries = unzip(zip.bytes);
  expect(entries.map((e) => e.name)).toEqual([1, 2, 3, 4, 5].map((n) => `five-pages-page-0${n}.jpg`));
  for (const e of entries) expect(isJpg(e.data), e.name).toBe(true);

  expect(offending).toEqual([]);
});

test("/pdf-to-jpg/ saves a one-page range as a single image and rejects a bad range", async ({ page }) => {
  const root = await openTool(page, "/pdf-to-jpg/");
  await root.getByLabel("Only these pages").check();
  const pages = root.getByLabel("Pages", { exact: true });

  await pages.fill("9");
  await root.getByRole("button", { name: "Convert to images" }).click();
  await expect(root.getByRole("alert")).toHaveText("“9” is outside the document, which has 5 pages.");

  await pages.fill("3");
  await root.getByRole("button", { name: "Convert to images" }).click();
  const img = await download(page, root.getByRole("button", { name: "Download five-pages-page-03.jpg" }));
  expect(img.name).toBe("five-pages-page-03.jpg");
  expect(isJpg(img.bytes)).toBe(true);
});

test("/pdf-to-png/ starts with PNG and renders at the chosen dpi", async ({ page }) => {
  const root = await openTool(page, "/pdf-to-png/");
  await expect(root.getByLabel("Format")).toHaveValue("png");
  await root.getByLabel("Resolution").selectOption("72");
  await root.getByLabel("Only these pages").check();
  await root.getByLabel("Pages", { exact: true }).fill("5");
  await root.getByRole("button", { name: "Convert to images" }).click();

  const img = await download(page, root.getByRole("button", { name: "Download five-pages-page-05.png" }));
  expect(isPng(img.bytes)).toBe(true);
  // 300 x 400 pt at 72 dpi.
  expect(pngSize(img.bytes)).toEqual({ width: 300, height: 400 });
});

test("/it/pdf-in-jpg/ works in Italian", async ({ page }) => {
  const root = await openTool(page, "/it/pdf-in-jpg/");
  await expect(root.getByText(/five-pages\.pdf: 5 pagine/)).toBeVisible();
  await root.getByLabel("Solo queste pagine").check();
  await root.getByLabel("Pagine", { exact: true }).fill("1-2");
  await root.getByRole("button", { name: "Converti in immagini" }).click();
  await expect(root.getByRole("status")).toHaveText(/Fatto: 2 immagini/);
  const zip = await download(page, root.getByRole("button", { name: /\.zip/ }));
  expect(unzip(zip.bytes).map((e) => e.name)).toEqual(["five-pages-pagina-01.jpg", "five-pages-pagina-02.jpg"]);
});

test("/it/pdf-in-png/ loads with PNG selected", async ({ page }) => {
  const root = await openTool(page, "/it/pdf-in-png/");
  await expect(root.getByLabel("Formato")).toHaveValue("png");
});

test("/pdf-to-jpg/ explains a file that is not a PDF", async ({ page }) => {
  await page.goto("/pdf-to-jpg/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles({ name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") });
  await expect(root.getByRole("alert")).toHaveText(/fake\.pdf could not be read as a PDF/);
});

test("/pdf-to-jpg/ caps a poster-sized page and says so; Start over clears the file", async ({ page }) => {
  // One A0 page (2384 x 3370 pt): about 138 MP at 300 dpi, so it must be scaled down.
  const doc = await PDFDocument.create();
  doc.addPage([2384, 3370]);
  const buffer = Buffer.from(await doc.save());

  await page.goto("/pdf-to-jpg/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles({ name: "poster.pdf", mimeType: "application/pdf", buffer });
  await root.getByLabel("Resolution").selectOption("300");
  await root.getByLabel("Format").selectOption("png");
  await root.getByRole("button", { name: "Convert to images" }).click();
  await expect(root.getByText(/Page 1 is very large at this resolution/)).toBeVisible();
  const img = await download(page, root.getByRole("button", { name: "Download poster-page-01.png" }));
  const { width, height } = pngSize(img.bytes);
  expect(width * height).toBeLessThanOrEqual(4096 * 4096);
  expect(width * height).toBeGreaterThan(4096 * 4096 * 0.99);

  await root.getByRole("button", { name: "Start over" }).click();
  await expect(root.getByRole("button", { name: "Convert to images" })).toBeHidden();
  await root.locator("input[type=file]").setInputFiles(fixture("two-pages.pdf"));
  await root.getByRole("button", { name: "Convert to images" }).click();
  await expect(root.getByRole("status")).toHaveText(/Done: 2 images/);
});
