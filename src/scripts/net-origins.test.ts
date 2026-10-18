import { describe, expect, it } from "vitest";
import { foreignOrigins } from "./net-origins";

const PAGE = "https://eolietech.com";
const e = (...names: string[]) => names.map((name) => ({ name }));

describe("foreignOrigins", () => {
  it("is empty when every request went to the page's own origin", () => {
    expect(foreignOrigins(e(`${PAGE}/`, `${PAGE}/_astro/index.js`, `${PAGE}/fonts/a.woff2`), PAGE)).toEqual([]);
  });

  it("ignores data:, blob: and extension-internal URLs (not servers)", () => {
    expect(
      foreignOrigins(e("data:image/png;base64,AAAA", `blob:${PAGE}/1234`, "chrome-extension://abc/inject.js", "about:blank"), PAGE),
    ).toEqual([]);
  });

  it("lists each other origin once, sorted", () => {
    const entries = e(
      `${PAGE}/`,
      "https://gc.kis.v2.scr.kaspersky-labs.com/a.js",
      "https://gc.kis.v2.scr.kaspersky-labs.com/b.css",
      "https://challenges.cloudflare.com/turnstile/v0/api.js",
    );
    expect(foreignOrigins(entries, PAGE)).toEqual(["https://challenges.cloudflare.com", "https://gc.kis.v2.scr.kaspersky-labs.com"]);
  });

  it("treats another port, scheme or subdomain as another origin", () => {
    expect(
      foreignOrigins(e("http://eolietech.com/x", "https://eolietech.com:8443/x", "https://www.eolietech.com/x", "wss://eolietech.com/s"), PAGE),
    ).toEqual(["http://eolietech.com", "https://eolietech.com:8443", "https://www.eolietech.com", "wss://eolietech.com"]);
  });

  it("skips names that are not URLs", () => {
    expect(foreignOrigins(e("", "not a url", `${PAGE}/ok`), PAGE)).toEqual([]);
  });
});
