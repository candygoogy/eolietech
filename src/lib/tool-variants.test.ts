import { afterEach, describe, expect, it, vi } from "vitest";
import { getTool, publishedTools } from "../tools/registry";
import { LOCALES } from "../tools/types";
import { formatName, variantLinks } from "./tool-variants";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("variantLinks", () => {
  it("labels format converters by their formats and links their pages", () => {
    const { converters, presets } = variantLinks(getTool("image-compress")!, "en");
    expect(presets).toEqual([]);
    expect(converters).toHaveLength(10);
    expect(converters[0]).toEqual({ id: "webp-to-png", href: "/webp-to-png/", label: "WebP to PNG" });
    expect(variantLinks(getTool("image-compress")!, "it").converters[0]).toEqual({
      id: "webp-to-png",
      href: "/it/webp-in-png/",
      label: "WebP in PNG",
    });
  });

  it("labels presets from the dictionary, per locale", () => {
    expect(variantLinks(getTool("image-resize")!, "en").presets).toEqual([
      { id: "for-email", href: "/resize-image-for-email/", label: "For email" },
      { id: "for-instagram", href: "/resize-image-for-instagram/", label: "For Instagram" },
    ]);
    expect(variantLinks(getTool("image-resize")!, "it").presets[0]).toEqual({
      id: "for-email",
      href: "/it/ridimensionare-immagini-per-email/",
      label: "Per email",
    });
  });

  it("returns nothing for a tool without variants", () => {
    expect(variantLinks(getTool("pdf-merge")!, "en")).toEqual({ converters: [], presets: [] });
  });

  it("links no page of a tool that is not published", () => {
    vi.stubEnv("EOLIETECH_ALL_TOOLS", "");
    // Taken back to "planned" for this test only (registry entries are plain objects).
    const planned = getTool("exif-remover")!;
    planned.status = "planned";
    try {
      expect(variantLinks(planned, "en")).toEqual({ converters: [], presets: [] });
      vi.stubEnv("EOLIETECH_ALL_TOOLS", "1");
      expect(variantLinks(planned, "en").presets.map((p) => p.id)).toEqual(["location"]);
    } finally {
      planned.status = "live";
    }
  });

  it("gives every published variant a real label in every locale", () => {
    for (const tool of publishedTools()) {
      for (const locale of LOCALES) {
        const { converters, presets } = variantLinks(tool, locale);
        for (const link of [...converters, ...presets]) {
          expect(link.label, `${tool.id}/${link.id} (${locale})`).not.toMatch(/undefined|[{}]|^tools\./);
        }
      }
    }
  });
});

describe("formatName", () => {
  it("writes WebP in mixed case and other formats in capitals", () => {
    expect(formatName("webp")).toBe("WebP");
    expect(formatName("avif")).toBe("AVIF");
  });
});
