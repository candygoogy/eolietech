---
title: "Make an image square without cropping | Eolietech"
description: "Make a photo square without cutting anything off: the whole picture sits on a white, black, coloured or blurred background. Up to 50 at once, never uploaded."
h1: "Make an image square"
intro: "Put the whole photo in a square and fill the space left over with white, black, a colour you choose or a blurred copy of the photo. Nothing is cut off, so a tall or wide picture keeps every edge. The page also makes 4:5, 16:9 and 9:16 frames, works on up to 50 photos at a time, and never sends them anywhere."
howTo:
  - "Choose your photos or drop them on the box above. JPG, PNG, WebP and AVIF all work, up to 50 at a time and 100 MB each."
  - "1:1 is already selected under Shape; pick 4:5 instead for an Instagram portrait post. Then choose a Background: White, Black, Colour, Blurred photo, or Transparent if you save as PNG or WebP."
  - "Under Size, keep Same as the photo to use every pixel of the original, or pick Fixed width and type the frame width, such as 1080. Leave Save as on Same as original, or pick JPG, PNG or WebP."
  - "Check the new size in pixels next to each photo, then download them one by one or use Download all to get a .zip. If you change a setting, the photos already in the list are made again with it."
faq:
  - q: "What size is a square image?"
    a: "There is no single size. Instagram works with posts 1080 px wide, so 1080 × 1080 px suits a square post: pick Fixed width and type 1080. For a shop or a marketplace, check the size it asks for. With Same as the photo, the square takes the photo's longest side, so a 4032 × 3024 px phone photo becomes 4032 × 4032 px and keeps all its detail."
  - q: "How do I put portrait and landscape photos in one Instagram carousel?"
    a: "Instagram shows every photo in a carousel at the shape of the first one and crops the others to match. Add them all here and pick 1:1 or 4:5, and each one comes out at the same shape with nothing cut off. With Fixed width set to 1080, they also come out at the same size: 1080 × 1080 px or 1080 × 1350 px."
  - q: "Will a small photo look blurry?"
    a: "Not with Same as the photo, which never enlarges anything: the photo keeps its pixels and only the background is added. With Fixed width, a photo smaller than the frame is enlarged to fit it, and enlarging adds no detail, so it can look soft. Each row shows the size before and after."
  - q: "Can I keep a transparent background?"
    a: "Yes, which is handy for logos, icons and product cut-outs. Set Save as to PNG or WebP and Transparent appears under Background. The empty part of the square stays clear, and so do any transparent areas of the image itself. JPG has no transparency, so the option is not offered there, and a transparent image saved as JPG gets white behind it."
  - q: "Can I move the photo inside the square?"
    a: "No. The photo is always centred, with the same space on both sides. If you want the subject somewhere else, or no background showing at all, crop the photo with the square cropper on this site."
  - q: "Are my photos uploaded?"
    a: "No. Each photo is opened, framed and saved in this browser tab, and nothing is sent to a server. The new files also leave out EXIF data such as GPS location and camera model."
ui:
  fit.option.shape: "Shape"
  fit.option.background: "Background"
  fit.bg.white: "White"
  fit.bg.black: "Black"
  fit.bg.color: "Colour"
  fit.bg.blur: "Blurred photo"
  fit.bg.transparent: "Transparent"
  fit.bg.colorLabel: "Background colour"
  fit.option.size: "Size"
  fit.size.photo: "Same as the photo"
  fit.size.width: "Fixed width"
  fit.option.width: "Frame width (px)"
  fit.note.photo: "Each frame is just big enough for the whole photo at its full size, so nothing is enlarged."
  fit.note.width: "Each image becomes {width} × {height} px, with the photo scaled to fit inside."
  fit.note.missing: "Type a width from 1 to {max} px."
  img.drop.hint: "JPG, PNG, WebP or AVIF. Framed on your device; nothing is uploaded."
  img.option.format: "Save as"
  img.format.original: "Same as original"
  img.option.quality: "Quality"
  img.option.qualityNote: "For JPG and WebP. 85 keeps photos looking like the original."
  img.option.qualityPng: "PNG is lossless, so quality does not apply."
  img.progress: "Progress"
  img.list: "Your images"
  img.zipName: "framed-images.zip"
  img.status.pending: "Waiting ({size})"
  img.status.working: "Framing ({size})…"
  img.status.resized: "{fromWidth} × {fromHeight} → {width} × {height} px"
  img.status.smaller: "{before} → {after}, {percent}% smaller"
  img.status.larger: "{before} → {after}, {percent}% larger"
  img.status.same: "{before} → {after}, same size"
  img.status.keepOriginal: "Already this shape and the new file is not smaller, so keeping the original is better"
  img.status.flattened: "Transparent areas were filled with white, because JPG has no transparency"
  img.error.decode: "this file could not be read. It may be damaged, animated, or not really an image of this type."
  img.error.unsupported: "this file type is not supported here."
  img.error.memory: "there was not enough memory for this size. Try a smaller frame width or fewer files at once."
  img.downloadNamed: "Download {name}"
  img.downloadOriginal: "Download original"
  img.downloadOriginalNamed: "Download the original {name}"
  img.downloadNew: "Download new file anyway"
  img.downloadNewNamed: "Download the new {name} anyway"
  img.removeNamed: "Remove {name}"
  img.summary.working.one: "Framing: {done} of {total} image done."
  img.summary.working.other: "Framing: {done} of {total} images done."
  img.summary.done.one: "Done: {done} of {total} image framed."
  img.summary.done.other: "Done: {done} of {total} images framed."
  img.summary.sizes: "Total size {before} → {after}."
  img.summary.failed.one: "{failed} could not be framed."
  img.summary.failed.other: "{failed} could not be framed."
---

## A square without cutting anything off

Cropping a rectangle to a square throws away the ends: the sides of a landscape photo, or the top and bottom of an upright one. This page keeps the whole photo and adds the missing space around it. A landscape photo gets a band above and below, an upright photo gets one on each side, and the photo sits in the middle. If you would rather fill the square with part of the photo, [Crop to a square](/crop-image-square/) does that.

## Which background to pick

- **White** suits product photos and anything that ends up on a white page, where the frame blends into the page.
- **Black** suits night shots, dark photos and apps used in dark mode.
- **Colour** opens a colour picker, so you can use a brand colour or pick up a colour from the photo. It starts on a light grey.
- **Blurred photo** fills the space with an enlarged, blurred and slightly darkened copy of the same photo. The bands take on the photo's own colours, which often looks better in a social feed than a flat colour.
- **Transparent** leaves the space empty. It appears only when Save as is PNG or WebP.

## Same as the photo or a fixed width

**Same as the photo** makes the smallest frame that holds the whole photo at full size. For a square, the longest side stays as it is and the shorter side is padded to match, so nothing is scaled and no detail is lost. Use it when you plan to resize the image later, or when the site you post to shrinks it anyway.

**Fixed width** gives every image the same frame, whatever the size of the photos. At 1080 px wide, a square is 1080 × 1080 px and a 4:5 frame is 1080 × 1350 px, the sizes Instagram works with for feed posts. Each photo is scaled to fit inside the frame, and that includes enlarging photos smaller than it. The note under the field shows the exact size before you add anything.

## Other shapes

The Shape buttons switch between 1:1, 4:5, 16:9 and 9:16 at any time. For video thumbnails and slides, [Fit an image to 16:9](/fit-image-to-16-9/) opens at 16:9, and for Stories, Reels and TikTok, [Fit an image to 9:16](/fit-image-to-9-16/) opens at 9:16. To change only the number of pixels and keep the photo's shape, use [Resize images](/resize-image/).

## How it works

Each photo is decoded in a background worker inside this tab and turned upright using the orientation your phone saved with it. The background is drawn at the full size of the frame, the photo is placed in the middle, and any scaling uses the Lanczos3 filter. The blurred background is made from a small copy of the photo, so it stays quick even on large photos. The new file is saved without the original's EXIF data, such as GPS location and camera model, and nothing is sent over the network. iPhone photos saved as HEIC need converting first, with [HEIC to JPG](/heic-to-jpg/).
