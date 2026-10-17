---
title: "Convert AVIF to PNG, transparency kept | Eolietech"
description: "Convert AVIF images to lossless PNG files with transparent backgrounds preserved. Batch convert in your browser; your images are never uploaded."
h1: "AVIF to PNG converter"
intro: "Convert AVIF images to PNG to open them in any editor while keeping transparency. PNG stores the decoded pixels without further loss, and the conversion runs entirely in your browser."
howTo:
  - "Choose your .avif files, or drop them on the box above."
  - "PNG is preselected. There is no quality slider, because PNG is lossless."
  - "Optionally set a maximum width or height to scale large images down."
  - "Download the PNG files one at a time or together as a .zip."
faq:
  - q: "Is the PNG identical to the AVIF?"
    a: "It contains exactly the pixels the AVIF decodes to, with no additional compression loss. Any softness from the AVIF's own lossy compression is preserved as it is."
  - q: "Will transparency be kept?"
    a: "Yes. Both formats have an alpha channel, so transparent and semi-transparent areas carry over unchanged."
  - q: "Why is the PNG so large?"
    a: "AVIF is one of the most efficient lossy formats available; PNG is lossless. A PNG of a photo can be ten or more times larger than the AVIF. For logos and flat graphics the gap is much smaller."
  - q: "Can it convert animated AVIF?"
    a: "No. This tool is built for still images and does not produce animated PNGs."
ui:
  img.drop.hint: "AVIF images. Converted on your device; nothing is uploaded."
  img.zipName: "avif-to-png.zip"
---

## When PNG is the right target

Converting AVIF to PNG makes sense when you want to edit the image or need transparency in a format that everything understands. PNG is supported by every image editor, design tool and operating system, and because it is lossless, you can make changes and save repeatedly without the image getting worse.

Typical cases include product cut-outs and logos downloaded from a website that serves AVIF, illustrations you want to retouch, or images you need to drop into a presentation or a design tool that does not import AVIF yet.

## Size expectations

AVIF achieves its small files by discarding detail in ways that are hard to see. PNG keeps every pixel, so the converted file is much larger, especially for photos. The output is passed through oxipng, which picks the most compact lossless encoding without changing any pixels, but that cannot close the gap entirely. If you just need a photo that opens everywhere and transparency does not matter, [AVIF to JPG](/avif-to-jpg/) produces far smaller files.

You can reduce the size by scaling the image down: enter a maximum width or height and the image is resized with a Lanczos filter, keeping its proportions.

## Limits

The converter handles still images in standard 8-bit color. Animated AVIF files are not converted as animations, and HDR images are converted to standard range without tone mapping.

## Private and local

Decoding (libavif) and PNG optimization (oxipng) run as WebAssembly in a background worker in your browser. Your images are never uploaded to a server.
