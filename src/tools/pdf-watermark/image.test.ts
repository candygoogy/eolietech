import { describe, expect, it } from "vitest";
import { jpegOrientation, sniffImage } from "./image";

/** A JPEG header with an APP1 Exif segment holding one Orientation entry (no image data needed). */
function jpegWithOrientation(value: number, littleEndian: boolean): Uint8Array {
  const tiff: number[] = [];
  const u16 = (v: number) => (littleEndian ? tiff.push(v & 0xff, v >> 8) : tiff.push(v >> 8, v & 0xff));
  const u32 = (v: number) =>
    littleEndian ? tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24) : tiff.push(v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
  tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]));
  u16(42);
  u32(8);
  u16(1); // one entry
  u16(0x0112);
  u16(3); // SHORT
  u32(1);
  u16(value);
  u16(0);
  u32(0); // no next IFD
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = exif.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xe1, len >> 8, len & 0xff, ...exif, 0xff, 0xda, 0, 2]);
}

describe("logo files", () => {
  it("tells PNG from JPEG by content", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });

  it("reads the EXIF orientation of a JPEG, in either byte order", () => {
    expect(jpegOrientation(jpegWithOrientation(6, true))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(3, false))).toBe(3);
    expect(jpegOrientation(jpegWithOrientation(1, false))).toBe(1);
  });

  it("falls back to upright for files without EXIF or with broken data", () => {
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 1]))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(9, true))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(6, true).slice(0, 20))).toBe(1);
    expect(jpegOrientation(new Uint8Array([1, 2, 3]))).toBe(1);
  });
});
