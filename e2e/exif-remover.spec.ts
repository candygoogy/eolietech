import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { inspectJpeg, walkJpeg } from "../src/tools/exif-remover/jpeg";

/**
 * EXIF remover: show what a photo reveals, remove everything (keeping the rotation flag) or only the
 * location, download, and prove the output has no GPS while the image data is untouched and nothing
 * left the origin. Fixtures: e2e/fixtures/image/exif-gps.* (64 x 48 samples with GPS, camera, date,
 * software, Orientation 6 and XMP, written by src/tools/exif-remover/test-fixtures.ts).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

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

/** JPEG image data, from the first SOS marker to the end. */
function scanSpan(b: Uint8Array): Buffer {
  const { segments } = walkJpeg(b);
  const sos = segments.find((s) => s.kind === "scan")!;
  return Buffer.from(b.subarray(sos.start));
}

const upload = (page: Page, names: string[]) =>
  page.locator('.tool-drop input[type="file"]').setInputFiles(names.map(fixture));

test("/remove-exif/ shows what a photo reveals and removes all of it", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/remove-exif/");
  await expect(page.getByLabel("Everything")).toBeChecked();
  await upload(page, ["exif-gps.jpg"]);
  const row = page.locator(".tool-item").first();
  await expect(row).toHaveAttribute("data-state", "pending");
  await expect(row).toContainText("Location: 38.47, 14.95");
  await expect(row).toContainText("Camera: Google Pixel 7");
  await expect(row).toContainText("Taken: July 14, 2024");
  await expect(row).toContainText("Software: HDR+ 1.0.540104767zd");
  await expect(row).toContainText("Plus 3 other tags");
  await expect(row).toContainText("XMP data");
  await expect(page.locator(".tool-note[role=status]")).toHaveText("1 photo checked. 1 shows where it was taken.");

  await page.getByRole("button", { name: "Remove metadata from 1 photo" }).click();
  await expect(row).toHaveAttribute("data-state", "done");
  await expect(row).toContainText("Metadata removed");
  await expect(row).toContainText("Rotation flag kept");
  await expect(page.locator(".tool-note[role=status]")).toContainText("Done: 1 clean photo ready.");

  const out = await download(page, row.getByRole("button", { name: "Download exif-gps.jpg" }));
  expect(out.name).toBe("exif-gps.jpg");
  const original = await readFile(fixture("exif-gps.jpg"));
  expect(out.bytes.length).toBeLessThan(original.length);
  const report = inspectJpeg(out.bytes);
  expect(report.gps).toBeNull();
  expect(report.exif).toMatchObject({ orientation: 6, otherTags: 0, hasGpsBlock: false });
  expect(report.exif?.make).toBeUndefined();
  expect(report.blocks).toEqual([]);
  expect(out.bytes.includes("GPS")).toBe(false);
  expect(scanSpan(out.bytes).equals(scanSpan(original))).toBe(true);
  w.assertPrivate();
});

test("/remove-exif/ cleans PNG and WebP in a batch, zips them, and points HEIC to the converter", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/remove-exif/");
  await upload(page, ["exif-gps.png", "exif-gps.webp", "sample.heic"]);
  const rows = page.locator(".tool-item");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Location: 38.47, 14.95");
  await expect(rows.nth(1)).toContainText("Location: 38.47, 14.95");
  await expect(rows.nth(2)).toHaveAttribute("data-state", "error");
  await expect(rows.nth(2).getByRole("link", { name: "HEIC to JPG" })).toHaveAttribute("href", "/heic-to-jpg/");
  await expect(page.locator(".tool-note[role=status]")).toContainText("2 photos checked. 2 show where they were taken. 1 could not be read.");

  await page.getByRole("button", { name: "Remove metadata from 2 photos" }).click();
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(2);
  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("photos-without-metadata.zip");
  expect(isZip(zip.bytes)).toBe(true);

  const png = await download(page, rows.nth(0).getByRole("button", { name: "Download exif-gps.png" }));
  expect(png.bytes.includes("eXIf")).toBe(true); // orientation only
  expect(png.bytes.includes("Pixel 7")).toBe(false);
  expect(png.bytes.includes("tEXt")).toBe(false);
  const webp = await download(page, rows.nth(1).getByRole("button", { name: "Download exif-gps.webp" }));
  expect(webp.bytes.includes("Pixel 7")).toBe(false);
  expect(webp.bytes.includes("XMP ")).toBe(false);
  w.assertPrivate();
});

test("/remove-location-from-photo/ removes the location and keeps the camera", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/remove-location-from-photo/");
  await expect(page.getByLabel("Location only")).toBeChecked();
  await upload(page, ["exif-gps.jpg"]);
  const row = page.locator(".tool-item").first();
  await expect(row).toContainText("Location: 38.47, 14.95");
  await page.getByRole("button", { name: "Remove location from 1 photo" }).click();
  await expect(row).toContainText("Location removed");

  const out = await download(page, row.getByRole("button", { name: "Download exif-gps.jpg" }));
  const original = await readFile(fixture("exif-gps.jpg"));
  expect(out.bytes.length).toBe(original.length);
  const report = inspectJpeg(out.bytes);
  expect(report.gps).toBeNull();
  expect(report.exif).toMatchObject({ make: "Google", model: "Pixel 7", orientation: 6, hasGpsBlock: false });
  expect(out.bytes.includes("GPSLatitude")).toBe(false);
  expect(scanSpan(out.bytes).equals(scanSpan(original))).toBe(true);

  // Switching to Everything re-makes the copy and keeps the row cleaned.
  await page.getByLabel("Everything").check();
  await expect(row).toContainText("Metadata removed");
  w.assertPrivate();
});

test("/it/rimuovere-exif/ works in Italian at 360px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/rimuovere-exif/");
  await expect(page.locator("h1")).toHaveText("Rimuovere i dati EXIF");
  await upload(page, ["exif-gps.jpg"]);
  const row = page.locator(".tool-item").first();
  await expect(row).toContainText("Posizione: 38.47, 14.95");
  await expect(row).toContainText("Fotocamera: Google Pixel 7");
  await expect(page.locator(".tool-note[role=status]")).toHaveText("Foto controllate: 1. 1 rivela dove è stata scattata.");
  await page.getByRole("button", { name: "Rimuovi i metadati da 1 foto" }).click();
  await expect(row).toContainText("Metadati rimossi");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});

test("/it/rimuovere-posizione-dalle-foto/ starts on Solo la posizione", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/it/rimuovere-posizione-dalle-foto/");
  await expect(page.locator("h1")).toHaveText("Rimuovere la posizione dalle foto");
  await expect(page.getByLabel("Solo la posizione")).toBeChecked();
  w.assertPrivate();
});
