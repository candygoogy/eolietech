/**
 * Crop box math for the image cropper (pure, unit-tested; no DOM). Every rectangle is in pixels of
 * the decoded source image (EXIF orientation already applied), with integer x/y/w/h inside 0..W, 0..H.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Resize handles: corners and edges, named by compass direction. */
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const HANDLES: readonly Handle[] = ["n", "e", "s", "w", "nw", "ne", "se", "sw"];

/** Aspect choices in the order the UI lists them. "original" is the image's own ratio. */
export const ASPECTS = ["free", "original", "1:1", "4:5", "3:4", "3:2", "16:9"] as const;
export type AspectId = (typeof ASPECTS)[number];

const isAspect = (v: unknown): v is AspectId => typeof v === "string" && (ASPECTS as readonly string[]).includes(v);

/** Variant preset -> initial aspect: `{ aspect: "1:1" }`, `{ aspect: "16:9" }`; anything else is free. */
export function aspectFromPreset(preset: Record<string, unknown>): AspectId {
  return isAspect(preset.aspect) ? preset.aspect : "free";
}

/** Fixed ratios that read differently when turned (4:5 -> 5:4). Free, original and 1:1 do not turn. */
export const canTurn = (id: AspectId): boolean => id !== "free" && id !== "original" && id !== "1:1";

/** "4:5", or "5:4" when turned. Free and original have no numeric label. */
export function ratioLabel(id: AspectId, turned: boolean): string {
  if (!id.includes(":")) return id;
  const [a, b] = id.split(":");
  return turned && canTurn(id) ? `${b}:${a}` : id;
}

/** Width / height for an aspect choice, or null for free. */
export function ratioOf(id: AspectId, W: number, H: number, turned = false): number | null {
  if (id === "free") return null;
  if (id === "original") return W / H;
  const [a, b] = id.split(":").map(Number) as [number, number];
  return turned && canTurn(id) ? b / a : a / b;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** Round to whole pixels and force the rectangle inside the image, at least 1 x 1. */
export function clampRect(r: Rect, W: number, H: number): Rect {
  const w = clamp(Math.round(r.w), 1, W);
  const h = clamp(Math.round(r.h), 1, H);
  return { x: clamp(Math.round(r.x), 0, W - w), y: clamp(Math.round(r.y), 0, H - h), w, h };
}

/** Width and height of the given ratio, as large as possible inside W x H, rounded. */
function largestOf(ratio: number, W: number, H: number): { w: number; h: number } {
  let w = W;
  let h = Math.round(W / ratio);
  if (h > H) {
    h = H;
    w = Math.round(H * ratio);
  }
  return { w: clamp(w, 1, W), h: clamp(h, 1, H) };
}

/**
 * The starting box for an aspect: the whole image when free, otherwise the largest box of that
 * ratio, centred on `around` (the current box) when given, else on the image.
 */
export function fitAspect(W: number, H: number, ratio: number | null, around?: Rect): Rect {
  if (ratio === null) return { x: 0, y: 0, w: W, h: H };
  const { w, h } = largestOf(ratio, W, H);
  const cx = around ? around.x + around.w / 2 : W / 2;
  const cy = around ? around.y + around.h / 2 : H / 2;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h }, W, H);
}

/** Move by (dx, dy) source pixels, stopping at the image edges. */
export function moveRect(r: Rect, dx: number, dy: number, W: number, H: number): Rect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy }, W, H);
}

/**
 * Drag a handle by (dx, dy) source pixels from the box `start` had when the drag began. The
 * opposite corner or edge stays put. With a ratio, corners follow whichever axis moved more and
 * edges grow the other side around its centre (shifted back inside the image if needed).
 * `min` is the smallest side the drag may produce (the client passes a size that keeps the handles usable).
 */
export function resizeRect(
  start: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  W: number,
  H: number,
  ratio: number | null,
  min = 1,
): Rect {
  const left = start.x;
  const top = start.y;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const hasW = handle.includes("w");
  const hasE = handle.includes("e");
  const hasN = handle.includes("n");
  const hasS = handle.includes("s");
  // Never force a box that is already smaller than `min` (set by the number fields) to jump.
  const minW = Math.min(min, start.w);
  const minH = Math.min(min, start.h);

  if (ratio === null) {
    const l = hasW ? clamp(left + dx, 0, right - minW) : left;
    const r = hasE ? clamp(right + dx, left + minW, W) : right;
    const t = hasN ? clamp(top + dy, 0, bottom - minH) : top;
    const b = hasS ? clamp(bottom + dy, top + minH, H) : bottom;
    const x = Math.round(l);
    const y = Math.round(t);
    return clampRect({ x, y, w: Math.round(r) - x, h: Math.round(b) - y }, W, H);
  }

  const lowW = Math.max(minW, minH * ratio);
  let w: number;
  let x: number;
  let y: number;

  if ((hasW || hasE) && (hasN || hasS)) {
    // Corner: the opposite corner is the anchor.
    const ax = hasE ? left : right;
    const ay = hasS ? top : bottom;
    const wantW = start.w + (hasE ? dx : -dx);
    const wantH = start.h + (hasS ? dy : -dy);
    const byWidth = Math.abs(wantW - start.w) / start.w >= Math.abs(wantH - start.h) / start.h;
    const maxW = Math.min(hasE ? W - ax : ax, (hasS ? H - ay : ay) * ratio);
    w = clamp(byWidth ? wantW : wantH * ratio, Math.min(lowW, maxW), maxW);
    const h = w / ratio;
    x = hasE ? ax : ax - w;
    y = hasS ? ay : ay - h;
  } else if (hasW || hasE) {
    // Left or right edge: the height follows, around the box's vertical centre.
    const maxW = Math.min(hasE ? W - left : right, H * ratio);
    w = clamp(start.w + (hasE ? dx : -dx), Math.min(lowW, maxW), maxW);
    x = hasE ? left : right - w;
    y = clamp(top + start.h / 2 - w / ratio / 2, 0, H - w / ratio);
  } else {
    // Top or bottom edge: the width follows, around the box's horizontal centre.
    const maxH = Math.min(hasS ? H - top : bottom, W / ratio);
    const h = clamp(start.h + (hasS ? dy : -dy), Math.min(lowW / ratio, maxH), maxH);
    w = h * ratio;
    y = hasS ? top : bottom - h;
    x = clamp(left + start.w / 2 - w / 2, 0, W - w);
  }

  const rw = clamp(Math.round(w), 1, W);
  const rh = clamp(Math.round(rw / ratio), 1, H);
  return clampRect({ x, y, w: rw, h: rh }, W, H);
}

export type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";
export const isArrowKey = (key: string): key is ArrowKey =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

/**
 * Keyboard: arrows move the box by `step` source pixels; with `resize`, Right/Down grow and
 * Left/Up shrink it from its bottom-right corner (the top-left stays put).
 */
export function nudge(r: Rect, key: ArrowKey, step: number, resize: boolean, W: number, H: number, ratio: number | null): Rect {
  const dx = key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0;
  const dy = key === "ArrowDown" ? step : key === "ArrowUp" ? -step : 0;
  if (!resize) return moveRect(r, dx, dy, W, H);
  return resizeRect(r, "se", dx, dy, W, H, ratio, 1);
}

export type Field = "x" | "y" | "w" | "h";

/**
 * A value typed in a number field. Position moves the box (stopping at the edges); a size keeps the
 * box's top-left corner unless the new size needs room, and with a ratio the other side follows.
 */
export function setField(r: Rect, field: Field, value: number, W: number, H: number, ratio: number | null): Rect {
  if (!Number.isFinite(value)) return r;
  const v = Math.round(value);
  if (field === "x") return clampRect({ ...r, x: v }, W, H);
  if (field === "y") return clampRect({ ...r, y: v }, W, H);
  let w = r.w;
  let h = r.h;
  if (field === "w") {
    w = clamp(v, 1, W);
    if (ratio !== null) {
      h = Math.round(w / ratio);
      if (h > H) ({ w, h } = largestOf(ratio, W, H));
    }
  } else {
    h = clamp(v, 1, H);
    if (ratio !== null) {
      w = Math.round(h * ratio);
      if (w > W) ({ w, h } = largestOf(ratio, W, H));
    }
  }
  return clampRect({ x: Math.min(r.x, W - w), y: Math.min(r.y, H - h), w, h }, W, H);
}

export const sameRect = (a: Rect, b: Rect): boolean => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** "holiday.jpeg" -> "holiday-cropped.jpeg" (same format) or "holiday-cropped.webp" (converted). */
export function croppedName(inputName: string, keepExtension: boolean, ext: string, suffix: string): string {
  const dot = inputName.lastIndexOf(".");
  const base = dot > 0 ? inputName.slice(0, dot) : inputName;
  const extension = keepExtension && dot > 0 ? inputName.slice(dot + 1) : ext;
  return `${base}-${suffix}.${extension}`;
}
