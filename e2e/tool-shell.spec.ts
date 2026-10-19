import { expect, test, type Page } from "@playwright/test";

/**
 * Layout-shift guard for tool pages. Before a tool's client chunk runs, [data-tool-root] holds a
 * server-rendered loading shell whose height is reserved per tool in tool.css (--tool-shell,
 * --tool-shell-rest). When the tool mounts, its first render must have that same height, or
 * everything below the panel jumps. This compares the shell (all scripts blocked) with the mounted
 * tool at a phone and a desktop width. If it fails after a change to a tool's initial UI,
 * re-measure and update the values in tool.css.
 */

const TOOLS = {
  "image-compress": "compress-image",
  "heic-to-jpg": "heic-to-jpg",
  "image-resize": "resize-image",
  "image-crop": "crop-image",
  "exif-remover": "remove-exif",
  "pdf-merge": "merge-pdf",
  "pdf-split": "split-pdf",
  "pdf-organize": "organize-pdf",
  "pdf-compress": "compress-pdf",
  "image-to-pdf": "jpg-to-pdf",
  "pdf-to-image": "pdf-to-jpg",
  "p7m-opener": "open-p7m-file",
  "fattura-viewer": "fatturapa-viewer",
  "background-remover": "remove-background",
  "audio-transcribe": "transcribe-audio",
} as const;

const WIDTHS = [375, 1280] as const;
const TOLERANCE_PX = 2;

const rootHeight = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    return document.querySelector("[data-tool-root]")!.getBoundingClientRect().height;
  });

for (const width of WIDTHS) {
  test.describe(`tool shell at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [id, slug] of Object.entries(TOOLS)) {
      test(`${id}: mounting does not change the panel height`, async ({ page }) => {
        // The shell, as first painted: no script may run, so the tool never mounts.
        await page.route("**/*.js", (route) => route.abort());
        await page.goto(`/${slug}/`);
        await expect(page.locator(`[data-tool-root][data-tool-id="${id}"]:not([data-mounted])`)).toHaveCount(1);
        const shell = await rootHeight(page);
        await page.unrouteAll({ behavior: "ignoreErrors" });

        // The mounted tool, once its first render has settled.
        await page.goto(`/${slug}/`);
        await page.locator("[data-tool-root][data-settled]").waitFor({ state: "attached" });
        const mounted = await rootHeight(page);

        expect(
          Math.abs(mounted - shell),
          `shell ${shell.toFixed(1)}px vs mounted ${mounted.toFixed(1)}px (${id} at ${width}px)`,
        ).toBeLessThanOrEqual(TOLERANCE_PX);
      });
    }
  });
}
