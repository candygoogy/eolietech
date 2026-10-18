---
title: "Resize images in your browser | Eolietech"
description: "Resize JPG, PNG, WebP and AVIF images by width, height or percentage, up to 50 at a time. It all happens in your browser, so your images are never uploaded."
h1: "Resize images"
intro: "Give your images a set width, height or percentage of their size, one at a time or 50 at once. The resizing happens on your device, so your images are never uploaded."
howTo:
  - "Choose your images or drop them on the box above. You can add up to 50 at a time."
  - "Pick how to resize: by width, by height, to fit inside a width and height, or by percentage, then type the size. The line under the fields tells you what will happen."
  - "Leave the format as it is, or switch to JPG, PNG, WebP or AVIF. For photos, quality 85 looks like the original."
  - "Check the new size in pixels and the file size next to each image, then download them one by one or use Download all to get a .zip."
faq:
  - q: "Are my images uploaded?"
    a: "No. Decoding, resizing and encoding run in this browser tab. The page downloads its encoders from this site once and never sends your files anywhere."
  - q: "Will my images be stretched?"
    a: "Not unless you ask for it. Width, height and percentage always keep each image's proportions. With width and height, untick Keep proportions only if you want every image to be exactly that size, even if that distorts it."
  - q: "What happens to images smaller than the size I set?"
    a: "They keep their size, and the row says so, because enlarging adds no detail. Tick Allow enlarging smaller images if you need them bigger anyway, knowing they can look soft."
  - q: "Can it crop my images to a square or another shape?"
    a: "No. Resizing keeps the whole picture and changes only how many pixels it has. To cut an image to a square, 4:5 or 16:9, use the image cropper on this site, then resize the result here if you need to."
  - q: "Does resizing keep the photo's location and camera details?"
    a: "No. The new files contain only the image, without EXIF data such as GPS location or camera model. Photos are turned upright first, so sideways shots come out the right way up."
ui:
  img.drop.hint: "JPG, PNG, WebP or AVIF. Resized on your device; nothing is uploaded."
  img.option.mode: "Resize by"
  img.mode.width: "Width"
  img.mode.height: "Height"
  img.mode.box: "Width and height"
  img.mode.percent: "Percentage"
  img.option.width: "Width (px)"
  img.option.height: "Height (px)"
  img.option.percent: "Percentage (%)"
  img.option.keepAspect: "Keep proportions"
  img.option.enlarge: "Allow enlarging smaller images"
  img.note.width: "Each image becomes {width} px wide, and its height follows."
  img.note.height: "Each image becomes {height} px tall, and its width follows."
  img.note.fit: "Each image fits inside {width} × {height} px and keeps its proportions."
  img.note.stretch: "Each image becomes exactly {width} × {height} px, stretched if its shape is different."
  img.note.percent: "Each image becomes {percent}% of its width and height."
  img.note.noEnlarge: "Images already smaller keep their size."
  img.note.enlarge: "Smaller images are enlarged too, which can make them look soft."
  img.note.missing.width: "Type a width from 1 to {max} px."
  img.note.missing.height: "Type a height from 1 to {max} px."
  img.note.missing.both: "Type a width and a height from 1 to {max} px."
  img.note.missing.percent: "Type a percentage from 1 to {maxPercent}."
  img.option.format: "Output format"
  img.format.original: "Same as original"
  img.option.quality: "Quality"
  img.option.qualityNote: "For JPG, WebP and AVIF. 85 keeps photos looking like the original."
  img.option.qualityPng: "PNG is lossless, so quality does not apply."
  img.progress: "Progress"
  img.list: "Your images"
  img.privacy: "Your images are resized in this browser tab and are never uploaded."
  img.zipName: "resized-images.zip"
  img.status.pending: "Waiting ({size})"
  img.status.working: "Resizing ({size})…"
  img.status.resized: "{fromWidth} × {fromHeight} → {width} × {height} px"
  img.status.notEnlarged: "Smaller than the size you set, so not enlarged"
  img.status.smaller: "{before} → {after}, {percent}% smaller"
  img.status.larger: "{before} → {after}, {percent}% larger"
  img.status.same: "{before} → {after}, same size"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "Same size in pixels and the new file is not smaller, so keeping the original is better"
  img.status.flattened: "Transparent areas were filled with white, because JPG has no transparency"
  img.error.decode: "this file could not be read. It may be damaged, animated, or not really an image of this type."
  img.error.unsupported: "this file type is not supported here."
  img.error.memory: "there was not enough memory for this size. Try a smaller size or fewer files at once."
  img.downloadNamed: "Download {name}"
  img.downloadOriginal: "Download original"
  img.downloadOriginalNamed: "Download the original {name}"
  img.downloadNew: "Download new file anyway"
  img.downloadNewNamed: "Download the new {name} anyway"
  img.removeNamed: "Remove {name}"
  img.summary.working.one: "Resizing: {done} of {total} image done."
  img.summary.working.other: "Resizing: {done} of {total} images done."
  img.summary.done.one: "Done: {done} of {total} image resized."
  img.summary.done.other: "Done: {done} of {total} images resized."
  img.summary.sizes: "Total size {before} → {after}."
  img.summary.failed.one: "{failed} could not be resized."
  img.summary.failed.other: "{failed} could not be resized."
---

## Which option to pick

- **Width** or **Height**: every image gets the same width (or height), and the other side follows its proportions. Use it when the images sit in a column of fixed width, such as a blog post or a product page.
- **Width and height**: every image fits inside the box, so neither side goes over. A box of 1600 × 1600 px gives landscape and portrait photos the same longest side. Untick **Keep proportions** only if every image must be exactly that size.
- **Percentage**: every image shrinks (or grows) by the same amount, whatever its size. 50% halves the width and the height, which leaves about a quarter of the pixels.

## Sizes for common jobs

For a website, 1600 to 2000 px wide covers most layouts, even on sharp screens. For email, 1600 px on the longest side is plenty, and [Resize images for email](/resize-image-for-email/) starts with that and JPG already set. For Instagram, [Resize images for Instagram](/resize-image-for-instagram/) starts at 1080 px wide.

Resizing keeps each image's shape. If you need a square or a 4:5 frame, cut it first with [Crop an image](/crop-image/). If the size in pixels is right and you only want lighter files, use [Compress images](/compress-image/).

## How it works

This tool resamples each image with the Lanczos3 filter, the same one Squoosh uses, and then saves it with MozJPEG, libwebp, libavif or oxipng. Everything runs in a background worker inside this tab, so the page stays usable during a large batch and no file goes over the network. Each image can be up to 100 MB. How fast a batch goes depends on your device's speed and memory, and AVIF takes noticeably longer to save than the other formats.
