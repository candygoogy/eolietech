/**
 * The readable PDF copy of one invoice (pdf-lib, A4, Helvetica). Draws the same Presented content as
 * the on-page view: title, parties, sections, the lines table (split across pages with its header
 * repeated), page numbers and a footer saying the XML stays the legal invoice. DOM-free.
 *
 * The standard fonts only cover WinAnsi: common typographic characters are mapped, accented letters
 * outside it fall back to their base letter, anything else becomes "?" instead of throwing.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Locale } from "../types";
import type { Column, FieldGroup, PartyBlock, Presented, Row, Table } from "./present";

/* Same as labels.ts fill(). Kept local on purpose: this module is loaded lazily, and a runtime import
 * from a module the client chunk also uses made the bundler load pdf-lib's chunk with the page. */
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const PAGE: [number, number] = [595.28, 841.89];
const M = { left: 42, right: 42, top: 48, bottom: 66 };
const WIDTH = PAGE[0] - M.left - M.right;

const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.38, 0.38, 0.38);
const RULE = rgb(0.8, 0.8, 0.79);
const FILL = rgb(0.94, 0.94, 0.92);
const ACCENT = rgb(0.06, 0.33, 0.38);

const MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u2032": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u2033": '"',
  "\u00a0": " ",
  "\u202f": " ",
  "\u2007": " ",
  "\u2009": " ",
  "\u2002": " ",
  "\u2003": " ",
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\u2026": "...",
  "\t": " ",
};
const DROP = /[\u00ad\u200b-\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/g;

/** Text the font can draw: mapped, de-accented where possible, "?" for the rest. Keeps "\n". */
export function toWinAnsi(text: string, charset: Set<number>): string {
  let out = "";
  for (const ch of text.normalize("NFC").replace(DROP, "")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n") out += ch;
    else if (MAP[ch] !== undefined) out += MAP[ch];
    else if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) out += " ";
    else if (charset.has(cp)) out += ch;
    else {
      const base = ch.normalize("NFD")[0]!;
      out += base !== ch && charset.has(base.codePointAt(0)!) ? base : "?";
    }
  }
  return out;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  charset: Set<number>;
}

/** Wrap to `width`: paragraphs on "\n", words on spaces, words longer than a line by characters. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= width;
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/ +/)) {
      if (word === "") continue;
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      // No Helvetica glyph is narrower than 0.19 em, so a line never holds more than maxChars.
      const maxChars = Math.max(1, Math.ceil(width / (size * 0.19)));
      while (rest.length > maxChars || !fits(rest)) {
        let lo = 1;
        let hi = Math.min(rest.length - 1, maxChars);
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (fits(rest.slice(0, mid))) lo = mid;
          else hi = mid - 1;
        }
        lines.push(rest.slice(0, lo));
        rest = rest.slice(lo);
      }
      line = rest;
    }
    if (line) lines.push(line);
  }
  return lines;
}

class Writer {
  readonly pages: PDFPage[] = [];
  page!: PDFPage;
  /** Top of the next line, in PDF points from the bottom. */
  y = 0;

  constructor(
    private readonly doc: PDFDocument,
    readonly f: Fonts,
  ) {
    this.newPage();
  }

  newPage(): void {
    this.page = this.doc.addPage(PAGE);
    this.pages.push(this.page);
    this.y = PAGE[1] - M.top;
  }

  get atTop(): boolean {
    return this.y >= PAGE[1] - M.top;
  }

  ensure(height: number): void {
    if (this.y - height < M.bottom && !this.atTop) this.newPage();
  }

  clean(text: string): string {
    return toWinAnsi(text, this.f.charset);
  }

  draw(text: string, x: number, top: number, size: number, font: PDFFont, color: RGB = INK): void {
    if (text) this.page.drawText(text, { x, y: top - size * 0.82, size, font, color });
  }

  /** Wrapped text block, breaking across pages line by line. */
  block(text: string, opts: { x?: number; width?: number; size?: number; font?: PDFFont; color?: RGB } = {}): void {
    const { x = M.left, width = WIDTH, size = 9.5, font = this.f.regular, color = INK } = opts;
    const leading = size * 1.35;
    for (const line of wrap(this.clean(text), font, size, width)) {
      this.ensure(leading);
      this.draw(line, x, this.y, size, font, color);
      this.y -= leading;
    }
  }

  heading(text: string): void {
    this.y -= 14;
    this.ensure(40);
    this.draw(this.clean(text), M.left, this.y, 11.5, this.f.bold, ACCENT);
    this.y -= 18;
  }
}

function drawParties(w: Writer, parties: PartyBlock[]): void {
  const gap = 24;
  const colW = (WIDTH - gap) / 2;
  const columns = parties.map((p) => {
    const out: { text: string; size: number; font: PDFFont; color: RGB; lead: number }[] = [];
    const add = (text: string, size: number, font: PDFFont, color: RGB) => {
      for (const line of wrap(w.clean(text), font, size, colW)) out.push({ text: line, size, font, color, lead: size * 1.35 });
    };
    add(p.role, 8, w.f.bold, MUTED);
    add(p.name, 11, w.f.bold, INK);
    for (const l of p.lines) add(l, 9, w.f.regular, INK);
    return out.slice(0, 40);
  });
  const height = Math.max(...columns.map((c) => c.reduce((s, l) => s + l.lead, 0)));
  w.ensure(height);
  const top = w.y;
  columns.forEach((col, i) => {
    let y = top;
    const x = M.left + i * (colW + gap);
    for (const l of col) {
      w.draw(l.text, x, y, l.size, l.font, l.color);
      y -= l.lead;
    }
  });
  w.y = top - height;
}

function drawFields(w: Writer, groups: FieldGroup[]): void {
  const labelW = 150;
  const size = 9.5;
  const lead = size * 1.4;
  groups.forEach((g, gi) => {
    if (gi > 0) w.y -= 4;
    if (g.title) {
      w.ensure(lead * 2);
      w.draw(w.clean(g.title), M.left, w.y, 9, w.f.bold, INK);
      w.y -= lead;
    }
    for (const [label, value] of g.rows) {
      const left = wrap(w.clean(label), w.f.regular, 8.5, labelW - 10);
      const right = wrap(w.clean(value), w.f.regular, size, WIDTH - labelW);
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        w.ensure(lead);
        w.draw(left[i] ?? "", M.left, w.y - 0.5, 8.5, w.f.regular, MUTED);
        w.draw(right[i] ?? "", M.left + labelW, w.y, size, w.f.regular, INK);
        w.y -= lead;
      }
    }
  });
}

function drawTable(w: Writer, table: Table): void {
  const pad = 3;
  const size = 8.5;
  const lead = size * 1.3;
  const total = table.columns.reduce((s, c) => s + c.weight, 0);
  const widths = table.columns.map((c) => (c.weight / total) * WIDTH);
  const xs = widths.map((_, i) => M.left + widths.slice(0, i).reduce((s, v) => s + v, 0));
  /** A left-aligned column right after a right-aligned one starts a little further in. */
  const indent = (i: number) => (i > 0 && table.columns[i - 1]!.align === "right" && table.columns[i]!.align === "left" ? 10 : 0);

  const cellText = (text: string, col: Column, i: number, top: number, font: PDFFont, color: RGB = INK) => {
    const inner = widths[i]! - pad * 2;
    const x = col.align === "right" ? xs[i]! + pad + inner - font.widthOfTextAtSize(text, size) : xs[i]! + pad + indent(i);
    w.draw(text, x, top, size, font, color);
  };

  const header = () => {
    const cells = table.columns.map((c, i) => wrap(w.clean(c.label), w.f.bold, size, widths[i]! - pad * 2 - indent(i)));
    const lines = Math.max(...cells.map((c) => c.length));
    const h = lines * lead + pad * 2;
    w.ensure(h + lead + pad * 2);
    w.page.drawRectangle({ x: M.left, y: w.y - h, width: WIDTH, height: h, color: FILL });
    cells.forEach((c, i) => c.forEach((line, n) => cellText(line, table.columns[i]!, i, w.y - pad - n * lead, w.f.bold)));
    w.y -= h;
  };

  header();
  for (const row of table.rows) {
    const cells = row.map((text, i) => wrap(w.clean(text), w.f.regular, size, widths[i]! - pad * 2 - indent(i)));
    const lines = Math.max(1, ...cells.map((c) => c.length));
    let offset = 0;
    while (offset < lines) {
      const room = Math.floor((w.y - M.bottom - pad * 2) / lead);
      const wanted = lines - offset;
      // Start a row on a new page rather than leave one or two of its lines behind.
      if (room < 1 || (offset === 0 && room < Math.min(wanted, 3))) {
        w.newPage();
        header();
        continue;
      }
      const take = Math.min(room, wanted);
      cells.forEach((c, i) =>
        c.slice(offset, offset + take).forEach((line, n) => cellText(line, table.columns[i]!, i, w.y - pad - n * lead, w.f.regular)),
      );
      w.y -= take * lead + pad * 2;
      offset += take;
      w.page.drawLine({ start: { x: M.left, y: w.y }, end: { x: M.left + WIDTH, y: w.y }, thickness: 0.5, color: RULE });
    }
  }
  if (table.totals.length) drawTotals(w, table.totals);
}

function drawTotals(w: Writer, totals: Row[]): void {
  const size = 9.5;
  const lead = size * 1.45;
  w.y -= 4;
  for (const [label, value] of totals) {
    w.ensure(lead);
    const v = w.clean(value);
    const l = w.clean(label);
    const right = M.left + WIDTH - 3;
    const vw = w.f.bold.widthOfTextAtSize(v, size);
    w.draw(v, right - vw, w.y, size, w.f.bold);
    w.draw(l, right - vw - 14 - w.f.regular.widthOfTextAtSize(l, size), w.y, size, w.f.regular, MUTED);
    w.y -= lead;
  }
}

export interface PdfOptions {
  locale: Locale;
  /** Name of the file the invoice came from, for the footer. */
  sourceName: string;
}

/** Build the PDF for one presented invoice. */
export async function buildInvoicePdf(p: Presented, opts: PdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, { regular, bold, charset: new Set(regular.getCharacterSet()) });
  const L = p.labels;

  w.block(p.title, { size: 18, font: bold });
  w.y -= 2;
  if (p.subtitle) w.block(p.subtitle, { size: 10.5, color: MUTED });
  w.y -= 16;
  drawParties(w, p.parties);

  for (const s of p.sections) {
    w.heading(s.title);
    if (s.kind === "fields") drawFields(w, s.groups);
    else if (s.kind === "table") drawTable(w, s.table);
    else if (s.kind === "text") s.paragraphs.forEach((para) => w.block(para));
    else {
      for (const a of s.items) w.block(a.detail ? `${a.name} (${a.detail})` : a.name);
      w.y -= 2;
      w.block(L.pdfAttachments, { size: 8.5, color: MUTED });
    }
  }
  if (p.notes.length) {
    w.y -= 12;
    for (const n of p.notes) w.block(n, { size: 8.5, color: MUTED });
  }

  // Footer on every page, now that the page count is known.
  const footer = wrap(w.clean(fill(L.footer, { file: opts.sourceName })), regular, 7.5, WIDTH - 90);
  w.pages.forEach((page, i) => {
    const y = M.bottom - 22;
    page.drawLine({ start: { x: M.left, y: y + 10 }, end: { x: M.left + WIDTH, y: y + 10 }, thickness: 0.5, color: RULE });
    footer.forEach((line, n) => page.drawText(line, { x: M.left, y: y - n * 10, size: 7.5, font: regular, color: MUTED }));
    const label = w.clean(fill(L.page, { n: i + 1, total: w.pages.length }));
    page.drawText(label, { x: M.left + WIDTH - regular.widthOfTextAtSize(label, 7.5), y, size: 7.5, font: regular, color: MUTED });
  });

  doc.setTitle(w.clean(`${p.title} ${p.subtitle}`.trim()));
  doc.setLanguage(opts.locale === "it" ? "it-IT" : "en");
  doc.setCreator("Eolietech");
  doc.setProducer("Eolietech (pdf-lib)");
  return doc.save({ useObjectStreams: true });
}
