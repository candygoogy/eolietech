#!/usr/bin/env node
/**
 * Rebuilds the OCR fixtures in this folder (committed; run only to change them):
 *
 *   node e2e/fixtures/document/ocr/make-fixtures.mjs
 *
 * - english.png / italian.png: a few lines of plain printed text, drawn by Chromium (Playwright)
 *   in Arial on white, the way a screenshot looks.
 * - scan.pdf: page 1 is english.png placed as an image (no text in the PDF at all, like a scan);
 *   page 2 has real text ("Already searchable page"), which the tool must keep and not re-read.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const DIR = path.dirname(fileURLToPath(import.meta.url));

const TEXTS = {
  english: ["Invoice number 4821", "The quick brown fox jumps over the lazy dog.", "Payment due within thirty days."],
  italian: ["Fattura numero 4821", "Perché la città è più bella di sera?", "Pagamento entro trenta giorni."],
};

const html = (lines) => `<!doctype html><html><body style="margin:0;background:#fff">
<div id="page" style="display:inline-block;padding:48px 56px;font:32px/1.6 Arial,Helvetica,sans-serif;color:#111;background:#fff">
${lines.map((l) => `<p style="margin:0">${l}</p>`).join("\n")}
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shots = {};
for (const [name, lines] of Object.entries(TEXTS)) {
  await page.setContent(html(lines));
  shots[name] = await page.locator("#page").screenshot({ type: "png" });
  await writeFile(path.join(DIR, `${name}.png`), shots[name]);
}
await browser.close();

const doc = await PDFDocument.create({ updateMetadata: false });
const image = await doc.embedPng(shots.english);
const scanned = doc.addPage([612, 792]);
const width = 500;
const height = (image.height / image.width) * width;
scanned.drawImage(image, { x: 56, y: 792 - 72 - height, width, height });
const typed = doc.addPage([612, 792]);
typed.drawText("Already searchable page", { x: 72, y: 700, size: 18, font: await doc.embedFont(StandardFonts.Helvetica) });
await writeFile(path.join(DIR, "scan.pdf"), await doc.save());
console.log("OCR fixtures written to", DIR);
