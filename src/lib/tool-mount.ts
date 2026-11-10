/**
 * Client-side: finds [data-tool-root] elements rendered by src/pages/[tool].astro and
 * lazily imports the matching src/tools/<id>/client.ts (one chunk per tool).
 */
import { interpolate } from "../i18n/interpolate";
import type { Locale, ToolCtx, ToolLimits } from "../tools/types";
import { isChunkLoadError } from "./tool-ui";

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

type Cleanup = () => void;

/** A mounted tool: its root, the context it was mounted with and the cleanup its `mount` returned. */
interface Mounted {
  el: HTMLElement;
  ctx: ToolCtx;
  mount: MountFn;
  cleanup?: Cleanup;
}

const mounted: Mounted[] = [];
let listening = false;

/** Runs a tool's `mount` on an emptied root and keeps the cleanup it returns. */
async function run(entry: Mounted): Promise<void> {
  // Replaces the server-rendered loading shell (same reserved height, see tool.css).
  entry.el.replaceChildren();
  delete entry.el.dataset.mountError;
  const cleanup = await entry.mount(entry.el, entry.ctx);
  entry.cleanup = typeof cleanup === "function" ? cleanup : undefined;
}

/** Shows, in the tool's slot, that the page needs a reload (or a connection) to go on. */
function showReload(el: HTMLElement, err: unknown, keepTool: boolean): void {
  if (el.querySelector("[data-tool-reload]")) return;
  const t = (key: string) => readJson<Record<string, string>>(el.dataset.strings, {})[key] ?? key;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const message = document.createElement("p");
  message.className = "tool-error";
  message.setAttribute("role", "alert");
  message.textContent = t(offline ? "tool.offline" : isChunkLoadError(err) ? "tool.updated" : "tool.failed");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn--primary";
  button.textContent = t("tool.reload");
  button.addEventListener("click", () => location.reload());
  const actions = document.createElement("div");
  actions.className = "tool-actions";
  actions.append(button);
  const notice = document.createElement("div");
  notice.className = "tool";
  notice.dataset.toolReload = "";
  notice.append(message, actions);
  // A tool that is already up keeps its work on screen (finished downloads still work); the notice
  // goes on top. A tool that never mounted gets the notice instead of the loading shell.
  if (keepTool) el.prepend(notice);
  else el.replaceChildren(notice);
  el.dataset.mountError = "";
}

/**
 * Page lifecycle, once per page: a chunk that fails to load later (a tool's lazy library, after a
 * deploy removed it) shows the reload notice; leaving the page runs each tool's cleanup
 * (workers stopped, object URLs revoked, typed passwords cleared); a page restored from the
 * back/forward cache gets its tools mounted again, fresh.
 */
function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("vite:preloadError", (event) => {
    const err = (event as Event & { payload?: unknown }).payload;
    for (const { el } of mounted) showReload(el, err ?? new Error("Unable to preload CSS"), true);
  });
  // The same for a lazy import a tool does not catch (e.g. the zip library behind "Download all").
  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    for (const { el } of mounted) showReload(el, event.reason, true);
  });
  window.addEventListener("pagehide", () => {
    for (const entry of mounted) {
      const cleanup = entry.cleanup;
      entry.cleanup = undefined;
      try {
        cleanup?.();
      } catch (err) {
        console.error(`[eolietech] cleanup of "${entry.ctx.toolId}" failed`, err);
      }
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    for (const entry of mounted) {
      delete entry.el.dataset.settled;
      run(entry)
        .then(() => setTimeout(() => (entry.el.dataset.settled = ""), SETTLE_MS))
        .catch((err) => {
          console.error(`[eolietech] could not mount "${entry.ctx.toolId}" again`, err);
          showReload(entry.el, err, false);
        });
    }
  });
}

export async function mountTools(root: ParentNode = document): Promise<void> {
  listen();
  const els = root.querySelectorAll<HTMLElement>("[data-tool-root]");
  // The loading line is server-rendered hidden, so with JavaScript off only the noscript note shows.
  for (const el of els) el.querySelector<HTMLElement>(".tool-shell__status")?.removeAttribute("hidden");
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
    try {
      const { mount, styles } = await load();
      // The shell stays up until the tool's stylesheet is in, so the first render is already styled.
      if (styles) await loadStyles(styles);
      const entry: Mounted = { el, ctx, mount };
      await run(entry);
      mounted.push(entry);
    } catch (err) {
      // A chunk deleted by a newer deploy, no network, or a tool that throws while mounting: without
      // this the page would say "Loading the tool..." forever.
      console.error(`[eolietech] could not mount "${toolId}"`, err);
      showReload(el, err, false);
      continue;
    }
    el.dataset.mounted = "true";
    // The mount fade (tool.css) runs while data-settled is absent; after it, panels that appear
    // from [hidden] get their own entry transition. Set later so the two never overlap.
    setTimeout(() => (el.dataset.settled = ""), SETTLE_MS);
  }
}
