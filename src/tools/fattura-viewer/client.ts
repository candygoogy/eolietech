/**
 * Italian e-invoice viewer (base page /fatturapa-viewer/; variant /fatturapa-to-pdf/ leads with the
 * PDF buttons). Each file is sniffed: a .p7m (DER, BER or base64) is unwrapped with signed-shared and
 * its signature summed up in one line; the XML inside is read by ./parse.ts. Every invoice in a file
 * gets a row with seller, number, date and total, a readable view on the page and a PDF made with
 * pdf-lib (loaded on first use). Everything stays in this tab.
 */
import { createDropzone, downloadBlob, downloadZip, markEnter, type FileIntake } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { P7mError, innerFileName, isP7m, openP7m, type SignerInfo } from "../signed-shared";
import type { ToolCtx } from "../types";
import { attachmentFileName, decodeBase64, pdfFileName } from "./files";
import { formatDate, formatMoney } from "./format";
import type { Invoice, ParsedFile } from "./model";
import { FatturaError, looksLikeXml, parseFattura } from "./parse";
import { invoiceTitle, presentInvoice, type Presented } from "./present";
import { renderInvoice } from "./view";
import "./fattura.css";

const ACCEPT = ".xml,.p7m,text/xml,application/xml,application/pkcs7-mime";

let uid = 0;

interface Signature {
  name?: string;
  others: number;
  date?: Date;
  check: SignerInfo["check"];
}

interface Source {
  file: File;
  state: "reading" | "ready" | "error";
  error?: string;
  parsed?: ParsedFile;
  /** Name of the XML inside (the .p7m stripped). */
  xmlName: string;
  signature?: Signature;
}

interface Row {
  /** Stable per row, for the panel's id. */
  key: number;
  source: Source;
  /** Invoice index in the file; undefined for the file's reading / error row. */
  index?: number;
  li: HTMLLIElement;
  open: boolean;
  presented?: Presented;
}

/** One line about who signed and whether the signature matches. */
function summarise(layers: SignerInfo[][]): Signature {
  const all = layers.flat();
  const first = all[0];
  const name = first
    ? [first.givenName, first.surname].filter(Boolean).join(" ") || first.commonName || first.organization
    : undefined;
  const check = all.some((s) => s.check === "invalid") ? "invalid" : all.length > 0 && all.every((s) => s.check === "valid") ? "valid" : "unsupported";
  return { name, others: Math.max(0, all.length - 1), date: first?.signingTime, check };
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t, locale } = ctx;
  const pdfFirst = ctx.preset.output === "pdf";
  const id = `fv-${++uid}`;
  let sources: Source[] = [];
  let rows: Row[] = [];
  let destroyed = false;
  let gen = 0;
  let rowSeq = 0;
  let queue: Promise<void> = Promise.resolve();

  const tool = h("div", { className: "tool" });
  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({ accept: ACCEPT, multiple: true, ctx, onFiles: add, hint: t("fv.drop.hint") });
  const progress = h("progress", { className: "tool-progress", "aria-label": t("fv.progress"), hidden: true });
  const list = h("ul", { className: "tool-list fv-list", "aria-label": t("fv.list") });
  const zipBtn = button(t("fv.downloadAllPdf"), { variant: pdfFirst ? "primary" : undefined, onClick: () => void zipAll() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, zipBtn, resetBtn);

  tool.append(drop, errors.el, progress, status.el, list, actions);
  el.append(tool);

  function add(intake: FileIntake) {
    const messages = intake.rejected.map((r) => r.reason);
    let files = intake.ok;
    const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - sources.length : files.length;
    if (files.length > room) {
      files = files.slice(0, Math.max(0, room));
      messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
    }
    if (messages.length) errors.show(messages);
    else errors.clear();
    for (const file of files) {
      const source: Source = { file, state: "reading", xmlName: innerFileName(file.name) };
      sources.push(source);
      const row: Row = { key: ++rowSeq, source, li: h("li", { className: "tool-item" }), open: false };
      markEnter(row.li);
      rows.push(row);
      list.append(row.li);
      renderRow(row);
      enqueue(source);
    }
    render();
  }

  async function read(source: Source): Promise<void> {
    let bytes: Uint8Array = new Uint8Array(await source.file.arrayBuffer());
    if (!looksLikeXml(bytes) && isP7m(bytes)) {
      const opened = await openP7m(bytes);
      source.signature = summarise(opened.layers);
      bytes = opened.content;
    }
    source.parsed = parseFattura(bytes);
  }

  function errorText(e: unknown): string {
    if (e instanceof FatturaError) return t(`fv.error.${e.code}`);
    if (e instanceof P7mError) return t(e.code === "detached" ? "fv.error.detached" : "fv.error.p7m");
    return t("fv.error.generic");
  }

  /** Read one file at a time; a file's rows replace its "reading" row in place. */
  function enqueue(source: Source) {
    const jobGen = gen;
    queue = queue.then(async () => {
      if (destroyed || jobGen !== gen || !sources.includes(source)) return;
      try {
        await read(source);
        source.state = "ready";
      } catch (e) {
        source.state = "error";
        source.error = errorText(e);
      }
      await new Promise((r) => setTimeout(r, 0));
      if (destroyed || jobGen !== gen || !sources.includes(source)) return;
      const placeholder = rows.find((r) => r.source === source);
      if (!placeholder) return;
      if (source.state === "ready" && source.parsed) {
        const fresh: Row[] = source.parsed.invoices.map((_, index) => ({
          key: ++rowSeq,
          source,
          index,
          li: h("li", { className: "tool-item" }),
          open: false,
        }));
        rows.splice(rows.indexOf(placeholder), 1, ...fresh);
        placeholder.li.replaceWith(...fresh.map((r) => r.li));
        fresh.forEach(renderRow);
      } else {
        renderRow(placeholder);
      }
      render();
    });
  }

  const presentFor = (row: Row): Presented => {
    const { parsed } = row.source;
    row.presented ??= presentInvoice(parsed!, parsed!.invoices[row.index!]!, locale);
    return row.presented;
  };

  async function pdfBlob(row: Row): Promise<{ name: string; blob: Blob }> {
    const { buildInvoicePdf } = await import("./pdf");
    const bytes = await buildInvoicePdf(presentFor(row), { locale, sourceName: row.source.file.name });
    const count = row.source.parsed!.invoices.length;
    return { name: pdfFileName(row.source.file.name, row.index, count), blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) };
  }

  async function downloadPdf(row: Row, btn: HTMLButtonElement) {
    btn.disabled = true;
    try {
      const { name, blob } = await pdfBlob(row);
      downloadBlob(blob, name);
    } catch {
      errors.show(t("fv.error.pdf", { name: row.source.file.name }));
    } finally {
      btn.disabled = false;
    }
  }

  async function zipAll() {
    const ready = rows.filter((r) => r.index !== undefined);
    if (ready.length === 0) return;
    zipBtn.disabled = true;
    status.set(t("fv.status.zipping"));
    try {
      const files: { name: string; blob: Blob }[] = [];
      const used = new Set<string>();
      for (const row of ready) {
        const out = await pdfBlob(row);
        let name = out.name;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = out.name.replace(/\.pdf$/, `-${n}.pdf`);
        used.add(name.toLowerCase());
        files.push({ name, blob: out.blob });
      }
      await downloadZip(files, t("fv.zipName"));
      render();
    } catch {
      errors.show(t("tool.error.generic"));
      render();
    } finally {
      zipBtn.disabled = false;
    }
  }

  function saveAttachment(inv: Invoice, index: number) {
    const a = inv.attachments[index];
    if (!a) return;
    const bytes = decodeBase64(a.data);
    if (!bytes) {
      errors.show(t("fv.error.attachment", { name: a.name ?? String(index + 1) }));
      return;
    }
    // Always a download with a generic type, never opened in the page.
    const name = attachmentFileName(a.name, a.format, t("fv.attachmentFallback", { n: index + 1 }));
    downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }), name);
  }

  function reset() {
    sources = [];
    rows = [];
    gen++;
    list.replaceChildren();
    errors.clear();
    render();
    drop.querySelector("input")?.focus();
  }

  function removeRow(row: Row) {
    const index = rows.indexOf(row);
    rows = rows.filter((r) => r !== row);
    if (!rows.some((r) => r.source === row.source)) sources = sources.filter((s) => s !== row.source);
    row.li.remove();
    render();
    const next = rows[Math.min(index, rows.length - 1)];
    (next?.li.querySelector<HTMLButtonElement>(".tool-actions .btn--ghost") ?? drop.querySelector("input"))?.focus();
  }

  // ---------- rendering ----------

  const signedOn = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en", { dateStyle: "long" });

  function signatureLine(sig: Signature): HTMLElement {
    const who = sig.name ? (sig.others > 0 ? tPlural(ctx, "fv.sig.more", sig.others, { name: sig.name }) : sig.name) : undefined;
    const valid = sig.date && !Number.isNaN(sig.date.getTime());
    const first = who
      ? valid
        ? t("fv.sig.byOn", { name: who, date: signedOn.format(sig.date) })
        : t("fv.sig.by", { name: who })
      : t("fv.sig.signed");
    return h(
      "p",
      { className: "fv-signature", "data-check": sig.check },
      `${first} ${t(`fv.sig.${sig.check}`)} `,
      h("a", { href: t("fv.sig.href"), text: t("fv.sig.link") }),
    );
  }

  function renderRow(row: Row) {
    const { li, source } = row;
    li.replaceChildren();
    const body = h("div", {});
    const meta = h("p", { className: "tool-item__meta" });
    const buttons = h("div", { className: "tool-actions" });

    if (row.index === undefined) {
      li.dataset.state = source.state === "reading" ? "working" : "error";
      body.append(h("p", { className: "tool-item__name", text: source.file.name }), meta);
      meta.textContent = source.state === "reading" ? t("fv.status.reading") : `${source.file.name}: ${source.error ?? t("fv.error.generic")}`;
      li.append(body);
    } else {
      li.dataset.state = "pending";
      const parsed = source.parsed!;
      const inv = parsed.invoices[row.index]!;
      const count = parsed.invoices.length;
      const seller = parsed.header.seller.name ?? parsed.header.seller.vat ?? source.file.name;
      const facts = [invoiceTitle(inv, locale), formatDate(inv.date, locale), formatMoney(inv.total, inv.currency, locale)].filter(Boolean);
      meta.textContent = facts.join(" · ");
      const fileLine = count > 1 ? t("fv.fileOf", { name: source.file.name, n: row.index + 1, count }) : source.file.name;
      body.append(
        h("p", { className: "tool-item__name", text: seller }),
        meta,
        h("p", { className: "fv-file", text: fileLine }),
        ...(source.signature ? [signatureLine(source.signature)] : []),
      );
      li.append(body);

      const panelId = `${id}-inv-${row.key}`;
      const viewBtn = button(t(row.open ? "fv.hide" : "fv.view"), {
        ariaLabel: t(row.open ? "fv.hideNamed" : "fv.viewNamed", { name: seller }),
      });
      viewBtn.setAttribute("aria-expanded", String(row.open));
      viewBtn.setAttribute("aria-controls", panelId);
      const pdfBtn = button(t("fv.downloadPdf"), {
        variant: pdfFirst ? "primary" : undefined,
        ariaLabel: t("fv.downloadPdfNamed", { name: pdfFileName(source.file.name, row.index, count) }),
      });
      pdfBtn.addEventListener("click", () => void downloadPdf(row, pdfBtn));
      const panel = row.open
        ? renderInvoice(presentFor(row), {
            id: panelId,
            downloadText: t("tool.download"),
            attachmentLabel: (name) => t("fv.attachmentNamed", { name }),
            onAttachment: (i) => saveAttachment(inv, i),
          })
        : h("div", { id: panelId, hidden: true });
      viewBtn.addEventListener("click", () => {
        row.open = !row.open;
        renderRow(row);
        li.querySelector<HTMLButtonElement>("[aria-expanded]")?.focus();
      });
      if (pdfFirst) buttons.append(pdfBtn, viewBtn);
      else buttons.append(viewBtn, pdfBtn);
      li.append(buttons, panel);
    }

    buttons.append(
      button(t("fv.removeFile"), {
        variant: "ghost",
        ariaLabel: t("fv.removeNamed", { name: source.file.name }),
        onClick: () => removeRow(row),
      }),
    );
    if (row.index === undefined) li.append(buttons);
  }

  /** Summary, progress and the global buttons. */
  function render() {
    const total = sources.length;
    const reading = sources.filter((s) => s.state === "reading").length;
    const failed = sources.filter((s) => s.state === "error").length;
    const invoices = rows.filter((r) => r.index !== undefined).length;

    actions.hidden = total === 0;
    progress.hidden = reading === 0;
    progress.max = Math.max(1, total);
    progress.value = total - reading;
    zipBtn.hidden = invoices < 2;

    if (total === 0) return status.set("");
    if (reading > 0) return status.set(tPlural(ctx, "fv.summary.reading", total, { done: total - reading, total }));
    const parts: string[] = [];
    if (invoices > 0) parts.push(tPlural(ctx, "fv.summary.read", invoices));
    if (failed > 0) parts.push(tPlural(ctx, "fv.summary.failed", failed));
    status.set(parts.join(" "));
  }

  return () => {
    destroyed = true;
    tool.remove();
  };
}
