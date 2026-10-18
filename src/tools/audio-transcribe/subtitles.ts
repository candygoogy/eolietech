/** Transcript formatting (pure, unit-tested): plain text, SRT and WebVTT from Whisper segments. */

export interface Segment {
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  text: string;
}

/** Raw Whisper pipeline chunks: `end` is null when the model stopped without a closing timestamp. */
export interface RawChunk {
  timestamp: [number | null, number | null] | number[];
  text: string;
}

/**
 * Clean up pipeline output: trim text, drop empty segments, fill a missing end (next start, or the
 * recording's duration) and keep times inside [0, duration] and non-decreasing.
 */
export function toSegments(chunks: readonly RawChunk[], duration: number): Segment[] {
  const out: Segment[] = [];
  let lastEnd = 0;
  for (const [i, c] of chunks.entries()) {
    const text = c.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const rawStart = c.timestamp[0];
    const rawEnd = c.timestamp[1];
    const nextStart = chunks[i + 1]?.timestamp[0];
    let start = typeof rawStart === "number" ? rawStart : lastEnd;
    let end = typeof rawEnd === "number" ? rawEnd : typeof nextStart === "number" ? nextStart : duration;
    start = Math.min(Math.max(start, lastEnd), duration);
    end = Math.min(Math.max(end, start), duration);
    if (end - start < 0.2) end = Math.min(start + 0.2, Math.max(duration, start + 0.2));
    out.push({ start, end, text });
    lastEnd = end;
  }
  return out;
}

/** 3725.5 -> "01:02:05,500" (SRT) or "01:02:05.500" (VTT). */
export function formatTimestamp(seconds: number, separator: "," | "." = ","): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(rest, 3)}`;
}

/** Short clock for the on-page transcript: 65 -> "1:05", 3725 -> "1:02:05". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function toPlainText(segments: readonly Segment[]): string {
  return `${segments.map((s) => s.text).join("\n")}\n`;
}

export function toSrt(segments: readonly Segment[]): string {
  return segments
    .map((s, i) => `${i + 1}\n${formatTimestamp(s.start, ",")} --> ${formatTimestamp(s.end, ",")}\n${s.text}\n`)
    .join("\n");
}

export function toVtt(segments: readonly Segment[]): string {
  const cues = segments.map((s) => `${formatTimestamp(s.start, ".")} --> ${formatTimestamp(s.end, ".")}\n${s.text.replace(/-->/g, "->")}\n`);
  return `WEBVTT\n\n${cues.join("\n")}`;
}
