/** Compression presets -> Ghostscript arguments. Pure, unit-tested. */

export const PRESETS = ["screen", "ebook", "printer"] as const;
export type Preset = (typeof PRESETS)[number];
export const DEFAULT_PRESET: Preset = "ebook";

/** Size of @okathira/ghostpdl-wasm/dist/gs.wasm (1.1.0), shown before the one-time download. A test keeps it honest. */
export const GS_WASM_BYTES = 15_533_045;

export const INPUT_PATH = "/in.pdf";
export const OUTPUT_PATH = "/out.pdf";

export const isPreset = (v: unknown): v is Preset => typeof v === "string" && (PRESETS as readonly string[]).includes(v);

/** Variant preset -> the quality the tool starts with: `{ quality: "screen" }` on /compress-pdf-for-email/. */
export const initialPreset = (preset: Record<string, unknown>): Preset => (isPreset(preset.quality) ? preset.quality : DEFAULT_PRESET);

/** Ghostscript command line (pdfwrite) for a preset. -dSAFER: no file access beyond what we pass in. */
export function gsArgs(preset: Preset, input = INPUT_PATH, output = OUTPUT_PATH): string[] {
  return [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.5",
    `-dPDFSETTINGS=/${preset}`,
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dSAFER",
    "-dNOPAUSE",
    "-dBATCH",
    `-sOutputFile=${output}`,
    input,
  ];
}

/** Parse Ghostscript's stdout for progress: "Processing pages 1 through 12." / "Page 3". */
export function parseProgress(line: string): { total?: number; page?: number } | null {
  const total = /Processing pages \d+ through (\d+)/.exec(line);
  if (total) return { total: Number(total[1]) };
  const page = /^Page (\d+)\s*$/.exec(line.trim());
  if (page) return { page: Number(page[1]) };
  return null;
}
