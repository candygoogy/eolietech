---
title: "Convert HEIC to PNG, lossless and private | Eolietech"
description: "Convert iPhone HEIC photos to lossless PNG for editing, pictures of text and apps that reject HEIC. Batch conversion in your browser; nothing is uploaded."
h1: "HEIC to PNG converter"
intro: "Convert iPhone and iPad photos from HEIC to PNG when you need a lossless copy: to edit them, to keep text sharp, or to use them in an app that does not accept HEIC. Everything runs on your device, so your photos are never uploaded."
howTo:
  - "Choose your .heic or .heif photos, or drop them on the box above. You can add up to 50 at a time, each up to 100 MB."
  - "PNG is already selected as the output format. The quality slider is grayed out because PNG is lossless."
  - "Wait for each photo to finish. The list shows its size before and after and its dimensions in pixels."
  - "Download each PNG, or use Download all to get a .zip with every converted photo."
faq:
  - q: "Is converting HEIC to PNG lossless?"
    a: "The conversion is. The PNG holds exactly the pixels decoded from the HEIC, and saving it again in an editor will not degrade it. It cannot bring back detail that the HEIC compression removed when the photo was taken, but with the iPhone's settings that loss is very hard to see."
  - q: "Can I make the PNG files smaller?"
    a: "Only a little. Every file already goes through oxipng, a lossless optimizer, and PNG has no quality setting because it never discards detail, which is why the slider is disabled. For a much smaller file you need a lossy format: JPG for the widest compatibility, or WebP if the place you upload to accepts it. The PNG to WebP converter on this site can turn the PNGs into WebP."
  - q: "Should I choose PNG or JPG for my iPhone photos?"
    a: "For most photos, JPG. It opens everywhere and at quality 85 looks the same as the original on screen, at a fraction of the size of a PNG. Choose PNG when you plan to edit the image, when it shows text or fine lines, or when an app asks for PNG specifically."
  - q: "Does the PNG keep the date taken and the location?"
    a: "No. The PNG contains only the image, without the EXIF data stored in the HEIC: no GPS position, capture date or camera model. That makes the files safer to share, but photo apps may sort them by the date the PNG was created instead of the day you took the photo."
  - q: "Are my photos uploaded to a server?"
    a: "No. Decoding and encoding both happen inside this browser tab, so the photos never leave your device. It also means the speed depends on your device: a large batch takes longer on an older phone than on a recent laptop."
ui:
  img.drop.hint: "HEIC or HEIF photos, saved as lossless PNG on your device. Nothing is uploaded."
  img.zipName: "heic-to-png.zip"
---

## When PNG is the better choice

PNG is lossless. The pixels you get are the ones decoded from the HEIC, and they stay identical however many times you open and save the file. That makes it the right format in a few specific cases.

- **You are going to edit the photo.** Cropping, color correction, adding text or placing the photo in a design usually means saving it several times. A JPG loses a little detail on every save and a PNG does not, so you can work on the PNG and export a JPG once, at the end.
- **The picture is mostly text or sharp lines.** Photos of documents, whiteboards, slides and receipts saved as JPG often show faint smudges around the letters. PNG keeps the edges clean, which also helps if you later want to [extract the text](/image-to-text/).
- **An app asks for PNG.** Some design tools, presentation templates and upload forms accept PNG but not HEIC.

Screenshots taken on an iPhone are already saved as PNG, so they need no converting. HEIC files come from the Camera app, which has used the format by default since iOS 11.

## The trade-off is file size

A PNG of a photograph is large. HEIC and JPG discard detail the eye is unlikely to miss, while PNG stores every pixel, and camera photos are full of fine grain and texture that lossless compression cannot shrink much. A 12-megapixel iPhone photo that takes 1 to 3 MB as HEIC usually becomes a PNG of 15 MB or more. The list under the drop box shows the size before and after for each file, so you see this straight away.

If you only want to send photos to someone, post them online or open them on a Windows PC, [HEIC to JPG](/heic-to-jpg/) gives you much smaller files that look the same on screen. You can also switch the output format to JPG right here: the photos already in the list are converted again with the new setting.

## How the conversion works

Each photo is decoded in your browser by libheif, the open-source HEIF library compiled to WebAssembly. The pixels are then written as PNG and passed through oxipng, which makes PNG files smaller without changing a single pixel. The work runs in background workers so the page stays usable, and photos are turned upright using the orientation stored in the file. The PNGs are created in this tab and saved straight to your device; nothing is sent over the network. Conversion works in current versions of Chrome, Edge, Firefox and Safari.
