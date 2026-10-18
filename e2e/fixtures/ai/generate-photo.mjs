#!/usr/bin/env node
/**
 * Generates photo.png: a synthetic "product shot" (a shaded orange ball with a soft shadow on a
 * pale studio backdrop), 640 x 427. Used by e2e/ai-tools.spec.ts for the background remover.
 * Deterministic, no dependencies:  node e2e/fixtures/ai/generate-photo.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const W = 640;
const H = 427;
const CX = 320;
const CY = 200;
const R = 120;

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Backdrop: light grey-blue wall fading into a warmer floor.
    const t = y / H;
    let r = 222 - 30 * t;
    let g = 226 - 26 * t;
    let b = 232 - 40 * t;
    // Soft contact shadow under the ball.
    const sx = (x - CX) / (R * 1.15);
    const sy = (y - (CY + R + 6)) / (R * 0.22);
    const shadow = Math.exp(-(sx * sx + sy * sy) * 1.6) * 0.55;
    r *= 1 - shadow;
    g *= 1 - shadow;
    b *= 1 - shadow;
    // The ball: Lambert shading from the top left plus a specular highlight.
    const dx = (x - CX) / R;
    const dy = (y - CY) / R;
    const d2 = dx * dx + dy * dy;
    if (d2 <= 1) {
      const nz = Math.sqrt(1 - d2);
      const light = Math.max(0, -0.45 * dx - 0.55 * dy + 0.7 * nz);
      const spec = Math.pow(Math.max(0, -0.3 * dx - 0.4 * dy + 0.87 * nz), 40);
      const edge = Math.min(1, (1 - Math.sqrt(d2)) * R); // 1px anti-aliased rim
      const br = 235 * (0.25 + 0.8 * light) + 255 * spec;
      const bg = 120 * (0.25 + 0.8 * light) + 255 * spec;
      const bb = 30 * (0.25 + 0.8 * light) + 255 * spec;
      r = r * (1 - edge) + br * edge;
      g = g * (1 - edge) + bg * edge;
      b = b * (1 - edge) + bb * edge;
    }
    const i = (y * W + x) * 3;
    rgb[i] = clamp(r);
    rgb[i + 1] = clamp(g);
    rgb[i + 2] = clamp(b);
  }
}

// PNG encoding: 8-bit RGB, filter 0 on every row.
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "photo.png");
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
