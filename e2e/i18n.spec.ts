import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * The Italian site under /it/: every page is Italian, points to its English twin (hreflang and the
 * header's language link), tool pages keep cross-origin isolation, a tool works end to end, and an
 * unknown /it/ address gets the Italian 404.
 */
const pages: [it: string, en: string][] = [
  ["/it/", "/"],
  ["/it/strumenti/", "/tools/"],
  ["/it/prezzi/", "/pricing/"],
  ["/it/progetto/", "/about/"],
  ["/it/sicurezza/", "/security/"],
  ["/it/privacy/", "/privacy/"],
  ["/it/termini/", "/terms/"],
  ["/it/verifica-caricamenti/", "/check-file-uploads/"],
  ["/it/comprimere-immagini/", "/compress-image/"],
  ["/it/webp-in-png/", "/webp-to-png/"],
  ["/it/heic-in-jpg/", "/heic-to-jpg/"],
  ["/it/unire-pdf/", "/merge-pdf/"],
  ["/it/dividere-pdf/", "/split-pdf/"],
  ["/it/organizzare-pdf/", "/organize-pdf/"],
  ["/it/comprimere-pdf/", "/compress-pdf/"],
  ["/it/rimuovere-sfondo/", "/remove-background/"],
  ["/it/trascrivere-audio/", "/transcribe-audio/"],
];

for (const [it, en] of pages) {
  test(`${it} is Italian and links its English twin ${en}`, async ({ page, baseURL }) => {
    const res = await page.goto(it);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", `https://eolietech.com${en}`);
    expect(await res!.text(), "served HTML has no inline style attributes").not.toMatch(/\sstyle=/);

    await page.locator(".site-lang").click();
    await expect(page).toHaveURL(new URL(en, baseURL).href);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".site-lang")).toHaveAttribute("href", it);
  });
}

test("Italian tool pages are cross-origin isolated", async ({ page }) => {
  const res = await page.goto("/it/rimuovere-sfondo/");
  expect(res?.headers()["cross-origin-embedder-policy"]).toBe("credentialless");
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
});

test("/it/webp-in-png/ converts a file on the device, in Italian", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const requests: { url: string; method: string }[] = [];
  page.context().on("request", (r) => requests.push({ url: r.url(), method: r.method() }));

  await page.goto("/it/webp-in-png/");
  await expect(page.locator("[data-tool-root][data-mounted]")).toBeAttached();
  const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "image", "sample.webp");
  await page.locator('.tool-drop input[type="file"]').setInputFiles(fixture);
  const item = page.locator(".tool-item").first();
  await expect(item).toHaveAttribute("data-state", "done", { timeout: 60_000 });

  const [dl] = await Promise.all([page.waitForEvent("download"), item.getByRole("button", { name: /^Scarica/ }).first().click()]);
  const bytes = await readFile((await dl.path())!);
  expect(dl.suggestedFilename().toLowerCase().endsWith(".png")).toBe(true);
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  // Sizes follow Italian number formatting (decimal comma) wherever they have a decimal.
  await expect(item).not.toContainText(/\d\.\d (KB|MB)/);

  expect(requests.filter((r) => !r.url.startsWith("data:") && new URL(r.url).origin !== origin)).toEqual([]);
  expect(requests.filter((r) => r.method !== "GET")).toEqual([]);
});

test("an unknown /it/ address gets the Italian 404", async ({ page }) => {
  const res = await page.goto("/it/questa-pagina-non-esiste/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
});
