---
title: "Resize images for Instagram, 1080 px wide | Eolietech"
description: "Resize photos to the 1080 px width Instagram uses for feed posts, keeping their proportions. Up to 50 at a time, in your browser, with nothing uploaded."
h1: "Resize images for Instagram"
intro: "Instagram usually stores feed photos 1080 pixels wide. This page scales your photos to that width and keeps their proportions, so you know the exact size of each file before you post. It all happens on your device."
howTo:
  - "Choose your photos or drop them on the box above. You can add up to 50 at a time."
  - "The width is already set to 1080 px, and each photo's height follows its proportions. Photos narrower than that keep their size."
  - "Leave the format as it is, or pick JPG if your images are WebP or AVIF. JPG and PNG are the safe choices for Instagram."
  - "Check the new size next to each photo, for example 1080 × 1350 px for a 4:5 portrait, then download them one by one or use Download all to get a .zip."
faq:
  - q: "What size should an Instagram photo be?"
    a: "For feed posts, 1080 pixels wide. The height depends on the shape: 1080 × 1080 px for a square, 1080 × 1350 px for a 4:5 portrait, 1080 × 1440 px for a 3:4 portrait and about 1080 × 566 px for a 1.91:1 landscape. Instagram changes its formats from time to time, so check the preview in the app before you post."
  - q: "Will Instagram crop my photo?"
    a: "It can. Feed posts accept shapes from 1.91:1 landscape to 3:4 portrait, and a photo outside that range is cropped to fit when you post it. A phone photo taken upright is usually 3:4, so it fits as it is. To choose exactly what stays in the frame, crop it with the image cropper on this site first, then resize it here."
  - q: "Does resizing first make my photo look better on Instagram?"
    a: "It can help, but Instagram compresses every upload again, whatever you do. Resizing first gives you a smaller upload and a file that already matches the width Instagram uses. Keep the quality at 85 or higher, so the photo is in good shape before that second compression."
  - q: "Does this work for Stories?"
    a: "Yes. Stories are also 1080 pixels wide, in a tall 9:16 frame (1080 × 1920 px). The width setting works the same; for an exact 9:16 frame, crop the photo first."
  - q: "Are my photos uploaded?"
    a: "No. The resizing runs in this browser tab, and your photos never leave your device. They reach Instagram only when you post them yourself."
ui:
  img.drop.hint: "JPG, PNG, WebP or AVIF photos. Resized on your device; nothing is uploaded."
  img.zipName: "instagram-1080.zip"
---

## Why 1080 pixels

Instagram's feed is built around images 1080 pixels wide, and photos wider than that are scaled down when you upload them. A phone photo is often 3000 to 4000 pixels wide, so most of its pixels are dropped either way. Doing it here first means you control the scaling and know the exact size of the file you post. That also helps when a scheduling app, a designer or a client asks for images exactly 1080 px wide.

## Shapes and cropping

Resizing keeps the shape of each photo: a 3:2 landscape stays 3:2, just smaller. If you want a square or a 4:5 post, cut the photo to that shape first with [Crop an image](/crop-image/), then bring it back here to set the width.

You could also choose Width and height, type 1080 × 1350 and untick Keep proportions, but the photo would be stretched to fill the frame. Cropping is almost always what you want.

## How it works

Your browser resizes each photo with the Lanczos3 filter and saves it with MozJPEG, libwebp, libavif or oxipng, depending on the format, in a background worker inside this tab. Location and camera details (EXIF data) are removed from the new files. Nothing is sent over the network. For other sizes, the [image resizer](/resize-image/) has every option.
