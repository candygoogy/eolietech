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

/** Polite live region for progress and results. */
export function statusRegion(): { el: HTMLParagraphElement; set: (msg: string) => void } {
  const el = h("p", { className: "tool-note", role: "status", "aria-live": "polite" });
  return { el, set: (msg) => (el.textContent = msg) };
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

