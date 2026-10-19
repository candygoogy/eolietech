/**
 * Finding text to redact (pure, unit-tested). A page's PDF.js text items are joined into one
 * string, searched with a typed query or a personal-data pattern, and every match is turned back
 * into boxes: one per text item it touches, placed proportionally inside the item (geometry.ts).
 * Only real text is found; words that are part of a scanned picture are not text to PDF.js.
 */
import { clipBox, textBox, type Box, type Matrix, type TextPiece } from "./geometry";

export const PATTERNS = ["email", "phone", "iban", "cf"] as const;
export type PatternId = (typeof PATTERNS)[number];

export interface Range {
  start: number;
  end: number;
}

// ---------- joining a page's text ----------

export interface PageText {
  text: string;
  /** Offset of each item's first character in `text`. */
  starts: number[];
}

/** One string for the page: items in PDF.js order, a line break after items that end a line. */
export function joinText(items: readonly TextPiece[]): PageText {
  let text = "";
  const starts: number[] = [];
  for (const item of items) {
    starts.push(text.length);
    text += item.str;
    if (item.hasEOL) text += "\n";
  }
  return { text, starts };
}

// ---------- typed search ----------

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every occurrence of `query`, ignoring case. Spaces in the query match any run of spaces or a
 * line break (or none, since PDFs often store words without the space between them).
 */
export function findQuery(text: string, query: string): Range[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const re = new RegExp(words.map(escape).join("\\s*"), "giu");
  return [...text.matchAll(re)].filter((m) => m[0].length > 0).map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

// ---------- personal data patterns ----------

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;

/** A digit run with the separators phone numbers use; validated afterwards. Never inside a word. */
const PHONE = /(?<![\p{L}\p{N}+@])(?:\+|00)?\(?\d[\d (). -]*\d(?![\p{L}\p{N}@])/gu;

const digitsOf = (s: string): number => (s.match(/\d/g) ?? []).length;

/** Is this one phone number? International (+ or 00), Italian (0 or 3 first) or a grouped 10-digit number. */
export function isPhone(s: string): boolean {
  const t = s.trim();
  if (/\(\s*\)/.test(t) || /[.-]{2}/.test(t)) return false;
  // Dates and similar: 2024-01-31, 31.01.2024.
  if (/^\d{1,4}[.-]\d{1,2}[.-]\d{1,4}$/.test(t)) return false;
  const n = digitsOf(t);
  if (/^(?:\+|00)/.test(t)) return n >= 8 && n <= 15;
  const first = t.replace(/^\(/, "")[0];
  if (first === "0" || first === "3") return n >= 8 && n <= 11;
  // Anything else needs the look of a phone number: grouped, ten digits, like (555) 123-4567.
  const groups = t.split(/[ (). -]+/).filter(Boolean).length;
  return n === 10 && groups >= 3;
}

function findPhones(text: string): Range[] {
  const out: Range[] = [];
  for (const m of text.matchAll(PHONE)) {
    const start = m.index;
    const raw = m[0];
    if (isPhone(raw)) {
      out.push({ start, end: start + raw.length });
      continue;
    }
    for (const r of splitPhones(raw)) out.push({ start: start + r.start, end: start + r.end });
  }
  return out;
}

/**
 * Several numbers in a row ("06 1234567 06 7654321"): split the run at spaces into valid numbers
 * that together cover as many of its words as possible, so none is left uncovered.
 */
function splitPhones(raw: string): Range[] {
  const words = [...raw.matchAll(/[^  ]+/g)].map((w) => ({ s: w.index, e: w.index + w[0].length })).slice(0, 24);
  const n = words.length;
  // best[i]: most words covered from word i on, and the cut that achieves it.
  const best: { covered: number; to: number }[] = Array.from({ length: n + 1 }, () => ({ covered: 0, to: -1 }));
  for (let i = n - 1; i >= 0; i--) {
    best[i] = { covered: best[i + 1]!.covered, to: -1 };
    for (let j = i; j < n; j++) {
      if (!isPhone(raw.slice(words[i]!.s, words[j]!.e))) continue;
      const covered = j - i + 1 + best[j + 1]!.covered;
      if (covered > best[i]!.covered) best[i] = { covered, to: j };
    }
  }
  const out: Range[] = [];
  for (let i = 0; i < n; ) {
    const to = best[i]!.to;
    if (to < 0) {
      i++;
      continue;
    }
    out.push({ start: words[i]!.s, end: words[to]!.e });
    i = to + 1;
  }
  return out;
}

/** IBAN lengths for the SEPA countries, used to find where an IBAN ends when other text follows it. */
const IBAN_LENGTH: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18,
  FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

/** ISO 13616 check: move the first four characters to the end, letters to numbers, mod 97 = 1. */
export function ibanValid(compact: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const moved = compact.slice(4) + compact.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch);
    rest = (rest * (v > 9 ? 100 : 10) + v) % 97;
  }
  return rest === 1;
}

/** Country code, check digits, then letters and digits, written together or in groups. */
const IBAN = /(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?:[  ]?[A-Z0-9]){11,32}/gu;

function findIbans(text: string): Range[] {
  const out: Range[] = [];
  for (const m of text.matchAll(IBAN)) {
    const raw = m[0];
    // Offsets of the non-space characters, so a length in compact characters maps back to the text.
    const at: number[] = [];
    for (let i = 0; i < raw.length; i++) if (raw[i] !== " " && raw[i] !== " ") at.push(i);
    const compact = at.map((i) => raw[i]).join("");
    const known = IBAN_LENGTH[compact.slice(0, 2)];
    let len = 0;
    if (known && compact.length >= known && ibanValid(compact.slice(0, known))) len = known;
    else {
      for (let l = Math.min(34, compact.length); l >= 15; l--) {
        if (ibanValid(compact.slice(0, l))) {
          len = l;
          break;
        }
      }
    }
    // A mistyped IBAN is still redacted: up to its country's length, or the whole run.
    if (!len) len = known && compact.length >= known ? known : compact.length;
    out.push({ start: m.index, end: m.index + at[len - 1]! + 1 });
  }
  return out;
}

/**
 * Italian codice fiscale: six letters, year, month letter, day, place code, check letter. Digits
 * may be replaced by letters (omocodia). The check letter is not verified: a typo in the document
 * should still be redacted.
 */
const CF = /(?<![\p{L}\p{N}])[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z](?![\p{L}\p{N}])/giu;

const toRanges = (text: string, re: RegExp): Range[] =>
  [...text.matchAll(re)].map((m) => ({ start: m.index, end: m.index + m[0].length }));

export function findPattern(text: string, id: PatternId): Range[] {
  switch (id) {
    case "email":
      return toRanges(text, EMAIL);
    case "phone": {
      // Digit groups inside an IBAN or a codice fiscale are not phone numbers.
      const taken = [...findIbans(text), ...toRanges(text, CF)];
      return findPhones(text).filter((r) => !taken.some((x) => r.start < x.end && x.start < r.end));
    }
    case "iban":
      return findIbans(text);
    case "cf":
      return toRanges(text, CF);
  }
}

// ---------- matches to boxes ----------

/**
 * Boxes for each range: one per text item the range touches, covering only that item's part of
 * it (leading and trailing spaces left out), clipped to the page.
 */
export function rangeBoxes(
  items: readonly TextPiece[],
  page: PageText,
  ranges: readonly Range[],
  viewport: Matrix,
  W: number,
  H: number,
): Box[][] {
  return ranges.map(({ start, end }) => {
    const boxes: Box[] = [];
    items.forEach((item, i) => {
      const s = page.starts[i]!;
      const e = s + item.str.length;
      if (e <= start || s >= end) return;
      let from = Math.max(start, s) - s;
      let to = Math.min(end, e) - s;
      while (from < to && /\s/.test(item.str[from]!)) from++;
      while (to > from && /\s/.test(item.str[to - 1]!)) to--;
      if (to <= from) return;
      const box = clipBox(textBox(item, from, to, viewport), W, H);
      if (box) boxes.push(box);
    });
    return boxes;
  });
}
