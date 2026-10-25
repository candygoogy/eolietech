/**
 * Image to text (OCR), base page /image-to-text/ and variant /ocr-pdf/ (preset { input: "pdf" }).
 * Tesseract runs in its own worker (./engine.ts); files are read one at a time. Images are decoded
 * by the browser (EXIF rotation applied) and drawn on white; PDF pages are rendered by PDF.js at
 * 300 dpi (pixel-capped) and, for PDFs, the result is also a searchable copy: the original pages
 * plus an invisible text layer (./text-layer.ts). Pages that already have text are kept as they are
 * unless the user asks to read them too. Recognised text is only ever set with textContent.
 */
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Page } from "tesseract.js";
import { tPlural } from "../../i18n/plural";
import { createDropzone, downloadBlob, downloadZip, formatBytes, markEnter, renameExtension, type FileIntake } from "../../lib/tool-ui";
import { acceptFor, sniffFormat, uniqueNames } from "../image-shared/formats";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import { looksLikePdf } from "../pdf-shared/pdf-errors";
import { pageSize } from "../pdf-to-image/plan";
import type { ToolCtx } from "../types";
import type { OcrEngine } from "./engine";
import { linesFromBlocks, type PageLayer } from "./page-text";
import { coreVariant, defaultChoice, firstRunBytes, langBytes, langsFor, type LangChoice } from "./sizes";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./ocr.css?url";

/** HEIC is accepted only to point to the converter. */
const ACCEPT = `${acceptFor(["jpg", "png", "webp", "heic"])},application/pdf,.pdf`;
const DPI = 300;
/** Same cap as PDF to image: about 16.7 MP, the largest canvas iOS Safari draws. */
const MAX_PIXELS = 4096 * 4096;
/** Below this longest side an image is read at twice its size (small screenshot text reads much better). */
const UPSCALE_BELOW = 2000;
/** Tesseract's mean word confidence (0 to 100) under which the result gets a "check it" note. */
const LOW_CONFIDENCE = 60;

type Kind = "image" | "pdf" | "heic";
type State = "pending" | "working" | "done" | "error";

interface Item {
  file: File;
  kind: Kind;
  state: State;
  text: string;
  pdf?: Blob;
  pages?: number;
  skipped: number[];
  confidence?: number;
  error?: string;
  li: HTMLLIElement;
  meta: HTMLParagraphElement;
  progress: HTMLProgressElement;
  result: HTMLDivElement;
  row: HTMLDivElement;
}

class Stopped extends Error {}
class EngineLoadError extends Error {}

const kindOf = (file: File): Kind => {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/^image\/hei[cf]/.test(file.type) || /\.(heic|heif|hif)$/.test(name)) return "heic";
  return "image";
};

const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

let uid = 0;
const domId = (prefix: string): string => `${prefix}-${++uid}`;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t, locale } = ctx;
  const pdfFirst = ctx.preset.input === "pdf";
  let items: Item[] = [];
  let running = false;
  /** Bumped by Stop, Start over and unmount: running work checks it between steps. */
  let generation = 0;
  let engine: OcrEngine | null = null;
  let engineLoaded = false;
  let renderTask: RenderTask | null = null;
  let destroyed = false;
  /** Aborted by Stop: cancels a first-run engine download that has not finished yet. */
  let abort = new AbortController();
  const variant = coreVariant();

  const tool = h("div", { className: "tool tool--ocr" });
  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: true,
    ctx,
    onFiles: add,
    label: t(pdfFirst ? "ocr.drop.labelPdf" : "ocr.drop.label"),
    hint: t(pdfFirst ? "ocr.drop.hintPdf" : "ocr.drop.hint"),
  });

  // ---------- options (shown once files are added) ----------
  const langId = domId("ocr-lang");
  const langNote = h("p", { className: "tool-note", id: `${langId}-note`, text: t("ocr.lang.note") });
  const choices: LangChoice[] = locale === "it" ? ["ita", "eng", "both"] : ["eng", "ita", "both"];
  const langSelect = h(
    "select",
    { id: langId, name: "language", "aria-describedby": langNote.id },
    ...choices.map((c) => h("option", { value: c, text: t(`ocr.lang.${c}`) })),
  );
  langSelect.value = defaultChoice(locale);
  langSelect.addEventListener("change", syncFirstRun);

  const allId = domId("ocr-all-pages");
  const allPages = h("input", { type: "checkbox", id: allId, "aria-describedby": `${allId}-note` });
  const allPagesBox = h(
    "div",
    { hidden: true },
    h("div", {}, allPages, h("label", { for: allId, text: t("ocr.allPages") })),
    h("p", { className: "tool-note", id: `${allId}-note`, text: t("ocr.allPages.note") }),
  );
  const options = h(
    "div",
    { className: "tool-options", hidden: true },
    h("div", {}, h("label", { for: langId, text: t("ocr.lang.label") }), langSelect),
    langNote,
    allPagesBox,
  );
  const firstRun = h("p", { className: "tool-note", hidden: true });

  const startBtn = button("", { variant: "primary", onClick: () => void run() });
  const stopBtn = button(t("ocr.stop"), { variant: "ghost", onClick: stop });
  const zipBtn = button(t("tool.downloadAll"), { onClick: () => void zipAll() });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, startBtn, stopBtn, zipBtn, resetBtn);
  const loadProgress = h("progress", { className: "tool-progress", "aria-label": t("ocr.engineProgress"), hidden: true, max: 1, value: 0 });
  const list = h("ul", { className: "tool-list", "aria-label": t("ocr.list") });

  tool.append(drop, errors.el, options, firstRun, actions, loadProgress, status.el, list);
  el.append(tool);
  render();

  function chosenLangs() {
    return langsFor(langSelect.value as LangChoice, locale);
  }

  function syncFirstRun() {
    const langs = chosenLangs();
    firstRun.textContent = t("ocr.firstRun", { size: formatBytes(firstRunBytes(langs, variant)) });
    // Once the engine has run here, only a language it has not loaded yet means another download.
    firstRun.hidden = items.length === 0 || (engineLoaded && engine?.langs === langs.join("+"));
  }

  // ---------- intake ----------

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
      const kind = kindOf(file);
      const item: Item = {
        file,
        kind,
        state: kind === "heic" ? "error" : "pending",
        text: "",
        skipped: [],
        li: h("li", { className: "tool-item" }),
        meta: h("p", { className: "tool-item__meta" }),
        progress: h("progress", { className: "tool-progress", max: 1, value: 0, hidden: true, "aria-label": t("ocr.itemProgress", { name: file.name }) }),
        result: h("div", { className: "ocr-result", hidden: true }),
        row: h("div", { className: "tool-actions" }),
      };
      item.li.append(h("div", {}, h("p", { className: "tool-item__name", text: file.name }), item.meta, item.progress), item.row, item.result);
      markEnter(item.li);
      items.push(item);
      list.append(item.li);
      renderItem(item);
    }
    render();
    if (files.length && !running) startBtn.focus();
  }

  // ---------- running ----------

  async function ensureEngine(gen: number): Promise<OcrEngine> {
    const langs = chosenLangs();
    if (engine && engine.langs === langs.join("+")) return engine;
    engine?.terminate();
    engine = null;
    const total = langBytes(langs);
    loadProgress.hidden = false;
    loadProgress.removeAttribute("value");
    status.set(t("ocr.engine.starting"));
    try {
      const { startEngine } = await import("./engine");
      const next = await startEngine(langs, abort.signal, (e) => {
        if (gen !== generation) return;
        if (e.kind === "download") {
          loadProgress.max = total;
          loadProgress.value = Math.min(e.loaded, total);
          status.set(t("ocr.engine.downloading", { loaded: formatBytes(e.loaded), total: formatBytes(total) }));
        } else {
          loadProgress.removeAttribute("value");
          status.set(t("ocr.engine.starting"));
        }
      });
      if (gen !== generation) {
        next.terminate();
        throw new Stopped();
      }
      engine = next;
      engineLoaded = true;
      syncFirstRun();
      return next;
    } catch (err) {
      if (err instanceof Stopped || gen !== generation) throw new Stopped();
      console.error(err);
      throw new EngineLoadError();
    } finally {
      loadProgress.hidden = true;
    }
  }

  async function run() {
    if (running) return;
    const queue = items.filter((i) => i.state === "pending");
    if (queue.length === 0) return;
    const gen = ++generation;
    running = true;
    abort = new AbortController();
    errors.clear();
    render();
    stopBtn.focus();
    let stoppedEarly = false;
    for (const [n, item] of queue.entries()) {
      if (gen !== generation || !items.includes(item)) {
        stoppedEarly = gen !== generation;
        if (stoppedEarly) break;
        continue;
      }
      item.state = "working";
      item.progress.value = 0;
      renderItem(item);
      try {
        const eng = await ensureEngine(gen);
        status.set(tPlural(ctx, "ocr.summary.working", queue.length, { current: n + 1, total: queue.length }));
        if (item.kind === "pdf") await readPdf(item, eng, gen);
        else await readImage(item, eng, gen);
        item.state = "done";
      } catch (err) {
        if (err instanceof Stopped || gen !== generation) {
          resetItem(item);
          renderItem(item);
          stoppedEarly = true;
          break;
        }
        if (err instanceof EngineLoadError) {
          resetItem(item);
          renderItem(item);
          errors.show(t("ocr.error.load"));
          stoppedEarly = true;
          break;
        }
        item.state = "error";
        item.error =
          item.kind === "pdf" ? errorMessage(err, ctx, item.file.name) : t("ocr.error.image", { name: item.file.name });
        if (item.kind !== "pdf") console.error(err);
      }
      renderItem(item);
    }
    if (destroyed) return;
    running = false;
    render(stoppedEarly ? "stopped" : undefined);
    if (!stoppedEarly) (list.querySelector<HTMLButtonElement>('.tool-item[data-state="done"] .btn--primary') ?? startBtn).focus();
    else if (!startBtn.hidden) startBtn.focus();
  }

  function resetItem(item: Item) {
    item.state = "pending";
    item.text = "";
    item.pdf = undefined;
    item.pages = undefined;
    item.skipped = [];
    item.confidence = undefined;
  }

  /** The running loop notices (its engine call rejects or its next check throws), puts the current file back and ends. */
  function stop() {
    if (!running) return;
    generation++;
    stopBtn.disabled = true;
    abort.abort();
    renderTask?.cancel();
    engine?.terminate();
    engine = null;
  }

  const check = (gen: number) => {
    if (gen !== generation) throw new Stopped();
  };

  async function recognize(eng: OcrEngine, canvas: HTMLCanvasElement, opts: Parameters<OcrEngine["recognize"]>[1], onProgress: (p: number) => void, gen: number): Promise<Page> {
    try {
      return await eng.recognize(canvas, opts, onProgress);
    } catch (err) {
      check(gen);
      throw err;
    }
  }

  async function readImage(item: Item, eng: OcrEngine, gen: number) {
    if (item.kind === "heic") throw new Error("heic");
    const head = new Uint8Array(await item.file.slice(0, 64).arrayBuffer());
    if (sniffFormat(head) === "heic") {
      item.kind = "heic";
      throw new Error("heic");
    }
    const bitmap = await createImageBitmap(item.file);
    check(gen);
    const canvas = document.createElement("canvas");
    try {
      const longest = Math.max(bitmap.width, bitmap.height);
      let scale = longest < UPSCALE_BELOW ? 2 : 1;
      scale = Math.min(scale, Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const g = canvas.getContext("2d")!;
      // Transparent screenshots: Tesseract reads dark text on white.
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.imageSmoothingQuality = "high";
      g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const page = await recognize(eng, canvas, { boxes: false, deskew: true }, (p) => setItemProgress(item, p), gen);
      check(gen);
      item.text = page.text.trim();
      item.confidence = page.confidence;
    } finally {
      canvas.width = canvas.height = 0;
    }
  }

  async function readPdf(item: Item, eng: OcrEngine, gen: number) {
    const bytes = await readFile(item.file);
    if (!looksLikePdf(bytes)) {
      const { PdfToolError } = await import("../pdf-shared/pdf-errors");
      throw new PdfToolError("invalid");
    }
    const { openForRender } = await import("../pdf-shared/pdfjs");
    const doc: PDFDocumentProxy = await openForRender(bytes.slice());
    const readAll = allPages.checked;
    const texts: string[] = [];
    const layers: (PageLayer | null)[] = [];
    let confidenceSum = 0;
    let read = 0;
    try {
      check(gen);
      const pages = doc.numPages;
      item.pages = pages;
      for (let n = 1; n <= pages; n++) {
        check(gen);
        const page = await doc.getPage(n);
        const canvas = document.createElement("canvas");
        try {
          const content = await page.getTextContent();
          const existing = content.items
            .map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : ""))
            .join("")
            .trim();
          if (existing && !readAll) {
            texts.push(existing);
            layers.push(null);
            item.skipped.push(n);
            setItemProgress(item, 1, n, pages);
            continue;
          }
          const base = page.getViewport({ scale: 1 });
          const size = pageSize(base.width, base.height, DPI);
          const viewport = page.getViewport({ scale: size.scale });
          canvas.width = size.width;
          canvas.height = size.height;
          setItemProgress(item, 0, n, pages);
          renderTask = page.render({ canvas, viewport });
          try {
            await renderTask.promise;
          } catch (err) {
            check(gen);
            throw err;
          } finally {
            renderTask = null;
          }
          check(gen);
          const result = await recognize(
            eng,
            canvas,
            { boxes: true, deskew: false, dpi: Math.round(size.scale * 72) },
            (p) => setItemProgress(item, p, n, pages),
            gen,
          );
          check(gen);
          texts.push(result.text.trim());
          layers.push({ lines: linesFromBlocks(result.blocks), transform: viewport.transform as PageLayer["transform"] });
          confidenceSum += result.confidence;
          read++;
        } finally {
          page.cleanup();
          canvas.width = canvas.height = 0;
        }
      }
    } finally {
      void doc.loadingTask.destroy();
    }
    item.text =
      texts.length === 1
        ? texts[0]!
        : texts.map((text, i) => `${t("ocr.pageHeading", { page: i + 1 })}\n${text}`).join("\n\n").trim();
    item.confidence = read > 0 ? confidenceSum / read : undefined;
    if (read > 0) {
      const { buildSearchablePdf } = await import("./text-layer");
      const out = await buildSearchablePdf(bytes, layers);
      check(gen);
      item.pdf = pdfBlob(out);
    }
  }

  function setItemProgress(item: Item, p: number, page = 1, pages = 1) {
    item.progress.max = pages;
    item.progress.value = Math.min(pages, page - 1 + Math.max(0, Math.min(1, p)));
    const percent = Math.round(Math.max(0, Math.min(1, p)) * 100);
    item.meta.textContent = pages > 1 ? t("ocr.status.page", { page, pages, percent }) : t("ocr.status.reading", { percent });
  }

  // ---------- outputs ----------

  const outputBase = (item: Item) => (item.kind === "pdf" ? baseName(item.file.name) : item.file.name.replace(/\.[^.]+$/, "") || "image");
  const txtName = (item: Item) => renameExtension(outputBase(item), "txt");
  const pdfName = (item: Item) => t("ocr.pdfName", { name: outputBase(item) });
  const txtBlob = (item: Item) => new Blob([item.text.endsWith("\n") ? item.text : `${item.text}\n`], { type: "text/plain;charset=utf-8" });

  async function copy(item: Item) {
    try {
      await navigator.clipboard.writeText(item.text);
      status.set(t("ocr.copied", { name: item.file.name }));
    } catch {
      status.set(t("ocr.copyFailed"));
    }
  }

  async function zipAll() {
    const done = items.filter((i) => i.state === "done");
    if (done.length === 0) return;
    const files: { name: string; blob: Blob }[] = [];
    for (const item of done) {
      if (item.text) files.push({ name: txtName(item), blob: txtBlob(item) });
      if (item.pdf) files.push({ name: pdfName(item), blob: item.pdf });
    }
    const names = uniqueNames(files.map((f) => f.name));
    zipBtn.disabled = true;
    try {
      await downloadZip(
        files.map((f, i) => ({ name: names[i]!, blob: f.blob })),
        t("ocr.zipName"),
      );
    } catch {
      errors.show(t("tool.error.generic"));
    } finally {
      zipBtn.disabled = false;
    }
  }

  function reset() {
    if (running) return;
    items = [];
    list.replaceChildren();
    errors.clear();
    status.set("");
    render();
    drop.querySelector("input")?.focus();
  }

  // ---------- rendering ----------

  function renderItem(item: Item) {
    const { li, meta, progress, result, row, file } = item;
    li.dataset.state = item.state;
    progress.hidden = item.state !== "working";
    row.replaceChildren();
    result.replaceChildren();
    result.hidden = true;
    meta.replaceChildren();

    if (item.state === "pending") {
      meta.textContent = t(item.kind === "pdf" ? "ocr.status.pendingPdf" : "ocr.status.pending", { size: formatBytes(file.size) });
    } else if (item.state === "working") {
      meta.textContent = t("ocr.status.starting");
    } else if (item.state === "error") {
      if (item.kind === "heic") {
        meta.append(t("ocr.error.heic", { name: file.name }), " ", h("a", { href: t("ocr.error.heicHref"), text: t("ocr.error.heicLink") }), ".");
      } else {
        meta.textContent = item.error ?? t("tool.error.generic");
      }
    } else {
      const words = wordCount(item.text);
      const parts = [item.text ? tPlural(ctx, "ocr.status.words", words) : t("ocr.status.noWords")];
      if (item.pages && item.pages > 1) parts.unshift(tPlural(ctx, "ocr.status.pages", item.pages));
      meta.textContent = parts.join(", ");
      const notes: string[] = [];
      if (item.skipped.length) {
        notes.push(
          item.skipped.length === item.pages
            ? t("ocr.skipped.all")
            : tPlural(ctx, "ocr.skipped", item.skipped.length, { pages: item.skipped.join(", ") }),
        );
      }
      if (!item.text) notes.push(t("ocr.empty"));
      else if (item.confidence !== undefined && item.confidence < LOW_CONFIDENCE) notes.push(t("ocr.lowConfidence"));
      for (const note of notes) result.append(h("p", { className: "tool-note", text: note }));
      if (item.text) {
        const textEl = h("div", { className: "ocr-text", tabindex: 0, role: "region", "aria-label": t("ocr.textLabel", { name: file.name }) });
        textEl.textContent = item.text;
        const actionsRow = h(
          "div",
          { className: "tool-actions" },
          button(t("ocr.downloadTxt"), {
            variant: item.pdf ? undefined : "primary",
            ariaLabel: t("ocr.downloadTxtNamed", { name: file.name }),
            onClick: () => downloadBlob(txtBlob(item), txtName(item)),
          }),
          button(t("ocr.copy"), { ariaLabel: t("ocr.copyNamed", { name: file.name }), onClick: () => void copy(item) }),
        );
        if (item.pdf) {
          const pdf = item.pdf;
          actionsRow.prepend(
            button(t("ocr.downloadPdf"), {
              variant: "primary",
              ariaLabel: t("ocr.downloadPdfNamed", { name: file.name }),
              onClick: () => downloadBlob(pdf, pdfName(item)),
            }),
          );
        }
        result.append(textEl, actionsRow);
      }
      result.hidden = result.childElementCount === 0;
    }

    if (item.state !== "working") {
      row.append(
        button(t("tool.remove"), {
          variant: "ghost",
          ariaLabel: t("ocr.removeNamed", { name: file.name }),
          onClick: () => removeItem(item),
        }),
      );
    }
  }

  function removeItem(item: Item) {
    const index = items.indexOf(item);
    items = items.filter((i) => i !== item);
    item.li.remove();
    render();
    const next = items[Math.min(index, items.length - 1)];
    (next?.li.querySelector<HTMLButtonElement>(".tool-actions .btn--ghost") ?? drop.querySelector("input"))?.focus();
  }

  function render(outcome?: "stopped") {
    const total = items.length;
    const pending = items.filter((i) => i.state === "pending");
    const done = items.filter((i) => i.state === "done");
    const failed = items.filter((i) => i.state === "error").length;
    const hasPdf = items.some((i) => i.kind === "pdf" && i.state === "pending");

    options.hidden = total === 0;
    allPagesBox.hidden = !hasPdf;
    actions.hidden = total === 0;
    startBtn.hidden = running || pending.length === 0;
    startBtn.textContent = tPlural(ctx, "ocr.start", pending.length);
    stopBtn.hidden = !running;
    stopBtn.disabled = false;
    zipBtn.hidden = running || done.length < 2;
    resetBtn.disabled = running;
    langSelect.disabled = allPages.disabled = running;
    drop.toggleAttribute("inert", running);
    for (const item of items) item.row.querySelectorAll("button").forEach((b) => (b.disabled = running));
    syncFirstRun();

    if (running) return;
    if (total === 0) return status.set("");
    const parts: string[] = [];
    if (outcome === "stopped") parts.push(t("ocr.summary.stopped"));
    if (done.length > 0) parts.push(tPlural(ctx, "ocr.summary.done", done.length));
    if (pending.length > 0 && outcome !== "stopped") parts.push(tPlural(ctx, "ocr.summary.ready", pending.length));
    if (failed > 0) parts.push(tPlural(ctx, "ocr.summary.failed", failed));
    status.set(parts.join(" "));
  }

  return () => {
    destroyed = true;
    generation++;
    abort.abort();
    renderTask?.cancel();
    engine?.terminate();
    engine = null;
    running = false;
    tool.remove();
  };
}
