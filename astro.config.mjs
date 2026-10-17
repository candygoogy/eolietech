// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://eolietech.com",
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
    }),
  ],
  devToolbar: { enabled: false },
  vite: {
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
