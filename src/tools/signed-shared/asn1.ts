/**
 * Minimal BER/DER reader for CMS files. Read-only, lazy (a node is parsed only when asked for) and
 * bounds-checked: every length is checked against its parent before use, so a truncated or hostile
 * file ends in an Asn1Error, never a RangeError, a hang or a huge allocation.
 *
 * Handles what real .p7m files contain: definite and indefinite lengths (BER streaming), constructed
 * strings (eContent split into OCTET STRING chunks) and the high-tag-number form (skipped over).
 */

export class Asn1Error extends Error {
  constructor(message = "malformed") {
    super(`asn1: ${message}`);
    this.name = "Asn1Error";
  }
}

export interface Asn1 {
  /** First identifier octet: class + constructed bit + tag number, e.g. 0x30 SEQUENCE, 0xa0 [0]. */
  tag: number;
  constructed: boolean;
  /** Offset of the identifier octet. */
  start: number;
  bodyStart: number;
  /** End of the body (an indefinite-length body stops before its end-of-contents octets). */
  bodyEnd: number;
  /** Offset just past the whole element, end-of-contents included. */
  end: number;
}

export const TAG = {
  integer: 0x02,
  bitString: 0x03,
  octetString: 0x04,
  octetStringC: 0x24,
  oid: 0x06,
  sequence: 0x30,
  set: 0x31,
  ctx0: 0xa0,
  ctx1: 0xa1,
  ctx3: 0xa3,
  ctx0Prim: 0x80,
} as const;

/** Nesting cap for indefinite lengths and constructed strings (real files stay under ~10). */
const MAX_DEPTH = 64;
/**
 * Elements one walk may visit: the children of an indefinite-length element, or the chunks of a
 * constructed string. A 100 MiB document streamed in 1000-byte chunks has about 105,000; a file
 * stuffed with millions of empty chunks is turned away before it costs time or memory.
 */
const MAX_ELEMENTS = 1_000_000;
/** Direct children listed for one structural element (a certificate bag, a name, a set of signers). */
const MAX_CHILDREN = 10_000;

/** Identifier and length octets of the element at `pos`. An indefinite length gives bodyEnd = end = -1. */
function header(buf: Uint8Array, pos: number, limit: number): Asn1 {
  if (limit > buf.length || pos + 2 > limit) throw new Asn1Error("truncated");
  const start = pos;
  const tag = buf[pos++];
  const constructed = (tag & 0x20) !== 0;
  if ((tag & 0x1f) === 0x1f) {
    // High tag number: base-128 continuation octets. Never one CMS cares about; just skip it.
    let n = 0;
    do {
      if (pos >= limit || ++n > 4) throw new Asn1Error("bad tag");
    } while (buf[pos++] & 0x80);
  }
  if (pos >= limit) throw new Asn1Error("truncated");
  const lenByte = buf[pos++];

  if (lenByte === 0x80) {
    if (!constructed) throw new Asn1Error("indefinite primitive");
    return { tag, constructed, start, bodyStart: pos, bodyEnd: -1, end: -1 };
  }

  let len = lenByte;
  if (lenByte > 0x80) {
    const n = lenByte & 0x7f;
    if (n > 4) throw new Asn1Error("length too large");
    if (pos + n > limit) throw new Asn1Error("truncated");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[pos++];
  }
  if (len > limit - pos) throw new Asn1Error("length past end");
  return { tag, constructed, start, bodyStart: pos, bodyEnd: pos + len, end: pos + len };
}

function read(buf: Uint8Array, pos: number, limit: number, depth: number, budget: { left: number }): Asn1 {
  if (depth > MAX_DEPTH) throw new Asn1Error("too deeply nested");
  if (--budget.left < 0) throw new Asn1Error("too many elements");
  const node = header(buf, pos, limit);
  if (node.end >= 0) return node;
  // Indefinite length: walk the children up to the end-of-contents octets (00 00).
  let p = node.bodyStart;
  for (;;) {
    if (p + 2 > limit) throw new Asn1Error("missing end-of-contents");
    if (buf[p] === 0 && buf[p + 1] === 0) {
      node.bodyEnd = p;
      node.end = p + 2;
      return node;
    }
    p = read(buf, p, limit, depth + 1, budget).end;
  }
}

/** Reads the element starting at `pos`, which must end by `limit`. */
export function readTlv(buf: Uint8Array, pos: number, limit: number): Asn1 {
  return read(buf, pos, limit, 0, { left: MAX_ELEMENTS });
}

/** Direct children of a constructed element. */
export function children(buf: Uint8Array, node: Asn1): Asn1[] {
  if (!node.constructed) throw new Asn1Error("not constructed");
  const out: Asn1[] = [];
  for (let p = node.bodyStart; p < node.bodyEnd; ) {
    if (out.length >= MAX_CHILDREN) throw new Asn1Error("too many elements");
    const child = readTlv(buf, p, node.bodyEnd);
    out.push(child);
    p = child.end;
  }
  return out;
}

export function expect(node: Asn1 | undefined, tag: number): Asn1 {
  if (!node || node.tag !== tag) throw new Asn1Error(`expected tag 0x${tag.toString(16)}`);
  return node;
}

/** The body bytes (a view, not a copy). */
export function body(buf: Uint8Array, node: Asn1): Uint8Array {
  return buf.subarray(node.bodyStart, node.bodyEnd);
}

/** The whole element as it sits in the file (a view). */
export function raw(buf: Uint8Array, node: Asn1): Uint8Array {
  return buf.subarray(node.start, node.end);
}

/**
 * Contents of a string type, primitive or constructed (BER chunks, possibly nested, concatenated).
 * Always a fresh copy. The chunks are walked once and only their offsets are kept, then copied into
 * one buffer: no object per chunk, so memory stays near the size of the content however it is split.
 */
export function stringBytes(buf: Uint8Array, node: Asn1): Uint8Array<ArrayBuffer> {
  if (!node.constructed) return buf.slice(node.bodyStart, node.bodyEnd);
  /** [start, end, start, end, ...] of the non-empty chunks, in file order. */
  const ranges: number[] = [];
  let size = 0;
  let left = MAX_ELEMENTS;
  /** Collects the chunks from `p` up to `end`, or up to the end-of-contents octets when `end` is -1. Returns the offset after them. */
  const collect = (p: number, end: number, limit: number, depth: number): number => {
    if (depth > MAX_DEPTH) throw new Asn1Error("too deeply nested");
    for (;;) {
      if (end >= 0) {
        if (p >= end) return p;
      } else {
        if (p + 2 > limit) throw new Asn1Error("missing end-of-contents");
        if (buf[p] === 0 && buf[p + 1] === 0) return p + 2;
      }
      if (--left < 0) throw new Asn1Error("too many chunks");
      const c = header(buf, p, limit);
      if (!c.constructed) {
        if (c.bodyEnd > c.bodyStart) {
          ranges.push(c.bodyStart, c.bodyEnd);
          size += c.bodyEnd - c.bodyStart;
        }
        p = c.end;
      } else if (c.end >= 0) {
        collect(c.bodyStart, c.bodyEnd, c.bodyEnd, depth + 1);
        p = c.end;
      } else {
        p = collect(c.bodyStart, -1, limit, depth + 1);
      }
    }
  };
  collect(node.bodyStart, node.bodyEnd, node.bodyEnd, 0);
  const out = new Uint8Array(size);
  let at = 0;
  for (let i = 0; i < ranges.length; i += 2) {
    out.set(buf.subarray(ranges[i], ranges[i + 1]), at);
    at += ranges[i + 1] - ranges[i];
  }
  return out;
}

/** Dotted OBJECT IDENTIFIER, e.g. "1.2.840.113549.1.7.2". */
export function oid(buf: Uint8Array, node: Asn1 | undefined): string {
  const b = body(buf, expect(node, TAG.oid));
  if (b.length === 0 || b.length > 64) throw new Asn1Error("bad oid");
  const arcs: number[] = [];
  let v = 0;
  for (let i = 0; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (v > Number.MAX_SAFE_INTEGER / 128) throw new Asn1Error("bad oid");
    if (!(b[i] & 0x80)) {
      if (arcs.length === 0) arcs.push(v < 80 ? Math.floor(v / 40) : 2, v < 80 ? v % 40 : v - 80);
      else arcs.push(v);
      v = 0;
    } else if (i === b.length - 1) throw new Asn1Error("bad oid");
  }
  return arcs.join(".");
}

/** Small non-negative INTEGER (versions, salt lengths). */
export function smallInt(buf: Uint8Array, node: Asn1 | undefined): number {
  const b = body(buf, expect(node, TAG.integer));
  if (b.length === 0 || b.length > 4 || b[0] & 0x80) throw new Asn1Error("bad integer");
  let v = 0;
  for (const x of b) v = v * 256 + x;
  return v;
}

/** Directory string types found in certificate names. T61 is treated as latin1, as most readers do. */
export function text(buf: Uint8Array, node: Asn1): string {
  const b = node.constructed ? stringBytes(buf, node) : body(buf, node);
  switch (node.tag & 0x1f) {
    case 0x0c: // UTF8String
      return new TextDecoder("utf-8").decode(b);
    case 0x1e: {
      // BMPString: UTF-16BE
      let s = "";
      for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
      return s;
    }
    case 0x1c: {
      // UniversalString: UTF-32BE
      let s = "";
      for (let i = 0; i + 3 < b.length; i += 4) {
        const cp = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
        s += cp <= 0x10ffff ? String.fromCodePoint(cp) : "�";
      }
      return s;
    }
    default: {
      // PrintableString, IA5String, T61String, VisibleString, NumericString: one byte per char.
      let s = "";
      for (const x of b) s += String.fromCharCode(x);
      return s;
    }
  }
}

/** UTCTime (YYMMDD..., 1950-2049) or GeneralizedTime. Seconds, fractions and +hhmm offsets optional. */
export function time(buf: Uint8Array, node: Asn1 | undefined): Date {
  if (!node || (node.tag !== 0x17 && node.tag !== 0x18)) throw new Asn1Error("expected time");
  const s = text(buf, node);
  const m =
    node.tag === 0x17
      ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?()(Z|[+-]\d{4})$/.exec(s)
      : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:[.,](\d{1,9}))?(Z|[+-]\d{4})?$/.exec(s);
  if (!m) throw new Asn1Error("bad time");
  let year = Number(m[1]);
  if (node.tag === 0x17) year += year < 50 ? 2000 : 1900;
  const ms = m[7] ? Math.round(Number(`0.${m[7]}`) * 1000) : 0;
  let t = Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0), ms);
  const zone = m[8];
  if (zone && zone !== "Z") {
    const sign = zone[0] === "-" ? -1 : 1;
    t -= sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5))) * 60_000;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new Asn1Error("bad time");
  return d;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
