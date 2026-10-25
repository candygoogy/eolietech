/**
 * Client-side: finds [data-tool-root] elements rendered by src/pages/[tool].astro and
 * lazily imports the matching src/tools/<id>/client.ts (one chunk per tool).
 */
import { interpolate } from "../i18n/interpolate";
import type { Locale, ToolCtx, ToolLimits } from "../tools/types";

/** Every src/tools/<id>/client.ts must export `mount` with this signature (optionally returning a cleanup). */
export type MountFn = (el: HTMLElement, ctx: ToolCtx) => void | (() => void) | Promise<void | (() => void)>;

/**
 * A tool's client chunk. A tool with its own stylesheet exports its URL as `styles` (a `?url` import)
 * instead of importing the CSS: imported CSS would be linked, render-blocking, on every tool page,
 * because this glob can reach every client.
 */
interface ToolModule {
  mount: MountFn;
  styles?: string;
}

const loaders = import.meta.glob<ToolModule>("../tools/*/client.ts");

/** Links a stylesheet once and resolves when it has loaded (or failed: the tool still mounts). */
function loadStyles(href: string): Promise<void> {
  const linked = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].some((l) => l.getAttribute("href") === href);
  if (linked) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
    document.head.append(link);
  });
}

/** Longer than the mount fade (--duration-base, 200ms). */
const SETTLE_MS = 300;

const readJson = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export async function mountTools(root: ParentNode = document): Promise<void> {
  const els = root.querySelectorAll<HTMLElement>("[data-tool-root]");
  for (const el of els) {
    const toolId = el.dataset.toolId ?? "";
    const load = loaders[`../tools/${toolId}/client.ts`];
    if (!load) {
      console.error(`[eolietech] no client for tool "${toolId}"`);
      continue;
    }
    const strings = readJson<Record<string, string>>(el.dataset.strings, {});
    const ctx: ToolCtx = {
      locale: (el.dataset.locale ?? "en") as Locale,
      t: (key, vars) => interpolate(strings[key] ?? key, vars),
      toolId,
      variantId: el.dataset.variantId || undefined,
      preset: readJson<Record<string, unknown>>(el.dataset.preset, {}),
      limits: readJson<ToolLimits>(el.dataset.limits, { maxBytes: 0, maxFiles: 0 }),
    };
    const { mount, styles } = await load();
    // The shell stays up until the tool's stylesheet is in, so the first render is already styled.
    if (styles) await loadStyles(styles);
    // Replaces the server-rendered loading shell (same reserved height, see tool.css).
    el.replaceChildren();
    await mount(el, ctx);
    el.dataset.mounted = "true";
    // The mount fade (tool.css) runs while data-settled is absent; after it, panels that appear
    // from [hidden] get their own entry transition. Set later so the two never overlap.
    setTimeout(() => (el.dataset.settled = ""), SETTLE_MS);
  }
}
