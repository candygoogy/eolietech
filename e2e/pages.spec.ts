import { expect, test } from "@playwright/test";
import en from "../src/i18n/en.json" with { type: "json" };

/** The inner pages and the stamp each one carries in its head (Stamp.astro, words from en.json). */
const pages = [
  { path: "/tools/", stamp: ".page-head__stamp", key: "tools.stamp" },
  { path: "/pricing/", stamp: ".page-head__stamp", key: "pricing.stamp" },
  { path: "/about/", stamp: ".page-head__stamp", key: "about.stamp" },
  { path: "/security/", stamp: ".page-head__stamp", key: "security.stamp" },
  { path: "/privacy/", stamp: ".page-head__stamp", key: "privacy.stamp" },
  { path: "/terms/", stamp: ".page-head__stamp", key: "terms.stamp" },
  { path: "/check-file-uploads/", stamp: ".page-head__stamp", key: "guide.stamp" },
  { path: "/this-page-does-not-exist/", stamp: ".not-found__stamp", key: "notFound.stamp" },
] as const;

for (const { path, stamp, key } of pages) {
  test(`${path} shows its head stamp and serves no inline style attributes`, async ({ page }) => {
    const res = await page.goto(path);
    // The served markup, before any third-party widget touches the DOM: the CSP is style-src 'self'.
    const html = (await res?.text()) ?? "";
    expect(html).not.toMatch(/<[^>]+\sstyle\s*=/i);
    expect(html).not.toMatch(/<style[\s>]/i);

    const mark = page.locator(stamp);
    await expect(mark).toHaveCount(1);
    await expect(mark).toBeVisible();
    await expect(mark).toContainText(en[key as keyof typeof en], { ignoreCase: true });
  });
}

for (const path of ["/tools/", "/it/strumenti/"]) {
  test(`${path} links every variant page with a real label`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator(".tool-index__converters a");
    expect(await links.count()).toBeGreaterThan(0);
    for (const label of await links.allTextContents()) expect(label).not.toMatch(/undefined|\{|\}/i);
    await expect(page.locator(`.tool-index__converters a[href$="${path === "/tools/" ? "/resize-image-for-email/" : "/ridimensionare-immagini-per-email/"}"]`)).toHaveCount(1);
  });
}
