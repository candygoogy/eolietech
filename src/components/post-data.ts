/**
 * Build-time data for the home postcard's compressor (Desk.astro -> src/scripts/desk-post.ts):
 * its strings (`home.post.*`), the image compressor's free size limit, the two pages it links to,
 * and the picker's accept list (JPG, PNG, WebP, AVIF; HEIC is left out on purpose, so iPhones hand
 * over a JPEG copy instead of a HEIC the home cannot decode). Rendered as data attributes on the
 * postcard, so the script needs no inline JSON.
 */
import { getDictionary, localePath } from "../i18n";
import { RASTER_FORMATS, acceptFor } from "../tools/image-shared/formats";
import { getTool } from "../tools/registry";
import type { Locale } from "../tools/types";

export function postData(locale: Locale) {
  const compress = getTool("image-compress");
  const heic = getTool("heic-to-jpg");
  const strings = Object.fromEntries(Object.entries(getDictionary(locale)).filter(([k]) => k.startsWith("home.post.")));
  return {
    strings: JSON.stringify(strings),
    maxBytes: String(compress?.limits.free.maxBytes ?? 0),
    moreHref: localePath(locale, compress?.slug[locale] ?? "compress-image"),
    heicHref: localePath(locale, heic?.slug[locale] ?? "heic-to-jpg"),
    accept: acceptFor(RASTER_FORMATS),
  };
}
