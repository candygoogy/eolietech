---
title: "Convert PNG to JPG without uploading | Eolietech"
description: "Convert PNG images and screenshots to smaller JPG files. Transparent areas become white. Choose the quality and convert in batches, all on your device."
h1: "PNG to JPG converter"
intro: "Turn large PNG files into compact JPGs for email, documents and upload forms with size limits. Set the quality, convert many files at once, and keep everything on your own device."
howTo:
  - "Choose your .png files, or drop them on the box above."
  - "JPG is preselected. Use the quality slider to balance file size against detail."
  - "Optionally enter a maximum width or height to make big images smaller."
  - "Check the new sizes, then download the JPGs individually or as a single .zip."
faq:
  - q: "What happens to a transparent background?"
    a: "JPG has no transparency, so transparent and partly transparent pixels are blended onto white. The list notes every file where this happened. If you need to keep the transparency, try PNG to WebP instead."
  - q: "Will text in screenshots stay sharp?"
    a: "JPG is designed for photos, so sharp edges such as text can pick up faint halos at lower quality. For screenshots, use quality 85 to 90, or keep them as PNG if they need to stay crisp."
  - q: "Why is my JPG not much smaller?"
    a: "Simple graphics with large flat areas, like diagrams or logos, are already stored efficiently as PNG. JPG gives the biggest savings on photos and detailed images."
  - q: "Is anything uploaded?"
    a: "No. The PNG decoder and the MozJPEG encoder run in your browser, and your files never leave your device."
ui:
  img.drop.hint: "PNG images. Converted on your device; nothing is uploaded."
  img.zipName: "png-to-jpg.zip"
---

## When to turn a PNG into a JPG

PNG stores every pixel exactly, which is ideal for editing but makes photos and detailed screenshots large. A photo saved as PNG is often five to ten times bigger than the same photo as a JPG. That matters when an email bounces for being too large, when a form caps uploads at 2 MB, or when you need to fit many images into a document.

JPG is accepted practically everywhere, from word processors to online shops, and at quality 75 to 85 most people cannot tell it apart from the original PNG.

## Photos versus graphics

JPG works best on photographs and images with smooth color changes. On images with hard edges and flat colors, such as logos, charts, UI screenshots and pixel art, JPG compression can create visible ringing around the edges and may not save much space. For those, either keep the PNG or use a high quality setting.

## Transparency

PNG files often have transparent backgrounds, and JPG cannot. Transparent pixels are blended onto a white background so they do not turn black, and the result list tells you which files were affected. If your image needs to stay transparent and smaller, [PNG to WebP](/png-to-webp/) keeps the alpha channel.

## How it works

Your browser decodes the PNG and encodes the JPG with MozJPEG, an encoder tuned to produce smaller JPGs than most standard tools at the same quality. Both run as WebAssembly in a background worker, so large batches do not freeze the page and nothing is uploaded.
