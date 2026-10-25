---
title: "Crop a photo for Instagram: 4:5, 3:4 or square | Eolietech"
description: "Crop photos for Instagram feed posts in 4:5 portrait, 3:4 or square, at full resolution. JPG, PNG, WebP and AVIF, cropped in your browser and never uploaded."
h1: "Crop for Instagram"
intro: "The box opens at 4:5, the portrait shape Instagram has long used for feed posts, 1080 × 1350 px at full size. Move it over the part you want, or switch to 3:4 or 1:1, and save. Your photo is cropped in the browser and stays on your device until you post it."
howTo:
  - "Choose a photo or drop it on the box above. JPG, PNG, WebP and AVIF all work, up to 100 MB."
  - "4:5 is already selected. Drag the box over the part you want to post, or pick 3:4 for a taller post or 1:1 for a square."
  - "Under Save as, keep the original format or pick another one. JPG and PNG are the safe choices for Instagram, so pick JPG if your photo is WebP or AVIF."
  - "Press Crop image and download the file. To bring it to 1080 px wide, open it in the Instagram resizer on this site."
faq:
  - q: "Should I use 4:5 or 3:4?"
    a: "3:4 (1080 × 1440 px) is the tallest shape a feed post keeps without being cropped, so it takes up the most room on screen. It is also the shape of an upright phone photo, so the box starts out covering the whole picture and you only tighten it if you want to. 4:5 (1080 × 1350 px) is a little shorter and is the size many templates and scheduling apps still ask for. Instagram changes its formats from time to time, so check the preview in the app before you post."
  - q: "Can I post a landscape photo?"
    a: "Yes. The widest shape a feed post keeps is 1.91:1, about 1080 × 566 px. There is no button for it here, but 3:2 and 16:9 both fall inside that range, so a landscape photo cropped to either one is posted as it is. For exactly 1.91:1, choose Free and type the width and height in pixels."
  - q: "How do I crop photos for a carousel?"
    a: "Instagram shows every photo in a carousel at the same shape as the first one and crops the others to match. Crop them all to the same ratio before you post. This page works on one photo at a time, and the ratio you picked stays selected when you choose the next photo."
  - q: "Why does my post look different on my profile?"
    a: "The profile grid shows each post as a tall rectangle cut from the middle, so the edges of the photo can disappear there. A 4:5 or 3:4 post loses very little; a square or a landscape loses more at the sides. Keep the subject near the centre if the grid matters to you."
  - q: "Is my photo uploaded?"
    a: "No. The photo is opened, cropped and saved inside this browser tab, and nothing is sent to a server. The saved file also leaves out EXIF data such as GPS location, so the copy you post carries only the pixels you kept."
ui:
  crop.drop.hint: "JPG, PNG, WebP or AVIF. The box opens at 4:5; nothing is uploaded."
---

## Instagram feed shapes

A feed post can be any shape from 1.91:1 landscape to 3:4 portrait, and Instagram crops anything outside that range when you post it. Cropping first lets you decide what is left out. The ratios on this page that fit a feed post, with their size at 1080 px wide:

- 4:5 portrait, 1080 × 1350 px. The page opens with it.
- 3:4 portrait, 1080 × 1440 px, the tallest a feed post keeps.
- 1:1 square, 1080 × 1080 px.
- 3:2 and 16:9 for landscape photos, 1080 × 720 and about 1080 × 608 px.

For a profile picture or a square post, [Crop to a square](/crop-image-square/) opens at 1:1. For Stories and Reels, which fill the whole phone screen, use [Crop to 9:16](/crop-image-9-16/).

## From a phone photo to a post

An upright phone photo is already 3:4, so you can post it as it is or trim it to 4:5, which takes a thin strip off the top and bottom. A landscape phone photo cropped to 4:5 keeps 60% of its width, so drag the box sideways until the subject sits where you want it. iPhone photos saved as HEIC need converting first: [HEIC to JPG](/heic-to-jpg/) does it in the browser too.

The crop keeps every pixel of the area you choose, so a phone photo comes out much wider than 1080 px. Instagram scales it down when you post. To do that yourself and know the exact size of the file, open the crop in [Resize images for Instagram](/resize-image-for-instagram/), which sets the width to 1080 px.

## How it works

Your photo is decoded in a background worker inside this tab, and the crop is cut from the full-resolution pixels, not from the smaller preview. Phone photos are turned upright first, using the orientation saved with them, so the crop matches what you see. The result is saved as JPG, PNG, WebP or AVIF without the original's EXIF data. Nothing is sent over the network. For every ratio and the free box, use [Crop an image](/crop-image/).
