import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { openP7m } from "../signed-shared";
import { MODALITA_PAGAMENTO, NATURA, REGIME_FISCALE, TIPO_DOCUMENTO, codeLabel, describeCode } from "./codes";
import { attachmentFileName, decodeBase64, pdfFileName } from "./files";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "./format";
import { FatturaError, decodeXml, parseFattura } from "./parse";
import { buildInvoicePdf, toWinAnsi } from "./pdf";
import { presentInvoice } from "./present";

/** Synthetic invoices in ./fixtures (copied to e2e/fixtures/document/fattura/). */
const fixture = (name: string) => new Uint8Array(readFileSync(path.resolve(__dirname, "fixtures", name)));
const encode = (s: string) => new TextEncoder().encode(s);

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof FatturaError) return e.code;
    throw e;
  }
  return "parsed";
}

/** A minimal FPR12 invoice; `lines` and `extraBody` are spliced in as XML. */
function invoiceXml(opts: { lines?: string; seller?: string } = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
<FatturaElettronicaHeader>
<CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>
<Anagrafica><Denominazione>${opts.seller ?? "Esempio S.r.l."}</Denominazione></Anagrafica><RegimeFiscale>RF01</RegimeFiscale></DatiAnagrafici></CedentePrestatore>
<CessionarioCommittente><DatiAnagrafici><CodiceFiscale>PRVLCU90A41F205X</CodiceFiscale><Anagrafica><Nome>Lucia</Nome><Cognome>Prova</Cognome></Anagrafica></DatiAnagrafici></CessionarioCommittente>
</FatturaElettronicaHeader>
<FatturaElettronicaBody>
<DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>2026-10-01</Data><Numero>1</Numero><ImportoTotaleDocumento>122.00</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
<DatiBeniServizi>${opts.lines ?? ""}<DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>100.00</ImponibileImporto><Imposta>22.00</Imposta></DatiRiepilogo></DatiBeniServizi>
</FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

const line = (n: number, description: string) =>
  `<DettaglioLinee><NumeroLinea>${n}</NumeroLinea><Descrizione>${description}</Descrizione><Quantita>1.00</Quantita><PrezzoUnitario>1.00</PrezzoUnitario><PrezzoTotale>1.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA></DettaglioLinee>`;

describe("parseFattura", () => {
  it("reads an FPR12 invoice: parties, lines, withholding, stamp, fund, payment, attachment", () => {
    const file = parseFattura(fixture("IT01234567890_00002.xml"));
    expect(file.version).toBe("FPR12");
    expect(file.xmlSigned).toBe(false);
    expect(file.header.transmission).toMatchObject({ progressive: "00002", recipientCode: "0000000", recipientPec: "bottega.prova@pec.example.it" });
    expect(file.header.seller).toMatchObject({
      name: "Studio Tecnico Esempio S.r.l.",
      vat: "IT01234567890",
      regime: "RF01",
      rea: "ME 123456",
      email: "amministrazione@example.com",
      address: { street: "Via Vulcano", number: "12", cap: "98055", city: "Lipari", province: "ME" },
    });
    expect(file.header.buyer).toMatchObject({ name: "Bottega di Prova S.n.c.", vat: "IT09876543210" });
    expect(file.invoices).toHaveLength(1);
    const inv = file.invoices[0]!;
    expect(inv).toMatchObject({ type: "TD01", currency: "EUR", date: "2026-10-15", number: "2026/118", total: "1841.76", totalComputed: false });
    expect(inv.reasons).toHaveLength(2);
    expect(inv.lines).toHaveLength(4);
    expect(inv.lines[1]).toMatchObject({ quantity: "3.00", unit: "ore", total: "216.00", adjustments: [{ type: "SC", percent: "10.00" }] });
    expect(inv.lines[2]!.codes).toEqual([{ type: "INTERNO", value: "RIMB-01" }]);
    expect(inv.lines[3]).toMatchObject({ natura: "N1", vatRate: "0.00" });
    expect(inv.withholdings).toEqual([{ type: "RT01", amount: "290.00", rate: "20.00", reason: "A" }]);
    expect(inv.stamp).toEqual({ virtual: true, amount: "2.00" });
    expect(inv.funds[0]).toMatchObject({ type: "TC04", rate: "4.00", amount: "58.00", taxable: "1450.00" });
    expect(inv.refs).toEqual([{ kind: "order", id: "ORD-77", date: "2026-09-20", cup: undefined, cig: undefined }]);
    expect(inv.ddts).toEqual([{ number: "15", date: "2026-09-28" }]);
    expect(inv.summaries).toHaveLength(2);
    expect(inv.payments[0]).toMatchObject({ condition: "TP02", details: [{ method: "MP05", iban: "IT60X0542811101000000123456", amount: "1551.76" }] });
    const att = inv.attachments[0]!;
    expect(att).toMatchObject({ name: "relazione-tecnica.pdf", format: "PDF" });
    const bytes = decodeBase64(att.data)!;
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
  });

  it("decodes ISO-8859-1 and reads a default namespace with no prefix", () => {
    const raw = fixture("IT01234567890_00003.xml");
    expect(raw.includes(0xf2)).toBe(true); // "ò" as one Latin-1 byte
    const file = parseFattura(raw);
    expect(file.header.seller).toMatchObject({ name: "Niccolò Esempio", regime: "RF19", taxCode: "SMPNCC80A01F839X" });
    expect(file.header.buyer.name).toBe("Lucia Prova");
    const inv = file.invoices[0]!;
    expect(inv.reasons[0]).toContain("perché è più facile");
    expect(inv.lines[0]).toMatchObject({ natura: "N2.2", unitPrice: "30.00000000" });
  });

  it("reads the ns3: prefix, notices an XAdES signature and adds up a missing total", () => {
    const file = parseFattura(fixture("IT01234567890_00004.xml"));
    expect(file.xmlSigned).toBe(true);
    expect(file.header.seller.name).toBe("Cartongessi Esempio S.r.l.");
    const inv = file.invoices[0]!;
    expect(inv).toMatchObject({ number: "FV-0042", total: "2510.00", totalComputed: true });
    expect(inv.payments[0]!.details).toHaveLength(2);
  });

  it("reads an FPA12 invoice with CIG, CUP, split payment and a service period", () => {
    const file = parseFattura(fixture("IT01234567890_00005.xml"));
    expect(file.version).toBe("FPA12");
    expect(file.header.transmission.recipientCode).toBe("UFABCD");
    const inv = file.invoices[0]!;
    expect(inv.refs[0]).toMatchObject({ kind: "order", cig: "Z0A1B2C3D4", cup: "J00X00000000000" });
    expect(inv.summaries[0]!.chargeability).toBe("S");
    expect(inv.lines[0]).toMatchObject({ periodStart: "2026-10-01", periodEnd: "2026-10-31" });
  });

  it("reads an FSM10 simplified invoice", () => {
    const file = parseFattura(fixture("IT01234567890_00006.xml"));
    expect(file.version).toBe("FSM10");
    expect(file.header.seller).toMatchObject({ name: "Ferramenta Esempio S.r.l.", vat: "IT01234567890", regime: "RF01" });
    expect(file.header.buyer).toMatchObject({ name: "Lucia Prova", taxCode: "PRVLCU90A41F205X", address: { city: "Milano" } });
    const inv = file.invoices[0]!;
    expect(inv).toMatchObject({ kind: "semplificata", type: "TD07", number: "S-12", total: "30.50", totalComputed: true });
    expect(inv.lines.map((l) => [l.description, l.total, l.vatRate, l.vatAmount])).toEqual([
      ["Viti e tasselli", "24.40", "22.00", undefined],
      ["Nastro isolante", "6.10", undefined, "1.10"],
    ]);
  });

  it("returns one invoice per body when a file holds several", () => {
    const file = parseFattura(fixture("IT01234567890_00007.xml"));
    expect(file.invoices.map((i) => [i.type, i.number, i.total])).toEqual([
      ["TD01", "101", "122.00"],
      ["TD04", "102", "61.00"],
    ]);
    expect(file.invoices[1]!.refs).toEqual([{ kind: "linked", id: "101", date: "2026-10-10", cup: undefined, cig: undefined }]);
  });

  it("reads the payload of the signed test invoice", async () => {
    const { content } = await openP7m(fixture("../../signed-shared/fixtures/rsa-sha256.xml.p7m"));
    const file = parseFattura(content);
    expect(file.header.seller.name).toBe("Esempio Società S.r.l.");
    expect(file.invoices[0]).toMatchObject({ number: "42/2026", total: "122.00" });
  });

  it("rejects broken XML, other XML and files without a body", () => {
    expect(errorCode(() => parseFattura(fixture("broken.xml")))).toBe("xml");
    expect(errorCode(() => parseFattura(encode("%PDF-1.7 not xml")))).toBe("xml");
    expect(errorCode(() => parseFattura(encode('<?xml version="1.0"?><rss><channel/></rss>')))).toBe("not-invoice");
    expect(errorCode(() => parseFattura(encode("<FatturaElettronica versione='FPR12'><FatturaElettronicaHeader/></FatturaElettronica>")))).toBe("empty");
  });

  it("honours BOMs and reads mislabelled Latin-1 as windows-1252", () => {
    expect(decodeXml(new Uint8Array([0xef, 0xbb, 0xbf, ...encode("<a>è</a>")]))).toBe("<a>è</a>");
    expect(decodeXml(new Uint8Array([0xff, 0xfe, 0x3c, 0, 0x61, 0, 0x3e, 0]))).toBe("<a>");
    // Declared UTF-8, but "è" is the single Latin-1 byte 0xE8.
    expect(decodeXml(new Uint8Array([...encode('<?xml version="1.0" encoding="UTF-8"?><a>'), 0xe8, ...encode("</a>")]))).toContain("<a>è</a>");
    expect(decodeXml(new Uint8Array([...encode("<?xml version='1.0' encoding='windows-1252'?><a>"), 0x80, ...encode("</a>")]))).toContain("<a>€</a>");
  });
});

describe("codes", () => {
  it("labels codes in both languages and falls back to the raw code", () => {
    expect(codeLabel(TIPO_DOCUMENTO, "TD04", "it")).toBe("Nota di credito");
    expect(codeLabel(TIPO_DOCUMENTO, "TD04", "en")).toBe("Credit note");
    expect(codeLabel(TIPO_DOCUMENTO, "TD29", "it")).toBe("Comunicazione per omessa o irregolare fatturazione");
    expect(describeCode(NATURA, "N6.7", "it")).toBe("Inversione contabile, comparto edile e settori connessi (N6.7)");
    expect(describeCode(MODALITA_PAGAMENTO, "MP23", "en")).toBe("PagoPA (MP23)");
    expect(describeCode(REGIME_FISCALE, "RF20", "en")).toBe("Cross-border VAT exemption scheme (RF20)");
    expect(describeCode(TIPO_DOCUMENTO, "TD99", "it")).toBe("TD99");
    expect(describeCode(TIPO_DOCUMENTO, "toString", "it")).toBe("toString");
    expect(describeCode(TIPO_DOCUMENTO, undefined, "it")).toBeUndefined();
  });

  it("covers the full current lists", () => {
    const td = ["01", "02", "03", "04", "05", "06", "07", "08", "09", ...Array.from({ length: 14 }, (_, i) => String(16 + i))];
    for (const n of td) expect(codeLabel(TIPO_DOCUMENTO, `TD${n}`, "it"), `TD${n}`).toBeTruthy();
    for (let i = 1; i <= 23; i++) expect(codeLabel(MODALITA_PAGAMENTO, `MP${String(i).padStart(2, "0")}`, "en")).toBeTruthy();
    for (const n of ["N1", "N2.1", "N2.2", "N3.1", "N3.2", "N3.3", "N3.4", "N3.5", "N3.6", "N4", "N5", "N7"]) expect(codeLabel(NATURA, n, "it")).toBeTruthy();
    for (let i = 1; i <= 9; i++) expect(codeLabel(NATURA, `N6.${i}`, "en")).toBeTruthy();
    for (let i = 1; i <= 20; i++) if (i !== 3) expect(codeLabel(REGIME_FISCALE, `RF${String(i).padStart(2, "0")}`, "it")).toBeTruthy();
  });
});

describe("format", () => {
  it("formats money, quantities, rates and dates for each language", () => {
    expect(formatMoney("1234.56", "EUR", "it")).toBe("1.234,56\u00a0€");
    expect(formatMoney("1234.56", "EUR", "en")).toBe("€1,234.56");
    expect(formatMoney("30.00000000", "EUR", "it")).toBe("30,00\u00a0€");
    expect(formatMoney("0.12345", "EUR", "it")).toBe("0,12345\u00a0€");
    expect(formatMoney("10.00", "USD", "it")).toBe("10,00\u00a0USD");
    expect(formatMoney("10.00", "XYZ1", "en")).toBe("10.00 XYZ1");
    expect(formatMoney("abc", "EUR", "it")).toBe("abc");
    expect(formatQuantity("125.50", "it")).toBe("125,5");
    expect(formatQuantity("1.00000000", "en")).toBe("1");
    expect(formatPercent("22.00", "it")).toBe("22%");
    expect(formatPercent("10.50", "it")).toBe("10,5%");
    expect(formatDate("2026-10-01", "it")).toBe("01/10/2026");
    expect(formatDate("2026-10-01", "en")).toBe("Oct 1, 2026");
    expect(formatDate("2026-02-30", "it")).toBe("2026-02-30");
  });
});

describe("files", () => {
  it("names the PDF after the source and sanitises attachment names", () => {
    expect(pdfFileName("IT01234567890_00001.xml.p7m")).toBe("IT01234567890_00001.pdf");
    expect(pdfFileName("fattura.XML", 1, 2)).toBe("fattura-2.pdf");
    expect(pdfFileName(".xml")).toBe("fattura.pdf");
    expect(attachmentFileName("../../etc/passwd", undefined, "allegato-1")).toBe("passwd");
    expect(attachmentFileName("C:\\x\\..\\report.pdf", "PDF", "a")).toBe("report.pdf");
    expect(attachmentFileName("relazione", "PDF", "a")).toBe("relazione.pdf");
    expect(attachmentFileName('.hidden<>:"|?*', undefined, "a")).toBe("hidden");
    expect(attachmentFileName("evil\u202Efdp.exe", undefined, "a")).toBe("evilfdp.exe");
    expect(attachmentFileName("CON", "txt", "allegato-2")).toBe("allegato-2.txt");
    expect(attachmentFileName("", undefined, "allegato-3")).toBe("allegato-3");
    expect(attachmentFileName(`${"a".repeat(300)}.pdf`, undefined, "a")).toHaveLength(120);
    expect(decodeBase64("not base64!")).toBeNull();
  });
});

describe("presentInvoice", () => {
  it("lays out the same content in Italian and English", () => {
    const file = parseFattura(fixture("IT01234567890_00002.xml"));
    const it = presentInvoice(file, file.invoices[0]!, "it");
    expect(it.title).toBe("Fattura n. 2026/118");
    expect(it.subtitle).toBe("del 15/10/2026");
    expect(it.parties[0]).toMatchObject({ name: "Studio Tecnico Esempio S.r.l." });
    expect(it.parties[0]!.lines).toContain("Regime fiscale: Ordinario (RF01)");
    const lines = it.sections.find((s) => s.id === "lines");
    expect(lines?.kind === "table" && lines.table.rows[1]).toEqual(["2", "Sopralluogo in cantiere", "3 ore", "80,00\u00a0€", "-10%", "22%", "216,00\u00a0€"]);
    const extras = it.sections.find((s) => s.id === "extras");
    expect(extras?.kind === "fields" && extras.groups[0]!.rows).toEqual([
      ["Ritenuta", "Ritenuta persone fisiche (RT01) · 20% · 290,00\u00a0€ · causale A"],
      ["Bollo virtuale", "2,00\u00a0€"],
      ["Cassa previdenziale", "Inarcassa, ingegneri e architetti (TC04) · 4% · 58,00\u00a0€ · su 1.450,00\u00a0€ · IVA 22%"],
    ]);
    const en = presentInvoice(file, file.invoices[0]!, "en");
    expect(en.title).toBe("Invoice no. 2026/118");
    expect(en.sections.map((s) => s.id)).toEqual(it.sections.map((s) => s.id));
  });
});

describe("buildInvoicePdf", () => {
  const opts = { locale: "it" as const, sourceName: "IT01234567890_00002.xml" };

  it("makes a PDF that pdf-lib can load again", async () => {
    const file = parseFattura(fixture("IT01234567890_00002.xml"));
    const bytes = await buildInvoicePdf(presentInvoice(file, file.invoices[0]!, "it"), opts);
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toBe("Fattura n. 2026/118 del 15/10/2026");
  });

  it("adds pages as the lines grow and handles every fixture", async () => {
    const many = parseFattura(encode(invoiceXml({ lines: Array.from({ length: 160 }, (_, i) => line(i + 1, `Articolo numero ${i + 1}`)).join("") })));
    const doc = await PDFDocument.load(await buildInvoicePdf(presentInvoice(many, many.invoices[0]!, "en"), opts));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    for (const name of ["IT01234567890_00003.xml", "IT01234567890_00004.xml", "IT01234567890_00005.xml", "IT01234567890_00006.xml", "IT01234567890_00007.xml"]) {
      const file = parseFattura(fixture(name));
      for (const inv of file.invoices) await expect(buildInvoicePdf(presentInvoice(file, inv, "en"), opts)).resolves.toBeInstanceOf(Uint8Array);
    }
  });

  it("does not throw on characters outside WinAnsi or on huge unbroken text", async () => {
    const odd = "Café “quoted” ‘x’\u00a0€ Łódź 東京 🧾 Ελλάδα \u200b\u202e";
    const file = parseFattura(encode(invoiceXml({ seller: odd, lines: line(1, `${odd} ${"x".repeat(20000)}`) })));
    const doc = await PDFDocument.load(await buildInvoicePdf(presentInvoice(file, file.invoices[0]!, "it"), opts));
    expect(doc.getPageCount()).toBeGreaterThan(1);
    const charset = new Set(Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i).concat([0xe9, 0x20ac]));
    expect(toWinAnsi("Café “ok” Łódź 東京\u00a0€", charset)).toBe('Café "ok" ?odz ?? €');
  });
});
