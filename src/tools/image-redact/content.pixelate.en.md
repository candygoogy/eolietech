---
title: "Pixelate an image or a face, in your browser | Eolietech"
description: "Pixelate faces, people in the background or any part of a photo with large square blocks. Draw a box, set the block size and save a copy. Nothing is uploaded."
h1: "Pixelate an image"
intro: "Draw a box over a face or any part of a picture and it turns into large square blocks right away. Pixelation makes it plain that something was hidden on purpose, and it keeps the colours of the scene. The image never leaves your device."
howTo:
  - "Choose an image or drop it on the box above. JPG, PNG, WebP and AVIF work, up to 100 MB."
  - "Pixelate is already selected. Drag across each face or area to draw a box over it. You can draw as many boxes as you need."
  - "Set the strength: higher means fewer, bigger blocks. At the default of 7, each box is 7 blocks across its shorter side."
  - "Press Save redacted image, then Download. Under Save as, keep the original format or pick JPG, PNG or WebP."
faq:
  - q: "How big are the blocks?"
    a: "That depends on the box. The strength sets how many blocks fit across the box's shorter side: 32 at strength 1, 7 at the default of 7, and 4 at 10. A large face and a small one in the same photo get the same number of blocks, so both are hidden about as well."
  - q: "Can I pixelate the whole image?"
    a: "Yes. Drag from one corner of the image to the opposite one, or draw a box and pull its edges out to the sides. Even the finest setting gives 32 blocks across the shorter side, so the result is a coarse mosaic, closer to a censored picture than to pixel art."
  - q: "Can pixelation be reversed?"
    a: "On a face with a few large blocks there is little left to recover. Text is another matter. Each block keeps the average colour of the pixels under it, and someone can pixelate likely words the same way and compare, which has worked on screenshots of passwords. For text, numbers and number plates, use Black box."
  - q: "Should I pixelate or blur?"
    a: "At a high strength both hide a face well. Pixelation shows clearly that something was hidden, which suits a news-style photo or a screenshot. Blur blends into the picture, which suits family photos and backgrounds. Try both: changing the effect updates the preview at once, and the boxes stay where they are."
  - q: "Does the saved image keep its EXIF data?"
    a: "No. The new file holds only the pixels, so the GPS location, the date and the camera model of the original are not in it."
  - q: "Is my image uploaded?"
    a: "No. The image is pixelated and saved again inside this browser tab, on your device. Nothing is sent to a server."
ui:
  redact.opened: "Opened {name}, {width} × {height} px. Drag across the image to draw a box over what you want to pixelate."
---

## Pixelating a face

Draw the box from the hairline to the chin and a little wider than the cheeks. Each block takes the average colour of the pixels under it, so with a few large blocks the eyes, nose and mouth disappear and only the skin tone and hair colour remain. At the default strength a box is 7 blocks across its shorter side. If a face is still recognisable, go up to 9 or 10, which give 5 and 4 blocks.

The number of blocks follows each box, so a face close to the camera and one far behind it end up equally coarse. There is no automatic face detection: draw a box over every face you want hidden, and check the edges of the photo too.

## People, places and things

Pixelation works for anything you want to keep out of a picture without cropping it: a stranger walking past, the family photos on the wall behind you in a video call screenshot, the view from a window that shows which street you live on, the front of a neighbour's house in a photo of your own.

If what you are hiding has letters or numbers on it, such as a number plate, a house number or a name badge, cover that part with a black box instead. All the boxes in one save share the same effect, so pixelate first, save, then open the copy in [Redact an image](/redact-image/) and add the black boxes.

## Why pixelation is weak on text

Each block of pixelated text still holds the average colour of the letters under it. Someone who knows or guesses the font can pixelate likely words the same way and look for the version that matches. Depix, an open-source tool published in 2020, does this with pixelated passwords in screenshots, and short strings with a known format, such as plates or card numbers, are the easiest to guess. For text, Black box is the effect to use.

## What ends up in the saved file

The blocks start from the top-left corner of each box, and the last row and column are cut to fit it, so the pixelation never spills past the box. The preview runs the same code on a smaller copy, and the saved image is pixelated at full resolution and keeps its size in pixels. PNG, WebP and AVIF keep transparency; if you save as JPG, transparent areas are filled with white.

The new file has no EXIF data, so the GPS location of a phone photo is gone. To remove that data from photos you don't need to pixelate, use [Remove EXIF data](/remove-exif/). For documents in PDF, [Redact PDF](/redact-pdf/) blacks out text and removes it from the file. For a softer look on faces, try [Blur faces in a photo](/blur-faces-in-photo/).
