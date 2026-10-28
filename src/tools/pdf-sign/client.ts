/**
 * Sign PDF: draw a signature (or upload a photo of one), place it and an optional date on any pages,
 * and save a copy of the PDF with those images added (pdf-lib, ./writer.ts). Pages are drawn by PDF.js
 * one at a time, on demand. The signature lives only in this page's memory: never stored, never sent.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDropzone, downloadBlob, formatBytes, markEnter } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import type { ToolCtx } from "../types";
import { baseName, button, errorMessage, errorRegion, h, pdfBlob, readFile, statusRegion } from "../pdf-shared/dom";
import { PdfToolError } from "../pdf-shared/pdf-errors";
import type { Size, ViewRect } from "../pdf-shared/page-box";
import { CORNERS, isArrowKey, moveRect, nudge, placeAt, refit, resizeFromCorner, toMm, type Corner } from "./geometry";
import { extractSignature, strengthToThreshold, suggestThreshold, thresholdToStrength, trimToInk, type Rgba } from "./ink";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./sign.css?url";

const ACCEPT = "application/pdf,.pdf";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const IMAGE_MAX_BYTES = 40 * 1024 * 1024;
/** Uploaded photos are scaled to this longest side before the paper is removed. */
const SCAN_MAX = 1600;
/** The width a drawing is exported at (px); the height follows the pad's shape (set in sign.css). */
const EXPORT_W = 1500;
const INKS = { black: "#161616", blue: "#1b3a8c" } as const;
type Ink = keyof typeof INKS;
/** Default sizes in points: a signature about 5 cm wide, date text about 4 mm tall. */
const SIG_WIDTH = 150;
const DATE_HEIGHT = 12;
/** Smallest width a pointer drag may leave, in CSS px. */
const MIN_BOX_CSS = 24;
const ANNOUNCE_MS = 700;
const PAGE_CACHE = 6;

type Kind = "sig" | "date";
type Mode = "draw" | "upload";

interface Stamp {
  png: Uint8Array;
  url: string;
  /** Width / height. */
  aspect: number;
}

interface Item {
  id: number;
  kind: Kind;
  /** 0-based page index. */
  page: number;
  rect: ViewRect;
}

interface Point {
  x: number;
  y: number;
  /** Line width factor. */
  w: number;
  t: number;
}

let uid = 0;

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t, locale } = ctx;
  const id = `pdf-sign-${++uid}`;
  const writer = () => import("./writer");

  let file: File | null = null;
  let bytes: Uint8Array | null = null;
  /** The pdf-lib document parsed when the file was opened, used by the first save. */
  let pristine: PDFDocument | null = null;
  let viewer: PDFDocumentProxy | null = null;
  let views: Size[] = [];
  let current = 0;
  let items: Item[] = [];
  let nextItem = 0;
  let armed: Kind = "sig";
  let mode: Mode = "draw";
  let ink: Ink = "black";
  let busy = false;
  let generation = 0;
  let result: { blob: Blob; name: string } | null = null;
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  const urls = new Set<string>();
  const stamps: Partial<Record<Kind, Stamp>> = {};
  let drawn: Stamp | null = null;
  let uploaded: Stamp | null = null;

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
    const row = h("div", { className: "sign-seg__options" });
    for (const [v, label] of choices) {
      const input = h("input", { type: "radio", name: `${id}-${name}`, value: v, className: "visually-hidden", checked: v === value });
      input.addEventListener("change", () => input.checked && onChange(v));
      inputs.set(v, input);
      row.append(h("label", { className: "sign-seg__option" }, input, h("span", { text: label })));
    }
    const box = h("fieldset", { className: "sign-seg" }, h("legend", { text: legend }), row);
    return { box, inputs };
  }

  // ---------- step 1: the signature ----------
  const modeSeg = segmented<Mode>(
    "mode",
    t("sign.mode.legend"),
    [
      ["draw", t("sign.mode.draw")],
      ["upload", t("sign.mode.upload")],
    ],
    mode,
    (m) => setMode(m),
  );

  // Draw
  const pad = h("canvas", { className: "sign-pad__canvas", "aria-hidden": "true" });
  const padHint = h("span", { className: "sign-pad__hint", "aria-hidden": "true", text: t("sign.pad.placeholder") });
  const padWrap = h("div", { className: "sign-pad", "data-empty": "" }, pad, padHint);
  const inkSeg = segmented<Ink>(
    "ink",
    t("sign.ink.legend"),
    [
      ["black", t("sign.ink.black")],
      ["blue", t("sign.ink.blue")],
    ],
    ink,
    (v) => {
      ink = v;
      paintPad();
      void commitDrawing();
      if (stamps.date) void makeDate();
    },
  );
  const undoBtn = button(t("sign.pad.undo"), { variant: "ghost", onClick: undoStroke });
  const clearBtn = button(t("sign.pad.clear"), { variant: "ghost", onClick: clearPad });
  const padNote = h("p", { className: "tool-note", id: `${id}-pad-note`, text: t("sign.pad.note") });
  const drawPanel = h(
    "div",
    { className: "sign-mode" },
    h("p", { className: "visually-hidden", text: t("sign.pad.a11y") }),
    padWrap,
    h("div", { className: "sign-pad__tools" }, inkSeg.box, h("div", { className: "tool-actions" }, undoBtn, clearBtn)),
    padNote,
  );

  // Upload
  const photoInput = h("input", { type: "file", accept: IMAGE_ACCEPT, className: "visually-hidden", id: `${id}-photo` });
  const photoPick = h(
    "label",
    { className: "btn sign-photo__pick", for: `${id}-photo` },
    h("span", { text: t("sign.photo.choose") }),
  );
  const photoNote = h("p", { className: "tool-note", text: t("sign.photo.note") });
  const strength = h("input", { type: "range", id: `${id}-strength`, min: 0, max: 100, step: 1, value: 50 });
  const strengthOut = h("output", { for: `${id}-strength`, text: "50" });
  const strengthBox = h(
    "div",
    { className: "tool-options sign-photo__clean", hidden: true },
    h("div", {}, h("label", { for: `${id}-strength`, text: t("sign.photo.clean") }), strength, strengthOut),
    h("p", { className: "tool-note", text: t("sign.photo.cleanHint") }),
  );
  const preview = h("canvas", { className: "sign-photo__preview", role: "img", "aria-label": t("sign.photo.previewAlt") });
  const previewWrap = h("div", { className: "sign-photo__result", hidden: true }, preview);
  const photoError = errorRegion();
  const uploadPanel = h(
    "div",
    { className: "sign-mode", hidden: true },
    h("div", { className: "tool-actions" }, photoInput, photoPick),
    photoNote,
    photoError.el,
    previewWrap,
    strengthBox,
  );

  const sigStep = h(
    "section",
    { className: "sign-step", "aria-labelledby": `${id}-step1` },
    h("h2", { className: "sign-step__title", id: `${id}-step1`, text: t("sign.step.signature") }),
    modeSeg.box,
    drawPanel,
    uploadPanel,
  );

  // ---------- step 2: placing ----------
  const today = new Date();
  const dateFormats = {
    long: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(today),
    numeric: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(today),
  };
  const armSeg = segmented<Kind>(
    "arm",
    t("sign.arm.legend"),
    [
      ["sig", t("sign.kind.sig")],
      ["date", t("sign.kind.date")],
    ],
    armed,
    (k) => arm(k),
  );
  const dateSelect = h(
    "select",
    { id: `${id}-datefmt` },
    h("option", { value: "long", text: dateFormats.long }),
    h("option", { value: "numeric", text: dateFormats.numeric }),
  );
  dateSelect.addEventListener("change", () => void makeDate());
  const dateField = h(
    "div",
    { className: "sign-date", hidden: true },
    h("label", { for: `${id}-datefmt`, text: t("sign.date.label") }),
    dateSelect,
  );

  const prevBtn = button(t("sign.page.prev"), { variant: "ghost", onClick: () => void goTo(current - 1) });
  const nextBtn = button(t("sign.page.next"), { variant: "ghost", onClick: () => void goTo(current + 1) });
  const pageSelect = h("select", { id: `${id}-page`, className: "sign-nav__select" });
  pageSelect.addEventListener("change", () => void goTo(Number(pageSelect.value)));
  const addBtn = button(t("sign.add.sig"), { onClick: () => addCentred() });
  addBtn.classList.add("sign-nav__add");
  const nav = h(
    "div",
    { className: "sign-nav" },
    h("label", { for: `${id}-page`, className: "visually-hidden", text: t("sign.page.label") }),
    prevBtn,
    pageSelect,
    nextBtn,
    addBtn,
  );

  const hintId = `${id}-hint`;
  const sheet = h("div", { className: "sign-sheet" });
  const layer = h("div", { className: "sign-layer" });
  const frame = h("div", { className: "sign-frame" }, sheet, layer);
  const stage = h("div", { className: "sign-stage" }, frame);
  const hint = h("p", { className: "tool-note", id: hintId, text: t("sign.place.hint") });
  const stageError = errorRegion();

  const placeStep = h(
    "section",
    { className: "sign-step", "aria-labelledby": `${id}-step2` },
    h("h2", { className: "sign-step__title", id: `${id}-step2`, text: t("sign.step.place") }),
    h("div", { className: "sign-arm" }, armSeg.box, dateField),
    nav,
    stageError.el,
    stage,
    hint,
  );

  const editor = h("div", { className: "sign-editor", hidden: true }, sigStep, placeStep);

  const saveBtn = button(t("sign.save"), { variant: "primary", onClick: () => void save() });
  const downloadBtn = button(t("tool.download"), {
    variant: "primary",
    onClick: () => result && downloadBlob(result.blob, result.name),
  });
  downloadBtn.hidden = true;
  const resetBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions", hidden: true }, saveBtn, downloadBtn, resetBtn);
  const progress = h("progress", { className: "tool-progress", hidden: true, "aria-label": t("sign.saving") });
  const after = h("p", { className: "tool-note sign-after", hidden: true, text: t("sign.after") });

  const tool = h(
    "div",
    { className: "tool tool--pdf-sign" },
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

  // ---------- helpers ----------
  const what = (k: Kind) => t(`sign.kind.${k}`);
  const view = () => views[current] ?? { width: 1, height: 1 };

  function stampFrom(canvas: HTMLCanvasElement): Promise<Stamp> {
    return new Promise((resolve, reject) =>
      canvas.toBlob(async (blob) => {
        if (!blob) return reject(new Error("pdf-sign: toBlob failed"));
        const url = URL.createObjectURL(blob);
        urls.add(url);
        resolve({ png: new Uint8Array(await blob.arrayBuffer()), url, aspect: canvas.width / canvas.height });
      }, "image/png"),
    );
  }

  function canvasOf(img: Rgba): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.putImageData(new ImageData(img.data as ImageDataArray, img.width, img.height), 0, 0);
    return c;
  }

  function setStamp(kind: Kind, s: Stamp) {
    stamps[kind] = s;
    for (const item of items) if (item.kind === kind) item.rect = refit(item.rect, s.aspect, views[item.page]!);
    renderBoxes();
    invalidate();
  }

  function invalidate() {
    if (!result && downloadBtn.hidden) return;
    result = null;
    downloadBtn.hidden = true;
    saveBtn.hidden = false;
    after.hidden = true;
    if (!busy) status.set("");
  }

  function announce(msg: string) {
    clearTimeout(announceTimer);
    live.textContent = msg;
  }

  function stateText(item: Item): string {
    return t("sign.state", {
      what: what(item.kind),
      page: item.page + 1,
      width: toMm(item.rect.w),
      height: toMm(item.rect.h),
      x: toMm(item.rect.x),
      y: toMm(item.rect.y),
    });
  }

  // ---------- drawing pad ----------
  let strokes: Point[][] = [];
  /** Width / height of the pad as laid out (5:2, or 2:1 on phones). */
  let padAspect = 2.5;
  let stroke: { pointerId: number; points: Point[] } | null = null;
  let paintQueued = false;
  let commitSeq = 0;

  function sizePad() {
    const r = pad.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) padAspect = r.width / r.height;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(r.width * dpr));
    const hgt = Math.max(1, Math.round(r.height * dpr));
    if (pad.width !== w || pad.height !== hgt) {
      pad.width = w;
      pad.height = hgt;
      paintPad();
    }
  }
  const padObserver = new ResizeObserver(sizePad);
  padObserver.observe(padWrap);

  /** Strokes are stored in pad widths (x and y), so they redraw at any size. */
  function paint(c: CanvasRenderingContext2D, scale: number, list: Point[][]) {
    c.strokeStyle = c.fillStyle = INKS[ink];
    c.lineCap = c.lineJoin = "round";
    const base = 0.0068 * scale;
    for (const s of list) {
      if (s.length === 1) {
        const p = s[0]!;
        c.beginPath();
        c.arc(p.x * scale, p.y * scale, (base * p.w) / 2, 0, Math.PI * 2);
        c.fill();
        continue;
      }
      // Quadratic segments between midpoints: smooth curves through the sampled points.
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1]!;
        const b = s[i]!;
        const start = i === 1 ? a : { x: (s[i - 2]!.x + a.x) / 2, y: (s[i - 2]!.y + a.y) / 2 };
        const end = i === s.length - 1 ? b : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        c.lineWidth = base * (i === 1 ? a.w : (a.w + b.w) / 2);
        c.beginPath();
        c.moveTo(start.x * scale, start.y * scale);
        if (i === 1) c.lineTo(end.x * scale, end.y * scale);
        else c.quadraticCurveTo(a.x * scale, a.y * scale, end.x * scale, end.y * scale);
        c.stroke();
      }
    }
  }

  function paintPad() {
    const c = pad.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, pad.width, pad.height);
    paint(c, pad.width, stroke ? [...strokes, stroke.points] : strokes);
    padWrap.toggleAttribute("data-empty", strokes.length === 0 && !stroke);
    undoBtn.disabled = clearBtn.disabled = strokes.length === 0;
  }

  function queuePaint() {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => {
      paintQueued = false;
      paintPad();
    });
  }

  const padPoint = (e: PointerEvent, prev: Point | undefined): Point => {
    const r = pad.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.width;
    const time = e.timeStamp;
    let w: number;
    if (e.pointerType === "pen" && e.pressure > 0) w = 0.45 + e.pressure * 0.95;
    else if (!prev) w = 1.1;
    else {
      // Faster strokes come out thinner, as with a real pen; smoothed so the width never jumps.
      const speed = Math.hypot(x - prev.x, y - prev.y) / Math.max(1, time - prev.t);
      const target = Math.min(1.3, Math.max(0.55, 1.3 - speed * 180));
      w = prev.w * 0.7 + target * 0.3;
    }
    return { x, y, w, t: time };
  };

  pad.addEventListener("pointerdown", (e) => {
    if (stroke || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    pad.setPointerCapture(e.pointerId);
    stroke = { pointerId: e.pointerId, points: [padPoint(e, undefined)] };
    e.preventDefault();
    queuePaint();
  });
  pad.addEventListener("pointermove", (e) => {
    if (!stroke || e.pointerId !== stroke.pointerId) return;
    const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const prev = stroke.points[stroke.points.length - 1];
      const p = padPoint(ev, prev);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.0015) continue;
      stroke.points.push(p);
    }
    queuePaint();
  });
  const endStroke = (e: PointerEvent) => {
    if (!stroke || e.pointerId !== stroke.pointerId) return;
    strokes.push(stroke.points);
    stroke = null;
    paintPad();
    void commitDrawing();
  };
  pad.addEventListener("pointerup", endStroke);
  pad.addEventListener("pointercancel", endStroke);
  pad.addEventListener("lostpointercapture", endStroke);

  function undoStroke() {
    strokes.pop();
    paintPad();
    void commitDrawing();
  }

  function clearPad() {
    strokes = [];
    paintPad();
    void commitDrawing();
    announce(t("sign.pad.cleared"));
  }

  /** Export the drawing at print size, trimmed to the ink, as the signature (when Draw is chosen). */
  async function commitDrawing() {
    const seq = ++commitSeq;
    if (strokes.length === 0) {
      drawn = null;
      return;
    }
    const c = document.createElement("canvas");
    c.width = EXPORT_W;
    // Tall enough for every stroke, even ones drawn before the pad changed shape.
    const lowest = Math.max(...strokes.flat().map((p) => p.y));
    c.height = Math.round(EXPORT_W * Math.max(1 / padAspect, lowest + 0.05));
    const g = c.getContext("2d")!;
    paint(g, EXPORT_W, strokes);
    const trimmed = trimToInk({ data: g.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height }, 8);
    if (!trimmed) return;
    const s = await stampFrom(canvasOf(trimmed));
    if (seq !== commitSeq) return;
    drawn = s;
    if (mode === "draw") setStamp("sig", s);
  }

  // ---------- photo of a signature ----------
  let scan: Rgba | null = null;
  let processTimer: ReturnType<typeof setTimeout> | undefined;
  let processSeq = 0;

  photoInput.addEventListener("change", () => {
    const f = photoInput.files?.[0];
    photoInput.value = "";
    if (f) void loadPhoto(f);
  });

  async function loadPhoto(f: File) {
    photoError.clear();
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)) {
      photoError.show(t("sign.photo.error.type", { name: f.name }));
      return;
    }
    if (f.size > IMAGE_MAX_BYTES) {
      photoError.show(t("tool.error.tooLarge", { name: f.name, max: formatBytes(IMAGE_MAX_BYTES) }));
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(f);
    } catch {
      photoError.show(t("sign.photo.error.decode", { name: f.name }));
      return;
    }
    const scale = Math.min(1, SCAN_MAX / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bitmap.width * scale));
    c.height = Math.max(1, Math.round(bitmap.height * scale));
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    scan = { data: g.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
    const s = thresholdToStrength(suggestThreshold(scan.data));
    strength.value = String(s);
    strengthOut.textContent = String(s);
    strengthBox.hidden = false;
    photoPick.firstElementChild!.textContent = t("sign.photo.another");
    await processPhoto();
  }

  async function processPhoto() {
    if (!scan) return;
    const seq = ++processSeq;
    const out = extractSignature(scan, strengthToThreshold(Number(strength.value)));
    if (!out) {
      previewWrap.hidden = true;
      photoError.show(t("sign.photo.error.empty"));
      return;
    }
    photoError.clear();
    const c = canvasOf(out);
    preview.width = c.width;
    preview.height = c.height;
    preview.getContext("2d")!.drawImage(c, 0, 0);
    previewWrap.hidden = false;
    const s = await stampFrom(c);
    if (seq !== processSeq) return;
    uploaded = s;
    if (mode === "upload") setStamp("sig", s);
  }

  strength.addEventListener("input", () => {
    strengthOut.textContent = strength.value;
    clearTimeout(processTimer);
    processTimer = setTimeout(() => void processPhoto(), 120);
  });

  function setMode(m: Mode) {
    mode = m;
    drawPanel.hidden = m !== "draw";
    uploadPanel.hidden = m !== "upload";
    if (m === "draw") sizePad();
    const s = m === "draw" ? drawn : uploaded;
    if (s && s !== stamps.sig) setStamp("sig", s);
  }

  // ---------- date ----------
  async function makeDate(): Promise<Stamp | null> {
    const text = dateFormats[dateSelect.value as keyof typeof dateFormats] ?? dateFormats.long;
    const size = 96;
    const family = getComputedStyle(tool).fontFamily || "sans-serif";
    try {
      // The site's own font, if the page has it; the canvas falls back to the next family otherwise.
      await document.fonts.load(`600 ${size}px ${family}`, text);
    } catch {
      /* draw with whatever is available */
    }
    const c = document.createElement("canvas");
    const g0 = c.getContext("2d")!;
    g0.font = `600 ${size}px ${family}`;
    c.width = Math.ceil(g0.measureText(text).width) + size;
    c.height = Math.round(size * 1.6);
    const g = c.getContext("2d")!;
    g.font = `600 ${size}px ${family}`;
    g.fillStyle = INKS[ink];
    g.textBaseline = "alphabetic";
    g.fillText(text, size / 2, size * 1.15);
    const trimmed = trimToInk({ data: g.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height }, 4);
    if (!trimmed) return null;
    const s = await stampFrom(canvasOf(trimmed));
    setStamp("date", s);
    return s;
  }

  function arm(k: Kind) {
    armed = k;
    dateField.hidden = k !== "date";
    addBtn.textContent = t(`sign.add.${k}`);
    hint.textContent = t(k === "date" ? "sign.place.hintDate" : "sign.place.hint");
    stageError.clear();
    if (k === "date" && !stamps.date) void makeDate();
  }

  // ---------- pages ----------
  const cache = new Map<number, HTMLCanvasElement>();
  let pageGen = 0;

  function syncNav() {
    const total = views.length;
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= total - 1;
    const counts = new Map<number, number>();
    for (const i of items) counts.set(i.page, (counts.get(i.page) ?? 0) + 1);
    if (pageSelect.options.length !== total) {
      pageSelect.replaceChildren(...views.map((_, i) => h("option", { value: i })));
    }
    for (const [i, opt] of [...pageSelect.options].entries()) {
      const n = counts.get(i) ?? 0;
      opt.textContent = n
        ? tPlural(ctx, "sign.page.optionPlaced", n, { page: i + 1, total })
        : t("sign.page.option", { page: i + 1, total });
    }
    pageSelect.value = String(current);
  }

  async function goTo(n: number) {
    if (!viewer || n < 0 || n >= views.length) return;
    current = n;
    stageError.clear();
    const v = view();
    frame.style.setProperty("--sign-ratio", `${v.width} / ${v.height}`);
    frame.style.setProperty("--sign-r", String(v.width / v.height));
    syncNav();
    renderBoxes();
    const gen = ++pageGen;
    const cached = cache.get(n);
    if (cached) {
      cache.delete(n);
      cache.set(n, cached);
      sheet.replaceChildren(cached);
      return;
    }
    sheet.replaceChildren();
    frame.setAttribute("aria-busy", "true");
    try {
      const page = await viewer.getPage(n + 1);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      const cssWidth = frame.getBoundingClientRect().width || stage.clientWidth || 800;
      const scale = Math.min(Math.max(cssWidth * dpr, 600), 2200) / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.className = "sign-sheet__page";
      await page.render({ canvas, viewport }).promise;
      page.cleanup();
      cache.set(n, canvas);
      if (cache.size > PAGE_CACHE) {
        const oldest = cache.keys().next().value!;
        const c = cache.get(oldest)!;
        c.width = c.height = 0;
        cache.delete(oldest);
      }
      if (gen === pageGen && current === n) sheet.replaceChildren(canvas);
    } catch (err) {
      console.warn(err);
      if (gen === pageGen) stageError.show(t("sign.page.error", { page: n + 1 }));
    } finally {
      if (gen === pageGen) frame.removeAttribute("aria-busy");
    }
  }

  // ---------- placements ----------
  const boxes = new Map<number, HTMLElement>();

  function positionBox(box: HTMLElement, item: Item) {
    const v = views[item.page]!;
    box.style.left = `${(item.rect.x / v.width) * 100}%`;
    box.style.top = `${(item.rect.y / v.height) * 100}%`;
    box.style.width = `${(item.rect.w / v.width) * 100}%`;
    box.style.height = `${(item.rect.h / v.height) * 100}%`;
    const state = box.querySelector<HTMLElement>(".sign-box__state");
    if (state) state.textContent = stateText(item);
  }

  function makeBox(item: Item): HTMLElement {
    const stateId = `${id}-state-${item.id}`;
    const img = h("img", { className: "sign-box__img", alt: "", draggable: "false", src: stamps[item.kind]?.url });
    const remove = h("button", {
      type: "button",
      className: "sign-box__remove",
      "aria-label": t(`sign.remove.${item.kind}`, { page: item.page + 1 }),
    });
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });
    const box = h(
      "div",
      {
        className: "sign-box",
        tabindex: 0,
        role: "application",
        "aria-roledescription": t("sign.box.role"),
        "aria-label": what(item.kind),
        "aria-describedby": `${stateId} ${hintId}`,
        "data-kind": item.kind,
        "data-id": item.id,
      },
      img,
      ...CORNERS.map((c) => h("span", { className: "sign-handle", "data-handle": c, "aria-hidden": "true" })),
      remove,
      h("span", { className: "sign-box__state", id: stateId, hidden: true }),
    );
    positionBox(box, item);
    return box;
  }

  function renderBoxes() {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>(".sign-box") : null;
    const keep = focused ? Number(focused.dataset.id) : -1;
    boxes.clear();
    const els: HTMLElement[] = [];
    for (const item of items) {
      if (item.page !== current) continue;
      const box = makeBox(item);
      boxes.set(item.id, box);
      els.push(box);
    }
    layer.replaceChildren(...els);
    if (keep >= 0) boxes.get(keep)?.focus({ preventScroll: true });
  }

  function updateItem(item: Item, rect: ViewRect) {
    if (rect.x === item.rect.x && rect.y === item.rect.y && rect.w === item.rect.w && rect.h === item.rect.h) return;
    item.rect = rect;
    const box = boxes.get(item.id);
    if (box) positionBox(box, item);
    invalidate();
  }

  function defaultWidth(kind: Kind, aspect: number): number {
    const v = view();
    return kind === "sig" ? Math.min(SIG_WIDTH, v.width * 0.4) : Math.min(DATE_HEIGHT * aspect, v.width * 0.5);
  }

  async function placeHere(cx: number, cy: number) {
    stageError.clear();
    let stamp = stamps[armed];
    if (!stamp && armed === "date") stamp = (await makeDate()) ?? undefined;
    if (!stamp) {
      stageError.show(t("sign.error.noSignature"));
      announce(t("sign.error.noSignature"));
      return;
    }
    const v = view();
    const item: Item = { id: ++nextItem, kind: armed, page: current, rect: placeAt(cx, cy, defaultWidth(armed, stamp.aspect), stamp.aspect, v) };
    items.push(item);
    renderBoxes();
    syncNav();
    invalidate();
    const box = boxes.get(item.id);
    if (box) {
      markEnter(box);
      box.focus({ preventScroll: true });
    }
    announce(`${t("sign.announce.placed", { what: what(item.kind), page: item.page + 1 })} ${stateText(item)}`);
  }

  function addCentred() {
    const v = view();
    // A signature usually goes in the lower part of a page; the date likewise, a little higher.
    void placeHere(v.width * 0.68, v.height * (armed === "sig" ? 0.82 : 0.76));
  }

  function removeItem(itemId: number) {
    const index = items.findIndex((i) => i.id === itemId);
    if (index < 0) return;
    const [item] = items.splice(index, 1);
    const onPage = items.filter((i) => i.page === current);
    renderBoxes();
    syncNav();
    invalidate();
    const later = onPage.findIndex((i) => i.id > itemId);
    const next = later >= 0 ? onPage[later] : onPage[onPage.length - 1];
    if (next) boxes.get(next.id)?.focus();
    else addBtn.focus();
    announce(t("sign.announce.removed", { what: what(item!.kind), page: item!.page + 1 }));
  }

  layer.addEventListener("click", (e) => {
    if (busy || (e.target as HTMLElement).closest(".sign-box")) return;
    const r = layer.getBoundingClientRect();
    const v = view();
    void placeHere(((e.clientX - r.left) / r.width) * v.width, ((e.clientY - r.top) / r.height) * v.height);
  });

  let drag: { pointerId: number; item: Item; corner: Corner | null; start: ViewRect; sx: number; sy: number; scale: number } | null = null;

  layer.addEventListener("pointerdown", (e) => {
    const target = e.target as HTMLElement;
    const box = target.closest<HTMLElement>(".sign-box");
    if (!box || drag || busy || target.closest(".sign-box__remove") || (e.pointerType === "mouse" && e.button !== 0)) return;
    const item = items.find((i) => i.id === Number(box.dataset.id));
    if (!item) return;
    drag = {
      pointerId: e.pointerId,
      item,
      corner: (target.closest<HTMLElement>("[data-handle]")?.dataset.handle ?? null) as Corner | null,
      start: item.rect,
      sx: e.clientX,
      sy: e.clientY,
      scale: view().width / frame.getBoundingClientRect().width,
    };
    box.setPointerCapture(e.pointerId);
    box.dataset.dragging = drag.corner ?? "move";
    box.focus({ preventScroll: true });
    e.preventDefault();
  });

  layer.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = (e.clientX - drag.sx) * drag.scale;
    const dy = (e.clientY - drag.sy) * drag.scale;
    const v = view();
    updateItem(
      drag.item,
      drag.corner ? resizeFromCorner(drag.start, drag.corner, dx, dy, v, MIN_BOX_CSS * drag.scale) : moveRect(drag.start, dx, dy, v),
    );
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { item, start } = drag;
    drag = null;
    const box = boxes.get(item.id);
    if (box) delete box.dataset.dragging;
    if (item.rect !== start) announce(stateText(item));
  };
  layer.addEventListener("pointerup", endDrag);
  layer.addEventListener("pointercancel", endDrag);
  layer.addEventListener("lostpointercapture", endDrag, true);

  layer.addEventListener("keydown", (e) => {
    const box = (e.target as HTMLElement).closest<HTMLElement>(".sign-box");
    if (!box || busy || e.target !== box) return;
    const item = items.find((i) => i.id === Number(box.dataset.id));
    if (!item) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeItem(item.id);
      return;
    }
    if (!isArrowKey(e.key) || e.ctrlKey || e.metaKey) return;
    // Also stops Alt+Left/Right from going back or forward in the history.
    e.preventDefault();
    const scale = view().width / frame.getBoundingClientRect().width;
    updateItem(item, nudge(item.rect, e.key, e.shiftKey ? 10 : 1, e.altKey, view(), Math.min(item.rect.w, MIN_BOX_CSS * scale)));
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => (live.textContent = stateText(item)), ANNOUNCE_MS);
  });

  // ---------- open, save, reset ----------
  async function open(f: File) {
    clearDocument();
    const gen = generation;
    status.set(t("sign.reading", { name: f.name }));
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
      fileInfo.textContent = tPlural(ctx, "sign.fileInfo", views.length, { name: f.name, pages: views.length, size: formatBytes(f.size) });
      status.set("");
      tool.dataset.loaded = "";
      if (dropLabel) dropLabel.textContent = t("sign.drop.replace");
      editor.hidden = false;
      actions.hidden = false;
      saveBtn.hidden = false;
      sizePad();
      await goTo(0);
      live.textContent = tPlural(ctx, "sign.opened", views.length, { name: f.name, pages: views.length });
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

  async function save() {
    if (!bytes || !file || busy) return;
    errors.clear();
    stageError.clear();
    if (items.length === 0) {
      stageError.show(t("sign.error.nothingPlaced"));
      addBtn.focus();
      return;
    }
    const f = file;
    const gen = generation;
    setBusy(true);
    status.set(t("sign.saving"));
    try {
      const w = await writer();
      const doc = pristine ?? (await w.loadPdf(bytes));
      pristine = null;
      const images: Record<string, Uint8Array> = {};
      for (const item of items) {
        const s = stamps[item.kind];
        if (!s) throw new Error(`pdf-sign: no ${item.kind} image`);
        images[item.kind] = s.png;
      }
      const out = await w.signPdf(
        doc,
        images,
        items.map((i) => ({ page: i.page, image: i.kind, rect: i.rect })),
      );
      if (gen !== generation) return;
      result = { blob: pdfBlob(out), name: t("sign.outputName", { name: baseName(f.name) }) };
      const pages = new Set(items.map((i) => i.page)).size;
      status.set(tPlural(ctx, "sign.done", pages, { pages, size: formatBytes(result.blob.size) }));
      downloadBtn.textContent = t("sign.download", { name: result.name });
      saveBtn.hidden = true;
      downloadBtn.hidden = false;
      after.hidden = false;
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

  /** Forget the PDF and its placements; the signature stays for the next file. */
  function clearDocument() {
    generation++;
    pageGen++;
    if (viewer) void viewer.loadingTask.destroy();
    viewer = null;
    file = null;
    bytes = null;
    pristine = null;
    views = [];
    items = [];
    current = 0;
    for (const c of cache.values()) c.width = c.height = 0;
    cache.clear();
    boxes.clear();
    layer.replaceChildren();
    sheet.replaceChildren();
    pageSelect.replaceChildren();
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
    stageError.clear();
    status.set("");
  }

  function forgetSignature() {
    strokes = [];
    stroke = null;
    commitSeq++;
    processSeq++;
    drawn = uploaded = null;
    scan = null;
    delete stamps.sig;
    delete stamps.date;
    for (const u of urls) URL.revokeObjectURL(u);
    urls.clear();
    paintPad();
    previewWrap.hidden = true;
    strengthBox.hidden = true;
    photoError.clear();
    photoPick.firstElementChild!.textContent = t("sign.photo.choose");
    preview.width = preview.height = 0;
  }

  function startOver() {
    clearDocument();
    forgetSignature();
    clearTimeout(announceTimer);
    live.textContent = "";
    drop.querySelector("input")?.focus();
  }

  paintPad();

  return () => {
    clearDocument();
    forgetSignature();
    padObserver.disconnect();
    clearTimeout(processTimer);
    clearTimeout(announceTimer);
    tool.remove();
  };
}
