// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { localePath } from "./src/i18n/index.ts";
import { publishedTools, toolPages } from "./src/tools/registry.ts";

const site = "https://eolietech.com";

/** Sitemap lastmod for tool pages (base + variants, every locale), from ToolDef.updated. Other pages get none. */
const toolLastmod = new Map(
  publishedTools().flatMap((tool) =>
    tool.locales.flatMap((locale) => toolPages(tool, locale).map(({ slug }) => [`${site}${localePath(locale, slug)}`, tool.updated])),
  ),
);

/**
 * Cloudflare serves the nearest 404.html for a missing asset. Astro only writes the root 404 as a file
 * (dist/404.html); the Italian one comes out as dist/it/404/index.html, so move it next to the pages.
 */
/** @type {import("astro").AstroIntegration} */
const localized404 = {
  name: "localized-404",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const from = new URL("it/404/index.html", dir);
      if (!fs.existsSync(from)) return;
      fs.renameSync(from, new URL("it/404.html", dir));
      fs.rmSync(new URL("it/404/", dir), { recursive: true });
    },
  },
};

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
    // The CSP in public/_headers has no 'unsafe-inline': never inline CSS.
    inlineStylesheets: "never",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "it"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    localized404,
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", it: "it" } },
      serialize(item) {
        const lastmod = toolLastmod.get(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  devToolbar: { enabled: false },
  vite: {
    resolve: {
      // transformers.js imports "onnxruntime-web/webgpu", whose bundled build makes Vite emit the 25.6 MiB
      // asyncify wasm (over the 25 MiB asset limit). Use ORT's extern-wasm build; the AI tools pass their own wasm URLs.
      alias: { "onnxruntime-web/webgpu": fileURLToPath(new URL("./node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs", import.meta.url)) },
    },
    build: {
      // 0 = never inline assets. Astro also uses this limit to decide whether to
      // inline small <script> bundles into HTML, which the CSP would block.
      assetsInlineLimit: 0,
    },
    server: {
      // `npm run dev` + `npm run dev:api`: forward API calls to wrangler dev.
      proxy: { "/api": "http://localhost:8787" },
    },
  },
});
