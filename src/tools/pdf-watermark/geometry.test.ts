import { describe, expect, it } from "vitest";
import {
  userToView,
  viewSize,
  viewToUser,
  visibleBox,
  type Box,
  type Point,
  type Rotation,
  type Size,
  type ViewRect,
} from "../pdf-shared/page-box";
import {
  CAP_HEIGHT,
  CORNER_MARGIN,
  MAX_TILES,
  fitSize,
  hexToRgb,
  imageDraw,
  imageRect,
  planText,
  resolveAngle,
  textAxes,
  textDraws,
  textOrigin,
  tileCenters,
  userAngle,
} from "./geometry";

/** A page whose visible box is offset from the origin (CropBox inside a larger MediaBox). */
const media: Box = { x: 0, y: 0, width: 700, height: 900 };
const crop: Box = { x: 50, y: 30, width: 600, height: 800 };
const box = visibleBox(media, crop);
const ROTATIONS: Rotation[] = [0, 90, 180, 270];

const close = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

/** Screen direction (CCW degrees) of a user-space angle on a page shown turned by `rotation`. */
function screenAngleOf(userDeg: number, rotation: Rotation): number {
  const rad = (userDeg * Math.PI) / 180;
  const a = viewToUser(0, 0, box, rotation);
  const p = userToView(a.x + Math.cos(rad), a.y + Math.sin(rad), box, rotation);
  const o = userToView(a.x, a.y, box, rotation);
  return (Math.atan2(-(p.y - o.y), p.x - o.x) * 180) / Math.PI;
}

describe("page boxes", () => {
  it("turns a screen angle into the user-space angle that reads the same on a rotated page", () => {
    for (const r of ROTATIONS) {
      for (const a of [0, 30, 45, 90, -60, 180]) {
        const back = screenAngleOf(userAngle(a, r), r);
        close(((back - a + 540) % 360) - 180, 0);
      }
    }
  });
});

describe("angles and sizes", () => {
  const portrait: Size = { width: 600, height: 800 };

  it("resolves diagonal along the page's own diagonal, horizontal to 0, numbers into (-180, 180]", () => {
    close(resolveAngle("diagonal", portrait), (Math.atan2(800, 600) * 180) / Math.PI);
    close(resolveAngle("diagonal", { width: 800, height: 800 }), 45);
    expect(resolveAngle("horizontal", portrait)).toBe(0);
    expect(resolveAngle(270, portrait)).toBe(-90);
    expect(resolveAngle(-45, portrait)).toBe(-45);
    expect(resolveAngle(180, portrait)).toBe(180);
    expect(resolveAngle(Number.NaN, portrait)).toBe(0);
  });

  it("fits a horizontal line to the page width, and a long diagonal line inside the page", () => {
    // width1 = 5 (a 5-em text): horizontal fit is limited by the width.
    close(fitSize(5, 0, portrait), (0.86 * 600) / 5);
    for (const angle of [0, 30, 53.13, 90, -45]) {
      const s = fitSize(5, angle, portrait);
      const rad = (angle * Math.PI) / 180;
      const bw = 5 * s * Math.abs(Math.cos(rad)) + s * Math.abs(Math.sin(rad));
      const bh = 5 * s * Math.abs(Math.sin(rad)) + s * Math.abs(Math.cos(rad));
      expect(bw).toBeLessThanOrEqual(600 * 0.86 + 1e-6);
      expect(bh).toBeLessThanOrEqual(800 * 0.86 + 1e-6);
      // And it is the largest such size: one of the two limits is reached.
      expect(Math.max(bw / 600, bh / 800)).toBeCloseTo(0.86, 6);
    }
  });

  it("centres the capitals of a line on the given point, at any angle", () => {
    for (const angle of [0, 45, 90, 137, -30]) {
      const center = { x: 300, y: 400 };
      const o = textOrigin(center, angle, 200, 40);
      const { u, v } = textAxes(angle);
      // From the origin: half the width along the baseline, half the cap height up.
      close(o.x + u.x * 100 + v.x * CAP_HEIGHT * 20, center.x);
      close(o.y + u.y * 100 + v.y * CAP_HEIGHT * 20, center.y);
    }
    // Horizontal: the baseline starts left of the centre and below it (y down).
    const o = textOrigin({ x: 300, y: 400 }, 0, 200, 40);
    close(o.x, 200);
    close(o.y, 400 + CAP_HEIGHT * 20);
  });
});

describe("text plan", () => {
  const view: Size = { width: 600, height: 800 };

  it("puts one copy in the middle of the page", () => {
    const plan = planText({ width1: 6, size: 48, angle: "horizontal", layout: "single" }, view);
    expect(plan.centers).toEqual([{ x: 300, y: 400 }]);
    expect(plan.size).toBe(48);
    expect(plan.width).toBe(6 * 48);
    const fit = planText({ width1: 6, size: "fit", angle: "diagonal", layout: "single" }, view);
    close(fit.size, fitSize(6, fit.angle, view));
  });

  it("tiles the whole page: every point of it is near a copy, and no copy is far off the page", () => {
    for (const angle of [0, 45, -30, 90]) {
      const plan = planText({ width1: 5, size: 30, angle, layout: "tile" }, view);
      const n = plan.centers.length;
      expect(n).toBeGreaterThan(4);
      expect(n).toBeLessThanOrEqual(MAX_TILES * 2);
      const reach = Math.hypot(plan.width / 2, plan.size);
      for (const c of plan.centers) {
        expect(c.x).toBeGreaterThan(-reach - 1e-6);
        expect(c.x).toBeLessThan(view.width + reach + 1e-6);
        expect(c.y).toBeGreaterThan(-reach - 1e-6);
        expect(c.y).toBeLessThan(view.height + reach + 1e-6);
      }
      // Coverage: a grid of sample points, each within one tile step of some copy.
      const stepU = plan.width + Math.max(plan.size * 2, 18);
      const stepV = plan.size * 3.5;
      const limit = Math.hypot(stepU, stepV);
      for (let x = 0; x <= view.width; x += 50) {
        for (let y = 0; y <= view.height; y += 50) {
          const d = Math.min(...plan.centers.map((c) => Math.hypot(c.x - x, c.y - y)));
          expect(d).toBeLessThan(limit);
        }
      }
    }
  });

  it("widens the spacing instead of drawing thousands of tiny copies", () => {
    const centers = tileCenters({ width: 14400, height: 14400 }, 0, 10, 4);
    expect(centers.length).toBeLessThanOrEqual(MAX_TILES * 2);
    expect(centers.length).toBeGreaterThan(MAX_TILES / 4);
  });
});

describe("text in user space", () => {
  /** The view-space centre and screen angle of a line drawn with pdf-lib parameters `d`. */
  function landed(d: { x: number; y: number; rotate: number }, width: number, size: number, rotation: Rotation) {
    const rad = (d.rotate * Math.PI) / 180;
    const along = { x: Math.cos(rad), y: Math.sin(rad) };
    const up = { x: -Math.sin(rad), y: Math.cos(rad) };
    const half = (CAP_HEIGHT * size) / 2;
    const c = { x: d.x + along.x * (width / 2) + up.x * half, y: d.y + along.y * (width / 2) + up.y * half };
    const end = { x: d.x + along.x * width, y: d.y + along.y * width };
    const vc = userToView(c.x, c.y, box, rotation);
    const vo = userToView(d.x, d.y, box, rotation);
    const ve = userToView(end.x, end.y, box, rotation);
    return { center: vc, angle: (Math.atan2(-(ve.y - vo.y), ve.x - vo.x) * 180) / Math.PI };
  }

  it("lands centred and at the chosen screen angle on rotated, cropped pages", () => {
    for (const r of ROTATIONS) {
      const view = viewSize(box, r);
      for (const angle of ["diagonal", "horizontal", 30, -75] as const) {
        const plan = planText({ width1: 5.5, size: "fit", angle, layout: "single" }, view);
        const [d] = textDraws(plan, box, r);
        const got = landed(d!, plan.width, plan.size, r);
        close(got.center.x, view.width / 2, 4);
        close(got.center.y, view.height / 2, 4);
        close(((got.angle - plan.angle + 540) % 360) - 180, 0, 4);
        // The text stays inside the visible box (fit), so nothing is cut off at the CropBox.
        const corners = [0, plan.width].flatMap((a) =>
          [0, plan.size * CAP_HEIGHT].map((b) => {
            const rad = (d!.rotate * Math.PI) / 180;
            return { x: d!.x + a * Math.cos(rad) - b * Math.sin(rad), y: d!.y + a * Math.sin(rad) + b * Math.cos(rad) };
          }),
        );
        for (const p of corners) {
          expect(p.x).toBeGreaterThanOrEqual(box.x - 1e-6);
          expect(p.x).toBeLessThanOrEqual(box.x + box.width + 1e-6);
          expect(p.y).toBeGreaterThanOrEqual(box.y - 1e-6);
          expect(p.y).toBeLessThanOrEqual(box.y + box.height + 1e-6);
        }
      }
    }
  });
});

describe("image placement", () => {
  const view: Size = { width: 600, height: 800 };

  it("scales to a share of the page width and keeps the aspect ratio", () => {
    const r = imageRect(view, 2, 0.5, "center");
    expect(r).toEqual({ x: 150, y: 325, w: 300, h: 150 });
  });

  it("puts corner images inside a margin, and shrinks an image too tall for the page", () => {
    const m = 600 * CORNER_MARGIN;
    expect(imageRect(view, 1, 0.25, "top-left")).toEqual({ x: m, y: m, w: 150, h: 150 });
    expect(imageRect(view, 1, 0.25, "bottom-right")).toEqual({ x: 600 - m - 150, y: 800 - m - 150, w: 150, h: 150 });
    const tall = imageRect(view, 0.25, 1, "top-right");
    close(tall.h, 800 - 2 * m);
    close(tall.w, tall.h * 0.25);
    close(tall.x + tall.w, 600 - m);
  });

  it("draws the image upright on exactly its rectangle, for every rotation", () => {
    for (const r of ROTATIONS) {
      const view = viewSize(box, r);
      const rect: ViewRect = imageRect(view, 1.5, 0.3, "top-right");
      const d = imageDraw(rect, box, r);
      const rad = (d.rotate * Math.PI) / 180;
      const corner = (a: number, b: number): Point =>
        userToView(d.x + a * Math.cos(rad) - b * Math.sin(rad), d.y + a * Math.sin(rad) + b * Math.cos(rad), box, r);
      // The image's own bottom-left and top-right corners land at the rectangle's bottom-left and top-right.
      const bl = corner(0, 0);
      const tr = corner(d.width, d.height);
      close(bl.x, rect.x);
      close(bl.y, rect.y + rect.h);
      close(tr.x, rect.x + rect.w);
      close(tr.y, rect.y);
    }
  });
});

describe("colour", () => {
  it("reads #rrggbb and #rgb", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("#08f")).toEqual([0, 0x88 / 255, 1]);
    expect(hexToRgb("808080")).toEqual([0x80 / 255, 0x80 / 255, 0x80 / 255]);
    expect(hexToRgb("red")).toBeNull();
  });
});
