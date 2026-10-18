/** Worker-side job runner shared by the image workers: sniff -> decode -> (resize) -> encode. */
import { decode, encode, fit, resizeTo } from "./codecs";
import { resolveOutput, sniffFormat, targetSize, type InputFormat } from "./formats";
import type { JobErrorCode, JobRequest, JobResponse } from "./protocol";

export type HeicDecoder = (buffer: ArrayBuffer) => Promise<ImageData>;

export async function runJob(
  req: JobRequest,
  allowed: readonly InputFormat[],
  decodeHeic?: HeicDecoder,
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
    if (settings.resize) {
      const target = targetSize(img.width, img.height, settings.resize);
      notEnlarged = target.notEnlarged;
      img = await resizeTo(img, target.width, target.height);
    } else {
      img = await fit(img, settings.maxWidth, settings.maxHeight);
    }
    const format = resolveOutput(settings.output, input);
    const out = await encode(img, format, settings.quality);
    return {
      res: {
        id,
        ok: true,
        buffer: out.buffer,
        input,
        format,
        width: img.width,
        height: img.height,
        sourceWidth,
        sourceHeight,
        notEnlarged,
        flattened: out.flattened,
      },
      transfer: [out.buffer],
    };
  } catch (err) {
    return { res: { id, ok: false, error: classify(err, "generic"), detail: String(err) }, transfer: [] };
  }
}

function classify(err: unknown, fallback: JobErrorCode): JobErrorCode {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes("unsupported")) return "unsupported";
  if (err instanceof RangeError || msg.includes("memory") || msg.includes("allocation")) return "memory";
  return fallback;
}

/** Wire a worker scope to runJob. */
export function serve(allowed: readonly InputFormat[], decodeHeic?: HeicDecoder): void {
  const scope = self as unknown as {
    onmessage: ((e: MessageEvent<JobRequest>) => void) | null;
    postMessage: (msg: JobResponse, transfer: Transferable[]) => void;
  };
  scope.onmessage = async (e: MessageEvent<JobRequest>) => {
    const { res, transfer } = await runJob(e.data, allowed, decodeHeic);
    scope.postMessage(res, transfer);
  };
}
