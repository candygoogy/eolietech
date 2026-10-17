# Eolietech

Free, privacy-first tools for images, PDFs and audio. Everything runs in your browser, so your
files never leave your device, and you can verify that. No ads, no accounts.

Copyright (C) 2026 Francesco Basile.

## Stack

- [Astro](https://astro.build) static site with plain-TypeScript tool islands (`src/tools/<id>/client.ts`)
- One [Hono](https://hono.dev) Worker for `/api/*` (`src/worker/`), deployed with static assets on Cloudflare Workers
- Tool registry: `src/tools/registry.ts`. Page copy: `src/tools/<id>/content[.<variant>].<locale>.md`

## Development

Requires Node 22.12+.

```sh
npm install
cp .dev.vars.example .dev.vars   # Turnstile test secret for local dev

npm run dev          # Astro dev server (proxies /api to :8787)
npm run dev:api      # wrangler dev (Worker + local D1); run `npm run build` first for assets
npm run preview      # production-shaped: astro build + wrangler dev on :8787
npm run typecheck    # astro check + Worker tsc
npm test             # vitest: unit (registry contract) + worker (workerd)
npm run test:e2e     # Playwright smoke tests (chromium + firefox) against `npm run preview`
```

Tools marked `status: "planned"` in the registry get no page. To build every tool page locally
(for development only), set `EOLIETECH_ALL_TOOLS=1`.

## License

The code is licensed under the [GNU AGPL v3.0](LICENSE). The Eolietech name, logo, site copy and
design are all rights reserved; see [TRADEMARK.md](TRADEMARK.md).
