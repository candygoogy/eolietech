/** Registry contract test: the registry, the tool folders and the shared config must agree. */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentFileName } from "./content-files";
import { localePath } from "../i18n";
import { toolPages, tools } from "./registry";
import { LOCALES } from "./types";

const toolsDir = path.resolve(__dirname);
const headers = fs.readFileSync(path.resolve(__dirname, "../../public/_headers"), "utf8");

describe("tool registry", () => {
  it("has unique ids", () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(tools.map((t) => [t.id, t] as const))("%s has a client.ts and content per declared locale", (id, tool) => {
    expect(fs.existsSync(path.join(toolsDir, id, "client.ts")), `${id}/client.ts`).toBe(true);
    expect(tool.locales.length).toBeGreaterThan(0);
    for (const locale of tool.locales) {
      expect(tool.slug[locale], `${id} slug.${locale}`).toBeTruthy();
      expect(fs.existsSync(path.join(toolsDir, id, contentFileName(locale))), `${id} ${locale} content`).toBe(true);
      for (const v of tool.variants ?? []) {
        if (!v.slug[locale]) continue;
        const file = contentFileName(locale, v.id);
        expect(fs.existsSync(path.join(toolsDir, id, file)), `${id}/${file}`).toBe(true);
      }
    }
  });

  it("has unique variant ids within each tool", () => {
    for (const tool of tools) {
      const ids = (tool.variants ?? []).map((v) => v.id);
      expect(new Set(ids).size, tool.id).toBe(ids.length);
    }
  });

  it("has no slug collisions across tools and variants (per locale)", () => {
    for (const locale of LOCALES) {
      const seen = new Map<string, string>();
      for (const tool of tools) {
        const entries: [slug: string | undefined, owner: string][] = [
          [tool.slug[locale], tool.id],
          ...(tool.variants ?? []).map((v): [string | undefined, string] => [v.slug[locale], `${tool.id}/${v.id}`]),
        ];
        for (const [slug, owner] of entries) {
          if (!slug) continue;
          expect(seen.get(slug), `slug "${slug}" (${locale}) used by ${owner} and ${seen.get(slug)}`).toBeUndefined();
          seen.set(slug, owner);
        }
      }
    }
  });

  it("only references existing related ids (and never itself)", () => {
    const ids = new Set(tools.map((t) => t.id));
    for (const tool of tools) {
      for (const r of tool.related) {
        expect(ids.has(r), `${tool.id} -> ${r}`).toBe(true);
        expect(r).not.toBe(tool.id);
      }
    }
  });

  it("has no content files for unknown tools, variants or undeclared locales", () => {
    for (const dir of fs.readdirSync(toolsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      // Shared helper folders (e.g. pdf-shared) hold code only: no page, no client, no copy.
      if (dir.name.endsWith("-shared")) {
        const files = fs.readdirSync(path.join(toolsDir, dir.name));
        expect(files.filter((f) => f === "client.ts" || f.startsWith("content")), `src/tools/${dir.name}`).toEqual([]);
        continue;
      }
      const tool = tools.find((t) => t.id === dir.name);
      expect(tool, `folder src/tools/${dir.name} has no registry entry`).toBeDefined();
      for (const file of fs.readdirSync(path.join(toolsDir, dir.name))) {
        const m = /^content(?:\.([a-z0-9-]+))?\.([a-z]{2})\.md$/.exec(file);
        if (!m) continue;
        const [, variantId, locale] = m;
        expect(tool!.locales, `${dir.name}/${file}: locale not declared`).toContain(locale);
        if (variantId) expect(tool!.variants?.some((v) => v.id === variantId), `${dir.name}/${file}`).toBe(true);
      }
    }
  });

  it("gives every tool and variant page, in every locale, cross-origin isolation in public/_headers", () => {
    for (const tool of tools) {
      for (const locale of tool.locales) {
        for (const { slug } of toolPages(tool, locale)) {
          const p = localePath(locale, slug);
          expect(headers, `${p} missing in public/_headers`).toMatch(
            new RegExp(String.raw`^${p}\r?\n\s+Cross-Origin-Embedder-Policy: credentialless`, "m"),
          );
        }
      }
    }
  });
});
