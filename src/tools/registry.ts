import type { Locale, ToolDef, ToolVariant } from "./types";

const MiB = 1024 * 1024;

/** Image format conversion variant (preset consumed by the image-compress client). */
const convert = (from: string, to: string): ToolVariant => ({
  id: `${from}-to-${to}`,
  slug: { en: `${from}-to-${to}` },
  preset: { from, to },
});

export const tools: ToolDef[] = [
  {
    id: "image-compress",
    slug: { en: "compress-image" },
    category: "image",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    variants: [
      convert("webp", "png"),
      convert("webp", "jpg"),
      convert("png", "webp"),
      convert("jpg", "webp"),
      convert("png", "jpg"),
      convert("jpg", "png"),
      convert("png", "avif"),
      convert("jpg", "avif"),
      convert("avif", "jpg"),
      convert("avif", "png"),
    ],
    related: ["heic-to-jpg", "background-remover"],
    updated: "2026-10-17",
  },
  {
    id: "heic-to-jpg",
    slug: { en: "heic-to-jpg" },
    category: "image",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    related: ["image-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-merge",
    slug: { en: "merge-pdf" },
    category: "pdf",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 50 } },
    related: ["pdf-split", "pdf-organize", "pdf-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-split",
    slug: { en: "split-pdf" },
    category: "pdf",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    related: ["pdf-merge", "pdf-organize", "pdf-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-organize",
    slug: { en: "organize-pdf" },
    category: "pdf",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    related: ["pdf-merge", "pdf-split", "pdf-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-compress",
    slug: { en: "compress-pdf" },
    category: "pdf",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en"],
    limits: { free: { maxBytes: 200 * MiB, maxFiles: 10 } },
    related: ["pdf-merge", "pdf-split", "image-compress"],
    updated: "2026-10-17",
  },
  {
    id: "background-remover",
    slug: { en: "remove-background" },
    category: "image",
    runtime: "client",
    status: "planned",
    wave: 2,
    locales: ["en"],
    limits: { free: { maxBytes: 50 * MiB, maxFiles: 20 } },
    related: ["image-compress", "heic-to-jpg"],
    updated: "2026-10-17",
  },
  {
    id: "audio-transcribe",
    slug: { en: "transcribe-audio" },
    category: "audio",
    runtime: "client",
    status: "planned",
    wave: 2,
    locales: ["en"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    related: [],
    updated: "2026-10-17",
  },
];

export const getTool = (id: string): ToolDef | undefined => tools.find((t) => t.id === id);

/**
 * Tools that get pages. Only "live" tools, unless the build is run with
 * EOLIETECH_ALL_TOOLS=1 (local development / verification only: lets a tool
 * agent see its page without flipping the registry status).
 */
export function publishedTools(): ToolDef[] {
  const all = typeof process !== "undefined" && process.env?.EOLIETECH_ALL_TOOLS === "1";
  return tools.filter((t) => all || t.status === "live");
}

/** Every page a tool produces for a locale: the base page plus one per variant. */
export function toolPages(tool: ToolDef, locale: Locale): { slug: string; variant?: ToolVariant }[] {
  const base = tool.slug[locale];
  if (!base || !tool.locales.includes(locale)) return [];
  const pages: { slug: string; variant?: ToolVariant }[] = [{ slug: base }];
  for (const variant of tool.variants ?? []) {
    const slug = variant.slug[locale];
    if (slug) pages.push({ slug, variant });
  }
  return pages;
}
