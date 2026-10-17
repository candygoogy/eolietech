/**
 * Tool registry types (Release 1).
 * Shared by the Astro build (pages) and, later, the Worker.
 */

export const LOCALES = ["en", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type Category = "image" | "pdf" | "audio";

/** Release 1 ships client-side tools only. "server" / "hybrid" are reserved for Release 2. */
export type Runtime = "client" | "server" | "hybrid";

/** "planned" tools are in the registry but get no page until flipped to "live". */
export type ToolStatus = "live" | "planned";

export interface ToolLimits {
  /** Max size of a single input file, in bytes (client-side sanity limit, not a quota). */
  maxBytes: number;
  /** Max number of files in one batch. */
  maxFiles: number;
  [k: string]: number;
}

export interface ToolVariant {
  /** Stable internal id, unique within the tool. Also names its content file: content.<id>.<locale>.md */
  id: string;
  slug: Partial<Record<Locale, string>> & { en: string };
  /** Preset passed to the tool's client via ToolCtx.preset. */
  preset: Record<string, unknown>;
}

export interface ToolDef {
  /** Stable internal id, never changes; also the folder name src/tools/<id>/. */
  id: string;
  slug: Partial<Record<Locale, string>> & { en: string };
  category: Category;
  runtime: Runtime;
  status: ToolStatus;
  wave: 1 | 2;
  /** Locales with reviewed content. A page (and hreflang) exists only for these. */
  locales: Locale[];
  limits: { free: ToolLimits };
  variants?: ToolVariant[];
  /** Ids of related tools. */
  related: string[];
  /** ISO date (YYYY-MM-DD), used for sitemap lastmod. */
  updated: string;
}

/**
 * Context handed to a tool's client island by the generic tool page. Every src/tools/<id>/client.ts
 * exports `mount(el: HTMLElement, ctx: ToolCtx)` (see MountFn in src/lib/tool-mount.ts).
 * This file stays DOM-free so the Worker can import the registry.
 */
export interface ToolCtx {
  locale: Locale;
  /** UI string lookup: the tool's own `ui` strings (content frontmatter; variant overrides base), then the site's shared `tool.*` strings. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  toolId: string;
  /** Variant id when mounted on a variant page. */
  variantId?: string;
  /** Variant preset ({} on the base page). */
  preset: Record<string, unknown>;
  limits: ToolLimits;
}

