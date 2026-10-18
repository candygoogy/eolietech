/**
 * Open Graph images: `npm run og` writes 1200x630 PNGs to public/og/ (commit them).
 *   default.png    site-wide card (home and every page without its own)
 *   <slug>.png     one per published tool and variant page (src/views/ToolPage.astro links /og/<slug>.png)
 *   it/...         the same for Italian pages (/og/it/default.png, /og/it/<slug>.png)
 * A vitest (src/lib/og-images.test.ts) fails when a published page has no image: run this again
 * after adding a tool or variant, or after changing an H1.
 *
 * The card is the back of the site's footer postcard, lying on a desk with a picture postcard of
 * Stromboli under it: airmail edge, the page's H1 in Archivo where the message goes, the stamp and
 * a "not sent" postmark, and the page's address written on the address lines. Fonts from
 * public/fonts, colours from src/styles/tokens.css (light theme). Rendered in the Playwright
 * Chromium already installed for the e2e tests; dev-time only, nothing here ships.
 *
 * Needs Node >= 22.18 (it imports src/tools/registry.ts, whose only import is type-only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "og");
const MAX_BYTES = 150 * 1024;

const { publishedTools, toolPages } = await import(new URL("../src/tools/registry.ts", import.meta.url).href);
const LOCALES = ["en", "it"];
/** English lives at the root of public/og/ and of the site; other locales in a folder of their own. */
const prefix = (locale) => (locale === "en" ? "" : `${locale}/`);
const dicts = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(path.join(root, `src/i18n/${l}.json`), "utf8"))]));
const t = (locale, key) => {
  if (!(key in dicts[locale])) throw new Error(`Missing string ${key} in src/i18n/${locale}.json`);
  return dicts[locale][key];
};

/** The H1 from a content file's frontmatter (always a double-quoted YAML string in this repo). */
function contentH1(toolId, variantId, locale) {
  const file = path.join(root, "src/tools", toolId, variantId ? `content.${variantId}.${locale}.md` : `content.${locale}.md`);
  const m = /^h1:\s*("(?:[^"\\]|\\.)*")\s*$/m.exec(fs.readFileSync(file, "utf8"));
  if (!m) throw new Error(`No double-quoted h1 in ${path.relative(root, file)}`);
  return JSON.parse(m[1]);
}

const cards = LOCALES.flatMap((locale) => [
  { locale, file: `${prefix(locale)}default.png`, name: t(locale, "home.h1"), line: t(locale, "og.default.line"), address: [] },
  ...publishedTools().flatMap((tool) =>
    toolPages(tool, locale).map((page) => ({
      locale,
      file: `${prefix(locale)}${page.slug}.png`,
      name: contentH1(tool.id, page.variant?.id, locale),
      line: t(locale, "og.line"),
      address: [`/${prefix(locale)}${page.slug}/`],
    })),
  ),
]);

const font = (file) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, "public/fonts", file)).toString("base64")}`;
const logo = fs.readFileSync(path.join(root, "public/logo.svg"), "utf8").replace(/<svg /, '<svg class="logo" aria-hidden="true" ');
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* The picture side (same drawing as the home desk postcard, Desk.astro; colours from components.css). */
const picture = `
<svg viewBox="0 0 300 196" aria-hidden="true">
  <rect fill="#fbe48a" width="300" height="196"/>
  <rect fill="#fdf1bf" y="92" width="300" height="60"/>
  <circle fill="#f39a6e" cx="236" cy="138" r="24"/>
  <path fill="none" stroke="#fffaf0" stroke-width="7" stroke-linecap="round" d="M120 52c4-12 18-16 26-8 8-12 28-10 32 2 12-4 22 6 16 16"/>
  <path fill="#2b2b30" d="M14 152 98 68q6-6 13-6h12q7 0 13 6l82 84z"/>
  <path fill="#3b3b42" d="M123 62q7 0 13 6l82 84h-58z"/>
  <path fill="none" stroke="#e0623a" stroke-width="2.5" stroke-linecap="round" d="M130 70c9 18 15 36 30 62"/>
  <circle fill="#e0623a" cx="117" cy="58" r="5.5"/>
  <circle fill="#e0623a" cx="107" cy="44" r="2"/>
  <circle fill="#e0623a" cx="128" cy="41" r="1.6"/>
  <rect fill="#3fa7b9" y="148" width="300" height="48"/>
  <path fill="none" stroke="#8ed2e0" stroke-width="3" stroke-linecap="round" d="M18 164h42M92 174h56M176 186h30M250 184h34M36 186h26"/>
  <path fill="none" stroke="#fbe48a" stroke-width="3" stroke-linecap="round" d="M218 160h36M226 170h20"/>
  <path fill="#fffdf8" d="M62 142v-24l14 22z"/>
  <path fill="#2b2b30" d="M52 144h30l-4 6H56z"/>
</svg>`;

/* The stamp: the logo mark printed edge to edge (Logo.astro, mark only). */
const mark = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <path fill="#f6cf2c" d="M0 0h64v46H0z"/>
  <path fill="#1d1d1f" d="M5 47 26.5 16h11L59 47z"/>
  <path fill="#3fa7b9" d="M0 44h64v20H0z"/>
  <circle fill="#b5441c" cx="32" cy="8.5" r="4"/>
</svg>`;

const page = (card) => `<!doctype html>
<html lang="${card.locale}"><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo"; src: url(${font("archivo-var-latin.woff2")}) format("woff2"); font-weight: 500 800; font-stretch: 100% 125%; }
@font-face { font-family: "Atkinson"; src: url(${font("atkinson-hyperlegible-next-var-latin.woff2")}) format("woff2"); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body {
  position: relative;
  background: #fff url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="1.5" fill="#e8e8ed"/></svg>')}");
  color: #1d1d1f;
  font-family: "Atkinson", sans-serif;
}
.picture {
  position: absolute; left: 718px; top: 254px; width: 520px; height: 340px;
  padding: 14px; background: #fffdf8; rotate: 7deg;
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.06), 0 6px 14px -4px rgb(0 0 0 / 0.16), 0 18px 32px -16px rgb(0 0 0 / 0.18);
}
.picture svg { display: block; width: 100%; height: 100%; }
.card {
  position: absolute; left: 52px; top: 44px; width: 1000px; height: 520px; rotate: -1.5deg;
  display: grid; grid-template-columns: minmax(0, 1fr) 2px 330px;
  border: 12px solid transparent; border-radius: 6px;
  background:
    linear-gradient(#f5f5f7 0 0) padding-box,
    repeating-linear-gradient(-45deg, #0a5a6e 0 17px, #fff 17px 25px, #f6cf2c 25px 42px, #fff 42px 50px) border-box;
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.06), 0 10px 22px -6px rgb(0 0 0 / 0.18), 0 26px 44px -20px rgb(0 0 0 / 0.2);
}
.message { display: flex; flex-direction: column; padding: 46px 40px 40px 48px; }
.name {
  font-family: "Archivo", sans-serif; font-weight: 800; font-stretch: 125%;
  font-size: 96px; line-height: 1; letter-spacing: -0.028em; text-wrap: balance;
}
.line { margin-top: 26px; font-size: 27px; line-height: 1.3; color: #333336; max-width: 22em; text-wrap: balance; }
.logo { display: block; flex: none; align-self: flex-start; margin-top: auto; height: 34px; width: 214px; }
.divider { background: #d2d2d7; margin: 40px 0; }
.address { position: relative; padding: 40px 44px 40px 34px; display: flex; flex-direction: column; }
.postage {
  align-self: flex-end; width: 118px; padding: 7px; background: #fffdf8; rotate: 2deg;
  --perf: 3.5px;
  mask:
    radial-gradient(var(--perf), #0000 98%, #000) round calc(-1.5 * var(--perf)) calc(-1.5 * var(--perf)) / calc(3 * var(--perf)) calc(3 * var(--perf)),
    linear-gradient(#000 0 0) no-repeat 50% / calc(100% - 3 * var(--perf)) calc(100% - 3 * var(--perf));
}
.postage svg { display: block; width: 100%; height: auto; }
.postmark {
  position: absolute; top: 58px; right: 132px; rotate: -8deg;
  display: grid; place-content: center; gap: 6px; width: 132px; height: 132px; padding: 12px;
  border: 3px solid #0a5a6e; border-radius: 50%; outline: 1.5px solid #0a5a6e; outline-offset: -8px;
  color: #0a5a6e; text-align: center; text-transform: uppercase; line-height: 1;
  font-family: "Archivo", sans-serif; font-stretch: 112%; font-weight: 800; letter-spacing: 0.06em;
  filter: url(#ink-edge);
}
.postmark b { font-size: 21px; font-weight: 800; }
.postmark small { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; }
.lines { margin-top: auto; }
.lines p {
  height: 58px; padding-top: 18px; border-bottom: 2px solid #d2d2d7;
  font-size: 25px; line-height: 1.3; white-space: nowrap; overflow: hidden;
}
.lines p:first-child { font-weight: 700; }
</style></head>
<body>
  <svg width="0" height="0" style="position:absolute">
    <filter id="ink-edge" x="-6%" y="-12%" width="112%" height="124%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="grain"/>
      <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="edge"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="3" result="blots"/>
      <feColorMatrix in="blots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.85" result="take"/>
      <feComposite in="edge" in2="take" operator="in"/>
    </filter>
  </svg>
  <div class="picture">${picture}</div>
  <div class="card">
    <div class="message">
      <p class="name">${esc(card.name)}</p>
      <p class="line">${esc(card.line)}</p>
      ${logo}
    </div>
    <div class="divider"></div>
    <div class="address">
      <span class="postage">${mark}</span>
      <p class="postmark"><b>${esc(t(card.locale, "footer.postmark"))}</b><small>${esc(t(card.locale, "footer.postmark.place"))}</small></p>
      <div class="lines">
        <p>eolietech.com</p>
        ${[...card.address, "", ""].slice(0, 2).map((a) => `<p>${esc(a)}</p>`).join("")}
      </div>
    </div>
  </div>
</body></html>`;

/**
 * Largest name size (104px down to 56px) at which the H1 takes three lines at most, no word runs
 * past the message side, and the line and the logo still fit under it.
 */
async function fitName(tab) {
  return tab.evaluate(() => {
    const name = document.querySelector(".name");
    const message = document.querySelector(".message");
    for (let size = 104; size >= 56; size -= 2) {
      name.style.fontSize = `${size}px`;
      const lines = Math.round(name.getBoundingClientRect().height / size);
      if (lines <= 3 && name.scrollWidth <= name.clientWidth && message.scrollHeight <= message.clientHeight) {
        return { size, lines };
      }
    }
    throw new Error(`"${name.textContent}" does not fit the card`);
  });
}

for (const l of LOCALES) fs.mkdirSync(path.join(outDir, prefix(l)), { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const report = [];
try {
  for (const card of cards) {
    await tab.setContent(page(card), { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    const fit = await fitName(tab);
    const file = path.join(outDir, card.file);
    await tab.screenshot({ path: file, type: "png", animations: "disabled" });
    const bytes = fs.statSync(file).size;
    report.push({ file: card.file, kb: +(bytes / 1024).toFixed(1), size: fit.size, lines: fit.lines });
    if (bytes > MAX_BYTES) throw new Error(`${card.file} is ${bytes} bytes (limit ${MAX_BYTES})`);
  }
} finally {
  await browser.close();
}

// Images for pages that no longer exist would otherwise linger in public/ and ship.
const keep = new Set(cards.map((c) => c.file));
for (const l of LOCALES) {
  for (const name of fs.readdirSync(path.join(outDir, prefix(l)))) {
    const f = `${prefix(l)}${name}`;
    if (f.endsWith(".png") && !keep.has(f)) {
      fs.rmSync(path.join(outDir, f));
      console.log(`removed stale public/og/${f}`);
    }
  }
}

console.table(report);
console.log(`${report.length} images in public/og/, largest ${Math.max(...report.map((r) => r.kb))} KB`);
