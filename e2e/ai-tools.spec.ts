import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * On-device AI tools (background-remover, audio-transcribe): the size notice is shown before any
 * model byte is requested, the model loads from this origin only after the click, the output is
 * real, and nothing leaves the origin. Headless Chromium has no usable WebGPU, so this exercises
 * the WebAssembly backend. Fixtures: e2e/fixtures/ai/ (see its README).
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "ai");
const fixture = (name: string) => path.join(FIXTURES, name);

/** Records every request (pages and workers) and console errors for the privacy assertions. */
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
    requests,
    modelRequests: () => requests.filter((r) => r.url.startsWith(origin) && new URL(r.url).pathname.startsWith("/models/")),
    assertPrivate() {
      const offOrigin = requests.filter((r) => !/^(data|blob):/.test(r.url) && new URL(r.url).origin !== origin);
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      expect(errors.filter((e) => !/favicon/i.test(e)), "console errors / CSP violations").toEqual([]);
    },
  };
}

async function download(page: Page, button: ReturnType<Page["getByRole"]>) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  return { name: dl.suggestedFilename(), bytes: await readFile(file!) };
}

/** Decode a PNG in the page and sample its alpha channel. */
async function alphaStats(page: Page, png: Buffer) {
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3]!;
    let transparent = 0;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! < 16) transparent++;
      else if (data[i]! > 240) opaque++;
    }
    const n = width * height;
    return {
      width,
      height,
      center: alphaAt(320, 200),
      corners: [alphaAt(5, 5), alphaAt(width - 6, 5), alphaAt(5, height - 6), alphaAt(width - 6, height - 6)],
      transparent: transparent / n,
      opaque: opaque / n,
    };
  }, png.toString("base64"));
}

test.describe.configure({ mode: "serial" });

test("/remove-background/ cuts out the subject on the device and caches the model", async ({ page, baseURL }) => {
  test.setTimeout(300_000);
  const w = watch(page, baseURL!);
  await page.goto("/remove-background/");
  await expect(page).toHaveTitle(/Eolietech/);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await expect(page.locator(".tool-note").filter({ hasText: /downloads once from this site \(\d+ MB\)/ })).toBeVisible();

  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("photo.png"));
  await expect(page.locator(".tool-item")).toHaveCount(1);
  expect(w.modelRequests(), "no model bytes before the click").toEqual([]);

  const started = Date.now();
  await page.getByRole("button", { name: "Remove background" }).click();
  const item = page.locator(".tool-item").first();
  await expect(item).toHaveAttribute("data-state", "done", { timeout: 240_000 });
  console.log(`[timing] background removal incl. first model load: ${Date.now() - started} ms`);
  await expect(page.getByText(/Running on your (processor|graphics card)/)).toBeVisible();
  await expect(item.locator("img.tool-item__thumb")).toBeVisible();

  const out = await download(page, item.getByRole("button", { name: /^Download/ }));
  expect(out.name).toBe("photo-no-bg.png");
  expect(out.bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  expect(out.bytes[25], "PNG colour type RGBA").toBe(6);
  const stats = await alphaStats(page, out.bytes);
  expect({ width: stats.width, height: stats.height }).toEqual({ width: 640, height: 427 });
  expect(stats.center, "the ball stays opaque").toBeGreaterThan(240);
  for (const a of stats.corners) expect(a, "the backdrop becomes transparent").toBeLessThan(16);
  expect(stats.transparent).toBeGreaterThan(0.4);
  expect(stats.opaque).toBeGreaterThan(0.1);
  const chunkRequests = w.modelRequests().filter((r) => r.url.endsWith(".bin")).length;
  expect(chunkRequests, "model chunks were fetched").toBeGreaterThan(0);

  // Second visit: the model comes from the browser's storage, no chunk is downloaded again.
  await page.reload();
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("photo.png"));
  const again = Date.now();
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.locator(".tool-item").first()).toHaveAttribute("data-state", "done", { timeout: 240_000 });
  console.log(`[timing] background removal with cached model: ${Date.now() - again} ms`);
  expect(w.modelRequests().filter((r) => r.url.endsWith(".bin")).length, "no chunk downloaded twice").toBe(chunkRequests);
  w.assertPrivate();
});

test("/transcribe-audio/ transcribes a speech clip on the device", async ({ page, baseURL }) => {
  test.setTimeout(300_000);
  const w = watch(page, baseURL!);
  await page.goto("/transcribe-audio/");
  await expect(page).toHaveTitle(/Eolietech/);
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  await expect(page.locator(".tool-note").filter({ hasText: /downloads once from this site \(\d+ MB\)/ })).toBeVisible();

  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture("jfk.wav"));
  await expect(page.getByLabel("Spoken language")).toHaveValue("");
  expect(w.modelRequests(), "no model bytes before the click").toEqual([]);

  const started = Date.now();
  await page.getByRole("button", { name: "Transcribe" }).click();
  await expect(page.locator(".tool-note[role=status]")).toHaveText("Transcript ready.", { timeout: 240_000 });
  console.log(`[timing] transcription of the 11 s clip incl. first model load: ${Date.now() - started} ms`);

  const transcript = page.locator(".asr-transcript");
  await expect(transcript).toContainText(/ask not what your country can do for you/i);
  await expect(page.locator(".asr-result")).toContainText("English");

  const txt = await download(page, page.getByRole("button", { name: "Download .txt" }));
  expect(txt.name).toBe("jfk.txt");
  expect(txt.bytes.toString("utf8")).toMatch(/country can do for you/i);
  const srt = await download(page, page.getByRole("button", { name: "Download .srt" }));
  expect(srt.name).toBe("jfk.srt");
  expect(srt.bytes.toString("utf8")).toMatch(/^1\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n\S/);
  const vtt = await download(page, page.getByRole("button", { name: "Download .vtt" }));
  expect(vtt.bytes.toString("utf8")).toMatch(/^WEBVTT\n\n\d{2}:\d{2}:\d{2}\.\d{3} --> /);
  w.assertPrivate();
});
