/**
 * Turns one invoice into display-ready strings: title, the two parties, and sections of fields,
 * tables and text. The on-page view (view.ts) and the PDF (pdf.ts) both draw this, so they always
 * show the same content in the same order. DOM-free.
 */
import type { Locale } from "../types";
import {
  CONDIZIONI_PAGAMENTO,
  ESIGIBILITA_IVA,
  MODALITA_PAGAMENTO,
  NATURA,
  REGIME_FISCALE,
  TIPO_CASSA,
  TIPO_DOCUMENTO,
  TIPO_RITENUTA,
  codeLabel,
  describeCode,
} from "./codes";
import { formatAdjustment, formatDate, formatMoney, formatPercent, formatQuantity } from "./format";
import { LABELS, fill, type Labels } from "./labels";
import type { Address, Invoice, ParsedFile, Party } from "./model";
import { sumAmounts } from "./parse";

export type Row = [label: string, value: string];

export interface FieldGroup {
  title?: string;
  rows: Row[];
}

export interface Column {
  label: string;
  align: "left" | "right";
  /** Relative width in the PDF. */
  weight: number;
  /** The column that heads a row when a narrow screen stacks the table. */
  main?: boolean;
}

export interface Table {
  columns: Column[];
  /** Cells may hold several lines separated by "\n". */
  rows: string[][];
  /** Total rows under the table: [label, value] pairs. */
  totals: Row[];
}

export type Section =
  | { kind: "fields"; id: string; title: string; groups: FieldGroup[] }
  | { kind: "table"; id: string; title: string; table: Table }
  | { kind: "text"; id: string; title: string; paragraphs: string[] }
  | { kind: "attachments"; id: string; title: string; items: { index: number; name: string; detail?: string }[] };

export interface PartyBlock {
  role: string;
  name: string;
  lines: string[];
}

export interface Presented {
  title: string;
  subtitle: string;
  parties: PartyBlock[];
  sections: Section[];
  /** Notes shown after everything else (XML signature). */
  notes: string[];
  labels: Labels;
}

const present = <T>(v: T | undefined | null | ""): v is T => v !== undefined && v !== null && v !== "";

function addressLines(a: Address | undefined): string[] {
  if (!a) return [];
  const street = [a.street, a.number].filter(present).join(" ");
  const city = [a.cap, a.city, a.province ? `(${a.province})` : undefined].filter(present).join(" ");
  return [street, city, a.country && a.country !== "IT" ? a.country : ""].filter(present);
}

function partyBlock(role: string, p: Party, L: Labels, locale: Locale): PartyBlock {
  const lines = [
    p.vat ? `${L.vat} ${p.vat}` : "",
    p.taxCode && p.taxCode !== p.vat?.slice(2) ? `${L.taxCode} ${p.taxCode}` : "",
    ...addressLines(p.address),
    p.regime ? `${L.regime}: ${describeCode(REGIME_FISCALE, p.regime, locale)}` : "",
    p.rea ? `${L.rea} ${p.rea}` : "",
    p.phone ? `${L.phone} ${p.phone}` : "",
    p.email ? `${L.email} ${p.email}` : "",
  ].filter(present);
  return { role, name: p.name ?? p.vat ?? p.taxCode ?? "", lines };
}

/** Rate column: "22%", or the Natura code when the rate is zero and a Natura is given. */
function rateCell(rate: string | undefined, natura: string | undefined, locale: Locale): string {
  if (natura && (!rate || Number(rate) === 0)) return natura;
  return formatPercent(rate, locale);
}

/** "Fattura n. 42/2026" style title, from the document type and number. */
export function invoiceTitle(inv: Invoice, locale: Locale): string {
  const L = LABELS[locale];
  const type = codeLabel(TIPO_DOCUMENTO, inv.type, locale) ?? inv.type ?? codeLabel(TIPO_DOCUMENTO, "TD01", locale)!;
  return inv.number ? fill(L.title, { type, number: inv.number }) : fill(L.titleNoNumber, { type });
}

export function presentInvoice(file: ParsedFile, inv: Invoice, locale: Locale): Presented {
  const L = LABELS[locale];
  const money = (v: string | undefined) => formatMoney(v, inv.currency, locale);
  const date = (v: string | undefined) => formatDate(v, locale);
  const { header } = file;
  const sections: Section[] = [];

  // Document details.
  const doc: Row[] = [
    [L.docType, describeCode(TIPO_DOCUMENTO, inv.type, locale) ?? ""],
    [L.number, inv.number ?? ""],
    [L.date, date(inv.date)],
    [L.currency, inv.currency],
    [inv.totalComputed ? L.totalComputed : L.total, money(inv.total)],
    [L.rounding, money(inv.rounding)],
    ...inv.adjustments.map((a): Row => [L.docAdjustment, formatAdjustment(a, inv.currency, locale)]),
  ];
  if (inv.corrects) doc.push([L.corrects, refText(inv.corrects.number, inv.corrects.date)]);
  for (const r of inv.refs) {
    const extra = [r.cig ? `CIG ${r.cig}` : "", r.cup ? `CUP ${r.cup}` : ""].filter(present);
    doc.push([L[r.kind], [refText(r.id, r.date), ...extra].filter(present).join(" · ")]);
  }
  for (const d of inv.ddts) doc.push([L.ddt, refText(d.number, d.date)]);
  sections.push({ kind: "fields", id: "document", title: L.document, groups: [{ rows: doc.filter(([, v]) => present(v)) }] });

  if (inv.reasons.length) sections.push({ kind: "text", id: "reason", title: L.reason, paragraphs: inv.reasons });

  // Lines.
  if (inv.lines.length) {
    const simplified = inv.kind === "semplificata";
    const columns: Column[] = simplified
      ? [
          { label: L.colDescription, align: "left", weight: 6, main: true },
          { label: L.colVat, align: "right", weight: 1.2 },
          { label: L.colVatAmount, align: "right", weight: 1.8 },
          { label: L.colTotalGross, align: "right", weight: 2 },
        ]
      : [
          { label: L.colNumber, align: "left", weight: 0.6 },
          { label: L.colDescription, align: "left", weight: 5.4, main: true },
          { label: L.colQuantity, align: "right", weight: 1.3 },
          { label: L.colPrice, align: "right", weight: 1.7 },
          { label: L.colAdjustment, align: "right", weight: 1.2 },
          { label: L.colVat, align: "right", weight: 0.9 },
          { label: L.colTotal, align: "right", weight: 1.8 },
        ];
    const rows = inv.lines.map((l) => {
      const description = [
        ...l.codes.filter((c) => c.value).map((c) => `${L.code} ${[c.type, c.value].filter(present).join(" ")}`),
        l.description ?? "",
        l.periodStart || l.periodEnd ? fill(L.period, { from: date(l.periodStart) || "?", to: date(l.periodEnd) || "?" }) : "",
      ]
        .filter(present)
        .join("\n");
      if (simplified) return [description, rateCell(l.vatRate, l.natura, locale), money(l.vatAmount), money(l.total)];
      const qty = [formatQuantity(l.quantity, locale), l.unit].filter(present).join(" ");
      return [
        l.number ?? "",
        description,
        qty,
        money(l.unitPrice),
        l.adjustments.map((a) => formatAdjustment(a, inv.currency, locale)).join("\n"),
        rateCell(l.vatRate, l.natura, locale),
        money(l.total),
      ];
    });
    const totals: Row[] = simplified && inv.total ? [[L.totalComputed, money(inv.total)]] : [];
    sections.push({ kind: "table", id: "lines", title: L.lines, table: { columns, rows, totals } });
  }

  // VAT summary.
  if (inv.summaries.length) {
    const rows = inv.summaries.map((s) => {
      const notes = [
        s.natura ? describeCode(NATURA, s.natura, locale) : "",
        s.chargeability ? `${L.chargeability}: ${describeCode(ESIGIBILITA_IVA, s.chargeability, locale)}` : "",
        s.normRef ?? "",
        s.expenses ? `${L.expenses} ${money(s.expenses)}` : "",
        s.rounding ? `${L.rounding} ${money(s.rounding)}` : "",
      ].filter(present);
      return [rateCell(s.vatRate, s.natura, locale), money(s.taxable), money(s.tax), notes.join("\n")];
    });
    const taxable = sumAmounts(inv.summaries.map((s) => s.taxable));
    const tax = sumAmounts(inv.summaries.map((s) => s.tax));
    sections.push({
      kind: "table",
      id: "summary",
      title: L.summary,
      table: {
        columns: [
          { label: L.colRate, align: "left", weight: 1.6, main: true },
          { label: L.colTaxable, align: "right", weight: 1.8 },
          { label: L.colTax, align: "right", weight: 1.6 },
          { label: L.colNotes, align: "left", weight: 4.4 },
        ],
        rows,
        totals: inv.summaries.length > 1 ? ([
          [L.totalTaxable, money(taxable)],
          [L.totalTax, money(tax)],
        ] as Row[]).filter(([, v]) => present(v)) : [],
      },
    });
  }

  // Withholding, stamp duty, pension fund.
  const extras: Row[] = [];
  for (const w of inv.withholdings) {
    const value = [
      describeCode(TIPO_RITENUTA, w.type, locale) ?? "",
      w.rate ? formatPercent(w.rate, locale) : "",
      money(w.amount),
      w.reason ? fill(L.withholdingReason, { code: w.reason }) : "",
    ];
    extras.push([L.withholding, value.filter(present).join(" · ")]);
  }
  if (inv.stamp) extras.push([inv.stamp.virtual ? L.stampVirtual : L.stamp, money(inv.stamp.amount) || (inv.stamp.virtual ? "SI" : "")]);
  for (const f of inv.funds) {
    const value = [
      describeCode(TIPO_CASSA, f.type, locale) ?? "",
      f.rate ? formatPercent(f.rate, locale) : "",
      money(f.amount),
      f.taxable ? fill(L.fundOn, { amount: money(f.taxable) }) : "",
      f.vatRate !== undefined ? fill(L.vatAt, { rate: rateCell(f.vatRate, f.natura, locale) }) : "",
    ];
    extras.push([L.fund, value.filter(present).join(" · ")]);
  }
  if (extras.length) sections.push({ kind: "fields", id: "extras", title: L.extras, groups: [{ rows: extras }] });

  // Payment.
  const groups: FieldGroup[] = [];
  let n = 0;
  const instalments = inv.payments.reduce((s, p) => s + p.details.length, 0);
  for (const p of inv.payments) {
    if (p.condition) groups.push({ rows: [[L.conditions, describeCode(CONDIZIONI_PAGAMENTO, p.condition, locale)!]] });
    for (const d of p.details) {
      n++;
      const rows: Row[] = (
        [
          [L.method, describeCode(MODALITA_PAGAMENTO, d.method, locale) ?? ""],
          [L.due, date(d.dueDate)],
          [L.amount, money(d.amount)],
          [L.iban, d.iban ?? ""],
          [L.bic, d.bic ?? ""],
          [L.bank, d.bank ?? ""],
          [L.beneficiary, d.beneficiary ?? ""],
          [L.paymentCode, d.code ?? ""],
        ] as Row[]
      ).filter(([, v]) => present(v));
      if (rows.length) groups.push({ title: instalments > 1 ? fill(L.instalment, { n }) : undefined, rows });
    }
  }
  if (groups.length) sections.push({ kind: "fields", id: "payment", title: L.payment, groups });

  // Transmission.
  const t = header.transmission;
  const transmission = (
    [
      [L.progressive, t.progressive ?? ""],
      [L.format, t.format ?? file.version ?? ""],
      [L.recipientCode, t.recipientCode ?? ""],
      [L.recipientPec, t.recipientPec ?? ""],
    ] as Row[]
  ).filter(([, v]) => present(v));
  if (transmission.length) sections.push({ kind: "fields", id: "transmission", title: L.transmission, groups: [{ rows: transmission }] });

  if (inv.attachments.length) {
    sections.push({
      kind: "attachments",
      id: "attachments",
      title: L.attachments,
      items: inv.attachments.map((a, index) => ({
        index,
        name: a.name ?? `${index + 1}`,
        detail: [a.format, a.description].filter(present).join(" · ") || undefined,
      })),
    });
  }

  return {
    title: invoiceTitle(inv, locale),
    subtitle: inv.date ? fill(L.dated, { date: date(inv.date) }) : "",
    parties: [partyBlock(L.seller, header.seller, L, locale), partyBlock(L.buyer, header.buyer, L, locale)],
    sections,
    notes: file.xmlSigned ? [L.xmlSigned] : [],
    labels: L,
  };

  function refText(id: string | undefined, d: string | undefined): string {
    if (id && d) return fill(L.refDated, { id, date: date(d) });
    return id ?? date(d);
  }
}
