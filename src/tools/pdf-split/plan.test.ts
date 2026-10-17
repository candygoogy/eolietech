import { describe, expect, it } from "vitest";
import { planSplit } from "./plan";

describe("planSplit", () => {
  it("plans one part per range, or one combined part", () => {
    expect(planSplit({ kind: "ranges", input: "1-2, 5", combine: false }, 6)).toEqual({
      ok: true,
      parts: [
        { indices: [0, 1], label: "1-2" },
        { indices: [4], label: "5" },
      ],
    });
    expect(planSplit({ kind: "ranges", input: "5, 1-2", combine: true }, 6)).toEqual({
      ok: true,
      parts: [{ indices: [4, 0, 1], label: "5_1-2" }],
    });
  });

  it("plans every-N chunks and validates N", () => {
    expect(planSplit({ kind: "every", size: 1 }, 3)).toMatchObject({ ok: true, parts: [{ label: "1" }, { label: "2" }, { label: "3" }] });
    expect(planSplit({ kind: "every", size: 2 }, 3)).toMatchObject({ ok: true, parts: [{ label: "1-2" }, { label: "3" }] });
    expect(planSplit({ kind: "every", size: 0 }, 3)).toEqual({ ok: false, error: { code: "size" } });
    expect(planSplit({ kind: "every", size: 1.5 }, 3)).toEqual({ ok: false, error: { code: "size" } });
    expect(planSplit({ kind: "ranges", input: "9", combine: false }, 3)).toMatchObject({ ok: false, error: { code: "outOfRange" } });
  });
});
