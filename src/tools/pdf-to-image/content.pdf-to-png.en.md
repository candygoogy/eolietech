---
title: "PDF to PNG: crisp page images, no upload | Eolietech"
description: "Save PDF pages as PNG images with sharp text and lines, at 72, 150 or 300 dpi. Pick all pages or a few. Runs in your browser; the PDF is never uploaded."
h1: "PDF to PNG"
intro: "Turn PDF pages into PNG images that keep text, lines and charts perfectly sharp, ready for slides, documentation or editing. The PDF stays on your device the whole time."
howTo:
  - "Choose a PDF or drop it on the box above."
  - "PNG is already selected. Pick 150 dpi for screens or 300 dpi for print or close zooming."
  - "Keep All pages, or choose Only these pages and type them, for example 2, 4-6."
  - "Press Convert to images and download the PNG, or all of them in one .zip file."
faq:
  - q: "Why PNG instead of JPG?"
    a: "PNG stores every pixel exactly, so small text, hairlines and flat colors stay clean. JPG is smaller but can leave faint smudges around sharp edges. For a slide, a chart or a page you want to annotate, PNG looks better; for sharing scanned pages, JPG is usually enough."
  - q: "Do the PNGs have a transparent background?"
    a: "No. Pages are drawn on white, as they look in a PDF reader, so the images look the same wherever you paste them."
  - q: "Why are the files so big?"
    a: "PNG compresses without losing anything, so a full page at 300 dpi can be a few megabytes. 150 dpi is usually plenty for a screen and makes files about four times smaller."
  - q: "Is the PDF uploaded?"
    a: "No. PDF.js draws the pages inside your browser and the PNGs are created in the page's memory. Nothing is sent anywhere."
---

## Sharp pages for slides and documents

PNG is the format to choose when a page has to look exactly like the original: a chart for a presentation, a diagram for a wiki, a page you want to mark up in an image editor. Text keeps its clean edges and thin lines stay thin, because PNG never throws detail away.

## Picking a resolution

At **150 dpi** an A4 page becomes about 1240 by 1750 pixels, which fills a laptop screen and stays readable when pasted into a slide. At **300 dpi** it becomes about 2480 by 3510 pixels, enough for printing or for cropping out a small detail. Very large pages, such as posters, are capped at about 16.7 megapixels so the browser does not run out of memory, and the tool tells you when that happens.

## Private by design

Everything happens in this page: PDF.js draws each page, your browser saves it as PNG, and several pages are packed into a .zip in memory. If you would rather have smaller files, [PDF to JPG](/pdf-to-jpg/) does the same with JPG selected. To keep pages as a PDF instead, use [Split PDF](/split-pdf/); to turn images back into a PDF, use [JPG to PDF](/jpg-to-pdf/).
