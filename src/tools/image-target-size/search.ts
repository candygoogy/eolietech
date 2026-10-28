/**
 * image-target-size: the search for the biggest, best-looking image that fits a byte budget (pure,
 * unit-tested; the worker supplies the real encoder).
 *
 * Order of preference: the largest pixel size at which the quality floor still fits, and at that size
 * the highest quality that fits. Instead of a blind search, a small probe copy is encoded first; its
 * bytes per pixel give the starting scale and quality, so a 12 MP photo usually needs one resize and
 * three to five encodes at the final size.
 */

/** Lowest quality tried before the image is made smaller. Below 40 JPEG blocks and WebP smearing show. */
export const Q_MIN = 40;
/** Highest quality tried. Above this, files grow fast for no visible gain. */
export const Q_MAX = 92;
/** Second quality encoded on the probe, to learn how fast this image's bytes grow with quality. */
export const Q_PROBE = 80;
/** The image is never made smaller than this on its longest side; past it, the file is reported as too big. */
export const MIN_SIDE = 200;
/** Longest side of the probe copy. */
export const PROBE_SIDE = 512;
/**
 * Bytes grow roughly as pixels^0.85 when the same photo is scaled: a smaller copy packs more detail
 * into each pixel. Used to go from the probe (or a failed attempt) to the scale that should fit.
 */
export const SIZE_EXPONENT = 0.85;
/** ln(bytes) per quality step when the probe cannot tell (typical for JPEG and WebP photos). */
export const DEFAULT_SLOPE = 0.03;
/** Estimates aim this far under the target, so the first guess usually fits. */
export const AIM = 0.96;
/** Encodes at one pixel size before giving up on it. */
export const MAX_ENCODES_PER_SIZE = 6;
/** Encodes for one image, in total (a safety net; normal runs use far fewer). */
export const MAX_ENCODES = 30;

export interface Size {
  width: number;
  height: number;
}

/** Encode the image at this size and quality; resolves to the byte length. */
export type Encoder = (size: Size, quality: number) => Promise<number>;

export interface Attempt {
  quality: number;
  bytes: number;
}

export interface Fit extends Size, Attempt {}

export type SearchResult = { ok: true; fit: Fit; encodes: number } | { ok: false; encodes: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** w x h scaled by `scale`, rounded, never below 1 px. */
export function scaledSize(width: number, height: number, scale: number): Size {
  if (scale >= 1) return { width, height };
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Smallest scale allowed: the longest side reaches `minSide` (1 for images already that small). */
export const minScale = (width: number, height: number, minSide = MIN_SIDE): number =>
  Math.min(1, minSide / Math.max(width, height));

/** The scale at which `bytes` (measured at `scale`) should become `target`, from bytes ~ pixels^SIZE_EXPONENT. */
export const scaleForBytes = (scale: number, bytes: number, target: number): number =>
  scale * Math.pow(target / bytes, 1 / (2 * SIZE_EXPONENT));

/** Bytes at `quality`, estimated from one measured attempt and the slope of ln(bytes) per quality step. */
export const bytesAtQuality = (from: Attempt, quality: number, slope: number): number =>
  from.bytes * Math.exp(slope * (quality - from.quality));

/** The quality expected to land on `target`, from one measured attempt. */
export const qualityForBytes = (from: Attempt, target: number, slope: number): number =>
  from.quality + Math.log(target / from.bytes) / slope;

/** ln(bytes) per quality step from two attempts, kept to a plausible range. */
export function slopeFrom(a: Attempt, b: Attempt): number {
  if (a.quality === b.quality || a.bytes <= 0 || b.bytes <= 0) return DEFAULT_SLOPE;
  return clamp(Math.log(b.bytes / a.bytes) / (b.quality - a.quality), 0.005, 0.1);
}

/**
 * The next quality to try at one pixel size, or null when the search there is over.
 * `fits` is the best attempt that fitted (highest quality), `over` the lowest quality that did not.
 */
export function nextQuality(fits: Attempt | null, over: Attempt | null, target: number, slope: number): number | null {
  const aim = target * AIM;
  if (fits && over) {
    if (over.quality - fits.quality <= 1) return null;
    // Interpolate ln(bytes) between the two; stay strictly inside the bracket.
    const span = Math.log(over.bytes / fits.bytes);
    const q =
      span > 0
        ? fits.quality + (Math.log(aim / fits.bytes) / span) * (over.quality - fits.quality)
        : (fits.quality + over.quality) / 2;
    // A guess hugging one end of a wide bracket converges slowly; bisect instead when it would.
    const mid = (fits.quality + over.quality) / 2;
    const guess = Math.abs(q - mid) > (over.quality - fits.quality) / 3 ? (q + mid) / 2 : q;
    return clamp(Math.round(guess), fits.quality + 1, over.quality - 1);
  }
  if (fits) {
    if (fits.quality >= Q_MAX) return null;
    return clamp(Math.round(qualityForBytes(fits, aim, slope)), fits.quality + 1, Q_MAX);
  }
  if (over) {
    if (over.quality <= Q_MIN) return null;
    return clamp(Math.round(qualityForBytes(over, aim, slope)), Q_MIN, over.quality - 1);
  }
  return null;
}

/**
 * Find the largest size and highest quality whose output is at most `targetBytes`.
 * Fails when even the quality floor does not fit at MIN_SIDE px on the longest side.
 */
export async function searchFit(opts: {
  width: number;
  height: number;
  targetBytes: number;
  encode: Encoder;
  minSide?: number;
}): Promise<SearchResult> {
  const { width, height, targetBytes: target } = opts;
  const floor = minScale(width, height, opts.minSide);
  let encodes = 0;
  const encode = async (size: Size, quality: number): Promise<Attempt> => {
    encodes++;
    return { quality, bytes: await opts.encode(size, quality) };
  };

  let slope = DEFAULT_SLOPE;
  let scale = 1;
  /** Expected bytes at Q_MIN at the current scale, when known: picks the first quality to try. */
  let atFloor: number | null = null;

  const longest = Math.max(width, height);
  if (longest > PROBE_SIDE * 1.5) {
    const ps = PROBE_SIDE / longest;
    const probe = scaledSize(width, height, ps);
    const low = await encode(probe, Q_MIN);
    const high = await encode(probe, Q_PROBE);
    slope = slopeFrom(low, high);
    const fullAtFloor = low.bytes * Math.pow(1 / ps, 2 * SIZE_EXPONENT);
    if (fullAtFloor > target * AIM) scale = clamp(scaleForBytes(ps, low.bytes, target * AIM), floor, 1);
    atFloor = low.bytes * Math.pow(scale / ps, 2 * SIZE_EXPONENT);
  }

  for (;;) {
    const size = scaledSize(width, height, scale);
    let fits: Attempt | null = null;
    let over: Attempt | null = null;
    let q: number | null = atFloor === null ? 80 : clamp(Math.round(qualityForBytes({ quality: Q_MIN, bytes: atFloor }, target * AIM, slope)), Q_MIN, Q_MAX);
    for (let n = 0; q !== null && n < MAX_ENCODES_PER_SIZE && encodes < MAX_ENCODES; n++) {
      const a = await encode(size, q);
      if (a.bytes <= target) {
        if (!fits || a.quality > fits.quality) fits = a;
      } else if (!over || a.quality < over.quality) {
        over = a;
      }
      if (fits && over) slope = slopeFrom(fits, over);
      q = nextQuality(fits, over, target, slope);
    }
    if (fits) return { ok: true, fit: { ...size, ...fits }, encodes };
    if (scale <= floor || encodes >= MAX_ENCODES || !over) return { ok: false, encodes };
    // Even the lowest quality tried is too big here: shrink by what the bytes say, at least 10% a step.
    const bytesAtMin = bytesAtQuality(over, Q_MIN, slope);
    scale = Math.max(floor, Math.min(scale * 0.9, scaleForBytes(scale, bytesAtMin, target * AIM)));
    atFloor = target * AIM;
  }
}
