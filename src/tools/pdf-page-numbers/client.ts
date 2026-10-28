/**
 * Add page numbers to a PDF: choose where the numbers go and how they read, see them on the first
 * numbered page, and save a copy with the numbers drawn in Helvetica (pdf-lib, ./writer.ts). The preview
 * is that page drawn by PDF.js with the label laid over it in SVG, using the same layout as the writer
 * (./layout.ts), so changing a setting never re-renders the page. Nothing leaves the device.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import {
  DEFAULT_FORMAT,
  DEFAULT_MARGIN_MM,
  DEFAULT_POSITION,
  DEFAULT_SIZE,
  FORMATS,
  formatLabel,
  isFormat,
  labelOrigin,
  MAX_MARGIN_MM,
  MAX_SIZE,
  MAX_START,
  MIN_SIZE,
  mmToPt,
  numbering,
  parseDecimal,
  parseWhole,
  POSITIONS,
  SIZES,
  type LabelFormat,
  type Position,
  type Size,
  type SizeName,
} from "./layout";
import type { NumberSettings } from "./writer";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./page-numbers.css?url";

const ACCEPT = "application/pdf,.pdf";
const SVG = "http://www.w3.org/2000/svg";
/** Longest side of the preview page, in CSS px (renderThumbnail doubles it on sharp screens). */
const PREVIEW_PX = 360;
const RENDER_DELAY = 150;

type Field = "start" | "first" | "size" | "margin";
type Read = { ok: true; settings: NumberSettings } | { ok: false; field: Field; message: string };

let uid = 0;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const id = `pdf-page-numbers-${++uid}`;
  const writer = () => import("./writer");
  const words = t("numbers.words");

  let file: File | null = null;
  let bytes: Uint8Array | null = null;
  /** The pdf-lib document parsed when the file was opened, used by the first save. */
  let pristine: PDFDocument | null = null;
  let viewer: PDFDocumentProxy | null = null;
  let views: Size[] = [];
  let measure: ((text: string, size: number) => number) | null = null;
  let busy = false;
  let generation = 0;
  let result: { blob: Blob; name: string } | null = null;

  // ---------- shell ----------
  const errors = errorRegion();
  const status = statusRegion();
  const live = h("p", { className: "visually-hidden", "aria-live": "polite" });
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
  const dropLabel = drop.querySelector<HTMLElement>(".tool-drop__label");
  const dropText = dropLabel?.textContent ?? "";
  const fileInfo = h("p", { className: "tool-item__meta" });

  // ---------- position: six spots on a small page ----------
  const positionName = h("p", { className: "pn-position__name", "aria-hidden": "true" });
  const spots = new Map<Position, HTMLInputElement>();
  const page = h("div", { className: "pn-page" });
  for (const p of POSITIONS) {
    const input = h("input", { type: "radio", name: `${id}-position`, value: p, className: "visually-hidden", checked: p === DEFAULT_POSITION });
    input.addEventListener("change", () => input.checked && changed());
    spots.set(p, input);
    page.append(
      h("label", { className: "pn-spot", "data-spot": p }, input, h("span", { className: "visually-hidden", text: t(`numbers.position.${p}`) })),
    );
  }
  const positionBox = h("fieldset", { className: "pn-position" }, h("legend", { text: t("numbers.position.legend") }), page, positionName);

  // ---------- the other settings ----------
  const field = (key: string, control: HTMLElement, attrs: Record<string, string | boolean> = {}) =>
    h("div", attrs, h("label", { for: control.id, text: t(key) }), control);
  const numberInput = (name: string, value: number, min: number, max: number, step: string, describedBy?: string) =>
    h("input", {
      type: "number",
      id: `${id}-${name}`,
      value,
      min,
      max,
      step,
      inputmode: step === "1" ? "numeric" : "decimal",
      "aria-describedby": describedBy,
    });

  const formatSelect = h("select", { id: `${id}-format` }, ...FORMATS.map((f) => h("option", { value: f, selected: f === DEFAULT_FORMAT })));
  const sizeSelect = h(
    "select",
    { id: `${id}-size` },
    ...(Object.keys(SIZES) as SizeName[]).map((s) =>
      h("option", { value: s, selected: s === DEFAULT_SIZE, text: t("numbers.size.preset", { name: t(`numbers.size.${s}`), pt: SIZES[s] }) }),
    ),
    h("option", { value: "custom", text: t("numbers.size.custom") }),
  );
  const customSize = numberInput("points", SIZES[DEFAULT_SIZE], MIN_SIZE, MAX_SIZE, "any");
  const customField = field("numbers.size.points", customSize, { hidden: true });
  const startInput = numberInput("start", 1, 0, MAX_START, "1");
  const firstHintId = `${id}-first-hint`;
  const firstInput = numberInput("first", 1, 1, 1, "1", firstHintId);
  const marginInput = numberInput("margin", DEFAULT_MARGIN_MM, 0, MAX_MARGIN_MM, "any");
  const inputs: Record<Field, HTMLInputElement> = { start: startInput, first: firstInput, size: customSize, margin: marginInput };

  // How the numbers look, then how they count (the hint belongs to the second group).
  const looks = h(
    "div",
    { className: "tool-options" },
    field("numbers.format.label", formatSelect),
    field("numbers.size.label", sizeSelect),
    customField,
    field("numbers.margin.label", marginInput),
  );
  const counting = h(
    "div",
    { className: "tool-options" },
    field("numbers.start.label", startInput),
    field("numbers.first.label", firstInput),
    h("p", { className: "tool-note", id: firstHintId, text: t("numbers.first.hint") }),
  );
  const settingsError = errorRegion();

  // ---------- preview ----------
  const sheet = h("div", { className: "pn-sheet" });
  const overlay = document.createElementNS(SVG, "svg");
  overlay.setAttribute("class", "pn-overlay");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("preserveAspectRatio", "none");
  const label = document.createElementNS(SVG, "text");
  label.setAttribute("class", "pn-label");
  label.setAttribute("lengthAdjust", "spacingAndGlyphs");
  overlay.append(label);
  const frame = h("div", { className: "pn-frame" }, sheet);
  frame.append(overlay);
  const caption = h("figcaption", { className: "tool-note" });
  const previewError = errorRegion();
  const preview = h("figure", { className: "pn-preview" }, frame, caption, previewError.el);

  const editor = h(
    "div",
    { className: "pn-editor", hidden: true },
    h("div", { className: "pn-settings" }, positionBox, looks, counting, settingsError.el),
    preview,
  );

  const runBtn = button(t("numbers.action"), { variant: "primary", onClick: () => void run() });
  const downloadBtn = button(t("tool.download"), {
    variant: "primary",
    onClick: () => result && downloadBlob(result.blob, result.name),
  });
  downloadBtn.hidden = true;
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions", hidden: true }, runBtn, downloadBtn, resetBtn);
  const progress = h("progress", { className: "tool-progress", hidden: true, "aria-label": t("numbers.working") });

  const tool = h(
    "div",
    { className: "tool tool--pdf-page-numbers" },
    drop,
    errors.el,
    fileInfo,
    editor,
    progress,
    status.el,
    actions,
    live,
  );
  el.append(tool);

  // ---------- settings ----------
  function position(): Position {
    for (const [p, input] of spots) if (input.checked) return p;
    return DEFAULT_POSITION;
  }

  function read(): Read {
    const pages = views.length;
    const startAt = parseWhole(startInput.value, 0, MAX_START);
    if (startAt === null) return { ok: false, field: "start", message: t("numbers.error.start", { max: MAX_START }) };
    const firstPage = parseWhole(firstInput.value, 1, Math.max(1, pages));
    if (firstPage === null) return { ok: false, field: "first", message: t("numbers.error.first", { pages }) };
    let size: number | null = SIZES[sizeSelect.value as SizeName] ?? null;
    if (sizeSelect.value === "custom") size = parseDecimal(customSize.value, MIN_SIZE, MAX_SIZE);
    if (size === null) return { ok: false, field: "size", message: t("numbers.error.size", { min: MIN_SIZE, max: MAX_SIZE }) };
    const marginMm = parseDecimal(marginInput.value, 0, MAX_MARGIN_MM);
    if (marginMm === null) return { ok: false, field: "margin", message: t("numbers.error.margin", { max: MAX_MARGIN_MM }) };
    const format: LabelFormat = isFormat(formatSelect.value) ? formatSelect.value : DEFAULT_FORMAT;
    return { ok: true, settings: { position: position(), format, startAt, firstPage, size, margin: mmToPt(marginMm), words } };
  }

  /** Mark the field a reading failed on (or none). */
  function markInvalid(bad: Field | null) {
    for (const [name, input] of Object.entries(inputs)) {
      if (name === bad) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  /** Example labels in the Format list follow the current start and first page ("1 / 12"). */
  function syncFormatNames(s: NumberSettings | null) {
    const plan = s ? numbering(views.length, s.firstPage, s.startAt) : { total: Math.max(1, views.length) };
    const n = s ? s.startAt : 1;
    for (const opt of formatSelect.options) {
      if (isFormat(opt.value)) opt.textContent = formatLabel(opt.value, n, plan.total, words);
    }
  }

  function changed() {
    customField.hidden = sizeSelect.value !== "custom";
    positionName.textContent = t(`numbers.position.${position()}`);
    invalidate();
    if (!views.length) return;
    const r = read();
    markInvalid(r.ok ? null : r.field);
    if (r.ok) {
      settingsError.clear();
      syncFormatNames(r.settings);
      drawLabel(r.settings);
      schedulePage(r.settings.firstPage - 1);
    }
  }

  formatSelect.addEventListener("change", changed);
  sizeSelect.addEventListener("change", () => {
    // Custom starts from the size that was chosen, so the preview does not jump.
    const preset = SIZES[sizeSelect.value as SizeName];
    if (preset) customSize.value = String(preset);
    changed();
  });
  for (const input of Object.values(inputs)) {
    input.addEventListener("input", changed);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void run();
    });
  }

  function invalidate() {
    if (!result) return;
    result = null;
    downloadBtn.hidden = true;
    runBtn.hidden = false;
    if (!busy) status.set("");
  }

  // ---------- preview ----------
  let shownPage = -1;
  let wantedPage = -1;
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  let renderSeq = 0;

  /** Lay the label over the preview page exactly as the writer will draw it. */
  function drawLabel(s: NumberSettings) {
    const index = s.firstPage - 1;
    const v = views[index];
    if (!v || !measure) return;
    const plan = numbering(views.length, s.firstPage, s.startAt);
    const text = formatLabel(s.format, plan.numbers[index] ?? s.startAt, plan.total, s.words);
    const width = measure(text, s.size);
    const o = labelOrigin(v, s.position, s.margin, width, s.size);
    overlay.setAttribute("viewBox", `0 0 ${v.width} ${v.height}`);
    label.textContent = text;
    label.setAttribute("x", String(o.x));
    label.setAttribute("y", String(o.y));
    label.setAttribute("font-size", String(s.size));
    // The browser's Helvetica (or Arial) is stretched to pdf-lib's width, so the preview matches to the point.
    label.setAttribute("textLength", String(width));
    frame.style.setProperty("--pn-ratio", `${v.width} / ${v.height}`);
    frame.style.setProperty("--pn-r", String(v.width / v.height));
    caption.textContent = t("numbers.preview.caption", { page: index + 1, label: text });
  }

  function schedulePage(index: number) {
    if (index === wantedPage) return;
    wantedPage = index;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => void renderPage(index), shownPage < 0 ? 0 : RENDER_DELAY);
  }

  async function renderPage(index: number) {
    if (!viewer) return;
    const seq = ++renderSeq;
    const gen = generation;
    previewError.clear();
    frame.setAttribute("aria-busy", "true");
    try {
      const { renderThumbnail } = await import("../pdf-shared/pdfjs");
      const pg = await viewer.getPage(index + 1);
      const canvas = await renderThumbnail(pg, PREVIEW_PX);
      pg.cleanup();
      if (seq !== renderSeq || gen !== generation) {
        canvas.width = canvas.height = 0;
        return;
      }
      canvas.className = "pn-sheet__page";
      for (const old of sheet.querySelectorAll("canvas")) old.width = old.height = 0;
      sheet.replaceChildren(canvas);
      shownPage = index;
    } catch (err) {
      console.warn(err);
      if (seq === renderSeq && gen === generation) {
        sheet.replaceChildren();
        previewError.show(t("numbers.preview.error", { page: index + 1 }));
      }
    } finally {
      if (seq === renderSeq) frame.removeAttribute("aria-busy");
    }
  }

  // ---------- open, run, reset ----------
  async function open(f: File) {
    clearDocument();
    const gen = generation;
    status.set(t("numbers.reading", { name: f.name }));
    try {
      const data = await readFile(f);
      const [w, { openForRender }] = await Promise.all([writer(), import("../pdf-shared/pdfjs")]);
      const doc = await w.loadPdf(data);
      // PDF.js transfers the buffer it gets to its worker: give it a copy.
      const proxy = await openForRender(data.slice());
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      if (proxy.numPages !== doc.getPageCount()) {
        void proxy.loadingTask.destroy();
        throw new PdfToolError("invalid");
      }
      file = f;
      bytes = data;
      pristine = doc;
      viewer = proxy;
      views = w.pageViews(doc);
      measure = w.textWidth;
      const pages = views.length;
      firstInput.max = String(pages);
      fileInfo.textContent = tPlural(ctx, "numbers.fileInfo", pages, { name: f.name, pages, size: formatBytes(f.size) });
      status.set("");
      tool.dataset.loaded = "";
      if (dropLabel) dropLabel.textContent = t("numbers.drop.replace");
      editor.hidden = false;
      actions.hidden = false;
      runBtn.hidden = false;
      changed();
      live.textContent = tPlural(ctx, "numbers.opened", pages, { name: f.name, pages });
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, f.name));
      status.set("");
    }
  }

  function setBusy(on: boolean) {
    busy = on;
    progress.hidden = !on;
    if (on) progress.removeAttribute("value");
    runBtn.disabled = resetBtn.disabled = on;
    editor.toggleAttribute("inert", on);
  }

  async function run() {
    if (!bytes || !file || busy) return;
    errors.clear();
    const r = read();
    markInvalid(r.ok ? null : r.field);
    if (!r.ok) {
      settingsError.show(r.message);
      inputs[r.field].focus();
      return;
    }
    settingsError.clear();
    const f = file;
    const gen = generation;
    setBusy(true);
    status.set(t("numbers.working"));
    try {
      const w = await writer();
      const doc = pristine ?? (await w.loadPdf(bytes));
      pristine = null;
      const out = await w.addPageNumbers(doc, r.settings);
      if (gen !== generation) return;
      result = { blob: pdfBlob(out), name: t("numbers.outputName", { name: baseName(f.name) }) };
      const count = views.length - r.settings.firstPage + 1;
      status.set(tPlural(ctx, "numbers.done", count, { size: formatBytes(result.blob.size) }));
      downloadBtn.textContent = t("numbers.download", { name: result.name });
      runBtn.hidden = true;
      downloadBtn.hidden = false;
      markEnter(downloadBtn);
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, f.name));
      status.set("");
    } finally {
      if (gen === generation) {
        setBusy(false);
        if (!downloadBtn.hidden) downloadBtn.focus();
      }
    }
  }

  /** Forget the PDF; the settings stay for the next file (the first page goes back to 1). */
  function clearDocument() {
    generation++;
    renderSeq++;
    clearTimeout(renderTimer);
    if (viewer) void viewer.loadingTask.destroy();
    viewer = null;
    file = null;
    bytes = null;
    pristine = null;
    views = [];
    shownPage = wantedPage = -1;
    for (const c of sheet.querySelectorAll("canvas")) c.width = c.height = 0;
    sheet.replaceChildren();
    label.textContent = "";
    caption.textContent = "";
    firstInput.value = "1";
    result = null;
    downloadBtn.hidden = true;
    editor.hidden = true;
    actions.hidden = true;
    fileInfo.textContent = "";
    delete tool.dataset.loaded;
    if (dropLabel) dropLabel.textContent = dropText;
    setBusy(false);
    markInvalid(null);
    errors.clear();
    settingsError.clear();
    previewError.clear();
    status.set("");
  }

  function startOver() {
    clearDocument();
    live.textContent = "";
    drop.querySelector("input")?.focus();
  }

  positionName.textContent = t(`numbers.position.${DEFAULT_POSITION}`);
  syncFormatNames(null);

  return () => {
    clearDocument();
    tool.remove();
  };
}

