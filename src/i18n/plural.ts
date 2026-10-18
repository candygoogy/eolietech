/**
 * Counted strings. A message that depends on a number has one key per plural form, e.g.
 * `bg.added.one: "Added {count} photo."` and `bg.added.other: "Added {count} photos."`, and the
 * code picks the form with Intl.PluralRules. English and Italian only need "one" and "other";
 * any other category (Italian "many" for millions) uses "other". Dependency-free for client bundles.
 */
export type PluralForm = "one" | "other";

export function pluralForm(locale: string, count: number): PluralForm {
  return new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
}

type Lookup = (key: string, vars?: Record<string, string | number>) => string;

/** Translate `${key}.one` or `${key}.other` for `count`; `{count}` is filled in along with `vars`. */
export function tPlural(
  ctx: { t: Lookup; locale: string },
  key: string,
  count: number,
  vars?: Record<string, string | number>,
): string {
  return ctx.t(`${key}.${pluralForm(ctx.locale, count)}`, { count, ...vars });
}
