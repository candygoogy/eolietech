---
title: "Convert HEIC to PDF: iPhone photos in one PDF | Eolietech"
description: "Turn HEIC photos from your iPhone or iPad into one PDF, one photo per page, the right way up. Made in your browser, so your photos are never uploaded."
h1: "HEIC to PDF"
intro: "Put iPhone and iPad photos straight into a PDF, without converting them to JPG first. Add the HEIC files, set the order, pick a page size and download one PDF. Your photos stay on your device the whole time."
howTo:
  - "Choose your .heic or .heif photos, or drop them on the box above. JPG, PNG, WebP and AVIF can go in the same PDF."
  - "Put them in order by dragging, or with the Move up and Move down buttons. The top photo is page one."
  - "Keep Fit to image for full-size photo pages, or pick A4 or Letter for a PDF you will print or attach to a form."
  - "Press Create PDF and download the file."
faq:
  - q: "Why can't I just put HEIC files in a PDF?"
    a: "PDF has no place for HEIC images, and many PDF tools cannot read them at all. This tool decodes each photo in your browser and stores it in the PDF as a high-quality JPG (quality 92), which every PDF reader can show."
  - q: "Will my photos lose quality?"
    a: "Each photo is converted once, at quality 92, which keeps it very close to the original; most people cannot see a difference even when zoomed in. Photos with transparency are stored as lossless PNG instead."
  - q: "Will the photos be the right way up?"
    a: "Yes. The rotation your iPhone saved with each photo is applied while decoding, so portrait shots stay portrait and nothing comes out sideways."
  - q: "Are my photos uploaded?"
    a: "No. The HEIC decoder (libheif, compiled to WebAssembly) and the PDF library run inside this browser tab. Your photos are read from your disk, and the PDF is saved straight back to it."
ui:
  topdf.drop: "Choose photos or drop them here"
  topdf.drop.hint: "HEIC photos or other images. Made into a PDF on your device; nothing is uploaded."
  topdf.outputName: "photos.pdf"
---

## iPhone photos to PDF in one step

Since iOS 11, iPhones save photos as HEIC by default. That is great for storage, but awkward when a school, an employer or an office asks for a single PDF: many PDF tools refuse HEIC, and converting every photo to JPG first means an extra round of files to manage. Here you add the HEIC files directly and get one PDF back.

## What happens to each photo

Your browser decodes each HEIC photo with libheif, the open-source HEIF library, and stores it in the PDF as a JPG at quality 92. At that setting the difference from the original is very hard to spot, even on a big screen. The rotation saved by the camera is applied, so every page comes out upright. Live Photos contribute their still image only.

If you want the photos themselves as JPGs, to share or edit, use [HEIC to JPG](/heic-to-jpg/) instead.

## Page size

**Fit to image** makes each page the size of its photo, which is ideal for viewing on a phone or computer. For printing, or for forms that expect paper pages, choose **A4** or **Letter**: each photo is scaled to fit and centred, landscape shots get landscape pages, and the small margin keeps the photo clear of the printer's edge.

## Your photos stay on your device

Nothing is uploaded at any point. That matters for photos of documents, IDs and receipts, which are often exactly what ends up in a PDF. If the PDF turns out too large to email, [Compress PDF](/compress-pdf/) can shrink it, also without uploading.
