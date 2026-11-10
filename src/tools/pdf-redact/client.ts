/**
 * Redact PDF: open one PDF, mark what has to go with black boxes (drawn by hand, or placed by a
 * search over the PDF's text), then save a new PDF where every page with a box is a picture of
 * the page with the boxes painted in, so the covered text is gone, not hidden. Pages without boxes
 * are copied as they are. PDF.js draws and reads the pages, pdf-lib writes the file (build.ts).
 * Nothing leaves the browser.
 *
 * Checks around the work: a PDF that pdf-lib could not rewrite (locked against changes) is turned
 * away when it is opened, not at the last step; the build chunk is fetched as soon as a file is
 * open, so a deploy in the meantime cannot strand a marked-up document; the new file is reopened
 * and its pages counted before it is offered; and leaving the page with boxes not yet saved asks first.
 */
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import {
  HANDLES,
  REDACT_DPI,
  boxFromDrag,
  boxPercent,
  defaultBox,
  isArrowKey,
  moveBox,
  nudgeBox,
  coveredBy,
  outputPageSize,
  renderSize,
  resizeBox,
  toPixels,
  type Box,
  type Handle,
  type TextPiece,
} from "./geometry";
import {
  PATTERNS,
  findPattern,
  findQuery,
  joinText,
  noteBoxes,
  rangeBoxes,
  readNotes,
  type AnnotationData,
  type Note,
  type PageText,
  type PatternId,
  type Range,
} from "./match";
import type { RedactedPage } from "./build";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./redact.css?url";

const ACCEPT = "application/pdf,.pdf";
/** PDF.js AnnotationMode.ENABLE: draw every annotation's appearance (filled-in forms too) into the page. */
const ANNOTATIONS_ON_CANVAS = 1;
/** Preview bitmaps: at most this many pixels per page, whatever the screen. */
const PREVIEW_MAX_PIXELS = 3_000_000;
/** Above this many pages, previews far off screen are released to save memory. */
const KEEP_ALL_PREVIEWS = 24;
const JPEG_QUALITY = 0.9;
/** A drag shorter than this (CSS px) is a tap, not a box. */
const MIN_DRAG_CSS = 6;
const ANNOUNCE_MS = 700;
/** A search box this much inside an existing box is already covered. */
const SAME_BOX = 0.85;
/** The search summary names at most this many pages with things it could not read. */
const UNREAD_LISTED = 8;

let uid = 0;

class Cancelled extends Error {}
/** The PDF opens without a password but is encrypted (an owner password): pdf-lib cannot rewrite it. */
class Restricted extends Error {}
/** One of this site's code chunks did not load: gone after a deploy, or the connection is down. */
class ChunkError extends Error {}
/** The new PDF does not open, or does not have the pages of the original. */
class BadOutput extends Error {}

/** A dynamic import, with its failure told apart from a failure of the work itself. */
function chunk<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((err: unknown) => {
    console.error(err);
    throw new ChunkError();
  });
}

interface BoxState {
  id: number;
  box: Box;
  el: HTMLDivElement;
  state: HTMLSpanElement;
  remove: HTMLButtonElement;
}

interface PageState {
  /** 1-based page number. */
  n: number;
  /** Visible size in points (viewport at scale 1). */
  W: number;
  H: number;
  sized: boolean;
  boxes: BoxState[];
  /** Matches that added boxes here. */
  found: number;
  /** What search reads on this page: its text, plus filled-in form fields and text notes. */
  text: { items: TextPiece[]; page: PageText; transform: number[]; notes: Note[]; unread: number } | null;
  li: HTMLLIElement;
  frame: HTMLDivElement;
  meta: HTMLSpanElement;
  badge: HTMLSpanElement;
  /** Shown when the page has stamps, signatures or the like that search cannot read. */
  unread: HTMLParagraphElement;
  canvas: HTMLCanvasElement | null;
  visible: boolean;
  failed: boolean;
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  const id = `pdf-redact-${++uid}`;
  let file: File | null = null;
  let bytes: Uint8Array | null = null;
  let doc: PDFDocumentProxy | null = null;
  let pages: PageState[] = [];
  let result: { blob: Blob; name: string } | null = null;
  let busy = false;
  /** Bumped by a new file and Start over: previews, sizes and jobs of the old file stop. */
  let generation = 0;
  /** Bumped by Stop (and by the above): a running search or redaction checks it between pages. */
  let job = 0;
  let task: RenderTask | null = null;
  let boxSeq = 0;
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: IntersectionObserver | null = null;
  /** The result for the boxes as they are now has been downloaded. */
  let saved = false;
  /** The beforeunload warning is on: there are boxes that are not in a downloaded file. */
  let guarding = false;

  // ---------- DOM ----------
  const errors = errorRegion();
  const status = statusRegion();
  const live = h("p", { className: "visually-hidden", "aria-live": "polite" });
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: false,
    ctx,
    label: t("redact.drop.label"),
    onFiles: ({ ok, rejected }) => {
      if (rejected.length) errors.show(rejected.map((r) => r.reason));
      else errors.clear();
      if (ok[0]) void open(ok[0]);
    },
  });
  const dropLabel = drop.querySelector<HTMLElement>(".tool-drop__label");
  const fileInfo = h("p", { className: "tool-item__meta" });

  // Search: a typed word or number, or one of the personal data patterns.
  const queryInput = h("input", {
    type: "text",
    id: `${id}-query`,
    autocomplete: "off",
    spellcheck: "false",
    enterkeyhint: "search",
    "aria-describedby": `${id}-search-note`,
  });
  const searchBtn = button(t("redact.search.action"), { onClick: () => void search({ query: queryInput.value }) });
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void search({ query: queryInput.value });
    }
  });
  const quickLabelId = `${id}-quick`;
  const quickBtns = PATTERNS.map((p) => button(t(`redact.pattern.${p}`), { onClick: () => void search({ pattern: p }) }));
  const searchBox = h(
    "fieldset",
    { className: "redact-search" },
    h("legend", { text: t("redact.search.legend") }),
    h("label", { for: queryInput.id, text: t("redact.search.label") }),
    h("div", { className: "redact-search__row" }, queryInput, searchBtn),
    h("p", { className: "redact-search__quick-label", id: quickLabelId, text: t("redact.quick.label") }),
    h("div", { className: "redact-search__quick", role: "group", "aria-labelledby": quickLabelId }, ...quickBtns),
    h("p", { className: "tool-note", id: `${id}-search-note`, text: t("redact.search.note") }),
  );

  const hintId = `${id}-hint`;
  const hint = h("p", { className: "tool-note", id: hintId, text: t("redact.hint") });
  const boxHintId = `${id}-box-hint`;
  const boxHint = h("span", { id: boxHintId, hidden: true, text: t("redact.box.hint") });
  const seeThrough = h("p", { className: "tool-note", text: t("redact.seeThrough") });
  const list = h("ol", { className: "redact-pages", "aria-label": t("redact.listLabel"), hidden: true });
  const editor = h("div", { className: "redact-editor", hidden: true }, searchBox, hint, seeThrough, boxHint);

  const applyBtn = button(t("redact.action"), { variant: "primary", onClick: () => void apply() });
  const stopBtn = button(t("redact.stop"), { variant: "ghost", onClick: stop });
  stopBtn.hidden = true;
  const clearBtn = button(t("redact.clear"), { variant: "ghost", onClick: clearAll });
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions redact-actions", hidden: true }, applyBtn, stopBtn, clearBtn, resetBtn);
  const progress = h("progress", { className: "tool-progress", max: 1, value: 0, hidden: true });
  const resultBox = h("div", { className: "tool-actions", hidden: true });
  const note = h("p", { className: "tool-note redact-note", hidden: true, text: t("redact.note") });

  const tool = h(
    "div",
    { className: "tool tool--pdf-redact" },
    drop,
    errors.el,
    fileInfo,
    editor,
    // Above the pages: reaching Redact and save must not take a Tab through every page first.
    actions,
    progress,
    status.el,
    resultBox,
    note,
    list,
    live,
  );
  el.append(tool);

  // ---------- errors, leaving the page ----------
  function showError(err: unknown, name: string) {
    if (err instanceof Restricted) {
      // The sentence ends in a link to the tool that removes the lock.
      const link = h("a", { href: t("redact.error.unlockHref"), text: t("redact.error.unlockLink") });
      errors.el.replaceChildren(h("p", {}, t("redact.error.restricted", { name }), " ", link, "."));
      errors.el.hidden = false;
    } else if (err instanceof ChunkError) {
      // Offline, a reload would lose the page itself: only say "reload" when the connection is there.
      errors.show(t(navigator.onLine === false ? "redact.error.offline" : "redact.error.updated"));
    } else if (err instanceof BadOutput) {
      errors.show(t("redact.error.output"));
    } else {
      errors.show(errorMessage(err, ctx, name));
    }
  }

  const warnUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    // Older Chrome and Safari only ask when this is set.
    e.returnValue = true;
  };

  /** Ask before leaving while there are boxes that are not in a downloaded file; stop asking once there are none. */
  function syncGuard() {
    const unsaved = !saved && pages.some((p) => p.boxes.length > 0);
    if (unsaved === guarding) return;
    guarding = unsaved;
    if (unsaved) window.addEventListener("beforeunload", warnUnload);
    else window.removeEventListener("beforeunload", warnUnload);
  }

  // ---------- open ----------
  async function open(f: File) {
    startOver(false);
    const gen = generation;
    status.set(t("redact.reading", { name: f.name }));
    try {
      const data = await readFile(f);
      const { openForRender } = await chunk(() => import("../pdf-shared/pdfjs"));
      // PDF.js takes the buffer it is given; keep the original for building the result.
      const proxy = await openForRender(data.slice());
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      if (proxy.numPages === 0) {
        void proxy.loadingTask.destroy();
        throw new PdfToolError("empty");
      }
      // PDF.js reports permissions only for an encrypted file. This one opened without a password,
      // so it is locked against changes and nothing else; pdf-lib would refuse it at the very end.
      const permissions = await proxy.getPermissions();
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      if (permissions !== null) {
        void proxy.loadingTask.destroy();
        throw new Restricted();
      }
      const first = await proxy.getPage(1);
      const vp = first.getViewport({ scale: 1 });
      if (gen !== generation) {
        void proxy.loadingTask.destroy();
        return;
      }
      file = f;
      bytes = data;
      doc = proxy;
      pages = Array.from({ length: proxy.numPages }, (_, i) => makePage(i + 1, vp.width, vp.height));
      pages[0]!.sized = true;
      list.replaceChildren(...pages.map((p) => p.li));
      fileInfo.textContent = tPlural(ctx, "redact.fileInfo", pages.length, { name: f.name, pages: pages.length, size: formatBytes(f.size) });
      tool.dataset.loaded = "";
      if (dropLabel) dropLabel.textContent = t("redact.drop.replace");
      editor.hidden = false;
      actions.hidden = false;
      note.hidden = false;
      list.hidden = false;
      syncActions();
      status.set(tPlural(ctx, "redact.ready", pages.length, { pages: pages.length }));
      observe();
      void loadSizes(gen);
      preload(gen);
    } catch (err) {
      if (gen !== generation) return;
      showError(err, f.name);
      status.set("");
    }
  }

  /**
   * Fetch the chunk that writes the new PDF (build.ts and pdf-lib) now. Once loaded it stays in
   * memory, so a deploy while the boxes are being drawn cannot take it away; and if it is already
   * gone, the user hears it before marking anything.
   */
  function preload(gen: number) {
    import("./build").catch((err: unknown) => {
      console.error(err);
      if (gen === generation) showError(new ChunkError(), "");
    });
  }

  function makePage(n: number, W: number, H: number): PageState {
    const meta = h("span", { className: "redact-page__meta" });
    const badge = h("span", { className: "redact-page__found", hidden: true });
    const unread = h("p", { className: "tool-note redact-page__unread", hidden: true, text: t("redact.page.unread") });
    const frame = h("div", { className: "redact-frame", "data-page": n });
    const p: PageState = {
      n,
      W,
      H,
      sized: false,
      boxes: [],
      found: 0,
      text: null,
      li: h("li", { className: "redact-page" }),
      frame,
      meta,
      badge,
      unread,
      canvas: null,
      visible: false,
      failed: false,
    };
    const add = button(t("redact.page.add"), { ariaLabel: t("redact.page.addLabel", { page: n }), onClick: () => addBox(p) });
    add.dataset.act = "add";
    p.li.append(
      h(
        "div",
        { className: "redact-page__head" },
        h("span", { className: "redact-page__name", text: t("redact.page.name", { page: n }) }),
        meta,
        badge,
        add,
      ),
      unread,
      h("div", { className: "redact-stage" }, frame),
    );
    frame.append(h("span", { className: "redact-frame__loading", text: t("redact.page.loading", { page: n }) }));
    sizeFrame(p);
    syncMeta(p);
    wireFrame(p);
    return p;
  }

  function sizeFrame(p: PageState) {
    p.frame.style.setProperty("--redact-ratio", `${p.W} / ${p.H}`);
    p.frame.style.setProperty("--redact-r", String(p.W / p.H));
    for (const b of p.boxes) placeBox(p, b);
  }

  /** Real sizes for every page, in the background, so placeholders have the right shape before they scroll in. */
  async function loadSizes(gen: number) {
    for (const p of pages) {
      if (gen !== generation || !doc) return;
      if (p.sized) continue;
      try {
        const page = await doc.getPage(p.n);
        setSize(p, page);
      } catch (err) {
        console.warn(err);
      }
    }
  }

  function setSize(p: PageState, page: PDFPageProxy) {
    if (p.sized) return;
    const vp = page.getViewport({ scale: 1 });
    p.sized = true;
    if (vp.width !== p.W || vp.height !== p.H) {
      p.W = vp.width;
      p.H = vp.height;
      sizeFrame(p);
    }
  }

  // ---------- previews ----------
  function observe() {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const p = pages[Number((entry.target as HTMLElement).dataset.page) - 1];
          if (!p) continue;
          p.visible = entry.isIntersecting;
          if (!p.visible && p.canvas && pages.length > KEEP_ALL_PREVIEWS) releasePreview(p);
        }
        void pump(generation);
      },
      { rootMargin: "1200px 0px" },
    );
    for (const p of pages) observer.observe(p.frame);
  }

  let pumping = false;
  async function pump(gen: number) {
    if (pumping) return;
    pumping = true;
    try {
      while (gen === generation && doc) {
        const p = pages.find((q) => q.visible && !q.canvas && !q.failed);
        if (!p) break;
        await renderPreview(p, gen);
      }
    } finally {
      pumping = false;
    }
    // Pages that scrolled in while the last one was drawing.
    if (gen === generation && pages.some((q) => q.visible && !q.canvas && !q.failed)) void pump(gen);
  }

  async function renderPreview(p: PageState, gen: number) {
    try {
      const page = await doc!.getPage(p.n);
      setSize(p, page);
      const cssW = p.frame.getBoundingClientRect().width || 600;
      let scale = (cssW * Math.min(globalThis.devicePixelRatio || 1, 2)) / p.W;
      scale = Math.min(scale, Math.sqrt(PREVIEW_MAX_PIXELS / (p.W * p.H)));
      const viewport = page.getViewport({ scale });
      const canvas = h("canvas", { className: "redact-canvas", role: "img", "aria-label": t("redact.page.alt", { page: p.n }) });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvas, viewport, annotationMode: ANNOTATIONS_ON_CANVAS }).promise;
      if (gen !== generation) return;
      p.frame.querySelector(".redact-frame__loading")?.remove();
      p.frame.prepend(canvas);
      p.canvas = canvas;
      markEnter(canvas);
    } catch (err) {
      if (gen !== generation) return;
      console.warn(err);
      p.failed = true;
    }
  }

  function releasePreview(p: PageState) {
    if (!p.canvas) return;
    p.canvas.width = p.canvas.height = 0;
    p.canvas.remove();
    p.canvas = null;
    if (!p.frame.querySelector(".redact-frame__loading")) {
      p.frame.prepend(h("span", { className: "redact-frame__loading", text: t("redact.page.loading", { page: p.n }) }));
    }
  }

  // ---------- boxes ----------
  function makeBox(p: PageState, box: Box): BoxState {
    const stateEl = h("span", { id: `${id}-box-${++boxSeq}`, hidden: true });
    const remove = h("button", { type: "button", className: "redact-box__remove", text: "×" });
    const elBox = h(
      "div",
      {
        className: "redact-box",
        tabindex: 0,
        role: "application",
        "aria-describedby": `${stateEl.id} ${boxHintId}`,
      },
      ...HANDLES.map((handle) => h("span", { className: "redact-handle", "data-handle": handle, "aria-hidden": "true" })),
      stateEl,
      remove,
    );
    const bs: BoxState = { id: boxSeq, box, el: elBox, state: stateEl, remove };
    elBox.dataset.box = String(bs.id);
    remove.addEventListener("click", () => removeBox(p, bs, true));
    p.boxes.push(bs);
    p.frame.append(elBox);
    placeBox(p, bs);
    return bs;
  }

  function placeBox(p: PageState, bs: BoxState) {
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    bs.el.style.left = pct(bs.box.x, p.W);
    bs.el.style.top = pct(bs.box.y, p.H);
    bs.el.style.width = pct(bs.box.w, p.W);
    bs.el.style.height = pct(bs.box.h, p.H);
    bs.state.textContent = t("redact.box.state", boxPercent(bs.box, p.W, p.H));
  }

  /** Box numbers follow their order on the page; refresh the names after an add or a removal. */
  function labelBoxes(p: PageState) {
    p.boxes.forEach((bs, i) => {
      bs.el.setAttribute("aria-label", t("redact.box.label", { box: i + 1, page: p.n }));
      bs.remove.setAttribute("aria-label", t("redact.box.remove", { box: i + 1, page: p.n }));
    });
    syncMeta(p);
  }

  function syncMeta(p: PageState) {
    p.meta.textContent = p.boxes.length ? tPlural(ctx, "redact.page.boxes", p.boxes.length) : t("redact.page.noBoxes");
    p.badge.hidden = p.found === 0;
    p.badge.textContent = p.found ? tPlural(ctx, "redact.page.found", p.found) : "";
    p.li.toggleAttribute("data-has-boxes", p.boxes.length > 0);
  }

  const boxNumber = (p: PageState, bs: BoxState) => p.boxes.indexOf(bs) + 1;

  function describe(p: PageState, bs: BoxState): string {
    return t("redact.announce.box", { box: boxNumber(p, bs), page: p.n, state: t("redact.box.state", boxPercent(bs.box, p.W, p.H)) });
  }

  function announce(msg: string) {
    clearTimeout(announceTimer);
    live.textContent = msg;
  }

  function announceSoon(p: PageState, bs: BoxState) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => announce(describe(p, bs)), ANNOUNCE_MS);
  }

  function select(bs: BoxState | null) {
    for (const node of list.querySelectorAll<HTMLElement>(".redact-box[data-selected]")) delete node.dataset.selected;
    if (bs) bs.el.dataset.selected = "";
  }

  function addBox(p: PageState) {
    if (busy) return;
    const bs = makeBox(p, defaultBox(p.W, p.H));
    labelBoxes(p);
    changed();
    select(bs);
    bs.el.focus();
    announce(t("redact.announce.added", { box: boxNumber(p, bs), page: p.n }));
  }

  function removeBox(p: PageState, bs: BoxState, keyboard: boolean) {
    if (busy) return;
    const i = p.boxes.indexOf(bs);
    if (i < 0) return;
    p.boxes.splice(i, 1);
    bs.el.remove();
    labelBoxes(p);
    changed();
    announce(t("redact.announce.removed", { page: p.n }));
    if (keyboard) {
      const next = p.boxes[Math.min(i, p.boxes.length - 1)];
      if (next) next.el.focus();
      else p.li.querySelector<HTMLButtonElement>('[data-act="add"]')?.focus();
    }
  }

  function clearAll() {
    if (busy) return;
    const count = pages.reduce((n, p) => n + p.boxes.length, 0);
    for (const p of pages) {
      for (const bs of p.boxes) bs.el.remove();
      p.boxes = [];
      p.found = 0;
      syncMeta(p);
    }
    changed();
    status.set(tPlural(ctx, "redact.cleared", count));
  }

  function wireFrame(p: PageState) {
    const frame = p.frame;
    type Drag =
      | { kind: "draw"; pointerId: number; x0: number; y0: number; cx: number; cy: number; bs: BoxState | null }
      | { kind: "edit"; pointerId: number; bs: BoxState; handle: Handle | null; start: Box; sx: number; sy: number; moved: boolean };
    let drag: Drag | null = null;

    const toPage = (e: PointerEvent) => {
      const r = frame.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * p.W, y: ((e.clientY - r.top) / r.height) * p.H, k: p.W / r.width };
    };

    frame.addEventListener("pointerdown", (e) => {
      if (drag || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
      const target = e.target as HTMLElement;
      if (target.closest(".redact-box__remove")) return;
      const boxEl = target.closest<HTMLElement>(".redact-box");
      if (boxEl) {
        const bs = p.boxes.find((b) => b.el === boxEl);
        if (!bs) return;
        const handle = (target.closest<HTMLElement>("[data-handle]")?.dataset.handle ?? null) as Handle | null;
        drag = { kind: "edit", pointerId: e.pointerId, bs, handle, start: bs.box, sx: e.clientX, sy: e.clientY, moved: false };
        select(bs);
        bs.el.dataset.dragging = handle ?? "move";
        bs.el.focus({ preventScroll: true });
      } else {
        const { x, y } = toPage(e);
        drag = { kind: "draw", pointerId: e.pointerId, x0: x, y0: y, cx: e.clientX, cy: e.clientY, bs: null };
        select(null);
      }
      frame.setPointerCapture(e.pointerId);
      // Touch on the page itself stays free to scroll (touch-action in redact.css); boxes are dragged.
      if (drag.kind === "edit" || e.pointerType === "mouse") e.preventDefault();
    });

    frame.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const { x, y, k } = toPage(e);
      if (drag.kind === "draw") {
        if (!drag.bs && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < MIN_DRAG_CSS) return;
        const box = boxFromDrag(drag.x0, drag.y0, x, y, p.W, p.H);
        if (!drag.bs) {
          drag.bs = makeBox(p, box);
          drag.bs.el.dataset.dragging = "draw";
          labelBoxes(p);
          select(drag.bs);
        } else {
          drag.bs.box = box;
          placeBox(p, drag.bs);
        }
        changed();
        return;
      }
      const dx = (e.clientX - drag.sx) * k;
      const dy = (e.clientY - drag.sy) * k;
      drag.bs.box = drag.handle ? resizeBox(drag.start, drag.handle, dx, dy, p.W, p.H) : moveBox(drag.start, dx, dy, p.W, p.H);
      drag.moved = true;
      placeBox(p, drag.bs);
      changed();
    });

    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const d = drag;
      drag = null;
      if (d.kind === "draw") {
        if (!d.bs) return;
        delete d.bs.el.dataset.dragging;
        if (e.type === "pointercancel") {
          removeBox(p, d.bs, false);
          return;
        }
        d.bs.el.focus({ preventScroll: true });
        announce(t("redact.announce.added", { box: boxNumber(p, d.bs), page: p.n }));
        return;
      }
      delete d.bs.el.dataset.dragging;
      if (d.moved) announce(describe(p, d.bs));
    };
    frame.addEventListener("pointerup", end);
    frame.addEventListener("pointercancel", end);
    frame.addEventListener("lostpointercapture", end);

    frame.addEventListener("keydown", (e) => {
      const boxEl = (e.target as HTMLElement).closest<HTMLElement>(".redact-box");
      const bs = boxEl && e.target === boxEl ? p.boxes.find((b) => b.el === boxEl) : undefined;
      if (!bs || busy) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeBox(p, bs, true);
        return;
      }
      if (!isArrowKey(e.key) || e.ctrlKey || e.metaKey) return;
      // Also stops Alt+Left/Right from going back or forward in the history.
      e.preventDefault();
      bs.box = nudgeBox(bs.box, e.key, e.shiftKey ? 10 : 1, e.altKey, p.W, p.H);
      placeBox(p, bs);
      changed();
      announceSoon(p, bs);
    });

    frame.addEventListener("focusin", (e) => {
      const boxEl = (e.target as HTMLElement).closest<HTMLElement>(".redact-box");
      const bs = boxEl ? p.boxes.find((b) => b.el === boxEl) : undefined;
      if (bs) select(bs);
    });
  }

  // ---------- search ----------
  async function pageText(p: PageState): Promise<NonNullable<PageState["text"]>> {
    if (p.text) return p.text;
    const page = await doc!.getPage(p.n);
    setSize(p, page);
    const content = await page.getTextContent();
    // PDF.js names an equal-width font "monospace"; a match is then placed by counting letters.
    const items: TextPiece[] = content.items.flatMap((i) =>
      "str" in i ? [{ ...i, mono: content.styles[i.fontName]?.fontFamily === "monospace" }] : [],
    );
    // Form fields and notes are drawn on the page (preview and result) but are not part of its text.
    let found: ReturnType<typeof readNotes>;
    try {
      found = readNotes((await page.getAnnotations()) as AnnotationData[]);
    } catch (err) {
      console.warn(err);
      found = { notes: [], unread: 1 };
    }
    p.text = { items, page: joinText(items), transform: page.getViewport({ scale: 1 }).transform, ...found };
    p.unread.hidden = found.unread === 0;
    return p.text;
  }

  async function search(what: { query: string } | { pattern: PatternId }) {
    if (!doc || busy) return;
    errors.clear();
    if ("query" in what && !what.query.trim()) {
      errors.show(t("redact.error.emptyQuery"));
      queryInput.focus();
      return;
    }
    const gen = generation;
    const myJob = ++job;
    const cancelled = () => myJob !== job || gen !== generation;
    const focusBack = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBusy(true);
    progress.max = pages.length;
    progress.value = 0;
    const perPage: { page: number; count: number }[] = [];
    const find = (text: string): Range[] => ("query" in what ? findQuery(text, what.query) : findPattern(text, what.pattern));
    let anyText = false;
    try {
      for (const p of pages) {
        if (cancelled()) throw new Cancelled();
        status.set(t("redact.searching", { current: p.n, total: pages.length }));
        const { items, page, transform, notes } = await pageText(p);
        if (cancelled()) throw new Cancelled();
        if (!anyText && (notes.length > 0 || items.some((i) => i.str.trim()))) anyText = true;
        // One group of boxes per match: in the text one box per line it touches, in a field or note the whole of it.
        const matches = [...rangeBoxes(items, page, find(page.text), transform, p.W, p.H), ...noteBoxes(notes, find, transform, p.W, p.H)];
        if (matches.length) {
          let added = 0;
          for (const boxes of matches) {
            let fresh = false;
            for (const box of boxes) {
              if (p.boxes.some((b) => coveredBy(box, b.box) >= SAME_BOX)) continue;
              makeBox(p, box);
              fresh = true;
            }
            if (fresh) added++;
          }
          p.found += added;
          labelBoxes(p);
          perPage.push({ page: p.n, count: matches.length });
        }
        progress.value = p.n;
      }
      setBusy(false);
      focusBack?.focus();
      const total = perPage.reduce((n, x) => n + x.count, 0);
      let summary: string;
      if (total > 0) {
        changed();
        const where = perPage.map((x) => t("redact.found.page", { page: x.page, count: x.count })).join(", ");
        summary = tPlural(ctx, "redact.found", total, { pages: where });
      } else if (!anyText) {
        summary = t("redact.found.noText");
      } else {
        summary = "query" in what ? t("redact.found.noneQuery", { query: what.query.trim() }) : t(`redact.found.none.${what.pattern}`);
      }
      // Stamps, signatures and the like: say where they are, so "no matches" is not taken for "nothing there".
      const unread = pages.filter((p) => (p.text?.unread ?? 0) > 0).map((p) => p.n);
      if (unread.length) {
        const listed = unread.slice(0, UNREAD_LISTED).join(", ") + (unread.length > UNREAD_LISTED ? "…" : "");
        summary += ` ${t("redact.found.unread", { pages: listed })}`;
      }
      status.set(summary);
      if (total > 0) pages[perPage[0]!.page - 1]?.li.scrollIntoView({ block: "nearest" });
    } catch (err) {
      if (gen !== generation) return; // a new file or Start over took over
      // Boxes already placed on the pages searched so far stay (they are listed on each page), so an
      // earlier result no longer matches them.
      if (perPage.length) changed();
      setBusy(false);
      focusBack?.focus();
      if (err instanceof Cancelled || cancelled()) {
        status.set(t("redact.searchStopped"));
        return;
      }
      showError(err, file?.name ?? "");
      status.set("");
    }
  }

  // ---------- apply ----------
  async function apply() {
    if (!doc || !bytes || !file || busy) return;
    errors.clear();
    const marked = pages.filter((p) => p.boxes.length > 0);
    if (marked.length === 0) {
      errors.show(t("redact.error.noBoxes"));
      return;
    }
    const gen = generation;
    const myJob = ++job;
    const cancelled = () => myJob !== job || gen !== generation;
    const f = file;
    const source = bytes;
    const pdf = doc;
    setBusy(true);
    progress.max = marked.length + 1;
    progress.value = 0;
    stopBtn.focus();
    try {
      const redacted: RedactedPage[] = [];
      for (const [i, p] of marked.entries()) {
        if (cancelled()) throw new Cancelled();
        status.set(t("redact.working", { current: i + 1, total: marked.length }));
        redacted.push(await redactPage(pdf, p, cancelled));
        progress.value = i + 1;
      }
      status.set(t("redact.saving"));
      const { buildRedactedPdf } = await chunk(() => import("./build"));
      const out = await buildRedactedPdf(source, redacted);
      if (cancelled()) throw new Cancelled();
      // Offer the file only if it opens and has every page of the original.
      if ((await countPages(out)) !== pdf.numPages) throw new BadOutput();
      if (cancelled()) throw new Cancelled();
      progress.value = marked.length + 1;
      result = { blob: pdfBlob(out), name: t("redact.outputName", { name: baseName(f.name) }) };
      setBusy(false);
      showResult(marked.length);
    } catch (err) {
      if (gen !== generation || file !== f) return; // a new file or Start over took over
      setBusy(false);
      if (err instanceof Cancelled || cancelled()) {
        status.set(t("redact.stopped"));
        applyBtn.focus();
        return;
      }
      showError(err, f.name);
      status.set("");
      applyBtn.focus();
    }
  }

  /** Page count of a PDF as a reader sees it (PDF.js, not the library that wrote it); -1 when it does not open. */
  async function countPages(pdfBytes: Uint8Array): Promise<number> {
    const { openForRender } = await chunk(() => import("../pdf-shared/pdfjs"));
    try {
      const opened = await openForRender(pdfBytes.slice());
      const count = opened.numPages;
      void opened.loadingTask.destroy();
      return count;
    } catch (err) {
      console.error(err);
      return -1;
    }
  }

  /** Draw the page at REDACT_DPI, paint its boxes solid black, and encode it as JPEG. */
  async function redactPage(pdf: PDFDocumentProxy, p: PageState, cancelled: () => boolean): Promise<RedactedPage> {
    const page = await pdf.getPage(p.n);
    const canvas = document.createElement("canvas");
    try {
      const vp1 = page.getViewport({ scale: 1 });
      const size = renderSize(vp1.width, vp1.height, REDACT_DPI);
      const viewport = page.getViewport({ scale: size.scale });
      canvas.width = size.width;
      canvas.height = size.height;
      task = page.render({ canvas, viewport, annotationMode: ANNOTATIONS_ON_CANVAS });
      try {
        await task.promise;
      } catch (err) {
        if (cancelled()) throw new Cancelled();
        throw err;
      } finally {
        task = null;
      }
      if (cancelled()) throw new Cancelled();
      const g = canvas.getContext("2d");
      if (!g) throw new Error("no 2d context");
      g.fillStyle = "#000";
      for (const { box } of p.boxes) {
        const r = toPixels(box, size.scale, canvas.width, canvas.height);
        g.fillRect(r.x, r.y, r.w, r.h);
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
      if (!blob) throw new Error(`canvas.toBlob failed for page ${p.n}`);
      const out = outputPageSize(vp1.width, vp1.height);
      return { index: p.n - 1, jpeg: new Uint8Array(await blob.arrayBuffer()), width: out.width, height: out.height };
    } finally {
      page.cleanup();
      canvas.width = canvas.height = 0;
    }
  }

  function showResult(count: number) {
    if (!result) return;
    const { blob, name } = result;
    const dl = button(t("redact.download", { name }), {
      variant: "primary",
      onClick: () => {
        downloadBlob(blob, name);
        // The boxes are in a file the user has: leaving no longer loses them.
        saved = true;
        syncGuard();
      },
    });
    resultBox.replaceChildren(dl);
    resultBox.hidden = false;
    markEnter(dl);
    applyBtn.classList.remove("btn--primary");
    status.set(tPlural(ctx, "redact.done", count, { size: formatBytes(blob.size) }));
    dl.focus();
  }

  /** Boxes changed: a saved result no longer matches them. */
  function changed() {
    saved = false;
    if (result) {
      result = null;
      resultBox.hidden = true;
      resultBox.replaceChildren();
      applyBtn.classList.add("btn--primary");
      status.set("");
    }
    syncActions();
  }

  function syncActions() {
    const any = pages.some((p) => p.boxes.length > 0);
    clearBtn.disabled = busy || !any;
    syncGuard();
  }

  function setBusy(on: boolean) {
    busy = on;
    progress.hidden = !on;
    stopBtn.hidden = !on;
    for (const b of [applyBtn, resetBtn, searchBtn, ...quickBtns]) b.disabled = on;
    queryInput.disabled = on;
    list.toggleAttribute("inert", on);
    syncActions();
  }

  function stop() {
    job++;
    task?.cancel();
    task = null;
  }

  function startOver(focus = true) {
    generation++;
    job++;
    task?.cancel();
    task = null;
    observer?.disconnect();
    observer = null;
    clearTimeout(announceTimer);
    for (const p of pages) releasePreview(p);
    if (doc) void doc.loadingTask.destroy();
    doc = null;
    bytes = null;
    file = null;
    pages = [];
    result = null;
    saved = false;
    list.replaceChildren();
    list.hidden = true;
    editor.hidden = true;
    actions.hidden = true;
    note.hidden = true;
    resultBox.hidden = true;
    resultBox.replaceChildren();
    applyBtn.classList.add("btn--primary");
    fileInfo.textContent = "";
    queryInput.value = "";
    delete tool.dataset.loaded;
    if (dropLabel) dropLabel.textContent = t("redact.drop.label");
    setBusy(false);
    errors.clear();
    status.set("");
    live.textContent = "";
    if (focus) drop.querySelector("input")?.focus();
  }

  return () => {
    startOver(false);
    tool.remove();
  };
}
