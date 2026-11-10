import { describe, expect, it, vi } from "vitest";
import {
  createDropzone,
  DOWNLOAD_URL_TTL_MS,
  downloadBlob,
  ENTER_MS,
  filterFiles,
  formatBytes,
  isChunkLoadError,
  markEnter,
  matchesAccept,
  notifyResult,
  renameExtension,
  RESULT_EVENT,
} from "./tool-ui";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
const ctx = {
  limits: { maxBytes: 100, maxFiles: 2 },
  t: (key: string) => key,
};

describe("tool-ui", () => {
  it("matches accept rules by extension, wildcard and exact type", () => {
    expect(matchesAccept(file("a.HEIC", ""), ".heic,.heif")).toBe(true);
    expect(matchesAccept(file("a.png", "image/png"), "image/*")).toBe(true);
    expect(matchesAccept(file("a.pdf", "application/pdf"), "image/*")).toBe(false);
    expect(matchesAccept(file("a.bin", ""), "")).toBe(true);
  });

  it("rejects wrong types, oversized files and files over the batch limit", () => {
    const { ok, rejected } = filterFiles(
      [
        file("a.png", "image/png"),
        file("b.pdf", "application/pdf"),
        file("c.png", "image/png", 200),
        file("d.png", "image/png"),
        file("e.png", "image/png"),
      ],
      "image/*",
      ctx,
    );
    expect(ok.map((f) => f.name)).toEqual(["a.png", "d.png"]);
    expect(rejected.map((r) => r.reason)).toEqual(["tool.error.type", "tool.error.tooLarge", "tool.error.tooMany"]);
  });

  it("formats sizes and renames extensions", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1536, "it")).toBe("1,5 KB");
    expect(renameExtension("photo.HEIC", "jpg")).toBe("photo.jpg");
    expect(renameExtension("noext", ".png")).toBe("noext.png");
  });

  it("marks a new element for its entry transition, then clears the mark", () => {
    vi.useFakeTimers();
    try {
      const el = document.createElement("li");
      markEnter(el);
      expect(el.hasAttribute("data-enter")).toBe(true);
      vi.advanceTimersByTime(ENTER_MS);
      expect(el.hasAttribute("data-enter")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("recognises a failed chunk load in every engine, and nothing else", () => {
    // Chromium, Firefox, Safari, Vite's CSS preload, and the MIME error a 404 page as a script gives.
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/_astro/client.abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module: https://x/_astro/client.abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /_astro/tool.abc.css"))).toBe(true);
    expect(isChunkLoadError("Failed to load module script: Expected a JavaScript module script")).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error("Loading chunk 3 failed."), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({ message: "Importing a module script failed." })).toBe(false);
  });

  it("tells the page about a result when a file is downloaded", () => {
    const heard = vi.fn();
    document.addEventListener(RESULT_EVENT, heard);
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    try {
      expect(RESULT_EVENT).toBe("eolie:result");
      notifyResult();
      expect(heard).toHaveBeenCalledTimes(1);
      downloadBlob(new Blob(["x"]), "x.txt");
      expect(heard).toHaveBeenCalledTimes(2);
    } finally {
      document.removeEventListener(RESULT_EVENT, heard);
      create.mockRestore();
    }
  });

  it("keeps a download's object URL valid long enough for the iOS download prompt", () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    try {
      downloadBlob(new Blob(["x"]), "x.txt");
      expect(DOWNLOAD_URL_TTL_MS).toBeGreaterThanOrEqual(60_000);
      vi.advanceTimersByTime(DOWNLOAD_URL_TTL_MS - 1);
      expect(revoke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(revoke).toHaveBeenCalledWith("blob:test");
    } finally {
      revoke.mockRestore();
      create.mockRestore();
      vi.useRealTimers();
    }
  });

  describe("createDropzone paste", () => {
    const paste = (target: EventTarget, files: File[]) => {
      const e = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "clipboardData", { value: { files } });
      target.dispatchEvent(e);
      return e;
    };
    const mount = () => {
      const onFiles = vi.fn();
      const zone = createDropzone({ accept: "image/*", multiple: false, ctx, onFiles });
      document.body.append(zone);
      return { zone, onFiles };
    };

    it("takes a file pasted anywhere on the page", () => {
      const { zone, onFiles } = mount();
      try {
        const e = paste(document.body, [file("shot.png", "image/png"), file("b.png", "image/png")]);
        expect(e.defaultPrevented).toBe(true);
        expect(onFiles).toHaveBeenCalledTimes(1);
        expect(onFiles.mock.calls[0][0].ok.map((f: File) => f.name)).toEqual(["shot.png"]);
      } finally {
        zone.remove();
      }
    });

    it("leaves a paste into a text field alone", () => {
      const { zone, onFiles } = mount();
      const field = document.createElement("input");
      field.type = "text";
      document.body.append(field);
      try {
        const e = paste(field, [file("shot.png", "image/png")]);
        expect(e.defaultPrevented).toBe(false);
        expect(onFiles).not.toHaveBeenCalled();
      } finally {
        zone.remove();
        field.remove();
      }
    });

    it("ignores pastes once the zone is hidden or removed", () => {
      const { zone, onFiles } = mount();
      zone.hidden = true;
      paste(document.body, [file("shot.png", "image/png")]);
      zone.hidden = false;
      zone.remove();
      paste(document.body, [file("shot.png", "image/png")]);
      document.body.append(zone);
      paste(document.body, [file("shot.png", "image/png")]);
      zone.remove();
      expect(onFiles).not.toHaveBeenCalled();
    });
  });
});
