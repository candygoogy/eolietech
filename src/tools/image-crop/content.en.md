---
title: "Crop an image in your browser | Eolietech"
description: "Crop JPG, PNG, WebP and AVIF images to a square, 4:5, 16:9 or any shape you draw, at full resolution. It runs in your browser, so nothing is uploaded."
h1: "Crop an image"
intro: "Draw a box over the part of the photo you want to keep, freely or at a fixed ratio such as 1:1 or 16:9, and save only that part at full resolution. The cropping happens on your device, so the image is never uploaded."
howTo:
  - "Choose an image or drop it on the box above. The cropper works on one image at a time, up to 100 MB."
  - "Pick a ratio (Free, Original, 1:1, 4:5, 3:2 or 16:9), then drag the box over the part to keep and pull its corners or edges to change its size. Rotate ratio turns 4:5 into 5:4."
  - "For an exact cut, type the position and size in pixels in the fields under the image. Leave Save as on the original format, or pick JPG, PNG, WebP or AVIF."
  - "Press Crop image, check the new size in pixels, then download the file."
faq:
  - q: "Is my image uploaded anywhere?"
    a: "No. The image is decoded, cropped and saved again inside this browser tab. The page downloads its image encoders from this site once and never sends your file to a server."
  - q: "Does cropping lower the quality?"
    a: "The pixels you keep are copied as they are, without any scaling, so nothing turns soft. The file is saved again, though: JPG, WebP and AVIF use the quality you set, and the default of 90 keeps photos very close to the original. PNG is lossless, so a PNG comes out pixel for pixel."
  - q: "Can I crop to an exact size, like 1080 × 1080 px?"
    a: "Yes. Pick 1:1 and type 1080 in Width: the height follows, and you get a 1080 × 1080 px piece of the original at its real pixels. If you want more of the photo inside those 1080 px, crop a bigger square first, then make it smaller with the image resizer on this site."
  - q: "Does the cropped file keep the photo's location and camera details?"
    a: "No. The new file contains only the pixels you kept, without EXIF data such as GPS location or camera model. The orientation your phone saved is applied before you crop, so sideways shots show upright and the crop matches what you see."
  - q: "Can I crop HEIC photos from an iPhone?"
    a: "Not directly. This page opens JPG, PNG, WebP and AVIF. Convert the HEIC files with the HEIC to JPG converter on this site first, then crop the JPG here."
ui:
  crop.drop.label: "Choose an image or drop it here"
  crop.drop.replace: "Choose another image"
  crop.drop.hint: "JPG, PNG, WebP or AVIF. Cropped on your device; nothing is uploaded."
  crop.opening: "Opening {name}…"
  crop.opened: "Opened {name}, {width} × {height} px. Set the crop area, then press Crop image."
  crop.fileInfo: "{name} · {width} × {height} px · {size}"
  crop.previewAlt: "Preview of {name}"
  crop.aspect.legend: "Ratio"
  crop.aspect.free: "Free"
  crop.aspect.original: "Original"
  crop.aspect.turn: "Rotate ratio"
  crop.aspect.turnLabel: "Rotate ratio to {ratio}"
  crop.box.label: "Crop area"
  crop.box.hint: "Drag the box, or its corners and edges, over the part to keep. With a keyboard: arrow keys move the box, Alt (Option on a Mac) and an arrow key resize it, and Shift makes each step 10 px."
  crop.box.state: "{width} × {height} px, {x} px from the left and {y} px from the top."
  crop.announce: "Crop area {width} × {height} px, {x} px from the left and {y} px from the top."
  crop.field.x: "From the left (px)"
  crop.field.y: "From the top (px)"
  crop.field.width: "Width (px)"
  crop.field.height: "Height (px)"
  crop.fields.note: "In pixels of the original image, measured from its top-left corner."
  crop.option.format: "Save as"
  crop.format.original: "Same as the original {format}"
  crop.option.quality: "Quality"
  crop.option.qualityNote: "Applies to JPG, WebP and AVIF. 90 keeps photos close to the original."
  crop.option.qualityPng: "PNG is lossless, so quality does not apply."
  crop.action: "Crop image"
  crop.resetBox: "Reset the box"
  crop.working: "Cropping…"
  crop.progress: "Progress"
  crop.result: "Cropped to {width} × {height} px, {size}"
  crop.flattened: "Transparent areas were filled with white, because JPG has no transparency."
  crop.downloadLabel: "Download {name}"
  crop.fileSuffix: "cropped"
  crop.error.decode: "{name} could not be read. It may be damaged, animated, or not really an image of this type."
  crop.error.unsupported: "{name} is a type of image this tool cannot open. Use JPG, PNG, WebP or AVIF."
  crop.error.memory: "There was not enough memory to work on {name}. Close other tabs, or try a smaller image."
  crop.error.failed: "Something went wrong while cropping {name}. Try again, or save it in another format."
---

## Which ratio to pick

- 1:1 suits profile pictures, avatars, product photos and square posts. [Crop to a square](/crop-image-square/) opens with it already set.
- 4:5 is a common portrait shape for social feeds, taller than a square but much shorter than a phone screen.
- 3:2 is the shape of most DSLR and mirrorless photos, and of a classic 10 × 15 cm print.
- 16:9 fits video thumbnails, slides, TVs and widescreen wallpapers. [Crop to 16:9](/crop-image-16-9/) opens with it already set.

**Original** keeps the photo's own shape, which is handy when you only want to trim the edges. **Free** lets you draw any rectangle. To turn a ratio the other way, press **Rotate ratio**: 4:5 becomes 5:4, 3:2 becomes 2:3 and 16:9 becomes 9:16.

## Exact pixels and the keyboard

The four fields under the image hold the box's distance from the left and from the top, then its width and height, all in pixels of the original image. With a ratio set, typing a width changes the height to match. These numbers choose the area you keep and never scale it. If you need a set final size, such as 1280 × 720 px, crop first and then use [Resize images](/resize-image/).

You can also work without a mouse. Tab to the crop area and use the arrow keys to move the box 1 px at a time, or 10 px with Shift held. Alt (Option on a Mac) and an arrow key resize the box from its bottom-right corner. When you pause, a screen reader reads out the new size and position. **Reset the box** brings back the largest box the current ratio allows, centred on the image.

## How it works

The preview on screen is a smaller copy made from the same decoded pixels that get cut, so the box you draw and the crop always match. The cut itself happens at full resolution in a background worker inside this tab, and the result is saved with MozJPEG, libwebp, libavif or oxipng. JPG has no transparency, so if you save a transparent image as JPG, the clear areas are filled with white and the page tells you so.

No file goes over the network at any point. Images can be up to 100 MB, and the time it takes depends on your device: a big photo saved as AVIF takes the longest. If the cropped file is still heavier than you'd like, [Compress images](/compress-image/) can make it lighter.
