// Regenerates the Redact PDF fixture used by e2e/pdf-redact.spec.ts.
// Run from the repo root: node e2e/fixtures/pdf/redact/generate.mjs
import { writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const lines = (page, texts) => texts.forEach((text, i) => page.drawText(text, { x: 40, y: 760 - i * 28, size: 14, font }));

lines(doc.addPage([595, 842]), [
  "Customer: Mario Rossi",
  "Email: mario.rossi@example.com",
  "IBAN: IT60 X054 2811 1010 0000 0123 456",
  "Codice fiscale: RSSMRA85T10A562S",
  "Phone: +39 333 123 4567",
]);
lines(doc.addPage([595, 842]), ["Page two mentions Rossi again.", "Nothing else here."]);

doc.setTitle("Mario Rossi personal data");
doc.setCreationDate(new Date("2026-01-01T00:00:00Z"));
doc.setModificationDate(new Date("2026-01-01T00:00:00Z"));
await writeFile(new URL("./personal-data.pdf", import.meta.url), await doc.save());
