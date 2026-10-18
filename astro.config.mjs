// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import { publishedTools, toolPages } from "./src/tools/registry.ts";

const site = "https://eolietech.com";

/** Sitemap lastmod for tool pages (base + variants), from ToolDef.updated. Other pages get none. */
const toolLastmod = new Map(
  publishedTools().flatMap((tool) => toolPages(tool, "en").map(({ slug }) => [`${site}/${slug}/`, tool.updated])),
);

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
