/**
 * PDF to JPG / PNG: one PDF -> one image per chosen page, rendered with PDF.js and encoded by the
 * browser (canvas.toBlob). PDF.js parses in its own worker; drawing happens here one page at a time,
 * with a pixel cap per page (plan.ts) so a poster at 300 dpi cannot exhaust memory. One image is
 * saved directly, several go into one .zip. Nothing leaves the browser.
 */
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, downloadZip, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { baseName, button, errorMessage, errorRegion, h, readFile, statusRegion } from "../pdf-shared/dom";
import {
  DEFAULT_DPI,
  DPI_CHOICES,
  JPEG_QUALITY,
  MIME,
  initialFormat,
  padPage,
  pageSize,
  planPages,
  type ImageFormat,
  type PagePlan,
} from "./plan";

const ACCEPT = "application/pdf,.pdf";
let uid = 0;

class Cancelled extends Error {}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const id = `pdf-to-image-${++uid}`;
  let source: { file: File; doc: PDFDocumentProxy } | null = null;
  let outputs: { name: string; blob: Blob }[] = [];
  /** Bumped by every new file, reset and stop: running work checks it between pages. */
  let generation = 0;
  let task: RenderTask | null = null;

  const errors = errorRegion();
  const status = statusRegion();

  const drop = createDropzone({
    accept: ACCEPT,
    multiple: false,
    ctx,
    onFiles: ({ ok, rejected }) => {
      if (rejected.length) errors.show(rejected.map((r) => r.reason));
      else errors.clear();
      if (ok[0]) void open(ok[0]);
    },
  });

  const fileInfo = h("p", { className: "tool-item__meta" });

  const select = (key: string, choices: { value: string; label: string }[], value: string) => {
    const s = h("select", { id: `${id}-${key}` }, ...choices.map((c) => h("option", { value: c.value, text: c.label })));
    s.value = value;
    s.addEventListener("change", clearOutputs);
    return { s, wrap: h("div", {}, h("label", { for: `${id}-${key}`, text: t(`p2i.${key}.label`) }), s) };
  };
  const format = select(
    "format",
    (["jpg", "png"] as const).map((f) => ({ value: f, label: t(`p2i.format.${f}`) })),
    initialFormat(ctx.preset),
  );
  const dpi = select(
    "dpi",
    DPI_CHOICES.map((d) => ({ value: String(d), label: t(`p2i.dpi.${d}`) })),
    String(DEFAULT_DPI),
  );
  const settings = h("div", { className: "tool-options", hidden: true }, format.wrap, dpi.wrap);

  const radio = (value: string, label: string, checked = false) => {
    const input = h("input", { type: "radio", name: `${id}-pages`, value, id: `${id}-pages-${value}`, checked });
    input.addEventListener("change", syncPages);
    return { input, row: h("div", {}, input, " ", h("label", { for: `${id}-pages-${value}`, text: label })) };
  };
  const rAll = radio("all", t("p2i.pages.all"), true);
  const rSome = radio("some", t("p2i.pages.some"));
  const rangesInput = h("input", {
    type: "text",
    id: `${id}-ranges`,
    inputmode: "text",
    autocomplete: "off",
    spellcheck: "false",
    placeholder: t("p2i.ranges.placeholder"),
    "aria-describedby": `${id}-ranges-hint`,
  });
  const rangesBox = h(
    "div",
    { hidden: true },
    h("label", { for: `${id}-ranges`, text: t("p2i.ranges.label") }),
    " ",
    rangesInput,
    h("p", { className: "tool-note", id: `${id}-ranges-hint`, text: t("p2i.ranges.hint") }),
  );
  const pagesBox = h(
    "fieldset",
    { className: "tool-options", hidden: true },
    h("legend", { text: t("p2i.pages.legend") }),
    rAll.row,
    rSome.row,
    rangesBox,
  );

  const convertBtn = button(t("p2i.action"), { variant: "primary", onClick: () => void convert() });
  const stopBtn = button(t("p2i.stop"), { variant: "ghost", onClick: stop });
  stopBtn.hidden = true;
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, convertBtn, stopBtn, resetBtn);
  const progress = h("progress", { className: "tool-progress", max: 1, value: 0, hidden: true });
  const resultActions = h("div", { className: "tool-actions", hidden: true });
  const cappedNote = h("p", { className: "tool-note", hidden: true });

  rangesInput.addEventListener("input", clearOutputs);
  rangesInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void convert();
  });

  el.append(
    h(
      "div",
      { className: "tool tool--pdf-to-image" },
      drop,
      errors.el,
      fileInfo,
      settings,
      pagesBox,
      actions,
      progress,
      status.el,
      resultActions,
      cappedNote,
    ),
  );

  function syncPages() {
    rangesBox.hidden = !rSome.input.checked;
    clearOutputs();
    if (rSome.input.checked) rangesInput.focus();
  }

  async function open(file: File) {
    reset();
    const gen = generation;
    status.set(t("p2i.reading", { name: file.name }));
    try {
      const { openForRender } = await import("../pdf-shared/pdfjs");
      const doc = await openForRender(await readFile(file));
      if (gen !== generation) {
        void doc.loadingTask.destroy();
        return;
      }
      if (doc.numPages === 0) {
        void doc.loadingTask.destroy();
        throw new PdfToolError("empty");
      }
      source = { file, doc };
      const pages = doc.numPages;
      fileInfo.textContent = tPlural(ctx, "p2i.fileInfo", pages, { name: file.name, pages, size: formatBytes(file.size) });
      settings.hidden = pagesBox.hidden = actions.hidden = false;
      status.set(tPlural(ctx, "p2i.ready", pages, { pages }));
      convertBtn.focus();
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, file.name));
      status.set("");
    }
  }

  function release() {
    task?.cancel();
    task = null;
    if (source) void source.doc.loadingTask.destroy();
    source = null;
  }

  function reset() {
    generation++;
    release();
    fileInfo.textContent = "";
    settings.hidden = pagesBox.hidden = actions.hidden = true;
    rangesInput.value = "";
    rAll.input.checked = true;
    rangesBox.hidden = true;
    setBusy(false);
    errors.clear();
    status.set("");
    clearOutputs();
  }

  function stop() {
    generation++;
    task?.cancel();
    task = null;
  }

  function clearOutputs() {
    outputs = [];
    resultActions.replaceChildren();
    resultActions.hidden = true;
    cappedNote.textContent = "";
    cappedNote.hidden = true;
  }

  function setBusy(busy: boolean) {
    convertBtn.disabled = resetBtn.disabled = busy;
    for (const c of [format.s, dpi.s, rAll.input, rSome.input, rangesInput]) c.disabled = busy;
    stopBtn.hidden = !busy;
    progress.hidden = !busy;
  }

  function planError(plan: Extract<PagePlan, { ok: false }>): string {
    const e = plan.error;
    switch (e.code) {
      case "empty":
        return t("p2i.error.empty");
      case "syntax":
        return t("p2i.error.syntax", { part: e.part });
      case "outOfRange":
        return tPlural(ctx, "p2i.error.outOfRange", e.pages, { part: e.part, pages: e.pages });
      case "reversed":
        return t("p2i.error.reversed", { part: e.part });
    }
  }

  async function convert() {
    if (!source || convertBtn.disabled) return;
    const { file, doc } = source;
    const pageCount = doc.numPages;
    clearOutputs();
    errors.clear();
    const plan = planPages(rSome.input.checked ? { kind: "ranges", input: rangesInput.value } : { kind: "all" }, pageCount);
    if (!plan.ok) {
      errors.show(planError(plan));
      rangesInput.focus();
      return;
    }
    const gen = ++generation;
    const fmt = format.s.value as ImageFormat;
    const dpiValue = Number(dpi.s.value);
    const base = baseName(file.name);
    const made: { name: string; blob: Blob }[] = [];
    const capped: number[] = [];
    setBusy(true);
    progress.max = plan.pages.length;
    progress.value = 0;
    stopBtn.focus();
    try {
      for (const [i, n] of plan.pages.entries()) {
        if (gen !== generation) throw new Cancelled();
        status.set(t("p2i.working", { current: i + 1, total: plan.pages.length }));
        const { blob, wasCapped } = await renderPage(doc, n, dpiValue, fmt, gen);
        if (wasCapped) capped.push(n);
        made.push({ name: t("p2i.outputName", { name: base, page: padPage(n, pageCount), ext: fmt }), blob });
        progress.value = i + 1;
      }
      outputs = made;
      setBusy(false);
      showOutputs(base, fmt, capped);
    } catch (err) {
      if (gen !== generation && source?.doc !== doc) return; // a new file or Start over took over
      setBusy(false);
      if (err instanceof Cancelled || gen !== generation) {
        status.set(t("p2i.stopped"));
        convertBtn.focus();
        return;
      }
      errors.show(errorMessage(err, ctx, file.name));
      status.set("");
    }
  }

  async function renderPage(
    doc: PDFDocumentProxy,
    n: number,
    dpiValue: number,
    fmt: ImageFormat,
    gen: number,
  ): Promise<{ blob: Blob; wasCapped: boolean }> {
    const page = await doc.getPage(n);
    const canvas = document.createElement("canvas");
    try {
      const base = page.getViewport({ scale: 1 });
      const size = pageSize(base.width, base.height, dpiValue);
      const viewport = page.getViewport({ scale: size.scale });
      canvas.width = size.width;
      canvas.height = size.height;
      if (gen !== generation) throw new Cancelled();
      task = page.render({ canvas, viewport });
      try {
        await task.promise;
      } catch (err) {
        if (gen !== generation) throw new Cancelled();
        throw err;
      } finally {
        task = null;
      }
      if (gen !== generation) throw new Cancelled();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, MIME[fmt], fmt === "jpg" ? JPEG_QUALITY : undefined),
      );
      if (!blob) throw new Error(`canvas.toBlob failed for page ${n}`);
      return { blob, wasCapped: size.capped };
    } finally {
      page.cleanup();
      // Free the bitmap now rather than whenever the canvas is collected (matters for big pages).
      canvas.width = canvas.height = 0;
    }
  }

  function showOutputs(base: string, fmt: ImageFormat, capped: number[]) {
    let main: HTMLButtonElement;
    if (outputs.length === 1) {
      const only = outputs[0]!;
      main = button(t("p2i.downloadOne", { name: only.name }), {
        variant: "primary",
        onClick: () => downloadBlob(only.blob, only.name),
      });
    } else {
      main = button(t("tool.downloadAll"), {
        variant: "primary",
        onClick: () => void downloadZip(outputs, t("p2i.zipName", { name: base, ext: fmt })),
      });
    }
    const total = outputs.reduce((sum, o) => sum + o.blob.size, 0);
    resultActions.replaceChildren(main);
    resultActions.hidden = false;
    markEnter(main);
    if (capped.length) {
      cappedNote.textContent = tPlural(ctx, "p2i.capped", capped.length, { pages: capped.join(", ") });
      cappedNote.hidden = false;
    }
    status.set(tPlural(ctx, "p2i.done", outputs.length, { size: formatBytes(total) }));
    main.focus();
  }

  return () => {
    generation++;
    release();
  };
}
