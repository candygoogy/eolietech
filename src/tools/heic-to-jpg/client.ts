import type { ToolCtx } from "../types";

/** PLACEHOLDER: the heic-to-jpg agent replaces this with the real tool UI (vanilla TS). */
export function mount(el: HTMLElement, ctx: ToolCtx): void {
  const p = document.createElement("p");
  p.textContent = ctx.t("stub.comingSoon");
  el.append(p);
}
