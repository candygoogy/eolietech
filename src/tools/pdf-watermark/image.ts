/**
 * Logo files for the image watermark (pure, unit-tested). pdf-lib embeds PNG and JPEG bytes as they
 * are; these helpers tell the two apart by their content and spot JPEGs that a browser shows turned
 * (EXIF orientation), which have to be redrawn upright before embedding so the PDF matches the preview.
 */

export type ImageFormat = "png" | "jpg";

/** The format from the file's first bytes, whatever its name says. */
export function sniffImage(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

/** EXIF orientation (1..8) of a JPEG, or 1 when it has none or it can't be read. */
export function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let p = 2;
  while (p + 4 <= bytes.length) {
    if (bytes[p] !== 0xff) return 1;
    const marker = bytes[p + 1]!;
    // Start of scan or end of image: no more metadata segments.
    if (marker === 0xda || marker === 0xd9) return 1;
    const len = view.getUint16(p + 2);
    if (len < 2) return 1;
    const start = p + 4;
    const end = Math.min(bytes.length, p + 2 + len);
    if (marker === 0xe1 && end - start >= 14 && view.getUint32(start) === 0x45786966 && view.getUint16(start + 4) === 0) {
      return tiffOrientation(view, start + 6, end);
    }
    p += 2 + len;
  }
  return 1;
}

function tiffOrientation(view: DataView, tiff: number, end: number): number {
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const le = order === 0x4949;
  if (tiff + 8 > end) return 1;
  const ifd = tiff + view.getUint32(tiff + 4, le);
  if (ifd + 2 > end) return 1;
  const count = view.getUint16(ifd, le);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return 1;
    if (view.getUint16(entry, le) === 0x0112) {
      const value = view.getUint16(entry + 8, le);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}
