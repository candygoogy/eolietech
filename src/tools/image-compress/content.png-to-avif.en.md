---
title: "Convert PNG to AVIF, keep transparency | Eolietech"
description: "Convert PNG images to AVIF for much smaller files with transparency kept. Choose the quality and size; encoding runs in your browser, with no uploads."
h1: "PNG to AVIF converter"
intro: "Convert PNG images to AVIF, a modern format that often stores the same picture in a small fraction of the space and keeps transparent backgrounds. Encoding happens on your device, so nothing is uploaded."
howTo:
  - "Choose your .png files, or drop them on the box above."
  - "AVIF is preselected. Pick a quality: 75 works for most images, higher for screenshots with small text."
  - "Optionally set a maximum width or height to shrink oversized images."
  - "Wait for the encoder to finish (AVIF takes longer than other formats), then download the files or a .zip."
faq:
  - q: "Which browsers can display AVIF?"
    a: "Chrome since version 85, Firefox since 93, Safari since 16 (iOS 16 and macOS Ventura or later) and Edge since 121. Older browsers and many desktop apps cannot open AVIF, so keep your PNG originals."
  - q: "Is the transparent background kept?"
    a: "Yes. AVIF supports an alpha channel, and transparent areas of the PNG are preserved."
  - q: "Why does AVIF take longer than WebP or JPG?"
    a: "AVIF is based on the AV1 video codec, which searches much harder for an efficient way to store each part of the image. The tool uses a balanced speed setting, but a large batch can still take a while. The page stays usable while it runs."
  - q: "Are screenshots a good fit for AVIF?"
    a: "Usually yes, at a high quality setting. The encoder stores color at half resolution, so tiny colored text can look slightly soft; compare the result, and keep the PNG if it needs to stay pixel-perfect."
ui:
  img.drop.hint: "PNG images. Converted on your device; nothing is uploaded."
  img.zipName: "png-to-avif.zip"
---

## Why AVIF

AVIF stores still images using AV1, the royalty-free video codec developed by the Alliance for Open Media. Compared with older formats it handles gradients, fine texture and transparency very efficiently, and photographic PNGs often shrink by 80 to 90%. For a website, that can turn a multi-megabyte hero image into something that loads almost instantly.

Unlike JPG, AVIF keeps the alpha channel, so it can stand in for transparent PNGs such as product cut-outs and illustrations.

## Choosing settings

The quality slider uses the same 1 to 100 scale as the other formats on this site and is mapped onto AVIF's own scale, so 75 gives roughly the visual quality you would expect from a JPG at 75, in a much smaller file. For images with sharp text or line art, start at 85 to 90. Combining a moderate quality with a maximum width saves the most space.

AVIF encoding is CPU-intensive. It runs in background workers so the page does not freeze, but converting dozens of large images can take a few minutes on an older laptop. The list updates as each file finishes.

## Compatibility

All current major browsers display AVIF, but support elsewhere is still growing: some image viewers, editors and social platforms do not accept it yet. AVIF is ideal for images you publish on your own site, while PNG remains the better file to archive or share for editing. If you need broader support with transparency, [PNG to WebP](/png-to-webp/) is a good middle ground.

Encoding uses a WebAssembly build of libavif, entirely in your browser. Your images are never uploaded.
