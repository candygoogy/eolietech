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
  /**
   * Thumbnails, keyed by source page index: each page is drawn by PDF.js once, when its slot first
   * comes near the viewport, and kept (also across delete and Undo all). `turned` holds the copy
   * shown with the user's extra rotation, redrawn only when that page's angle changes.
   */
  const thumbs = new Map<number, HTMLCanvasElement>();
  const turned = new Map<number, { angle: number; el: HTMLCanvasElement }>();
  const queue: number[] = [];
  let pumping = false;
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(onVisible, { rootMargin: "400px 0px" })
      : null;

  const errors = errorRegion();
  const status = statusRegion();
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: false,
    ctx,
    onFiles: ({ ok, rejected }) => {
      // A new file while saving would mix up the two documents: ignore it until the save is done.
      if (busy) return;
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
      pages = loaded.getPageIndices().map((index) => ({ index, rotate: 0 }));
      fileInfo.textContent = tPlural(ctx, "organize.fileInfo", pages.length, { name: f.name, pages: pages.length, size: formatBytes(f.size) });
      hint.hidden = false;
      actions.hidden = false;
      render();
      status.set(tPlural(ctx, "organize.ready", pages.length, { pages: pages.length }));
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, f.name));
      status.set("");
    }
  }

  /** Slots that came near the viewport join the queue (in the order they appear). */
  function onVisible(seen: IntersectionObserverEntry[]) {
    for (const entry of seen) {
      if (!entry.isIntersecting) continue;
      observer?.unobserve(entry.target);
      want(Number((entry.target as HTMLElement).dataset.thumb));
    }
    void pump();
  }

  function want(index: number) {
    if (!thumbs.has(index) && !queue.includes(index)) queue.push(index);
  }

  /** Draw queued thumbnails one at a time and patch each into the list as it arrives. */
  async function pump() {
    if (pumping) return;
    pumping = true;
    const gen = generation;
    try {
      const { renderThumbnail } = await import("../pdf-shared/pdfjs");
      while (queue.length > 0 && gen === generation && viewer) {
        const i = queue.shift()!;
        if (thumbs.has(i)) continue;
        try {
          const page = await viewer.getPage(i + 1);
          const canvas = await renderThumbnail(page, THUMB_CSS_PX);
          page.cleanup();
          if (gen !== generation) return;
          thumbs.set(i, canvas);
          const state = pages.find((p) => p.index === i);
          const slot = list.querySelector<HTMLElement>(`[data-page="${i}"] .tool-item__thumb`);
          if (state && slot) slot.replaceChildren(arrived(thumbFor(state)));
        } catch (err) {
          // A page that fails to render keeps its placeholder; it can still be moved and saved.
          console.warn(err);
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      pumping = false;
      // A new file arrived while the old one was drawing: start on its queue.
      if (gen !== generation && queue.length > 0 && viewer) void pump();
    }
  }

  /** A thumbnail that has just been drawn replaces its "Loading preview" text with an entry (re-renders never replay it). */
  function arrived(thumb: HTMLElement): HTMLElement {
    markEnter(thumb);
    return thumb;
  }

  /** A canvas showing the thumbnail with the user's extra rotation applied (cached per angle). */
  function thumbFor(p: PageState): HTMLElement {
    const label = t("organize.thumbAlt", { page: p.index + 1 });
    const src = thumbs.get(p.index);
    if (!src) return h("span", { className: "tool-note", text: t("organize.thumbLoading") });
    const angle = normaliseAngle(p.rotate);
    const cached = turned.get(p.index);
    if (cached?.angle === angle) return cached.el;
    if (cached) cached.el.width = cached.el.height = 0;
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
    turned.set(p.index, { angle, el: c });
    return c;
  }

  function render() {
    // The list is rebuilt: watch only the new slots of pages not drawn yet.
    observer?.disconnect();
    const slots: HTMLElement[] = [];
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
        const slot = h("div", { className: "tool-item__thumb", "data-thumb": p.index }, thumbFor(p));
        if (!thumbs.has(p.index)) slots.push(slot);
        return h(
          "li",
          {
            className: "tool-item",
            draggable: busy ? "false" : "true",
            "data-index": i,
            "data-page": p.index,
            "data-state": "pending",
          },
          slot,
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
    if (observer) for (const slot of slots) observer.observe(slot);
    else {
      // No IntersectionObserver: draw every page, in list order.
      for (const p of pages) want(p.index);
      if (slots.length) void pump();
    }
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
    // Thumbnails are cached by source page, so deleted pages come back already drawn.
    pages = doc.getPageIndices().map((index) => ({ index, rotate: 0 }));
    edited();
    status.set(t("organize.undone"));
    saveBtn.focus();
  }

  async function save() {
    if (!doc || !file || pages.length === 0 || busy) return;
    // Everything the save needs, taken now: a new file or Start over during the save bumps the
    // generation, and this save then drops its result instead of labelling it with the new name.
    const gen = generation;
    const src = doc;
    const f = file;
    const layout = pages.map((p) => ({ index: p.index, rotate: p.rotate }));
    busy = true;
    render();
    errors.clear();
    status.set(t("organize.working"));
    try {
      const { rearrangePages } = await ops();
      if (gen !== generation) return;
      const bytes = await rearrangePages(src, layout);
      if (gen !== generation) return;
      const blob = pdfBlob(bytes);
      const name = t("organize.outputName", { name: baseName(f.name) });
      const count = layout.length;
      const dl = button(tPlural(ctx, "organize.download", count, { pages: count, size: formatBytes(blob.size) }), {
        variant: "primary",
        onClick: () => downloadBlob(blob, name),
      });
      resultBox.replaceChildren(dl);
      resultBox.hidden = false;
      status.set(tPlural(ctx, "organize.done", count, { pages: count }));
      busy = false;
      render();
      dl.focus();
    } catch (err) {
      if (gen !== generation) return;
      errors.show(errorMessage(err, ctx, f.name));
      status.set("");
      busy = false;
      render();
    }
  }

  function reset() {
    generation++;
    busy = false;
    void viewer?.loadingTask.destroy();
    viewer = null;
    doc = null;
    file = null;
    pages = [];
    observer?.disconnect();
    queue.length = 0;
    // Free the bitmaps now rather than whenever the canvases are collected.
    for (const c of thumbs.values()) c.width = c.height = 0;
    for (const { el } of turned.values()) el.width = el.height = 0;
    thumbs.clear();
    turned.clear();
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
