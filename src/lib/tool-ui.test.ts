import { describe, expect, it, vi } from "vitest";
import { createDropzone, ENTER_MS, filterFiles, formatBytes, markEnter, matchesAccept, renameExtension } from "./tool-ui";

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
