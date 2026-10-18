import { publishedTools, toolPages } from "../tools/registry";
import type { Locale } from "../tools/types";

/** getStaticPaths for the tool pages of one locale: one page per published tool and per variant. */
export function toolStaticPaths(locale: Locale) {
  return publishedTools().flatMap((tool) =>
    toolPages(tool, locale).map((page) => ({
      params: { tool: page.slug },
      props: { toolId: tool.id, variantId: page.variant?.id, locale },
    })),
  );
}
