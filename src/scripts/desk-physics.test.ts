import { describe, expect, it } from "vitest";
import { glide, moveItem, nearestSlot, resist, rubberband, settled } from "./desk-physics";

describe("desk physics", () => {
  it("adds friction past an edge: movement shrinks and never reaches the free length", () => {
    const r = { min: 0, max: 100 };
    expect(resist(50, r, 300)).toBe(50);
    const a = resist(140, r, 300) - 100; // 40 px past the edge
    const b = resist(240, r, 300) - 100; // 140 px past the edge
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(40);
    expect(b).toBeGreaterThan(a);
    expect(b - a).toBeLessThan(100); // the second 100 px past the edge show as much less
    expect(rubberband(1e9, 300)).toBeLessThan(300);
    expect(resist(-40, r, 300)).toBeLessThan(0);
  });

  it("a throw slows to a stop inside the desk, and one past the edge comes back", () => {
    const r = { min: -200, max: 200 };
    let a = { x: 0, v: 1.2 };
    for (let t = 0; t < 4000; t += 16) a = glide(a, r, 16);
    expect(settled(a, r)).toBe(true);
    expect(a.x).toBeGreaterThan(0);

    let b = { x: 190, v: 2.5 }; // flung hard at the right edge
    let peak = b.x;
    for (let t = 0; t < 4000; t += 16) {
      b = glide(b, r, 16);
      peak = Math.max(peak, b.x);
    }
    expect(peak).toBeGreaterThan(200); // it went over...
    expect(peak).toBeLessThan(320); // ...but was slowed
    expect(settled(b, r)).toBe(true); // and came back
  });

  it("moves an item and finds the fan slot under a position", () => {
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 0, 9)).toEqual(["b", "c", "a"]);
    expect(nearestSlot(-1000, 4, 100, 130)).toBe(0);
    expect(nearestSlot(1000, 4, 100, 130)).toBe(3);
    expect(nearestSlot(10, 4, 100, 130)).toBe(2);
  });
});
