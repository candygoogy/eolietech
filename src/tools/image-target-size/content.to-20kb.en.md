---
title: "Compress an image to 20 KB | Eolietech"
description: "Get a scanned signature or a passport-style photo under 20 KB for an online form. JPG or WebP, up to 50 at a time, compressed in your browser, never uploaded."
h1: "Compress an image to 20 KB"
intro: "Government, exam and application forms sometimes ask for a scanned signature or a passport-style photo of 20 KB or less. Add yours here and get a file under 20,000 bytes at the best quality that size allows, without sending your signature or your face to any server."
howTo:
  - "If the photo or the signature scan has a lot of empty background, crop it first with the crop tool on this site. Every pixel you remove leaves more of the 20 KB for the parts that matter."
  - "Choose the files or drop them on the box above. The size is already set to 20 KB; type a different number if your form gives another limit."
  - "Leave the format on JPG. Forms that ask for files this small usually expect a JPG."
  - "Check both the file size and the size in pixels on each row, then download the files one by one or as a .zip."
faq:
  - q: "How big will a 20 KB photo be in pixels?"
    a: "It depends on how much detail the photo has. A typical phone photo usually comes out at a few hundred pixels on its longest side, somewhere around 400 to 600 px. A head-and-shoulders portrait on a plain background compresses better and can stay larger. The exact size is shown on each row."
  - q: "Will a signature stay readable at 20 KB?"
    a: "Usually yes. Dark ink on white paper is mostly flat areas, which compress very well, so a signature scan keeps far more pixels than a photo of the same weight. Sign with a dark pen on plain white paper, scan or photograph it in even light and crop close to the ink. If you start from a PNG with a transparent background, the transparent parts become white in the JPG."
  - q: "My form also asks for a minimum size. Will the file be too small?"
    a: "A photo that has to be compressed usually lands a little under 20 KB, so a minimum such as 10 KB is rarely a problem. A small image that already fits at the highest quality the tool uses can come out lighter, and a JPG that is already under 20 KB is kept as it is. Check the size on the row against the form's rules before you upload."
  - q: "Does 20 KB mean 20,000 or 20,480 bytes?"
    a: "The file is kept under 20,000 bytes, so it fits forms that count either way."
  - q: "Are my files uploaded?"
    a: "No. The compression runs in this browser tab and your signature and photos never leave your device. The files you download also carry no EXIF data, such as the GPS location of the phone that took the picture."
ui:
  img.zipName: "images-20kb.zip"
---

## Why a 20 KB photo has to be small

A 20 KB file holds 20,000 bytes. A photo from a 12 megapixel phone camera has 12 million pixels, which would leave one byte for every 600 pixels. No image format can keep a sharp photo with so little, so the photo has to lose pixels as well as quality.

The tool keeps the full pixel size only if the photo fits at some quality between 40 and 92. When even 40 is too heavy, which is almost always the case for a phone photo at 20 KB, it scales the photo down to the largest size that fits. The result is a clean, small photo, sharp enough for an ID card or a form preview. It is not meant to be printed or zoomed into, and nothing can bring the lost detail back, so keep the original.

## Signatures and passport-style photos

Forms that ask for 20 KB often have other rules too, such as a white background, a size in pixels or a width-to-height ratio. This tool only controls the weight of the file. If the form gives exact dimensions, crop and resize first with [Crop image](/crop-image/) and the [image resizer](/resize-image/), then compress the result here. When the photo already fits at quality 40 or higher, its pixel size is left as it is.

Cropping helps even when the form does not ask for it. A face that fills the frame, or a signature cropped close to the ink, gives the 20 KB to the detail that will be checked.

## How it works

Your browser does the work in a background worker inside this tab, with MozJPEG for JPG and libwebp for WebP. No file goes over the network. For other limits, [Compress an image to 50 KB](/compress-image-to-50kb/) suits application photos and document scans, and [Compress an image to a size in KB](/compress-image-to-kb/) takes any number you type.
