/** Shared types for the EXIF remover's byte modules. */
import type { Coords, ExifInfo } from "./tiff";

export type Format = "jpg" | "png" | "webp";

/** "all": every metadata block (the rotation flag stays). "gps": only the location. */
export type Mode = "all" | "gps";

/** Metadata stored outside the EXIF block (or in it, for the thumbnail). */
export type Block = "xmp" | "iptc" | "comment" | "text" | "time" | "thumbnail" | "extra" | "app";

export interface Report {
  format: Format;
  /** Parsed EXIF block, or null when there is none (or it could not be read). */
  exif: ExifInfo | null;
  /** An EXIF block exists but could not be parsed. */
  exifUnreadable: boolean;
  /** Location from EXIF, else from XMP. */
  gps: Coords | "unreadable" | null;
  blocks: Block[];
}

export interface Cleaned {
  bytes: Uint8Array;
  /** Orientation written back in a minimal EXIF block ("all" mode), or null. */
  keptOrientation: number | null;
  /** "gps" mode: an EXIF block that could not be parsed was removed whole. */
  droppedUnreadable: boolean;
}
