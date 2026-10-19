---
title: "Remove the location from a photo before you share it | Eolietech"
description: "See whether a photo shows where it was taken, then remove the GPS location and keep the date and camera. JPG, PNG and WebP, cleaned in your browser."
h1: "Remove location from a photo"
intro: "Most phone photos record the exact spot where they were taken. Check yours here and remove the location before you send or post them. The date, camera and picture stay as they are, and nothing is uploaded."
howTo:
  - "Choose the photos you want to share, or drop them on the box above. You can add up to 50 at a time."
  - "Look at the Location line under each photo. If it shows coordinates, anyone who gets the file can find that spot on a map."
  - "Location only is already selected. Press Remove to take the GPS coordinates out."
  - "Download the photos one by one or use Download all to get a .zip, then share those copies."
faq:
  - q: "How precise is the location in a photo?"
    a: "Usually a few metres, enough to point at one house on a street. The list rounds it to two decimals, about a kilometre, so you can see roughly where it is without the page showing the exact spot."
  - q: "Will my photos still sort by date?"
    a: "Yes. Location only removes the GPS coordinates and keeps everything else: the date and time, the camera, and the rotation, so your photo app still puts them in order and shows them the right way up."
  - q: "Does the location also hide anywhere else in the file?"
    a: "It can. Editing apps sometimes copy the coordinates into XMP data, and this page clears those too. A place name typed into a caption or keywords is plain text, so it stays. To remove that as well, switch to Everything, which removes all of the metadata."
  - q: "Are my photos uploaded?"
    a: "No. The photos are read and rewritten inside this browser tab, and the image data is copied byte for byte, so the picture is untouched and nothing goes over the network."
ui:
  exif.drop.hint: "JPG, PNG or WebP photos. Checked and cleaned on your device; nothing is uploaded."
---

## Why a photo knows where you were

When location is on, your phone writes the GPS coordinates into every photo it takes. They are not part of the picture, so you never see them, but they travel with the file. Send the original by email, a cloud link or as a document in a chat app, or upload it to a marketplace or a forum, and the person on the other end can open it on a map.

That is harmless for a view from a mountain. It is not harmless for a photo of your front door, your child's bedroom or the sofa you are selling, because it gives away your home address along with it.

## What this page removes, and what it keeps

It removes the GPS block from the photo's EXIF data and any GPS coordinates in its XMP data. Everything else stays: the date and time, the camera and its settings, and the rotation flag. The image itself is not opened or saved again; the compressed data is copied byte for byte, so the photo looks exactly the same and the file keeps its size.

If you would rather remove every detail, including the camera, the date and the name of the editing app, switch to Everything above or use the full [EXIF remover](/remove-exif/).

## Turning it off at the source

You can also stop the camera from saving the location. On an iPhone, go to Settings, Privacy and Security, Location Services, Camera, and choose Never. On Android, the option is usually in the camera app's own settings, often called Location tags or Save location. Photos you have already taken keep their location, and that is what this page is for. Photos from an iPhone in HEIC format can be converted with [HEIC to JPG](/heic-to-jpg/), which leaves no metadata at all.
