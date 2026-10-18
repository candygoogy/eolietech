/** Pure pre/post-processing for BiRefNet (unit-tested; used by ./worker.ts). */

/** Square model input size of the pinned BiRefNet_lite export. */
export const MODEL_SIZE = 512;
/** Larger images would need hundreds of MB of canvas memory; refuse them with a clear message. */
export const MAX_PIXELS = 50_000_000;

const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

/** RGBA pixels (size x size) -> normalised NCHW float32 tensor data (ImageNet mean/std). */
export function toInputTensor(rgba: Uint8ClampedArray, size: number = MODEL_SIZE): Float32Array {
  const plane = size * size;
  if (rgba.length !== plane * 4) throw new Error(`expected ${plane * 4} RGBA bytes, got ${rgba.length}`);
  const out = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    out[i] = (rgba[p]! / 255 - MEAN[0]) / STD[0];
    out[plane + i] = (rgba[p + 1]! / 255 - MEAN[1]) / STD[1];
    out[2 * plane + i] = (rgba[p + 2]! / 255 - MEAN[2]) / STD[2];
  }
  return out;
}

/** Model logits -> RGBA mask pixels whose alpha is sigmoid(logit) (RGB left black). */
export function logitsToMask(logits: Float32Array): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(logits.length * 4);
  for (let i = 0; i < logits.length; i++) {
    out[i * 4 + 3] = Math.round(255 / (1 + Math.exp(-logits[i]!)));
  }
  return out;
}

/** "holiday photo.JPG" -> "holiday photo-no-bg.png". */
export function outputName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name || "image";
  return `${base}-no-bg.png`;
}
