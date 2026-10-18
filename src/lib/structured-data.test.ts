import { describe, expect, it } from "vitest";
import { breadcrumbs, graph, organization, serializeJsonLd, webApplication, website } from "./structured-data";

const site = new URL("https://eolietech.com");
const isAbsolute = (u: unknown) => typeof u === "string" && /^https:\/\/eolietech\.com\//.test(u);

/** Every string value under a key that holds a URL, anywhere in the tree. */
function urls(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => urls(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (["url", "item", "logo", "image", "@id"].includes(k) && typeof v === "string") out.push(v);
      else urls(v, out);
    }
  }
  return out;
}

describe("structured data", () => {
  const home = graph([
    organization({ site, name: "Eolietech", logoPath: "/icon-512.png", sameAs: ["https://github.com/candygoogy/eolietech"] }),
    website({ site, name: "Eolietech", description: "Tools.", inLanguage: "en" }),
  ]);
  const tool = graph([
    webApplication({
      site,
      name: "WebP to PNG converter",
      description: "Turn WebP into PNG.",
      path: "/webp-to-png/",
      category: "image",
      inLanguage: "en",
      imagePath: "/og/webp-to-png.png",
      publisherName: "Eolietech",
    }),
    breadcrumbs(site, [
      { name: "Home", path: "/" },
      { name: "Tools", path: "/tools/" },
      { name: "Compress images", path: "/compress-image/" },
      { name: "WebP to PNG converter", path: "/webp-to-png/" },
    ]),
  ]);

  it("describes the home as an Organization and a WebSite", () => {
    expect(home["@context"]).toBe("https://schema.org");
    const [org, web] = home["@graph"] as Record<string, unknown>[];
    expect(org).toMatchObject({ "@type": "Organization", name: "Eolietech", url: "https://eolietech.com/" });
    expect(org!.logo).toBe("https://eolietech.com/icon-512.png");
    expect(org!.sameAs).toEqual(["https://github.com/candygoogy/eolietech"]);
    expect(web).toMatchObject({ "@type": "WebSite", url: "https://eolietech.com/", publisher: { "@id": org!["@id"] } });
  });

  it("describes a tool page as a free WebApplication with breadcrumbs", () => {
    const [app, trail] = tool["@graph"] as Record<string, unknown>[];
    expect(app).toMatchObject({
      "@type": "WebApplication",
      name: "WebP to PNG converter",
      url: "https://eolietech.com/webp-to-png/",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    });
    expect(app!.browserRequirements).toEqual(expect.any(String));
    expect(trail!["@type"]).toBe("BreadcrumbList");
    const items = trail!.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items.map((i) => i.item)).toEqual([
      "https://eolietech.com/",
      "https://eolietech.com/tools/",
      "https://eolietech.com/compress-image/",
      "https://eolietech.com/webp-to-png/",
    ]);
  });

  it("uses absolute URLs only", () => {
    const all = [...urls(home), ...urls(tool)];
    expect(all.length).toBeGreaterThan(8);
    for (const u of all) expect(isAbsolute(u), u).toBe(true);
  });

  it("never claims ratings or reviews", () => {
    const json = JSON.stringify([home, tool]);
    expect(json).not.toMatch(/aggregateRating|"review"|ratingValue/i);
  });

  it("serializes safely for a <script> data block", () => {
    const name = `</script><!-- & ${String.fromCharCode(0x2028)}`;
    const out = serializeJsonLd({ name });
    for (const ch of ["<", ">", "&", String.fromCharCode(0x2028)]) expect(out).not.toContain(ch);
    expect(JSON.parse(out)).toEqual({ name });
  });
});
