---
title: "Convert HEIC to JPG in your browser | Eolietech"
description: "Turn iPhone HEIC and HEIF photos into JPG files that open everywhere. Batch convert in your browser; your photos are never uploaded."
h1: "HEIC to JPG converter"
intro: "Convert iPhone and iPad photos from HEIC to JPG so they open on Windows, in older apps and on any website. The conversion happens on your device, so your photos are never uploaded."
howTo:
  - "Choose your .heic or .heif photos, or drop them on the box above. You can convert up to 50 at a time."
  - "Leave the format on JPG, or pick PNG if you need a lossless copy."
  - "Set the JPG quality. 85 keeps photos looking like the original while saving space."
  - "Download each JPG, or use Download all to get a .zip with every converted photo."
faq:
  - q: "Why are my iPhone photos HEIC files?"
    a: "Since iOS 11, iPhones save photos in HEIC (High Efficiency Image Container) by default because it takes about half the space of a JPG. Apple devices open it natively, but many Windows apps, older programs and upload forms do not accept it."
  - q: "Are my photos uploaded to a server?"
    a: "No. The HEIC decoder (libheif, compiled to WebAssembly) and the JPG encoder run inside this browser tab. Your photos are read from your disk and the results are saved back to it; nothing is sent over the network."
  - q: "Will I lose quality converting HEIC to JPG?"
    a: "JPG is a lossy format, so there is a small loss each time you save one. At quality 85 or above it is very hard to see. If you need an exact copy of the pixels, choose PNG instead, but expect files several times larger."
  - q: "Does the JPG keep the photo's location and camera details?"
    a: "No. The converted file contains only the image, without EXIF data such as GPS location, date taken or camera model. That is handy before sharing photos publicly, but it also means photo apps will not sort the JPGs by the original capture date."
  - q: "What about Live Photos and burst shots?"
    a: "The tool converts the main still image of each file. The video part of a Live Photo is a separate .mov file and is not included. If a HEIC file contains several images, only the primary one is converted."
ui:
  img.drop.hint: "HEIC or HEIF photos. Converted on your device; nothing is uploaded."
  img.option.format: "Output format"
  img.option.quality: "JPG quality"
  img.option.qualityNote: "Higher keeps more detail; 85 is a good balance for photos."
  img.option.qualityPng: "PNG is lossless, so quality does not apply."
  img.progress: "Progress"
  img.list: "Your photos"
  img.privacy: "Your photos are converted in this browser tab and are never uploaded."
  img.zipName: "converted-photos.zip"
  img.status.pending: "Waiting ({size})"
  img.status.working: "Converting ({size})…"
  img.status.smaller: "{before} → {after}, {percent}% smaller"
  img.status.larger: "{before} → {after}, {percent}% larger"
  img.status.same: "{before} → {after}, same size"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "The new file is not smaller than the original, so keeping the original is better"
  img.status.flattened: "Transparent areas were filled with white, because JPG has no transparency"
  img.error.decode: "this photo could not be read. It may be damaged or use a HEIF variant this tool cannot decode."
  img.error.unsupported: "this does not look like a HEIC or HEIF photo, or your browser is too old to convert it here."
  img.error.memory: "there was not enough memory to convert this photo. Try fewer files at once."
  img.downloadNamed: "Download {name}"
  img.downloadOriginal: "Download original"
  img.downloadOriginalNamed: "Download the original {name}"
  img.downloadNew: "Download new file anyway"
  img.downloadNewNamed: "Download the new {name} anyway"
  img.removeNamed: "Remove {name}"
  img.summary.working: "Converting: {done} of {total} photos done."
  img.summary.done: "Done: {done} of {total} photos converted."
  img.summary.sizes: "Total size {before} → {after}."
  img.summary.failed: "{failed} could not be converted."
---

## When you need a JPG instead of a HEIC

HEIC is an efficient format, but support outside Apple's ecosystem is patchy. Windows needs an extra codec from the Microsoft Store to open it, many websites and government forms only accept JPG or PNG, and older photo editors refuse the file entirely. Converting to JPG gives you a file that opens on practically any device and in any app.

If you only have a few photos and an iPhone at hand, you can also set **Settings → Camera → Formats → Most Compatible** so future photos are saved as JPG. That does not convert the photos you already have, which is where this tool helps.

## Size and quality

Expect the JPG to be larger than the HEIC it came from, often 1.5 to 2 times larger at quality 85. That is the price of compatibility: HEIC uses a newer, more efficient compression method. Lowering the quality to 75 brings the size closer to the original with little visible difference on a phone or laptop screen. PNG keeps every pixel exactly but produces much bigger files, so use it only when you plan to edit the image further.

## How it works

Your browser reads each file, decodes it with libheif (the open-source HEIF library, compiled to WebAssembly) and encodes the result with MozJPEG, all in background workers so the page stays usable. Photos are turned upright using the orientation stored in the file. The conversion runs in current versions of Chrome, Edge, Firefox and Safari. Because everything happens locally, a large batch depends on your device's speed and memory: a recent laptop typically handles a 12-megapixel photo in a second or two.
