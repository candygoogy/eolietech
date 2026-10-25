/**
 * /llms.txt (https://llmstxt.org/): a plain-text map of the site for AI crawlers and assistants, built
 * from the registry and the dictionaries so it lists exactly the published pages. Served by
 * src/pages/llms.txt.ts.
 */
import { localePath, t } from "../i18n";
import { pagePath, type PageId } from "../i18n/routes";
import { publishedTools } from "../tools/registry";
import type { Category } from "../tools/types";
import { variantLinks } from "./tool-variants";

const CATEGORIES: Category[] = ["image", "pdf", "document", "audio"];
/** Plain English labels: this file is for crawlers, not part of the translated UI. */
const SITE_PAGES: [PageId, string][] = [
  ["security", "Security: how to check that files stay on your device"],
  ["guide", "How to check whether any website uploads your files"],
  ["privacy", "Privacy policy"],
  ["about", "About the project"],
  ["pricing", "Pricing (the tools are free; Pro is planned)"],
];

export function llmsTxt(site: URL): string {
  const abs = (path: string) => new URL(path, site).href;
  const lines = [
    `# ${t("en", "site.name")}`,
    "",
    `> ${t("en", "site.description")}`,
    "",
    "Every tool runs in the visitor's browser (WebAssembly and Web Workers): files are not uploaded to a server. " +
      "The Content-Security-Policy only allows connections to this site, and the code is open source " +
      "(https://github.com/candygoogy/eolietech, AGPL-3.0). Pages exist in English and Italian (under /it/).",
  ];

  for (const category of CATEGORIES) {
    const tools = publishedTools().filter((tool) => tool.category === category && tool.locales.includes("en"));
    if (tools.length === 0) continue;
    lines.push("", `## ${t("en", `tools.category.${category}`)}`, "");
    for (const tool of tools) {
      lines.push(`- [${t("en", `tools.${tool.id}.name`)}](${abs(localePath("en", tool.slug.en))}): ${t("en", `tools.${tool.id}.summary`)}`);
      const { converters, presets } = variantLinks(tool, "en");
      for (const link of [...converters, ...presets]) lines.push(`  - [${link.label}](${abs(link.href)})`);
    }
  }

  lines.push("", "## About the site", "");
  for (const [id, label] of SITE_PAGES) lines.push(`- [${label}](${abs(pagePath("en", id))})`);

  lines.push("", "## Optional", "", `- [Strumenti, all tools in Italian](${abs(pagePath("it", "tools"))})`);
  return `${lines.join("\n")}\n`;
}
