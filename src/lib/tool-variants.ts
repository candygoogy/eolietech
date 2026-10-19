/**
 * A tool's variant pages as labelled links, shared by the /tools/ index (ToolIndex.astro) and the
 * row of presets under every tool (ToolPage.astro). Format converters (preset { from, to }) read
 * "PNG to WebP"; any other preset reads tools.<toolId>.variant.<variantId> from the dictionaries.
 * Only pages that are built: published tools, in a locale the tool has, with a slug in that locale.
 */
import { localePath, t } from "../i18n";
import { publishedTools, toolPages } from "../tools/registry";
import type { Locale, ToolDef, ToolVariant } from "../tools/types";

export interface VariantLink {
  id: string;
  href: string;
  label: string;
}

/** File format names as written (data, not copy). */
export const formatName = (f: unknown): string => (f === "webp" ? "WebP" : String(f).toUpperCase());

/** A format converter: its preset names a source and a target format. */
export const isConverter = (variant: ToolVariant): boolean => Boolean(variant.preset.from && variant.preset.to);

export function variantLabel(toolId: string, variant: ToolVariant, locale: Locale): string {
  return isConverter(variant)
    ? t(locale, "tools.convert", { from: formatName(variant.preset.from), to: formatName(variant.preset.to) })
    : t(locale, `tools.${toolId}.variant.${variant.id}`);
}

/** The tool's variant pages in this locale, split into converters and presets, in registry order. */
export function variantLinks(tool: ToolDef, locale: Locale): { converters: VariantLink[]; presets: VariantLink[] } {
  const converters: VariantLink[] = [];
  const presets: VariantLink[] = [];
  if (!publishedTools().some((p) => p.id === tool.id)) return { converters, presets };
  for (const { slug, variant } of toolPages(tool, locale)) {
    if (!variant) continue;
    const link = { id: variant.id, href: localePath(locale, slug), label: variantLabel(tool.id, variant, locale) };
    (isConverter(variant) ? converters : presets).push(link);
  }
  return { converters, presets };
}
