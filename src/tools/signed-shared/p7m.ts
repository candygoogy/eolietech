/**
 * CMS / PKCS#7 SignedData reader for Italian signed files (.p7m, CAdES-BES): unwraps the signed
 * content, nested envelopes included, and describes and checks every signature with WebCrypto.
 * DOM-free: runs on the main thread, in a Web Worker and in vitest's node environment.
 *
 * What "check" covers: the content's digest matches the signed messageDigest attribute and the
 * signature verifies with the public key of the certificate embedded in the file. It says nothing
 * about trust (chain to a qualified CA), revocation or legal value: those need the network.
 */

import {
  Asn1Error,
  TAG,
  body,
  children,
  equalBytes,
  expect,
  oid,
  raw,
  readTlv,
  smallInt,
  stringBytes,
  text,
  time,
  type Asn1,
} from "./asn1";

export interface SignerInfo {
  commonName?: string;
  givenName?: string;
  surname?: string;
  organization?: string;
  /** Subject serialNumber as written, e.g. "TINIT-RSSMRA80A01H501U" (Italian tax code). */
  serialNumber?: string;
  /** Issuer as a readable one-liner, e.g. "ArubaPEC S.p.A. NG CA 3, ArubaPEC S.p.A., IT". */
  issuer: string;
  /** Certificate validity. An Invalid Date when the file carries no certificate for this signer (reason "no-certificate"). */
  notBefore: Date;
  notAfter: Date;
  /** From the signingTime signed attribute, when present. */
  signingTime?: Date;
  /** notBefore <= signingTime <= notAfter; undefined when there is no signingTime. */
  certValidAtSigning?: boolean;
  /** true when an unsigned signature-time-stamp attribute is present (not verified). */
  hasTimestamp: boolean;
  /** "SHA-256", ... (the dotted OID when unknown). */
  digestAlgorithm: string;
  /** "RSA", "RSA-PSS", "ECDSA P-256", ... (the dotted OID when unknown). */
  signatureAlgorithm: string;
  /** Cryptographic check: content digest matches and the signature verifies with the certificate's public key. */
  check: "valid" | "invalid" | "unsupported";
  /**
   * Short machine reason when not "valid". invalid: "digest-mismatch" | "missing-digest" | "bad-signature".
   * unsupported: "no-certificate" | "unsupported-algorithm" | "unsupported-key" | "no-webcrypto".
   */
  reason?: string;
}

export interface OpenedP7m {
  content: Uint8Array;
  /** One entry per envelope, outermost first (a .p7m.p7m has two). Each envelope can have several signers. */
  layers: SignerInfo[][];
}

export type P7mErrorCode = "not-p7m" | "detached" | "malformed" | "too-deep";

/** A failure the UI maps to a translated message by its code. */
export class P7mError extends Error {
  constructor(
    public readonly code: P7mErrorCode,
    message?: string,
  ) {
    super(message ?? `p7m: ${code}`);
    this.name = "P7mError";
  }
}

/** Envelopes unwrapped before giving up (.p7m.p7m.p7m... is 2 or 3 in practice). */
const MAX_LAYERS = 5;

const OID = {
  signedData: "1.2.840.113549.1.7.2",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  signatureTimeStamp: "1.2.840.113549.1.9.16.2.14",
  rsaEncryption: "1.2.840.113549.1.1.1",
  rsaPss: "1.2.840.113549.1.1.10",
  mgf1: "1.2.840.113549.1.1.8",
  ecPublicKey: "1.2.840.10045.2.1",
  subjectKeyIdentifier: "2.5.29.14",
} as const;

const DIGESTS: Record<string, string> = {
  "1.3.14.3.2.26": "SHA-1",
  "2.16.840.1.101.3.4.2.4": "SHA-224",
  "2.16.840.1.101.3.4.2.1": "SHA-256",
  "2.16.840.1.101.3.4.2.2": "SHA-384",
  "2.16.840.1.101.3.4.2.3": "SHA-512",
};
/** SHA-224 is a known name but WebCrypto cannot compute it. */
const WEBCRYPTO_DIGESTS = new Set(["SHA-1", "SHA-256", "SHA-384", "SHA-512"]);

/** RSASSA-PKCS1-v1_5 signature OIDs -> hash; null = take the signer's digestAlgorithm. */
const RSA_PKCS1: Record<string, string | null> = {
  [OID.rsaEncryption]: null,
  "1.2.840.113549.1.1.5": "SHA-1",
  "1.2.840.113549.1.1.14": "SHA-224",
  "1.2.840.113549.1.1.11": "SHA-256",
  "1.2.840.113549.1.1.12": "SHA-384",
  "1.2.840.113549.1.1.13": "SHA-512",
};
const ECDSA: Record<string, string | null> = {
  [OID.ecPublicKey]: null,
  "1.2.840.10045.4.1": "SHA-1",
  "1.2.840.10045.4.3.1": "SHA-224",
  "1.2.840.10045.4.3.2": "SHA-256",
  "1.2.840.10045.4.3.3": "SHA-384",
  "1.2.840.10045.4.3.4": "SHA-512",
};
const CURVES: Record<string, { name: string; size: number }> = {
  "1.2.840.10045.3.1.7": { name: "P-256", size: 32 },
  "1.3.132.0.34": { name: "P-384", size: 48 },
  "1.3.132.0.35": { name: "P-521", size: 66 },
};
const OTHER_SIGNATURES: Record<string, string> = {
  "1.3.101.112": "Ed25519",
  "1.3.101.113": "Ed448",
  "1.2.840.10040.4.1": "DSA",
};

const NAME = {
  commonName: "2.5.4.3",
  surname: "2.5.4.4",
  serialNumber: "2.5.4.5",
  country: "2.5.4.6",
  organization: "2.5.4.10",
  givenName: "2.5.4.42",
} as const;

// ---------------------------------------------------------------------------------------------
// Input sniffing and base64 / PEM

/** ContentInfo.contentType = id-signedData, as it appears right after the outer SEQUENCE header. */
const SIGNED_DATA_OID = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02];

function sniffDer(b: Uint8Array): boolean {
  if (b.length < 13 || b[0] !== 0x30) return false;
  const len = b[1];
  if (len > 0x84) return false;
  const p = len > 0x80 ? 2 + (len & 0x7f) : 2;
  return SIGNED_DATA_OID.every((v, i) => b[p + i] === v);
}

const isB64 = (c: number) =>
  (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c === 0x2b || c === 0x2f;
const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

/** Offset where the base64 body starts: after a BOM, blank space and a "-----BEGIN ...-----" line. */
function base64Start(b: Uint8Array): number {
  let p = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0;
  while (p < b.length && isSpace(b[p])) p++;
  if (b[p] === 0x2d) {
    // "-----BEGIN PKCS7-----" (or CMS, or anything): skip to the end of that line.
    while (p < b.length && b[p] !== 0x0a) p++;
  }
  return p;
}

function decodeBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** First bytes of a base64 / PEM text, or null when the text does not start like base64. */
function base64Prefix(b: Uint8Array): Uint8Array | null {
  let s = "";
  for (let p = base64Start(b); p < b.length && s.length < 32; p++) {
    if (isB64(b[p])) s += String.fromCharCode(b[p]);
    else if (!isSpace(b[p])) break;
  }
  return s.length === 32 ? decodeBase64(s) : null;
}

/** Whole base64 / PEM body decoded, or null when it is not clean base64. */
function base64Body(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  // Bytes outside ASCII decode to characters the check below rejects, whatever the decoder maps them to.
  let s = new TextDecoder("latin1").decode(b.subarray(base64Start(b)));
  const end = s.indexOf("-----"); // "-----END ...-----" and anything after it
  if (end >= 0) s = s.slice(0, end);
  s = s.replace(/[\t\n\r ]+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 === 1) return null;
  try {
    return decodeBase64(s);
  } catch {
    return null;
  }
}

/** Cheap sniff: DER/BER ContentInfo with the signedData OID, or base64 / PEM of one. Does not parse the file. */
export function isP7m(bytes: Uint8Array): boolean {
  if (sniffDer(bytes)) return true;
  const prefix = base64Prefix(bytes);
  return prefix !== null && sniffDer(prefix);
}

/** Binary CMS bytes for the input, decoding base64 / PEM when needed. */
function toDer(bytes: Uint8Array): Uint8Array {
  if (sniffDer(bytes)) return bytes;
  const prefix = base64Prefix(bytes);
  if (!prefix || !sniffDer(prefix)) throw new P7mError("not-p7m");
  const der = base64Body(bytes);
  if (!der) throw new P7mError("malformed", "p7m: bad base64");
  return der;
}

// ---------------------------------------------------------------------------------------------
// Certificates and names

interface Name {
  /** [attribute OID, value] in file order. */
  attrs: [string, string][];
}

function parseName(buf: Uint8Array, node: Asn1): Name {
  const attrs: [string, string][] = [];
  for (const rdn of children(buf, expect(node, TAG.sequence))) {
    for (const atv of children(buf, expect(rdn, TAG.set))) {
      const [type, value] = children(buf, expect(atv, TAG.sequence));
      if (!value) throw new Asn1Error("bad name");
      // Values are directory strings; anything structured (a SEQUENCE, say) is kept as "".
      attrs.push([oid(buf, type), value.tag === TAG.sequence || value.tag === TAG.set ? "" : text(buf, value)]);
    }
  }
  return { attrs };
}

const first = (name: Name, type: string) => name.attrs.find(([t]) => t === type)?.[1];

/** "CN, O, C" (falls back to every value, most specific first). */
function oneLiner(name: Name): string {
  const picked = [NAME.commonName, NAME.organization, NAME.country].map((t) => first(name, t)).filter(Boolean);
  return (picked.length ? picked : name.attrs.map(([, v]) => v).reverse()).join(", ");
}

interface Cert {
  issuerRaw: Uint8Array;
  serial: Uint8Array;
  issuer: Name;
  subject: Name;
  notBefore: Date;
  notAfter: Date;
  /** Whole SubjectPublicKeyInfo, for importKey("spki"). */
  spki: Uint8Array<ArrayBuffer>;
  keyAlgorithm: string;
  /** Named curve OID for EC keys. */
  curve?: string;
  ski?: Uint8Array;
}

function parseCert(buf: Uint8Array, node: Asn1): Cert {
  const [tbsNode] = children(buf, expect(node, TAG.sequence));
  const tbs = children(buf, expect(tbsNode, TAG.sequence));
  let i = tbs[0]?.tag === TAG.ctx0 ? 1 : 0; // explicit version
  const serial = body(buf, expect(tbs[i++], TAG.integer));
  i++; // signature algorithm
  const issuerNode = expect(tbs[i++], TAG.sequence);
  const [nb, na] = children(buf, expect(tbs[i++], TAG.sequence));
  const subject = parseName(buf, tbs[i++]);
  const spkiNode = expect(tbs[i++], TAG.sequence);
  const [algNode] = children(buf, spkiNode);
  const [keyAlgOid, keyParams] = children(buf, expect(algNode, TAG.sequence));
  const keyAlgorithm = oid(buf, keyAlgOid);

  let ski: Uint8Array | undefined;
  const extNode = tbs.slice(i).find((n) => n.tag === TAG.ctx3);
  if (extNode) {
    const [exts] = children(buf, extNode);
    for (const ext of children(buf, expect(exts, TAG.sequence))) {
      const parts = children(buf, expect(ext, TAG.sequence));
      if (oid(buf, parts[0]) !== OID.subjectKeyIdentifier) continue;
      const value = expect(parts[parts.length - 1], TAG.octetString);
      ski = body(buf, expect(readTlv(buf, value.bodyStart, value.bodyEnd), TAG.octetString));
    }
  }

  return {
    issuerRaw: raw(buf, issuerNode),
    serial,
    issuer: parseName(buf, issuerNode),
    subject,
    notBefore: time(buf, nb),
    notAfter: time(buf, na),
    spki: raw(buf, spkiNode).slice(),
    keyAlgorithm,
    curve: keyAlgorithm === OID.ecPublicKey && keyParams?.tag === TAG.oid ? oid(buf, keyParams) : undefined,
    ski,
  };
}

// ---------------------------------------------------------------------------------------------
// SignedData

interface AlgId {
  oid: string;
  params?: Asn1;
}

function algId(buf: Uint8Array, node: Asn1 | undefined): AlgId {
  const [o, params] = children(buf, expect(node, TAG.sequence));
  return { oid: oid(buf, o), params };
}

interface RawSigner {
  sid: { issuerRaw: Uint8Array; serial: Uint8Array; issuer: Name } | { ski: Uint8Array };
  digest: AlgId;
  /** The [0] IMPLICIT signedAttrs element as found in the file. */
  signedAttrs?: Asn1;
  attrs: Map<string, Asn1[]>;
  signature: AlgId;
  signatureValue: Uint8Array<ArrayBuffer>;
  hasTimestamp: boolean;
}

interface Envelope {
  content: Uint8Array<ArrayBuffer>;
  certs: Cert[];
  signers: RawSigner[];
}

function attributes(buf: Uint8Array, node: Asn1): Map<string, Asn1[]> {
  const map = new Map<string, Asn1[]>();
  for (const attr of children(buf, node)) {
    const [type, values] = children(buf, expect(attr, TAG.sequence));
    map.set(oid(buf, type), children(buf, expect(values, TAG.set)));
  }
  return map;
}

function parseSigner(buf: Uint8Array, node: Asn1): RawSigner {
  const kids = children(buf, expect(node, TAG.sequence));
  let i = 1; // version
  const sidNode = kids[i++];
  let sid: RawSigner["sid"];
  if (sidNode?.tag === TAG.sequence) {
    const [issuerNode, serialNode] = children(buf, sidNode);
    sid = {
      issuerRaw: raw(buf, expect(issuerNode, TAG.sequence)),
      serial: body(buf, expect(serialNode, TAG.integer)),
      issuer: parseName(buf, issuerNode),
    };
  } else if (sidNode?.tag === TAG.ctx0Prim || sidNode?.tag === TAG.ctx0) {
    sid = { ski: stringBytes(buf, sidNode) };
  } else throw new Asn1Error("bad signer identifier");

  const digest = algId(buf, kids[i++]);
  let signedAttrs: Asn1 | undefined;
  if (kids[i]?.tag === TAG.ctx0) signedAttrs = kids[i++];
  const signature = algId(buf, kids[i++]);
  const sigNode = kids[i++];
  if (!sigNode || (sigNode.tag !== TAG.octetString && sigNode.tag !== TAG.octetStringC)) throw new Asn1Error("bad signature");
  const unsigned = kids[i]?.tag === TAG.ctx1 ? attributes(buf, kids[i]) : undefined;

  return {
    sid,
    digest,
    signedAttrs,
    attrs: signedAttrs ? attributes(buf, signedAttrs) : new Map(),
    signature,
    signatureValue: stringBytes(buf, sigNode),
    hasTimestamp: unsigned?.has(OID.signatureTimeStamp) ?? false,
  };
}

function parseEnvelope(buf: Uint8Array): Envelope {
  const top = readTlv(buf, 0, buf.length); // trailing bytes after the envelope are ignored
  const [type, explicit] = children(buf, expect(top, TAG.sequence));
  if (oid(buf, type) !== OID.signedData) throw new P7mError("not-p7m");
  const [sd] = children(buf, expect(explicit, TAG.ctx0));
  const kids = children(buf, expect(sd, TAG.sequence));
  expect(kids[1], TAG.set); // digestAlgorithms
  const encap = children(buf, expect(kids[2], TAG.sequence));
  oid(buf, encap[0]); // eContentType: any (id-data in practice)
  if (encap[1]?.tag !== TAG.ctx0) throw new P7mError("detached");
  const [eContent] = children(buf, encap[1]);
  if (!eContent || (eContent.tag !== TAG.octetString && eContent.tag !== TAG.octetStringC)) {
    throw new Asn1Error("bad eContent");
  }
  const content = stringBytes(buf, eContent);

  let i = 3;
  const certs: Cert[] = [];
  if (kids[i]?.tag === TAG.ctx0) {
    for (const c of children(buf, kids[i++])) {
      // Other CertificateChoices (attribute certificates, ...) and certificates this reader cannot
      // make sense of are skipped: their signer then reports "no-certificate" instead of failing the file.
      if (c.tag !== TAG.sequence) continue;
      try {
        certs.push(parseCert(buf, c));
      } catch (e) {
        if (!(e instanceof Asn1Error)) throw e;
      }
    }
  }
  if (kids[i]?.tag === TAG.ctx1) i++; // crls
  const signerInfos = expect(kids[i], TAG.set);
  return { content, certs, signers: children(buf, signerInfos).map((s) => parseSigner(buf, s)) };
}

// ---------------------------------------------------------------------------------------------
// Verification

type Check = Pick<SignerInfo, "check" | "reason">;

function findCert(signer: RawSigner, certs: Cert[]): Cert | undefined {
  const sid = signer.sid;
  if ("ski" in sid) return certs.find((c) => c.ski && equalBytes(c.ski, sid.ski));
  return certs.find((c) => equalBytes(c.serial, sid.serial) && equalBytes(c.issuerRaw, sid.issuerRaw));
}

/** DER SEQUENCE { r INTEGER, s INTEGER } -> r || s, each left-padded to the curve size (WebCrypto's format). */
function ecdsaRaw(sig: Uint8Array, size: number): Uint8Array<ArrayBuffer> | null {
  try {
    const parts = children(sig, expect(readTlv(sig, 0, sig.length), TAG.sequence));
    if (parts.length !== 2) return null;
    const out = new Uint8Array(size * 2);
    for (let k = 0; k < 2; k++) {
      let v = body(sig, expect(parts[k], TAG.integer));
      while (v.length > 1 && v[0] === 0) v = v.subarray(1);
      if (v.length > size) return null;
      out.set(v, k * size + size - v.length);
    }
    return out;
  } catch {
    return null;
  }
}

interface PssParams {
  hash: string;
  saltLength: number;
}

/** RSASSA-PSS-params; null when WebCrypto cannot express them (MGF1 hash differs, odd trailer). */
function pssParams(buf: Uint8Array, params: Asn1 | undefined): PssParams | null {
  let hash = "SHA-1";
  let mgfHash = "SHA-1";
  let saltLength = 20;
  if (params && params.tag === TAG.sequence) {
    for (const field of children(buf, params)) {
      const [inner] = children(buf, field);
      if (field.tag === 0xa0) hash = DIGESTS[algId(buf, inner).oid] ?? "?";
      else if (field.tag === 0xa1) {
        const mgf = algId(buf, inner);
        if (mgf.oid !== OID.mgf1) return null;
        mgfHash = DIGESTS[algId(buf, mgf.params).oid] ?? "?";
      } else if (field.tag === 0xa2) saltLength = smallInt(buf, inner);
      else if (field.tag === 0xa3 && smallInt(buf, inner) !== 1) return null;
    }
  }
  return hash === mgfHash && WEBCRYPTO_DIGESTS.has(hash) ? { hash, saltLength } : null;
}

function signatureName(signer: RawSigner, cert: Cert | undefined): string {
  const o = signer.signature.oid;
  if (o in RSA_PKCS1) return "RSA";
  if (o === OID.rsaPss) return "RSA-PSS";
  if (o in ECDSA) {
    const curve = cert?.curve && CURVES[cert.curve];
    return curve ? `ECDSA ${curve.name}` : "ECDSA";
  }
  return OTHER_SIGNATURES[o] ?? o;
}

async function verify(signer: RawSigner, buf: Uint8Array, content: Uint8Array<ArrayBuffer>, cert: Cert | undefined): Promise<Check> {
  const subtle = globalThis.crypto?.subtle;
  const digestName = DIGESTS[signer.digest.oid];

  // 1. Content digest against the signed messageDigest attribute.
  let data: Uint8Array<ArrayBuffer> = content;
  if (signer.signedAttrs) {
    const md = signer.attrs.get(OID.messageDigest)?.[0];
    if (!md || md.tag !== TAG.octetString) return { check: "invalid", reason: "missing-digest" };
    if (!digestName || !WEBCRYPTO_DIGESTS.has(digestName)) return { check: "unsupported", reason: "unsupported-algorithm" };
    if (!subtle) return { check: "unsupported", reason: "no-webcrypto" };
    const actual = new Uint8Array(await subtle.digest(digestName, content));
    if (!equalBytes(actual, body(buf, md))) return { check: "invalid", reason: "digest-mismatch" };
    // The signature covers the DER SET OF attributes: the original bytes with [0] IMPLICIT turned back into SET.
    data = raw(buf, signer.signedAttrs).slice();
    data[0] = TAG.set;
  }

  // 2. Signature with the certificate's public key.
  if (!cert) return { check: "unsupported", reason: "no-certificate" };
  if (!subtle) return { check: "unsupported", reason: "no-webcrypto" };
  const o = signer.signature.oid;
  let importAlg: RsaHashedImportParams | EcKeyImportParams;
  let verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  let sig: Uint8Array<ArrayBuffer> | null = signer.signatureValue;

  if (o in RSA_PKCS1 || o === OID.rsaPss) {
    if (cert.keyAlgorithm !== OID.rsaEncryption) return { check: "unsupported", reason: "unsupported-key" };
    if (o === OID.rsaPss) {
      const pss = pssParams(buf, signer.signature.params);
      if (!pss) return { check: "unsupported", reason: "unsupported-algorithm" };
      importAlg = { name: "RSA-PSS", hash: pss.hash };
      verifyAlg = { name: "RSA-PSS", saltLength: pss.saltLength };
    } else {
      const hash = RSA_PKCS1[o] ?? digestName;
      if (!hash || !WEBCRYPTO_DIGESTS.has(hash)) return { check: "unsupported", reason: "unsupported-algorithm" };
      importAlg = { name: "RSASSA-PKCS1-v1_5", hash };
      verifyAlg = { name: "RSASSA-PKCS1-v1_5" };
    }
  } else if (o in ECDSA) {
    const curve = cert.curve ? CURVES[cert.curve] : undefined;
    if (cert.keyAlgorithm !== OID.ecPublicKey || !curve) return { check: "unsupported", reason: "unsupported-key" };
    const hash = ECDSA[o] ?? digestName;
    if (!hash || !WEBCRYPTO_DIGESTS.has(hash)) return { check: "unsupported", reason: "unsupported-algorithm" };
    importAlg = { name: "ECDSA", namedCurve: curve.name };
    verifyAlg = { name: "ECDSA", hash };
    sig = ecdsaRaw(sig, curve.size);
    if (!sig) return { check: "invalid", reason: "bad-signature" };
  } else {
    return { check: "unsupported", reason: "unsupported-algorithm" };
  }

  let key: CryptoKey;
  try {
    key = await subtle.importKey("spki", cert.spki, importAlg, false, ["verify"]);
  } catch {
    return { check: "unsupported", reason: "unsupported-key" };
  }
  let ok: boolean;
  try {
    ok = await subtle.verify(verifyAlg, key, sig, data);
  } catch {
    return { check: "unsupported", reason: "unsupported-algorithm" };
  }
  return ok ? { check: "valid" } : { check: "invalid", reason: "bad-signature" };
}

async function describe(signer: RawSigner, env: Envelope, buf: Uint8Array): Promise<SignerInfo> {
  const cert = findCert(signer, env.certs);
  const st = signer.attrs.get(OID.signingTime)?.[0];
  let signingTime: Date | undefined;
  try {
    signingTime = st ? time(buf, st) : undefined;
  } catch {
    signingTime = undefined; // an unreadable signingTime is left out rather than failing the file
  }
  const info: SignerInfo = {
    issuer: cert ? oneLiner(cert.issuer) : "ski" in signer.sid ? "" : oneLiner(signer.sid.issuer),
    notBefore: cert ? cert.notBefore : new Date(NaN),
    notAfter: cert ? cert.notAfter : new Date(NaN),
    hasTimestamp: signer.hasTimestamp,
    digestAlgorithm: DIGESTS[signer.digest.oid] ?? signer.digest.oid,
    signatureAlgorithm: signatureName(signer, cert),
    ...(await verify(signer, buf, env.content, cert).catch(
      (): Check => ({ check: "unsupported", reason: "unsupported-algorithm" }), // unreadable algorithm parameters
    )),
  };
  if (cert) {
    const s = cert.subject;
    const fields = ["commonName", "givenName", "surname", "organization", "serialNumber"] as const;
    for (const key of fields) {
      const v = first(s, NAME[key]);
      if (v) info[key] = v;
    }
  }
  if (signingTime) {
    info.signingTime = signingTime;
    if (cert) info.certValidAtSigning = cert.notBefore <= signingTime && signingTime <= cert.notAfter;
  }
  return info;
}

/** Parses one envelope; anything that is not a P7mError becomes "malformed". */
function envelope(bytes: Uint8Array): { buf: Uint8Array; env: Envelope } {
  try {
    const buf = toDer(bytes);
    return { buf, env: parseEnvelope(buf) };
  } catch (e) {
    if (e instanceof P7mError) throw e;
    throw new P7mError("malformed", e instanceof Error ? `p7m: ${e.message}` : undefined);
  }
}

/**
 * Unwraps a .p7m (DER, BER or base64 / PEM) down to the signed document, through nested envelopes,
 * and checks every signature. Throws P7mError: "not-p7m", "detached" (signature without the
 * document), "malformed" (truncated or broken) or "too-deep" (more than 5 envelopes).
 */
export async function openP7m(bytes: Uint8Array): Promise<OpenedP7m> {
  let { buf, env } = envelope(bytes);
  const layers: SignerInfo[][] = [];
  for (;;) {
    const current = { buf, env };
    layers.push(await Promise.all(current.env.signers.map((s) => describe(s, current.env, current.buf))));
    if (!isP7m(env.content)) break;
    try {
      ({ buf, env } = envelope(env.content));
    } catch {
      break; // looked like an envelope but is not one: the content is the document
    }
    if (layers.length >= MAX_LAYERS) throw new P7mError("too-deep");
  }
  return { content: env.content, layers };
}

/**
 * Name of the document inside: "fattura.XML.p7m" -> "fattura.XML", "a.pdf.p7m.p7m" -> "a.pdf",
 * "x.p7m" -> "x" (case-insensitive). Only ".p7m" is stripped. Empty result -> "document".
 */
export function innerFileName(name: string): string {
  const inner = name.replace(/(?:\.p7m)+$/i, "").trim();
  return inner === "" || inner === "." ? "document" : inner;
}
