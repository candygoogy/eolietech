import { describe, expect, it } from "vitest";
import { chunkCount, mixToMono, resampleLinear } from "./audio";
import { formatClock, formatTimestamp, toPlainText, toSegments, toSrt, toVtt } from "./subtitles";

describe("transcript formatting", () => {
  const segments = toSegments(
    [
      { timestamp: [0, 3.5], text: " And so my fellow Americans," },
      { timestamp: [3.5, null], text: " ask not   what your country can do for you" },
      { timestamp: [8, null], text: "   " },
    ],
    11,
  );

  it("cleans segments and fills missing end times", () => {
    expect(segments).toEqual([
      { start: 0, end: 3.5, text: "And so my fellow Americans," },
      { start: 3.5, end: 8, text: "ask not what your country can do for you" },
    ]);
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(3725.5)).toBe("01:02:05,500");
    expect(formatTimestamp(0.0004, ".")).toBe("00:00:00.000");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("writes TXT, SRT and VTT", () => {
    expect(toPlainText(segments)).toBe("And so my fellow Americans,\nask not what your country can do for you\n");
    expect(toSrt(segments)).toBe(
      "1\n00:00:00,000 --> 00:00:03,500\nAnd so my fellow Americans,\n\n2\n00:00:03,500 --> 00:00:08,000\nask not what your country can do for you\n",
    );
    expect(toVtt(segments)).toBe(
      "WEBVTT\n\n00:00:00.000 --> 00:00:03.500\nAnd so my fellow Americans,\n\n00:00:03.500 --> 00:00:08.000\nask not what your country can do for you\n",
    );
  });
});

describe("audio preparation", () => {
  it("mixes to mono and resamples", () => {
    expect(Array.from(mixToMono([new Float32Array([1, 0]), new Float32Array([0, 0])]))).toEqual([0.5, 0]);
    const out = resampleLinear(new Float32Array([0, 1, 2, 3]), 32_000, 16_000);
    expect(Array.from(out)).toEqual([0, 2]);
  });

  it("counts the 30 s windows the pipeline will run", () => {
    expect(chunkCount(16_000 * 11)).toBe(1);
    expect(chunkCount(16_000 * 30)).toBe(1);
    expect(chunkCount(16_000 * 31)).toBe(2);
    expect(chunkCount(16_000 * 132)).toBe(7);
  });
});
