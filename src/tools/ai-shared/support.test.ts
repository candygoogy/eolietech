import { describe, expect, it } from "vitest";
import { classifyLoadFailure, downloadMilestone, missingFeatures, WORKER_LOAD_ERROR } from "./support";

describe("capability check", () => {
  it("names what a browser lacks before anything is downloaded", () => {
    class Canvas {
      getContext() {
        return {};
      }
    }
    const full = {
      WebAssembly,
      Worker: class {},
      OffscreenCanvas: Canvas,
      createImageBitmap: () => undefined,
      OfflineAudioContext: class { decodeAudioData() {} },
    };
    expect(missingFeatures(full, ["wasm", "worker", "offscreenCanvas", "webAudio"])).toEqual([]);
    expect(missingFeatures({}, ["wasm", "worker", "offscreenCanvas", "webAudio"])).toEqual([
      "WebAssembly",
      "Web Workers",
      "OffscreenCanvas",
      "Web Audio",
    ]);
    // WebAssembly without SIMD (ONNX Runtime needs it), and a 2D-less OffscreenCanvas.
    const partial = { ...full, WebAssembly: { validate: () => false }, OffscreenCanvas: class { getContext() { return null; } } };
    expect(missingFeatures(partial, ["wasm", "offscreenCanvas"])).toEqual(["WebAssembly", "OffscreenCanvas"]);
  });
});

describe("download announcements", () => {
  it("announces only start, quarters and done", () => {
    const total = 98_484_532;
    const heard = new Set<number>();
    for (let loaded = 0; loaded <= total; loaded += 65_536) heard.add(downloadMilestone(loaded, total));
    heard.add(downloadMilestone(total, total));
    expect([...heard]).toEqual([0, 25, 50, 75, 100]);
  });
});

describe("load failures", () => {
  it("tells offline, an updated page and other failures apart", () => {
    const deployed = new TypeError("Failed to fetch dynamically imported module: https://x/_astro/worker.js");
    expect(classifyLoadFailure(deployed, true)).toBe("updated");
    expect(classifyLoadFailure(deployed, false)).toBe("offline");
    expect(classifyLoadFailure(Object.assign(new Error(""), { name: WORKER_LOAD_ERROR }), true)).toBe("updated");
    expect(classifyLoadFailure("TypeError: Failed to fetch", true)).toBe("offline");
    expect(classifyLoadFailure("TypeError: Load failed", true)).toBe("offline");
    expect(classifyLoadFailure("Error: model chunk a.bin: HTTP 404", true)).toBe("updated");
    expect(classifyLoadFailure(new RangeError("Array buffer allocation failed"), true)).toBe("other");
  });
});
