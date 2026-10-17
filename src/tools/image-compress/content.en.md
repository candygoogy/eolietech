---
title: "Compress and convert images online | Eolietech"
description: "Shrink JPG, PNG, WebP and AVIF images or convert between them in your browser. Batch files, set quality and size. Nothing is uploaded."
h1: "Compress images"
intro: "Make JPG, PNG, WebP and AVIF files smaller, or convert them to another format, without uploading anything. The encoders run inside this page, so your photos stay on your device."
howTo:
  - "Choose your images or drop them on the box above. You can add up to 50 at once."
  - "Pick an output format: keep each file's own format to just compress it, or switch to JPG, PNG, WebP or AVIF."
  - "Adjust the quality slider for JPG, WebP and AVIF, and set a maximum width or height if the images are larger than you need."
  - "Check the new size next to each file, then download them one by one or all together as a .zip."
faq:
  - q: "Are my images uploaded anywhere?"
    a: "No. Decoding, resizing and encoding happen in your browser with WebAssembly versions of MozJPEG, libwebp, libavif and oxipng. The page only downloads the encoders from this site; it never sends your files to a server."
  - q: "What quality setting should I use?"
    a: "75 is a good default for photos on the web: most people cannot tell it apart from the original at normal viewing size. Go up to 85 or 90 for images you plan to print or edit again, and down to 60 for thumbnails. PNG ignores the slider because it is always lossless."
  - q: "Why did a file get bigger?"
    a: "An image that was already compressed well can come out larger when it is encoded again, especially at a high quality setting. When that happens and the format did not change, the tool tells you and offers the original file instead, and the .zip uses the original too."
  - q: "Does compressing remove the photo's metadata?"
    a: "Yes. The new files do not carry EXIF data such as GPS location, camera model or date. The picture is rotated upright first, so photos taken sideways still display correctly. Embedded color profiles are not kept either, so wide-gamut photos can look slightly less saturated."
  - q: "Can I make the images smaller in pixels too?"
    a: "Yes. Enter a maximum width, a maximum height or both. Larger images are scaled down to fit while keeping their proportions; smaller ones are left at their original size, never enlarged."
ui:
  img.drop.hint: "JPG, PNG, WebP or AVIF. Processed on your device; nothing is uploaded."
  img.option.format: "Output format"
  img.format.original: "Keep original format"
  img.option.quality: "Quality"
  img.option.qualityNote: "Applies to JPG, WebP and AVIF. Lower means smaller files; 75 suits most photos."
  img.option.qualityPng: "PNG is lossless, so quality does not apply."
  img.option.maxWidth: "Max width (px)"
  img.option.maxHeight: "Max height (px)"
  img.option.dimensionPlaceholder: "Original"
  img.option.resizeNote: "Leave blank to keep the original dimensions. Images are only made smaller, never enlarged."
  img.progress: "Progress"
  img.list: "Your images"
  img.privacy: "Your images are processed in this browser tab and are never uploaded."
  img.zipName: "compressed-images.zip"
  img.status.pending: "Waiting ({size})"
  img.status.working: "Processing ({size})…"
  img.status.smaller: "{before} → {after}, {percent}% smaller"
  img.status.larger: "{before} → {after}, {percent}% larger"
  img.status.same: "{before} → {after}, same size"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "The new file is not smaller than the original, so keeping the original is better"
  img.status.flattened: "Transparent areas were filled with white, because JPG has no transparency"
  img.error.decode: "this file could not be read. It may be damaged, animated, or not really an image of this type."
  img.error.unsupported: "this file type is not supported here."
  img.error.memory: "there was not enough memory to process this image. Try a smaller image, or fewer files at once."
  img.downloadNamed: "Download {name}"
  img.downloadOriginal: "Download original"
  img.downloadOriginalNamed: "Download the original {name}"
  img.downloadNew: "Download new file anyway"
  img.downloadNewNamed: "Download the new {name} anyway"
  img.removeNamed: "Remove {name}"
  img.summary.working: "Processing: {done} of {total} files done."
  img.summary.done: "Done: {done} of {total} files converted."
  img.summary.sizes: "Total size {before} → {after}."
  img.summary.failed: "{failed} could not be processed."
---

## Compress or convert, on your own device

This tool re-encodes images with the same open-source encoders that power Google's Squoosh: MozJPEG for JPG, libwebp for WebP, libavif for AVIF and oxipng for PNG. They are compiled to WebAssembly and run in a background worker inside this tab, so the page stays responsive while a batch is processing and no file is ever sent over the network.

With **Keep original format** selected, each file is compressed in its own format. A JPG stays a JPG, a PNG stays a PNG. Choose a format from the list to convert the whole batch instead.

## Which format to pick

- **JPG** works everywhere and is the safe choice for photos you email or upload to other services. It has no transparency.
- **PNG** is lossless: every pixel is kept exactly. It suits screenshots, diagrams and logos, but it is a poor fit for photos, which come out several times larger than a JPG.
- **WebP** is usually 25–35% smaller than a JPG of similar quality and supports transparency. Every current browser displays it, though some older desktop software does not.
- **AVIF** usually gives the smallest files, often around half the size of a comparable JPG. Encoding is slower, so a large batch takes a while. Chrome, Edge, Firefox and Safari 16 or newer can display it.

## How much smaller will my files get?

It depends on the source. Photos straight from a phone or camera are often saved at a very high quality and shrink a lot, sometimes by 60–80% at quality 75. Images that were already optimized for the web may barely change. PNG compression is lossless, so typical savings there are smaller, around 10–40%. Each result shows the before and after size, so you can compare before you download.

If you only need smaller files for a website, combining a moderate quality setting with a maximum width (1600 or 2000 pixels covers most layouts) usually saves more than lowering the quality alone.
