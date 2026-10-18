/** Every locale's dictionary must stay in step with English: same keys, same placeholders. */
import { describe, expect, it } from "vitest";
import { GLYPHS } from "../lib/hand-glyphs";
import en from "./en.json";
import itDict from "./it.json";

const dictionaries: Record<string, Record<string, string>> = { it: itDict };
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
/** Drawn by Handwriting.astro, which only has GLYPHS for a few letters. */
const HANDWRITTEN = ["home.desk.hello", "footer.signoff", "waitlist.card.hand"];

describe.each(Object.entries(dictionaries))("%s.json", (_locale, dict) => {
  it("has exactly the English keys", () => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
  });

  it("keeps every placeholder of the English string", () => {
    for (const [key, value] of Object.entries(en as Record<string, string>)) {
      expect(placeholders(dict[key] ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("uses no em or en dashes as punctuation", () => {
    for (const [key, value] of Object.entries(dict)) expect(value, key).not.toMatch(/[—–]/);
  });

  it("writes handwritten lines only with letters the hand has", () => {
    for (const key of HANDWRITTEN) {
      for (const ch of dict[key] ?? "") expect(GLYPHS[ch], `${key}: no glyph for "${ch}"`).toBeDefined();
    }
  });
});
