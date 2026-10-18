/** Error type + PDF sniffing shared by the PDF tools. Dependency-free (kept out of the pdf-lib chunk). */

export type PdfErrorCode = "encrypted" | "invalid" | "empty";

/** A load/processing failure with a code the UI maps to a friendly, translated message (shared string tool.pdf.error.<code> in src/i18n/en.json). */
export class PdfToolError extends Error {
  constructor(public readonly code: PdfErrorCode) {
    super(`pdf: ${code}`);
    this.name = "PdfToolError";
  }
}

/** Does the buffer start (within the first KiB, as PDF readers allow) with a "%PDF-" header? */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 1024) - 5;
  for (let i = 0; i <= end; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) {
      return true;
    }
  }
  return false;
}
