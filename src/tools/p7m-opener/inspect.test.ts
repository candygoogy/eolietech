import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localePath } from "../../i18n";
import { getTool } from "../registry";
import type { SignerInfo } from "../signed-shared";
import type { Locale } from "../types";
import { downloadName, isFatturaPa, overallCheck, signerId, signerName, sniffContent, withPreposition } from "./inspect";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...new TextEncoder().encode(p)] : p)));
const fixture = (name: string) =>
  new Uint8Array(readFileSync(path.resolve(__dirname, "../signed-shared/fixtures", name)));

describe("sniffContent", () => {
  it("recognises PDF, XML, images and ZIP by their first bytes", () => {
    expect(sniffContent(fixture("sample.pdf"))).toMatchObject({ kind: "pdf", ext: "pdf", mime: "application/pdf" });
    expect(sniffContent(bytes("\n\n%PDF-1.7\n"))).toMatchObject({ kind: "pdf" });
    expect(sniffContent(fixture("fattura.xml"))).toMatchObject({ kind: "xml", ext: "xml" });
    expect(sniffContent(bytes([0xef, 0xbb, 0xbf], "  <root/>"))).toMatchObject({ kind: "xml" });
    expect(sniffContent(bytes([0xff, 0xfe], ..."<?xml".split("").map((c) => [c.charCodeAt(0), 0])))).toMatchObject({ kind: "xml" });
    expect(sniffContent(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({ kind: "image", format: "PNG", ext: "png" });
    expect(sniffContent(bytes([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ kind: "image", format: "JPG" });
    expect(sniffContent(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))).toMatchObject({ kind: "image", format: "WebP" });
    expect(sniffContent(bytes("RIFF", [1, 2, 3, 4], "WAVEfmt "))).toMatchObject({ kind: "other" });
    expect(sniffContent(bytes("PK", [3, 4, 20, 0]))).toMatchObject({ kind: "zip", ext: "zip" });
  });

  it("calls anything else other, with no extension to add", () => {
    expect(sniffContent(bytes("Hello, this is plain text"))).toEqual({ kind: "other", mime: "application/octet-stream" });
    expect(sniffContent(new Uint8Array())).toMatchObject({ kind: "other" });
  });
});

describe("isFatturaPa", () => {
  it("finds the FatturaPA root element with or without a namespace prefix", () => {
    expect(isFatturaPa(fixture("fattura.xml"))).toBe(true);
    expect(isFatturaPa(bytes('<FatturaElettronica versione="FPR12">'))).toBe(true);
    expect(isFatturaPa(bytes("<?xml version='1.0'?>\n<!-- a comment -->\n<ns2:FatturaElettronicaSemplificata xmlns:ns2='x'>"))).toBe(true);
    expect(isFatturaPa(bytes([0xef, 0xbb, 0xbf], "<?xml version='1.0'?><?xml-stylesheet href='f.xsl'?><a:FatturaElettronica/>"))).toBe(true);
  });

  it("ignores other roots, look-alike names and nested invoices", () => {
    expect(isFatturaPa(bytes("<FatturaElettronicaHeader/>"))).toBe(false);
    expect(isFatturaPa(bytes("<Envelope><FatturaElettronica/></Envelope>"))).toBe(false);
    expect(isFatturaPa(bytes("%PDF-1.7"))).toBe(false);
  });
});

describe("downloadName", () => {
  const pdf = sniffContent(bytes("%PDF-1.7"));
  it("keeps a name that has an extension and adds one that is missing", () => {
    expect(downloadName("contratto.pdf", pdf)).toBe("contratto.pdf");
    expect(downloadName("contratto.PDF", pdf)).toBe("contratto.PDF");
    expect(downloadName("contratto", pdf)).toBe("contratto.pdf");
    expect(downloadName("document", pdf)).toBe("document.pdf");
    expect(downloadName("Rossi Mario v.2 final", pdf)).toBe("Rossi Mario v.2 final.pdf");
    expect(downloadName("dati", sniffContent(bytes("plain")))).toBe("dati");
  });
});

describe("signer helpers", () => {
  it("names the signer by common name, else given name and surname", () => {
    expect(signerName({ commonName: "Mario Rossi", givenName: "M", surname: "R" })).toBe("Mario Rossi");
    expect(signerName({ givenName: "Giulia", surname: "Bianchi" })).toBe("Giulia Bianchi");
    expect(signerName({ surname: "Bianchi" })).toBe("Bianchi");
    expect(signerName({ commonName: "  " })).toBeUndefined();
  });

  it("strips TINIT- from Italian tax codes and leaves other identifiers as written", () => {
    expect(signerId("TINIT-RSSMRA80A01H501U")).toEqual({ taxCode: "RSSMRA80A01H501U" });
    expect(signerId("IDCIT-AB1234567")).toEqual({ id: "IDCIT-AB1234567" });
    expect(signerId(undefined)).toBeUndefined();
  });

  it("reports the worst check across every envelope", () => {
    const s = (check: SignerInfo["check"]) => ({ check }) as SignerInfo;
    expect(overallCheck([[s("valid")], [s("valid"), s("valid")]])).toBe("valid");
    expect(overallCheck([[s("valid")], [s("unsupported")]])).toBe("unsupported");
    expect(overallCheck([[s("unsupported")], [s("invalid")]])).toBe("invalid");
    expect(overallCheck([[]])).toBe("unsupported");
  });
});

describe("withPreposition", () => {
  it("adds the Italian article or preposition, elided before 8 and 11, with 1° for the first", () => {
    expect(withPreposition("it", "il", "3 marzo 2026 alle ore 14:05")).toBe("il 3 marzo 2026 alle ore 14:05");
    expect(withPreposition("it", "il", "8 marzo 2026")).toBe("l'8 marzo 2026");
    expect(withPreposition("it", "dal", "11 aprile 2024")).toBe("dall'11 aprile 2024");
    expect(withPreposition("it", "al", "8 maggio 2027")).toBe("all'8 maggio 2027");
    expect(withPreposition("it", "dal", "1 gennaio 2025")).toBe("dal 1° gennaio 2025");
    expect(withPreposition("it", "al", "18 luglio 2025")).toBe("al 18 luglio 2025");
  });

  it("leaves English dates alone", () => {
    expect(withPreposition("en", "dal", "March 8, 2026")).toBe("March 8, 2026");
  });
});

describe("content", () => {
  const ui = (file: string, key: string) => {
    const text = readFileSync(path.resolve(__dirname, file), "utf8");
    return new RegExp(`^  ${key.replace(/\./g, "\\.")}: "(.*)"$`, "m").exec(text)?.[1];
  };
  const pages: [string, Locale, string | undefined][] = [
    ["content.en.md", "en", undefined],
    ["content.it.md", "it", undefined],
    ["content.p7m-to-pdf.en.md", "en", "to-pdf"],
    ["content.p7m-to-pdf.it.md", "it", "to-pdf"],
  ];

  it("links the e-invoice hint to the right fattura-viewer page in each locale", () => {
    const viewer = getTool("fattura-viewer")!;
    for (const [file, locale, variant] of pages) {
      const slug = variant ? viewer.variants!.find((v) => v.id === variant)!.slug[locale] : viewer.slug[locale];
      expect(ui(file, "p7m.fattura.href"), file).toBe(localePath(locale, slug));
    }
  });

  it("uses no em or en dashes", () => {
    for (const [file] of pages) expect(readFileSync(path.resolve(__dirname, file), "utf8"), file).not.toMatch(new RegExp("[\\u2013\\u2014]"));
  });
});
