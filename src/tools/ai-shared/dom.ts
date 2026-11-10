/**
 * Small DOM helpers for the AI tool islands (no inline styles: the CSP has style-src 'self').
 * Markup follows the class contract in src/lib/tool-ui.ts.
 */
type Attrs = Record<string, string | number | boolean | undefined>;

/** Create an element: attributes (false/undefined skipped, true = empty attribute), then children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "className") el.className = String(v);
    else if (k === "text") el.textContent = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function button(
  label: string,
  opts: { variant?: "primary" | "ghost"; ariaLabel?: string; onClick?: () => void } = {},
): HTMLButtonElement {
  const b = h("button", {
    type: "button",
    className: opts.variant ? `btn btn--${opts.variant}` : "btn",
    "aria-label": opts.ariaLabel,
    text: label,
  });
  if (opts.onClick) b.addEventListener("click", opts.onClick);
  return b;
}

/**
 * Polite live region for progress and results. `set` shows and announces a message. `quiet` is for
 * text that changes many times a second (download bytes): it updates what is seen, hidden from
 * screen readers, and announces `spoken` only when that changes (pass "" to stay silent).
 */
export function statusRegion(): {
  el: HTMLParagraphElement;
  set: (msg: string) => void;
  quiet: (visible: string, spoken: string) => void;
} {
  const el = h("p", { className: "tool-note", role: "status", "aria-live": "polite" });
  const seen = h("span", { "aria-hidden": "true" });
  const heard = h("span", { className: "visually-hidden" });
  return {
    el,
    set: (msg) => (el.textContent = msg),
    quiet(visible, spoken) {
      if (seen.parentNode !== el) {
        heard.textContent = "";
        el.replaceChildren(seen, heard);
      }
      seen.textContent = visible;
      if (heard.textContent !== spoken) heard.textContent = spoken;
    },
  };
}

/** `.tool-error` with role="alert", hidden while empty. */
export function errorRegion(): { el: HTMLDivElement; show: (msg: string | string[]) => void; clear: () => void } {
  const el = h("div", { className: "tool-error", role: "alert", hidden: true });
  return {
    el,
    show(msg) {
      const lines = Array.isArray(msg) ? msg : [msg];
      el.replaceChildren(...lines.map((line) => h("p", { text: line })));
      el.hidden = lines.length === 0;
    },
    clear() {
      el.replaceChildren();
      el.hidden = true;
    },
  };
}

