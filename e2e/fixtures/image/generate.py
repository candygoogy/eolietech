"""Regenerate the image fixtures used by e2e/image-tools.spec.ts.

All pixels are synthetic (gradients drawn here), so the fixtures carry no third-party license.
Needs Pillow (with WebP/AVIF support) and an ffmpeg build with libx265 on PATH (for sample.heic).

    python -I e2e/fixtures/image/generate.py [out_dir] [width] [height]
"""

import os
import struct
import subprocess
import sys
import tempfile

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
W = int(sys.argv[2]) if len(sys.argv) > 2 else 64
H = int(sys.argv[3]) if len(sys.argv) > 3 else 48


def gradient(alpha: bool) -> Image.Image:
    img = Image.new("RGBA", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            r = 255 * x // max(1, W - 1)
            g = 255 * y // max(1, H - 1)
            b = (x * y) % 256
            a = 255 if not alpha or x < W // 2 else 255 * (W - 1 - x) // max(1, W // 2)
            px[x, y] = (r, g, b, a)
    return img


def box(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", 8 + len(payload)) + kind + payload


def full_box(kind: bytes, version: int, flags: int, payload: bytes) -> bytes:
    return box(kind, struct.pack(">I", (version << 24) | flags) + payload)


def find_box(data: bytes, kind: bytes) -> bytes:
    i = data.index(kind)
    size = struct.unpack(">I", data[i - 4 : i])[0]
    return data[i - 4 : i - 4 + size]


def heic(rgb: Image.Image, path: str) -> None:
    """Encode one HEVC intra frame with ffmpeg, then wrap it in a minimal HEIF container."""
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, "in.png")
        mp4 = os.path.join(tmp, "out.mp4")
        rgb.save(png)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", png, "-frames:v", "1", "-c:v", "libx265",
             "-x265-params", "log-level=error", "-pix_fmt", "yuv420p", "-tag:v", "hvc1", mp4],
            check=True,
        )
        data = open(mp4, "rb").read()
    hvcc = find_box(data, b"hvcC")
    mdat = find_box(data, b"mdat")
    sample = mdat[8:]  # one frame: length-prefixed NAL units, as HEIF expects

    ftyp = box(b"ftyp", b"heic" + struct.pack(">I", 0) + b"mif1heic")
    hdlr = full_box(b"hdlr", 0, 0, struct.pack(">I", 0) + b"pict" + bytes(12) + b"\0")
    pitm = full_box(b"pitm", 0, 0, struct.pack(">H", 1))
    infe = full_box(b"infe", 2, 0, struct.pack(">HH", 1, 0) + b"hvc1" + b"\0")
    iinf = full_box(b"iinf", 0, 0, struct.pack(">H", 1) + infe)
    ispe = full_box(b"ispe", 0, 0, struct.pack(">II", W, H))
    ipco = box(b"ipco", hvcc + ispe)
    ipma = full_box(b"ipma", 0, 0, struct.pack(">IHB", 1, 1, 2) + bytes([0x81, 0x02]))
    iprp = box(b"iprp", ipco + ipma)

    def build(offset: int) -> bytes:
        iloc = full_box(b"iloc", 0, 0, bytes([0x44, 0x00]) + struct.pack(">HHHHII", 1, 1, 0, 1, offset, len(sample)))
        meta = full_box(b"meta", 0, 0, hdlr + pitm + iloc + iinf + iprp)
        return ftyp + meta

    head = build(0)
    head = build(len(head) + 8)
    with open(path, "wb") as f:
        f.write(head + box(b"mdat", sample))


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    gradient(alpha=True).save(os.path.join(OUT, "sample.png"), optimize=False)
    opaque = gradient(alpha=False).convert("RGB")
    opaque.save(os.path.join(OUT, "sample.jpg"), quality=95)
    gradient(alpha=True).save(os.path.join(OUT, "sample.webp"), quality=90)
    opaque.save(os.path.join(OUT, "sample.avif"), quality=90)
    heic(opaque, os.path.join(OUT, "sample.heic"))


if __name__ == "__main__":
    main()
