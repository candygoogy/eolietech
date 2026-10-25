/**
 * Image cropper: one image, a crop box with eight handles (pointer, touch and keyboard), aspect
 * presets and pixel fields. Decoding, the preview bitmap, cropping and encoding run in ./worker.ts,
 * so the preview shows exactly the pixels that get cropped. Nothing leaves the browser.
 */
import { createDropzone, downloadBlob, formatBytes } from "../../lib/tool-ui";
import { button, errorRegion, h, statusRegion } from "../ai-shared/dom";
import { domId, rangeField, selectField } from "../image-shared/batch-ui";
import { MIME, acceptFor, isLossy, isRasterFormat, type RasterFormat } from "../image-shared/formats";
import type { JobErrorCode } from "../image-shared/protocol";
import type { ToolCtx } from "../types";
import {
  ASPECTS,
  HANDLES,
  aspectFromPreset,
  canTurn,
  croppedName,
  fitAspect,
  isArrowKey,
  moveRect,
  nudge,
  ratioLabel,
  ratioOf,
  resizeRect,
  sameRect,
  setField,
  turnedFromPreset,
  type AspectId,
  type Field,
  type Handle,
  type Rect,
} from "./crop";
import type { CropRequest, CropResponse } from "./worker";
// Loaded by mountTools before mount (src/lib/tool-mount.ts), so only this tool's page fetches it.
export { default as styles } from "./crop.css?url";

const INPUTS: RasterFormat[] = ["jpg", "png", "webp", "avif"];
const FORMAT_NAME: Record<RasterFormat, string> = { jpg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF" };
const DEFAULT_QUALITY = 90;
/** Smallest side a pointer drag may leave, in CSS px, so the handles stay usable. */
const MIN_BOX_CSS = 24;
/** Keyboard changes are announced once the keys pause, not on every step. */
const ANNOUNCE_MS = 700;

interface Source {
  /** Worker image id. */
  id: number;
  W: number;
  H: number;
  format: RasterFormat;
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
  let rect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let aspect: AspectId = aspectFromPreset(ctx.preset);
  let turned = turnedFromPreset(ctx.preset);
  let result: Result | null = null;
  let busy = false;
  let openGen = 0;
  let seq = 0;
  let announceTimer: ReturnType<typeof setTimeout> | undefined;

  // ---------- worker ----------
  let worker: Worker | null = null;
  /** The worker that holds the decoded image (null after a crash or Start over). */
  let holder: Worker | null = null;
  const pending = new Map<number, (m: CropResponse) => void>();

  function getWorker(): Worker {
    if (worker) return worker;
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "image-crop" });
    w.addEventListener("message", (e: MessageEvent<CropResponse>) => {
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

  function request(msg: CropRequest, transfer: Transferable[] = []): Promise<CropResponse> {
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
    accept: acceptFor(INPUTS),
    multiple: false,
    ctx,
    label: t("crop.drop.label"),
    hint: t("crop.drop.hint"),
    onFiles: ({ ok, rejected }) => {
      if (rejected.length) errors.show(rejected.map((r) => r.reason));
      else errors.clear();
      if (ok[0]) void open(ok[0]);
    },
  });
  const dropLabel = drop.querySelector<HTMLElement>(".tool-drop__label");
  const fileInfo = h("p", { className: "tool-item__meta" });

  // Aspect: a radio group shown as a segmented control, plus "Rotate ratio".
  const groupName = domId("crop-aspect");
  const aspectInputs = new Map<AspectId, { input: HTMLInputElement; text: HTMLSpanElement }>();
  const options = h("div", { className: "crop-aspect__options" });
  for (const id of ASPECTS) {
    const input = h("input", { type: "radio", name: groupName, value: id, className: "visually-hidden" });
    const text = h("span");
    input.addEventListener("change", () => input.checked && chooseAspect(id));
    aspectInputs.set(id, { input, text });
    options.append(h("label", { className: "crop-aspect__option" }, input, text));
  }
  const turnBtn = button(t("crop.aspect.turn"), { onClick: turnRatio });
  turnBtn.classList.add("crop-aspect__turn");
  const aspectBox = h(
    "fieldset",
    { className: "crop-aspect" },
    h("legend", { text: t("crop.aspect.legend") }),
    h("div", { className: "crop-aspect__row" }, options, turnBtn),
  );

  // Stage: the preview, a shade with a hole where the box is, and the box with its handles.
  const hintId = domId("crop-hint");
  const stateId = domId("crop-state");
  const canvas = h("canvas", { className: "crop-canvas", role: "img" });
  const hole = h("div", { className: "crop-hole" });
  const shade = h("div", { className: "crop-shade", "aria-hidden": "true" }, hole);
  const sizeTag = h("span", { className: "crop-size", "aria-hidden": "true" });
  // Read with the box's name on focus: its size and position now, then how to move it. Hidden: a
  // description is still read from it, and browse mode does not meet it a second time.
  const boxState = h("span", { id: stateId, hidden: true });
  const box = h(
    "div",
    {
      className: "crop-box",
      tabindex: 0,
      role: "application",
      "aria-label": t("crop.box.label"),
      "aria-describedby": `${stateId} ${hintId}`,
    },
    ...HANDLES.map((handle) => h("span", { className: "crop-handle", "data-handle": handle, "aria-hidden": "true" })),
    sizeTag,
  );
  const frame = h("div", { className: "crop-frame" }, canvas, shade, box, boxState);
  const stage = h("div", { className: "crop-stage" }, frame);
  const hint = h("p", { className: "tool-note crop-hint", id: hintId, text: t("crop.box.hint") });

  // Position and size in source pixels.
  const fieldInputs = new Map<Field, HTMLInputElement>();
  const fields = h("div", { className: "tool-options crop-fields" });
  for (const [field, key] of [
    ["x", "crop.field.x"],
    ["y", "crop.field.y"],
    ["w", "crop.field.width"],
    ["h", "crop.field.height"],
  ] as const) {
    const id = domId(`crop-${field}`);
    const input = h("input", { type: "number", id, min: field === "x" || field === "y" ? 0 : 1, step: 1, inputmode: "numeric" });
    input.addEventListener("change", () => {
      if (!src || input.value.trim() === "") return render();
      setRect(setField(rect, field, Number(input.value), src.W, src.H, ratio()));
      render();
      announce();
    });
    fieldInputs.set(field, input);
    fields.append(h("div", {}, h("label", { for: id, text: t(key) }), input));
  }
  fields.append(h("p", { className: "tool-note", text: t("crop.fields.note") }));

  // Output format and quality (as in the compressor).
  const format = selectField(
    t("crop.option.format"),
    [
      { value: "original", label: t("crop.format.original", { format: "" }) },
      ...INPUTS.map((f) => ({ value: f, label: FORMAT_NAME[f] })),
    ],
    "original",
  );
  const originalOption = format.select.querySelector<HTMLOptionElement>('option[value="original"]')!;
  const quality = rangeField(t("crop.option.quality"), DEFAULT_QUALITY);
  const qualityNote = h("p", { className: "tool-note", id: `${quality.input.id}-note` });
  quality.input.setAttribute("aria-describedby", qualityNote.id);
  const output = h("div", { className: "tool-options crop-output" }, format.wrap, quality.wrap, qualityNote);
  format.select.addEventListener("change", () => {
    syncQuality();
    invalidate();
  });
  quality.input.addEventListener("change", invalidate);

  const editor = h("div", { className: "crop-editor", hidden: true }, aspectBox, stage, hint, fields, output);

  const progress = h("progress", { className: "tool-progress", hidden: true, "aria-label": t("crop.progress") });
  const cropBtn = button(t("crop.action"), { variant: "primary", onClick: () => void runCrop() });
  const downloadBtn = button(t("tool.download"), {
    variant: "primary",
    onClick: () => result && downloadBlob(result.blob, result.name),
  });
  downloadBtn.hidden = true;
  const resetBoxBtn = button(t("crop.resetBox"), { variant: "ghost", onClick: resetBox });
  const startOverBtn = button(t("tool.reset"), { variant: "ghost", onClick: startOver });
  const actions = h("div", { className: "tool-actions", hidden: true }, cropBtn, downloadBtn, resetBoxBtn, startOverBtn);
  const flattenedNote = h("p", { className: "tool-note", hidden: true, text: t("crop.flattened") });

  const tool = h(
    "div",
    { className: "tool tool--image-crop" },
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
  const ratio = () => (src ? ratioOf(aspect, src.W, src.H, turned) : null);
  const outFormat = (): RasterFormat => {
    const v = format.select.value;
    return isRasterFormat(v) ? v : (src?.format ?? "jpg");
  };
  const settingsKey = () => JSON.stringify([src?.id, rect, outFormat(), Number(quality.input.value)]);
  labelAspects();
  syncQuality();

  function labelAspects() {
    for (const [id, { input, text }] of aspectInputs) {
      input.checked = id === aspect;
      text.textContent = id === "free" ? t("crop.aspect.free") : id === "original" ? t("crop.aspect.original") : ratioLabel(id, turned);
    }
    turnBtn.disabled = !canTurn(aspect);
    // The name starts with the visible text (speech input), and names a ratio only when there is one.
    if (canTurn(aspect)) turnBtn.setAttribute("aria-label", t("crop.aspect.turnLabel", { ratio: ratioLabel(aspect, !turned) }));
    else turnBtn.removeAttribute("aria-label");
  }

  function syncQuality() {
    const lossy = isLossy(outFormat());
    quality.input.disabled = !lossy;
    qualityNote.textContent = t(lossy ? "crop.option.qualityNote" : "crop.option.qualityPng");
  }

  /** The result no longer matches the box or the settings: offer Crop again. */
  function invalidate() {
    if (result && result.key === settingsKey()) return;
    result = null;
    downloadBtn.hidden = true;
    cropBtn.hidden = false;
    flattenedNote.hidden = true;
    if (!busy) status.set("");
  }

  function setRect(next: Rect) {
    if (sameRect(next, rect)) return;
    rect = next;
    render();
    invalidate();
  }

  function render() {
    if (!src) return;
    const { W, H } = src;
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    for (const node of [box, hole]) {
      node.style.left = pct(rect.x, W);
      node.style.top = pct(rect.y, H);
      node.style.width = pct(rect.w, W);
      node.style.height = pct(rect.h, H);
    }
    sizeTag.textContent = `${rect.w} × ${rect.h}`;
    boxState.textContent = t("crop.box.state", { width: rect.w, height: rect.h, x: rect.x, y: rect.y });
    const values: Record<Field, number> = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    for (const [field, input] of fieldInputs) {
      input.value = String(values[field]);
      input.max = String(field === "x" ? W - 1 : field === "y" ? H - 1 : field === "w" ? W : H);
    }
  }

  function announce() {
    clearTimeout(announceTimer);
    live.textContent = t("crop.announce", { width: rect.w, height: rect.h, x: rect.x, y: rect.y });
  }

  function announceSoon() {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(announce, ANNOUNCE_MS);
  }

  function chooseAspect(id: AspectId) {
    aspect = id;
    labelAspects();
    if (!src) return;
    const r = ratio();
    // Free keeps the current box; a ratio makes the largest box of that shape around it.
    if (r !== null) setRect(fitAspect(src.W, src.H, r, rect));
    announce();
  }

  function turnRatio() {
    if (!canTurn(aspect)) return;
    turned = !turned;
    labelAspects();
    if (src) setRect(fitAspect(src.W, src.H, ratio(), rect));
    announce();
  }

  function resetBox() {
    if (!src) return;
    setRect(fitAspect(src.W, src.H, ratio()));
    announce();
    box.focus();
  }

  // ---------- pointer and keyboard ----------
  let drag: { pointerId: number; handle: Handle | null; start: Rect; sx: number; sy: number; scale: number } | null = null;

  box.addEventListener("pointerdown", (e) => {
    // One pointer at a time: a second finger must not make the box jump.
    if (drag || !src || busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    const handle = ((e.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle ?? null) as Handle | null;
    drag = {
      pointerId: e.pointerId,
      handle,
      start: rect,
      sx: e.clientX,
      sy: e.clientY,
      scale: src.W / frame.getBoundingClientRect().width,
    };
    box.setPointerCapture(e.pointerId);
    box.dataset.dragging = handle ?? "move";
    box.focus({ preventScroll: true });
    e.preventDefault();
  });

  box.addEventListener("pointermove", (e) => {
    if (!drag || !src || e.pointerId !== drag.pointerId) return;
    const dx = (e.clientX - drag.sx) * drag.scale;
    const dy = (e.clientY - drag.sy) * drag.scale;
    const min = Math.max(1, Math.round(MIN_BOX_CSS * drag.scale));
    setRect(
      drag.handle
        ? resizeRect(drag.start, drag.handle, dx, dy, src.W, src.H, ratio(), min)
        : moveRect(drag.start, dx, dy, src.W, src.H),
    );
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const moved = !sameRect(drag.start, rect);
    drag = null;
    delete box.dataset.dragging;
    if (moved) announce();
  };
  box.addEventListener("pointerup", endDrag);
  box.addEventListener("pointercancel", endDrag);
  box.addEventListener("lostpointercapture", endDrag);

  box.addEventListener("keydown", (e) => {
    if (!src || busy || !isArrowKey(e.key) || e.ctrlKey || e.metaKey) return;
    // Also stops Alt+Left/Right from going back or forward in the history.
    e.preventDefault();
    setRect(nudge(rect, e.key, e.shiftKey ? 10 : 1, e.altKey, src.W, src.H, ratio()));
    announceSoon();
  });

  // ---------- open, crop, reset ----------
  function errorText(code: JobErrorCode, name: string): string {
    if (code === "decode" || code === "unsupported" || code === "memory") return t(`crop.error.${code}`, { name });
    return t("crop.error.failed", { name });
  }

  function setBusy(on: boolean) {
    busy = on;
    progress.hidden = !on;
    if (on) progress.removeAttribute("value");
    for (const b of [cropBtn, resetBoxBtn, startOverBtn]) b.disabled = on;
    editor.toggleAttribute("inert", on);
  }

  function clearImage() {
    file = null;
    src = null;
    result = null;
    editor.hidden = true;
    actions.hidden = true;
    flattenedNote.hidden = true;
    delete tool.dataset.loaded;
    if (dropLabel) dropLabel.textContent = t("crop.drop.label");
    fileInfo.textContent = "";
    canvas.width = 0;
    canvas.height = 0;
  }

  async function open(f: File) {
    const gen = ++openGen;
    clearImage();
    setBusy(true);
    status.set(t("crop.opening", { name: f.name }));
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
      fail(errorText(res.type === "error" ? res.code : "generic", f.name));
      return;
    }
    file = f;
    src = { id, W: res.width, H: res.height, format: res.format };
    holder = worker;
    canvas.width = res.preview.width;
    canvas.height = res.preview.height;
    canvas.getContext("2d")?.drawImage(res.preview, 0, 0);
    res.preview.close();
    canvas.setAttribute("aria-label", t("crop.previewAlt", { name: f.name }));
    frame.style.setProperty("--crop-ratio", `${src.W} / ${src.H}`);
    frame.style.setProperty("--crop-r", String(src.W / src.H));
    fileInfo.textContent = t("crop.fileInfo", { name: f.name, width: src.W, height: src.H, size: formatBytes(f.size) });
    originalOption.textContent = t("crop.format.original", { format: FORMAT_NAME[src.format] });
    syncQuality();
    rect = fitAspect(src.W, src.H, ratio());
    render();
    setBusy(false);
    status.set("");
    clearTimeout(announceTimer);
    live.textContent = t("crop.opened", { name: f.name, width: src.W, height: src.H });
    tool.dataset.loaded = "";
    if (dropLabel) dropLabel.textContent = t("crop.drop.replace");
    editor.hidden = false;
    actions.hidden = false;
    cropBtn.hidden = false;
    downloadBtn.hidden = true;
  }

  function fail(message: string) {
    setBusy(false);
    clearImage();
    errors.show(message);
    status.set("");
  }

  async function runCrop() {
    if (!src || !file || busy) return;
    errors.clear();
    const startedWith = settingsKey();
    // Disabling the focused Crop button drops focus to the page; it is put back below.
    const hadFocus = tool.contains(document.activeElement);
    const f = file;
    const out = outFormat();
    setBusy(true);
    status.set(t("crop.working"));
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
        type: "crop",
        id: ++seq,
        image: src.id,
        rect,
        format: out,
        quality: Number(quality.input.value) || DEFAULT_QUALITY,
      });
      if (file !== f) return;
      if (res.type !== "cropped") throw res.type === "error" ? res.code : "generic";
      const blob = new Blob([res.buffer], { type: MIME[res.format] });
      result = { blob, name: croppedName(f.name, res.format === src.format, res.format, t("crop.fileSuffix")), key: startedWith };
      status.set(t("crop.result", { width: res.width, height: res.height, size: formatBytes(blob.size) }));
      downloadBtn.setAttribute("aria-label", t("crop.downloadLabel", { name: result.name }));
      flattenedNote.hidden = !res.flattened;
      cropBtn.hidden = true;
      downloadBtn.hidden = false;
    } catch (err) {
      console.error(err);
      errors.show(errorText(typeof err === "string" ? (err as JobErrorCode) : "generic", f.name));
      status.set("");
    } finally {
      if (file === f) {
        setBusy(false);
        if (!downloadBtn.hidden) downloadBtn.focus();
        else if (hadFocus && !tool.contains(document.activeElement)) cropBtn.focus();
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
