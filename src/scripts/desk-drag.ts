/**
 * Pick the desk's paper objects up and move them (home, Desk.astro; styles: desk-play.css).
 *
 * Mouse and pen: a press becomes a drag after 5 px of travel, so a plain click still reaches the
 * object's own demo. Touch: a long press (320 ms, finger still) picks the object up; any earlier
 * movement is left to the browser, so a swipe that starts on an object always scrolls the page.
 * While held: pointer capture, friction past the desk's edges (rubber band), a slight swing with the
 * movement. On release the object keeps its speed and slows down; thrown past an edge it is pulled
 * back. A drag ends without the click that would otherwise follow it. Positions are not saved;
 * "tidy the desk" puts everything back. Reduced motion: no swing, no glide, instant tidy.
 * Keyboard users have no drag: every demo works from the keyboard.
 */
import { clamp, glide, resist, settled, type Range } from "./desk-physics";

const THRESHOLD = 5; // px before a mouse press becomes a drag
const HOLD_MS = 320; // touch: how long to hold still before the object is picked up
const SLOP = 8; // touch: movement that cancels the long press (it is a scroll)
const MAX_SPEED = 3; // px/ms

interface Pos {
  x: number;
  y: number;
  vx: number;
  vy: number;
  raf: number;
}

interface Hold {
  el: HTMLElement;
  id: number;
  touch: boolean;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  mode: "wait" | "pending" | "held";
  timer: number;
  samples: { t: number; x: number; y: number }[];
  box: { x: Range; y: Range; w: number; h: number } | null;
}

const pile = document.querySelector<HTMLElement>(".pile");
const tidy = document.querySelector<HTMLButtonElement>(".desk-tidy");
if (pile) init(pile, tidy);

function init(pile: HTMLElement, tidy: HTMLButtonElement | null): void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const objs = [...pile.querySelectorAll<HTMLElement>(":scope > .obj")];
  const pos = new Map<HTMLElement, Pos>(objs.map((el) => [el, { x: 0, y: 0, vx: 0, vy: 0, raf: 0 }]));
  const noClick = new WeakSet<HTMLElement>();
  let top = 10;
  let hold: Hold | null = null;

  const place = (el: HTMLElement, p: Pos) => {
    el.style.setProperty("--dx", `${p.x.toFixed(1)}px`);
    el.style.setProperty("--dy", `${p.y.toFixed(1)}px`);
  };

  const stop = (el: HTMLElement, p: Pos) => {
    cancelAnimationFrame(p.raf);
    p.raf = 0;
    p.vx = p.vy = 0;
    delete el.dataset.gliding;
  };

  /** What an object covers on screen: its paper, label and stamps. */
  const extent = (el: HTMLElement) =>
    [el, ...el.children].reduce(
      (acc, node) => {
        const b = node.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) return acc;
        return { l: Math.min(acc.l, b.left), t: Math.min(acc.t, b.top), r: Math.max(acc.r, b.right), b: Math.max(acc.b, b.bottom) };
      },
      { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity },
    );

  /** Allowed offsets: the object, its label and stamps stay on the desk (or where they already are). */
  const bounds = (el: HTMLElement, p: Pos) => {
    const d = pile.getBoundingClientRect();
    const r = extent(el);
    const axis = (v: number, lo: number, hi: number): Range => {
      const min = Math.min(v, v + lo);
      const max = Math.max(v, v + hi);
      return min <= max ? { min, max } : { min: (min + max) / 2, max: (min + max) / 2 };
    };
    return { x: axis(p.x, d.left - r.l, d.right - r.r), y: axis(p.y, d.top - r.t, d.bottom - r.b), w: d.width, h: d.height };
  };

  /**
   * Wide screens lay the intro (lede and buttons) over the desk. An object may pass under it, but one
   * left there slides out, to the right or below, whichever is nearer, so the words stay readable.
   * Returns true when the allowed range had to change.
   */
  const intro = document.querySelector<HTMLElement>(".desk__intro");
  const clearOfIntro = (el: HTMLElement, p: Pos, box: { x: Range; y: Range }): boolean => {
    if (!intro) return false;
    const i = intro.getBoundingClientRect();
    const r = extent(el);
    if (r.r <= i.left || r.l >= i.right || r.b <= i.top || r.t >= i.bottom) return false;
    const gap = 12;
    const right = p.x + (i.right + gap - r.l);
    const below = p.y + (i.bottom + gap - r.t);
    const canRight = right <= box.x.max;
    const canBelow = below <= box.y.max;
    if (canRight && (!canBelow || right - p.x <= below - p.y)) box.x.min = Math.max(box.x.min, right);
    else if (canBelow) box.y.min = Math.max(box.y.min, below);
    else return false;
    return true;
  };

  const pickUp = (h: Hold) => {
    clearTimeout(h.timer);
    const p = pos.get(h.el);
    if (!p) return;
    h.mode = "held";
    h.box = bounds(h.el, p);
    try {
      h.el.setPointerCapture(h.id);
    } catch {
      /* the pointer is already gone */
    }
    h.el.dataset.held = "";
    h.el.style.zIndex = String(++top);
    window.getSelection()?.removeAllRanges();
    if (h.touch) navigator.vibrate?.(8);
    if (tidy) tidy.hidden = false;
  };

  const release = (h: Hold, cancelled: boolean) => {
    const { el, box } = h;
    const p = pos.get(el);
    delete el.dataset.held;
    el.style.removeProperty("--swing");
    if (!p || !box) return;
    noClick.add(el);
    window.setTimeout(() => noClick.delete(el), 400);

    const now = performance.now();
    const recent = h.samples.filter((s) => now - s.t < 100);
    const a = recent[0];
    const b = recent[recent.length - 1];
    const dt = a && b ? b.t - a.t : 0;
    const still = !b || now - b.t > 60; // the hand stopped before letting go
    p.vx = cancelled || still || dt < 8 || !a || !b ? 0 : clamp((b.x - a.x) / dt, -MAX_SPEED, MAX_SPEED);
    p.vy = cancelled || still || dt < 8 || !a || !b ? 0 : clamp((b.y - a.y) / dt, -MAX_SPEED, MAX_SPEED);

    clearOfIntro(el, p, box);
    if (reduce.matches) {
      p.x = clamp(p.x, box.x.min, box.x.max);
      p.y = clamp(p.y, box.y.min, box.y.max);
      place(el, p);
      return;
    }
    el.dataset.gliding = "";
    let last = performance.now();
    const step = (t: number) => {
      const ms = Math.min(48, t - last);
      last = t;
      const ax = glide({ x: p.x, v: p.vx }, box.x, ms);
      const ay = glide({ x: p.y, v: p.vy }, box.y, ms);
      p.x = ax.x;
      p.vx = ax.v;
      p.y = ay.x;
      p.vy = ay.v;
      if (settled(ax, box.x) && settled(ay, box.y)) {
        p.x = clamp(p.x, box.x.min, box.x.max);
        p.y = clamp(p.y, box.y.min, box.y.max);
        place(el, p);
        if (clearOfIntro(el, p, box)) {
          // It came to rest under the intro (thrown there): let the edge spring carry it out.
          p.raf = requestAnimationFrame(step);
          return;
        }
        stop(el, p);
        return;
      }
      place(el, p);
      p.raf = requestAnimationFrame(step);
    };
    p.raf = requestAnimationFrame(step);
  };

  const end = (e: PointerEvent) => {
    const h = hold;
    if (!h || e.pointerId !== h.id) return;
    hold = null;
    clearTimeout(h.timer);
    if (h.mode === "held") release(h, e.type === "pointercancel");
  };

  for (const el of objs) {
    el.addEventListener("pointerdown", (e) => {
      if (hold || !e.isPrimary || e.button !== 0) return;
      if ((e.target as Element).closest("input, select, textarea, [data-own-drag]")) return;
      const p = pos.get(el);
      if (!p) return;
      stop(el, p); // catch it mid-slide
      if ("tidying" in el.dataset) {
        // Caught on its way back: carry on from where it is now, not from where it was going.
        const [tx = 0, ty = 0] = getComputedStyle(el).translate.split(" ").map(Number.parseFloat);
        const fan = Number.parseFloat(el.style.getPropertyValue("--fan")) || 0;
        p.x = (Number.isFinite(tx) ? tx : 0) - fan;
        p.y = Number.isFinite(ty) ? ty : 0;
        delete el.dataset.tidying;
        el.style.removeProperty("transition-delay");
        place(el, p);
      }
      const touch = e.pointerType === "touch";
      hold = {
        el,
        id: e.pointerId,
        touch,
        sx: e.clientX,
        sy: e.clientY,
        ox: p.x,
        oy: p.y,
        mode: touch ? "wait" : "pending",
        timer: 0,
        samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
        box: null,
      };
      if (touch) {
        const h = hold;
        h.timer = window.setTimeout(() => hold === h && pickUp(h), HOLD_MS);
      }
    });

    // Once picked up by a long press, the finger moves the object, not the page.
    el.addEventListener(
      "touchmove",
      (e) => {
        if (hold?.el === el && hold.mode === "held" && e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
    el.addEventListener("contextmenu", (e) => {
      if (hold?.el === el && hold.touch) e.preventDefault();
    });
    el.addEventListener("dragstart", (e) => e.preventDefault());

    // A drag ends without the click that would follow it (the postcard's picker, the memo's play...).
    el.addEventListener(
      "click",
      (e) => {
        if (!noClick.has(el)) return;
        noClick.delete(el);
        e.stopImmediatePropagation();
        e.preventDefault();
      },
      true,
    );
  }

  window.addEventListener("pointermove", (e) => {
    const h = hold;
    if (!h || e.pointerId !== h.id) return;
    const dx = e.clientX - h.sx;
    const dy = e.clientY - h.sy;
    if (h.mode === "wait") {
      if (Math.hypot(dx, dy) > SLOP) {
        clearTimeout(h.timer);
        hold = null; // a scroll: the browser has it
      }
      return;
    }
    if (h.mode === "pending") {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      pickUp(h);
    }
    const p = pos.get(h.el);
    if (!p || !h.box) return;
    p.x = resist(h.ox + dx, h.box.x, h.box.w);
    p.y = resist(h.oy + dy, h.box.y, h.box.h);
    place(h.el, p);
    const now = performance.now();
    const prev = h.samples[h.samples.length - 1];
    h.samples.push({ t: now, x: e.clientX, y: e.clientY });
    if (h.samples.length > 12) h.samples.shift();
    if (!reduce.matches && prev && now > prev.t) {
      // Held by one point, paper swings a little with the movement.
      const vx = (e.clientX - prev.x) / (now - prev.t);
      h.el.style.setProperty("--swing", `${clamp(vx * 2.5, -5, 5).toFixed(2)}deg`);
    }
  });
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);

  /* Tidy the desk: everything back where it started. */
  const settle = () => {
    for (const el of objs) {
      delete el.dataset.tidying;
      el.style.removeProperty("transition-delay");
      if (el.style.zIndex && Number(el.style.zIndex) < 60) el.style.removeProperty("z-index");
    }
    top = 10;
  };
  let settleTimer = 0;
  const reset = (animate: boolean) => {
    clearTimeout(settleTimer);
    objs.forEach((el, i) => {
      const p = pos.get(el);
      if (!p) return;
      stop(el, p);
      if (p.x === 0 && p.y === 0) return;
      if (animate) {
        el.dataset.tidying = "";
        el.style.transitionDelay = `${i * 40}ms`;
      }
      p.x = p.y = 0;
      place(el, p);
    });
    if (animate) settleTimer = window.setTimeout(settle, 760);
    else settle();
    if (tidy) {
      const hadFocus = document.activeElement === tidy;
      tidy.hidden = true;
      if (hadFocus) {
        pile.tabIndex = -1;
        pile.focus({ preventScroll: true });
      }
    }
  };
  tidy?.addEventListener("click", () => reset(!reduce.matches));

  // Offsets are in px; when the desk changes size, start again from a tidy desk.
  let width = pile.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(pile.clientWidth - width) < 1) return;
    width = pile.clientWidth;
    hold = null;
    reset(false);
  }).observe(pile);
}
