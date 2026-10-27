/**
 * qpdf command lines and result classification for Protect PDF / Unlock PDF. Pure, unit-tested
 * (qpdf-args.test.ts runs the real qpdf build to pin the exit codes below).
 *
 * What @neslinesli93/qpdf-wasm 0.3.0 (qpdf 12.2.0) actually does, measured, not taken from the docs:
 * C++ exceptions are not caught inside this build, so `--requires-password` cannot report "needs a
 * password" with exit 0 as documented: it stops with exit 2 and "invalid password" on stderr.
 *   --requires-password FILE         2, empty stderr        not encrypted
 *                                    3                      encrypted, opens without a password (restrictions only)
 *                                    2, "invalid password"  needs a password
 *                                    0                      needs a password (documented; kept in case a build catches it)
 *                                    2, other error line    not readable as a PDF
 *   --password=P --requires-password 3 when P opens the file
 *   --decrypt / --encrypt            0 (3 = written with warnings); 2 + "invalid password" when the password is wrong
 * qpdf also accepts AES-256 passwords longer than 127 bytes but cannot open the result with them, so
 * new passwords are capped at 127 UTF-8 bytes.
 */

export const MODES = ["protect", "unlock"] as const;
export type Mode = (typeof MODES)[number];

/** Variant preset -> mode: `{ mode: "unlock" }` on /unlock-pdf/, protect on the base page. */
export const modeFromPreset = (preset: Record<string, unknown>): Mode => (preset.mode === "unlock" ? "unlock" : "protect");

/** Size of @neslinesli93/qpdf-wasm/dist/qpdf.wasm (0.3.0), shown before the one-time download. A test keeps it honest. */
export const QPDF_WASM_BYTES = 1_334_286;

export const INPUT_PATH = "/in.pdf";
export const OUTPUT_PATH = "/out.pdf";

/** AES-256 (R6) uses at most 127 bytes of a UTF-8 password. */
export const MAX_PASSWORD_BYTES = 127;

export const passwordBytes = (password: string): number => new TextEncoder().encode(password).length;

export type NewPasswordProblem = "empty" | "mismatch" | "tooLong";

/** Check the Protect fields. The password is used exactly as typed (spaces included). */
export function checkNewPassword(password: string, confirm: string): NewPasswordProblem | null {
  if (password.length === 0) return "empty";
  if (passwordBytes(password) > MAX_PASSWORD_BYTES) return "tooLong";
  if (password !== confirm) return "mismatch";
  return null;
}

/** A random owner password (never shown): 32 random bytes as 64 hex characters. */
export function randomOwnerPassword(fill: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = fill(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Is the input encrypted, and does it need a password to open? (no password supplied) */
export const probeArgs = (input = INPUT_PATH): string[] => ["--requires-password", input];

/** Does `password` open the file? Exit 3 = yes (see classifyCheck). */
export const checkPasswordArgs = (password: string, input = INPUT_PATH): string[] => [`--password=${password}`, "--requires-password", input];

/**
 * AES-256 with a user password (to open) and a random owner password, no permission restrictions.
 * Passwords go in the `--x=value` form, so one that starts with "-" or "@" is never read as an option
 * or an argument file.
 */
export function encryptArgs(userPassword: string, ownerPassword: string, input = INPUT_PATH, output = OUTPUT_PATH): string[] {
  return ["--encrypt", `--user-password=${userPassword}`, `--owner-password=${ownerPassword}`, "--bits=256", "--", input, output];
}

/** Remove encryption. No password for files that open without one (passing one would make qpdf reject it). */
export function decryptArgs(password?: string, input = INPUT_PATH, output = OUTPUT_PATH): string[] {
  return password ? [`--password=${password}`, "--decrypt", input, output] : ["--decrypt", input, output];
}

export interface QpdfResult {
  code: number;
  /** stderr lines. */
  stderr: string[];
}

const isWrongPassword = (stderr: string[]) => stderr.some((l) => /invalid password/i.test(l));
/** qpdf prints recoverable problems as "WARNING: ..." and a final "operation succeeded with warnings". */
const hasError = (stderr: string[]) => stderr.some((l) => l.trim() !== "" && !/^WARNING\b|succeeded with warnings/i.test(l.trim()));

export type ProbeOutcome = "plain" | "restricted" | "needsPassword" | "unreadable";

export function classifyProbe({ code, stderr }: QpdfResult): ProbeOutcome {
  if (code === 3) return "restricted";
  if (code === 0) return "needsPassword";
  if (code === 2) {
    if (isWrongPassword(stderr)) return "needsPassword";
    return hasError(stderr) ? "unreadable" : "plain";
  }
  return "unreadable";
}

/** checkPasswordArgs: true when the password opens the (encrypted) file. */
export const classifyCheck = ({ code }: QpdfResult): boolean => code === 3;

export type WriteOutcome = "ok" | "wrongPassword" | "failed";

/** --encrypt / --decrypt. Exit 3 means the file was written with warnings. */
export function classifyWrite({ code, stderr }: QpdfResult): WriteOutcome {
  if (code === 0 || code === 3) return "ok";
  if (isWrongPassword(stderr)) return "wrongPassword";
  return "failed";
}
