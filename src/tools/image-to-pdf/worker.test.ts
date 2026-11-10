import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToPdfResponse } from "./worker";

// The smallest JPEG pdf-lib accepts: SOI, then a baseline frame header (16 x 8, 3 components).
const jpeg = (...extra: number[]) =>
  new Uint8Array([0xff, 0xd8, ...extra, 0xff, 0xc0, 0, 17, 8, 0, 8, 0, 16, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
const REENCODED = jpeg();

vi.mock("../exif-remover/jpeg", () => ({
  cleanJpeg: vi.fn(() => {
    throw new Error("cannot walk");
  }),
}));
vi.mock("../image-shared/codecs", () => ({
  decode: vi.fn(async () => ({ width: 16, height: 8, data: new Uint8ClampedArray(16 * 8 * 4).fill(255) })),
  encode: vi.fn(async () => ({ buffer: REENCODED.slice().buffer, flattened: false })),
}));

// The worker listens on `self` as soon as it is imported.
const posted: ToPdfResponse[] = [];
let onMessage: (e: { data: unknown }) => void = () => {};
vi.stubGlobal("self", {
  addEventListener: (_type: string, fn: typeof onMessage) => (onMessage = fn),
  postMessage: (msg: ToPdfResponse) => posted.push(msg),
});
await import("./worker");
const { decode, encode } = await import("../image-shared/codecs");

async function build(bytes: Uint8Array): Promise<ToPdfResponse> {
  posted.length = 0;
  const file = { arrayBuffer: async () => bytes.slice().buffer } as unknown as File;
  onMessage({ data: { id: 1, files: [file], options: { pageSize: "fit", margin: "none" } } });
  await vi.waitFor(() => expect(posted.some((m) => m.type !== "progress")).toBe(true));
  return posted.find((m) => m.type !== "progress")!;
}

describe("image-to-pdf worker, JPEG whose metadata cannot be removed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("re-encodes it from its pixels instead of embedding the original with its metadata", async () => {
    // An APP1 "Exif" segment the PDF must not carry.
    const original = jpeg(0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0);
    const res = await build(original);
    expect(res).toMatchObject({ type: "done", pages: 1 });
    expect(decode).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledWith(expect.anything(), "jpg", 92);
    const pdf = new Uint8Array((res as Extract<ToPdfResponse, { type: "done" }>).buffer);
    expect(Buffer.from(pdf).includes(Buffer.from("Exif"))).toBe(false);
  });

  it("fails the file as unreadable when it cannot be decoded either", async () => {
    vi.mocked(decode).mockRejectedValueOnce(new Error("Decoding error"));
    const res = await build(jpeg());
    expect(res).toMatchObject({ type: "error", index: 0, code: "decode" });
    expect(encode).not.toHaveBeenCalled();
  });
});
