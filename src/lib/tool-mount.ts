/**
 * Client-side: finds [data-tool-root] elements rendered by src/pages/[tool].astro and
 * lazily imports the matching src/tools/<id>/client.ts (one chunk per tool).
 */
import { interpolate } from "../i18n/interpolate";
import type { Locale, ToolCtx, ToolLimits } from "../tools/types";

/** Every src/tools/<id>/client.ts must export `mount` with this signature (optionally returning a cleanup). */
export type MountFn = (el: HTMLElement, ctx: ToolCtx) => void | (() => void) | Promise<void | (() => void)>;

const loaders = import.meta.glob<{ mount: MountFn }>("../tools/*/client.ts");

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
    const { mount } = await load();
    el.replaceChildren();
    await mount(el, ctx);
    el.dataset.mounted = "true";
  }
}
