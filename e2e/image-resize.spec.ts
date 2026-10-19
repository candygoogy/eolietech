import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Image resizer: resize by width, refuse to enlarge unless allowed, enlarge by percentage, convert,
 * zip a batch, and prove nothing left the origin. Fixtures: e2e/fixtures/image/ (64 x 48 gradients).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

const isJpg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
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
      const offOrigin = requests.filter((r) => !r.url.startsWith("data:") && new URL(r.url).origin !== origin);
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

/** Type into a number field and commit it, as a keyboard user would. */
async function setNumber(field: Locator, value: string) {
  await field.fill(value);
  await field.press("Enter");
  await field.blur();
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

const done = (row: Locator) => expect(row).toHaveAttribute("data-state", "done", { timeout: 60_000 });

test("keyboard focus on a row's Remove button survives the row finishing", async ({ page }) => {
  await open(page, "/resize-image/");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.png"));
  // The codec worker is still starting, so the row is rebuilt after this focus.
  await page.getByRole("button", { name: "Remove sample.png" }).focus();
  await done(page.locator(".tool-item").first());
  await expect(page.getByRole("button", { name: "Remove sample.png" })).toBeFocused();
});

test("/resize-image/ resizes by width, does not enlarge unless allowed, and converts", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/resize-image/");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.png"));
  const row = page.locator(".tool-item").first();

  // Default: 1600 px wide. The 64 x 48 fixture is smaller, so it keeps its size and the row says so.
  await done(row);
  await expect(row).toContainText("64 × 48 → 64 × 48 px");
  await expect(row).toContainText("not enlarged");

  await setNumber(page.getByLabel("Width (px)"), "32");
  await expect(row).toContainText("64 × 48 → 32 × 24 px", { timeout: 60_000 });
  await done(row);
  await expect(page.locator(".tool-note[role=status]")).toContainText("1 of 1");

  // Percentage with enlarging allowed.
  await page.getByLabel("Resize by").selectOption("percent");
  await expect(page.getByLabel("Width (px)")).toBeHidden();
  await setNumber(page.getByLabel("Percentage (%)"), "200");
  await expect(row).toContainText("not enlarged", { timeout: 60_000 });
  await page.getByLabel("Allow enlarging smaller images").check();
  await expect(row).toContainText("64 × 48 → 128 × 96 px", { timeout: 60_000 });
  await done(row);

  // Width and height, stretched: exactly the box.
  await page.getByLabel("Resize by").selectOption("box");
  await setNumber(page.getByLabel("Width (px)"), "50");
  await setNumber(page.getByLabel("Height (px)"), "50");
  await page.getByLabel("Keep proportions").uncheck();
  await expect(row).toContainText("64 × 48 → 50 × 50 px", { timeout: 60_000 });

  // Convert to JPG and download.
  await page.getByLabel("Output format").selectOption("jpg");
  await expect(row.getByRole("button", { name: "Download sample.jpg" })).toBeVisible({ timeout: 60_000 });
  const out = await download(page, row.getByRole("button", { name: "Download sample.jpg" }));
  expect(out.name).toBe("sample.jpg");
  expect(isJpg(out.bytes)).toBe(true);

  // An empty size field is flagged and keeps the last size.
  await page.getByLabel("Width (px)").fill("");
  await expect(page.getByLabel("Width (px)")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(".tool-options .tool-note").first()).toContainText("Type a width");
  // ...and says so once to screen readers, not only in the field's description.
  await expect(page.locator('.tool-options [aria-live="polite"]')).toHaveText("Type a width from 1 to 20,000 px.");
  w.assertPrivate();
});

test("/resize-image/ resizes a batch and downloads it as a zip", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await open(page, "/resize-image/");
  await setNumber(page.getByLabel("Width (px)"), "40");
  await page
    .locator('.tool-drop input[type="file"]')
    .setInputFiles([fixture("sample.jpg"), fixture("sample.webp"), fixture("sample.avif")]);
  await expect(page.locator('.tool-item[data-state="done"]')).toHaveCount(3, { timeout: 90_000 });
  await expect(page.locator(".tool-item").first()).toContainText("64 × 48 → 40 × 30 px");
  const zip = await download(page, page.getByRole("button", { name: "Download all (.zip)" }));
  expect(zip.name).toBe("resized-images.zip");
  expect(isZip(zip.bytes)).toBe(true);
  w.assertPrivate();
});

test("/it/ridimensionare-immagini/ works in Italian at 360px without sideways scrolling", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "/it/ridimensionare-immagini/");
  await page.getByLabel("Ridimensiona per").selectOption("box");
  await expect(page.getByLabel("Mantieni le proporzioni")).toBeChecked();
  await setNumber(page.getByLabel("Larghezza (px)"), "32");
  await setNumber(page.getByLabel("Altezza (px)"), "32");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.png"));
  const row = page.locator(".tool-item").first();
  await done(row);
  await expect(row).toContainText("64 × 48 → 32 × 24 px");
  await expect(page.locator(".tool-note[role=status]")).toContainText("File ridimensionati: 1 su 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  w.assertPrivate();
});
