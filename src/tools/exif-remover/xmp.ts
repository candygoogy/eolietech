/**
 * XMP packets (XML text): find GPS coordinates, and blank them in place for "Location only".
 * Blanking overwrites the GPS properties with spaces, so the packet keeps its byte length (no offset
 * elsewhere in the file moves) and stays well-formed XML.
 */
import type { Coords } from "./tiff";

/** One char per byte (latin1), so string indexes are byte offsets. */
export function latin1(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
}

/** Attribute form (exif:GPSLatitude="38,28.04N") and element form (<exif:GPSLatitude>...</exif:GPSLatitude>). */
const GPS_ATTR = /\s[A-Za-z][\w.-]*:GPS[A-Za-z]*\s*=\s*(?:"[^"]*"|'[^']*')/g;
const GPS_ELEM = /<([A-Za-z][\w.-]*:GPS[A-Za-z]*)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1\s*>)/g;

/** XMP writes "DDD,MM.mmk" or "DDD,MM,SSk" (k = N, S, E or W). */
export function parseXmpCoordinate(value: string, max: number): number | null {
  const m = /^\s*(\d{1,3})\s*,\s*(\d{1,2}(?:\.\d+)?)\s*(?:,\s*(\d{1,2}(?:\.\d+)?)\s*)?([NSEW])\s*$/i.exec(value);
  if (!m) return null;
  let v = Number(m[1]) + Number(m[2]) / 60 + (m[3] ? Number(m[3]) / 3600 : 0);
  if (/[SW]/i.test(m[4]!)) v = -v;
  return Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

function property(text: string, name: string): string | null {
  const attr = new RegExp(`[\\w.-]+:${name}\\s*=\\s*["']([^"']*)["']`).exec(text);
  if (attr) return attr[1]!;
  const elem = new RegExp(`<[\\w.-]+:${name}\\b[^>]*>([^<]*)<`).exec(text);
  return elem ? elem[1]! : null;
}

/** GPS in an XMP packet: coordinates, "unreadable" when they exist but do not parse, or null. */
export function xmpGps(b: Uint8Array): Coords | "unreadable" | null {
  const text = latin1(b);
  const latRaw = property(text, "GPSLatitude");
  const lonRaw = property(text, "GPSLongitude");
  if (latRaw === null && lonRaw === null) return null;
  const lat = latRaw === null ? null : parseXmpCoordinate(latRaw, 90);
  const lon = lonRaw === null ? null : parseXmpCoordinate(lonRaw, 180);
  return lat !== null && lon !== null ? { lat, lon } : "unreadable";
}

/** Overwrite every GPS property with spaces, in place. Returns true when something was blanked. */
export function blankXmpGps(b: Uint8Array): boolean {
  const text = latin1(b);
  let changed = false;
  for (const re of [GPS_ELEM, GPS_ATTR]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      b.fill(0x20, m.index, m.index + m[0].length);
      changed = true;
    }
  }
  return changed;
}
