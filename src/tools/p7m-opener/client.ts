/**
 * P7M opener (base page /open-p7m-file/; variant /p7m-to-pdf/ words the PDF download as the goal).
 * Each file is sniffed (not trusted by its extension), unwrapped through every envelope by
 * ../signed-shared and listed with its signers and the result of the signature check. Parsing and
 * WebCrypto run on the main thread, one file at a time.
 */
import { tPlural } from "../../i18n/plural";
import { createDropzone, downloadBlob, downloadZip, formatBytes, markEnter, type FileIntake } from "../../lib/tool-ui";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { uniqueNames } from "../image-shared/formats";
import { P7mError, innerFileName, isP7m, openP7m, type P7mErrorCode, type SignerInfo } from "../signed-shared";
import type { ToolCtx } from "../types";
import { downloadName, isFatturaPa, overallCheck, signerId, signerName, sniffContent, withPreposition, type Sniffed } from "./inspect";
import "./p7m.css";

/** Every file is accepted and sniffed: .p7m files often arrive renamed, or with no type the picker knows. */
const ACCEPT = "";

interface Opened {
  layers: SignerInfo[][];
  sniff: Sniffed;
  blob: Blob;
  /** Name to save the document under. */
  name: string;
  fattura: boolean;
  check: SignerInfo["check"];
}

interface Item {
  file: File;
  state: "reading" | "ready" | "error";
  error?: P7mErrorCode;
  opened?: Opened;
  /** Object URL behind the Open link (PDFs only). */
  openUrl?: string;
  li: HTMLLIElement;
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const toPdf = ctx.preset.to === "pdf";
  let items: Item[] = [];
  let destroyed = false;
  /** Bumped by Start over, so stale reads are dropped. */
  let gen = 0;
  let queue: Promise<void> = Promise.resolve();

  const tool = h("div", { className: "tool" });
  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({ accept: ACCEPT, multiple: true, ctx, onFiles: add, hint: t("p7m.drop.hint") });
  const progress = h("progress", { className: "tool-progress", "aria-label": t("p7m.progress"), hidden: true });
  const list = h("ul", { className: "tool-list", "aria-label": t("p7m.list") });

  // What the check covers and what it does not: shown with the results, never folded away.
  const note = h(
    "p",
    { className: "tool-note p7m-note", hidden: true },
    t("p7m.note"),
    " ",
    h("a", { href: t("p7m.note.href"), text: t("p7m.note.link"), rel: "noopener noreferrer", target: "_blank" }),
    t("p7m.note.end"),
  );

  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void zipAll() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, zipBtn, resetBtn);

  tool.append(drop, errors.el, progress, status.el, list, note, actions);
  el.append(tool);

  function add(intake: FileIntake) {
    const messages = intake.rejected.map((r) => r.reason);
    let files = intake.ok;
    const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - items.length : files.length;
    if (files.length > room) {
      files = files.slice(0, Math.max(0, room));
      messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
    }
    if (messages.length) errors.show(messages);
    else errors.clear();
    for (const file of files) {
      const item: Item = { file, state: "reading", li: h("li", { className: "tool-item" }) };
      markEnter(item.li);
      items.push(item);
      list.append(item.li);
      renderItem(item);
      enqueue(item);
    }
    render();
  }

  /** Open one file at a time, yielding between files so the page stays responsive. */
  function enqueue(item: Item) {
    const jobGen = gen;
    const alive = () => !destroyed && jobGen === gen && items.includes(item);
    queue = queue.then(async () => {
      if (!alive()) return;
      try {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        if (!isP7m(bytes)) throw new P7mError("not-p7m");
        const { content, layers } = await openP7m(bytes);
        const sniff = sniffContent(content);
        item.opened = {
          layers,
          sniff,
          blob: new Blob([content as Uint8Array<ArrayBuffer>], { type: sniff.mime }),
          name: downloadName(innerFileName(item.file.name), sniff),
          fattura: sniff.kind === "xml" && isFatturaPa(content),
          check: overallCheck(layers),
        };
        item.state = "ready";
      } catch (e) {
        item.error = e instanceof P7mError ? e.code : "malformed";
        item.state = "error";
      }
      await new Promise((r) => setTimeout(r, 0));
      if (!alive()) return;
      renderItem(item);
      render();
    });
  }

  async function zipAll() {
    const ready = items.filter((i) => i.opened);
    if (ready.length < 2) return;
    const names = uniqueNames(ready.map((i) => i.opened!.name));
    zipBtn.disabled = true;
    try {
      await downloadZip(
        ready.map((i, n) => ({ name: names[n]!, blob: i.opened!.blob })),
        t("p7m.zipName"),
      );
    } catch {
      errors.show(t("tool.error.generic"));
    } finally {
      zipBtn.disabled = false;
    }
  }

  function reset() {
    for (const item of items) revoke(item);
    items = [];
    gen++;
    list.replaceChildren();
    errors.clear();
    render();
    drop.querySelector("input")?.focus();
  }

  function revoke(item: Item) {
    if (item.openUrl) URL.revokeObjectURL(item.openUrl);
    item.openUrl = undefined;
  }

  // ---------- rendering ----------

  const dateTime = new Intl.DateTimeFormat(ctx.locale, { dateStyle: "long", timeStyle: "short" });
  const dateOnly = new Intl.DateTimeFormat(ctx.locale, { dateStyle: "long" });
  const valid = (d: Date) => !Number.isNaN(d.getTime());

  function typeLabel(s: Sniffed): string {
    return s.kind === "image" ? t("p7m.type.image", { format: s.format ?? "" }) : t(`p7m.type.${s.kind === "other" ? "unknown" : s.kind}`);
  }

  function checkText(s: SignerInfo): string {
    if (s.check === "valid") return t("p7m.check.valid");
    if (s.check === "invalid") return t(s.reason === "digest-mismatch" ? "p7m.check.changed" : "p7m.check.damaged");
    if (s.reason === "no-certificate") return t("p7m.check.noCertificate");
    if (s.reason === "no-webcrypto") return t("p7m.check.noWebCrypto");
    return t("p7m.check.unsupported", { method: s.signatureAlgorithm });
  }

  function signerBlock(s: SignerInfo): HTMLElement {
    const name = signerName(s);
    const lines: HTMLLIElement[] = [];
    const line = (text: string) => lines.push(h("li", { text }));
    const id = signerId(s.serialNumber);
    if (id) line("taxCode" in id ? t("p7m.signer.taxCode", { code: id.taxCode }) : t("p7m.signer.id", { id: id.id }));
    if (s.organization) line(t("p7m.signer.organization", { name: s.organization }));
    if (s.issuer) line(t("p7m.signer.issuer", { name: s.issuer }));
    if (s.signingTime && valid(s.signingTime)) {
      line(t("p7m.signer.signedOn", { date: withPreposition(ctx.locale, "il", dateTime.format(s.signingTime)) }));
    }
    if (valid(s.notBefore) && valid(s.notAfter)) {
      line(
        t("p7m.signer.validity", {
          from: withPreposition(ctx.locale, "dal", dateOnly.format(s.notBefore)),
          until: withPreposition(ctx.locale, "al", dateOnly.format(s.notAfter)),
        }),
      );
    }
    if (s.certValidAtSigning === false) line(t("p7m.signer.notValidAtSigning"));
    if (s.hasTimestamp) line(t("p7m.signer.timestamp"));
    return h(
      "div",
      { className: "p7m-signer" },
      h("p", { className: "p7m-signer__name", text: name ?? t("p7m.signer.unnamed") }),
      lines.length ? h("ul", { className: "p7m-facts" }, ...lines) : null,
      h("p", { className: "p7m-check", "data-check": s.check, text: checkText(s) }),
    );
  }

  function layerLabel(n: number, total: number): string {
    const base = t("p7m.layer", { n: n + 1, total });
    if (n === 0) return `${base} ${t("p7m.layer.outer")}`;
    if (n === total - 1) return `${base} ${t("p7m.layer.inner")}`;
    return base;
  }

  function signatures(layers: SignerInfo[][]): HTMLElement {
    const box = h("div", { className: "p7m-signatures" });
    layers.forEach((signers, n) => {
      if (layers.length > 1) box.append(h("p", { className: "p7m-layer", text: layerLabel(n, layers.length) }));
      if (signers.length === 0) box.append(h("p", { className: "p7m-check", "data-check": "unsupported", text: t("p7m.layer.empty") }));
      for (const s of signers) box.append(signerBlock(s));
    });
    return box;
  }

  function renderItem(item: Item) {
    const { li, file, opened } = item;
    li.dataset.state = item.state === "reading" ? "working" : item.state === "error" ? "error" : "done";
    if (opened) li.dataset.check = opened.check;
    else delete li.dataset.check;
    li.replaceChildren();

    const shownName = opened?.name ?? file.name;
    const meta = h("p", { className: "tool-item__meta" });
    const body = h("div", {}, h("p", { className: "tool-item__name", text: shownName }), meta);
    const row = h("div", { className: "tool-actions" });

    if (item.state === "reading") {
      meta.textContent = t("p7m.status.reading", { size: formatBytes(file.size) });
    } else if (item.state === "error") {
      meta.textContent = `${file.name}: ${t(`p7m.error.${item.error ?? "malformed"}`)}`;
    } else if (opened) {
      meta.textContent = `${typeLabel(opened.sniff)} · ${formatBytes(opened.blob.size)}`;
      body.append(signatures(opened.layers));
      if (toPdf && opened.sniff.kind !== "pdf" && !opened.fattura) {
        body.append(h("p", { className: "p7m-hint", text: t("p7m.notPdf", { type: typeLabel(opened.sniff) }) }));
      }
      if (opened.fattura) {
        body.append(
          h("p", { className: "p7m-hint" }, t("p7m.fattura"), " ", h("a", { href: t("p7m.fattura.href"), text: t("p7m.fattura.link") }), "."),
        );
      }
      const isPdf = opened.sniff.kind === "pdf";
      row.append(
        button(t(toPdf && isPdf ? "p7m.downloadPdf" : "tool.download"), {
          variant: toPdf && isPdf ? "primary" : undefined,
          ariaLabel: t(toPdf && isPdf ? "p7m.downloadPdfNamed" : "p7m.downloadNamed", { name: opened.name }),
          onClick: () => downloadBlob(opened.blob, opened.name),
        }),
      );
      if (isPdf) {
        item.openUrl ??= URL.createObjectURL(opened.blob);
        row.append(
          h("a", {
            className: "btn",
            href: item.openUrl,
            target: "_blank",
            rel: "noopener",
            text: t("p7m.open"),
            "aria-label": t("p7m.openNamed", { name: opened.name }),
          }),
        );
      }
    }

    row.append(
      button(t("p7m.removeFile"), {
        variant: "ghost",
        ariaLabel: t("p7m.removeNamed", { name: shownName }),
        onClick: () => {
          const index = items.indexOf(item);
          revoke(item);
          items = items.filter((i) => i !== item);
          li.remove();
          render();
          const next = items[Math.min(index, items.length - 1)];
          (next?.li.querySelector<HTMLButtonElement>("button:last-of-type") ?? drop.querySelector("input"))?.focus();
        },
      }),
    );
    li.append(body, row);
  }

  /** Summary, progress and the global buttons. */
  function render() {
    const total = items.length;
    const reading = items.filter((i) => i.state === "reading").length;
    const opened = items.filter((i) => i.opened);
    const failed = items.filter((i) => i.state === "error").length;

    actions.hidden = total === 0;
    note.hidden = total === 0;
    progress.hidden = reading === 0;
    progress.max = Math.max(1, total);
    progress.value = total - reading;
    zipBtn.hidden = reading > 0 || opened.length < 2;

    if (total === 0) return status.set("");
    if (reading > 0) return status.set(tPlural(ctx, "p7m.summary.reading", total, { done: total - reading, total }));
    const parts: string[] = [];
    if (opened.length > 0) {
      parts.push(tPlural(ctx, "p7m.summary.opened", opened.length));
      const invalid = opened.filter((i) => i.opened!.check === "invalid").length;
      const unchecked = opened.filter((i) => i.opened!.check === "unsupported").length;
      if (invalid > 0) parts.push(tPlural(ctx, "p7m.summary.invalid", invalid));
      if (unchecked > 0) parts.push(tPlural(ctx, "p7m.summary.unchecked", unchecked));
      const signatures = opened.reduce((n, i) => n + i.opened!.layers.flat().length, 0);
      if (invalid === 0 && unchecked === 0) parts.push(tPlural(ctx, "p7m.summary.valid", signatures));
    }
    if (failed > 0) parts.push(tPlural(ctx, "p7m.summary.failed", failed));
    status.set(parts.join(" "));
  }

  return () => {
    destroyed = true;
    for (const item of items) revoke(item);
    tool.remove();
  };
}
