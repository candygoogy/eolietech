// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkNewPassword,
  checkPasswordArgs,
  classifyCheck,
  classifyProbe,
  classifyWrite,
  decryptArgs,
  encryptArgs,
  MAX_PASSWORD_BYTES,
  modeFromPreset,
  probeArgs,
  QPDF_WASM_BYTES,
  randomOwnerPassword,
  type QpdfResult,
} from "./qpdf-args";

const require = createRequire(import.meta.url);

describe("pdf-password arguments", () => {
  it("picks the mode from the variant preset", () => {
    expect(modeFromPreset({})).toBe("protect");
    expect(modeFromPreset({ mode: "unlock" })).toBe("unlock");
    expect(modeFromPreset({ mode: "other" })).toBe("protect");
  });

  it("encrypts with AES-256, both passwords in --x=value form", () => {
    const args = encryptArgs("-secret", "owner");
    expect(args).toEqual(["--encrypt", "--user-password=-secret", "--owner-password=owner", "--bits=256", "--", "/in.pdf", "/out.pdf"]);
    expect(args.some((a) => /^--(print|modify|extract|annotate|form|assemble|accessibility)/.test(a))).toBe(false);
  });

  it("decrypts with a password only when one is given", () => {
    expect(decryptArgs()).toEqual(["--decrypt", "/in.pdf", "/out.pdf"]);
    expect(decryptArgs("")).toEqual(["--decrypt", "/in.pdf", "/out.pdf"]);
    expect(decryptArgs("pw")).toEqual(["--password=pw", "--decrypt", "/in.pdf", "/out.pdf"]);
    expect(probeArgs()).toEqual(["--requires-password", "/in.pdf"]);
    expect(checkPasswordArgs("pw")).toEqual(["--password=pw", "--requires-password", "/in.pdf"]);
  });

  it("checks the new password", () => {
    expect(checkNewPassword("", "")).toBe("empty");
    expect(checkNewPassword("abc", "abd")).toBe("mismatch");
    expect(checkNewPassword(" abc", "abc")).toBe("mismatch");
    expect(checkNewPassword("abc", "abc")).toBeNull();
    expect(checkNewPassword("x".repeat(MAX_PASSWORD_BYTES), "x".repeat(MAX_PASSWORD_BYTES))).toBeNull();
    expect(checkNewPassword("x".repeat(MAX_PASSWORD_BYTES + 1), "")).toBe("tooLong");
    // 64 two-byte letters = 128 bytes.
    expect(checkNewPassword("è".repeat(64), "è".repeat(64))).toBe("tooLong");
  });

  it("makes a 64-hex-character owner password from 32 random bytes", () => {
    const fixed = randomOwnerPassword((b) => b.fill(0xab));
    expect(fixed).toBe("ab".repeat(32));
    const a = randomOwnerPassword();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(randomOwnerPassword()).not.toBe(a);
  });

  it("classifies probes", () => {
    const r = (code: number, ...stderr: string[]): QpdfResult => ({ code, stderr });
    expect(classifyProbe(r(2))).toBe("plain");
    expect(classifyProbe(r(2, "WARNING: /in.pdf: some recoverable problem"))).toBe("plain");
    expect(classifyProbe(r(3))).toBe("restricted");
    expect(classifyProbe(r(0))).toBe("needsPassword");
    expect(classifyProbe(r(2, "this.program: /in.pdf: invalid password"))).toBe("needsPassword");
    expect(classifyProbe(r(2, "WARNING: /in.pdf: can't find PDF header", "this.program: /in.pdf: can't find startxref"))).toBe("unreadable");
    expect(classifyProbe(r(1))).toBe("unreadable");
    expect(classifyCheck(r(3))).toBe(true);
    expect(classifyCheck(r(2, "invalid password"))).toBe(false);
    expect(classifyWrite(r(0))).toBe("ok");
    expect(classifyWrite(r(3, "WARNING: x", "qpdf: operation succeeded with warnings"))).toBe("ok");
    expect(classifyWrite(r(2, "this.program: /in.pdf: invalid password"))).toBe("wrongPassword");
    expect(classifyWrite(r(2, "this.program: /in.pdf: can't find startxref"))).toBe("failed");
  });

  it("advertises the real qpdf.wasm download size", () => {
    expect(statSync(require.resolve("@neslinesli93/qpdf-wasm/dist/qpdf.wasm")).size).toBe(QPDF_WASM_BYTES);
  });
});

/** The real engine (Node build path of the same qpdf.js): pins the exit codes the classifiers rely on. */
describe("pdf-password with qpdf 12.2.0", () => {
  type Instance = { callMain(a: string[]): number; FS: { writeFile(p: string, d: Uint8Array): void; readFile(p: string): Uint8Array } };
  const createQpdf = require("@neslinesli93/qpdf-wasm") as () => Promise<Instance>;
  const plain = new Uint8Array(readFileSync(fileURLToPath(new URL("../../../e2e/fixtures/pdf/two-pages.pdf", import.meta.url))));

  async function run(input: Uint8Array, args: string[]): Promise<QpdfResult & { output?: Uint8Array }> {
    const stderr: string[] = [];
    const { log, error } = console;
    console.log = () => {};
    console.error = (...a: unknown[]) => void stderr.push(a.join(" "));
    let qpdf: Instance;
    try {
      const ready = createQpdf();
      console.log = log;
      console.error = error;
      qpdf = await ready;
    } finally {
      console.log = log;
      console.error = error;
    }
    qpdf.FS.writeFile("/in.pdf", input);
    let code: number;
    try {
      code = qpdf.callMain(args.slice());
    } catch (err) {
      code = (err as { status: number }).status;
    }
    let output: Uint8Array | undefined;
    try {
      output = qpdf.FS.readFile("/out.pdf");
    } catch {
      output = undefined;
    }
    return { code, stderr, output };
  }

  it("protects, detects and unlocks", async () => {
    expect(classifyProbe(await run(plain, probeArgs()))).toBe("plain");

    const enc = await run(plain, encryptArgs("pässwörd 1", randomOwnerPassword()));
    expect(classifyWrite(enc)).toBe("ok");
    const locked = enc.output!;
    expect(classifyProbe(await run(locked, probeArgs()))).toBe("needsPassword");
    expect(classifyCheck(await run(locked, checkPasswordArgs("pässwörd 1")))).toBe(true);
    expect(classifyCheck(await run(locked, checkPasswordArgs("wrong")))).toBe(false);

    expect(classifyWrite(await run(locked, decryptArgs("wrong")))).toBe("wrongPassword");
    expect(classifyWrite(await run(locked, decryptArgs()))).toBe("wrongPassword");
    const dec = await run(locked, decryptArgs("pässwörd 1"));
    expect(classifyWrite(dec)).toBe("ok");
    expect(classifyProbe(await run(dec.output!, probeArgs()))).toBe("plain");
  });

  it("removes restrictions from a file that opens without a password", async () => {
    const restricted = (await run(plain, ["--encrypt", "--user-password=", "--owner-password=owner", "--bits=256", "--print=none", "--", "/in.pdf", "/out.pdf"])).output!;
    expect(classifyProbe(await run(restricted, probeArgs()))).toBe("restricted");
    const dec = await run(restricted, decryptArgs());
    expect(classifyWrite(dec)).toBe("ok");
    expect(classifyProbe(await run(dec.output!, probeArgs()))).toBe("plain");
  });

  it("reports a file that is not a PDF as unreadable", async () => {
    expect(classifyProbe(await run(new TextEncoder().encode("not a pdf"), probeArgs()))).toBe("unreadable");
  });

  it("round-trips the longest allowed password (and qpdf cannot reopen a longer one)", async () => {
    const ok = "x".repeat(MAX_PASSWORD_BYTES);
    const locked = (await run(plain, encryptArgs(ok, "owner"))).output!;
    expect(classifyWrite(await run(locked, decryptArgs(ok)))).toBe("ok");
    const tooLong = ok + "x";
    const broken = (await run(plain, encryptArgs(tooLong, "owner"))).output!;
    expect(classifyWrite(await run(broken, decryptArgs(tooLong)))).toBe("wrongPassword");
  });
});
