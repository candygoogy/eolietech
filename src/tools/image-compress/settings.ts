/** image-compress: variant preset -> UI configuration (pure, unit-tested). */
import { RASTER_FORMATS, acceptFor, isRasterFormat, type OutputChoice, type RasterFormat } from "../image-shared/formats";

export const DEFAULT_QUALITY = 75;

export interface CompressConfig {
  /** Formats the drop zone accepts. */
  inputs: RasterFormat[];
  accept: string;
  /** Preselected output. */
  output: OutputChoice;
  /** True on a conversion variant page (e.g. /webp-to-png/). */
  isConversion: boolean;
}

/** `{}` on /compress-image/; `{ from, to }` on variants such as /png-to-webp/. Unknown values fall back to the base page. */
export function configFromPreset(preset: Record<string, unknown>): CompressConfig {
  const from = preset.from;
  const to = preset.to;
  if (isRasterFormat(from) && isRasterFormat(to)) {
    return { inputs: [from], accept: acceptFor([from]), output: to, isConversion: true };
  }
  const inputs = [...RASTER_FORMATS];
  return { inputs, accept: acceptFor(inputs), output: "original", isConversion: false };
}
