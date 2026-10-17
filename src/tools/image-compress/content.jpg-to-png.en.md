---
title: "Convert JPG to PNG for lossless editing | Eolietech"
description: "Convert JPG photos to lossless PNG files so later edits do not add new compression damage. Batch convert in your browser; nothing is uploaded."
h1: "JPG to PNG converter"
intro: "Convert JPG images to PNG when you need a lossless file to edit, annotate or hand to software that requires PNG. The conversion runs in your browser, and your photos stay on your device."
howTo:
  - "Choose your .jpg or .jpeg files, or drop them on the box above."
  - "PNG is preselected. There is no quality setting, because PNG is always lossless."
  - "Optionally set a maximum width or height to scale large photos down."
  - "Download the PNGs one by one or all together as a .zip."
faq:
  - q: "Does converting to PNG improve the quality?"
    a: "No. The PNG stores the JPG's pixels exactly, including any compression artifacts already in the photo. What PNG prevents is further loss: you can edit and save it repeatedly without the image degrading."
  - q: "Why is the PNG so much larger?"
    a: "JPG discards detail to save space, while PNG keeps every pixel. For photos, a PNG is commonly three to ten times the size of the JPG. That is expected."
  - q: "Can I get a transparent background?"
    a: "Converting alone does not remove the background: the PNG supports transparency, but a JPG has none to carry over. You would need to remove the background in an editor or a background-removal tool afterwards."
  - q: "Is the photo rotated correctly?"
    a: "Yes. The EXIF orientation is applied while decoding, so portrait photos stay upright in the PNG. Other metadata, such as GPS location and camera details, is not copied."
ui:
  img.drop.hint: "JPG images. Converted on your device; nothing is uploaded."
  img.zipName: "jpg-to-png.zip"
---

## Why convert a JPG to PNG

Every time a JPG is opened, edited and saved again, it is compressed again and loses a little more detail. If you are going to work on an image in several steps, adding text, cropping, retouching or combining it with other graphics, converting it to PNG first means your edits are saved losslessly from then on.

Some tools and workflows also simply ask for PNG: certain design and presentation apps, sticker and emoji makers, game engines, and documentation systems that prefer lossless screenshots.

## What to expect

The PNG is a faithful copy of the decoded JPG, pixel for pixel. Converting cannot undo the compression the JPG already went through, so blockiness or blur in the original stays visible. The output is also run through oxipng, which finds the most compact lossless way to store the PNG without changing any pixels, but a PNG of a photo is still much larger than the JPG.

If what you actually need is a smaller file, this is the wrong direction. Use [compress image](/compress-image/) to shrink the JPG, or convert it to WebP or AVIF instead.

## Resizing and privacy

You can scale large photos down while converting by entering a maximum width or height. The image keeps its proportions and is never enlarged.

The whole conversion runs in your browser using WebAssembly builds of MozJPEG's decoder and oxipng. Your photos are never uploaded, and the page stays responsive while the batch is processed in a background worker.
