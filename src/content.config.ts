import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CONTENT_FILE, contentEntryId } from "./tools/content-files";
import type { Locale } from "./tools/types";

/** Tool page copy: src/tools/<id>/content[.<variantId>].<locale>.md (see tools/content-files.ts). */
const tools = defineCollection({
  loader: glob({
    pattern: "*/content*.md",
    base: "./src/tools",
    generateId: ({ entry }) => {
      const m = CONTENT_FILE.exec(entry.replaceAll("\\", "/"));
      if (!m) throw new Error(`Unexpected tool content file name: ${entry}`);
      const [, tool, variant, locale] = m;
      return contentEntryId(tool!, locale as Locale, variant);
    },
  }),
  schema: z.object({
    /** <title> */
    title: z.string().min(1),
    /** meta description */
    description: z.string().min(1),
    h1: z.string().min(1),
    /** Short intro under the H1 (the Markdown body holds the long-form copy). */
    intro: z.string().default(""),
    howTo: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** Tool UI strings for ToolCtx.t(), keyed by the tool's own keys. */
    ui: z.record(z.string(), z.string()).default({}),
  }),
});

export const collections = { tools };
