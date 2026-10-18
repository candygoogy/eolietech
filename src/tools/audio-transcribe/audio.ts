/**
 * Audio preparation for Whisper: decode any format the browser can play (audio or the audio track
 * of a video) with Web Audio, mix down to mono and resample to 16 kHz. Runs on the page because
 * Web Audio is not available in workers.
 */

export const SAMPLE_RATE = 16_000;
/** Chunking used for long recordings (seconds): 30 s windows overlapping by 5 s on each side. */
export const CHUNK_S = 30;
export const STRIDE_S = 5;

/** Average all channels into one. */
export function mixToMono(channels: readonly Float32Array[]): Float32Array<ArrayBuffer> {
  const first = channels[0];
  if (!first) return new Float32Array(0);
  const out = new Float32Array(first.length);
  if (channels.length === 1) {
    out.set(first);
    return out;
  }
  for (const ch of channels) for (let i = 0; i < out.length; i++) out[i]! += ch[i]! / channels.length;
  return out;
}

/** Linear-interpolation resampler (fallback when the browser cannot decode straight to 16 kHz). */
export function resampleLinear(input: Float32Array, from: number, to: number): Float32Array<ArrayBuffer> {
  if (from === to) return new Float32Array(input);
  const outLength = Math.max(0, Math.round((input.length * to) / from));
  const out = new Float32Array(outLength);
  const ratio = from / to;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0]! * (1 - frac) + input[i1]! * frac;
  }
  return out;
}

/** Number of 30 s windows the Whisper pipeline will run for `samples` (mirrors its chunking loop). */
export function chunkCount(samples: number, rate: number = SAMPLE_RATE): number {
  const window = rate * CHUNK_S;
  const jump = window - 2 * rate * STRIDE_S;
  let count = 1;
  for (let offset = 0; offset + window < samples; offset += jump) count++;
  return count;
}

export class AudioDecodeError extends Error {}

/** Decode a File to 16 kHz mono samples. */
export async function decodeToMono16k(file: Blob): Promise<{ samples: Float32Array<ArrayBuffer>; duration: number }> {
  const data = await file.arrayBuffer();
  let buffer: AudioBuffer;
  let rate = SAMPLE_RATE;
  try {
    // Decoding through a 16 kHz context makes the browser resample for us.
    buffer = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(data.slice(0));
  } catch {
    try {
      const ctx = new OfflineAudioContext(1, 1, 44_100);
      buffer = await ctx.decodeAudioData(data);
      rate = buffer.sampleRate;
    } catch (err) {
      throw new AudioDecodeError(String(err));
    }
  }
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const mono = mixToMono(channels);
  const samples = rate === SAMPLE_RATE && buffer.sampleRate === SAMPLE_RATE ? mono : resampleLinear(mono, buffer.sampleRate, SAMPLE_RATE);
  if (samples.length === 0) throw new AudioDecodeError("no audio");
  return { samples, duration: samples.length / SAMPLE_RATE };
}
