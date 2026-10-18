import type { Locale } from "../tools/types";
import { LOCALES } from "../tools/types";
import { localePath } from "./index";

/** Site pages (tool pages take their slugs from the registry) and their slug in each locale. */
export const PAGES = {
  home: { en: "", it: "" },
  tools: { en: "tools", it: "strumenti" },
  pricing: { en: "pricing", it: "prezzi" },
  about: { en: "about", it: "progetto" },
  security: { en: "security", it: "sicurezza" },
  privacy: { en: "privacy", it: "privacy" },
  terms: { en: "terms", it: "termini" },
  guide: { en: "check-file-uploads", it: "verifica-caricamenti" },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageId = keyof typeof PAGES;

/** URL path of a site page in a locale, e.g. pagePath("it", "pricing") = "/it/prezzi/". */
export const pagePath = (locale: Locale, id: PageId): string => localePath(locale, PAGES[id][locale]);

/** The page in every locale, for hreflang links and the language switcher. */
export const pageAlternates = (id: PageId): { locale: Locale; path: string }[] =>
  LOCALES.map((locale) => ({ locale, path: pagePath(locale, id) }));
