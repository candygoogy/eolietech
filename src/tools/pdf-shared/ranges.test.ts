import { describe, expect, it } from "vitest";
import { chunkRanges, parsePageRanges, rangeIndices } from "./ranges";

describe("parsePageRanges", () => {
  it("parses single pages, closed, open-ended and leading ranges", () => {
    expect(parsePageRanges("1-3, 5, 8-", 10)).toEqual({
      ok: true,
      ranges: [
        { start: 1, end: 3 },
        { start: 5, end: 5 },
        { start: 8, end: 10 },
      ],
    });
    expect(parsePageRanges(" -2 ; 4 – 6 ", 10)).toEqual({
      ok: true,
      ranges: [
        { start: 1, end: 2 },
        { start: 4, end: 6 },
      ],
    });
    expect(parsePageRanges("3 7", 10)).toMatchObject({ ok: true, ranges: [{ start: 3 }, { start: 7 }] });
  });

  it("reports empty, syntax, out-of-range and reversed input", () => {
    expect(parsePageRanges("  , ", 5)).toEqual({ ok: false, error: { code: "empty" } });
    expect(parsePageRanges("1-3, abc", 5)).toEqual({ ok: false, error: { code: "syntax", part: "abc" } });
    expect(parsePageRanges("-", 5)).toEqual({ ok: false, error: { code: "syntax", part: "-" } });
    expect(parsePageRanges("2-9", 5)).toEqual({ ok: false, error: { code: "outOfRange", part: "2-9", pages: 5 } });
    expect(parsePageRanges("0", 5)).toMatchObject({ ok: false, error: { code: "outOfRange" } });
    expect(parsePageRanges("4-2", 5)).toEqual({ ok: false, error: { code: "reversed", part: "4-2" } });
  });

  it("chunks and expands ranges", () => {
    expect(chunkRanges(5, 2)).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
      { start: 5, end: 5 },
    ]);
    expect(rangeIndices({ start: 2, end: 4 })).toEqual([1, 2, 3]);
  });
});
