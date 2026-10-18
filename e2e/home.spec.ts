import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Home page: the desk runs the real image compressor (src/components/LiveTool.astro). The home is
 * not cross-origin isolated, so this also proves the single-threaded codecs work there, and that
 * the page stays same-origin: before a file is added no codec or worker is fetched, and after it
 * nothing leaves the origin.
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
  return {
    requests,
    assertPrivate() {
      const offOrigin = requests.filter((r) => !local(r.url) && new URL(r.url).origin !== origin);
      expect(offOrigin, "requests to other origins").toEqual([]);
      expect(requests.filter((r) => r.method !== "GET"), "non-GET requests").toEqual([]);
      expect(errors.filter((e) => !/favicon/i.test(e)), "console errors / CSP violations").toEqual([]);
    },
  };
}

test("home loads same-origin only, and fetches no codec until a file is added", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#try [data-tool-root][data-mounted]")).toBeAttached();
  await page.waitForLoadState("networkidle");
  const heavy = w.requests.filter((r) => /\.wasm(\?|$)|worker/i.test(r.url));
  expect(heavy, "codec or worker requests before any file is added").toEqual([]);
  w.assertPrivate();
});

test("the home compressor processes a JPG on the device", async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto("/");
  const root = page.locator("#try [data-tool-root][data-mounted]");
  await expect(root).toBeAttached();
  await root.locator('.tool-drop input[type="file"]').setInputFiles(path.join(FIXTURES, "sample.jpg"));
  const item = root.locator(".tool-item").first();
  await expect(item).toHaveAttribute("data-state", "done", { timeout: 60_000 });
  await expect(root.locator(".tool-note[role=status]")).toContainText("1 of 1");

  // Same-format compression of a tiny fixture may come out larger; then the original is offered.
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    item.getByRole("button", { name: /^Download/ }).first().click(),
  ]);
  const file = await dl.path();
  expect(file).toBeTruthy();
  const bytes = await readFile(file!);
  expect(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff, `${dl.suggestedFilename()} is a JPG`).toBe(true);
  w.assertPrivate();
});
