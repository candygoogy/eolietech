---
title: "Crop an image to a square | Eolietech"
description: "Crop a photo to a square for a profile picture, an avatar, a product shot or a square post. JPG, PNG, WebP and AVIF, cropped in your browser, never uploaded."
h1: "Crop to a square"
intro: "The box opens square and as big as your photo allows, so most of the time you only move it over the face or the product and save. The crop happens in your browser, and the photo stays on your device."
howTo:
  - "Choose a photo or drop it on the box above. JPG, PNG, WebP and AVIF all work, up to 100 MB."
  - "1:1 is already selected. Drag the square over the part you want, and pull a corner inwards for a tighter crop."
  - "For an exact size, type it in Width and the height follows. Keep the original format under Save as, or pick another one."
  - "Press Crop image, check the size in pixels, then download your square."
faq:
  - q: "How do I make a good profile picture?"
    a: "Many apps show profile pictures as a circle cut from the middle of the square, so the corners disappear. Keep the face in the centre, leave a little room above the head, and crop a bit looser than feels natural."
  - q: "What size should the square be?"
    a: "Sites shrink profile pictures themselves, so a square of a few hundred pixels is enough for an avatar. Instagram works with posts 1080 px wide, so 1080 × 1080 px suits a square post. If your crop is much bigger than you need, shrink it with the image resizer on this site."
  - q: "Why use square photos for products?"
    a: "Shop grids and marketplaces often show products as square tiles. When you upload a square, you choose what is in the frame, instead of leaving the site to cut the edges for you."
  - q: "Does the square keep the photo's location data?"
    a: "No. The cropped file contains only the image, without EXIF data such as GPS location or camera model. That matters for a profile picture, which anyone can see and save."
  - q: "Is my photo uploaded?"
    a: "No. Opening, cropping and saving all happen in this browser tab. The page downloads its encoders from this site once and never sends your photo anywhere."
ui:
  crop.drop.hint: "JPG, PNG, WebP or AVIF. The box opens square; nothing is uploaded."
---

## Profile pictures and avatars

A phone photo is usually a tall or wide rectangle, and most profile slots want a square. If you upload the rectangle as it is, the site picks the middle for you, which often cuts off the top of a head or leaves you off to one side. Cropping it yourself takes a few seconds and puts your face where you want it.

The square starts as large as the photo allows. Drag it over your face, then pull a corner inwards until the head and shoulders fill most of it. If the app shows a circle, keep anything important away from the corners.

## Product photos and square posts

A set of product photos looks tidier when every one is the same shape, and a square keeps the product centred in a grid. Crop each photo with a little space around the item so it doesn't touch the edges. For a square post, 1080 × 1080 px is a safe size: crop the square you want, then bring it down to 1080 px with [Resize images](/resize-image/).

You can switch to another ratio at any time with the buttons above the image. For every shape and option, use [Crop an image](/crop-image/).

## How it works

Your photo is decoded in a background worker inside this tab, and the square is cut from the full-resolution pixels, not from the smaller preview. Phone photos are turned upright first, using the orientation saved with them, so what you see is what you get. The result is saved as JPG, PNG, WebP or AVIF without any of the original's EXIF data. Nothing is sent over the network.
