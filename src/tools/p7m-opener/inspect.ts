/**
 * Pure helpers for the P7M opener (no DOM): what kind of document came out of the envelope, the
 * name to save it under, whether it is a FatturaPA invoice, and how to print a signer.
 */
import type { SignerInfo } from "../signed-shared";
import type { Locale } from "../types";

export type Kind = "pdf" | "xml" | "image" | "zip" | "other";

export interface Sniffed {
  kind: Kind;
  /** Extension to add when the inner name has none, without the dot. */
  ext?: string;
  mime: string;
  /** Image format label, e.g. "PNG". */
  format?: string;
}

const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

const IMAGES: { sig: number[]; ext: string; mime: string; format: string; also?: { sig: number[]; at: number } }[] = [
  { sig: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ext: "png", mime: "image/png", format: "PNG" },
  { sig: [0xff, 0xd8, 0xff], ext: "jpg", mime: "image/jpeg", format: "JPG" },
  { sig: ascii("GIF8"), ext: "gif", mime: "image/gif", format: "GIF" },
  { sig: ascii("RIFF"), ext: "webp", mime: "image/webp", format: "WebP", also: { sig: ascii("WEBP"), at: 8 } },
  { sig: [0x49, 0x49, 0x2a, 0x00], ext: "tif", mime: "image/tiff", format: "TIFF" },
  { sig: [0x4d, 0x4d, 0x00, 0x2a], ext: "tif", mime: "image/tiff", format: "TIFF" },
];

/** Guess the document type from its first bytes (the inner file name can lie or be missing). */
export function sniffContent(b: Uint8Array): Sniffed {
  for (const img of IMAGES) {
    if (starts(b, img.sig) &&(!img.also || starts(b, img.also.sig, img.also.at))) {
      return { kind: "image", ext: img.ext, mime: img.mime, format: img.format };
    }
  }
  if (starts(b, [0x50, 0x4b, 0x03, 0x04]) || starts(b, [0x50, 0x4b, 0x05, 0x06])) {
    return { kind: "zip", ext: "zip", mime: "application/zip" };
  }
  // PDF readers accept the header anywhere in the first 1 KB.
  const head = b.subarray(0, 1024);
  for (let i = 0; i + 5 <= head.length; i++) {
    if (starts(head, ascii("%PDF-"), i)) return { kind: "pdf", ext: "pdf", mime: "application/pdf" };
  }
  if (/^<(?:\?xml|!--|[A-Za-z_])/.test(skipProlog(decodeHead(b), false))) {
    return { kind: "xml", ext: "xml", mime: "application/xml" };
  }
  return { kind: "other", mime: "application/octet-stream" };
}

/** The first 64 KB as text: UTF-16 when it has a byte order mark, UTF-8 (lenient) otherwise. */
function decodeHead(b: Uint8Array): string {
  const head = b.subarray(0, 65536);
  const enc = starts(head, [0xff, 0xfe]) ? "utf-16le" : starts(head, [0xfe, 0xff]) ? "utf-16be" : "utf-8";
  return new TextDecoder(enc).decode(head).replace(/^﻿/, "");
}

/** Skip whitespace and, when `all`, the XML declaration, comments and a DOCTYPE before the root element. */
function skipProlog(s: string, all = true): string {
  let rest = s.trimStart();
  while (all) {
    const end = rest.startsWith("<?") ? rest.indexOf("?>") + 2 : rest.startsWith("<!--") ? rest.indexOf("-->") + 3 : rest.startsWith("<!") ? rest.indexOf(">") + 1 : 0;
    if (end <= 0) break;
    rest = rest.slice(end).trimStart();
  }
  return rest;
}

/** Root element is FatturaElettronica or FatturaElettronicaSemplificata, with any namespace prefix. */
export function isFatturaPa(b: Uint8Array): boolean {
  return /^<(?:[A-Za-z_][\w.-]*:)?FatturaElettronica(?:Semplificata)?[\s/>]/.test(skipProlog(decodeHead(b)));
}

/** The name to save the document as: the inner name, plus an extension when it has none. */
export function downloadName(inner: string, s: Sniffed): string {
  const dot = inner.lastIndexOf(".");
  const hasExt = dot > 0 && dot < inner.length - 1 && /^[A-Za-z0-9]{1,5}$/.test(inner.slice(dot + 1));
  return hasExt || !s.ext ? inner : `${inner}.${s.ext}`;
}

/** Display name: the certificate's common name, else given name + surname. */
export function signerName(s: Pick<SignerInfo, "commonName" | "givenName" | "surname">): string | undefined {
  const cn = s.commonName?.trim();
  if (cn) return cn;
  const full = [s.givenName, s.surname]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");
  return full || undefined;
}

/** "TINIT-RSSMRA80A01H501U" is an Italian tax code; any other serialNumber is shown as written. */
export function signerId(serialNumber: string | undefined): { taxCode: string } | { id: string } | undefined {
  const v = serialNumber?.trim();
  if (!v) return undefined;
  const m = /^TINIT-(.+)$/i.exec(v);
  return m ? { taxCode: m[1]! } : { id: v };
}

/** Worst result across every signer of every envelope; an envelope without signers counts as not checked. */
export function overallCheck(layers: SignerInfo[][]): SignerInfo["check"] {
  const all = layers.flat();
  if (all.some((s) => s.check === "invalid")) return "invalid";
  if (all.some((s) => s.check === "unsupported") || layers.some((l) => l.length === 0)) return "unsupported";
  return "valid";
}

/**
 * A formatted date with the preposition Italian needs in front of it: "il 3 marzo", "l'8 marzo",
 * "dall'11 aprile", "al 1° maggio". English dates go back unchanged (the template holds "on" / "from").
 * Expects the Intl "long" style, which in Italian starts with the day number.
 */
export function withPreposition(locale: Locale, prep: "il" | "dal" | "al", date: string): string {
  if (locale !== "it") return date;
  const text = date.replace(/^1(?=\s)/, "1°");
  if (/^(?:8|11)\s/.test(text)) return `${{ il: "l'", dal: "dall'", al: "all'" }[prep]}${text}`;
  return `${prep} ${text}`;
}
