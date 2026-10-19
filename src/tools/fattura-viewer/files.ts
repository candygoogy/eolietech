/**
 * File names: the PDF made from an invoice, and attachments saved from inside the XML (whose
 * NomeAttachment is untrusted: no paths, no reserved characters, no hidden or empty names).
 */

/** "IT01234567890_00001.xml.p7m" -> "IT01234567890_00001"; "fattura.XML" -> "fattura". */
export function sourceBase(name: string): string {
  const base = name
    .replace(/(?:\.p7m)+$/i, "")
    .replace(/\.xml$/i, "")
    .trim();
  return base === "" || base === "." ? "fattura" : base;
}

/** "x.xml" -> "x.pdf"; with several invoices in one file: "x-1.pdf", "x-2.pdf". */
export function pdfFileName(sourceName: string, index = 0, count = 1): string {
  const base = sourceBase(sourceName);
  return count > 1 ? `${base}-${index + 1}.pdf` : `${base}.pdf`;
}

const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * A safe file name for an attachment: the last path segment of NomeAttachment, without control or
 * reserved characters, at most 120 characters, never hidden; the FormatoAttachment extension is
 * added when the name has none. Falls back to `fallback`.
 */
export function attachmentFileName(name: string | undefined, format: string | undefined, fallback: string): string {
  let n = (name ?? "").split(/[\\/]/).pop() ?? "";
  n = n
    .replace(/[\u0000-\u001f\u007f-\u009f<>:"|?*\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "");
  if (n === "" || RESERVED.test(n.split(".")[0] ?? "")) n = fallback;
  const ext = (format ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  if (ext && !/\.[A-Za-z0-9]{1,10}$/.test(n)) n = `${n}.${ext}`;
  if (n.length > 120) {
    const dot = n.lastIndexOf(".");
    const suffix = dot > 0 && n.length - dot <= 11 ? n.slice(dot) : "";
    n = n.slice(0, 120 - suffix.length) + suffix;
  }
  return n;
}

/** Base64 (whitespace allowed) to bytes; null when it is not valid base64. */
export function decodeBase64(data: string): Uint8Array | null {
  const s = data.replace(/[\s]+/g, "");
  if (s === "" || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 === 1) return null;
  try {
    const bin = atob(s.length % 4 === 0 ? s : s + "=".repeat(4 - (s.length % 4)));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
