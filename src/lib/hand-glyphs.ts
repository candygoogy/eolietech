/**
 * A small hand-drawn monoline script for the postcards (Handwriting.astro). Each glyph is a set of
 * pen strokes in a 1-unit grid: baseline y = 0, x-height y = -10, ascenders reach about y = -21,
 * descenders y = +7. `w` is the advance. Only the letters the postcards use are drawn; anything else
 * throws at build time, so a new message cannot silently render with gaps.
 */
export interface Glyph {
  d: string;
  w: number;
}

export const GLYPHS: Record<string, Glyph> = {
  a: { d: "M7.4 -7.6C6.6 -10.6 1.2 -10.8 0.9 -5.2C0.7 -0.6 5.4 -0.4 7.1 -4.6M7.6 -9.9C7.2 -6.2 7 -3.2 7.4 -1.2C7.8 0.3 9.1 0.2 10.2 -0.9", w: 10.6 },
  d: { d: "M7.2 -7.6C6.4 -10.6 1 -10.8 0.8 -5.2C0.6 -0.6 5.3 -0.4 7 -4.6M8.6 -21C7.8 -14 7.1 -6.4 7.4 -1.6C7.6 0.3 9.1 0.3 10.3 -0.9", w: 10.9 },
  e: { d: "M1.1 -4.6C4.2 -4.5 7.5 -5.8 7.3 -8.1C7.1 -10.7 1.3 -10.7 0.9 -5.2C0.6 -0.6 5 -0.3 7.8 -2.5", w: 9 },
  E: { d: "M11.2 -19.2C8.4 -21.6 2.6 -21.2 2.9 -16.6C3.1 -13.2 6.6 -12 8.8 -11.6C4.3 -11.9 0.6 -9.8 0.8 -5.6C1.1 -0.4 8.1 -0.2 11.4 -3.1", w: 12.4 },
  i: { d: "M1.7 -9.7C1.3 -6.2 1.3 -2.8 1.9 -1.1C2.4 0.3 3.7 0.1 4.6 -0.9M2.2 -14.2L2.4 -13.5", w: 5.2 },
  l: { d: "M0.4 -1.6C3.2 -6.2 5.8 -14.4 5.3 -19.2C4.9 -22.6 1.9 -21.2 2.1 -16C2.3 -10 2.5 -4.2 3.5 -1.3C4.3 0.5 6.1 0.3 7.2 -1", w: 7.4 },
  o: { d: "M5 -10C1.6 -10.1 0.6 -6.6 0.8 -4.5C1 -1.3 3 -0.3 4.8 -0.4C7.2 -0.5 8.4 -3 8.2 -5.6C8 -8.6 6.6 -10 5 -10C6.9 -10.2 8.7 -9.7 10.1 -9.1", w: 10.4 },
  p: { d: "M1.7 -9.6C1.5 -4.2 1.3 1.8 0.9 7.4M1.7 -7C3 -10.1 8.3 -11.1 8.3 -5.7C8.3 -1 3.7 -0.2 1.5 -1.8", w: 9.6 },
  r: { d: "M1.3 -9.7C1.2 -6.2 1.1 -3 1.1 -0.4M1.3 -6.6C2.5 -9.5 4.7 -10.5 6.9 -9.7", w: 7.6 },
  s: { d: "M7.1 -8.6C6.1 -10.7 1.6 -10.6 1.6 -7.6C1.6 -5 7.5 -5.6 7.5 -2.6C7.5 0.4 1.6 0.8 0.5 -1.6", w: 8.8 },
  t: { d: "M3.7 -17.2C3.3 -11.2 3.1 -5.2 3.7 -2C4.3 0.4 6.4 0.2 7.5 -1.2M0.2 -10.1C2.6 -10.5 5.6 -10.6 7.7 -10.2", w: 8.2 },
  u: { d: "M0.9 -9.6C0.5 -5.2 0.7 -0.6 3.8 -0.6C6.5 -0.6 7.6 -4.1 7.8 -9.8C7.5 -5.2 7.4 -2.2 8 -0.9C8.5 0.2 9.6 0 10.5 -0.9", w: 11 },
  "!": { d: "M2.8 -20.4C2.6 -14.4 2.4 -9.4 2.2 -5.6M2.1 -1.3L2.2 -0.6", w: 5.4 },
  " ": { d: "", w: 4.6 },
};

/** Lay out a string: one path per glyph with its x offset, plus the total advance. */
export function layout(text: string): { parts: { d: string; x: number; i: number }[]; width: number } {
  let x = 0;
  const parts: { d: string; x: number; i: number }[] = [];
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`hand-glyphs: no glyph for "${ch}" in "${text}"`);
    if (g.d) parts.push({ d: g.d, x, i });
    x += g.w;
  });
  return { parts, width: x };
}
