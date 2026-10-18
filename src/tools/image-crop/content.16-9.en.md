---
title: "Crop an image to 16:9 | Eolietech"
description: "Crop photos and screenshots to 16:9 for video thumbnails, slides, banners and widescreen wallpapers. Full resolution, in your browser, with nothing uploaded."
h1: "Crop to 16:9"
intro: "16:9 is the shape of most TVs, video players and presentation slides. The box opens at 16:9 and as wide as your image allows; move it over the part you want and save. The image never leaves your device."
howTo:
  - "Choose an image or drop it on the box above. JPG, PNG, WebP and AVIF all work, up to 100 MB."
  - "16:9 is already selected. Drag the box up or down to choose what stays in the frame, or pull a corner inwards to crop tighter."
  - "Need 9:16 for a phone story or a vertical video? Press Rotate ratio. Keep the original format under Save as, or pick another one."
  - "Press Crop image, check the size in pixels, then download the file."
faq:
  - q: "What size is a YouTube thumbnail?"
    a: "YouTube recommends 1280 × 720 px, which is 16:9, and at least 640 px wide. Crop here first, then set the width to 1280 px in the image resizer on this site: if your crop is at least 1280 px wide, the height comes out at 720. YouTube's help pages list the current file size limit."
  - q: "Will a 16:9 image fill my slides?"
    a: "Yes, if the slides are 16:9, which is the default size in PowerPoint and Google Slides. An older deck set to 4:3 is squarer, so a 16:9 image leaves empty space above and below unless you stretch or cut it."
  - q: "Can I make a wallpaper for my screen?"
    a: "Most TVs and many monitors are 16:9, so a 16:9 crop fills them without bars. Many laptops use 16:10 instead, and phones are much taller. For those, choose Free and type the screen's width and height in pixels: you get exactly that size, as long as your image is at least that big."
  - q: "Does cropping lower the quality?"
    a: "The pixels you keep are not scaled, so the crop is as sharp as the original. JPG, WebP and AVIF are saved again with the quality you set, 90 by default, which keeps photos very close to the original. PNG is lossless."
  - q: "Is my image uploaded?"
    a: "No. Opening, cropping and saving all happen in this browser tab. The page downloads its encoders from this site once and never sends your image anywhere."
ui:
  crop.drop.hint: "JPG, PNG, WebP or AVIF. The box opens at 16:9; nothing is uploaded."
---

## Thumbnails, slides and banners

A 16:9 image fits a YouTube thumbnail, a widescreen slide, a TV or most video players without bars or stretching. Many website headers and banners are wide too; when a template doesn't state a size, 16:9 is a reasonable starting point. If you need the tall version for a phone story or a vertical video, press **Rotate ratio** and the box turns to 9:16.

## Choosing what stays in the frame

Most photos are squarer than 16:9, so the crop removes some of the top and bottom. A full-width 16:9 crop of a typical landscape phone photo (4:3) loses a quarter of its height. From a portrait phone photo it keeps less than half the height, so pick the part that matters and leave the rest out. Drag the box up or down until the horizon, the faces or the text sit where you want them.

To get an exact final size, such as 1280 × 720 or 1920 × 1080 px, crop here and then use [Resize images](/resize-image/). For other shapes, [Crop an image](/crop-image/) has every ratio and the free box.

## How it works

Your image is decoded in a background worker inside this tab, and the 16:9 area is cut from the full-resolution pixels, not from the smaller preview. Phone photos are turned upright first, using the orientation saved with them, so the crop matches what you see. The result is saved as JPG, PNG, WebP or AVIF without the original's EXIF data, such as GPS location. Nothing is sent over the network.
