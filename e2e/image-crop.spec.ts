import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Image cropper (/crop-image/): open an image, set the box with the fields, the aspect presets,
 * the keyboard and the mouse, crop on the device and download. Also proves a sideways phone photo
 * (EXIF orientation 6) is cropped where the preview shows it. Fixtures: e2e/fixtures/image/ (64 x 48).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);

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
  // After SOI and the JFIF APP0 segment, where cameras put it.
  let at = 2;
  if (jpg[2] === 0xff && jpg[3] === 0xe0) at = 4 + jpg.readUInt16BE(4);
  return Buffer.concat([jpg.subarray(0, at), app1, jpg.subarray(at)]);
}

async function openTool(page: Page, url = "/crop-image/") {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

async function choose(page: Page, files: Parameters<ReturnType<Page["locator"]>["setInputFiles"]>[0]) {
  await page.locator('.tool-drop input[type="file"]').setInputFiles(files);
  await expect(page.locator(".crop-editor")).toBeVisible({ timeout: 30_000 });
}

const field = (page: Page, name: RegExp) => page.getByRole("spinbutton", { name });
const fields = (page: Page) =>
  Promise.all([/left/i, /top/i, /^width/i, /^height/i].map((n) => field(page, n).inputValue().then(Number)));

async function setField(page: Page, name: RegExp, value: number) {
  const input = field(page, name);
  await input.fill(String(value));
  await input.press("Enter");
}

async function cropAndDownload(page: Page) {
  await page.getByRole("button", { name: "Crop image" }).click();
  const btn = page.getByRole("button", { name: /^Download / });
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

const pngSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

test("crops a PNG to the size typed in the fields and downloads it", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page);
  await choose(page, fixture("sample.png"));
  await expect(page.locator(".tool--image-crop > .tool-item__meta")).toContainText("64 × 48 px");
  expect(await fields(page)).toEqual([0, 0, 64, 48]);

  await setField(page, /^width/i, 32);
  await setField(page, /^height/i, 20);
  await setField(page, /left/i, 10);
  // The position is clamped so the box stays inside the image.
  await setField(page, /top/i, 999);
  expect(await fields(page)).toEqual([10, 28, 32, 20]);

  const out = await cropAndDownload(page);
  expect(out.name).toBe("sample-cropped.png");
  expect(out.bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  expect(pngSize(out.bytes)).toEqual({ width: 32, height: 20 });
  await expect(page.getByRole("status").filter({ hasText: "Cropped to" })).toContainText("32 × 20 px");

  // Changing the box makes the result stale: Crop comes back.
  await setField(page, /^width/i, 30);
  await expect(page.getByRole("button", { name: "Crop image" })).toBeVisible();
  w.assertPrivate();
});

test("aspect presets, keyboard moves and resizes, and the mouse drags a corner", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page);
  await choose(page, fixture("sample.jpg"));

  await page.locator(".crop-aspect__option", { hasText: "1:1" }).click();
  expect(await fields(page)).toEqual([8, 0, 48, 48]);
  await page.locator(".crop-aspect__option", { hasText: "16:9" }).click();
  expect(await fields(page)).toEqual([0, 6, 64, 36]);
  await page.getByRole("button", { name: "Rotate the ratio to 9:16" }).click();
  await expect(page.locator(".crop-aspect__option", { hasText: "9:16" })).toBeVisible();
  const [, , tw, th] = await fields(page);
  expect(th).toBe(48);
  expect(Math.abs(tw - 27)).toBeLessThanOrEqual(1);

  // Back to 1:1, centred on the image again.
  await page.locator(".crop-aspect__option", { hasText: "1:1" }).click();
  await page.getByRole("button", { name: "Reset the box" }).click();
  expect(await fields(page)).toEqual([8, 0, 48, 48]);
  const box = page.getByRole("application", { name: "Crop area" });
  await expect(box).toBeFocused();
  const url = page.url();
  await box.press("ArrowLeft");
  expect(await fields(page)).toEqual([7, 0, 48, 48]);
  await box.press("Shift+ArrowLeft");
  expect(await fields(page)).toEqual([0, 0, 48, 48]);
  // Alt+Left resizes; it must not go back in the history.
  await box.press("Alt+ArrowLeft");
  expect(await fields(page)).toEqual([0, 0, 47, 47]);
  expect(page.url()).toBe(url);
  await expect(page.locator(".tool--image-crop > [aria-live]").last()).toContainText("47 × 47 px");

  // Free: drag the bottom-right corner a quarter of the way in.
  await page.locator(".crop-aspect__option", { hasText: "Free" }).click();
  await page.getByRole("button", { name: "Reset the box" }).click();
  expect(await fields(page)).toEqual([0, 0, 64, 48]);
  await page.locator(".crop-stage").scrollIntoViewIfNeeded();
  const frame = (await page.locator(".crop-frame").boundingBox())!;
  const corner = (await page.locator('.crop-handle[data-handle="se"]').boundingBox())!;
  const cx = corner.x + corner.width / 2;
  const cy = corner.y + corner.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - frame.width / 4, cy - frame.height / 4, { steps: 5 });
  await page.mouse.up();
  const [x, y, fw, fh] = await fields(page);
  expect([x, y]).toEqual([0, 0]);
  expect(Math.abs(fw - 48)).toBeLessThanOrEqual(1);
  expect(Math.abs(fh - 36)).toBeLessThanOrEqual(1);
  w.assertPrivate();
});

test("a sideways phone photo is cropped where the preview shows it", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  const jpeg = await sidewaysJpeg();
  await openTool(page);
  await choose(page, { name: "phone.jpg", mimeType: "image/jpeg", buffer: jpeg });

  // Upright: 48 wide, 64 tall, in the info line and in the preview.
  await expect(page.locator(".tool--image-crop > .tool-item__meta")).toContainText("48 × 64 px");
  const preview = await page.locator(".crop-canvas").evaluate((c: HTMLCanvasElement) => ({ w: c.width, h: c.height }));
  expect(preview.h).toBeGreaterThan(preview.w);

  await setField(page, /^width/i, 8);
  await setField(page, /^height/i, 8);
  await page.getByRole("combobox", { name: "Save as" }).selectOption("png");
  const out = await cropAndDownload(page);
  expect(pngSize(out.bytes)).toEqual({ width: 8, height: 8 });

  // The top-left 8 x 8 of the cropped PNG must match the top-left of the photo as the browser
  // itself displays it (EXIF applied), and not the raw, unrotated pixels.
  const colours = await page.evaluate(
    async ({ png, jpg }) => {
      const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const mean = async (blob: Blob) => {
        const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const g = c.getContext("2d")!;
        g.drawImage(bmp, 0, 0);
        const d = g.getImageData(0, 0, 8, 8).data;
        const sum = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k]! += d[i + k]!;
        return sum.map((s) => s / 64);
      };
      return {
        cropped: await mean(new Blob([bytes(png)], { type: "image/png" })),
        upright: await mean(new Blob([bytes(jpg)], { type: "image/jpeg" })),
      };
    },
    { png: out.bytes.toString("base64"), jpg: jpeg.toString("base64") },
  );
  for (let k = 0; k < 3; k++) expect(Math.abs(colours.cropped[k]! - colours.upright[k]!), `channel ${k}`).toBeLessThan(16);
  // Sanity: the browser did turn the photo. The fixture's green runs from 0 at its top to 255 at its
  // bottom, and turned clockwise that bottom edge becomes the left side, so this corner is green.
  expect(colours.upright[1]!).toBeGreaterThan(180);
  expect(colours.upright[0]!).toBeLessThan(60);
  w.assertPrivate();
});

test("Italian page crops too", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/it/ritagliare-immagini/");
  await expect(page.locator(".tool-drop__label")).toHaveText("Scegli un'immagine o trascinala qui");
  await choose(page, fixture("sample.webp"));
  await expect(page.locator(".tool-drop__label")).toHaveText("Scegli un'altra immagine");
  await page.getByRole("button", { name: "Ritaglia", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ritagliata" })).toContainText("64 × 48 px", { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Scarica sample-ritagliata.webp" })).toBeVisible();
  w.assertPrivate();
});
