# Contributing to Eolietech

Thanks for helping. Issues are the easiest way in: bug reports, files a tool handles badly, ideas
for new tools. Code is welcome too, with the conditions below.

## Reporting a bug

Open an issue with the bug form. Say which tool (its URL), which browser and device, what you did
and what happened.

**Never attach a personal file.** If a file triggers the bug, try to make a harmless one that does
the same (a blank PDF, a photo of a wall), or describe the file: format, size, pixel or page count,
where it came from (an iPhone, a scanner, an e-invoicing portal).

Security problems go to [SECURITY.md](SECURITY.md), not to a public issue.

## Before you write code

- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Outside contributions need a signed [Contributor License Agreement](CLA.md). You keep the
  copyright and your code stays under the AGPL; a bot posts the link on your first pull request.
- The Eolietech name, logo, copy and design are not covered by the code licence: see
  [TRADEMARK.md](TRADEMARK.md).

## The rules a change has to keep

1. **Files never leave the device.** No tool may send a file, or anything read from a file, to any
   server, including eolietech.com. The CSP in `public/_headers` (`connect-src 'self'`) enforces the
   third-party part; the rest is on us. No analytics, no trackers, no third-party scripts on tool
   pages.
2. **No inline scripts or styles.** The CSP forbids them; Astro is configured not to emit them.
3. **Both languages.** Every user-facing string exists in English and Italian (`src/i18n/*.json`
   and each tool's `content.<locale>.md`). Italian addresses the reader with "tu".
4. **Copy style.** Plain and specific. No em dashes or en dashes in site copy, in either language.
5. **No new dependency** without discussing it in an issue first.

## Setting up

See [Development](README.md#development) in the README. In short: Node from `.node-version`,
`npm install`, `npm run preview` for a production-shaped local site on port 8787.

## Checks before a pull request

```sh
npm run typecheck
npm test
npm run test:e2e   # Chromium, Firefox and WebKit against npm run preview
```

Add or update a test for the behaviour you changed: usually one or two targeted unit tests next to
the code (`*.test.ts`), and an e2e assertion if the change is visible in a tool. Check tool changes
in the production build, not only in `astro dev`: the dev server sends none of the headers the tool
pages depend on.

Keep pull requests focused on one change, and describe what you tested.
