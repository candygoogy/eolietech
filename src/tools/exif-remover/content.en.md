---
title: "Remove EXIF data from photos, location included | Eolietech"
description: "See what your photos reveal, like the GPS location where they were taken, then remove it without touching the picture. JPG, PNG and WebP, all in your browser."
h1: "Remove EXIF data"
intro: "Photos carry hidden details: often the exact spot where they were taken, the phone that took them and the time. Drop yours here to see what each one says, then remove it. The picture itself is not touched, and nothing is uploaded."
howTo:
  - "Choose your photos or drop them on the box above. You can add up to 50 JPG, PNG or WebP files at a time."
  - "Read what each photo reveals: its location, camera, date, the software that edited it and how many other tags it carries."
  - "Leave Everything selected, or pick Location only if you want to keep the camera and date."
  - "Press Remove, then download the clean photos one by one or use Download all to get a .zip. They keep their names."
faq:
  - q: "Are my photos uploaded?"
    a: "No. This page reads and rewrites the files inside your browser tab. They never go over the network, which you can check in your browser's developer tools while you use it."
  - q: "Does removing the metadata lower the quality?"
    a: "No. The tool cuts the metadata out of the file and copies the image data byte for byte, without decoding or saving the picture again. The photo is exactly the same; the file is just a little smaller."
  - q: "Why does my cleaned photo still have a tiny EXIF block?"
    a: "When a photo was taken with the phone held sideways, the camera stores a rotation flag instead of turning the pixels. If we removed it, the photo would open on its side. So in that case the clean file keeps one tag, the rotation, and nothing else. It says nothing about you or where you were."
  - q: "Don't Instagram and WhatsApp remove it anyway?"
    a: "Large social networks such as Facebook, Instagram and X are widely reported to strip the location from the photos other people see, though the company itself may still read it when you upload. Many other routes keep the file exactly as it is: email attachments, cloud share links, files sent as a document in WhatsApp or Telegram, and many forums and small websites. Cleaning the photo first means you do not have to know which is which."
  - q: "Can I clean iPhone HEIC photos here?"
    a: "Not directly: this tool reads JPG, PNG and WebP. Convert HEIC photos with the HEIC to JPG converter on this site instead. The JPG it makes contains only the picture, so the location and every other detail are already gone."
ui:
  exif.drop.hint: "JPG, PNG or WebP. Checked and cleaned on your device; nothing is uploaded."
  exif.mode.legend: "What to remove"
  exif.mode.all: "Everything"
  exif.mode.gps: "Location only"
  exif.mode.allNote: "Location, camera, dates and every other tag. Only a needed rotation flag stays."
  exif.mode.gpsNote: "Only the GPS location. Camera, date and everything else stay as they are."
  exif.progress: "Progress"
  exif.list: "Your photos"
  exif.factsLabel: "What this photo reveals"
  exif.clean.one: "Remove metadata from {count} photo"
  exif.clean.other: "Remove metadata from {count} photos"
  exif.cleanGps.one: "Remove location from {count} photo"
  exif.cleanGps.other: "Remove location from {count} photos"
  exif.zipName: "photos-without-metadata.zip"
  exif.zipNameGps: "photos-without-location.zip"
  exif.fact.clean: "No metadata found. This photo is already clean."
  exif.fact.location: "Location: {lat}, {lon} (rounded here; the file may be more precise)"
  exif.fact.locationUnreadable: "Location: yes, but the coordinates could not be read"
  exif.fact.noLocation: "Location: none"
  exif.fact.camera: "Camera: {camera}"
  exif.fact.date: "Taken: {date}"
  exif.fact.software: "Software: {software}"
  exif.fact.other.one: "Plus {count} other tag"
  exif.fact.other.other: "Plus {count} other tags"
  exif.fact.unreadable: "An EXIF block that could not be read"
  exif.fact.blocks: "Also: {list}"
  exif.block.xmp: "XMP data"
  exif.block.iptc: "IPTC captions and credits"
  exif.block.comment: "a comment"
  exif.block.text: "text notes"
  exif.block.time: "a last-modified time"
  exif.block.thumbnail: "a small preview copy of the photo"
  exif.block.extra: "extra images stored with the photo"
  exif.block.app: "other app data"
  exif.status.reading: "Reading ({size})…"
  exif.status.ready: "{size}. Nothing changed yet."
  exif.status.done: "Metadata removed: {before} → {after}"
  exif.status.doneGps: "Location removed: {before} → {after}"
  exif.status.nothing: "Nothing to remove: {before} → {after}"
  exif.status.noLocation: "No location to remove: {before} → {after}"
  exif.status.keptOrientation: "Rotation flag kept, so it opens the right way up"
  exif.status.droppedUnreadable: "Its EXIF block could not be read, so all of it was removed to be safe"
  exif.error.decode: "this file could not be read. It may be damaged, or not really a JPG, PNG or WebP."
  exif.error.unsupported: "this format is not supported here. The tool cleans JPG, PNG and WebP."
  exif.error.heic: "HEIC photos are not supported here. Converting them to JPG drops all their metadata:"
  exif.error.heicLink: "HEIC to JPG"
  exif.error.heicHref: "/heic-to-jpg/"
  exif.error.avif: "AVIF images are not supported here. Converting them to JPG drops all their metadata:"
  exif.error.avifLink: "AVIF to JPG"
  exif.error.avifHref: "/avif-to-jpg/"
  exif.downloadNamed: "Download {name}"
  exif.removeFile: "Remove from list"
  exif.removeNamed: "Remove {name} from the list"
  exif.summary.reading.one: "Reading: {done} of {total} photo."
  exif.summary.reading.other: "Reading: {done} of {total} photos."
  exif.summary.checked.one: "{count} photo checked."
  exif.summary.checked.other: "{count} photos checked."
  exif.summary.located.one: "{count} shows where it was taken."
  exif.summary.located.other: "{count} show where they were taken."
  exif.summary.done.one: "Done: {count} clean photo ready."
  exif.summary.done.other: "Done: {count} clean photos ready."
  exif.summary.sizes: "Total size {before} → {after}."
  exif.summary.failed.one: "{count} could not be read."
  exif.summary.failed.other: "{count} could not be read."
---

## What EXIF data is

When a phone or camera saves a photo, it writes a block of details into the file next to the picture. This is EXIF data. It usually holds the make and model of the camera, the date and time, the exposure settings and, when location is turned on, the GPS coordinates of the spot where you stood. Editing apps add their own name, and sometimes XMP data with even more.

None of it shows on screen, but anyone who gets the original file can read it with a free app, or by opening the file's properties on a computer.

## What a photo can give away

The location is the one that matters most. A photo taken in your living room, your child's school or your car parked outside your house carries coordinates precise to a few metres. Post a few of those and a stranger can work out where you live and when you are usually there. The date and time tell them when, and the camera model and serial details can link photos from different accounts to the same person.

Large social networks such as Facebook, Instagram and X are widely reported to strip this from the copies other people see. Plenty of other routes keep the file exactly as it is: email attachments, cloud share links, files sent as a document in WhatsApp or Telegram, listings on many marketplaces and forums, and your own website. On an iPhone, the share sheet also has an Options link where you can leave the location out of one share.

## Everything, or the location only

**Everything** removes the location, camera, dates, software, XMP and IPTC data, comments, the small preview copy some cameras tuck inside, and any extra images stored with the photo, such as the HDR brightness map some recent phones add. Without that map, a photo can look a little flatter on an HDR screen, while it looks the same everywhere else.

**Location only** removes the GPS coordinates, from the EXIF data and from XMP, and keeps everything else, so your photo app still sorts the pictures by date and knows the camera. A place name that you or an app typed into a caption stays; choose Everything to remove that too. If you only ever need this, [Remove location from a photo](/remove-location-from-photo/) starts with it selected.

## The rotation flag

Phones often save a photo the way the sensor saw it and add a flag that says "turn this 90 degrees". Remove that flag and a portrait shot opens sideways. So when a photo has one, the cleaned file keeps a tiny EXIF block with that single tag and nothing else. It says nothing about you, the place or the device.

## Why the picture is not saved again

Many metadata removers open the photo and save a new copy. For a JPG that means compressing it again, which costs a little quality every time. This tool works on the file's own structure: it takes the metadata blocks out and copies the compressed image data byte for byte. The picture you download is identical to the one you had, and the file is a few kilobytes smaller.

It all happens in this browser tab. Your photos are read from your disk and the clean copies are saved back there; nothing goes over the network. iPhone photos in HEIC format are not read here, but [HEIC to JPG](/heic-to-jpg/) converts them into JPGs that carry no metadata at all. If you also want lighter files, [Compress images](/compress-image/) and [Resize images](/resize-image/) save new copies without EXIF data too.
