import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

/**
 * Tool pages are cross-origin isolated (COEP credentialless in public/_headers). A dedicated worker
 * only starts there if its own script response carries COEP too, so these checks run against the
 * production-shaped server and fail if a worker is blocked or silently falls back to the main thread.
 */
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/pdf/${name}`, import.meta.url));

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /fake worker/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("requestfailed", (req) => problems.push(`${req.url()} ${req.failure()?.errorText ?? ""}`));
  return problems;
}

test("Ghostscript worker compresses a PDF on an isolated page", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/compress-pdf/");
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(fixture("five-pages.pdf"));
  await root.getByRole("button", { name: "Compress" }).click();
  await expect(root.getByText(/^Finished\./)).toBeVisible({ timeout: 90_000 });
  expect(problems).toEqual([]);
});

test("PDF.js renders thumbnails in its worker on an isolated page", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/organize-pdf/");
  const root = page.locator("[data-tool-root][data-mounted='true']");
  await root.locator("input[type=file]").setInputFiles(fixture("five-pages.pdf"));
  await expect(root.locator(".tool-item")).toHaveCount(5);
  await expect(root.locator(".tool-item canvas, .tool-item img").first()).toBeVisible({ timeout: 30_000 });
  expect(problems).toEqual([]);
});
