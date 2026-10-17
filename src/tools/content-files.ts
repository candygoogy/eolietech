import type { Locale } from "./types";

/**
 * Tool page copy lives inside each tool folder (relative to src/tools/):
 *   <id>/content.<locale>.md              -> collection entry id "<id>/<locale>"
 *   <id>/content.<variantId>.<locale>.md  -> collection entry id "<id>/<variantId>/<locale>"
 */
export const CONTENT_FILE = /^([^/]+)\/content(?:\.([a-z0-9-]+))?\.([a-z]{2})\.md$/;

export const contentFileName = (locale: Locale, variantId?: string): string =>
  variantId ? `content.${variantId}.${locale}.md` : `content.${locale}.md`;

export const contentEntryId = (toolId: string, locale: Locale, variantId?: string): string =>
  variantId ? `${toolId}/${variantId}/${locale}` : `${toolId}/${locale}`;
