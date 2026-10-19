/**
 * What the OCR engine downloads, and from where. Pure (no tesseract.js import) so the page can
 * show the first-run size before anything is fetched; a unit test keeps the byte counts honest.
 */
import tessdata from "./tessdata.json";

export type LangCode = "eng" | "ita";
export type CoreVariant = "relaxedsimd-lstm" | "simd-lstm" | "lstm";

/**
 * tesseract.js 7.0.0 worker.min.js + the tesseract.js-core 7.0.0 LSTM-only build (.js + .wasm) the
 * browser will load. The small worker entry (tess-worker.js) is left out.
 */
export const ENGINE_BYTES: Record<CoreVariant, number> = {
  "relaxedsimd-lstm": 111_307 + 89_360 + 2_862_266,
  "simd-lstm": 111_307 + 89_271 + 2_857_601,
  lstm: 111_307 + 89_261 + 2_855_361,
};

export const LANG_BYTES: Record<LangCode, number> = {
  eng: tessdata.files.eng.size,
  ita: tessdata.files.ita.size,
};

/** Folder the fetch script writes to (public/tessdata/<first 12 of the commit>/), as a site path. */
export const langDataPath = (): string => `/tessdata/${tessdata.commit.slice(0, 12)}/`;

// Feature probes from wasm-feature-detect 1.9 (the checks tesseract.js itself uses to pick a core).
const SIMD = [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11];
const RELAXED_SIMD = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1, 13, 0, 65, 1, 253, 15, 65, 2, 253, 15, 253, 128, 2, 11,
];

const validates = (bytes: number[]): boolean => {
  try {
    return typeof WebAssembly === "object" && WebAssembly.validate(new Uint8Array(bytes));
  } catch {
    return false;
  }
};

/** The core build tesseract.js would choose here for LSTM-only recognition. */
export function coreVariant(): CoreVariant {
  if (validates(RELAXED_SIMD)) return "relaxedsimd-lstm";
  if (validates(SIMD)) return "simd-lstm";
  return "lstm";
}

/** Bytes downloaded the first time with these languages. */
export const firstRunBytes = (langs: readonly LangCode[], variant: CoreVariant): number =>
  ENGINE_BYTES[variant] + langs.reduce((n, l) => n + LANG_BYTES[l], 0);

/** Language bytes only (the part whose progress the page can count). */
export const langBytes = (langs: readonly LangCode[]): number => langs.reduce((n, l) => n + LANG_BYTES[l], 0);

export type LangChoice = "eng" | "ita" | "both";

/** The language list Tesseract gets for a choice; with both, the page's own language goes first. */
export function langsFor(choice: LangChoice, locale: string): LangCode[] {
  if (choice === "eng") return ["eng"];
  if (choice === "ita") return ["ita"];
  return locale === "it" ? ["ita", "eng"] : ["eng", "ita"];
}

export const defaultChoice = (locale: string): LangChoice => (locale === "it" ? "ita" : "eng");
