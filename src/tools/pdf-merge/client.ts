/**
 * Merge PDF: add several PDFs, reorder (drag or Move up/down buttons), remove, merge with pdf-lib.
 * Everything happens in the browser; pdf-lib is loaded once the first file is added.
 */
import type { PDFDocument } from "pdf-lib";
import { createDropzone, downloadBlob, formatBytes } from "../../lib/tool-ui";
import type { ToolCtx } from "../types";
import { button, enableDragSort, entryTracker, setDisabled, errorMessage, errorRegion, h, moveItem, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";

const ACCEPT = "application/pdf,.pdf";

interface Entry {
  id: number;
  file: File;
  doc?: PDFDocument;
  pages?: number;
  error?: string;
  loading: boolean;
}

export function mount(el: HTMLElement, ctx: ToolCtx): void {
  const { t } = ctx;
  let entries: Entry[] = [];
  let nextId = 1;
  let busy = false;
  let result: { blob: Blob; pages: number } | null = null;
  const ops = () => import("../pdf-shared/pdf-ops");
  // render() rebuilds the list (also on every move): only rows shown for the first time play the entry.
  const enterRow = entryTracker();

  const errors = errorRegion();
  const status = statusRegion();
  const list = h("ol", { className: "tool-list", "aria-label": t("merge.listLabel") });
  const mergeBtn = button(t("merge.action"), { variant: "primary", onClick: () => void merge() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions" }, mergeBtn, resetBtn);
  const resultBox = h("div", { className: "tool-actions", hidden: true });

  const drop = createDropzone({
    accept: ACCEPT,
    multiple: true,
    ctx,
    label: t("merge.drop"),
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

  el.append(
    h(
      "div",
      { className: "tool tool--pdf-merge" },
      drop,
      errors.el,
      list,
      h("p", { className: "tool-note", text: t("merge.orderHint") }),
      actions,
      status.el,
      resultBox,
    ),
  );
  render();

  function add(files: File[]) {
    if (files.length === 0) return;
    clearResult();
    const fresh = files.map((file): Entry => ({ id: nextId++, file, loading: true }));
    entries = entries.concat(fresh);
    render();
    status.set(t("merge.added", { count: fresh.length }));
    void (async () => {
      const { loadPdf } = await ops();
      const failed: string[] = [];
      for (const entry of fresh) {
        try {
          entry.doc = await loadPdf(await readFile(entry.file));
          entry.pages = entry.doc.getPageCount();
        } catch (err) {
          entry.error = errorMessage(err, ctx, entry.file.name);
          failed.push(entry.error);
        }
        entry.loading = false;
        render();
      }
      if (failed.length) errors.show(failed);
    })();
  }

  function move(from: number, to: number, announce = true) {
    if (to < 0 || to >= entries.length) return;
    clearResult();
    const entry = entries[from]!;
    entries = moveItem(entries, from, to);
    render();
    status.set(t("merge.moved", { name: entry.file.name, position: to + 1, total: entries.length }));
    if (announce) {
      // Keep keyboard focus on the same control of the moved file.
      const dir = to < from ? "up" : "down";
      const target = list.querySelector<HTMLButtonElement>(`[data-id="${entry.id}"] [data-move="${dir}"]:not(:disabled)`);
      (target ?? list.querySelector<HTMLButtonElement>(`[data-id="${entry.id}"] [data-move]:not(:disabled)`))?.focus();
    }
  }

  function remove(id: number) {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx < 0) return;
    clearResult();
    const [gone] = entries.splice(idx, 1);
    render();
    status.set(t("merge.removed", { name: gone!.file.name }));
    const next = list.querySelectorAll<HTMLElement>(".tool-item")[Math.min(idx, entries.length - 1)];
    (next?.querySelector<HTMLButtonElement>("[data-remove]") ?? mergeBtn).focus();
  }

  function reset() {
    entries = [];
    errors.clear();
    clearResult();
    status.set("");
    render();
  }

  function clearResult() {
    result = null;
    resultBox.hidden = true;
    resultBox.replaceChildren();
  }

  function render() {
    list.replaceChildren(
      ...entries.map((entry, i) => {
        const meta = entry.loading
          ? t("merge.reading")
          : entry.error
            ? entry.error
            : `${t("merge.pages", { count: entry.pages ?? 0 })} · ${formatBytes(entry.file.size)}`;
        const up = button(t("merge.moveUp"), {
          ariaLabel: t("merge.moveUpLabel", { name: entry.file.name }),
          onClick: () => move(i, i - 1),
        });
        up.dataset.move = "up";
        setDisabled(up, i === 0 || busy);
        const down = button(t("merge.moveDown"), {
          ariaLabel: t("merge.moveDownLabel", { name: entry.file.name }),
          onClick: () => move(i, i + 1),
        });
        down.dataset.move = "down";
        setDisabled(down, i === entries.length - 1 || busy);
        const rm = button(t("tool.remove"), {
          variant: "ghost",
          ariaLabel: t("merge.removeLabel", { name: entry.file.name }),
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
            "data-state": entry.loading ? "working" : entry.error ? "error" : "pending",
          },
          h("span", { className: "tool-item__name", text: entry.file.name }),
          h("span", { className: "tool-item__meta", text: meta }),
          h("span", { className: "tool-actions" }, up, down, rm),
        );
        enterRow(entry.id, li);
        return li;
      }),
    );
    list.hidden = entries.length === 0;
    const ready = entries.filter((e) => e.doc && !e.error);
    mergeBtn.disabled = busy || ready.length < 2 || entries.some((e) => e.loading);
    resetBtn.disabled = busy || entries.length === 0;
  }

  async function merge() {
    const docs = entries.filter((e) => e.doc && !e.error).map((e) => e.doc!);
    if (docs.length < 2) return;
    busy = true;
    clearResult();
    errors.clear();
    render();
    status.set(t("merge.working", { count: docs.length }));
    try {
      const { mergeDocuments } = await ops();
      const bytes = await mergeDocuments(docs);
      const pages = docs.reduce((n, d) => n + d.getPageCount(), 0);
      result = { blob: pdfBlob(bytes), pages };
      const name = t("merge.outputName");
      const dl = button(t("merge.download", { pages, size: formatBytes(result.blob.size) }), {
        variant: "primary",
        onClick: () => result && downloadBlob(result.blob, name),
      });
      resultBox.replaceChildren(dl);
      resultBox.hidden = false;
      status.set(t("merge.done", { pages, size: formatBytes(result.blob.size) }));
      dl.focus();
    } catch (err) {
      errors.show(errorMessage(err, ctx, t("merge.outputName")));
      status.set("");
    } finally {
      busy = false;
      render();
    }
  }
}
