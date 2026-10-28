import { describe, expect, it } from "vitest";
import { formatDecimalBytes } from "./formats";

describe("formatDecimalBytes", () => {
  it("counts 1 KB as 1000 bytes, with one decimal", () => {
    expect(formatDecimalBytes(999, "en")).toBe("999 B");
    expect(formatDecimalBytes(2_400, "en")).toBe("2.4 KB");
    expect(formatDecimalBytes(19_850, "en")).toBe("19.8 KB");
    expect(formatDecimalBytes(192_300, "en")).toBe("192.3 KB");
    expect(formatDecimalBytes(4_266_483, "en")).toBe("4.2 MB");
  });

  it("rounds down, so a file under a limit never reads as over or equal to it", () => {
    expect(formatDecimalBytes(19_999, "en")).toBe("19.9 KB");
    expect(formatDecimalBytes(20_000, "en")).toBe("20.0 KB");
    expect(formatDecimalBytes(999_999, "en")).toBe("999.9 KB");
  });

  it("uses the page's decimal separator", () => {
    expect(formatDecimalBytes(19_850, "it")).toBe("19,8 KB");
  });
});
