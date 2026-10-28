import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Redact an image (/redact-image/ and its blur and pixelate pages): open an image, add boxes with
 * the button, the keyboard and the mouse, save on the device and check the saved pixels: changed
 * inside the box, untouched outside it. Fixtures: e2e/fixtures/image/ (64 x 48; sample.png is
 * opaque on its left half and fades out on its right half).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");
const fixture = (name: string) => path.join(FIXTURES, name);
const W = 64;
const H = 48;

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

async function openTool(page: Page, url = "/redact-image/") {
  await page.goto(url);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
}

async function choose(page: Page, name: string) {
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture(name));
  await expect(page.locator(".redact-editor")).toBeVisible({ timeout: 30_000 });
}

async function saveAndDownload(page: Page) {
  await page.getByRole("button", { name: "Save redacted image" }).click();
  const btn = page.getByRole("button", { name: /^Download / });
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

/** RGBA of every pixel, decoded by the browser itself. */
function decode(page: Page, bytes: Buffer, type: string): Promise<number[]> {
  return page.evaluate(
    async ({ b64, type }) => {
      const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([data], { type }));
      // A DOM canvas: Playwright's WebKit has no OffscreenCanvas on the main thread.
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const g = c.getContext("2d")!;
      g.drawImage(bmp, 0, 0);
      return Array.from(g.getImageData(0, 0, bmp.width, bmp.height).data);
    },
    { b64: bytes.toString("base64"), type },
  );
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const inBox = (b: Box, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

/** Compare the saved image with the original: inside the box `inside` must hold, outside nothing moves. */
function compare(before: number[], after: number[], box: Box) {
  expect(after.length).toBe(W * H * 4);
  let outsideMax = 0;
  let insideChange = 0;
  let insideN = 0;
  const inside: number[][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Only opaque pixels compare exactly through a canvas (it stores premultiplied colour).
      if (before[i + 3] !== 255) continue;
      const diff = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(before[i + c]! - after[i + c]!)));
      if (inBox(box, x, y)) {
        inside.push(after.slice(i, i + 4));
        insideChange += [0, 1, 2].reduce((s, c) => s + Math.abs(before[i + c]! - after[i + c]!), 0) / 3;
        insideN++;
      } else outsideMax = Math.max(outsideMax, diff);
    }
  }
  return { outsideMax, inside, insideMeanChange: insideN ? insideChange / insideN : 0 };
}

const boxState = (b: Box) => `${b.w} × ${b.h} px, ${b.x} px from the left and ${b.y} px from the top.`;

test("a black box makes the pixels inside it black and leaves the rest as they were", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page);
  await choose(page, "sample.png");
  await expect(page.getByRole("radio", { name: "Black box" })).toBeChecked();
  await expect(page.locator(".tool--image-redact > .tool-item__meta")).toContainText("64 × 48 px");
  await expect(page.locator(".tool--image-redact > [aria-live]").last()).toContainText("Opened sample.png, 64 × 48 px");
  // Strength means nothing for a black box.
  await expect(page.getByRole("slider", { name: "Strength" })).toBeDisabled();

  await page.getByRole("button", { name: "Add a box" }).click();
  const box = page.getByRole("application", { name: "Box 1" });
  await expect(box).toBeFocused();
  const b = { x: 26, y: 18, w: 12, h: 12 };
  await expect(box).toHaveAccessibleDescription(new RegExp(`^${boxState(b)} Arrow keys move the box`));
  await expect(page.locator(".redact-count")).toHaveText("1 box");

  const out = await saveAndDownload(page);
  expect(out.name).toBe("sample-redacted.png");
  expect(out.bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText("64 × 48 px");

  const before = await decode(page, await readFile(fixture("sample.png")), "image/png");
  const after = await decode(page, out.bytes, "image/png");
  // The box is opaque black even over the fading half.
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      const i = (y * W + x) * 4;
      expect(after.slice(i, i + 4), `pixel ${x},${y}`).toEqual([0, 0, 0, 255]);
    }
  }
  const { outsideMax } = compare(before, after, b);
  expect(outsideMax, "largest change outside the box").toBeLessThanOrEqual(2);

  // Moving the box makes the saved file stale: Save comes back.
  await box.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Save redacted image" })).toBeVisible();
  w.assertPrivate();
});

test("the keyboard adds, moves, resizes and removes boxes, and the mouse draws one", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page);
  await choose(page, "sample.jpg");

  // Mouse: drag across the top-left quarter of the photo.
  await page.locator(".redact-stage").scrollIntoViewIfNeeded();
  const frame = (await page.locator(".redact-frame").boundingBox())!;
  await page.mouse.move(frame.x + frame.width * 0.05, frame.y + frame.height * 0.05);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width * 0.3, frame.y + frame.height * 0.4, { steps: 5 });
  await page.mouse.up();
  const drawn = page.getByRole("application", { name: "Box 1" });
  await expect(drawn).toBeFocused();
  await expect(page.locator(".redact-count")).toHaveText("1 box");
  await expect(page.locator(".tool--image-redact > [aria-live]").last()).toHaveText("Box 1 added.");

  // Keyboard: Add a box, then move and resize it.
  const url = page.url();
  await page.getByRole("button", { name: "Add a box" }).focus();
  await page.keyboard.press("Enter");
  const added = page.getByRole("application", { name: "Box 2" });
  await expect(added).toBeFocused();
  // The second box steps down and right of the first default position.
  await expect(added).toHaveAccessibleDescription(new RegExp(`^${boxState({ x: 30, y: 22, w: 12, h: 12 })}`));
  await added.press("ArrowRight");
  await added.press("Shift+ArrowUp");
  await expect(added).toHaveAccessibleDescription(new RegExp(`^${boxState({ x: 31, y: 12, w: 12, h: 12 })}`));
  // Alt+arrows resize; Alt+Left must not go back in the history.
  await added.press("Alt+ArrowRight");
  await added.press("Alt+ArrowLeft");
  await added.press("Alt+ArrowDown");
  expect(page.url()).toBe(url);
  await expect(added).toHaveAccessibleDescription(new RegExp(`^${boxState({ x: 31, y: 12, w: 12, h: 13 })}`));
  await expect(page.locator(".tool--image-redact > [aria-live]").last()).toContainText("Box 2: 12 × 13 px");
  await expect(page.locator(".redact-count")).toHaveText("2 boxes");

  // Delete removes it and puts the focus on the box that is left.
  await added.press("Delete");
  await expect(page.locator(".redact-count")).toHaveText("1 box");
  await expect(drawn).toBeFocused();
  await expect(page.locator(".tool--image-redact > [aria-live]").last()).toHaveText("Box removed.");
  w.assertPrivate();
});

test("/blur-faces-in-photo/ starts on Blur and blurs only inside the box", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/blur-faces-in-photo/");
  await choose(page, "sample.png");
  await expect(page.getByRole("radio", { name: "Blur" })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Strength" })).toBeEnabled();

  // A 22 x 22 box on the opaque left half: Add, then move and grow it with the keyboard.
  await page.getByRole("button", { name: "Add a box" }).click();
  const box = page.getByRole("application", { name: "Box 1" });
  await box.press("Shift+ArrowLeft");
  await box.press("Shift+ArrowLeft");
  await box.press("Alt+Shift+ArrowRight");
  await box.press("Alt+Shift+ArrowDown");
  const b = { x: 6, y: 18, w: 22, h: 22 };
  await expect(box).toHaveAccessibleDescription(new RegExp(`^${boxState(b)}`));

  const out = await saveAndDownload(page);
  expect(out.name).toBe("sample-redacted.png");
  const before = await decode(page, await readFile(fixture("sample.png")), "image/png");
  const after = await decode(page, out.bytes, "image/png");
  const { outsideMax, insideMeanChange } = compare(before, after, b);
  expect(outsideMax, "largest change outside the box").toBeLessThanOrEqual(2);
  expect(insideMeanChange, "mean change inside the box").toBeGreaterThan(10);
  w.assertPrivate();
});

test("the Italian pixelate page opens an image with Pixel selected", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page, "/it/pixelare-immagine/");
  await expect(page.locator(".tool-drop__label")).toHaveText("Scegli un'immagine o trascinala qui");
  await choose(page, "sample.webp");
  await expect(page.getByRole("radio", { name: "Pixel" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Aggiungi un riquadro" })).toBeVisible();
  w.assertPrivate();
});

test("a HEIC photo points to the converter", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openTool(page);
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("sample.heic"));
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("sample.heic is a HEIC photo");
  await expect(alert.getByRole("link", { name: "HEIC to JPG" })).toHaveAttribute("href", "/heic-to-jpg/");
  await expect(page.locator(".redact-editor")).toBeHidden();
  w.assertPrivate();
});
