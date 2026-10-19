import type { Locale, ToolDef, ToolVariant } from "./types";

const MiB = 1024 * 1024;

/** Format conversion variant ({ from, to } preset, read by the tool's client; labelled "PNG to WebP" on /tools/). */
const convert = (from: string, to: string): ToolVariant => ({
  id: `${from}-to-${to}`,
  slug: { en: `${from}-to-${to}`, it: `${from}-in-${to}` },
  preset: { from, to },
});

export const tools: ToolDef[] = [
  {
    id: "image-compress",
    slug: { en: "compress-image", it: "comprimere-immagini" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
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
    related: ["image-resize", "image-crop", "exif-remover", "heic-to-jpg", "background-remover"],
    updated: "2026-10-17",
  },
  {
    id: "heic-to-jpg",
    slug: { en: "heic-to-jpg", it: "heic-in-jpg" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    related: ["image-compress"],
    updated: "2026-10-17",
  },
  {
    id: "image-resize",
    slug: { en: "resize-image", it: "ridimensionare-immagini" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    variants: [
      {
        id: "for-email",
        slug: { en: "resize-image-for-email", it: "ridimensionare-immagini-per-email" },
        preset: { maxSide: 1600, output: "jpg" },
      },
      {
        id: "for-instagram",
        slug: { en: "resize-image-for-instagram", it: "ridimensionare-immagini-per-instagram" },
        preset: { width: 1080 },
      },
    ],
    related: ["image-crop", "image-compress"],
    updated: "2026-10-18",
  },
  {
    id: "image-crop",
    slug: { en: "crop-image", it: "ritagliare-immagini" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 1 } },
    variants: [
      {
        id: "square",
        slug: { en: "crop-image-square", it: "ritagliare-immagine-quadrata" },
        preset: { aspect: "1:1" },
      },
      {
        id: "16-9",
        slug: { en: "crop-image-16-9", it: "ritagliare-immagine-16-9" },
        preset: { aspect: "16:9" },
      },
    ],
    related: ["image-resize", "image-compress"],
    updated: "2026-10-18",
  },
  {
    id: "exif-remover",
    slug: { en: "remove-exif", it: "rimuovere-exif" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    variants: [
      {
        id: "location",
        slug: { en: "remove-location-from-photo", it: "rimuovere-posizione-dalle-foto" },
        preset: { only: "gps" },
      },
    ],
    related: ["image-compress", "image-resize", "heic-to-jpg"],
    updated: "2026-10-19",
  },
  {
    id: "pdf-merge",
    slug: { en: "merge-pdf", it: "unire-pdf" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 50 } },
    related: ["pdf-split", "pdf-organize", "pdf-compress", "image-to-pdf"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-split",
    slug: { en: "split-pdf", it: "dividere-pdf" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    related: ["pdf-merge", "pdf-organize", "pdf-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-organize",
    slug: { en: "organize-pdf", it: "organizzare-pdf" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    related: ["pdf-merge", "pdf-split", "pdf-compress"],
    updated: "2026-10-17",
  },
  {
    id: "pdf-compress",
    slug: { en: "compress-pdf", it: "comprimere-pdf" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 200 * MiB, maxFiles: 10 } },
    related: ["pdf-merge", "pdf-split", "image-compress"],
    updated: "2026-10-17",
  },
  {
    id: "image-to-pdf",
    slug: { en: "jpg-to-pdf", it: "jpg-in-pdf" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 50 } },
    variants: [convert("png", "pdf"), convert("heic", "pdf")],
    related: ["pdf-to-image", "pdf-merge", "pdf-compress"],
    updated: "2026-10-19",
  },
  {
    id: "pdf-to-image",
    slug: { en: "pdf-to-jpg", it: "pdf-in-jpg" },
    category: "pdf",
    runtime: "client",
    status: "live",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 500 * MiB, maxFiles: 1 } },
    variants: [convert("pdf", "png")],
    related: ["image-to-pdf", "pdf-split", "image-compress"],
    updated: "2026-10-19",
  },
  {
    id: "p7m-opener",
    slug: { en: "open-p7m-file", it: "aprire-file-p7m" },
    category: "document",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 100 * MiB, maxFiles: 20 } },
    variants: [convert("p7m", "pdf")],
    related: ["fattura-viewer", "pdf-merge", "pdf-compress"],
    updated: "2026-10-19",
  },
  {
    id: "fattura-viewer",
    slug: { en: "fatturapa-viewer", it: "visualizzare-fattura-elettronica" },
    category: "document",
    runtime: "client",
    status: "planned",
    wave: 1,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 50 * MiB, maxFiles: 50 } },
    variants: [
      {
        id: "to-pdf",
        slug: { en: "fatturapa-to-pdf", it: "fattura-elettronica-in-pdf" },
        preset: { output: "pdf" },
      },
    ],
    related: ["p7m-opener", "pdf-merge"],
    updated: "2026-10-19",
  },
  {
    id: "background-remover",
    slug: { en: "remove-background", it: "rimuovere-sfondo" },
    category: "image",
    runtime: "client",
    status: "live",
    wave: 2,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 50 * MiB, maxFiles: 20 } },
    related: ["image-compress", "heic-to-jpg"],
    updated: "2026-10-17",
  },
  {
    id: "audio-transcribe",
    slug: { en: "transcribe-audio", it: "trascrivere-audio" },
    category: "audio",
    runtime: "client",
    status: "live",
    wave: 2,
    locales: ["en", "it"],
    limits: { free: { maxBytes: 200 * MiB, maxFiles: 1 } },
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
