/**
 * Image redactor: one image, any number of boxes over faces, plates, names or numbers, and one
 * effect for all of them (black box, blur or pixelate). The preview is the worker's downscaled copy
 * of the decoded pixels with the effect applied live by the same code (effects.ts) that later
 * redacts the full-resolution pixels in ./worker.ts. Boxes are drawn, moved, resized and removed
 * with a mouse, a finger or the keyboard. Nothing leaves the browser.
 */
import { createDropzone, downloadBlob, formatBytes } from "../../lib/tool-ui";
import { tPlural } from "../../i18n/plural";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { domId, rangeField, selectField } from "../image-shared/batch-ui";
import { MIME, acceptFor, isLossy, isRasterFormat, type RasterFormat } from "../image-shared/formats";
import type { ToolCtx } from "../types";
import { DEFAULT_STRENGTH, EFFECTS, STRENGTH_MAX, STRENGTH_MIN, applyEffect, effectFromPreset, type Effect } from "./effects";
import {
  HANDLES,
  boxFromDrag,
  defaultBox,
  isArrowKey,
  moveBox,
  nudgeBox,
  redactedName,
  resizeBox,
  sameRect,
  toImagePoint,
  toPreview,
  type Box,
  type Handle,
} from "./geometry";
import type { RedactErrorCode, RedactRequest, RedactResponse } from "./worker";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./redact-image.css?url";

const INPUTS: RasterFormat[] = ["jpg", "png", "webp", "avif"];
/** HEIC is accepted only to point to the converter. */
const ACCEPT = acceptFor([...INPUTS, "heic"]);
const OUTPUTS: RasterFormat[] = ["jpg", "png", "webp"];
const FORMAT_NAME: Record<RasterFormat, string> = { jpg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF" };
const DEFAULT_QUALITY = 90;
/** A drag shorter than this (CSS px) is a tap, not a new box. */
const MIN_DRAG_CSS = 6;
/** Smallest side a pointer resize may leave, in CSS px, so the box stays easy to grab. */
const MIN_BOX_CSS = 12;
/** Keyboard changes are announced once the keys pause, not on every step. */
const ANNOUNCE_MS = 700;

const isHeicFile = (f: File): boolean => /^image\/hei[cf]/i.test(f.type) || /\.(heic|heif|hif)$/i.test(f.name);

interface Source {
  /** Worker image id. */
  id: number;
  W: number;
  H: number;
  format: RasterFormat;
}

interface BoxState {
  box: Box;
  el: HTMLDivElement;
  state: HTMLSpanElement;
  remove: HTMLButtonElement;
}

interface Result {
  blob: Blob;
  name: string;
  /** What it was made from; a change elsewhere makes it stale. */
  key: string;
}

export function mount(el: HTMLElement, ctx: ToolCtx): () => void {
  const { t } = ctx;
  let file: File | null = null;
  let src: Source | null = null;
  let boxes: BoxState[] = [];
  let effect: Effect = effectFromPreset(ctx.preset);
  let result: Result | null = null;
  let busy = false;
  let openGen = 0;
  let seq = 0;
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  /** The preview bitmap (worker-made, downscaled), redrawn under the effects on every change. */
  let bitmap: ImageBitmap | null = null;
  let frameReq = 0;

  // ---------- worker ----------
  let worker: Worker | null = null;
  /** The worker that holds the decoded image (null after a crash or Start over). */
  let holder: Worker | null = null;
  const pending = new Map<number, (m: RedactResponse) => void>();

  function getWorker(): Worker {
    if (worker) return worker;
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "image-redact" });
    w.addEventListener("message", (e: MessageEvent<RedactResponse>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    });
    w.addEventListener("error", (e) => {
      // Usually out of memory: fail what is waiting; the next action starts a fresh worker.
      console.error(e.message);
      for (const [id, resolve] of pending) resolve({ type: "error", id, code: "memory" });
      pending.clear();
      stopWorker();
    });
    worker = w;
    return w;
  }

  function stopWorker() {
    worker?.terminate();
    worker = null;
    holder = null;
  }

  function request(msg: RedactRequest, transfer: Transferable[] = []): Promise<RedactResponse> {
    const w = getWorker();
    return new Promise((resolve) => {
      pending.set(msg.id, resolve);
      w.postMessage(msg, transfer);
    });
  }

  // ---------- DOM ----------
  const errors = errorRegion();
  const status = statusRegion();
  const live = h("p", { className: "visually-hidden", "aria-live": "polite" });
  const drop = createDropzone({
    accept: ACCEPT,
    multiple: false,
    ctx,
    label: t("redact.drop.label"),
    hint: t("redact.drop.hint"),
    onFiles: ({ ok, rejected }) => {
      if (rejected.length) errors.show(rejected.map((r) => r.reason));
      else errors.clear();
      const f = ok[0];
      if (!f) return;
      if (isHeicFile(f)) showHeic(f.name);
      else void open(f);
    },
  });
  const dropLabel = drop.querySelector<HTMLElement>(".tool-drop__label");
  const fileInfo = h("p", { className: "tool-item__meta" });

  // Effect: a radio group shown as a segmented control (as the cropper's ratios).
  const groupName = domId("redact-effect");
  const effectInputs = new Map<Effect, HTMLInputElement>();
  const options = h("div", { className: "redact-effect__options" });
  for (const id of EFFECTS) {
    const input = h("input", { type: "radio", name: groupName, value: id, className: "visually-hidden" });
    input.addEventListener("change", () => input.checked && chooseEffect(id));
    effectInputs.set(id, input);
    options.append(h("label", { className: "redact-effect__option" }, input, h("span", { text: t(`redact.effect.${id}`) })));
  }
  const strength = rangeField(t("redact.strength"), DEFAULT_STRENGTH, STRENGTH_MIN, STRENGTH_MAX);
  const strengthNote = h("p", { className: "tool-note", id: `${strength.input.id}-note` });
  strength.input.setAttribute("aria-describedby", strengthNote.id);
  strength.input.addEventListener("input", () => {
    scheduleRender();
    invalidate();
  });
  const safeNote = h("p", { className: "tool-note redact-safe", text: t("redact.safe") });
  const effectBox = h(
    "div",
    { className: "redact-controls" },
    h(
      "fieldset",
      { className: "redact-effect" },
      h("legend", { text: t("redact.effect.legend") }),
      options,
    ),
    h("div", { className: "tool-options redact-strength" }, strength.wrap, strengthNote),
    safeNote,
  );

  // Toolbar: add a box (the keyboard's way in), remove them all, and how many there are.
  const addBtn = button(t("redact.add"), { onClick: () => addBox() });
  const clearBtn = button(t("redact.clear"), { variant: "ghost", onClick: clearAll });
  const count = h("span", { className: "redact-count" });
  const toolbar = h("div", { className: "redact-toolbar" }, addBtn, clearBtn, count);

  // Stage: the preview with the effects painted in, and the boxes over it.
  const hintId = domId("redact-hint");
  const boxHintId = domId("redact-box-hint");
  const canvas = h("canvas", { className: "redact-canvas", role: "img" });
  const frame = h("div", { className: "redact-frame" }, canvas);
  const stage = h("div", { className: "redact-stage" }, frame);
  const hint = h("p", { className: "tool-note redact-hint", id: hintId, text: t("redact.hint") });
  const boxHint = h("span", { id: boxHintId, hidden: true, text: t("redact.box.hint") });

  // Output format and quality (as in the cropper).
  const format = selectField(
    t("redact.option.format"),
    [
      { value: "original", label: t("redact.format.original", { format: "" }) },
      ...OUTPUTS.map((f) => ({ value: f, label: FORMAT_NAME[f] })),
    ],
    "original",
  );
  const originalOption = format.select.querySelector<HTMLOptionElement>('option[value="original"]')!;
  const quality = rangeField(t("redact.option.quality"), DEFAULT_QUALITY);
  const qualityNote = h("p", { className: "tool-note", id: `${quality.input.id}-note` });
  quality.input.setAttribute("aria-describedby", qualityNote.id);
  const output = h("div", { className: "tool-options redact-output" }, format.wrap, quality.wrap, qualityNote);
  format.select.addEventListener("change", () => {
    syncQuality();
    invalidate();
  });
  quality.input.addEventListener("change", invalidate);

  const editor = h("div", { className: "redact-editor", hidden: true }, effectBox, toolbar, stage, hint, boxHint, output);

  const progress = h("progress", { className: "tool-progress", hidden: true, "aria-label": t("redact.progress") });
  const saveBtn = button(t("redact.action"), { variant: "primary", onClick: () => void runRedact() });
  const downloadBtn = button(t("tool.download"), {
    variant: "primary",
    onClick: () => result && downloadBlob(result.blob, result.name),
  });
  downloadBtn.hidden = true;
  const startOverBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions", hidden: true }, saveBtn, downloadBtn, startOverBtn);
  const flattenedNote = h("p", { className: "tool-note", hidden: true, text: t("redact.flattened") });

  const tool = h(
    "div",
    { className: "tool tool--image-redact" },
    drop,
    errors.el,
    fileInfo,
    editor,
    progress,
    status.el,
    actions,
    flattenedNote,
    live,
  );
  el.append(tool);

  // ---------- state ----------
  const outFormat = (): RasterFormat => {
    const v = format.select.value;
    return isRasterFormat(v) ? v : (src?.format ?? "jpg");
  };
  const strengthValue = () => Number(strength.input.value) || DEFAULT_STRENGTH;
  const settingsKey = () =>
    JSON.stringify([src?.id, boxes.map((b) => b.box), effect, strengthValue(), outFormat(), Number(quality.input.value)]);
  syncEffect();
  syncQuality();
  syncCount();

  function syncEffect() {
    for (const [id, input] of effectInputs) input.checked = id === effect;
    tool.dataset.effect = effect;
    const black = effect === "black";
    strength.input.disabled = black;
    strengthNote.textContent = t(black ? "redact.strength.noteBlack" : "redact.strength.note");
  }

  function syncQuality() {
    const lossy = isLossy(outFormat());
    quality.input.disabled = !lossy;
    qualityNote.textContent = t(lossy ? "redact.option.qualityNote" : "redact.option.qualityPng");
  }

  function syncCount() {
    count.textContent = boxes.length ? tPlural(ctx, "redact.count", boxes.length) : t("redact.count.none");
    clearBtn.disabled = busy || boxes.length === 0;
  }

  function chooseEffect(id: Effect) {
    effect = id;
    syncEffect();
    scheduleRender();
    invalidate();
  }

  /** The result no longer matches the boxes or the settings: offer Save again. */
  function invalidate() {
    if (result && result.key === settingsKey()) return;
    result = null;
    downloadBtn.hidden = true;
    saveBtn.hidden = false;
    flattenedNote.hidden = true;
    if (!busy) status.set("");
  }

  // ---------- preview ----------
  function scheduleRender() {
    if (frameReq || !bitmap) return;
    frameReq = requestAnimationFrame(() => {
      frameReq = 0;
      renderPreview();
    });
  }

  /** The preview pixels, then every box's effect on them, in order (as the worker does at full size). */
  function renderPreview() {
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g || !bitmap || !src) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(bitmap, 0, 0);
    const s = strengthValue();
    for (const { box } of boxes) {
      const r = toPreview(box, src.W, src.H, canvas.width, canvas.height);
      if (r.w === 0 || r.h === 0) continue;
      if (effect === "black") {
        g.fillStyle = "#000";
        g.fillRect(r.x, r.y, r.w, r.h);
        continue;
      }
      const img = g.getImageData(r.x, r.y, r.w, r.h);
      applyEffect(img, { x: 0, y: 0, w: r.w, h: r.h }, effect, s);
      g.putImageData(img, r.x, r.y);
    }
  }

  // ---------- boxes ----------
  function makeBox(box: Box): BoxState {
    const stateEl = h("span", { id: domId("redact-box-state"), hidden: true });
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
    const bs: BoxState = { box, el: elBox, state: stateEl, remove };
    remove.addEventListener("click", () => removeBox(bs, true));
    boxes.push(bs);
    frame.append(elBox);
    placeBox(bs);
    labelBoxes();
    return bs;
  }

  function placeBox(bs: BoxState) {
    if (!src) return;
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    bs.el.style.left = pct(bs.box.x, src.W);
    bs.el.style.top = pct(bs.box.y, src.H);
    bs.el.style.width = pct(bs.box.w, src.W);
    bs.el.style.height = pct(bs.box.h, src.H);
    bs.state.textContent = stateText(bs.box);
  }

  const stateText = (b: Box) => t("redact.box.state", { width: b.w, height: b.h, x: b.x, y: b.y });
  const boxNumber = (bs: BoxState) => boxes.indexOf(bs) + 1;

  /** Box numbers follow the order they were added; refresh the names after an add or a removal. */
  function labelBoxes() {
    boxes.forEach((bs, i) => {
      bs.el.setAttribute("aria-label", t("redact.box.label", { box: i + 1 }));
      bs.remove.setAttribute("aria-label", t("redact.box.remove", { box: i + 1 }));
    });
    syncCount();
  }

  function setBox(bs: BoxState, next: Box) {
    if (sameRect(next, bs.box)) return false;
    bs.box = next;
    placeBox(bs);
    changed();
    return true;
  }

  function announce(msg: string) {
    clearTimeout(announceTimer);
    live.textContent = msg;
  }

  const describe = (bs: BoxState) => t("redact.announce.box", { box: boxNumber(bs), state: stateText(bs.box) });

  function announceSoon(bs: BoxState) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => announce(describe(bs)), ANNOUNCE_MS);
  }

  function select(bs: BoxState | null) {
    for (const b of boxes) delete b.el.dataset.selected;
    if (bs) bs.el.dataset.selected = "";
  }

  function addBox() {
    if (!src || busy) return;
    const bs = makeBox(defaultBox(src.W, src.H, boxes.length));
    changed();
    select(bs);
    bs.el.focus();
    announce(t("redact.announce.added", { box: boxNumber(bs) }));
  }

  function removeBox(bs: BoxState, keyboard: boolean) {
    if (busy) return;
    const i = boxes.indexOf(bs);
    if (i < 0) return;
    boxes.splice(i, 1);
    bs.el.remove();
    labelBoxes();
    changed();
    announce(t("redact.announce.removed"));
    if (keyboard) {
      const next = boxes[Math.min(i, boxes.length - 1)];
      if (next) {
        select(next);
        next.el.focus();
      } else addBtn.focus();
    }
  }

  function clearAll() {
    if (busy || boxes.length === 0) return;
    const n = boxes.length;
    for (const bs of boxes) bs.el.remove();
    boxes = [];
    labelBoxes();
    changed();
    status.set(tPlural(ctx, "redact.cleared", n));
    addBtn.focus();
  }

  /** Boxes changed: repaint the preview, and a saved result no longer matches. */
  function changed() {
    scheduleRender();
    invalidate();
  }

  // ---------- pointer and keyboard ----------
  type Drag =
    | { kind: "draw"; pointerId: number; x0: number; y0: number; cx: number; cy: number; bs: BoxState | null }
    | { kind: "edit"; pointerId: number; bs: BoxState; handle: Handle | null; start: Box; sx: number; sy: number; scale: number };
  let drag: Drag | null = null;

  frame.addEventListener("pointerdown", (e) => {
    if (drag || !src || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = e.target as HTMLElement;
    if (target.closest(".redact-box__remove")) return;
    const boxEl = target.closest<HTMLElement>(".redact-box");
    const r = frame.getBoundingClientRect();
    if (boxEl) {
      const bs = boxes.find((b) => b.el === boxEl);
      if (!bs) return;
      const handle = (target.closest<HTMLElement>("[data-handle]")?.dataset.handle ?? null) as Handle | null;
      drag = { kind: "edit", pointerId: e.pointerId, bs, handle, start: bs.box, sx: e.clientX, sy: e.clientY, scale: src.W / r.width };
      select(bs);
      bs.el.dataset.dragging = handle ?? "move";
      bs.el.focus({ preventScroll: true });
    } else {
      const p = toImagePoint(e.clientX, e.clientY, r, src.W, src.H);
      drag = { kind: "draw", pointerId: e.pointerId, x0: p.x, y0: p.y, cx: e.clientX, cy: e.clientY, bs: null };
      select(null);
    }
    frame.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  frame.addEventListener("pointermove", (e) => {
    if (!drag || !src || e.pointerId !== drag.pointerId) return;
    if (drag.kind === "draw") {
      if (!drag.bs && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < MIN_DRAG_CSS) return;
      const p = toImagePoint(e.clientX, e.clientY, frame.getBoundingClientRect(), src.W, src.H);
      const box = boxFromDrag(drag.x0, drag.y0, p.x, p.y, src.W, src.H);
      if (!drag.bs) {
        drag.bs = makeBox(box);
        drag.bs.el.dataset.dragging = "draw";
        select(drag.bs);
        changed();
      } else setBox(drag.bs, box);
      return;
    }
    const dx = (e.clientX - drag.sx) * drag.scale;
    const dy = (e.clientY - drag.sy) * drag.scale;
    const min = Math.max(1, Math.round(MIN_BOX_CSS * drag.scale));
    setBox(
      drag.bs,
      drag.handle ? resizeBox(drag.start, drag.handle, dx, dy, src.W, src.H, min) : moveBox(drag.start, dx, dy, src.W, src.H),
    );
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    if (d.kind === "draw") {
      if (!d.bs) return;
      delete d.bs.el.dataset.dragging;
      if (e.type === "pointercancel") {
        removeBox(d.bs, false);
        return;
      }
      d.bs.el.focus({ preventScroll: true });
      announce(t("redact.announce.added", { box: boxNumber(d.bs) }));
      return;
    }
    delete d.bs.el.dataset.dragging;
    if (!sameRect(d.start, d.bs.box)) announce(describe(d.bs));
  };
  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);
  frame.addEventListener("lostpointercapture", endDrag);

  frame.addEventListener("keydown", (e) => {
    const boxEl = (e.target as HTMLElement).closest<HTMLElement>(".redact-box");
    const bs = boxEl && e.target === boxEl ? boxes.find((b) => b.el === boxEl) : undefined;
    if (!bs || !src || busy) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeBox(bs, true);
      return;
    }
    if (!isArrowKey(e.key) || e.ctrlKey || e.metaKey) return;
    // Also stops Alt+Left/Right from going back or forward in the history.
    e.preventDefault();
    if (setBox(bs, nudgeBox(bs.box, e.key, e.shiftKey ? 10 : 1, e.altKey, src.W, src.H))) announceSoon(bs);
  });

  frame.addEventListener("focusin", (e) => {
    const boxEl = (e.target as HTMLElement).closest<HTMLElement>(".redact-box");
    const bs = boxEl ? boxes.find((b) => b.el === boxEl) : undefined;
    if (bs) select(bs);
  });

  // ---------- open, redact, reset ----------
  function errorText(code: RedactErrorCode, name: string): string {
    if (code === "decode" || code === "unsupported" || code === "memory") return t(`redact.error.${code}`, { name });
    return t("redact.error.failed", { name });
  }

  /** HEIC opens nowhere here: say so, with a link to the converter. */
  function showHeic(name: string) {
    errors.el.replaceChildren(
      h(
        "p",
        {},
        t("redact.error.heic", { name }),
        " ",
        h("a", { href: t("redact.error.heicHref"), text: t("redact.error.heicLink") }),
        ".",
      ),
    );
    errors.el.hidden = false;
  }

  function setBusy(on: boolean) {
    busy = on;
    progress.hidden = !on;
    if (on) progress.removeAttribute("value");
    for (const b of [saveBtn, startOverBtn, addBtn]) b.disabled = on;
    syncCount();
    editor.toggleAttribute("inert", on);
  }

  function clearImage() {
    file = null;
    src = null;
    result = null;
    for (const bs of boxes) bs.el.remove();
    boxes = [];
    drag = null;
    cancelAnimationFrame(frameReq);
    frameReq = 0;
    bitmap?.close();
    bitmap = null;
    editor.hidden = true;
    actions.hidden = true;
    flattenedNote.hidden = true;
    delete tool.dataset.loaded;
    if (dropLabel) dropLabel.textContent = t("redact.drop.label");
    fileInfo.textContent = "";
    canvas.width = 0;
    canvas.height = 0;
    syncCount();
  }

  async function open(f: File) {
    const gen = ++openGen;
    clearImage();
    setBusy(true);
    status.set(t("redact.opening", { name: f.name }));
    let buffer: ArrayBuffer;
    try {
      buffer = await f.arrayBuffer();
    } catch {
      if (gen === openGen) fail(errorText("decode", f.name));
      return;
    }
    const id = ++seq;
    const dpr = globalThis.devicePixelRatio || 1;
    const previewMax = Math.min(2560, Math.max(1024, Math.round(Math.max(screen.width, screen.height) * dpr)));
    const res = await request({ type: "open", id, buffer, previewMax }, [buffer]);
    if (gen !== openGen) {
      if (res.type === "opened") res.preview.close();
      return;
    }
    if (res.type !== "opened") {
      if (res.type === "error" && res.code === "heic") {
        setBusy(false);
        clearImage();
        status.set("");
        showHeic(f.name);
        return;
      }
      fail(errorText(res.type === "error" ? res.code : "generic", f.name));
      return;
    }
    file = f;
    src = { id, W: res.width, H: res.height, format: res.format };
    holder = worker;
    bitmap = res.preview;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    renderPreview();
    canvas.setAttribute("aria-label", t("redact.previewAlt", { name: f.name }));
    frame.style.setProperty("--redact-ratio", `${src.W} / ${src.H}`);
    frame.style.setProperty("--redact-r", String(src.W / src.H));
    fileInfo.textContent = t("redact.fileInfo", { name: f.name, width: src.W, height: src.H, size: formatBytes(f.size) });
    originalOption.textContent = t("redact.format.original", { format: FORMAT_NAME[src.format] });
    syncQuality();
    setBusy(false);
    status.set("");
    clearTimeout(announceTimer);
    live.textContent = t("redact.opened", { name: f.name, width: src.W, height: src.H });
    tool.dataset.loaded = "";
    if (dropLabel) dropLabel.textContent = t("redact.drop.replace");
    editor.hidden = false;
    actions.hidden = false;
    saveBtn.hidden = false;
    downloadBtn.hidden = true;
  }

  function fail(message: string) {
    setBusy(false);
    clearImage();
    errors.show(message);
    status.set("");
  }

  async function runRedact() {
    if (!src || !file || busy) return;
    errors.clear();
    if (boxes.length === 0) {
      errors.show(t("redact.error.noBoxes"));
      addBtn.focus();
      return;
    }
    const startedWith = settingsKey();
    // Disabling the focused Save button drops focus to the page; it is put back below.
    const hadFocus = tool.contains(document.activeElement);
    const f = file;
    const out = outFormat();
    setBusy(true);
    status.set(t("redact.working"));
    try {
      if (!holder || holder !== worker) {
        // The worker was restarted (out of memory, most likely): decode the file again first.
        const id = ++seq;
        const buffer = await f.arrayBuffer();
        const reopened = await request({ type: "open", id, buffer, previewMax: 16 }, [buffer]);
        if (reopened.type !== "opened") throw reopened.type === "error" ? reopened.code : "generic";
        reopened.preview.close();
        src = { ...src, id };
        holder = worker;
      }
      const res = await request({
        type: "redact",
        id: ++seq,
        image: src.id,
        boxes: boxes.map((b) => b.box),
        effect,
        strength: strengthValue(),
        format: out,
        quality: Number(quality.input.value) || DEFAULT_QUALITY,
      });
      if (file !== f) return;
      if (res.type !== "redacted") throw res.type === "error" ? res.code : "generic";
      const blob = new Blob([res.buffer], { type: MIME[res.format] });
      result = { blob, name: redactedName(f.name, res.format === src.format, res.format, t("redact.fileSuffix")), key: startedWith };
      status.set(t("redact.result", { width: res.width, height: res.height, size: formatBytes(blob.size) }));
      downloadBtn.setAttribute("aria-label", t("redact.downloadLabel", { name: result.name }));
      flattenedNote.hidden = !res.flattened;
      saveBtn.hidden = true;
      downloadBtn.hidden = false;
    } catch (err) {
      console.error(err);
      errors.show(errorText(typeof err === "string" ? (err as RedactErrorCode) : "generic", f.name));
      status.set("");
    } finally {
      if (file === f) {
        setBusy(false);
        if (!downloadBtn.hidden) downloadBtn.focus();
        else if (hadFocus && !tool.contains(document.activeElement)) saveBtn.focus();
      }
    }
  }

  function startOver() {
    openGen++;
    clearTimeout(announceTimer);
    clearImage();
    errors.clear();
    status.set("");
    live.textContent = "";
    // Frees the decoded image held by the worker.
    stopWorker();
    drop.querySelector("input")?.focus();
  }

  return () => {
    startOver();
    tool.remove();
  };
}
