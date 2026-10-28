import { expect, test } from "@playwright/test";

test("home page returns 200 with a title and canonical", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Eolietech/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://eolietech.com/");
  await expect(page.locator("h1")).toBeVisible();
});

test("unknown paths serve the 404 page with status 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist/");
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator("h1")).toBeVisible();
});

test("pages load with no CSP violations or console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  const res = await page.goto("/");
  expect(res?.headers()["content-security-policy"]).toContain("connect-src 'self'");
  await page.waitForLoadState("load");
  // favicon may 404 until the design step adds one
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});

test("cross-origin isolation: one COEP value on tool pages and workers, none on the waitlist page", async ({ page, request }) => {
  const tool = await request.get("/merge-pdf/");
  expect(tool.headers()["cross-origin-embedder-policy"]).toBe("credentialless");
  await page.goto("/merge-pdf/");
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const asset = await page.evaluate(() => document.querySelector<HTMLScriptElement>("script[type=module][src]")?.src);
  expect(asset).toBeTruthy();
  expect((await request.get(asset!)).headers()["cross-origin-embedder-policy"]).toBe("credentialless");
  for (const path of ["/pricing/", "/it/prezzi/"]) {
    expect((await request.get(path)).headers()["cross-origin-embedder-policy"], path).toBeUndefined();
  }
});
