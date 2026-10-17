/**
 * Split PDF: one PDF -> page ranges ("1-3, 5, 8-"), every page, or every N pages.
 * Output: one PDF (single part or "combine" ranges) or several PDFs (individually or as a .zip).
 */
import type { PDFDocument } from "pdf-lib";
import { createDropzone, downloadBlob, downloadZip, formatBytes } from "../../lib/tool-ui";
import type { ToolCtx } from "../types";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import { planSplit, type SplitMode, type SplitPlan } from "./plan";

const ACCEPT = "application/pdf,.pdf";
let uid = 0;

export function mount(el: HTMLElement, ctx: ToolCtx): void {
  const { t } = ctx;
  const id = `pdf-split-${++uid}`;
  let source: { file: File; doc: PDFDocument } | null = null;
  let outputs: { name: string; blob: Blob; pages: number }[] = [];
  const ops = () => import("../pdf-shared/pdf-ops");

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

  // Mode radios.
  const radio = (value: string, label: string, checked = false) => {
    const input = h("input", { type: "radio", name: `${id}-mode`, value, id: `${id}-mode-${value}`, checked });
    input.addEventListener("change", syncMode);
    return { input, row: h("div", {}, input, " ", h("label", { for: `${id}-mode-${value}`, text: label })) };
  };
  const rRanges = radio("ranges", t("split.mode.ranges"), true);
  const rEach = radio("each", t("split.mode.each"));
  const rEvery = radio("every", t("split.mode.every"));

  const rangesInput = h("input", {
    type: "text",
    id: `${id}-ranges`,
    inputmode: "text",
    autocomplete: "off",
    spellcheck: "false",
    placeholder: t("split.ranges.placeholder"),
    "aria-describedby": `${id}-ranges-hint`,
  });
  const combine = h("input", { type: "checkbox", id: `${id}-combine` });
  const rangesBox = h(
    "div",
    {},
    h("label", { for: `${id}-ranges`, text: t("split.ranges.label") }),
    " ",
    rangesInput,
    h("p", { className: "tool-note", id: `${id}-ranges-hint`, text: t("split.ranges.hint") }),
    h("div", {}, combine, " ", h("label", { for: `${id}-combine`, text: t("split.combine") })),
  );

  const everyInput = h("input", { type: "number", id: `${id}-n`, min: 1, step: 1, value: 2, inputmode: "numeric" });
  const everyBox = h("div", { hidden: true }, h("label", { for: `${id}-n`, text: t("split.every.label") }), " ", everyInput);

  const options = h(
    "fieldset",
    { className: "tool-options", hidden: true },
    h("legend", { text: t("split.mode.legend") }),
    rRanges.row,
    rangesBox,
    rEach.row,
    rEvery.row,
    everyBox,
  );

  const splitBtn = button(t("split.action"), { variant: "primary", onClick: () => void split() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, splitBtn, resetBtn);
  const resultList = h("ul", { className: "tool-list", "aria-label": t("split.resultsLabel"), hidden: true });
  const resultActions = h("div", { className: "tool-actions", hidden: true });

  for (const input of [rangesInput, everyInput, combine]) input.addEventListener("input", clearOutputs);
  rangesInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void split();
  });

  el.append(
    h(
      "div",
      { className: "tool tool--pdf-split" },
      drop,
      errors.el,
      fileInfo,
      options,
      actions,
      status.el,
      resultActions,
      resultList,
    ),
  );

  function syncMode() {
    rangesBox.hidden = !rRanges.input.checked;
    everyBox.hidden = !rEvery.input.checked;
    clearOutputs();
  }

  async function open(file: File) {
    reset();
    status.set(t("split.reading", { name: file.name }));
    try {
      const { loadPdf } = await ops();
      const doc = await loadPdf(await readFile(file));
      source = { file, doc };
      const pages = doc.getPageCount();
      fileInfo.textContent = t("split.fileInfo", { name: file.name, pages, size: formatBytes(file.size) });
      everyInput.max = String(pages);
      options.hidden = false;
      actions.hidden = false;
      status.set(t("split.ready", { pages }));
      rangesInput.focus();
    } catch (err) {
      errors.show(errorMessage(err, ctx, file.name));
      status.set("");
    }
  }

  function reset() {
    source = null;
    fileInfo.textContent = "";
    options.hidden = true;
    actions.hidden = true;
    rangesInput.value = "";
    errors.clear();
    status.set("");
    clearOutputs();
  }

  function clearOutputs() {
    outputs = [];
    resultList.replaceChildren();
    resultList.hidden = true;
    resultActions.replaceChildren();
    resultActions.hidden = true;
  }

  function currentMode(): SplitMode {
    if (rEach.input.checked) return { kind: "every", size: 1 };
    if (rEvery.input.checked) return { kind: "every", size: Number(everyInput.value) };
    return { kind: "ranges", input: rangesInput.value, combine: combine.checked };
  }

  function planError(plan: Extract<SplitPlan, { ok: false }>, pages: number): string {
    const e = plan.error;
    switch (e.code) {
      case "empty":
        return t("split.error.empty");
      case "syntax":
        return t("split.error.syntax", { part: e.part });
      case "outOfRange":
        return t("split.error.outOfRange", { part: e.part, pages: e.pages });
      case "reversed":
        return t("split.error.reversed", { part: e.part });
      case "size":
        return t("split.error.size", { pages });
    }
  }

  async function split() {
    if (!source) return;
    const { file, doc } = source;
    const pages = doc.getPageCount();
    clearOutputs();
    errors.clear();
    const plan = planSplit(currentMode(), pages);
    if (!plan.ok) {
      errors.show(planError(plan, pages));
      (rEvery.input.checked ? everyInput : rangesInput).focus();
      return;
    }
    splitBtn.disabled = resetBtn.disabled = true;
    const progress = h("progress", { className: "tool-progress", max: plan.parts.length, value: 0 });
    resultActions.replaceChildren(progress);
    resultActions.hidden = false;
    try {
      const { extractPages } = await ops();
      const base = baseName(file.name);
      for (const [i, part] of plan.parts.entries()) {
        status.set(t("split.working", { current: i + 1, total: plan.parts.length }));
        const bytes = await extractPages(doc, part.indices);
        outputs.push({
          name: t("split.outputName", { name: base, pages: part.label }),
          blob: pdfBlob(bytes),
          pages: part.indices.length,
        });
        progress.value = i + 1;
      }
      showOutputs(base);
    } catch (err) {
      errors.show(errorMessage(err, ctx, file.name));
      status.set("");
      resultActions.hidden = true;
    } finally {
      splitBtn.disabled = resetBtn.disabled = false;
    }
  }

  function showOutputs(base: string) {
    const items = outputs.map((o) =>
      h(
        "li",
        { className: "tool-item", "data-state": "done" },
        h("span", { className: "tool-item__name", text: o.name }),
        h("span", {
          className: "tool-item__meta",
          text: `${t("split.pages", { count: o.pages })} · ${formatBytes(o.blob.size)}`,
        }),
        button(t("tool.download"), {
          ariaLabel: t("split.downloadLabel", { name: o.name }),
          onClick: () => downloadBlob(o.blob, o.name),
        }),
      ),
    );
    resultList.replaceChildren(...items);
    resultList.hidden = false;
    let main: HTMLButtonElement;
    if (outputs.length === 1) {
      const only = outputs[0]!;
      main = button(t("split.downloadOne", { name: only.name }), {
        variant: "primary",
        onClick: () => downloadBlob(only.blob, only.name),
      });
    } else {
      main = button(t("tool.downloadAll"), {
        variant: "primary",
        onClick: () => void downloadZip(outputs, t("split.zipName", { name: base })),
      });
    }
    resultActions.replaceChildren(main);
    status.set(t("split.done", { count: outputs.length }));
    main.focus();
  }
}
