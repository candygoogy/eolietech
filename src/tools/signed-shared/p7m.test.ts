import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { P7mError, innerFileName, isP7m, openP7m } from "./index";

/** Fixtures made by fixtures/make.sh (throwaway CA, Italian-looking subjects). */
const fixture = (name: string) => new Uint8Array(readFileSync(path.resolve(__dirname, "fixtures", name)));
const xml = fixture("fattura.xml");
const pdf = fixture("sample.pdf");
const text = (s: string) => new TextEncoder().encode(s);

async function rejectCode(bytes: Uint8Array): Promise<string> {
  try {
    await openP7m(bytes);
  } catch (e) {
    if (e instanceof P7mError) return e.code;
    throw e;
  }
  return "resolved";
}

// Tiny DER/BER builder for synthetic envelopes (no signers) to test structure handling alone.
type Part = number[] | Uint8Array;
const cat = (parts: Part[]) => parts.flatMap((p) => [...p]);
const len = (n: number) => (n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff]);
const tlv = (tag: number, ...parts: Part[]) => {
  const b = cat(parts);
  return [tag, ...len(b.length), ...b];
};
const indefinite = (tag: number, ...parts: Part[]) => [tag, 0x80, ...cat(parts), 0, 0];
const OID_SIGNED_DATA = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02];
const OID_DATA = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01];
const unsignedEnvelope = (eContent: Part) =>
  new Uint8Array(tlv(0x30, OID_SIGNED_DATA, tlv(0xa0, tlv(0x30, [2, 1, 1], tlv(0x31), tlv(0x30, OID_DATA, tlv(0xa0, eContent)), tlv(0x31)))));
const wrap = (content: Uint8Array) => unsignedEnvelope(tlv(0x04, content));

describe("openP7m", () => {
  it("opens an RSA SHA-256 DER file and describes the signer", async () => {
    const { content, layers } = await openP7m(fixture("rsa-sha256.xml.p7m"));
    expect(content).toEqual(xml);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toHaveLength(1);
    const s = layers[0][0];
    expect(s).toMatchObject({
      commonName: "Mario Rossi",
      givenName: "Mario",
      surname: "Rossi",
      organization: "Example CA",
      serialNumber: "TINIT-RSSMRA80A01H501U",
      issuer: "Example Trust CA 3, Example Trust Services S.p.A., IT",
      digestAlgorithm: "SHA-256",
      signatureAlgorithm: "RSA",
      hasTimestamp: false,
      check: "valid",
      certValidAtSigning: true,
    });
    expect(s.reason).toBeUndefined();
    expect(s.signingTime).toBeInstanceOf(Date);
    expect(s.notBefore.getTime()).toBeLessThan(s.notAfter.getTime());
    expect(s.notBefore.getTime()).toBeLessThanOrEqual(s.signingTime!.getTime());
  });

  it("opens a streamed BER file (indefinite lengths, constructed eContent)", async () => {
    const ber = fixture("rsa-stream.pdf.p7m");
    expect(ber[1]).toBe(0x80); // make sure the fixture really is indefinite-length
    const { content, layers } = await openP7m(ber);
    expect(content).toEqual(pdf);
    expect(layers[0][0].check).toBe("valid");
  });

  it("concatenates nested OCTET STRING chunks", async () => {
    const chunks = indefinite(0x24, tlv(0x04, text("Fattura ")), indefinite(0x24, tlv(0x04, text("n. ")), tlv(0x04, [])), tlv(0x04, text("42")));
    const { content, layers } = await openP7m(unsignedEnvelope(chunks));
    expect(new TextDecoder().decode(content)).toBe("Fattura n. 42");
    expect(layers).toEqual([[]]);
  });

  it("verifies ECDSA P-256 with the signer picked by subjectKeyIdentifier", async () => {
    const { content, layers } = await openP7m(fixture("ecdsa-p256.pdf.p7m"));
    expect(content).toEqual(pdf);
    expect(layers[0][0]).toMatchObject({
      commonName: "Giulia Bianchi",
      serialNumber: "TINIT-BNCGLI85M41F205X",
      signatureAlgorithm: "ECDSA P-256",
      check: "valid",
    });
  });

  it("verifies RSA-PSS with the parameters from the file", async () => {
    const { content, layers } = await openP7m(fixture("rsa-pss.xml.p7m"));
    expect(content).toEqual(xml);
    expect(layers[0][0]).toMatchObject({ signatureAlgorithm: "RSA-PSS", digestAlgorithm: "SHA-256", check: "valid" });
  });

  it("verifies a signature without signed attributes over the content itself", async () => {
    const { layers } = await openP7m(fixture("rsa-noattr.xml.p7m"));
    const s = layers[0][0];
    expect(s.check).toBe("valid");
    expect(s.signingTime).toBeUndefined();
    expect(s.certValidAtSigning).toBeUndefined();
  });

  it("unwraps a .p7m.p7m into two layers, outermost first", async () => {
    const { content, layers } = await openP7m(fixture("double.pdf.p7m.p7m"));
    expect(content).toEqual(pdf);
    expect(layers.map((l) => l.map((s) => [s.commonName, s.check]))).toEqual([
      [["Mario Rossi", "valid"]],
      [["Giulia Bianchi", "valid"]],
    ]);
  });

  it("decodes base64 / PEM, with or without armour and CRLF line breaks", async () => {
    const pem = fixture("rsa-sha256.xml.p7m.pem");
    const pemText = new TextDecoder().decode(pem);
    expect(pemText.startsWith("-----BEGIN CMS-----")).toBe(true);
    const bare = text(pemText.replace(/-----[^-]+-----/g, "").trim().replace(/\n/g, "\r\n"));
    for (const input of [pem, bare]) {
      const { content, layers } = await openP7m(input);
      expect(content).toEqual(xml);
      expect(layers[0][0].check).toBe("valid");
    }
  });

  it("flags a changed content byte as a digest mismatch but still returns the content", async () => {
    const { content, layers } = await openP7m(fixture("tampered.xml.p7m"));
    expect(new TextDecoder().decode(content)).toContain("43/2026");
    expect(layers[0][0]).toMatchObject({ check: "invalid", reason: "digest-mismatch", commonName: "Mario Rossi" });
  });

  it("flags a changed signature byte as a bad signature", async () => {
    const bytes = fixture("rsa-sha256.xml.p7m");
    bytes[bytes.length - 1] ^= 0x01; // the signature value is the last field of the file
    const { layers } = await openP7m(bytes);
    expect(layers[0][0]).toMatchObject({ check: "invalid", reason: "bad-signature" });
  });

  it("reports a missing certificate as unsupported, naming the issuer from the signer identifier", async () => {
    const { content, layers } = await openP7m(fixture("rsa-nocerts.xml.p7m"));
    expect(content).toEqual(xml);
    const s = layers[0][0];
    expect(s).toMatchObject({ check: "unsupported", reason: "no-certificate", issuer: "Example Trust CA 3, Example Trust Services S.p.A., IT" });
    expect(s.commonName).toBeUndefined();
    expect(Number.isNaN(s.notBefore.getTime())).toBe(true);
    expect(s.signingTime).toBeInstanceOf(Date);
    expect(s.certValidAtSigning).toBeUndefined();
  });

  it("rejects a detached signature", async () => {
    expect(await rejectCode(fixture("detached.xml.p7m"))).toBe("detached");
  });

  it("rejects files that are not CMS", async () => {
    for (const bytes of [pdf, xml, new Uint8Array(), text("hello"), new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x01])]) {
      expect(await rejectCode(bytes)).toBe("not-p7m");
    }
  });

  it("rejects truncated files as malformed", async () => {
    const der = fixture("rsa-sha256.xml.p7m");
    const ber = fixture("rsa-stream.pdf.p7m");
    for (const bytes of [der, ber]) {
      // From 16 on: shorter than the 15-byte header the sniff reads is simply "not-p7m".
      for (let cut = 16; cut < bytes.length; cut += 97) expect(await rejectCode(bytes.slice(0, cut))).toBe("malformed");
    }
    // A header that claims 4 GiB.
    expect(await rejectCode(new Uint8Array([0x30, 0x84, 0xff, 0xff, 0xff, 0xff, ...OID_SIGNED_DATA]))).toBe("malformed");
  });

  it("never throws anything but P7mError on corrupted bytes", async () => {
    const files = ["rsa-stream.pdf.p7m", "ecdsa-p256.pdf.p7m", "rsa-pss.xml.p7m"].map(fixture);
    for (const original of files) {
      for (let at = 0; at < original.length; at += 13) {
        const bytes = original.slice();
        bytes[at] ^= 0xa5;
        const code = await rejectCode(bytes); // rethrows anything that is not a P7mError
        expect(["resolved", "not-p7m", "malformed", "detached"]).toContain(code);
      }
    }
  });

  it("unwraps up to five envelopes and refuses a sixth", async () => {
    let bytes = text("inner");
    for (let i = 0; i < 5; i++) bytes = wrap(bytes);
    const five = await openP7m(bytes);
    expect(five.layers).toHaveLength(5);
    expect(new TextDecoder().decode(five.content)).toBe("inner");
    expect(await rejectCode(wrap(bytes))).toBe("too-deep");
  });
});

describe("isP7m", () => {
  it("sniffs DER, BER and base64 / PEM envelopes only", () => {
    expect(isP7m(fixture("rsa-sha256.xml.p7m"))).toBe(true);
    expect(isP7m(fixture("rsa-stream.pdf.p7m"))).toBe(true);
    expect(isP7m(fixture("rsa-sha256.xml.p7m.pem"))).toBe(true);
    expect(isP7m(fixture("detached.xml.p7m"))).toBe(true); // a sniff, not a parse
    expect(isP7m(pdf)).toBe(false);
    expect(isP7m(xml)).toBe(false);
    expect(isP7m(new Uint8Array())).toBe(false);
    expect(isP7m(text("TWFyaW8gUm9zc2kgaGEgZmlybWF0byBxdWVzdG8gZmlsZQ=="))).toBe(false);
  });
});

describe("innerFileName", () => {
  it("strips every trailing .p7m, case-insensitively, and nothing else", () => {
    expect(innerFileName("fattura.XML.p7m")).toBe("fattura.XML");
    expect(innerFileName("IT01234567890_00001.xml.P7M")).toBe("IT01234567890_00001.xml");
    expect(innerFileName("a.pdf.p7m.p7m")).toBe("a.pdf");
    expect(innerFileName("x.p7m")).toBe("x");
    expect(innerFileName("contratto.pdf")).toBe("contratto.pdf");
    expect(innerFileName("firma.p7s")).toBe("firma.p7s");
    expect(innerFileName(".p7m")).toBe("document");
    expect(innerFileName("")).toBe("document");
  });
});
