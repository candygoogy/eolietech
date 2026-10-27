---
title: "Convert an image to 16:9 without cropping | Eolietech"
description: "Fit whole photos into 16:9 for YouTube thumbnails, slides and TVs, on a blurred, black, white or coloured background. Up to 50 at once, in your browser."
h1: "Fit an image to 16:9"
intro: "An upright phone photo or a square picture doesn't fill a 16:9 screen. This page puts the whole photo in a 16:9 frame and fills the sides with a blurred copy of it, black, white or a colour you choose, so nothing is cut off. It works on up to 50 photos at a time, on your device."
howTo:
  - "Choose your images or drop them on the box above. JPG, PNG, WebP and AVIF all work, up to 50 at a time and 100 MB each."
  - "16:9 is already selected under Shape. Pick a Background: Blurred photo or Black for video, White or Colour for a slide."
  - "Under Size, pick Fixed width and type 1920 for a 1920 × 1080 px frame, or 1280 for 1280 × 720 px. Same as the photo keeps the photo at full size and only adds the sides."
  - "Check the new size next to each image, then download them one by one or use Download all to get a .zip."
faq:
  - q: "What size is a YouTube thumbnail?"
    a: "YouTube recommends 3840 × 2160 px, which is 16:9, and at least 640 px wide, so 1280 × 720 px works too. Pick Fixed width and type 3840 or 1280; the note under the field shows the height. A photo smaller than the frame is enlarged to fill it and can look soft, so start from the largest copy you have. From a phone, YouTube takes thumbnails up to 2 MB, so save as JPG and lower the quality if the file is bigger."
  - q: "How do I put a portrait photo in a widescreen video?"
    a: "Fit it to 16:9 here with Blurred photo or Black, set Fixed width to the width of your video, such as 1920 for a 1080p project, and drop the image into your editing app. It already fills the frame as it is, so the app has nothing to crop or stretch."
  - q: "How do I put a photo on a slide without cropping it?"
    a: "PowerPoint and Google Slides use 16:9 slides by default, so a 16:9 image fills the slide edge to edge. Fit the photo here and insert it as a full-slide picture. If the slide has its own background or design, save as PNG and choose Transparent, and the slide shows through at the sides of the photo."
  - q: "Will the photo look small on screen?"
    a: "It takes the full height of the frame, so the space left at the sides depends on its shape. A 4:3 landscape photo covers three quarters of the width, a square photo a little over half, and an upright phone photo less than half. If that leaves too much background, crop the photo to 16:9 with the cropper on this site instead, or crop a little off the top and bottom first and fit what is left."
  - q: "Are my images uploaded?"
    a: "No. Opening, framing and saving all happen in this browser tab, and nothing is sent to a server. The new files leave out EXIF data such as GPS location, which is worth knowing before a photo goes into a public video."
---

## Thumbnails, videos and slides

16:9 is the shape of most TVs, video players and presentation slides. Phone photos are usually 3:4 when taken upright and 4:3 when taken sideways, and neither fills a 16:9 frame. Dropped into a video or a slide as they are, they usually get black bars at the sides, or get zoomed in until the edges are lost. Fitting them here gives you a 16:9 image with the whole photo in it and sides you chose.

## Sizes for 16:9

With **Fixed width**, the height follows the 16:9 shape:

- 1280 px wide gives 1280 × 720 px (720p), enough for a YouTube thumbnail.
- 1920 px wide gives 1920 × 1080 px (1080p, Full HD), the usual size of a video project and of many monitors.
- 3840 px wide gives 3840 × 2160 px (4K), the size YouTube recommends for thumbnails.

**Same as the photo** keeps the photo at full size and widens the frame around it, so a 3024 × 4032 px upright phone photo becomes 7168 × 4032 px. That suits a photo you will scale in your editing app later.

## Blurred sides or plain bars

**Blurred photo** fills the sides with an enlarged, blurred and slightly darkened copy of the same photo, a look you often see when upright footage is shown on a wide screen. **Black** matches the bars a video player would add anyway and keeps attention on the photo. **White** or a **Colour** suits a slide, where the sides can match the background of the deck.

For the tall version of the same photo, [Fit an image to 9:16](/fit-image-to-9-16/) opens at 9:16. To fill the 16:9 frame with part of the photo, use [Crop to 16:9](/crop-image-16-9/).

## How it works

Your images are decoded in a background worker inside this tab, phone photos are turned upright first, and the photo is scaled with the Lanczos3 filter only when the frame needs it. A frame can be at most 20,000 px on its longest side, so with Same as the photo a very large photo is scaled down together with its frame. The files are saved without EXIF data, and nothing is sent over the network.
