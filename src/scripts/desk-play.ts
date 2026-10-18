/**
 * The playable examples on the home desk (Desk.astro; styles: desk-play.css). Each is an
 * illustration labelled "example": no file of the visitor's is involved and nothing is fetched.
 *
 * - Lemon: a real range input over the picture drives clip-path on the "original photo" layer.
 * - Voice memo: play runs the waveform progress (WAAPI, linear, 4 s) and lets the example transcript
 *   appear line by line under the card; pause and replay work. Reduced motion: all at once.
 * - PDF: the stack fans out like a hand of cards; pages are reordered by dragging (pointer capture),
 *   by Alt + arrow keys or by the two buttons; page numbers follow, and each move is announced.
 *
 * Controls are rendered `hidden` and shown here, so without JS the desk is a still picture.
 */
import { interpolate } from "../i18n/interpolate";
import { clamp, fanCentre, fanExtent, moveItem, nearestSlot, pagePose } from "./desk-physics";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- lemon: before / after ---------- */
function lemon(root: HTMLElement): void {
  const range = root.querySelector<HTMLInputElement>(".wipe__range");
  const before = root.querySelector<HTMLElement>(".wipe__before");
  const line = root.querySelector<HTMLElement>(".wipe__line");
  if (!range || !before || !line) return;
  const tpl = range.dataset.valuetext ?? "";
  const show = () => {
    const v = clamp(Number(range.value), 0, 100);
    before.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    line.style.transform = `translateX(${v}%)`;
    range.setAttribute("aria-valuetext", interpolate(tpl, { before: v, after: 100 - v }));
  };
  range.hidden = false;
  range.addEventListener("input", show);
  show();
}

/* ---------- voice memo: play, pause, replay ---------- */
const MEMO_MS = 4000;
const LINE_AT = [450, 1650, 2850]; // ms into the memo when each transcript line is heard
const PLAYED_FROM = "inset(0 73.08% 0 0)"; // the bars span x 70..248 of the 260-wide card
const PLAYED_TO = "inset(0 4.62% 0 0)";

function memo(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>(".memo__play");
  const played = root.querySelector<HTMLElement>(".memo__played");
  const run = root.querySelector<HTMLElement>(".memo__run");
  const desc = root.querySelector<HTMLElement>(".memo__desc");
  const transcript = root.querySelector<HTMLElement>(".memo__transcript");
  const lines = [...root.querySelectorAll<HTMLLIElement>(".memo__transcript > li")];
  if (!btn || !played || !run || !transcript) return;
  let anims: Animation[] = [];
  let raf = 0;

  const setState = (s: "idle" | "playing" | "paused" | "done") => {
    btn.dataset.state = s;
    const label = s === "playing" ? btn.dataset.labelPause : s === "done" ? btn.dataset.labelReplay : btn.dataset.labelPlay;
    if (label) btn.setAttribute("aria-label", label);
  };
  const reveal = (ms: number) => lines.forEach((li, i) => ms >= (LINE_AT[i] ?? 0) && (li.hidden = false));
  const tick = () => {
    reveal(Number(anims[0]?.currentTime ?? 0));
    if (btn.dataset.state === "playing") raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    cancelAnimationFrame(raf);
    reveal(Infinity);
    setState("done");
  };
  const start = () => {
    anims.forEach((a) => a.cancel());
    anims = [];
    lines.forEach((li) => (li.hidden = true));
    if (desc) desc.hidden = true;
    if (reduce.matches) {
      // No travel: the memo is simply heard, and the whole transcript is there.
      played.style.clipPath = PLAYED_TO;
      run.style.transform = "translateX(100%)";
      finish();
      return;
    }
    played.style.clipPath = "";
    run.style.transform = "";
    const timing: KeyframeAnimationOptions = { duration: MEMO_MS, easing: "linear", fill: "forwards" };
    anims = [
      played.animate([{ clipPath: PLAYED_FROM }, { clipPath: PLAYED_TO }], timing),
      run.animate([{ transform: "translateX(0%)" }, { transform: "translateX(100%)" }], timing),
    ];
    anims[0]?.addEventListener("finish", finish);
    setState("playing");
    raf = requestAnimationFrame(tick);
  };

  btn.hidden = false;
  btn.addEventListener("click", () => {
    const s = btn.dataset.state;
    if (s === "playing") {
      anims.forEach((a) => a.pause());
      cancelAnimationFrame(raf);
      setState("paused");
    } else if (s === "paused") {
      anims.forEach((a) => a.play());
      setState("playing");
      raf = requestAnimationFrame(tick);
    } else {
      start();
    }
  });
}

/* ---------- PDF: fan out, reorder ---------- */
function pdf(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>(".pdf__pages");
  const openBtn = root.querySelector<HTMLButtonElement>(".pdf__open");
  const tools = root.querySelector<HTMLElement>(".pdf__tools");
  const closeBtn = root.querySelector<HTMLButtonElement>(".pdf__close");
  const moveBtns = [...root.querySelectorAll<HTMLButtonElement>(".pdf__move")];
  const status = root.querySelector<HTMLElement>(".pdf__status");
  const pile = root.closest<HTMLElement>(".pile");
  if (!list || !openBtn || !tools || !closeBtn || !status || !pile) return;
  const pageTpl = root.dataset.labelPage ?? "";
  const movedTpl = root.dataset.labelMoved ?? "";
  let order = [...list.querySelectorAll<HTMLElement>(".pdf__page")];
  const total = order.length;
  let open = false;
  let sel = order[0] as HTMLElement;
  let zBefore = "";

  /** Put every page where its slot says; `instant` for keyboard moves (no animation). */
  const layout = (instant = false) => {
    root.toggleAttribute("data-instant", instant || reduce.matches);
    order.forEach((el, slot) => {
      if (!("dragging" in el.dataset)) {
        const p = pagePose(slot, total, open);
        const lift = open && el === sel ? -6 : 0;
        el.style.transform = `translate(${p.x}%, ${p.y + lift}%) rotate(${p.r}deg)`;
      }
      el.style.zIndex = String(open ? (el === sel ? total + 1 : slot + 1) : total - slot);
      el.style.transitionDelay = open && !instant ? `${slot * 30}ms` : "0ms";
      const num = el.querySelector(".pdf__num");
      if (num) num.textContent = String(slot + 1);
      el.setAttribute("aria-label", interpolate(pageTpl, { n: slot + 1, total, name: el.dataset.name ?? "" }));
      el.setAttribute("aria-posinset", String(slot + 1));
      el.setAttribute("aria-setsize", String(total));
      el.tabIndex = open && el === sel ? 0 : -1;
      el.toggleAttribute("data-selected", open && el === sel);
    });
    const at = order.indexOf(sel);
    moveBtns.forEach((b) => b.setAttribute("aria-disabled", String(Number(b.dataset.move) < 0 ? at <= 0 : at >= total - 1)));
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-instant")));
  };

  /** Slide the whole object sideways so the open fan stays on the desk. */
  const fit = () => {
    if (!open) {
      root.style.setProperty("--fan", "0px");
      return;
    }
    const w = list.offsetWidth;
    const h = list.offsetHeight;
    const ext = fanExtent(total, w, h);
    const dx = Number.parseFloat(root.style.getPropertyValue("--dx")) || 0;
    const left = root.offsetLeft + dx + ext.left;
    const right = root.offsetLeft + dx + ext.right;
    const room = pile.clientWidth;
    const pad = 4;
    let shift = 0;
    if (right - left > room - 2 * pad) shift = (room - (left + right)) / 2;
    else if (left < pad) shift = pad - left;
    else if (right > room - pad) shift = room - pad - right;
    root.style.setProperty("--fan", `${Math.round(shift)}px`);
  };

  const setOpen = (v: boolean) => {
    open = v;
    root.toggleAttribute("data-open", v);
    openBtn.hidden = v;
    openBtn.setAttribute("aria-expanded", String(v));
    tools.hidden = !v;
    list.toggleAttribute("data-own-drag", v);
    if (v) {
      zBefore = root.style.zIndex;
      root.style.zIndex = "60";
      sel = order[0] as HTMLElement;
    } else {
      root.style.zIndex = zBefore;
    }
    fit();
    layout();
  };

  const move = (el: HTMLElement, to: number, instant: boolean) => {
    const from = order.indexOf(el);
    const target = clamp(to, 0, total - 1);
    if (from === target) return;
    order = moveItem(order, from, target);
    sel = el;
    layout(instant);
    status.textContent = interpolate(movedTpl, { name: el.dataset.name ?? "", n: target + 1, total });
  };

  openBtn.hidden = false;
  openBtn.addEventListener("click", () => {
    setOpen(true);
    sel.focus({ preventScroll: true });
  });
  closeBtn.addEventListener("click", () => {
    setOpen(false);
    openBtn.focus({ preventScroll: true });
  });
  moveBtns.forEach((b) =>
    b.addEventListener("click", () => {
      if (b.getAttribute("aria-disabled") === "true") return;
      move(sel, order.indexOf(sel) + Number(b.dataset.move), false);
    }),
  );

  list.addEventListener("keydown", (e) => {
    if (!open) return;
    const el = (e.target as Element).closest<HTMLElement>(".pdf__page");
    if (!el) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      openBtn.focus({ preventScroll: true });
      return;
    }
    const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
    const at = order.indexOf(el);
    let to = dir ? at + dir : e.key === "Home" ? 0 : e.key === "End" ? total - 1 : -1;
    if (to < 0 && !dir) return;
    e.preventDefault(); // also keeps Alt + arrow from going back in history
    to = clamp(to, 0, total - 1);
    if (e.altKey) {
      move(el, to, true);
      el.focus({ preventScroll: true });
    } else {
      sel = order[to] as HTMLElement;
      layout(true);
      sel.focus({ preventScroll: true });
    }
  });

  /* Pointer: press a page to select it; drag it sideways to a new place. */
  let drag: { el: HTMLElement; id: number; x0: number; y0: number; from: number; moved: boolean } | null = null;
  list.addEventListener("pointerdown", (e) => {
    if (!open || drag || !e.isPrimary || e.button !== 0) return;
    const el = (e.target as Element).closest<HTMLElement>(".pdf__page");
    if (!el) return;
    sel = el;
    drag = { el, id: e.pointerId, x0: e.clientX, y0: e.clientY, from: order.indexOf(el), moved: false };
    el.setPointerCapture(e.pointerId);
    layout();
  });
  list.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      drag.el.dataset.dragging = "";
    }
    drag.el.style.translate = `${dx}px ${dy}px`;
    const w = list.offsetWidth;
    const h = list.offsetHeight;
    const target = nearestSlot(fanCentre(drag.from, total, w, h) + dx, total, w, h);
    const at = order.indexOf(drag.el);
    if (target !== at) {
      order = moveItem(order, at, target);
      layout();
    }
  });
  const drop = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { el, from, moved } = drag;
    drag = null;
    if (!moved) return;
    // Same frame: drop the pointer offset and set the new slot, so both glide in together.
    delete el.dataset.dragging;
    el.style.translate = "";
    layout();
    const to = order.indexOf(el);
    if (to !== from) status.textContent = interpolate(movedTpl, { name: el.dataset.name ?? "", n: to + 1, total });
  };
  list.addEventListener("pointerup", drop);
  list.addEventListener("pointercancel", drop);
  list.addEventListener("lostpointercapture", drop);

  // The fan is placed for the desk's current width; on a resize, put the pages back on the stack.
  let width = pile.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(pile.clientWidth - width) < 1) return;
    width = pile.clientWidth;
    if (open) setOpen(false);
  }).observe(pile);

  layout(true);
}

const lemonRoot = document.querySelector<HTMLElement>(".pile [data-lemon]");
const memoRoot = document.querySelector<HTMLElement>(".pile [data-memo]");
const pdfRoot = document.querySelector<HTMLElement>(".pile [data-pdf]");
if (lemonRoot) lemon(lemonRoot);
if (memoRoot) memo(memoRoot);
if (pdfRoot) pdf(pdfRoot);
