---
title: "PDF to JPG: save PDF pages as images | Eolietech"
description: "Turn every page of a PDF, or just the pages you pick, into JPG or PNG images at 72, 150 or 300 dpi. Runs in your browser, so the PDF is never uploaded."
h1: "PDF to JPG"
intro: "Save the pages of a PDF as pictures you can paste into a slide, post in a chat or attach where only images are allowed. Pick the pages and the sharpness, and the PDF stays on your device the whole time."
howTo:
  - "Choose a PDF or drop it on the box above. The tool tells you how many pages it has."
  - "Pick JPG or PNG and a resolution: 150 dpi for screens, 300 dpi if you plan to print."
  - "Keep All pages, or choose Only these pages and type them, for example 1-3, 5."
  - "Press Convert to images. One page downloads as a single image; several come together in one .zip file."
faq:
  - q: "Which resolution should I choose?"
    a: "150 dpi is right for most things: an A4 page comes out about 1240 by 1750 pixels, sharp on a laptop or phone screen. Choose 300 dpi when the image will be printed or when you need to zoom into small print. 72 dpi gives small, quick previews."
  - q: "Should I pick JPG or PNG?"
    a: "JPG makes much smaller files and is accepted almost everywhere, which suits scanned pages and pages with photos. PNG keeps text and thin lines perfectly crisp, at the cost of larger files, so it is the better choice for slides, diagrams and text you want to stay sharp."
  - q: "Is my PDF uploaded?"
    a: "No. The pages are drawn by PDF.js, an open-source PDF renderer, inside your browser, and the images are created in the page's memory. Nothing is sent to a server, so payslips, contracts and medical letters stay on your device."
  - q: "Why was a page saved smaller than the resolution I chose?"
    a: "Very large pages, such as posters or technical drawings, would need hundreds of megapixels at 300 dpi and could crash the browser tab. Each image is capped at about 16.7 megapixels, which still covers A4 and Letter at 300 dpi. When a page is scaled down, the tool tells you which one."
  - q: "Can I convert a password-protected PDF?"
    a: "No. If you know the password, remove it with Unlock PDF on this site and convert the unlocked copy."
ui:
  p2i.format.label: "Format"
  p2i.format.jpg: "JPG (smaller files)"
  p2i.format.png: "PNG (crisp text, larger files)"
  p2i.dpi.label: "Resolution"
  p2i.dpi.72: "72 dpi (small previews)"
  p2i.dpi.150: "150 dpi (screens)"
  p2i.dpi.300: "300 dpi (printing)"
  p2i.pages.legend: "Which pages?"
  p2i.pages.all: "All pages"
  p2i.pages.some: "Only these pages"
  p2i.ranges.label: "Pages"
  p2i.ranges.placeholder: "1-3, 5"
  p2i.ranges.hint: "Separate with commas. “8-” means page 8 to the end."
  p2i.action: "Convert to images"
  p2i.stop: "Stop"
  p2i.stopped: "Stopped. Change the settings or press Convert to images to start again."
  p2i.reading: "Reading {name}…"
  p2i.ready.one: "Ready. The PDF has {pages} page."
  p2i.ready.other: "Ready. The PDF has {pages} pages."
  p2i.fileInfo.one: "{name}: {pages} page, {size}"
  p2i.fileInfo.other: "{name}: {pages} pages, {size}"
  p2i.working: "Drawing page {current} of {total}…"
  p2i.done.one: "Done: {count} image, {size}."
  p2i.done.other: "Done: {count} images, {size} in total."
  p2i.capped.one: "Page {pages} is very large at this resolution, so it was saved smaller, about 16.7 megapixels, to keep your browser from running out of memory."
  p2i.capped.other: "Pages {pages} are very large at this resolution, so they were saved smaller, about 16.7 megapixels each, to keep your browser from running out of memory."
  p2i.downloadOne: "Download {name}"
  p2i.outputName: "{name}-page-{page}.{ext}"
  p2i.zipName: "{name}-{ext}.zip"
  p2i.error.empty: "Type the pages you want, for example 1-3, 5."
  p2i.error.syntax: "“{part}” is not a page or range. Use numbers like 5 or 1-3."
  p2i.error.outOfRange.one: "“{part}” is outside the document, which has {pages} page."
  p2i.error.outOfRange.other: "“{part}” is outside the document, which has {pages} pages."
  p2i.error.reversed: "“{part}” goes backwards. Write the lower page number first."
---

## What dpi means for your images

A PDF page has a size in inches or centimeters, not in pixels. The resolution, in dots per inch, decides how many pixels each inch of paper becomes. An A4 page is about 8.3 by 11.7 inches, so:

- **72 dpi** gives roughly 600 by 840 pixels. Fine for a thumbnail or a quick look, too soft for reading small print.
- **150 dpi** gives roughly 1240 by 1750 pixels. Text is sharp on laptop and phone screens, and files stay a reasonable size. This is the default.
- **300 dpi** gives roughly 2480 by 3510 pixels, the usual resolution for printing. Files are about four times as large as at 150 dpi, so only pick it when you need the detail.

## JPG or PNG

**JPG** is the safe choice for sharing. It is small, every app opens it, and it handles scanned pages and photos well. Around very sharp edges, such as black text on white, it can leave faint smudges if you look closely.

**PNG** stores every pixel exactly, so text, lines and charts stay perfectly crisp. The price is size: a page of text can easily be three to five times larger than the same page as JPG. If you need [only the PNG version](/pdf-to-png/), that page starts with PNG selected.

## Your PDF stays on your device

The pages are drawn by PDF.js, the open-source renderer Firefox uses for its own PDF viewer, running inside this page. The images are encoded by your browser and, when there are several, packed into a .zip in memory too. Nothing is uploaded, which matters for bank statements, contracts and anything else you would rather not hand to a website.

## Related tools

- To keep part of a PDF as a PDF rather than as images, use [Split PDF](/split-pdf/).
- To go the other way and turn photos or scans into one PDF, use [JPG to PDF](/jpg-to-pdf/).
- Password-protected PDFs cannot be opened here; remove a password you know with [Unlock PDF](/unlock-pdf/) first.
