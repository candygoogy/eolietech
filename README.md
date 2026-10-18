# Eolietech

Free, privacy-first tools for images, PDFs and audio. Everything runs in your browser, so your
files never leave your device, and you can verify that. No ads, no accounts.

Copyright (C) 2026 Francesco Basile.

## The privacy claim, and how to check it

When you open a file in a tool, the page reads it and processes it with code running on your
device, often compiled to WebAssembly. The result is built in the browser and saved to your
downloads. No tool sends your file to a server.

The browser enforces this. Every static page is served with a Content-Security-Policy header
(defined in [`public/_headers`](public/_headers)) that includes `connect-src 'self'`, so scripts on
the page can only open connections (fetch, XHR, WebSockets, beacons) to eolietech.com itself. A
request to any other server is blocked by the browser and logged in the console.

`'self'` still allows requests to eolietech.com. The only server endpoint is the Pro waitlist
(`POST /api/v1/waitlist`, the Hono Worker in `src/worker/`), which accepts an email address. The
tools don't call it. The only third-party script is Cloudflare Turnstile, the spam check on the
waitlist form, and it loads on `/pricing/` only.

[eolietech.com/security](https://eolietech.com/security/) walks through the checks you can do
yourself: read the CSP header (`curl -sI https://eolietech.com/ | grep -i content-security-policy`),
watch the Network panel while a tool processes a file, and go offline after the first file to see
that the next one still works.

## Tools

The registry is `src/tools/registry.ts`. Every tool below has `status: "live"`.

| Tool | URL | Main libraries |
|---|---|---|
| Compress images | `/compress-image/` | jSquash codecs (`@jsquash/jpeg` MozJPEG, `@jsquash/png`, `@jsquash/oxipng`, `@jsquash/webp`, `@jsquash/avif`, `@jsquash/resize`) |
| HEIC to JPG | `/heic-to-jpg/` | `heic-to` (libheif, its CSP build), then jSquash MozJPEG or OxiPNG to encode |
| Merge PDF | `/merge-pdf/` | `pdf-lib` |
| Split PDF | `/split-pdf/` | `pdf-lib` |
| Organize PDF | `/organize-pdf/` | `pdf-lib`, plus `pdfjs-dist` for page thumbnails |
| Compress PDF | `/compress-pdf/` | Ghostscript compiled to WebAssembly (`@okathira/ghostpdl-wasm`, AGPL-3.0) |
| Remove background | `/remove-background/` | BiRefNet lite (512x512, fp16 ONNX) on ONNX Runtime Web (`onnxruntime-web`, installed as a dependency of `@huggingface/transformers`) |
| Transcribe audio | `/transcribe-audio/` | Whisper base (multilingual ONNX) through `@huggingface/transformers` on ONNX Runtime Web |

The image compressor also has ten conversion pages, which are presets of the same tool:
`/webp-to-png/`, `/webp-to-jpg/`, `/png-to-webp/`, `/jpg-to-webp/`, `/png-to-jpg/`,
`/jpg-to-png/`, `/png-to-avif/`, `/jpg-to-avif/`, `/avif-to-jpg/` and `/avif-to-png/`.

When a tool produces several files, `client-zip` builds the zip in the browser. The two AI tools use
WebGPU when the browser has WebGPU, JSPI and a hardware adapter with fp16 shaders; everywhere
else they run on WebAssembly (`src/tools/ai-shared/backend.ts`).

## AI models

The model files are not in this repository. `scripts/fetch-models.mjs` runs before `astro dev` and
`astro build` (see the `dev` and `build` scripts in `package.json`) and:

1. reads `src/tools/ai-shared/models.json`, which pins each file by Hugging Face repo, commit
   revision, path, size and sha256 (`studioludens/birefnet-lite-512` and
   `onnx-community/whisper-base`, both MIT);
2. downloads each file from huggingface.co at that exact revision and fails if the size or sha256
   doesn't match;
3. splits each file into chunks smaller than the 25 MiB per-file limit of Cloudflare static assets
   (20 MiB chunks today) and writes them to `public/models/<id>/` with a `manifest.json`.

`public/models/` is gitignored. A model that is already on disk with matching chunks is left alone
and needs no network, so only the first run downloads (about 210 MiB for both models). In the
browser, `src/tools/ai-shared/model-files.ts` fetches the chunks from eolietech.com, checks each
chunk's sha256 again and keeps them in the Cache API so the next visit doesn't download them. Model
credits and licences are in [NOTICE](NOTICE).

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
npm run og           # render the Open Graph images in public/og/*.png (scripts/og.mjs, Playwright Chromium)
```

Tools marked `status: "planned"` in the registry get no page. To build every tool page locally
(for development only), set `EOLIETECH_ALL_TOOLS=1`.

## Testing

- `npm test` runs vitest in two projects: `unit` (the registry contract and the tools' pure logic,
  in happy-dom) and `worker` (the waitlist API inside workerd, with the D1 migrations applied and
  Turnstile's always-pass test secret).
- `npm run typecheck` runs `astro check` and `tsc` on the Worker.
- `npm run test:e2e` runs Playwright in Chromium and Firefox against `npm run preview` on port
  8787. Playwright starts the preview itself, or reuses one that is already running (outside CI).
  There is no WebKit project, so Safari is not covered.

Check tools on the production build (`npm run preview`), not only in `astro dev`. The dev server
sends none of the headers in `public/_headers`, and the tool pages depend on them: COOP and COEP
make the pages cross-origin isolated (needed for multi-threaded WebAssembly), and the workers in
`/_astro/` must carry COEP too or Chromium refuses to start them. Problems with either only show up
in the production build.

## Contributing

Issues are welcome: bug reports, files a tool handles badly, ideas for new tools.

Code contributions from outside need a signed [Contributor License Agreement](CLA.md) before they
can be merged. You keep the copyright in your work, and your code stays available under the AGPL;
the CLA lets the project also offer it under other licences. On your first pull request a bot posts
a link: sign once and it covers your later pull requests too. For a large change, please open an
issue first.

For security reports, see [SECURITY.md](SECURITY.md). For anything else, write to info@eolietech.com.

## License

The code is licensed under the [GNU AGPL v3.0](LICENSE). The Eolietech name, logo, site copy and
design are all rights reserved; see [TRADEMARK.md](TRADEMARK.md).
