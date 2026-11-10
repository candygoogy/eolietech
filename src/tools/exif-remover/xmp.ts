/**
 * XMP packets (XML text): find the location, and blank it in place for "Location only".
 *
 * Location properties are matched by name, case-insensitively and in any namespace: exif:GPSLatitude,
 * drone-dji:GpsLongitude, Camera:...Latitude, anything with "GPS", "Latitude" or "Longitude" in its
 * name, as an attribute or as an element. Blanking overwrites them with spaces, so the packet keeps
 * its byte length (no offset elsewhere in the file moves) and stays well-formed XML. A packet where
 * that cannot be done cleanly (a property that never closes, a stray closing tag, broken markup) is
 * reported as "unsafe", and the caller removes the whole packet.
 *
 * The scan is one forward pass built on indexOf, with no backtracking regex over the packet, so it
 * takes linear time on any input, hostile packets included.
 */
import type { Coords } from "./tiff";

/** One char per byte (latin1), so string indexes are byte offsets. */
export function latin1(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
}

/** A property name that can hold a location (case-insensitive, any namespace). */
export const isLocationName = (name: string): boolean => /gps|latitude|longt?itude/i.test(name);

const localName = (name: string): string => name.slice(name.indexOf(":") + 1).toLowerCase();

/** Google motion photo properties pointing at the video stored after the image (GCamera:MotionPhoto*, GCamera:MicroVideo*). */
const isMotionPhotoName = (name: string): boolean => /^(?:motionphoto|microvideo)/.test(localName(name));

const isNameChar = (c: number) =>
  (c >= 0x61 && c <= 0x7a) || (c >= 0x41 && c <= 0x5a) || (c >= 0x30 && c <= 0x39) || c === 0x5f || c === 0x2d || c === 0x2e || c === 0x3a || c >= 0x80;
const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const isXmlns = (name: string) => name === "xmlns" || name.startsWith("xmlns:");

interface Hit {
  name: string;
  /** Span to blank: for an attribute, from the whitespace before it to its closing quote. */
  from: number;
  to: number;
  /** The value: attribute value, or the element's content. */
  valueFrom: number;
  valueTo: number;
}

interface Scan {
  hits: Hit[];
  /** Every matching name seen, including one the scan stopped at. */
  names: string[];
  /** False when the markup could not be followed to the end, or a match could not be cut out. */
  clean: boolean;
}

/** Find every attribute and element whose name passes `match`, skipping comments, CDATA and processing instructions. */
function scan(s: string, match: (name: string) => boolean): Scan {
  const n = s.length;
  const hits: Hit[] = [];
  const names: string[] = [];
  const fail = (): Scan => ({ hits, names, clean: false });
  const skipSpace = (j: number) => {
    while (j < n && isSpace(s.charCodeAt(j))) j++;
    return j;
  };
  let i = 0;
  while ((i = s.indexOf("<", i)) >= 0) {
    if (s.startsWith("<!--", i) || s.startsWith("<![CDATA[", i) || s[i + 1] === "?" || s[i + 1] === "!") {
      const close = s.startsWith("<!--", i) ? "-->" : s.startsWith("<![CDATA[", i) ? "]]>" : s[i + 1] === "?" ? "?>" : ">";
      const at = s.indexOf(close, i + 2);
      if (at < 0) return fail();
      i = at + close.length;
      continue;
    }
    const closing = s[i + 1] === "/";
    let j = closing ? i + 2 : i + 1;
    const nameAt = j;
    while (j < n && isNameChar(s.charCodeAt(j))) j++;
    const name = s.slice(nameAt, j);
    if (!name) {
      i++;
      continue;
    }
    if (closing) {
      // A closing tag for a location property whose opening tag was not cut out with it.
      if (match(name)) {
        names.push(name);
        return fail();
      }
      i = j;
      continue;
    }
    const attrs: Hit[] = [];
    let end = -1;
    let selfClosing = false;
    for (;;) {
      const before = j;
      j = skipSpace(j);
      if (j >= n) return fail();
      if (s[j] === ">") {
        end = j + 1;
        break;
      }
      if (s[j] === "/" && s[j + 1] === ">") {
        end = j + 2;
        selfClosing = true;
        break;
      }
      if (j === before) return fail();
      const attrAt = j;
      while (j < n && isNameChar(s.charCodeAt(j))) j++;
      if (j === attrAt) return fail();
      const attr = s.slice(attrAt, j);
      j = skipSpace(j);
      if (s[j] !== "=") return fail();
      j = skipSpace(j + 1);
      const quote = s[j];
      if (quote !== '"' && quote !== "'") return fail();
      const close = s.indexOf(quote, j + 1);
      if (close < 0) return fail();
      if (!isXmlns(attr) && match(attr)) {
        names.push(attr);
        attrs.push({ name: attr, from: before, to: close + 1, valueFrom: j + 1, valueTo: close });
      }
      j = close + 1;
    }
    if (!match(name)) {
      hits.push(...attrs);
      i = end;
      continue;
    }
    names.push(name);
    if (selfClosing) {
      hits.push({ name, from: i, to: end, valueFrom: end, valueTo: end });
      i = end;
      continue;
    }
    // The first closing tag with this name. Its content is skipped, so the whole scan stays linear.
    let k = end;
    let closeEnd = -1;
    for (;;) {
      k = s.indexOf(`</${name}`, k);
      if (k < 0) break;
      const m = skipSpace(k + 2 + name.length);
      if (s[m] === ">") {
        closeEnd = m + 1;
        break;
      }
      k = m;
    }
    if (closeEnd < 0) return fail();
    hits.push({ name, from: i, to: closeEnd, valueFrom: end, valueTo: k });
    i = closeEnd;
  }
  return { hits, names, clean: true };
}

/** XMP writes "DDD,MM.mmk" or "DDD,MM,SSk" (k = N, S, E or W); drones write signed decimals ("+38.467812"). */
export function parseXmpCoordinate(value: string, max: number): number | null {
  if (value.length > 64) return null;
  let v: number;
  const dms = /^\s*(\d{1,3})\s*,\s*(\d{1,2}(?:\.\d+)?)\s*(?:,\s*(\d{1,2}(?:\.\d+)?)\s*)?([NSEW])\s*$/i.exec(value);
  if (dms) {
    v = Number(dms[1]) + Number(dms[2]) / 60 + (dms[3] ? Number(dms[3]) / 3600 : 0);
    if (/[SW]/i.test(dms[4]!)) v = -v;
  } else {
    const dec = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*([NSEW])?\s*$/i.exec(value);
    if (!dec) return null;
    v = Number(dec[1]);
    if (dec[2] && /[SW]/i.test(dec[2])) v = -Math.abs(v);
  }
  return Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

/** The value of the best latitude (or longitude) property: GPSLatitude first, then any other name with the word in it. */
function coordinate(s: string, hits: Hit[], word: RegExp, exact: string, max: number): number | null {
  const local = (h: Hit) => h.name.slice(h.name.indexOf(":") + 1).toLowerCase();
  const found = hits.filter((h) => word.test(local(h)) && !/ref$/.test(local(h)));
  found.sort((a, b) => Number(local(b) === exact) - Number(local(a) === exact));
  for (const h of found) {
    const v = h.valueTo - h.valueFrom <= 64 ? parseXmpCoordinate(s.slice(h.valueFrom, h.valueTo), max) : null;
    if (v !== null) return v;
  }
  return null;
}

/** GPS in an XMP packet: coordinates, "unreadable" when a latitude or longitude exists but does not parse, or null. */
export function xmpGps(b: Uint8Array): Coords | "unreadable" | null {
  const text = latin1(b);
  const { hits, names } = scan(text, isLocationName);
  const lat = coordinate(text, hits, /latitude/, "gpslatitude", 90);
  const lon = coordinate(text, hits, /longt?itude/, "gpslongitude", 180);
  if (lat !== null && lon !== null) return { lat, lon };
  return names.some((name) => /latitude|longt?itude/i.test(name)) ? "unreadable" : null;
}

/**
 * The motion photo's entries in each Container:Directory: the rdf:li items whose Semantic is
 * MotionPhoto (or MicroVideo). Primary and GainMap items stay, since Ultra HDR viewers use them to
 * find the gain map; a directory left with nothing but the Primary item goes whole. Null: unsafe.
 */
function motionDirectorySpans(s: string): { from: number; to: number }[] | null {
  const dirs = scan(s, (name) => name.toLowerCase() === "container:directory");
  if (!dirs.clean) return null;
  const spans: { from: number; to: number }[] = [];
  for (const dir of dirs.hits) {
    const content = s.slice(dir.valueFrom, dir.valueTo);
    const items = scan(content, (name) => name.toLowerCase() === "rdf:li");
    if (!items.clean) return null;
    const kept: string[] = [];
    const drop: { from: number; to: number }[] = [];
    for (const li of items.hits) {
      const body = content.slice(li.from, li.to);
      const semantic = scan(body, (name) => localName(name) === "semantic");
      if (!semantic.clean) return null;
      const h = semantic.hits[0];
      const value = h ? body.slice(h.valueFrom, h.valueTo).trim().toLowerCase() : "";
      if (value === "motionphoto" || value === "microvideo") drop.push({ from: dir.valueFrom + li.from, to: dir.valueFrom + li.to });
      else kept.push(value);
    }
    if (drop.length === 0) continue;
    if (kept.every((v) => v === "primary")) spans.push({ from: dir.from, to: dir.to });
    else spans.push(...drop);
  }
  return spans;
}

/**
 * Overwrite every location property with spaces, in place; with `motionPhoto`, the motion photo
 * properties and directory items too (for when the video after the image is removed). "unsafe": the
 * packet could not be cleaned with certainty and was left untouched, so the caller must remove all of it.
 */
export function blankXmpGps(b: Uint8Array, motionPhoto = false): "unchanged" | "blanked" | "unsafe" {
  const text = latin1(b);
  const match = motionPhoto ? (name: string) => isLocationName(name) || isMotionPhotoName(name) : isLocationName;
  const { hits, clean } = scan(text, match);
  if (!clean) return "unsafe";
  const spans: { from: number; to: number }[] = [...hits];
  if (motionPhoto) {
    const dir = motionDirectorySpans(text);
    if (!dir) return "unsafe";
    spans.push(...dir);
  }
  for (const h of spans) b.fill(0x20, h.from, h.to);
  return spans.length > 0 ? "blanked" : "unchanged";
}
