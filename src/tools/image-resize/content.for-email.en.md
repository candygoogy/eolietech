---
title: "Resize photos for email attachments | Eolietech"
description: "Shrink phone photos to 1600 px JPGs so a whole set fits in one email. Up to 50 at a time, resized in your browser, so your photos are never uploaded."
h1: "Resize images for email"
intro: "Photos straight from a phone often weigh 3 to 12 MB each, so a handful can push an email past its limit. This page turns them into 1600 px JPGs that still look sharp on any screen, without uploading them anywhere."
howTo:
  - "Choose the photos you want to send, or drop them on the box above. You can add up to 50 at a time."
  - "The size is already set: each photo fits inside 1600 × 1600 px, so its longest side becomes 1600 px whether it is upright or sideways."
  - "The format is already JPG at quality 85. If the total is still too big for your email, lower the quality to 75 or the size to 1280 px."
  - "Check the total size in the summary, then download the photos one by one or use Download all to get a .zip you can attach."
faq:
  - q: "How big can an email attachment be?"
    a: "It depends on the provider. Gmail and Outlook.com both allow up to 25 MB per message, and on a work or school account the limit can be different. Attachments also grow by about a third when they are encoded for sending, and the recipient's mail server may have a lower limit than yours, so staying well under the limit is safer."
  - q: "Is 1600 px enough?"
    a: "For looking at photos on a screen, yes. An email window on a laptop is narrower than that, and a phone shows the photo smaller still. It is also enough for a standard 10 × 15 cm print. If someone needs the full resolution to edit or print large, share the originals through a cloud link instead."
  - q: "Why JPG?"
    a: "Every mail app on every phone and computer shows JPG photos inline. A photo saved as PNG is several times larger, and some mail apps do not preview WebP or AVIF. If an image has a transparent background, the transparent parts become white."
  - q: "Can I resize iPhone HEIC photos here?"
    a: "Not directly: this page reads JPG, PNG, WebP and AVIF. Convert the HEIC files with the HEIC to JPG converter on this site first, then resize the JPGs here."
  - q: "Are my photos uploaded?"
    a: "No. The resizing and the JPG encoding run in this browser tab, and your photos never leave your device. The only time they travel is when you attach them to your email."
ui:
  img.drop.hint: "JPG, PNG, WebP or AVIF photos. Resized on your device; nothing is uploaded."
  img.zipName: "photos-for-email.zip"
---

## Why phone photos are too big for email

A recent phone saves photos at 4000 pixels wide or more, and each one usually weighs between 3 and 12 MB. Three or four large ones are enough to fill a 25 MB limit. Gmail switches to a Google Drive link when you go over, and with other providers the message fails to send or bounces back.

Most of those pixels are never seen in an email. The message is read in a window much narrower than the photo, so the extra detail costs space and adds nothing.

## What happens to your photos

Each photo is scaled down to fit inside 1600 × 1600 px, keeping its proportions, and saved as a JPG at quality 85. A photo of that size usually weighs a few hundred kilobytes, so twenty of them can fit in one email. The list shows the exact size of every photo and the total, so you can check before you attach them.

Photos already smaller than 1600 px keep their size. Location and camera details (EXIF data) are removed, so a photo taken at home does not tell the recipient where you live.

## How it works

Your browser resizes each photo with the Lanczos3 filter and saves it with MozJPEG, in a background worker inside this tab. Nothing is sent over the network, so you can use it for photos you would rather not hand to a website. If you need files of a different size, the [image resizer](/resize-image/) has every option, and [Compress images](/compress-image/) makes files lighter without changing their size in pixels.
