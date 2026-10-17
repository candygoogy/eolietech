import type { Locale } from "../tools/types";
import { DEFAULT_LOCALE } from "../tools/types";
import en from "./en.json";
import { interpolate } from "./interpolate";

export { interpolate };
export type Dict = Record<string, string>;

/** Add `it` here once src/i18n/it.json exists. */
const dictionaries: Partial<Record<Locale, Dict>> = { en };

/** Look up a site string; falls back to English, then to the key itself. */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const s = dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE]?.[key] ?? key;
  return interpolate(s, vars);
}

export const useTranslations = (locale: Locale) => (key: string, vars?: Record<string, string | number>) =>
  t(locale, key, vars);

/** Full dictionary for a locale (English as fallback). */
export const getDictionary = (locale: Locale): Dict => ({ ...dictionaries[DEFAULT_LOCALE], ...dictionaries[locale] });

/** Site path for a slug in a locale: en lives at the root, other locales under /<locale>/. */
export const localePath = (locale: Locale, slug = ""): string => {
  const path = slug ? `${slug.replace(/^\/|\/$/g, "")}/` : "";
  return locale === DEFAULT_LOCALE ? `/${path}` : `/${locale}/${path}`;
};
