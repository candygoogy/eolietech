---
title: "Compress a PDF for email attachments | Eolietech"
description: "PDF too large to email? Shrink it on the strongest setting, with images at about 72 dpi, and check the new size before you attach it. Nothing is uploaded."
h1: "Compress a PDF for email"
intro: "Gmail and Outlook.com accept up to 25 MB per message, and a scanned contract or a brochure full of photos can go past that on its own. This page starts on the strongest setting, which stores images at about 72 dpi, so your PDF has the best chance of fitting. It runs in your browser, so the file is never uploaded."
howTo:
  - "Choose the PDF you want to send, or drop it on the box above. You can add up to 10 files, each up to 200 MB."
  - "Smallest file is already selected. It stores photos and scanned pages at about 72 dpi and keeps text and vector graphics as they are."
  - "Press Compress. The first time, your browser downloads the compression engine once (about 15 MB)."
  - "Check the size before and after shown next to each file, then download the result and open it. If a scanned page is hard to read, choose Balanced and press Compress again."
faq:
  - q: "How big can a PDF be to send by email?"
    a: "It depends on the provider. Gmail and Outlook.com both allow up to 25 MB per message, and on a work or school account the limit can be different. Attachments also grow by about a third when they are encoded for sending, so a 20 MB PDF can already be too much, and the recipient's mail server may have a lower limit than yours. Staying well under the limit is safer."
  - q: "Why is my PDF so large?"
    a: "Almost always because of images. A scanner or scanning app often saves every page as a colour picture at 300 dpi or more, and reports or brochures often contain photos at full camera resolution. Pages of text exported from a word processor take very little space, so a text-only PDF that is too big for email is rare."
  - q: "Will the text still be readable at 72 dpi?"
    a: "Text you can select with the cursor, and vector graphics such as charts and logos, stay sharp at every level, because they are kept as text and shapes. A scanned page is a picture of text, so at 72 dpi small print can turn soft. If that happens, choose Balanced (about 150 dpi) and compress again."
  - q: "Why did my PDF not get any smaller?"
    a: "The file is probably already compressed, or its size does not come from images. The tool tells you when the result is not smaller and offers the original instead of a worse copy. Compressing it again will not help, so split it into parts or send a link from cloud storage instead."
  - q: "Can I compress a password-protected PDF?"
    a: "Not if the file needs a password to open: the tool will tell you it is protected. Save an unprotected copy in your PDF reader first and compress that copy. The compressed copy has no password, so think about who can read the email before you send it."
  - q: "Is my PDF uploaded?"
    a: "No. Ghostscript, compiled to WebAssembly, compresses the file in this browser tab. The only download is the engine itself, from this website. Your PDF leaves your device only when you attach it to your email."
ui:
  compress.preset.screen.hint: "Images at about 72 dpi. The best chance of fitting under an email limit."
  compress.preset.ebook.hint: "Images at about 150 dpi. Try this if scanned text or photos look too soft."
  compress.preset.printer.hint: "Images at about 300 dpi. For a recipient who needs to print it."
---

## Why PDFs get too big to email

Pages of text take little space; images take a lot. A 20-page document scanned in colour at 300 dpi can easily weigh 20 MB or more, because every page is stored as a large photo of the paper. The same happens with reports and brochures where photos were pasted in straight from a camera or a phone.

None of that detail is needed to read the document on a screen. The Smallest file level, which this page starts on, re-saves each image at about 72 dpi, removes images that appear more than once and compresses the fonts. Images that are already smaller are not enlarged. Scans and photo-heavy files usually shrink the most; a PDF that is mostly text may barely change.

## If it is still too big

- **Split it.** Use [Split PDF](/split-pdf/) to cut the document into parts by page range, then send each part in its own email. You can compress the parts here too.
- **Send a link.** Put the PDF in cloud storage such as Google Drive, OneDrive or Dropbox and email the share link. Gmail does this on its own with a Google Drive link when you go over its limit.
- **Scan it again at a lower resolution.** For a document that will be read on screen, 150 dpi is enough, and grayscale or black and white makes text pages much smaller than colour.
- **Rebuild it from smaller photos.** If the PDF was made from phone photos, shrink them with [Resize images for email](/resize-image-for-email/) and put them back together with [JPG to PDF](/jpg-to-pdf/).

## Before you send it

Open the compressed file and look at the page with the smallest print. If you change the level, the results are cleared and you press Compress again; the engine is already loaded, so it does not download a second time. Ghostscript may flatten or drop interactive form fields when it rewrites the file, so if the recipient has to fill in a form, send the original. For files you are not sending by email, the main [Compress PDF](/compress-pdf/) page has the same tool and starts on Balanced.
