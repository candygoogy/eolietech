/**
 * Every published tool and variant page links /og/<slug>.png (/og/it/<slug>.png in Italian;
 * src/views/ToolPage.astro), and every other page /og/default.png or /og/it/default.png (Base.astro). A new tool or variant without its image fails here:
 * run `npm run og` (scripts/og.mjs) and commit public/og/.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publishedTools, toolPages } from "../tools/registry";
import { LOCALES } from "../tools/types";

const ogDir = path.resolve(__dirname, "../../public/og");
const prefix = (locale: string) => (locale === "en" ? "" : `${locale}/`);
const files = LOCALES.flatMap((locale) => [
  `${prefix(locale)}default.png`,
  ...publishedTools().flatMap((tool) => toolPages(tool, locale).map((p) => `${prefix(locale)}${p.slug}.png`)),
]);

/** Width and height from a PNG's IHDR chunk. */
function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(1, 4).toString("latin1"), "PNG signature").toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("Open Graph images", () => {
  it.each(files)("public/og/%s exists, is 1200x630 and under 150 KB", (file) => {
    const p = path.join(ogDir, file);
    expect(fs.existsSync(p), `public/og/${file} missing: run npm run og`).toBe(true);
    const buf = fs.readFileSync(p);
    expect(pngSize(buf)).toEqual({ width: 1200, height: 630 });
    expect(buf.length).toBeLessThan(150 * 1024);
  });
});
