/**
 * image-target-size worker: JPG / PNG / WebP / AVIF in; JPG or WebP out, at the largest size and highest
 * quality that fit the byte budget (search in ./search.ts). A file already under the budget in the
 * chosen format comes back as it was, minus its metadata (./keep.ts). Decoding (EXIF orientation applied), metadata-free encoding and
 * errors come from the shared runJob.
 */
import { encode, resizeTo } from "../image-shared/codecs";
import { flattenAlpha } from "../image-shared/formats";
import { JobError, serve } from "../image-shared/run-job";
import { keepAsIs } from "./keep";
import { searchFit, type Size } from "./search";
import type { TargetSettings } from "./settings";

serve(["jpg", "png", "webp", "avif"], undefined, undefined, async (img, format, settings, source) => {
  const target = (settings as TargetSettings).targetBytes;
  const kept = keepAsIs(source.buffer, source.input, format, target);
  if (kept) return { buffer: kept, flattened: false, unchanged: true };
  // JPG has no transparency: flatten once onto white, so every smaller copy starts from the same pixels.
  const flattened = format === "jpg" && flattenAlpha(img.data);

  // Only the copy at the size being searched is kept; the search moves to a new size at most a few times.
  let copy: { key: string; img: ImageData } | null = null;
  const fitting = new Map<string, ArrayBuffer>();
  const key = (s: Size) => `${s.width}x${s.height}`;

  const result = await searchFit({
    width: img.width,
    height: img.height,
    targetBytes: target,
    encode: async (size, quality) => {
      if (copy?.key !== key(size)) copy = { key: key(size), img: await resizeTo(img, size.width, size.height) };
      const out = await encode(copy.img, format, quality);
      if (out.buffer.byteLength <= target) fitting.set(`${key(size)}@${quality}`, out.buffer);
      return out.buffer.byteLength;
    },
  });
  if (!result.ok) throw new JobError("noFit");
  const { width, height, quality } = result.fit;
  const buffer = fitting.get(`${key(result.fit)}@${quality}`)!;
  return { buffer, flattened, width, height, quality };
});
