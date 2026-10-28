/**
 * Which characters the standard PDF fonts (Helvetica, WinAnsi encoding, as pdf-lib embeds them) can
 * draw. Pure and dependency-free, so the client can check the text as it is typed; winansi.test.ts
 * checks this table against pdf-lib's own encoder.
 */

/** Unicode code points WinAnsiEncoding covers, besides U+0020..U+007E and U+00A0..U+00FF. */
const EXTRA = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc, 0x2013, 0x2014, 0x2018, 0x2019, 0x201a,
  0x201c, 0x201d, 0x201e, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
]);

export function isWinAnsi(cp: number): boolean {
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || EXTRA.has(cp);
}

/** The distinct characters of `text` the standard fonts can't draw, in order of first appearance. */
export function unencodable(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (!isWinAnsi(ch.codePointAt(0)!)) seen.add(ch);
  }
  return [...seen];
}

/** A character for a message: itself if it can be seen, its code ("U+200B") if not. */
export function showChar(ch: string): string {
  return /^[\p{L}\p{N}\p{P}\p{S}]$/u.test(ch) ? ch : `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * The text as it will be drawn: composed (an "e" plus a combining accent becomes "é", which the fonts
 * have), one line, runs of white space as single spaces, trimmed.
 */
export const cleanText = (text: string): string => text.normalize("NFC").replace(/\s+/g, " ").trim();
