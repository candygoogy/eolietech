import { describe, expect, it } from "vitest";
import { localePath } from "../i18n";
import { publishedTools, toolPages } from "../tools/registry";
import { llmsTxt } from "./llms-txt";

const site = new URL("https://eolietech.com");
const text = llmsTxt(site);

describe("llms.txt", () => {
  it("starts with the site name and a summary line", () => {
    expect(text).toMatch(/^# Eolietech\n\n> \S/);
  });

  it("links every published English tool page and variant", () => {
    for (const tool of publishedTools()) {
      for (const { slug } of toolPages(tool, "en")) expect(text).toContain(`(${new URL(localePath("en", slug), site).href})`);
    }
  });

  it("names preset links by their page heading, not a bare label", () => {
    expect(text).toContain("[Crop to a square](https://eolietech.com/crop-image-square/)");
    expect(text).not.toContain("[Square](");
  });

  it("mentions documents in the summary", () => {
    expect(text.split("\n")[2]).toMatch(/documents/);
  });

  it("has no unresolved dictionary keys", () => {
    expect(text).not.toMatch(/tools\.[a-z-]+\.(name|summary|variant)/);
  });
});
