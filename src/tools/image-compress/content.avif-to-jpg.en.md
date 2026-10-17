---
title: "Convert AVIF to JPG that opens anywhere | Eolietech"
description: "Convert AVIF images to JPG for apps and sites that do not support AVIF yet. Choose the quality and convert in batches, privately in your browser."
h1: "AVIF to JPG converter"
intro: "Got an .avif file that your editor, phone or upload form will not open? Convert it to a regular JPG here. You pick the quality, and the conversion happens on your own device."
howTo:
  - "Choose your .avif files, or drop them on the box above."
  - "JPG is preselected. Set the quality: 80–90 keeps the result close to the AVIF."
  - "Optionally enter a maximum width or height to make the images smaller."
  - "Download each JPG or the whole batch as a .zip."
faq:
  - q: "Why can't I open AVIF files?"
    a: "AVIF is a fairly new format (2019). Current browsers display it, but many image viewers, older operating systems, office apps and websites still do not accept it. JPG works almost everywhere."
  - q: "Why is the JPG bigger than the AVIF?"
    a: "AVIF compresses much more efficiently than JPG, so a JPG of similar visual quality typically needs two or more times as many bytes. Lowering the JPG quality reduces the size but makes artifacts more visible."
  - q: "What happens to transparency?"
    a: "AVIF can be transparent, JPG cannot. Transparent areas are blended onto a white background, and the list tells you when that happened. Use AVIF to PNG to keep transparency."
  - q: "Does this work with HDR or animated AVIF?"
    a: "The tool converts still images to standard 8-bit JPG. Animated AVIF files are not converted as animations, and HDR images are converted without HDR tone mapping, so very bright areas may look clipped."
ui:
  img.drop.hint: "AVIF images. Converted on your device; nothing is uploaded."
  img.zipName: "avif-to-jpg.zip"
---

## Making AVIF files usable everywhere

AVIF is increasingly common on the web: sites serve it to browsers that support it, and some phones and cameras can save photos in it. Save one of those images, though, and you may find that your photo viewer, word processor or the site you want to upload it to does not recognize the file. JPG has been the universal photo format for decades, so converting is the simplest way around the problem.

## Quality settings

Both formats are lossy. Because AVIF is so efficient, a JPG needs a relatively high quality to look the same, so 80–90 is a good starting point. If the size matters more, try 75 and compare. The list shows the before and after sizes, and moving the slider re-converts the batch so you can find the balance quickly.

## Transparency and limits

Some AVIF images, such as logos and stickers, have transparent backgrounds. JPG cannot store transparency, so those areas become white. If you need to keep them transparent, use [AVIF to PNG](/avif-to-png/) instead.

The converter is built for still images: animated AVIF sequences are not converted as animations, and 10- or 12-bit HDR images are reduced to standard 8-bit color without tone mapping, which works well for ordinary photos but can flatten bright highlights.

## Private conversion

The AVIF decoder (libavif) and the MozJPEG encoder run as WebAssembly inside your browser. Nothing is uploaded, and conversion runs in a background worker so the page stays responsive.
