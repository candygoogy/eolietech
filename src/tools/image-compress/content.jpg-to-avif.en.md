---
title: "Convert JPG to AVIF for smaller photos | Eolietech"
description: "Convert JPG photos to AVIF, often half the size at similar quality. Batch convert, pick quality and dimensions, all in your browser with no uploads."
h1: "JPG to AVIF converter"
intro: "Convert JPG photos to AVIF to make them dramatically smaller for the web. Choose a quality, cap the dimensions if you like, and convert a batch without your photos leaving your computer."
howTo:
  - "Choose your .jpg or .jpeg photos, or drop them on the box above."
  - "AVIF is preselected. Start with quality 75 and adjust after seeing the results."
  - "Set a maximum width or height if the photos are larger than you will display them."
  - "Give the encoder a moment per photo, then download the AVIF files or the whole batch as a .zip."
faq:
  - q: "How much smaller is AVIF than JPG?"
    a: "For typical photos, AVIF files are often around half the size of a JPG at similar visual quality, and sometimes much less. The exact saving depends on the photo; the list shows the before and after size for each one."
  - q: "Do I need to keep the original JPGs?"
    a: "Yes, keep them. AVIF is lossy, and not every app can open it yet. Use the AVIF copies for publishing and the JPGs as your masters."
  - q: "Why does the conversion take a few seconds per photo?"
    a: "The AV1-based encoder tries many ways of compressing each block of the image to find the most efficient one. That effort is what makes the files small. Processing happens in the background, so you can keep using the page."
  - q: "What happens to EXIF data?"
    a: "The photo is rotated according to its orientation tag, then saved without metadata. GPS location, camera details and capture date are not copied to the AVIF."
ui:
  img.drop.hint: "JPG images. Converted on your device; nothing is uploaded."
  img.zipName: "jpg-to-avif.zip"
---

## Smaller photos for faster pages

Images are usually the heaviest part of a web page. AVIF, based on the AV1 video codec, stores photos far more efficiently than JPG: smooth skies stay free of blocky banding and fine detail survives at low file sizes. Switching a photo-heavy site from JPG to AVIF can cut image bandwidth dramatically and improve loading metrics such as Largest Contentful Paint.

## Picking a quality

The 1 to 100 slider is mapped onto AVIF's own quality scale, so 75 here looks roughly like a JPG at 75 but takes far fewer bytes. Lower values degrade gracefully: instead of JPG's blocky artifacts, AVIF tends to smooth out fine texture. For portraits and product photos, 75 to 85 is a good range; 60 is often fine for large background images.

If your photos come straight from a phone, also set a maximum width. A 4000-pixel photo shown at 1600 pixels wastes most of its bytes, and resizing before encoding makes AVIF both faster and smaller.

## Browser support and fallbacks

Chrome, Edge, Firefox and Safari 16 or later display AVIF. To cover older browsers, serve AVIF with a JPG or WebP fallback using the HTML picture element. You can create the WebP version with [JPG to WebP](/jpg-to-webp/).

## Runs on your device

The JPG decoder (MozJPEG) and the AVIF encoder (libavif) are compiled to WebAssembly and run in background workers in your browser. Photos are never uploaded. Because encoding uses your own processor, a large batch is faster on a recent computer.
