/**
 * JPG to PDF (also PNG, WebP, AVIF, HEIC): add images, reorder them (drag, or Move up / Move down
 * buttons), remove, then make one PDF with one image per page. Building runs in ./worker.ts; files
 * never leave the browser.
 */
import { createDropzone, downloadBlob, formatBytes } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { selectField } from "../image-shared/batch-ui";
import { acceptFor, sniffFormat, type InputFormat } from "../image-shared/formats";
import type { JobErrorCode } from "../image-shared/protocol";
import { button, enableDragSort, entryTracker, errorRegion, h, moveItem, pdfBlob, setDisabled, statusRegion } from "../pdf-shared/dom";
import type { ToolCtx } from "../types";
import { DEFAULT_OPTIONS, pdfName, readOptions } from "./layout";
import type { ToPdfRequest, ToPdfResponse } from "./worker";

const FORMATS: InputFormat[] = ["jpg", "png", "webp", "avif", "heic"];
const ACCEPT = acceptFor(FORMATS);
const FORMAT_NAME: Record<InputFormat, string> = { jpg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF", heic: "HEIC" };
/** Formats every current browser can show in an <img> (HEIC only in Safari, so it gets no thumbnail). */
const PREVIEWABLE: InputFormat[] = ["jpg", "png", "webp", "avif"];

interface Entry {
  id: number;
  file: File;
  /** Sniffed from the first bytes; null once read and not an image we know. */
  format?: InputFormat | null;
  error?: string;
  thumb: HTMLElement;
  thumbUrl?: string;
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let jobId = 0;
  let result: { blob: Blob; name: string } | null = null;
  let worker: Worker | null = null;
  const enterRow = entryTracker();

  // ---------- options ----------
  const pageSize = selectField(
    t("topdf.option.pageSize"),
    [
      { value: "fit", label: t("topdf.option.fit") },
      { value: "a4", label: "A4" },
      { value: "letter", label: t("topdf.option.letter") },
    ],
    DEFAULT_OPTIONS.pageSize,
  );
  const margin = selectField(
    t("topdf.option.margin"),
    [
      { value: "none", label: t("topdf.option.marginNone") },
      { value: "small", label: t("topdf.option.marginSmall") },
    ],
    DEFAULT_OPTIONS.margin,
  );
  const optionNote = h("p", { className: "tool-note", id: `${pageSize.select.id}-note` });
  pageSize.select.setAttribute("aria-describedby", optionNote.id);
  margin.select.setAttribute("aria-describedby", optionNote.id);
  const options = h("div", { className: "tool-options" }, pageSize.wrap, margin.wrap, optionNote);
  const syncOptions = () => {
    const fit = pageSize.select.value === "fit";
    margin.select.disabled = fit;
    optionNote.textContent = t(fit ? "topdf.option.noteFit" : "topdf.option.notePaper");
  };
  syncOptions();
  for (const s of [pageSize.select, margin.select]) {
    s.addEventListener("change", () => {
      syncOptions();
      clearResult();
      render();
    });
  }

  // ---------- layout ----------
  const errors = errorRegion();
  const status = statusRegion();
  const list = h("ol", { className: "tool-list", "aria-label": t("topdf.listLabel") });
  const orderHint = h("p", { className: "tool-note", text: t("topdf.orderHint") });
  const progress = h("progress", { className: "tool-progress", "aria-label": t("topdf.progress"), hidden: true });
  const createBtn = button(t("topdf.action"), { variant: "primary", onClick: () => void create() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions" }, createBtn, resetBtn);
  const resultBox = h("div", { className: "tool-actions", hidden: true });

  const drop = createDropzone({
    accept: ACCEPT,
    multiple: true,
    ctx,
    label: t("topdf.drop"),
    hint: t("topdf.drop.hint"),
    onFiles: ({ ok, rejected }) => {
      const room = ctx.limits.maxFiles > 0 ? ctx.limits.maxFiles - entries.length : ok.length;
      const accepted = ok.slice(0, Math.max(0, room));
      const messages = rejected.map((r) => r.reason);
      if (accepted.length < ok.length) messages.push(t("tool.error.tooMany", { max: ctx.limits.maxFiles }));
      if (messages.length) errors.show(messages);
      else errors.clear();
      add(accepted);
    },
  });

  enableDragSort(list, (from, to) => move(from, to, false));

  el.append(h("div", { className: "tool tool--image-to-pdf" }, drop, options, errors.el, list, orderHint, actions, progress, status.el, resultBox));
  render();

  function add(files: File[]) {
    if (files.length === 0) return;
    clearResult();
    const fresh = files.map((file): Entry => ({ id: nextId++, file, thumb: h("span", { className: "tool-item__thumb", "aria-hidden": "true" }) }));
    entries = entries.concat(fresh);
    render();
    status.set(tPlural(ctx, "topdf.added", fresh.length));
    void Promise.all(
      fresh.map(async (entry) => {
        try {
          entry.format = sniffFormat(new Uint8Array(await entry.file.slice(0, 64).arrayBuffer()));
        } catch {
          entry.format = null;
        }
        if (!entry.format) entry.error = t("topdf.error.decode", { name: entry.file.name });
        else if (PREVIEWABLE.includes(entry.format)) setThumb(entry);
      }),
    ).then(() => {
      // Removed or reset meanwhile: nothing to update.
      if (fresh.some((e) => entries.includes(e))) render();
    });
  }

  function setThumb(entry: Entry) {
    entry.thumbUrl = URL.createObjectURL(entry.file);
    const img = h("img", { className: "tool-item__thumb", alt: "", decoding: "async", src: entry.thumbUrl });
    img.addEventListener("error", () => img.replaceWith(entry.thumb), { once: true });
    entry.thumb = img;
  }

  function revoke(entry: Entry) {
    if (entry.thumbUrl) URL.revokeObjectURL(entry.thumbUrl);
    entry.thumbUrl = undefined;
  }

  function move(from: number, to: number, announce = true) {
    if (busy || to < 0 || to >= entries.length) return;
    clearResult();
    const entry = entries[from]!;
    entries = moveItem(entries, from, to);
    render();
    status.set(t("topdf.moved", { name: entry.file.name, position: to + 1, total: entries.length }));
    if (announce) {
      // Keep keyboard focus on the same control of the moved image.
      const dir = to < from ? "up" : "down";
      const target = list.querySelector<HTMLButtonElement>(`[data-id="${entry.id}"] [data-move="${dir}"]:not(:disabled)`);
      (target ?? list.querySelector<HTMLButtonElement>(`[data-id="${entry.id}"] [data-move]:not(:disabled)`))?.focus();
    }
  }

  function remove(id: number) {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx < 0 || busy) return;
    clearResult();
    const [gone] = entries.splice(idx, 1);
    revoke(gone!);
    render();
    status.set(t("topdf.removed", { name: gone!.file.name }));
    const next = list.querySelectorAll<HTMLElement>(".tool-item")[Math.min(idx, entries.length - 1)];
    (next?.querySelector<HTMLButtonElement>("[data-remove]") ?? drop.querySelector("input"))?.focus();
  }

  function reset() {
    // Start over also stops a PDF that is still being made.
    if (busy) stopWorker();
    busy = false;
    for (const e of entries) revoke(e);
    entries = [];
    errors.clear();
    clearResult();
    progress.hidden = true;
    status.set("");
    render();
    drop.querySelector("input")?.focus();
  }

  function clearResult() {
    result = null;
    resultBox.hidden = true;
    resultBox.replaceChildren();
  }

  function ready() {
    return entries.filter((e) => e.format && !e.error);
  }

  function render() {
    list.replaceChildren(
      ...entries.map((entry, i) => {
        const meta =
          entry.error ?? (entry.format === undefined ? t("topdf.reading") : `${FORMAT_NAME[entry.format!]} · ${formatBytes(entry.file.size)}`);
        const up = button(t("topdf.moveUp"), {
          ariaLabel: t("topdf.moveUpLabel", { name: entry.file.name }),
          onClick: () => move(i, i - 1),
        });
        up.dataset.move = "up";
        setDisabled(up, i === 0 || busy);
        const down = button(t("topdf.moveDown"), {
          ariaLabel: t("topdf.moveDownLabel", { name: entry.file.name }),
          onClick: () => move(i, i + 1),
        });
        down.dataset.move = "down";
        setDisabled(down, i === entries.length - 1 || busy);
        const rm = button(t("tool.remove"), {
          variant: "ghost",
          ariaLabel: t("topdf.removeLabel", { name: entry.file.name }),
          onClick: () => remove(entry.id),
        });
        rm.dataset.remove = "";
        setDisabled(rm, busy);
        const li = h(
          "li",
          {
            className: "tool-item",
            draggable: busy ? "false" : "true",
            "data-index": i,
            "data-id": entry.id,
            "data-state": entry.error ? "error" : entry.format === undefined ? "working" : "pending",
          },
          entry.thumb,
          h("span", { className: "tool-item__name", text: entry.file.name }),
          h("span", { className: "tool-item__meta", text: meta }),
          h("span", { className: "tool-actions" }, up, down, rm),
        );
        enterRow(entry.id, li);
        return li;
      }),
    );
    list.hidden = entries.length === 0;
    orderHint.hidden = entries.length < 2;
    createBtn.disabled = busy || ready().length === 0 || entries.some((e) => e.format === undefined);
    // Once a PDF exists, its Download is the one primary button.
    createBtn.classList.toggle("btn--primary", !result);
    resetBtn.disabled = entries.length === 0;
    pageSize.select.disabled = busy;
    margin.select.disabled = busy || pageSize.select.value === "fit";
  }

  function getWorker(): Worker {
    worker ??= new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "image-to-pdf" });
    return worker;
  }

  function stopWorker() {
    worker?.terminate();
    worker = null;
    jobId++;
  }

  function run(req: ToPdfRequest, onProgress: (done: number, total: number) => void): Promise<ToPdfResponse> {
    const w = getWorker();
    return new Promise((resolve) => {
      const finish = (res: ToPdfResponse) => {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        resolve(res);
      };
      const onMessage = (e: MessageEvent<ToPdfResponse>) => {
        if (e.data.id !== req.id) return;
        if (e.data.type === "progress") onProgress(e.data.done, e.data.total);
        else finish(e.data);
      };
      // Out-of-memory aborts and load failures: start a fresh worker next time.
      const onError = (e: ErrorEvent) => {
        e.preventDefault();
        if (worker === w) stopWorker();
        finish({ type: "error", id: req.id, index: -1, code: "generic", detail: e.message });
      };
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      w.postMessage(req);
    });
  }

  async function create() {
    const items = ready();
    if (items.length === 0 || busy) return;
    busy = true;
    const id = ++jobId;
    clearResult();
    errors.clear();
    progress.max = items.length;
    progress.value = 0;
    progress.hidden = false;
    render();
    status.set(t("topdf.working", { current: 1, total: items.length }));
    const options = readOptions(pageSize.select.value, margin.select.value);
    const res = await run({ id, files: items.map((e) => e.file), options }, (done, total) => {
      if (id !== jobId) return;
      progress.value = done;
      status.set(done < total ? t("topdf.working", { current: done + 1, total }) : t("topdf.saving"));
    });
    // Start over (or a newer job) took over meanwhile.
    if (id !== jobId) return;
    busy = false;
    progress.hidden = true;
    if (res.type === "done") {
      const blob = pdfBlob(new Uint8Array(res.buffer));
      const name = pdfName(items.map((e) => e.file.name), t("topdf.outputName"));
      result = { blob, name };
      const vars = { pages: res.pages, size: formatBytes(blob.size) };
      const dl = button(tPlural(ctx, "topdf.download", res.pages, vars), {
        variant: "primary",
        onClick: () => result && downloadBlob(result.blob, result.name),
      });
      resultBox.replaceChildren(dl);
      resultBox.hidden = false;
      render();
      status.set(tPlural(ctx, "topdf.done", res.pages, vars));
      dl.focus();
    } else if (res.type === "error") {
      const entry = res.index >= 0 ? items[res.index] : undefined;
      const message = entry ? errorText(res.code, entry.file.name) : t("topdf.error.failed");
      if (entry) entry.error = message;
      errors.show(entry ? [message, t("topdf.error.skipHint")] : [message]);
      status.set("");
      render();
    }
  }

  function errorText(code: JobErrorCode, name: string): string {
    if (code === "memory") return t("topdf.error.memory", { name });
    if (code === "unsupported") return t("topdf.error.unsupported", { name });
    return t("topdf.error.decode", { name });
  }

  return () => {
    stopWorker();
    for (const e of entries) revoke(e);
  };
}
