import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../i18n/en.json";
import it_ from "../i18n/it.json";

/** Descriptions are cut around 155 to 160 characters in results; the claims that matter come first. */
const MAX_DESCRIPTION = 155;
/** Titles are cut near 60 characters; the longest allowed here keeps room for the longest set we ship. */
const MAX_TITLE = 70;

const TOOLS_DIR = path.resolve(__dirname);
const field = (source: string, key: string): string => {
  const quoted = source.match(new RegExp(`^${key}: (".*")\s*$`, "m"))?.[1];
  if (!quoted) throw new Error(`no ${key}`);
  return JSON.parse(quoted) as string;
};

const pages = fs
  .readdirSync(TOOLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    fs
      .readdirSync(path.join(TOOLS_DIR, d.name))
      .filter((f) => /^content(\.[a-z0-9-]+)?\.[a-z]{2}\.md$/.test(f))
      .map((f) => {
        const source = fs.readFileSync(path.join(TOOLS_DIR, d.name, f), "utf8");
        return { file: `${d.name}/${f}`, title: field(source, "title"), description: field(source, "description") };
      }),
  );

describe("tool page metadata", () => {
  it("finds the content files", () => {
    expect(pages.length).toBeGreaterThan(100);
  });

  it(`keeps every description at ${MAX_DESCRIPTION} characters or fewer`, () => {
    const tooLong = pages.filter((p) => p.description.length > MAX_DESCRIPTION).map((p) => `${p.file} (${p.description.length})`);
    expect(tooLong).toEqual([]);
  });

  it(`keeps every title at ${MAX_TITLE} characters or fewer`, () => {
    const tooLong = pages.filter((p) => p.title.length > MAX_TITLE).map((p) => `${p.file} (${p.title.length})`);
    expect(tooLong).toEqual([]);
  });

  it("uses no em or en dashes in titles and descriptions", () => {
    const bad = pages.filter((p) => /[\u2013\u2014]/.test(p.title + p.description)).map((p) => p.file);
    expect(bad).toEqual([]);
  });
});

describe("site page metadata", () => {
  const dictionaries = { en, it: it_ } as Record<string, Record<string, string>>;
  const keys = ["site", "home", "tools", "pricing", "about", "security", "guide", "privacy", "terms"].flatMap((page) =>
    page === "site" ? ["site.description"] : page === "home" ? ["home.title"] : [`${page}.title`, `${page}.description`],
  );

  for (const [locale, dict] of Object.entries(dictionaries)) {
    it(`keeps ${locale} titles and descriptions within the limits`, () => {
      const bad = keys.filter((k) => {
        const value = dict[k];
        if (typeof value !== "string") return true;
        if (/[\u2013\u2014]/.test(value)) return true;
        return k.endsWith(".description") ? value.length > MAX_DESCRIPTION : value.length > MAX_TITLE;
      });
      expect(bad).toEqual([]);
    });
  }
});
