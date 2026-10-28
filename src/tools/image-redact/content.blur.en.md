---
title: "Blur faces in a photo, privately in your browser | Eolietech"
description: "Blur children's faces, people in the background or anyone who doesn't want to appear in your photo. Draw a box over each face and save a copy. Nothing is uploaded."
h1: "Blur faces in a photo"
intro: "Draw a box over each face you want to hide and it blurs right away in the preview. The blur is strong from the start and grows with the box, so a face close to the camera and one far in the background end up about as hard to recognise. The photo stays on your device."
howTo:
  - "Choose a photo or drop it on the box above. JPG, PNG, WebP and AVIF work, up to 100 MB. iPhone photos in HEIC need converting to JPG first."
  - "Blur is already selected. Drag across each face to draw a box over it, from the top of the hair to the chin. Nothing finds the faces for you, so look over the whole photo."
  - "If a face can still be recognised in the preview, raise the strength. The same setting applies to every box."
  - "Press Save redacted image, then Download. The copy keeps the photo's full size in pixels and has no location data."
faq:
  - q: "Does it find the faces automatically?"
    a: "No. You draw a box over each face yourself, with a mouse, a finger or the keyboard. It takes a few seconds per face, and you decide exactly what is hidden, including faces in profile, in shadow or far in the background."
  - q: "How strong is the blur?"
    a: "It starts at 7 out of 10, which is meant to make a face unrecognisable at the size of its box. The blur grows with each box, so the setting works the same on a close-up and on a small face in a crowd. If you can still tell who it is in the preview, raise it. At 10 a face becomes a soft patch of colour."
  - q: "Can a blurred face be un-blurred?"
    a: "A strong blur over a whole face leaves little to work with, though nobody can promise it is impossible, and people who know the person may still recognise the hair, the clothes or the place. Text is easier to recover, because there are only so many letters and digits to try. For a name tag, a number plate or a house number in the same photo, use Black box."
  - q: "Can I blur faces and black out text in the same photo?"
    a: "Yes, in two rounds. All the boxes in one save use the same effect, so blur the faces and save first. Then open the saved copy here, switch to Black box, cover the text and save again."
  - q: "Does the saved photo keep its location?"
    a: "No. The new file holds only the pixels, without EXIF data, so the GPS coordinates, the date and the phone model are gone. For photos of children at home or at school, that matters as much as the faces."
  - q: "Is my photo uploaded?"
    a: "No. The blur is calculated inside this browser tab, on your device, and the new file is saved from there. Nothing is sent to a server."
ui:
  redact.opened: "Opened {name}, {width} × {height} px. Drag across each face to draw a box and blur it."
---

## Children's faces before you share a photo

Pictures from school plays, birthday parties and sports days end up in class chats and on social media, and group photos often include children whose parents never agreed to it. Blur the faces you don't have permission to show and the rest of the picture can still be shared. Draw each box a little larger than the face, so the hair and ears are covered as well.

## People in the background

A holiday photo with strangers at the next table, a street scene, a picture of your new kitchen with the builder in it, a team photo where one colleague asked not to appear. One box per face is enough, and the blur touches nothing outside the boxes. You can blur any other part of an image the same way, such as a cluttered desk or the room behind someone.

## Getting a blur that hides the face

- Draw generous boxes. The blur works only inside the box, so an ear, a hairline or a chin left outside stays sharp, and that can be enough for someone who knows the person.
- Check every face. There is no automatic face detection here. Look over the whole photo, including the edges and reflections in windows and mirrors, and draw a box on each face you want hidden.
- Raise the strength if you need to. It starts at 7 out of 10. If you can still tell who someone is in the preview, go higher.
- Think about what else identifies a person. A blurred face doesn't hide clothes, a distinctive hairstyle, a tattoo or the place. If those give someone away, put a box on them too, or cut them out with [Crop an image](/crop-image/).
- Use a black box for text. A name on a shirt, a badge or a school logo with letters is safer under a black box, because blurred text can sometimes be partly reconstructed. Every box in one save shares the same effect, so blur the faces, save, then open the copy in [Redact an image](/redact-image/) and add the black boxes.

## How the blur works

Each box is blurred on its own, from the pixels inside it only, so colours from around the face don't bleed in and nothing outside the box changes. The blur radius is a share of the box's shorter side: about a ninth at the default strength and a quarter at 10. That is why one setting hides a large face in the front row and a small one at the back. The preview shows the result on a smaller copy of the photo, and when you save, the same calculation runs on the full-resolution pixels.

The saved photo is a new file without EXIF data, so the GPS location, the date and the phone model are gone too. For photos you share without blurring anything, [Remove the location from a photo](/remove-location-from-photo/) takes out only the GPS coordinates, and [Remove EXIF data](/remove-exif/) removes all of it. To hide something in a PDF, such as a signature or the photo on a scanned ID, use [Redact PDF](/redact-pdf/).
