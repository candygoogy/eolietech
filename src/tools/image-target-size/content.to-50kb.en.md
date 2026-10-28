---
title: "Reduce a photo to 50 KB | Eolietech"
description: "Compress an application photo or an ID scan to under 50 KB for an online form. JPG or WebP, up to 50 at a time, done in your browser so nothing is uploaded."
h1: "Compress an image to 50 KB"
intro: "Many online applications cap the photo or the scan of your ID at 50 KB. Add your files here and each one comes back under 50,000 bytes at the best quality that fits, compressed on your device so your documents are never uploaded."
howTo:
  - "Crop the scan to the edges of the document, or the photo to the frame the form asks for. The table or the wall around it only takes up space."
  - "Choose the files or drop them on the box above. The front and back of an ID, or a whole set of documents, can go in together, up to 50 at a time."
  - "The size is already set to 50 KB and the format to JPG. Change either one if the form asks for something else."
  - "Download the files one by one or as a .zip, then open each one and zoom in on the small print before you upload it."
faq:
  - q: "How many pixels fit in 50 KB?"
    a: "For a typical phone photo, roughly 800 to 1,000 px on the longest side, enough to fill a good part of a laptop screen. Photos with a plain background keep more pixels than busy ones, so two photos of the same weight can end up at different sizes. Each row shows the size you got."
  - q: "Will the text on an ID or a certificate stay readable?"
    a: "On a card-sized document such as an ID, usually yes, especially if the scan is cropped to the card. A full A4 page of small print is harder, because the whole page has to fit in the same 50 KB as a single photo. Zoom in on the result before you upload it, and if the small print is blurred, check whether the form accepts a PDF or a larger file."
  - q: "My computer says the file is 48.8 KB. Is something wrong?"
    a: "No. The tool counts 1 KB as 1,000 bytes and keeps the file under 50,000 bytes. Windows counts 1 KB as 1,024 bytes, so the same file shows there as about 48.8 KB. Either way it is under the limit."
  - q: "Should I choose JPG or WebP?"
    a: "JPG, unless the form clearly lists WebP. At the same weight a WebP file usually keeps a little more detail, but many application forms only accept JPG or JPEG, and some also take PNG. PNG cannot hold a photo in 50 KB without losing most of its pixels, so this tool saves JPG or WebP only."
  - q: "Are my documents uploaded?"
    a: "No. The scans are decoded and compressed in this browser tab, and the files you download carry no EXIF data such as the location or the device that took the picture."
ui:
  img.zipName: "images-50kb.zip"
---

## What fits in 50 KB

50 KB is a common ceiling for photos and scans attached to online applications. It is enough for a recognisable portrait or a readable card, as long as the image is not much bigger in pixels than it needs to be. A photo straight from a phone weighs 3 MB or more, so it has to lose both quality and pixels to get there.

The tool keeps the full pixel size if the file fits at a quality between 40 and 92, and picks the highest quality that fits. When that is not possible it scales the image down to the largest size that fits at quality 40. Each row shows the final weight, the size in pixels and the quality, so you can see what changed.

## Getting a scan ready

The best scans for a 50 KB limit are flat, evenly lit and cropped to the document. Shadows, a coloured table and a tilted page all cost bytes without adding anything the person checking your application needs. [Crop image](/crop-image/) trims the edges in your browser, and if the form asks for a PDF instead of a picture, [JPG to PDF](/jpg-to-pdf/) can turn the compressed files into one. Check the weight of the PDF before you upload it.

## How it works

The compression runs in a background worker inside this tab, with MozJPEG for JPG and libwebp for WebP, so your ID never travels over the network. For signatures and small passport-style photos, [Compress an image to 20 KB](/compress-image-to-20kb/) starts at the lower limit. For any other number, use [Compress an image to a size in KB](/compress-image-to-kb/).
