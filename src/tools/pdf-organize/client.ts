/**
 * Organize PDF: thumbnails (PDF.js), reorder (drag or move buttons), rotate, delete pages,
 * then save a new PDF with pdf-lib. Nothing leaves the browser.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import {
  baseName,
  button,
  enableDragSort,
  errorMessage,
  errorRegion,
  h,
  moveItem,
  pdfBlob,
  readFile,
  setDisabled,
  statusRegion,
} from "../pdf-shared/dom";
import { normaliseAngle } from "../pdf-shared/rotation";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./organize.css?url";

const ACCEPT = "application/pdf,.pdf";
const THUMB_CSS_PX = 140;

interface PageState {
  /** 0-based index in the source PDF. */
  index: number;
  /** Extra clockwise rotation chosen by the user. */
  rotate: number;
  /** Rendered at the page's own rotation; null until rendered. */
  thumb: HTMLCanvasElement | null;
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let file: File | null = null;
  let doc: PDFDocument | null = null;
  let viewer: PDFDocumentProxy | null = null;
  let pages: PageState[] = [];
  let generation = 0;
  let busy = false;
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
  const list = h("ol", { className: "tool-list tool-list--pages", "aria-label": t("organize.listLabel") });
  const hint = h("p", { className: "tool-note", text: t("organize.hint"), hidden: true });
  const saveBtn = button(t("organize.save"), { variant: "primary", onClick: () => void save() });
  const undoBtn = button(t("organize.undo"), { variant: "ghost", onClick: undoAll });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: reset });
  const actions = h("div", { className: "tool-actions", hidden: true }, saveBtn, undoBtn, resetBtn);
  const resultBox = h("div", { className: "tool-actions", hidden: true });

  enableDragSort(list, (from, to) => move(from, to, false));

  el.append(
    h(
      "div",
      { className: "tool tool--pdf-organize" },
      drop,
      errors.el,
      fileInfo,
      hint,
      actions,
      status.el,
      resultBox,
      list,
    ),
  );

  async function open(f: File) {
    reset();
    const gen = generation;
    status.set(t("organize.reading", { name: f.name }));
    try {
      const bytes = await readFile(f);
      const [{ loadPdf }, { openForRender }] = await Promise.all([ops(), import("../pdf-shared/pdfjs")]);
      const loaded = await loadPdf(bytes);
      // PDF.js transfers the buffer it gets to its worker: give it a copy.
      const proxy = await openForRender(bytes.slice());
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      file = f;
      doc = loaded;
      viewer = proxy;
      pages = loaded.getPageIndices().map((index) => ({ index, rotate: 0, thumb: null }));
      fileInfo.textContent = tPlural(ctx, "organize.fileInfo", pages.length, { name: f.name, pages: pages.length, size: formatBytes(f.size) });
      hint.hidden = false;
      actions.hidden = false;
      render();
      status.set(tPlural(ctx, "organize.ready", pages.length, { pages: pages.length }));
      void renderThumbs(gen);
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, f.name));
      status.set("");
    }
  }

  /** Render thumbnails one by one, in source order, and patch them into the list as they arrive. */
  async function renderThumbs(gen: number) {
    const { renderThumbnail } = await import("../pdf-shared/pdfjs");
    const total = viewer?.numPages ?? 0;
    for (let i = 0; i < total; i++) {
      if (gen !== generation || !viewer) return;
      try {
        const page = await viewer.getPage(i + 1);
        const canvas = await renderThumbnail(page, THUMB_CSS_PX);
        page.cleanup();
        if (gen !== generation) return;
        const state = pages.find((p) => p.index === i);
        if (!state) continue;
        state.thumb = canvas;
        const slot = list.querySelector<HTMLElement>(`[data-page="${i}"] .tool-item__thumb`);
        if (slot) slot.replaceChildren(arrived(thumbFor(state)));
      } catch (err) {
        // A page that fails to render keeps its placeholder; it can still be moved and saved.
        console.warn(err);
      }
    }
  }

  /** A thumbnail that has just been drawn replaces its "Loading preview" text with an entry (re-renders never replay it). */
  function arrived(thumb: HTMLElement): HTMLElement {
    markEnter(thumb);
    return thumb;
  }

  /** A canvas showing the thumbnail with the user's extra rotation applied. */
  function thumbFor(p: PageState): HTMLElement {
    const label = t("organize.thumbAlt", { page: p.index + 1 });
    if (!p.thumb) return h("span", { className: "tool-note", text: t("organize.thumbLoading") });
    const angle = normaliseAngle(p.rotate);
    const src = p.thumb;
    const swap = angle === 90 || angle === 270;
    const c = h("canvas", { role: "img", "aria-label": label });
    c.width = swap ? src.height : src.width;
    c.height = swap ? src.width : src.height;
    const g = c.getContext("2d");
    if (g) {
      g.translate(c.width / 2, c.height / 2);
      g.rotate((angle * Math.PI) / 180);
      g.drawImage(src, -src.width / 2, -src.height / 2);
    }
    return c;
  }

  function render() {
    list.replaceChildren(
      ...pages.map((p, i) => {
        const n = p.index + 1;
        const mk = (label: string, aria: string, onClick: () => void, disabled = false, data?: string) => {
          const b = button(label, { ariaLabel: aria, onClick });
          setDisabled(b, disabled || busy);
          if (data) b.dataset.act = data;
          return b;
        };
        const angle = normaliseAngle(p.rotate);
        return h(
          "li",
          {
            className: "tool-item",
            draggable: busy ? "false" : "true",
            "data-index": i,
            "data-page": p.index,
            "data-state": "pending",
          },
          h("div", { className: "tool-item__thumb" }, thumbFor(p)),
          h("span", { className: "tool-item__name", text: t("organize.pageName", { page: n }) }),
          h("span", {
            className: "tool-item__meta",
            text: angle ? t("organize.rotated", { degrees: angle }) : t("organize.position", { position: i + 1 }),
          }),
          h(
            "span",
            { className: "tool-actions" },
            mk(t("organize.moveEarlier"), t("organize.moveEarlierLabel", { page: n }), () => move(i, i - 1), i === 0, "earlier"),
            mk(t("organize.moveLater"), t("organize.moveLaterLabel", { page: n }), () => move(i, i + 1), i === pages.length - 1, "later"),
            mk(t("organize.rotateLeft"), t("organize.rotateLeftLabel", { page: n }), () => rotate(i, -90), false, "left"),
            mk(t("organize.rotateRight"), t("organize.rotateRightLabel", { page: n }), () => rotate(i, 90), false, "right"),
            mk(t("organize.delete"), t("organize.deleteLabel", { page: n }), () => remove(i), pages.length <= 1, "delete"),
          ),
        );
      }),
    );
    list.hidden = pages.length === 0;
    saveBtn.disabled = busy || pages.length === 0;
    // While a saved PDF is offered (any edit hides it again), its Download is the one primary button.
    saveBtn.classList.toggle("btn--primary", resultBox.hidden === true);
    undoBtn.disabled = busy || !doc || !changed();
    resetBtn.disabled = busy;
  }

  function changed(): boolean {
    if (!doc || pages.length !== doc.getPageCount()) return true;
    return pages.some((p, i) => p.index !== i || normaliseAngle(p.rotate) !== 0);
  }

  function focusAct(pageIndex: number, act: string, fallback?: string) {
    const item = list.querySelector<HTMLElement>(`[data-page="${pageIndex}"]`);
    const btn =
      item?.querySelector<HTMLButtonElement>(`[data-act="${act}"]:not(:disabled)`) ??
      (fallback ? item?.querySelector<HTMLButtonElement>(`[data-act="${fallback}"]:not(:disabled)`) : null);
    btn?.focus();
  }

  function edited() {
    resultBox.hidden = true;
    resultBox.replaceChildren();
    render();
  }

  function move(from: number, to: number, keyboard = true) {
    if (to < 0 || to >= pages.length || busy) return;
    const p = pages[from]!;
    pages = moveItem(pages, from, to);
    edited();
    status.set(t("organize.moved", { page: p.index + 1, position: to + 1, total: pages.length }));
    if (keyboard) focusAct(p.index, to < from ? "earlier" : "later", to < from ? "later" : "earlier");
  }

  function rotate(i: number, delta: number) {
    const p = pages[i]!;
    p.rotate = normaliseAngle(p.rotate + delta);
    edited();
    status.set(t("organize.rotatedStatus", { page: p.index + 1, degrees: p.rotate }));
    focusAct(p.index, delta < 0 ? "left" : "right");
  }

  function remove(i: number) {
    if (pages.length <= 1) return;
    const [p] = pages.splice(i, 1);
    edited();
    status.set(tPlural(ctx, "organize.deleted", pages.length, { page: p!.index + 1, remaining: pages.length }));
    const next = pages[Math.min(i, pages.length - 1)];
    if (next) focusAct(next.index, "delete", "right");
  }

  function undoAll() {
    if (!doc) return;
    const thumbs = new Map(pages.map((p) => [p.index, p.thumb]));
    // Deleted pages lost their thumbnail; missing ones are re-rendered below.
    pages = doc.getPageIndices().map((index) => ({ index, rotate: 0, thumb: thumbs.get(index) ?? null }));
    edited();
    status.set(t("organize.undone"));
    if (viewer && pages.some((p) => !p.thumb)) void rerenderMissing(generation);
    saveBtn.focus();
  }

  async function rerenderMissing(gen: number) {
    const { renderThumbnail } = await import("../pdf-shared/pdfjs");
    for (const p of pages) {
      if (p.thumb || gen !== generation || !viewer) continue;
      try {
        const page = await viewer.getPage(p.index + 1);
        p.thumb = await renderThumbnail(page, THUMB_CSS_PX);
        const slot = list.querySelector<HTMLElement>(`[data-page="${p.index}"] .tool-item__thumb`);
        if (slot) slot.replaceChildren(arrived(thumbFor(p)));
      } catch (err) {
        console.warn(err);
      }
    }
  }

  async function save() {
    if (!doc || !file || pages.length === 0) return;
    busy = true;
    render();
    errors.clear();
    status.set(t("organize.working"));
    try {
      const { rearrangePages } = await ops();
      const bytes = await rearrangePages(
        doc,
        pages.map((p) => ({ index: p.index, rotate: p.rotate })),
      );
      const blob = pdfBlob(bytes);
      const name = t("organize.outputName", { name: baseName(file.name) });
      const dl = button(tPlural(ctx, "organize.download", pages.length, { pages: pages.length, size: formatBytes(blob.size) }), {
        variant: "primary",
        onClick: () => downloadBlob(blob, name),
      });
      resultBox.replaceChildren(dl);
      resultBox.hidden = false;
      status.set(tPlural(ctx, "organize.done", pages.length, { pages: pages.length }));
      busy = false;
      render();
      dl.focus();
    } catch (err) {
      errors.show(errorMessage(err, ctx, file.name));
      status.set("");
      busy = false;
      render();
    }
  }

  function reset() {
    generation++;
    void viewer?.loadingTask.destroy();
    viewer = null;
    doc = null;
    file = null;
    pages = [];
    fileInfo.textContent = "";
    hint.hidden = true;
    actions.hidden = true;
    resultBox.hidden = true;
    resultBox.replaceChildren();
    errors.clear();
    status.set("");
    render();
  }

  return () => reset();
}
