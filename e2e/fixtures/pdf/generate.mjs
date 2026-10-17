// Regenerates the tiny PDF fixtures used by e2e/pdf-tools.spec.ts.
// Run from the repo root: node e2e/fixtures/pdf/generate.mjs
import { writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function make(name, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([300, 400]);
    page.drawText(`${name} page ${i}`, { x: 40, y: 340, size: 18, font });
  }
  doc.setCreationDate(new Date("2026-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2026-01-01T00:00:00Z"));
  await writeFile(new URL(`./${name}.pdf`, import.meta.url), await doc.save());
}

await make("two-pages", 2);
await make("three-pages", 3);
await make("five-pages", 5);
