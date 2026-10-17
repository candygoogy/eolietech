---
title: "Convert WebP to PNG, privately | Eolietech"
description: "Turn WebP images into lossless PNG files that every editor opens, with transparency intact. Runs in your browser; nothing is uploaded."
h1: "WebP to PNG converter"
intro: "Save WebP images from the web as PNG files that image editors, office apps and older software can open. Transparent backgrounds are kept, and the conversion happens on your own device."
howTo:
  - "Choose one or more .webp files, or drop them on the box above."
  - "PNG is already selected as the output format, so conversion starts right away."
  - "Optionally set a maximum width or height to scale large images down."
  - "Download each PNG, or get them all at once with Download all (.zip)."
faq:
  - q: "Will the PNG look exactly like the WebP?"
    a: "Yes. PNG is lossless, so every pixel of the decoded WebP is stored as it is. If the WebP was saved with lossy compression, its artifacts are kept too: converting cannot add detail that is no longer there."
  - q: "Why is the PNG so much bigger than the WebP?"
    a: "Lossy WebP throws away detail you are unlikely to notice, while PNG keeps every pixel. For a photo the PNG can easily be five to ten times larger. For logos, icons and screenshots the difference is much smaller."
  - q: "Is the transparent background preserved?"
    a: "Yes. WebP and PNG both support an alpha channel, so transparent and semi-transparent areas carry over unchanged."
  - q: "Can I convert animated WebP files?"
    a: "No. This tool converts still images. An animated WebP is reported as a file that could not be read."
ui:
  img.drop.hint: "WebP images. Converted on your device; nothing is uploaded."
  img.zipName: "webp-to-png.zip"
---

## Why convert WebP to PNG

WebP is the format many websites now serve to keep pages fast, so right-clicking an image and saving it often gives you a .webp file. Browsers display it without trouble, but plenty of other software does not: older versions of Photoshop, some office suites, print services and upload forms that only list JPG and PNG.

PNG is the safer choice when you want to **edit the image further**. It is lossless, so you can open, change and save it repeatedly without the image getting worse each time, which is not true of JPG. It also keeps transparency, which matters for logos, stickers, icons and cut-out product shots.

## What to expect

The conversion decodes the WebP and writes a PNG with exactly the same pixels, then runs it through oxipng, a lossless optimizer that shrinks PNG files without changing a single pixel. Even so, a PNG of a photograph will be much larger than the WebP it came from. If you only need a file that opens everywhere and the image is a photo without transparency, [WebP to JPG](/webp-to-jpg/) gives far smaller files.

Large images can be scaled down while converting: enter a maximum width or height and the image is resized with a high-quality Lanczos filter, keeping its proportions.

Everything runs locally in your browser tab. The WebP decoder and PNG encoder are WebAssembly builds of libwebp and oxipng, and your images are never uploaded. Conversion works in current versions of Chrome, Edge, Firefox and Safari.
