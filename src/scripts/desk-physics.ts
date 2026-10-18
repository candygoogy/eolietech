/**
 * Pure maths for the home desk (desk-drag.ts, desk-play.ts): friction past the desk's edges, the
 * glide after a throw, a reorder, and where each example PDF page lies in the stack or the fan.
 * No DOM here, so it is unit tested (desk-physics.test.ts).
 */

/** An allowed interval for one axis of an offset, in px. */
export interface Range {
  min: number;
  max: number;
}

/** One axis of a moving object: offset (px) and velocity (px/ms). */
export interface Axis {
  x: number;
  v: number;
}

/**
 * Rubber band: how far an overshoot of `over` px is shown, for a free length `dim`. The further past
 * the edge, the less it moves; it never reaches `dim`. (The iOS scroll-view formula.)
 */
export function rubberband(over: number, dim: number, c = 0.55): number {
  if (over === 0 || dim <= 0) return 0;
  const o = Math.abs(over);
  return Math.sign(over) * (1 - 1 / ((o * c) / dim + 1)) * dim;
}

/** The position shown for a raw (pointer) position: free inside the range, with friction past it. */
export function resist(raw: number, r: Range, dim: number): number {
  if (raw < r.min) return r.min + rubberband(raw - r.min, dim);
  if (raw > r.max) return r.max + rubberband(raw - r.max, dim);
  return raw;
}

/** Friction inside the desk: velocity kept per ms (0.998 is the iOS "normal" deceleration). */
const DECAY = 0.996;
/** Past an edge: a critically damped spring pulls the object back, so it slows, then returns. */
const OMEGA = 0.014; // rad/ms: settles back in about 350 ms
const STEP = 4; // ms per integration sub-step, for stability on slow frames

/** Advance one axis by `dt` ms of glide. */
export function glide(a: Axis, r: Range, dt: number): Axis {
  let { x, v } = a;
  for (let left = dt; left > 0; left -= STEP) {
    const h = Math.min(STEP, left);
    const edge = x < r.min ? r.min : x > r.max ? r.max : null;
    if (edge === null) {
      v *= DECAY ** h;
    } else {
      const acc = -OMEGA * OMEGA * (x - edge) - 2 * OMEGA * v;
      v += acc * h;
    }
    x += v * h;
  }
  return { x, v };
}

/** True when the axis has stopped inside its range (within half a pixel of an edge counts). */
export function settled(a: Axis, r: Range): boolean {
  return Math.abs(a.v) < 0.01 && a.x >= r.min - 0.5 && a.x <= r.max + 0.5;
}

export const clamp = (x: number, min: number, max: number): number => Math.min(max, Math.max(min, x));

/** A copy of `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from === to || from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(clamp(to, 0, out.length), 0, item as T);
  return out;
}

/** Where a page lies: translate in % of its own size, rotation in degrees. */
export interface Pose {
  x: number;
  y: number;
  r: number;
}

/** Stacked: a loose pile, slot 0 on top. */
const PILE: Pose[] = [
  { x: 0, y: 0, r: 0 },
  { x: -5, y: 3, r: -6 },
  { x: 4, y: 2, r: 4 },
  { x: -1, y: 4, r: -2 },
];
/** Fanned: a hand of cards turning about the bottom centre of each page. */
export const FAN_SPREAD = 30; // % of the page width between neighbouring pages
export const FAN_TURN = 13; // degrees between neighbouring pages

export function pagePose(slot: number, count: number, open: boolean): Pose {
  if (!open) return PILE[slot % PILE.length] ?? { x: 0, y: 0, r: 0 };
  const k = slot - (count - 1) / 2;
  return { x: k * FAN_SPREAD, y: Math.abs(k) * 5, r: k * FAN_TURN };
}

/**
 * Horizontal centre of a fanned page, in px from the centre of the stack, for a page of `w` x `h`
 * turning about its bottom centre.
 */
export function fanCentre(slot: number, count: number, w: number, h: number): number {
  const p = pagePose(slot, count, true);
  return (p.x / 100) * w + Math.sin((p.r * Math.PI) / 180) * (h / 2);
}

/** Left and right extent of the whole fan, in px from the stack's left edge. */
export function fanExtent(count: number, w: number, h: number): { left: number; right: number } {
  let left = 0;
  let right = w;
  for (let s = 0; s < count; s++) {
    const p = pagePose(s, count, true);
    const a = (p.r * Math.PI) / 180;
    const ox = w / 2 + (p.x / 100) * w; // bottom centre after the translate
    for (const [cx, cy] of [
      [-w / 2, 0],
      [w / 2, 0],
      [-w / 2, -h],
      [w / 2, -h],
    ] as const) {
      const x = ox + cx * Math.cos(a) - cy * Math.sin(a);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  return { left, right };
}

/** The fan slot nearest to a horizontal position (px from the stack's centre). */
export function nearestSlot(px: number, count: number, w: number, h: number): number {
  let best = 0;
  let dist = Infinity;
  for (let s = 0; s < count; s++) {
    const d = Math.abs(fanCentre(s, count, w, h) - px);
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best;
}
