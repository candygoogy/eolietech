---
title: "Compress an image to a size in KB | Eolietech"
description: "Get a photo under the size an upload form allows: 20, 50, 100 KB or any other. JPG or WebP, up to 50 at a time, compressed in your browser, never uploaded."
h1: "Compress an image to a size in KB"
intro: "Upload forms often turn a photo away because it is a few KB too heavy. Type the limit the form gives, add your photos, and each one comes back under it at the best quality that fits. Everything runs on your device, so your photos are never uploaded."
howTo:
  - "Type the limit the form gives, in KB. The box starts at 100 KB and takes any whole number from 1 to 50,000."
  - "Leave the format on JPG, which nearly every upload form accepts, or pick WebP if the form lists it."
  - "Choose your images or drop them on the box above. JPG, PNG, WebP and AVIF files work, up to 50 at a time."
  - "Each row shows the new file size, the size in pixels and the quality used. Download the images one by one, or use Download all to get a .zip. If you change the size or the format later, the list is compressed again."
faq:
  - q: "Are my photos uploaded?"
    a: "No. Decoding, shrinking and saving run in this browser tab. The page downloads its encoders from this site once and never sends your files anywhere."
  - q: "Why is my photo smaller in pixels?"
    a: "A phone photo has millions of pixels, and a small file cannot describe them all. The tool keeps the full pixel size whenever the photo fits at quality 40 or higher. When it does not, the photo is scaled down to the largest size that fits, so its row usually shows a quality close to 40."
  - q: "Does it count 1 KB as 1000 or 1024 bytes?"
    a: "As 1000. A file under 100 KB counted that way is also under 100 KB counted as 1024 bytes, so it fits either kind of form."
  - q: "What if my image is already small enough?"
    a: "If it is already under the size you typed and already in the format you picked, it is not compressed again. Only its hidden metadata is removed, which makes it a little lighter, and its row says so. A PNG under the limit is still turned into a JPG or WebP, because that is the format you asked for."
  - q: "Can I also set the width and height?"
    a: "Not on this page. If the form asks for exact pixel dimensions, resize or crop the photo first with the image resizer or the crop tool on this site, then compress the result here. As long as it fits at quality 40 or higher, its pixel size stays the same."
  - q: "What does it mean when an image does not get under the target?"
    a: "The tool never makes an image smaller than 200 px on its longest side. A few images, such as very noisy or grainy ones, still weigh too much at that size, and their row shows an error. Type a larger size, or crop away the parts you do not need and try again."
  - q: "Does it keep the photo's location and camera details?"
    a: "No. Every file you download contains only the image, without EXIF data such as GPS location or camera model, including the ones that were already small enough. Photos still come out the right way up."
ui:
  img.drop.hint: "JPG, PNG, WebP or AVIF. Compressed on your device; nothing is uploaded."
  img.option.targetKb: "Target size (KB)"
  img.option.saveAs: "Save as"
  img.note.target: "Each image is saved under {kb} KB ({bytes} bytes) at the highest quality that fits, and made smaller in pixels only if it has to be."
  img.note.kb: "1 KB counts as 1,000 bytes here, so the file also fits forms that count 1,024."
  img.note.missing: "Type a size from 1 to {max} KB."
  img.progress: "Progress"
  img.list: "Your images"
  img.zipName: "compressed-images.zip"
  img.status.pending: "Waiting ({size})"
  img.status.working: "Compressing ({size})…"
  img.status.resized: "{fromWidth} × {fromHeight} → {width} × {height} px"
  img.status.smaller: "{before} → {after}, {percent}% smaller"
  img.status.larger: "{before} → {after}, {percent}% larger"
  img.status.same: "{before} → {after}, same size"
  img.status.dimensions: "{width} × {height} px"
  img.status.quality: "Quality {quality}"
  img.status.unchanged: "Already under the target: image kept as it is, without metadata ({after})"
  img.status.keepOriginal: "The new file is not smaller, so keeping the original is better"
  img.status.flattened: "Transparent areas were filled with white, because JPG has no transparency"
  img.error.decode: "this file could not be read. It may be damaged, animated, or not really an image of this type."
  img.error.unsupported: "this file type is not supported here."
  img.error.memory: "there was not enough memory for this image. Try fewer files at once."
  img.error.noFit: "this image does not get under the target, even at 200 px on its longest side and low quality. Try a larger size."
  img.downloadNamed: "Download {name}"
  img.downloadOriginal: "Download original"
  img.downloadOriginalNamed: "Download the original {name}"
  img.downloadNew: "Download new file anyway"
  img.downloadNewNamed: "Download the new {name} anyway"
  img.removeNamed: "Remove {name}"
  img.summary.working.one: "Compressing: {done} of {total} image done."
  img.summary.working.other: "Compressing: {done} of {total} images done."
  img.summary.done.one: "Done: {done} of {total} image ready."
  img.summary.done.other: "Done: {done} of {total} images ready."
  img.summary.sizes: "Total size {before} → {after}."
  img.summary.failed.one: "{failed} could not be compressed."
  img.summary.failed.other: "{failed} could not be compressed."
---

## How the size is reached

The tool keeps each image at its full pixel size when it can, and looks for the highest quality between 40 and 92 that keeps the file under the size you typed. Quality 92 is the ceiling because above it files grow quickly with no visible gain, and 40 is the floor because below it JPG photos start to show blocks and WebP photos look smeared.

If the photo is still too heavy at quality 40, the tool scales it down, keeping its proportions, to the largest size that fits. It works this out from a small test copy instead of guessing blindly, so a large phone photo is usually done after a handful of attempts. It stops at 200 px on the longest side. An image that is still too big at that point is reported as an error and nothing is saved for it.

## Why 1 KB counts as 1,000 bytes here

Some websites count a kilobyte as 1,000 bytes and others as 1,024, and the form rarely says which. Windows also counts 1,024, so a file of 100,000 bytes shows there as about 98 KB, while macOS counts 1,000. By keeping every file under the target times 1,000 bytes, the tool gives you a file that passes either check. The note under the size box shows the exact number of bytes.

## Common sizes

Each of these pages starts at its own size and explains what that size is good for:

- [Compress an image to 20 KB](/compress-image-to-20kb/) for scanned signatures and small passport-style photos.
- [Compress an image to 50 KB](/compress-image-to-50kb/) for application photos and ID scans.
- [Compress an image to 100 KB](/compress-image-to-100kb/) for job portals and profile pictures.
- [Compress an image to 200 KB](/compress-image-to-200kb/) for forums, older websites and lighter email attachments.

## How it works

Everything runs in a background worker inside this tab, with MozJPEG for JPG, libwebp for WebP and a Lanczos3 filter when a photo has to be scaled down. No file goes over the network, which matters when the photo is an ID document or a signature. If you want lighter files without a fixed limit, [Compress images](/compress-image/) lets you pick the quality yourself. iPhone photos saved as HEIC need converting first with [HEIC to JPG](/heic-to-jpg/).
