/**
 * Add a watermark to a PDF: a line of text (one centred, or tiled across the page) or a logo, drawn
 * over the content of all pages or a range of them, with pdf-lib (./writer.ts). The preview is the
 * first affected page drawn by PDF.js once, with the watermark painted over it on a second canvas from
 * the same plan the writer uses (./geometry.ts). Nothing leaves the browser.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { parsePageRanges, rangeIndices, type PageRangeError } from "../pdf-shared/ranges";
import { hexToRgb, imageRect, planText, POSITIONS, textOrigin, type AngleChoice, type Layout, type Position, type Size } from "./geometry";
import { jpegOrientation, sniffImage, type ImageFormat } from "./image";
import { cleanText, showChar, unencodable } from "./winansi";
import type { Watermark } from "./writer";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./watermark.css?url";

const ACCEPT = "application/pdf,.pdf";
const IMAGE_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";
const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const COLORS = { grey: "#7a7a7a", red: "#c8102e", blue: "#1f4e9c", black: "#000000" } as const;
type ColorName = keyof typeof COLORS;
/** Longest side of the preview page, in CSS px. */
const PREVIEW_CSS = 520;
/** The fonts the PDF uses are Helvetica; Arial and Liberation Sans have the same widths. */
const PREVIEW_FONT = 'Helvetica, Arial, "Liberation Sans", sans-serif';
const DEFAULT_SIZE = 36;
const DEFAULT_ANGLE = 45;

type Kind = "text" | "image";
type AngleMode = "diagonal" | "horizontal" | "custom";

interface Logo {
  bytes: Uint8Array;
  format: ImageFormat;
  bitmap: ImageBitmap;
  name: string;
}

let uid = 0;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const id = `pdf-watermark-${++uid}`;
  const writer = () => import("./writer");

  let file: File | null = null;
  let bytes: Uint8Array | null = null;
  /** The pdf-lib document parsed when the file was opened, used by the first save (saving changes it). */
  let pristine: PDFDocument | null = null;
  let viewer: PDFDocumentProxy | null = null;
  let views: Size[] = [];
  let measure: ((text: string, bold: boolean) => number) | null = null;
  let logo: Logo | null = null;
  let kind: Kind = "text";
  let angleMode: AngleMode = "diagonal";
  let layout: Layout = "single";
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

  /** A row of radios drawn as a segmented control. */
  function segmented<V extends string>(name: string, legend: string, choices: [V, string][], value: V, onChange: (v: V) => void) {
    const inputs = new Map<V, HTMLInputElement>();
    const row = h("div", { className: "wm-seg__options" });
    for (const [v, label] of choices) {
      const input = h("input", { type: "radio", name: `${id}-${name}`, value: v, className: "visually-hidden", checked: v === value });
      input.addEventListener("change", () => input.checked && onChange(v));
      inputs.set(v, input);
      row.append(h("label", { className: "wm-seg__option" }, input, h("span", { text: label })));
    }
    const box = h("fieldset", { className: "wm-seg" }, h("legend", { text: legend }), row);
    return { box, inputs };
  }

  // ---------- what kind of watermark ----------
  const kindSeg = segmented<Kind>(
    "kind",
    t("watermark.kind.legend"),
    [
      ["text", t("watermark.kind.text")],
      ["image", t("watermark.kind.image")],
    ],
    kind,
    (k) => setKind(k),
  );

  // ---------- text ----------
  const textInput = h("input", {
    type: "text",
    id: `${id}-text`,
    value: t("watermark.text.default"),
    maxlength: 200,
    autocomplete: "off",
    spellcheck: "false",
    "aria-describedby": `${id}-text-note`,
  });
  const textNote = h("p", { className: "tool-note", id: `${id}-text-note`, text: t("watermark.text.note") });
  const textError = errorRegion();
  const textField = h(
    "div",
    { className: "wm-field" },
    h("label", { for: textInput.id, text: t("watermark.text.label") }),
    textInput,
    textError.el,
    textNote,
  );

  const sizeInput = h("input", { type: "number", id: `${id}-size`, min: 4, max: 400, step: 1, value: DEFAULT_SIZE, inputmode: "numeric" });
  const fitInput = h("input", { type: "checkbox", id: `${id}-fit`, checked: true });
  const boldInput = h("input", { type: "checkbox", id: `${id}-bold`, checked: true });
  const fitRow = h("div", {}, fitInput, h("label", { for: fitInput.id, text: t("watermark.size.fit") }));
  const textOptions = h(
    "div",
    { className: "tool-options" },
    h("div", {}, h("label", { for: sizeInput.id, text: t("watermark.size.label") }), sizeInput),
    fitRow,
    h("div", {}, boldInput, h("label", { for: boldInput.id, text: t("watermark.bold") })),
  );

  // Colour: a few presets, or any colour from the picker. The picker always holds the current colour.
  const colorInput = h("input", { type: "color", id: `${id}-color`, value: COLORS.grey, className: "wm-colors__picker" });
  const swatches = new Map<ColorName, HTMLInputElement>();
  const swatchRow = h("div", { className: "wm-colors__options" });
  for (const name of Object.keys(COLORS) as ColorName[]) {
    const input = h("input", { type: "radio", name: `${id}-color`, value: name, className: "visually-hidden", checked: name === "grey" });
    input.addEventListener("change", () => {
      if (!input.checked) return;
      colorInput.value = COLORS[name];
      changed();
    });
    swatches.set(name, input);
    const dot = h("span", { className: "wm-colors__dot", "aria-hidden": "true" });
    dot.style.setProperty("--wm-dot", COLORS[name]);
    swatchRow.append(h("label", { className: "wm-colors__option" }, input, dot, h("span", { text: t(`watermark.color.${name}`) })));
  }
  colorInput.addEventListener("input", () => {
    for (const [name, input] of swatches) input.checked = COLORS[name] === colorInput.value.toLowerCase();
    changed();
  });
  const colorBox = h(
    "fieldset",
    { className: "wm-colors" },
    h("legend", { text: t("watermark.color.legend") }),
    swatchRow,
    h("label", { className: "wm-colors__custom", for: colorInput.id }, colorInput, h("span", { text: t("watermark.color.custom") })),
  );

  const angleSeg = segmented<AngleMode>(
    "angle",
    t("watermark.angle.legend"),
    [
      ["diagonal", t("watermark.angle.diagonal")],
      ["horizontal", t("watermark.angle.horizontal")],
      ["custom", t("watermark.angle.custom")],
    ],
    angleMode,
    (m) => {
      angleMode = m;
      angleField.hidden = m !== "custom";
      changed();
    },
  );
  const angleInput = h("input", { type: "number", id: `${id}-angle`, min: -180, max: 180, step: 1, value: DEFAULT_ANGLE, inputmode: "numeric" });
  const angleField = h(
    "div",
    { className: "wm-inline", hidden: true },
    h("label", { for: angleInput.id, text: t("watermark.angle.degrees") }),
    angleInput,
  );
  const angleRow = h("div", { className: "wm-row" }, angleSeg.box, angleField);

  const layoutSeg = segmented<Layout>(
    "layout",
    t("watermark.layout.legend"),
    [
      ["single", t("watermark.layout.single")],
      ["tile", t("watermark.layout.tile")],
    ],
    layout,
    (l) => {
      layout = l;
      syncSize();
      changed();
    },
  );

  const textPanel = h("div", { className: "wm-panel" }, textField, textOptions, colorBox, angleRow, layoutSeg.box);

  // ---------- image ----------
  const logoInput = h("input", { type: "file", accept: IMAGE_ACCEPT, className: "visually-hidden", id: `${id}-logo` });
  const logoPick = h("label", { className: "btn wm-pick", for: logoInput.id }, h("span", { text: t("watermark.image.choose") }));
  const logoName = h("p", { className: "tool-item__meta wm-logo-name", hidden: true });
  const logoNote = h("p", { className: "tool-note", text: t("watermark.image.note") });
  const logoError = errorRegion();
  const scaleInput = h("input", { type: "range", id: `${id}-scale`, min: 5, max: 100, step: 1, value: 40 });
  const scaleOut = h("output", { for: scaleInput.id, text: "40%" });
  const positionSelect = h(
    "select",
    { id: `${id}-position` },
    ...POSITIONS.map((p) => h("option", { value: p, text: t(`watermark.position.${p}`) })),
  );
  const imagePanel = h(
    "div",
    { className: "wm-panel", hidden: true },
    h("div", { className: "tool-actions" }, logoInput, logoPick),
    logoName,
    logoError.el,
    logoNote,
    h(
      "div",
      { className: "tool-options" },
      h("div", {}, h("label", { for: scaleInput.id, text: t("watermark.image.scale") }), scaleInput, scaleOut),
      h("div", {}, h("label", { for: positionSelect.id, text: t("watermark.position.label") }), positionSelect),
    ),
  );

  // ---------- shared: opacity and pages ----------
  const opacityInput = h("input", { type: "range", id: `${id}-opacity`, min: 5, max: 100, step: 1, value: 30 });
  const opacityOut = h("output", { for: opacityInput.id, text: "30%" });
  const opacityBox = h(
    "div",
    { className: "tool-options" },
    h("div", {}, h("label", { for: opacityInput.id, text: t("watermark.opacity") }), opacityInput, opacityOut),
  );

  const allRadio = h("input", { type: "radio", name: `${id}-pages`, value: "all", id: `${id}-pages-all`, checked: true });
  const someRadio = h("input", { type: "radio", name: `${id}-pages`, value: "some", id: `${id}-pages-some` });
  const rangeInput = h("input", {
    type: "text",
    id: `${id}-range`,
    autocomplete: "off",
    spellcheck: "false",
    placeholder: t("watermark.pages.placeholder"),
    "aria-describedby": `${id}-range-hint`,
  });
  const rangeError = errorRegion();
  const rangeBox = h(
    "div",
    { hidden: true },
    h("label", { for: rangeInput.id, text: t("watermark.pages.label") }),
    rangeInput,
  );
  const rangeHint = h("p", { className: "tool-note", id: `${id}-range-hint`, hidden: true, text: t("watermark.pages.hint") });
  const pagesBox = h(
    "fieldset",
    { className: "tool-options wm-pages" },
    h("legend", { text: t("watermark.pages.legend") }),
    h("div", {}, allRadio, h("label", { for: allRadio.id, text: t("watermark.pages.all") })),
    h("div", {}, someRadio, h("label", { for: someRadio.id, text: t("watermark.pages.some") })),
    rangeBox,
    rangeHint,
  );

  const settings = h("div", { className: "wm-settings" }, kindSeg.box, textPanel, imagePanel, opacityBox, pagesBox, rangeError.el);

  // ---------- preview ----------
  const sheet = h("canvas", { className: "wm-preview__page", "aria-hidden": "true" });
  const overlay = h("canvas", { className: "wm-preview__mark", "aria-hidden": "true" });
  const frame = h("div", { className: "wm-preview__frame" }, sheet, overlay);
  const caption = h("figcaption", { className: "wm-preview__caption" });
  const previewError = errorRegion();
  const preview = h("figure", { className: "wm-preview" }, h("div", { className: "wm-preview__stage" }, frame), caption, previewError.el);

  const editor = h("div", { className: "wm-editor", hidden: true }, settings, preview);

  const saveBtn = button(t("watermark.save"), { variant: "primary", onClick: () => void save() });
  const downloadBtn = button(t("tool.download"), { variant: "primary", onClick: () => result && downloadBlob(result.blob, result.name) });
  downloadBtn.hidden = true;
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions", hidden: true }, saveBtn, downloadBtn, resetBtn);
  const progress = h("progress", { className: "tool-progress", hidden: true, "aria-label": t("watermark.saving") });
  const after = h("p", { className: "tool-note", hidden: true, text: t("watermark.after") });

  const tool = h(
    "div",
    { className: "tool tool--pdf-watermark" },
    drop,
    errors.el,
    fileInfo,
    editor,
    progress,
    status.el,
    actions,
    after,
    live,
  );
  el.append(tool);

  // ---------- settings ----------
  function setKind(k: Kind) {
    kind = k;
    textPanel.hidden = k !== "text";
    imagePanel.hidden = k !== "image";
    changed();
  }

  function syncSize() {
    // "Fit" means one line across the page; a tiled page always uses the size in points.
    fitRow.hidden = layout === "tile";
    sizeInput.disabled = layout === "single" && fitInput.checked;
  }

  const percent = (input: HTMLInputElement) => Number(input.value) / 100;

  function angleChoice(): AngleChoice {
    if (angleMode !== "custom") return angleMode;
    const a = Number(angleInput.value);
    return Number.isFinite(a) ? a : 0;
  }

  function sizeChoice(): number | "fit" {
    if (layout === "single" && fitInput.checked) return "fit";
    const s = Number(sizeInput.value);
    return Number.isFinite(s) && s > 0 ? s : DEFAULT_SIZE;
  }

  /** The text to draw, and the characters the PDF fonts can't draw (shown under the field). */
  function checkText(): { text: string; bad: string[] } {
    const text = cleanText(textInput.value);
    const bad = unencodable(text);
    if (bad.length) textError.show(tPlural(ctx, "watermark.error.chars", bad.length, { chars: bad.map(showChar).join(" ") }));
    else textError.clear();
    if (bad.length) textInput.setAttribute("aria-invalid", "true");
    else textInput.removeAttribute("aria-invalid");
    return { text, bad };
  }

  function rangeMessage(e: PageRangeError): string {
    switch (e.code) {
      case "empty":
        return t("watermark.pages.error.empty");
      case "syntax":
        return t("watermark.pages.error.syntax", { part: e.part });
      case "outOfRange":
        return tPlural(ctx, "watermark.pages.error.outOfRange", e.pages, { part: e.part, pages: e.pages });
      case "reversed":
        return t("watermark.pages.error.reversed", { part: e.part });
    }
  }

  /** 0-based pages to mark, or the error to show. `quiet` leaves an empty field unflagged while it is being typed. */
  function selectedPages(quiet: boolean): { ok: true; pages: number[] } | { ok: false; message: string } {
    const total = views.length;
    if (allRadio.checked) {
      rangeError.clear();
      return { ok: true, pages: views.map((_, i) => i) };
    }
    const parsed = parsePageRanges(rangeInput.value, total);
    if (!parsed.ok) {
      const message = rangeMessage(parsed.error);
      if (quiet && parsed.error.code === "empty") rangeError.clear();
      else rangeError.show(message);
      if (quiet && parsed.error.code === "empty") rangeInput.removeAttribute("aria-invalid");
      else rangeInput.setAttribute("aria-invalid", "true");
      return { ok: false, message };
    }
    rangeError.clear();
    rangeInput.removeAttribute("aria-invalid");
    const set = new Set(parsed.ranges.flatMap(rangeIndices));
    return { ok: true, pages: [...set].sort((a, b) => a - b) };
  }

  for (const input of [textInput, sizeInput, angleInput, rangeInput]) input.addEventListener("input", changed);
  for (const input of [fitInput, boldInput, allRadio, someRadio, positionSelect]) input.addEventListener("change", changed);
  fitInput.addEventListener("change", syncSize);
  for (const r of [allRadio, someRadio]) {
    r.addEventListener("change", () => {
      rangeBox.hidden = rangeHint.hidden = !someRadio.checked;
      if (someRadio.checked) rangeInput.focus();
    });
  }
  scaleInput.addEventListener("input", () => {
    scaleOut.textContent = `${scaleInput.value}%`;
    changed();
  });
  opacityInput.addEventListener("input", () => {
    opacityOut.textContent = `${opacityInput.value}%`;
    changed();
  });
  rangeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void save();
  });
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void save();
  });

  /** Any setting changed: the saved file is out of date, and the preview is redrawn. */
  function changed() {
    invalidate();
    schedulePreview();
  }

  function invalidate() {
    if (!result && downloadBtn.hidden) return;
    result = null;
    downloadBtn.hidden = true;
    saveBtn.hidden = false;
    after.hidden = true;
    if (!busy) status.set("");
  }

  // ---------- logo ----------
  logoInput.addEventListener("change", () => {
    const f = logoInput.files?.[0];
    logoInput.value = "";
    if (f) void loadLogo(f);
  });

  async function loadLogo(f: File) {
    logoError.clear();
    if (f.size > IMAGE_MAX_BYTES) {
      logoError.show(t("tool.error.tooLarge", { name: f.name, max: formatBytes(IMAGE_MAX_BYTES) }));
      return;
    }
    let data = new Uint8Array(await f.arrayBuffer());
    let format = sniffImage(data);
    if (!format) {
      logoError.show(t("watermark.image.error.type", { name: f.name }));
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(new Blob([data as BlobPart], { type: format === "png" ? "image/png" : "image/jpeg" }));
    } catch {
      logoError.show(t("watermark.image.error.decode", { name: f.name }));
      return;
    }
    // A phone photo stored sideways with an EXIF turn: the browser shows it upright, pdf-lib would not.
    if (format === "jpg" && jpegOrientation(data) !== 1) {
      const c = document.createElement("canvas");
      c.width = bitmap.width;
      c.height = bitmap.height;
      c.getContext("2d")!.drawImage(bitmap, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", 0.92));
      c.width = c.height = 0;
      if (blob) data = new Uint8Array(await blob.arrayBuffer());
      format = "jpg";
    }
    logo?.bitmap.close();
    logo = { bytes: data, format, bitmap, name: f.name };
    logoName.textContent = t("watermark.image.chosen", { name: f.name, width: bitmap.width, height: bitmap.height });
    logoName.hidden = false;
    logoPick.firstElementChild!.textContent = t("watermark.image.another");
    changed();
  }

  // ---------- preview ----------
  let previewQueued = false;
  let base: { page: number; gen: number } | null = null;
  let baseLoading: number | null = null;

  function schedulePreview() {
    if (previewQueued || !viewer) return;
    previewQueued = true;
    requestAnimationFrame(() => {
      previewQueued = false;
      void drawPreview();
    });
  }

  async function drawPreview() {
    if (!viewer || views.length === 0) return;
    const sel = selectedPages(true);
    const pageIndex = sel.ok ? (sel.pages[0] ?? 0) : (base?.page ?? 0);
    const gen = generation;
    if (!base || base.page !== pageIndex || base.gen !== gen) {
      // One page at a time; when it is in, the preview runs again with whatever is selected by then.
      if (baseLoading !== null) return;
      baseLoading = pageIndex;
      try {
        const { renderThumbnail } = await import("../pdf-shared/pdfjs");
        const page = await viewer.getPage(pageIndex + 1);
        const canvas = await renderThumbnail(page, PREVIEW_CSS);
        page.cleanup();
        if (gen !== generation) return;
        sheet.width = canvas.width;
        sheet.height = canvas.height;
        sheet.getContext("2d")!.drawImage(canvas, 0, 0);
        canvas.width = canvas.height = 0;
        overlay.width = sheet.width;
        overlay.height = sheet.height;
        const v = views[pageIndex]!;
        frame.style.setProperty("--wm-ratio", `${v.width} / ${v.height}`);
        frame.style.setProperty("--wm-r", String(v.width / v.height));
        previewError.clear();
        base = { page: pageIndex, gen };
      } catch (err) {
        console.warn(err);
        if (gen === generation) previewError.show(t("watermark.preview.error", { page: pageIndex + 1 }));
        return;
      } finally {
        if (gen === generation) baseLoading = null;
      }
      // Settings may have moved on while the page was drawn.
      schedulePreview();
    }
    caption.textContent = t("watermark.preview.caption", { page: pageIndex + 1, total: views.length });
    paintOverlay(pageIndex);
  }

  function paintOverlay(pageIndex: number) {
    const g = overlay.getContext("2d");
    const v = views[pageIndex];
    if (!g || !v) return;
    g.clearRect(0, 0, overlay.width, overlay.height);
    const k = overlay.width / v.width;
    g.globalAlpha = percent(opacityInput);
    if (kind === "image") {
      if (!logo) return;
      const r = imageRect(v, logo.bitmap.width / logo.bitmap.height, percent(scaleInput), positionSelect.value as Position);
      g.drawImage(logo.bitmap, r.x * k, r.y * k, r.w * k, r.h * k);
      return;
    }
    const { text, bad } = checkText();
    if (!text || bad.length || !measure) return;
    const bold = boldInput.checked;
    const plan = planText({ width1: measure(text, bold), size: sizeChoice(), angle: angleChoice(), layout }, v);
    g.fillStyle = colorInput.value;
    g.font = `${bold ? 700 : 400} ${plan.size * k}px ${PREVIEW_FONT}`;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    const drawn = g.measureText(text).width;
    const stretch = drawn > 0 ? (plan.width * k) / drawn : 1;
    const rad = (-plan.angle * Math.PI) / 180;
    for (const c of plan.centers) {
      const o = textOrigin(c, plan.angle, plan.width, plan.size);
      g.save();
      g.translate(o.x * k, o.y * k);
      g.rotate(rad);
      g.scale(stretch, 1);
      g.fillText(text, 0, 0);
      g.restore();
    }
  }

  // ---------- open, save, reset ----------
  async function open(f: File) {
    clearDocument();
    const gen = generation;
    status.set(t("watermark.reading", { name: f.name }));
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
      measure = await w.createMeasurer();
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      file = f;
      bytes = data;
      pristine = doc;
      viewer = proxy;
      views = w.pageViews(doc);
      fileInfo.textContent = tPlural(ctx, "watermark.fileInfo", views.length, { name: f.name, pages: views.length, size: formatBytes(f.size) });
      status.set("");
      tool.dataset.loaded = "";
      if (dropLabel) dropLabel.textContent = t("watermark.drop.replace");
      editor.hidden = false;
      actions.hidden = false;
      saveBtn.hidden = false;
      syncSize();
      schedulePreview();
      live.textContent = tPlural(ctx, "watermark.opened", views.length, { name: f.name, pages: views.length });
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
    saveBtn.disabled = resetBtn.disabled = on;
    editor.toggleAttribute("inert", on);
  }

  function buildMark(): Watermark | null {
    const opacity = percent(opacityInput);
    if (kind === "image") {
      if (!logo) {
        logoError.show(t("watermark.image.error.none"));
        logoPick.focus();
        return null;
      }
      return { kind: "image", bytes: logo.bytes, format: logo.format, scale: percent(scaleInput), opacity, position: positionSelect.value as Position };
    }
    const { text, bad } = checkText();
    if (!text) {
      textError.show(t("watermark.error.noText"));
      textInput.focus();
      return null;
    }
    if (bad.length) {
      textInput.focus();
      return null;
    }
    return {
      kind: "text",
      text,
      bold: boldInput.checked,
      size: sizeChoice(),
      color: hexToRgb(colorInput.value) ?? [0.5, 0.5, 0.5],
      opacity,
      angle: angleChoice(),
      layout,
    };
  }

  async function save() {
    if (!bytes || !file || busy) return;
    errors.clear();
    const mark = buildMark();
    if (!mark) return;
    const sel = selectedPages(false);
    if (!sel.ok) {
      rangeInput.focus();
      return;
    }
    const f = file;
    const gen = generation;
    setBusy(true);
    status.set(t("watermark.saving"));
    try {
      const w = await writer();
      const doc = pristine ?? (await w.loadPdf(bytes));
      pristine = null;
      const out = await w.watermarkPdf(doc, mark, sel.pages);
      if (gen !== generation) return;
      result = { blob: pdfBlob(out), name: t("watermark.outputName", { name: baseName(f.name) }) };
      const pages = sel.pages.length;
      status.set(tPlural(ctx, "watermark.done", pages, { pages, size: formatBytes(result.blob.size) }));
      downloadBtn.textContent = t("watermark.download", { name: result.name });
      saveBtn.hidden = true;
      downloadBtn.hidden = false;
      after.hidden = false;
      markEnter(downloadBtn);
    } catch (err) {
      if (gen !== generation) return;
      // pdf-lib could not read the logo (an unusual PNG or JPEG): say so, rather than blaming the PDF.
      if (mark.kind === "image" && !(err instanceof PdfToolError)) {
        console.error(err);
        logoError.show(t("watermark.image.error.embed", { name: logo?.name ?? "" }));
      } else errors.show(errorMessage(err, ctx, f.name));
      status.set("");
    } finally {
      if (gen === generation) {
        setBusy(false);
        if (!downloadBtn.hidden) downloadBtn.focus();
      }
    }
  }

  /** Forget the PDF; the watermark settings (and the logo) stay for the next file. */
  function clearDocument() {
    generation++;
    if (viewer) void viewer.loadingTask.destroy();
    viewer = null;
    file = null;
    bytes = null;
    pristine = null;
    views = [];
    base = null;
    baseLoading = null;
    sheet.width = sheet.height = 0;
    overlay.width = overlay.height = 0;
    caption.textContent = "";
    result = null;
    downloadBtn.hidden = true;
    after.hidden = true;
    editor.hidden = true;
    actions.hidden = true;
    fileInfo.textContent = "";
    delete tool.dataset.loaded;
    if (dropLabel) dropLabel.textContent = dropText;
    setBusy(false);
    errors.clear();
    previewError.clear();
    rangeError.clear();
    status.set("");
  }

  function forgetLogo() {
    logo?.bitmap.close();
    logo = null;
    logoName.hidden = true;
    logoName.textContent = "";
    logoError.clear();
    logoPick.firstElementChild!.textContent = t("watermark.image.choose");
  }

  function startOver() {
    clearDocument();
    forgetLogo();
    live.textContent = "";
    drop.querySelector("input")?.focus();
  }

  return () => {
    clearDocument();
    forgetLogo();
    tool.remove();
  };
}
