/** Worker-side job runner shared by the image workers: sniff -> decode -> (resize) -> encode. */
import { decode, encode, fit, resizeTo } from "./codecs";
import { resolveOutput, sniffFormat, targetSize, type InputFormat, type RasterFormat } from "./formats";
import type { JobErrorCode, JobRequest, JobResponse, JobSettings } from "./protocol";

export type HeicDecoder = (buffer: ArrayBuffer) => Promise<ImageData>;

/**
 * A tool's own pixel step (image-fit), run on the decoded image in place of the resize or fit step.
 * It gets the job settings as posted, so a tool can carry its own fields on them.
 */
export type Transform = (img: ImageData, settings: JobSettings) => Promise<ImageData>;

/** What a tool's own encode step returns. Width and height default to the image it was given. */
export interface EncodeResult {
  buffer: ArrayBuffer;
  flattened: boolean;
  width?: number;
  height?: number;
  /** Quality actually used, reported to the UI. */
  quality?: number;
  /** `buffer` is the original file's own encoded image, not re-encoded (metadata may be stripped). */
  unchanged?: boolean;
}

/**
 * A tool's own encode step (image-target-size), run in place of the single encode at
 * settings.quality. It may encode many times, shrink the image, or hand back the original image
 * without re-encoding it (from `source.buffer`, which it may transfer). Throw a JobError to report a specific error code.
 */
export type EncodeStep = (
  img: ImageData,
  format: RasterFormat,
  settings: JobSettings,
  source: { buffer: ArrayBuffer; input: InputFormat },
) => Promise<EncodeResult>;

/** An error with a code the UI translates (see JobErrorCode). */
export class JobError extends Error {
  constructor(
    readonly code: JobErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

export async function runJob(
  req: JobRequest,
  allowed: readonly InputFormat[],
  decodeHeic?: HeicDecoder,
  transform?: Transform,
  encodeStep?: EncodeStep,
): Promise<{ res: JobResponse; transfer: Transferable[] }> {
  const { id, buffer, settings } = req;
  try {
    const input = sniffFormat(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64)));
    // Unrecognised bytes: damaged or not an image at all. Recognised but not handled here: unsupported.
    if (!input) return { res: { id, ok: false, error: "decode" }, transfer: [] };
    if (!allowed.includes(input) || (input === "heic" && !decodeHeic)) {
      return { res: { id, ok: false, error: "unsupported" }, transfer: [] };
    }
    let img: ImageData;
    try {
      img = input === "heic" ? await decodeHeic!(buffer) : await decode(buffer, input);
    } catch (err) {
      return { res: { id, ok: false, error: classify(err, "decode"), detail: String(err) }, transfer: [] };
    }
    const sourceWidth = img.width;
    const sourceHeight = img.height;
    let notEnlarged = false;
    if (transform) {
      img = await transform(img, settings);
    } else if (settings.resize) {
      const target = targetSize(img.width, img.height, settings.resize);
      notEnlarged = target.notEnlarged;
      img = await resizeTo(img, target.width, target.height);
    } else {
      img = await fit(img, settings.maxWidth, settings.maxHeight);
    }
    const format = resolveOutput(settings.output, input);
    const out: EncodeResult = encodeStep
      ? await encodeStep(img, format, settings, { buffer, input })
      : await encode(img, format, settings.quality);
    const res: JobResponse = {
      id,
      ok: true,
      buffer: out.buffer,
      input,
      format,
      width: out.width ?? img.width,
      height: out.height ?? img.height,
      sourceWidth,
      sourceHeight,
      notEnlarged,
      flattened: out.flattened,
    };
    if (out.quality !== undefined) res.quality = out.quality;
    if (out.unchanged) res.unchanged = true;
    return { res, transfer: [out.buffer] };
  } catch (err) {
    return { res: { id, ok: false, error: classify(err, "generic"), detail: String(err) }, transfer: [] };
  }
}

function classify(err: unknown, fallback: JobErrorCode): JobErrorCode {
  if (err instanceof JobError) return err.code;
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("unsupported")) return "unsupported";
  if (err instanceof RangeError || msg.includes("memory") || msg.includes("allocation")) return "memory";
  return fallback;
}

/** Wire a worker scope to runJob. */
export function serve(
  allowed: readonly InputFormat[],
  decodeHeic?: HeicDecoder,
  transform?: Transform,
  encodeStep?: EncodeStep,
): void {
  const scope = self as unknown as {
    onmessage: ((e: MessageEvent<JobRequest>) => void) | null;
    postMessage: (msg: JobResponse, transfer: Transferable[]) => void;
  };
  scope.onmessage = async (e: MessageEvent<JobRequest>) => {
    const { res, transfer } = await runJob(e.data, allowed, decodeHeic, transform, encodeStep);
    scope.postMessage(res, transfer);
  };
}
