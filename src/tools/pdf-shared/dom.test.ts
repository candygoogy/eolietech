import { afterEach, describe, expect, it, vi } from "vitest";
import { ENTER_MS } from "../../lib/tool-ui";
import en from "../../i18n/en.json";
import { interpolate } from "../../i18n/interpolate";
import { entryTracker, errorMessage } from "./dom";
import { PdfToolError } from "./pdf-errors";

describe("entryTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("plays the entry for a key once, carries it over a quick rebuild and never replays it", () => {
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const enter = entryTracker();

    const first = document.createElement("li");
    enter(1, first);
    expect(first.hasAttribute("data-enter")).toBe(true);
    expect(first.style.transitionDelay).toBe("");

    // Rebuilt in the same moment (before it could paint): the new row simply enters.
    const same = document.createElement("li");
    enter(1, same);
    expect(same.hasAttribute("data-enter")).toBe(true);
    expect(same.style.transitionDelay).toBe("");

    // Rebuilt 60ms in: the new row continues the entry from 60ms.
    now += 60;
    const later = document.createElement("li");
    enter(1, later);
    expect(later.hasAttribute("data-enter")).toBe(true);
    expect(later.style.transitionDelay).toBe("-60ms");
    vi.advanceTimersByTime(ENTER_MS);
    expect(later.hasAttribute("data-enter")).toBe(false);
    expect(later.style.transitionDelay).toBe("");

    // After the entry window: a re-render shows the row as it is.
    now += ENTER_MS;
    const settled = document.createElement("li");
    enter(1, settled);
    expect(settled.hasAttribute("data-enter")).toBe(false);

    // A different key is new.
    const other = document.createElement("li");
    enter(2, other);
    expect(other.hasAttribute("data-enter")).toBe(true);
  });
});

describe("errorMessage", () => {
  // The island's t(): shared tool.* strings from en.json, as [tool].astro ships them.
  const strings = en as Record<string, string>;
  const t = (key: string, vars?: Record<string, string | number>) => interpolate(strings[key] ?? key, vars);

  it("maps every PDF error code to a shared en.json string with the file name", () => {
    for (const code of ["encrypted", "invalid", "empty"] as const) {
      const msg = errorMessage(new PdfToolError(code), { t }, "a.pdf");
      expect(msg).toBe(interpolate(strings[`tool.pdf.error.${code}`]!, { name: "a.pdf" }));
      expect(msg).toContain("a.pdf");
    }
  });

  it("falls back to the generic failure string for unknown errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(errorMessage(new Error("boom"), { t }, "b.pdf")).toBe("Something went wrong while processing b.pdf.");
  });
});
