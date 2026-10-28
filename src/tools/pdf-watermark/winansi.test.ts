// @vitest-environment node
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { cleanText, isWinAnsi, showChar, unencodable } from "./winansi";

describe("WinAnsi check", () => {
  it("matches pdf-lib's own Helvetica encoder for every code point up to U+FFFF", async () => {
    const doc = await PDFDocument.create();
    const font = doc.embedStandardFont(StandardFonts.HelveticaBold);
    const mismatches: string[] = [];
    for (let cp = 0; cp <= 0xffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      let ok = true;
      try {
        font.encodeText(String.fromCodePoint(cp));
      } catch {
        ok = false;
      }
      if (ok !== isWinAnsi(cp)) mismatches.push(cp.toString(16));
    }
    expect(mismatches).toEqual([]);
  });

  it("names each character it can't draw once, in order, astral ones whole", () => {
    expect(unencodable("CONFIDENTIAL")).toEqual([]);
    expect(unencodable("BOZZA è già «ok» € …")).toEqual([]);
    expect(unencodable("Approvato ✓ 漢字 ✓ 🙂")).toEqual(["✓", "漢", "字", "🙂"]);
    expect(unencodable("Ł")).toEqual(["Ł"]);
  });

  it("shows invisible characters by their code", () => {
    expect(showChar("✓")).toBe("✓");
    expect(showChar("🙂")).toBe("🙂");
    expect(showChar("​")).toBe("U+200B");
    expect(showChar("\u0007")).toBe("U+0007");
  });

  it("cleans the text to one composed line", () => {
    expect(cleanText("  Copy\tfor\n Mario   Rossi ")).toBe("Copy for Mario Rossi");
    expect(cleanText("café")).toBe("café");
    expect(unencodable(cleanText("café"))).toEqual([]);
  });
});
