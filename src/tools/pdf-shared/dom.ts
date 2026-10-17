/**
 * Small DOM helpers for the PDF tool islands. No inline style attributes (CSP: style-src 'self');
 * everything uses the class contract from src/lib/tool-ui.ts.
 */
import type { ToolCtx } from "../types";
import { PdfToolError } from "./pdf-errors";

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

export function button(label: string, opts: { variant?: "primary" | "ghost"; ariaLabel?: string; onClick?: () => void } = {}): HTMLButtonElement {
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
 * Disable a button that sits inside a draggable item. Firefox does not dispatch drag events to
 * disabled form controls, so a drop landing on one would be lost; let pointer events fall through
 * to the item instead (inline style set from JS is allowed by the CSP).
 */
export function setDisabled(b: HTMLButtonElement, disabled: boolean): void {
  b.disabled = disabled;
  b.style.pointerEvents = disabled ? "none" : "";
}

/** Polite live region for progress / results. */
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

/** Translate any processing failure into a friendly message (keys live in each tool's `ui`). */
export function errorMessage(err: unknown, ctx: Pick<ToolCtx, "t">, name: string): string {
  if (err instanceof PdfToolError) return ctx.t(`pdf.error.${err.code}`, { name });
  console.error(err);
  return ctx.t("pdf.error.failed", { name });
}

export async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Move an array item from one index to another (returns a new array). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item as T);
  return out;
}

/**
 * Mouse/touchpad drag-and-drop reordering for the `.tool-item` children of `list`.
 * Keyboard users get explicit move buttons on each item (rendered by the tool); this only adds
 * pointer dragging. Items need `data-index` set to their current position.
 */
export function enableDragSort(list: HTMLElement, onMove: (from: number, to: number) => void): void {
  let dragFrom = -1;
  const itemOf = (e: Event) => (e.target as HTMLElement | null)?.closest<HTMLElement>(".tool-item[data-index]");

  list.addEventListener("dragstart", (e) => {
    const item = itemOf(e);
    if (!item) return;
    dragFrom = Number(item.dataset.index);
    item.dataset.dragging = "";
    e.dataTransfer?.setData("text/plain", String(dragFrom));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragover", (e) => {
    if (dragFrom < 0) return;
    const item = itemOf(e);
    if (!item) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    for (const el of list.querySelectorAll<HTMLElement>("[data-drop-target]")) delete el.dataset.dropTarget;
    item.dataset.dropTarget = "";
  });
  list.addEventListener("drop", (e) => {
    const item = itemOf(e);
    if (dragFrom < 0 || !item) return;
    e.preventDefault();
    const to = Number(item.dataset.index);
    const from = dragFrom;
    dragFrom = -1;
    if (from !== to) onMove(from, to);
  });
  list.addEventListener("dragend", () => {
    dragFrom = -1;
    for (const el of list.querySelectorAll<HTMLElement>("[data-dragging],[data-drop-target]")) {
      delete el.dataset.dragging;
      delete el.dataset.dropTarget;
    }
  });
}

/** "report.pdf" -> "report". */
export const baseName = (filename: string): string => filename.replace(/\.pdf$/i, "") || "document";

export const pdfBlob = (bytes: Uint8Array): Blob => new Blob([bytes as BlobPart], { type: "application/pdf" });
