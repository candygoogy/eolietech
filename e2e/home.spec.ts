import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Home page: the postcard on the desk is the real image compressor (src/components/Desk.astro,
 * src/scripts/desk-post.ts, the image compressor's own worker). The home is not cross-origin
 * isolated, so this also proves the single-threaded codecs work there, and that the page stays
 * same-origin: before a photo is dropped no codec or worker is fetched, and after it nothing leaves
 * the origin. The live counter in the verify band (src/scripts/net-counter.ts) must agree with
 * what Playwright saw on the wire.
 *
 * Note for local runs: a security suite that injects its own requests (Kaspersky adds
 * *.kaspersky-labs.com here) makes the "other origins" checks fail, and the counter shows it too.
 * That is the counter telling the truth; judge by whether only the suite's hosts appear.
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image");

function watch(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.context().on("request", (r) => requests.push({ url: r.url(), method: r.method() }));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const local = (url: string) => url.startsWith("data:") || url.startsWith("blob:");
  const foreign = () => [...new Set(requests.filter((r) => !local(r.url)).map((r) => new URL(r.url).origin))].filter((o) => o !== origin);
  return {
    requests,
    foreign,
    assertPrivate() {
      expect(foreign(), "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      expect(errors.filter((e) => !/favicon/i.test(e)), "console errors / CSP violations").toEqual([]);
    },
  };
}

const heavy = (requests: { url: string }[]) => requests.filter((r) => /\.wasm(\?|$)|worker/i.test(r.url));

test("home loads same-origin only, and fetches no codec until a photo is dropped", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#postcard[data-ready]")).toBeAttached();
  await page.waitForLoadState("networkidle");
  expect(heavy(w.requests), "codec or worker requests before any photo is dropped").toEqual([]);
  w.assertPrivate();
});

test("a photo dropped on the postcard is compressed on the device", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  const card = page.locator("#postcard[data-ready]");
  await expect(card).toBeAttached();
  await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, "sample.jpg"));

  await expect(card).toHaveAttribute("data-post", "done", { timeout: 60_000 });
  // The photo is shown from a blob: URL; the label and postmark carry the real sizes.
  await expect(card.locator(".post__photo")).toHaveAttribute("src", /^blob:/);
  await expect(card.locator(".post__line")).toContainText("→");
  await expect(card.locator(".postmark__mid")).toHaveText(/^[−+±]\d+%$/);
  await expect(card.locator(".post__status")).toContainText(/processed on this device|did not get smaller/);
  await expect(card.getByRole("link", { name: "more options" })).toHaveAttribute("href", "/compress-image/");

  // A tiny fixture may not get smaller; the button then reads "Download anyway". Either way it saves a JPG.
  const save = card.getByRole("button", { name: /^Download/ });
  await expect(save).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), save.click()]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  const bytes = await readFile(file!);
  expect(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff, `${dl.suggestedFilename()} is a JPG`).toBe(true);

  // A second photo replaces the first.
  await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, "sample.png"));
  await expect(card.locator(".post__name")).toHaveText("sample.png", { timeout: 60_000 });
  await expect(card).toHaveAttribute("data-post", "done", { timeout: 60_000 });
  w.assertPrivate();
});

test("the hero's 'Try it on a photo' opens the postcard's file picker", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#postcard[data-ready]")).toBeAttached();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("link", { name: "Try it on a photo" }).click(),
  ]);
  await chooser.setFiles(path.join(FIXTURES, "sample.webp"));
  await expect(page.locator("#postcard")).toHaveAttribute("data-post", "done", { timeout: 60_000 });
});

test("a HEIC is turned away with a pointer to its tool, without loading any codec", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  const card = page.locator("#postcard[data-ready]");
  await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, "sample.heic"));
  await expect(card).toHaveAttribute("data-post", "error");
  await expect(card.getByRole("link", { name: "HEIC to JPG" })).toHaveAttribute("href", "/heic-to-jpg/");
  await expect(card.locator(".post__status")).toContainText("was not processed");
  await page.waitForLoadState("networkidle");
  expect(heavy(w.requests), "codec or worker requests for a HEIC").toEqual([]);
  w.assertPrivate();
});

test("the live counter agrees with the network log, and shows 0 on a clean page", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const counter = page.locator("[data-counter]");
  await expect(counter).toBeVisible();
  await expect(counter.locator(".counter__n")).toHaveText(String(w.foreign().length));
  await expect(counter.locator(".counter__n")).toHaveText("0");

  const toggle = counter.getByRole("button", { name: /Other servers this page has talked to/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(counter.locator(".counter__none")).toContainText("None.");
  w.assertPrivate();
});
