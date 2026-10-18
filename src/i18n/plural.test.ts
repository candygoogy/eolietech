import { describe, expect, it } from "vitest";
import { interpolate } from "./interpolate";
import { pluralForm, tPlural } from "./plural";

const strings: Record<string, string> = {
  "x.added.one": "Added {count} photo.",
  "x.added.other": "Added {count} photos.",
  "x.threads.one": "WebAssembly, {threads} thread",
  "x.threads.other": "WebAssembly, {threads} threads",
};
const ctx = { locale: "en", t: (key: string, vars?: Record<string, string | number>) => interpolate(strings[key] ?? key, vars) };

describe("plural strings", () => {
  it("picks one for 1 and other for everything else", () => {
    expect([0, 1, 2, 11].map((n) => pluralForm("en", n))).toEqual(["other", "one", "other", "other"]);
    expect(pluralForm("it", 1)).toBe("one");
    // Italian has a "many" category for millions; it falls back to "other".
    expect(pluralForm("it", 1_000_000)).toBe("other");
  });

  it("fills in the count and any other variables", () => {
    expect(tPlural(ctx, "x.added", 1)).toBe("Added 1 photo.");
    expect(tPlural(ctx, "x.added", 3)).toBe("Added 3 photos.");
    expect(tPlural(ctx, "x.threads", 1, { threads: 1 })).toBe("WebAssembly, 1 thread");
    expect(tPlural(ctx, "x.threads", 8, { threads: 8 })).toBe("WebAssembly, 8 threads");
  });
});
