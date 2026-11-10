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
    // Stop on the first PDF error instead of "repairing" it into blank or missing pages.
    "-dPDFSTOPONERROR",
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

export type GsVerdict = "ok" | "encrypted" | "failed";

/**
 * Was a Ghostscript run a real success? This build can exit 0 after "This file requires a
 * password" (output: one blank page) or after page errors (output: some pages missing), so the
 * exit code alone is not enough: the log must be clean and the output must have every input page.
 * `outputPages` is null when the output could not be read at all.
 */
export function judgeGsRun(run: { code: number; log: readonly string[]; inputPages: number; outputPages: number | null }): GsVerdict {
  if (run.log.some((line) => /requires a password/i.test(line))) return "encrypted";
  if (run.code !== 0 || run.log.some((line) => line.includes("**** Error"))) return "failed";
  if (run.outputPages === null || run.inputPages < 1 || run.outputPages !== run.inputPages) return "failed";
  return "ok";
}

/** Download progress in quarters (0 to 4), so a live region speaks at 25, 50, 75 and 100% only. */
export function quarter(loaded: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(4, Math.floor((loaded / total) * 4)));
}
