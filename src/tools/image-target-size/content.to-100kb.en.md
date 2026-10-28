---
title: "Compress an image to 100 KB | Eolietech"
description: "Get a CV photo, a profile picture or any image under 100 KB for a job portal or an upload form. JPG or WebP, up to 50 at a time, never uploaded."
h1: "Compress an image to 100 KB"
intro: "Job portals, membership sites and profile pages often limit uploads to around 100 KB. Add your photos here and each one comes back under 100,000 bytes at the best quality that fits, compressed in your browser so nothing is uploaded."
howTo:
  - "Choose your photos or drop them on the box above. You can add up to 50 at a time, so a whole set of team headshots goes through in one go."
  - "The size is already set to 100 KB. Type another number if the site gives a different limit."
  - "Leave the format on JPG, which nearly every upload form takes, or pick WebP if the site lists it."
  - "Check the weight, the size in pixels and the quality on each row, then download the photos one by one or use Download all to get a .zip."
faq:
  - q: "Is 100 KB enough for a profile photo?"
    a: "Yes. Profile pictures and CV photos are usually shown at a few hundred pixels, and 100 KB usually leaves a typical phone photo at roughly 1,100 to 1,500 px on its longest side. A head-and-shoulders photo against a plain wall often keeps more."
  - q: "The site wants a square photo. Can I do that here?"
    a: "This page changes the weight and leaves the shape alone. Crop the photo with the square crop tool on this site first, then compress the square version here. Cropping also removes pixels, so the face keeps more detail inside the same 100 KB."
  - q: "Why did two photos from the same phone come out at different pixel sizes?"
    a: "Detail costs bytes. A portrait against a plain background compresses well and can keep more pixels, while a photo full of leaves, gravel or fabric texture needs more bytes for the same area and is scaled down further. Each photo is handled on its own, so each gets the largest size that fits."
  - q: "My photo is an iPhone HEIC. Can I use it?"
    a: "Not directly: this page reads JPG, PNG, WebP and AVIF. Convert the HEIC file with the HEIC to JPG converter on this site, then compress the JPG here."
  - q: "Does the photo I post still show where I live?"
    a: "No. The files you download carry no EXIF data, so the GPS location, the date and the phone model are gone. That matters for a photo that will sit on a public profile."
ui:
  img.zipName: "images-100kb.zip"
---

## What 100 KB is good for

100 KB is enough for a photo that looks clean on a profile page, an application form or a staff list. It is a common limit on sites that store many user photos and want to keep them light. A phone photo of 3 to 12 MB weighs 30 to 120 times more, so most of the saving comes from scaling it down to a size a screen actually shows.

If a photo already fits at a quality between 40 and 92, it keeps all its pixels and gets the highest quality that fits. If it does not, the tool scales it down to the largest size that fits. A JPG that already weighs less than 100 KB is not compressed again: only its metadata is removed.

## Before you compress

Crop first. A profile picture is usually shown as a square or a circle, and anything outside it is wasted weight. [Make a square crop](/crop-image-square/) to get the face centred, then bring the square photo back here. If a site asks for exact dimensions, such as 400 × 400 px, set them with the [image resizer](/resize-image/) before you compress.

## How it works

The photos are decoded, scaled and saved in a background worker inside this tab, with MozJPEG for JPG and libwebp for WebP. Nothing goes over the network. For a bigger allowance, [Compress an image to 200 KB](/compress-image-to-200kb/) keeps more pixels, and [Compress an image to a size in KB](/compress-image-to-kb/) takes any limit you type.
