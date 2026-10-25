import { describe, expect, it } from "vitest";
import { matchesAccept } from "../../lib/tool-ui";
import { outputName } from "../image-shared/formats";
import { HEIC_ACCEPT, HEIC_DEFAULT_QUALITY, heicSettings, initialFormat } from "./settings";

const file = (name: string, type: string) => new File([new Uint8Array(4)], name, { type });

describe("heic-to-jpg settings", () => {
  it("starts on PNG only on the heic-to-png variant", () => {
    expect(initialFormat({ from: "heic", to: "png" })).toBe("png");
    expect(initialFormat({})).toBe("jpg");
    expect(initialFormat({ to: "webp" })).toBe("jpg");
  });

  it("accepts HEIC/HEIF by MIME type or extension only", () => {
    expect(matchesAccept(file("IMG_0001.HEIC", ""), HEIC_ACCEPT)).toBe(true);
    expect(matchesAccept(file("photo.heif", ""), HEIC_ACCEPT)).toBe(true);
    expect(matchesAccept(file("photo", "image/heic"), HEIC_ACCEPT)).toBe(true);
    expect(matchesAccept(file("photo.jpg", "image/jpeg"), HEIC_ACCEPT)).toBe(false);
  });

  it("maps form values to job settings and names outputs .jpg", () => {
    expect(heicSettings("jpg", "90")).toEqual({ output: "jpg", quality: 90 });
    expect(heicSettings("png", "40")).toEqual({ output: "png", quality: 40 });
    expect(heicSettings("gif", "abc")).toEqual({ output: "jpg", quality: HEIC_DEFAULT_QUALITY });
    expect(outputName("IMG_0001.HEIC", "heic", "jpg")).toBe("IMG_0001.jpg");
  });
});
