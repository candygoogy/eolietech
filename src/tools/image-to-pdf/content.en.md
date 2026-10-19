---
title: "Convert JPG to PDF in your browser | Eolietech"
description: "Put photos, scans and screenshots into one PDF, one image per page, in the order you choose. JPG and PNG go in without re-compression. Nothing is uploaded."
h1: "JPG to PDF"
intro: "Turn photos, scans and screenshots into a single PDF. Add your images, put them in order, pick a page size and download the file. It all happens on your device: your pictures are never uploaded."
howTo:
  - "Choose your images or drop them on the box above. JPG, PNG, WebP, AVIF and HEIC all work, and you can add more at any time."
  - "Put them in order: drag them with the mouse, or use the Move up and Move down buttons. Each image becomes one page, from top to bottom."
  - "Pick a page size. Fit to image makes every page the size of its picture; A4 and Letter give you paper pages, with an optional small margin."
  - "Press Create PDF, then download the file and check it in your usual PDF reader."
faq:
  - q: "Are my images uploaded anywhere?"
    a: "No. The PDF is built in your browser with the open-source pdf-lib library, in a background worker on your own device. Your images are read from your disk and the PDF is saved back to it. You can disconnect from the internet once the page has loaded and the tool still works."
  - q: "Will my images lose quality?"
    a: "Not if they are JPG or PNG. A JPG's image data goes into the PDF exactly as your camera or scanner saved it (only hidden notes like the location are left out), and a PNG stays lossless. WebP, AVIF and HEIC have no direct place in a PDF, so they are converted once: photos to a high-quality JPG (quality 92), transparent or lossless images to PNG."
  - q: "Will my phone photos come out sideways?"
    a: "No. Phones often store a photo sideways and add a note saying which way to turn it. PDF readers ignore that note, which is why some converters give you sideways pages. This tool reads the note and turns the image on the page instead, without touching its pixels."
  - q: "Which page size should I pick?"
    a: "Fit to image is best for reading on screen: each page is exactly as big as its picture, with no white border. For printing or for forms that expect paper pages, pick A4 (used in most of the world) or Letter (US and Canada). On paper sizes every page turns to match its image: landscape for wide pictures, portrait for tall ones."
  - q: "Is there a limit on the number or size of images?"
    a: "You can add up to 50 images of up to 100 MB each. In practice your device's memory sets the pace: dozens of large photos can take a while on a phone. The PDF ends up about as large as the images you put in."
ui:
  topdf.drop: "Choose images or drop them here"
  topdf.drop.hint: "JPG, PNG, WebP, AVIF or HEIC. Made into a PDF on your device; nothing is uploaded."
  topdf.option.pageSize: "Page size"
  topdf.option.fit: "Fit to image"
  topdf.option.letter: "Letter"
  topdf.option.margin: "Margin"
  topdf.option.marginNone: "None"
  topdf.option.marginSmall: "Small (12.7 mm, half an inch)"
  topdf.option.noteFit: "Each page is the size of its image. Margins apply to A4 and Letter pages."
  topdf.option.notePaper: "Each image is scaled to fit its page and centred. Wide images get a landscape page."
  topdf.listLabel: "Images, in page order"
  topdf.orderHint: "Each image becomes one page, from top to bottom. Drag images to reorder them, or use the Move buttons."
  topdf.progress: "Progress"
  topdf.action: "Create PDF"
  topdf.added.one: "Added {count} image."
  topdf.added.other: "Added {count} images."
  topdf.reading: "Reading…"
  topdf.moveUp: "Move up"
  topdf.moveDown: "Move down"
  topdf.moveUpLabel: "Move {name} up"
  topdf.moveDownLabel: "Move {name} down"
  topdf.removeLabel: "Remove {name}"
  topdf.moved: "{name} is now page {position} of {total}."
  topdf.removed: "Removed {name}."
  topdf.working: "Adding image {current} of {total}…"
  topdf.saving: "Saving the PDF…"
  topdf.done.one: "Done: a PDF with {pages} page ({size})."
  topdf.done.other: "Done: a PDF with {pages} pages ({size})."
  topdf.download.one: "Download PDF ({pages} page, {size})"
  topdf.download.other: "Download PDF ({pages} pages, {size})"
  topdf.outputName: "images.pdf"
  topdf.error.decode: "{name} could not be read as an image. It may be damaged, or not a JPG, PNG, WebP, AVIF or HEIC file."
  topdf.error.unsupported: "{name} cannot be opened in this browser. Try a current version of Chrome, Edge, Firefox or Safari."
  topdf.error.memory: "Your device ran out of memory on {name}. Try fewer or smaller images, or close other tabs."
  topdf.error.failed: "Something went wrong while making the PDF. Please try again."
  topdf.error.skipHint: "Press Create PDF again to make the PDF without it, or remove it from the list."
---

## How it works

Add your images and they appear as a list, in the order you picked them. That list is the page order of your PDF: the top image is page one. Drag images to rearrange them, or use the Move up and Move down buttons, which also work from the keyboard. When the order is right, press **Create PDF**. A background worker in your browser builds the file one image at a time, so the page stays responsive even with a long list.

If one image cannot be read, the tool tells you which one and leaves it out the next time you press Create PDF. Everything else stays in place.

## Page sizes and margins

- **Fit to image** (the default) makes each page exactly as big as its picture, one pixel per point. There is no white border, and a PDF reader shows the image filling the screen. Pages in one file can have different sizes, which is normal for a PDF.
- **A4** and **Letter** give you paper pages for printing, forms and applications. Each image is scaled to fit the page and centred, and the page turns to match: a wide photo gets a landscape page, a tall one a portrait page.
- **Margin** adds a small white border (12.7 mm, half an inch) around the image on A4 and Letter pages. Printers often cannot print right to the edge, so a margin keeps the whole picture on paper.

## Quality: what is kept as it is

A JPG's picture goes into the PDF unchanged: the same image data your camera, phone or scanner saved, with no second round of compression. Only the hidden notes around it are left out, such as the camera model and the place where a photo was taken, so the PDF does not share them. A PNG is stored lossless, so screenshots and scans of text stay crisp. This is why the PDF is usually about as large as the images you added, and why it looks the same as the originals.

WebP, AVIF and HEIC are not formats a PDF can hold, so those are converted once on your device: photos become a high-quality JPG, and images with transparency or lossless WebPs become PNG.

Phone photos are often stored sideways, with a note in the file saying how to turn them. This tool reads that note and turns the image on the page, so photos come out upright without re-compressing them.

## Your files stay on your device

Many online converters upload your photos to their servers and send a PDF back. Here, nothing is sent anywhere. Your images are read from your disk, the PDF is made in your browser's memory, and it is saved straight to your downloads. Once the page has loaded, you can even switch off your internet connection and it keeps working.

## Related tools

Need to add the result to other PDFs? [Merge PDF files](/merge-pdf/) puts several PDFs together, and [Organize PDF pages](/organize-pdf/) lets you rotate, reorder or delete pages afterwards. If the PDF is too large to email, try [Compress PDF](/compress-pdf/), or shrink the photos first with [Compress images](/compress-image/). To turn a PDF back into pictures, use [PDF to JPG](/pdf-to-jpg/). To clean the location out of photos you share as they are, use [Remove EXIF data](/remove-exif/).
