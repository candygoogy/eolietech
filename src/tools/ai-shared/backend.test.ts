import { describe, expect, it, vi } from "vitest";
import { chooseDevice, retryDevice } from "./backend";

describe("backend choice", () => {
  it("keeps WebAssembly once WebGPU has failed on this device, unless a backend is forced", () => {
    expect(chooseDevice({ webgpu: true })).toBe("webgpu");
    expect(chooseDevice({ webgpu: true, remembered: "wasm" })).toBe("wasm");
    expect(chooseDevice({ webgpu: false })).toBe("wasm");
    expect(chooseDevice({ webgpu: true, remembered: "something else" })).toBe("webgpu");
    expect(chooseDevice({ webgpu: false, remembered: "wasm", forced: "webgpu" })).toBe("webgpu");
  });

  it("retries a WebGPU runtime failure on WebAssembly, nothing else", () => {
    expect(retryDevice("webgpu", "runtime")).toBe("wasm");
    expect(retryDevice("webgpu", "input")).toBeNull();
    expect(retryDevice("wasm", "runtime")).toBeNull();
  });
});

describe("remembered WebGPU failure", () => {
  it("stores only the backend name and uses WebAssembly from then on", async () => {
    const { BACKEND_STORAGE_KEY, detectDevice, rememberWasm } = await import("./backend");
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    try {
      rememberWasm();
      expect([...store.entries()]).toEqual([[BACKEND_STORAGE_KEY, "wasm"]]);
      await expect(detectDevice()).resolves.toBe("wasm");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
