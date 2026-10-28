---
title: "Redact an image or screenshot: black out text and faces | Eolietech"
description: "Black out names, account numbers, faces and number plates in a screenshot or photo, or blur and pixelate them. Runs in your browser, nothing is uploaded."
h1: "Redact an image"
intro: "Before you post a screenshot or send a photo, hide what other people shouldn't see: a name, an IBAN, an order number, a face, a number plate. Draw a box over each one, choose a black box, a blur or pixelation, and save a censored copy. The image never leaves your device."
howTo:
  - "Choose an image or drop it on the box above. JPG, PNG, WebP and AVIF work, one image at a time, up to 100 MB."
  - "Drag across the image to draw a box over each thing you want to hide. Drag a box to move it, pull its edges or corners to resize it, and press its × to remove it. From the keyboard, press Add a box and move it with the arrow keys."
  - "Black box is already selected, and it is the right choice for text and numbers. For faces you can switch to Blur or Pixelate and set the strength. The preview updates as you go."
  - "Press Save redacted image, then Download. Under Save as, keep the original format or pick JPG, PNG or WebP."
faq:
  - q: "Should I use a black box, blur or pixelation?"
    a: "For text and numbers, use Black box. Blur and pixelation keep a trace of what was there, and on text that trace can sometimes be partly reversed or matched by guessing, especially for short strings such as a number plate or the last digits of a card. A black box turns every pixel inside it solid black, so nothing of the original is left. Blur and pixelation suit faces and backgrounds, where you want the picture to still look natural."
  - q: "Can someone remove the black box from the saved image?"
    a: "No. The black is written into the pixels of the new file, and the pixels that were under the box are not stored anywhere in it. A JPG, PNG or WebP has no layers to peel back. Your original image stays as it was on your device, so make sure you share the redacted copy."
  - q: "Does the saved image keep the location and camera details?"
    a: "No. The new file holds only the pixels, without EXIF data such as GPS coordinates, the date or the phone model. Phone photos taken with location turned on usually record where they were taken, which matters for a picture of your home, your car or your street."
  - q: "Does saving make the image look worse?"
    a: "PNG keeps every pixel exactly, so it is the best choice for screenshots. JPG, WebP and AVIF compress the whole image again when you save, at quality 90 unless you change it, which keeps photos close to the original. The size in pixels stays the same."
  - q: "Is my image uploaded?"
    a: "No. The image is decoded, redacted and saved again inside this browser tab, on your device. The page downloads its image encoders from this site once and never sends your picture anywhere."
  - q: "Can I redact HEIC photos from an iPhone?"
    a: "Not directly. Convert them with HEIC to JPG on this site first, then open the JPG here."
ui:
  redact.drop.label: "Choose an image or drop it here"
  redact.drop.replace: "Choose another image"
  redact.drop.hint: "JPG, PNG, WebP or AVIF. Redacted on your device; nothing is uploaded."
  redact.opening: "Opening {name}…"
  redact.opened: "Opened {name}, {width} × {height} px. Drag across the image to draw a box over what you want to hide."
  redact.fileInfo: "{name} · {width} × {height} px · {size}"
  redact.previewAlt: "Preview of {name} with the boxes applied"
  redact.effect.legend: "Effect"
  redact.effect.black: "Black box"
  redact.effect.blur: "Blur"
  redact.effect.pixelate: "Pixelate"
  redact.strength: "Strength"
  redact.strength.note: "Grows with each box, so the same setting hides a large face and a small plate."
  redact.strength.noteBlack: "Black boxes cover everything under them, so there is no strength to set."
  redact.safe: "Blur and pixelation can sometimes be partly undone on text. For text and numbers, Black box is the safe choice."
  redact.add: "Add a box"
  redact.clear: "Remove all boxes"
  redact.count.none: "No boxes yet"
  redact.count.one: "{count} box"
  redact.count.other: "{count} boxes"
  redact.cleared.one: "Removed {count} box."
  redact.cleared.other: "Removed {count} boxes."
  redact.hint: "Drag across the image to draw a box, or press Add a box. Drag a box to move it, and drag its edges or corners to resize it."
  redact.box.label: "Box {box}"
  redact.box.state: "{width} × {height} px, {x} px from the left and {y} px from the top."
  redact.box.hint: "Arrow keys move the box, and Shift makes each step 10 px. Alt (Option on a Mac) and an arrow key resize it. Delete removes it."
  redact.box.remove: "Remove box {box}"
  redact.announce.added: "Box {box} added."
  redact.announce.box: "Box {box}: {state}"
  redact.announce.removed: "Box removed."
  redact.option.format: "Save as"
  redact.format.original: "Same as the original {format}"
  redact.option.quality: "Quality"
  redact.option.qualityNote: "Applies to JPG, WebP and AVIF. 90 keeps photos close to the original."
  redact.option.qualityPng: "PNG is lossless, so quality does not apply."
  redact.action: "Save redacted image"
  redact.working: "Redacting…"
  redact.progress: "Progress"
  redact.result: "Saved {width} × {height} px, {size}, without EXIF data."
  redact.flattened: "Transparent areas were filled with white, because JPG has no transparency."
  redact.downloadLabel: "Download {name}"
  redact.fileSuffix: "redacted"
  redact.error.noBoxes: "Draw at least one box over what you want to hide first."
  redact.error.decode: "{name} could not be read. It may be damaged, animated, or not really an image of this type."
  redact.error.unsupported: "{name} is a type of image this tool cannot open. Use JPG, PNG, WebP or AVIF."
  redact.error.memory: "There was not enough memory to work on {name}. Close other tabs, or try a smaller image."
  redact.error.failed: "Something went wrong while redacting {name}. Try again, or save it in another format."
  redact.error.heic: "{name} is a HEIC photo, which this tool can't open. Convert it first with"
  redact.error.heicLink: "HEIC to JPG"
  redact.error.heicHref: "/heic-to-jpg/"
---

## Screenshots with personal details

A screenshot of a chat, an order confirmation, a banking app or an error message often shows more than you meant to share: a full name, an email address, an order or tracking number, an IBAN, a phone number in a corner. Draw a black box over each one before you post it in a forum, a group chat or a support ticket.

Make each box a little bigger than the text it covers. A letter that peeks out at the top or bottom edge can be enough to guess a word. Screenshots are usually PNG files, and if you keep PNG under Save as, the rest of the screenshot stays exactly as sharp as before.

## Number plates, house numbers and photographed documents

Photos for a listing, such as a car for sale, a flat to rent or a bike on a marketplace, often show more than the item: a number plate, a house number, a street sign, the name on a doorbell. A black box over each takes a few seconds.

The same goes for a document you photograph with your phone to send as proof, such as an ID card, a payslip or a utility bill. Cover the numbers the other person doesn't need.

## Why a black box is the safe choice for text

Blur and pixelation mix the pixels of an area together, and some of the original survives in the mix. On a face that rarely matters. Text is different, because there are only so many letters and digits, and many numbers follow a known pattern. Someone can type likely strings in the same font, blur or pixelate them the same way and compare the result with your image. Depix, an open-source tool published in 2020, recovers pixelated text from screenshots this way in some cases.

A black box leaves nothing to compare. Every pixel inside it is set to solid black, transparent ones included. The same caution applies to a highlighter or marker stroke from a phone's photo editor: if the stroke is not fully opaque, raising the brightness can make the text underneath readable again.

## Location and other hidden data

A photo from a phone carries more than the picture: the date, the phone model and, when location is on, the GPS coordinates of where it was taken. The redacted copy is written fresh from the pixels and contains none of that. If you only want to remove that data and leave the picture untouched, use [Remove EXIF data](/remove-exif/).

## How it works

The image is decoded in a background worker inside this tab. Phone photos are turned upright first, using the orientation saved with them, so the boxes land where you drew them. The preview is a smaller copy of the image, and the effect on it comes from the same code that runs on the full-resolution pixels when you save. Each effect changes only the pixels inside its box.

One effect and one strength apply to every box in the image. To blur a face and black out a name in the same picture, save once with one effect, open the saved copy and redact it again with the other.

## Related tools

- For PDFs, [Redact PDF](/redact-pdf/) blacks out text and removes it from the file.
- If what you want to hide sits at an edge, cutting it off with [Crop an image](/crop-image/) can be cleaner than covering it.
- [Blur faces in a photo](/blur-faces-in-photo/) and [Pixelate an image](/pixelate-image/) open this tool with blur or pixelation already selected.
