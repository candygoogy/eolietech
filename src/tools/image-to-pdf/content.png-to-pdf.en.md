---
title: "Convert PNG to PDF without uploading | Eolietech"
description: "Turn screenshots, scans and other PNG images into one PDF, one image per page. PNGs stay lossless, so text stays sharp. Made in your browser; nothing is uploaded."
h1: "PNG to PDF"
intro: "Put screenshots, scanned pages and diagrams into one PDF that is easy to send, print or attach to a form. PNGs go in lossless, so text stays crisp, and everything happens on your own device."
howTo:
  - "Choose your PNG files or drop them on the box above. JPG, WebP, AVIF and HEIC can go in the same PDF too."
  - "Put them in order by dragging, or with the Move up and Move down buttons. The top image is page one."
  - "Keep Fit to image for pages the size of each screenshot, or pick A4 or Letter if the PDF will be printed."
  - "Press Create PDF and download the file."
faq:
  - q: "Will text in my screenshots stay sharp?"
    a: "Yes. PNG images are stored in the PDF without any lossy compression, so every pixel is kept and small text looks exactly as it does in the original screenshot."
  - q: "What happens to transparent areas?"
    a: "Transparency is kept. A PDF reader shows the page colour, normally white, through the transparent parts, the same way your image viewer shows a checkerboard or a background."
  - q: "Why is my PDF about as big as my PNGs?"
    a: "Because nothing is thrown away. If you need a smaller file and the images are photos rather than screenshots, convert them to JPG first with the PNG to JPG converter, or run the finished PDF through Compress PDF."
  - q: "Is anything uploaded?"
    a: "No. The PDF is built in your browser with the open-source pdf-lib library, and your files never leave your device."
ui:
  topdf.drop: "Choose PNG images or drop them here"
  topdf.drop.hint: "PNG images, plus JPG, WebP, AVIF and HEIC. Made into a PDF on your device; nothing is uploaded."
---

## Screenshots and scans in one file

A folder of screenshots is awkward to share: the order gets lost, some apps resize them, and forms often accept a single PDF only. Putting them into one PDF fixes all three. The order you set here is the page order, and every page keeps the exact pixels of its PNG.

## Lossless all the way

PNG is a lossless format, and it stays that way in the PDF. That matters for screenshots of text, receipts, diagrams and scanned documents, where a lossy format would blur the edges of letters. The flip side is size: a PDF of PNGs is about as large as the PNGs themselves.

## Page size

With **Fit to image**, each page is the size of its screenshot, which reads well on screen and keeps phone screenshots tall and narrow. If the PDF is going to a printer or into an application form, choose **A4** or **Letter**: each image is scaled to fit and centred, wide images get landscape pages, and the small margin keeps everything clear of the printer's edge.

## How it works

Your browser reads each PNG and places it in a new PDF using pdf-lib, inside a background worker. Nothing is uploaded, and the finished PDF goes straight to your downloads. Need to add it to other documents afterwards? [Merge PDF files](/merge-pdf/) joins several PDFs into one. If the images are photos and the PDF comes out too large, convert them with [PNG to JPG](/png-to-jpg/) first, or shrink the finished file with [Compress PDF](/compress-pdf/).
