/**
 * Numbers and dates for the invoice view and PDF, in the page's language: it-IT gives "1.234,56 €"
 * and "01/10/2026", en gives "€1,234.56" and "Oct 1, 2026". Values come from the XML as strings; one
 * that is not a number or date is shown as written.
 */
import type { Locale } from "../types";

const intlLocale = (locale: Locale) => (locale === "it" ? "it-IT" : "en");

/** Digits after the point with trailing zeros dropped: "12.50000" -> 1. */
function fractionDigits(value: string): number {
  const frac = /\.(\d+)$/.exec(value.trim())?.[1] ?? "";
  return frac.replace(/0+$/, "").length;
}

const num = (value: string): number | null => {
  if (!/^\s*[-+]?\d+(\.\d+)?\s*$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Italian CLDR data leaves 4-digit numbers ungrouped ("1234,56"); invoices group them.
type GroupingOptions = Intl.NumberFormatOptions & { useGrouping?: boolean | "always" };

function numberFormat(locale: Locale, opts: GroupingOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(intlLocale(locale), { useGrouping: "always", ...opts } as Intl.NumberFormatOptions);
  } catch {
    return new Intl.NumberFormat(intlLocale(locale), { ...opts, useGrouping: true } as Intl.NumberFormatOptions);
  }
}

/**
 * An amount with its currency: at least 2 decimals, more when the XML has them (unit prices go up to
 * 8). An unknown currency code is written after the number.
 */
export function formatMoney(value: string | undefined, currency: string, locale: Locale): string {
  if (value === undefined) return "";
  const n = num(value);
  if (n === null) return value;
  const digits = Math.min(8, Math.max(2, fractionDigits(value)));
  const plain = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (/^[A-Z]{3}$/.test(currency)) {
    try {
      return numberFormat(locale, { ...plain, style: "currency", currency }).format(n);
    } catch {
      // Not a currency Intl knows: fall through.
    }
  }
  return `${numberFormat(locale, plain).format(n)} ${currency}`.trim();
}

/** A quantity: as many decimals as it really has (up to 8), no trailing zeros. */
export function formatQuantity(value: string | undefined, locale: Locale): string {
  if (value === undefined) return "";
  const n = num(value);
  if (n === null) return value;
  return numberFormat(locale, { maximumFractionDigits: Math.min(8, fractionDigits(value)) }).format(n);
}

/** A rate: "22.00" -> "22%", "10.50" -> "10,5%" in Italian. */
export function formatPercent(value: string | undefined, locale: Locale): string {
  if (value === undefined) return "";
  const n = num(value);
  if (n === null) return value;
  return `${numberFormat(locale, { maximumFractionDigits: Math.min(4, fractionDigits(value)) }).format(n)}%`;
}

/** "2026-10-01" -> "01/10/2026" (it) or "Oct 1, 2026" (en). Anything else is returned as written. */
export function formatDate(value: string | undefined, locale: Locale): string {
  if (value === undefined) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return value;
  const opts: Intl.DateTimeFormatOptions =
    locale === "it" ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" } : { dateStyle: "medium", timeZone: "UTC" };
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
}

/** "2026-10-01T10:30:00" -> "01/10/2026 10:30" or "Oct 1, 2026 10:30". The time is shown as written, with no zone conversion. */
export function formatDateTime(value: string | undefined, locale: Locale): string {
  if (value === undefined) return "";
  const day = formatDate(value, locale);
  const time = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/.exec(value.trim())?.[1];
  return time && day !== value ? `${day} ${time}` : day;
}

/**
 * Discount or surcharge on a line or the document: "-10%", "+5,00 €". SC is a discount (minus), MG a
 * surcharge (plus); any other type gets no sign. Importo is shown as given; when the XML has both, the
 * amount comes first because it is the figure that counts, with the rate after it.
 */
export function formatAdjustment(a: { type?: string; percent?: string; amount?: string }, currency: string, locale: Locale): string {
  const sign = a.type === "MG" ? "+" : a.type === "SC" ? "-" : "";
  const percent = a.percent !== undefined ? `${sign}${formatPercent(a.percent, locale)}` : "";
  const amount = a.amount !== undefined ? `${sign}${formatMoney(a.amount, currency, locale)}` : "";
  return amount && percent ? `${amount} (${percent})` : amount || percent;
}
