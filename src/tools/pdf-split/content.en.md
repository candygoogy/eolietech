---
title: "Split PDF by page ranges | Eolietech"
description: "Split a PDF by page ranges like 1-3, 5, 8- or into single pages or chunks of N pages. Runs in your browser, so the file is never uploaded."
h1: "Split a PDF"
intro: "Pull pages out of a PDF or cut it into smaller files. Type the pages you want, or split every page or every few pages into separate documents. The PDF stays on your device the whole time."
howTo:
  - "Choose a PDF or drop it on the box above. The tool shows how many pages it has."
  - "Pick how to split: by page ranges (for example 1-3, 5, 8-), every page as its own file, or every N pages."
  - "For page ranges, tick “Put all selected pages into one PDF” if you want a single file instead of one file per range."
  - "Press Split PDF, then download each part, or all parts at once as a .zip file."
faq:
  - q: "How do I write page ranges?"
    a: "Separate parts with commas. “1-3” means pages 1 to 3, “5” means only page 5, “8-” means page 8 to the end and “-4” means the first four pages. Pages are numbered from 1, as your PDF reader shows them."
  - q: "Is the PDF uploaded to a server?"
    a: "No. The split runs inside your browser with the open-source pdf-lib library. Your file is read from your disk and the parts are created in the page's memory, then saved to your Downloads folder."
  - q: "Why is a part almost as large as the original file?"
    a: "Pages often share resources such as fonts and images. A part keeps everything its pages need, so a single page that uses a large embedded font or image can still be a sizeable file."
  - q: "Can I split a password-protected PDF?"
    a: "No. Encrypted PDFs cannot be split here. Open the file with its password in your PDF reader, save an unprotected copy, and split that."
  - q: "Can I put pages in a different order?"
    a: "Ranges are extracted in the order you type them, so “5, 1-3” starts with page 5. For dragging pages around, rotating or deleting them, use Organize PDF pages."
ui:
  split.mode.legend: "How do you want to split it?"
  split.mode.ranges: "By page ranges"
  split.mode.each: "Every page as its own PDF"
  split.mode.every: "Every N pages"
  split.ranges.label: "Pages"
  split.ranges.placeholder: "1-3, 5, 8-"
  split.ranges.hint: "Separate with commas. “8-” means page 8 to the end."
  split.combine: "Put all selected pages into one PDF"
  split.every.label: "Pages per file"
  split.action: "Split PDF"
  split.reading: "Reading {name}…"
  split.ready.one: "Ready. The PDF has {pages} page."
  split.ready.other: "Ready. The PDF has {pages} pages."
  split.fileInfo.one: "{name}: {pages} page, {size}"
  split.fileInfo.other: "{name}: {pages} pages, {size}"
  split.working: "Creating part {current} of {total}…"
  split.done.one: "Done: {count} file ready to download."
  split.done.other: "Done: {count} files ready to download."
  split.resultsLabel: "Split results"
  split.pages: "Pages: {count}"
  split.downloadLabel: "Download {name}"
  split.downloadOne: "Download {name}"
  split.outputName: "{name}_pages_{pages}.pdf"
  split.zipName: "{name}_split.zip"
  split.error.empty: "Type the pages you want, for example 1-3, 5, 8-."
  split.error.syntax: "“{part}” is not a page or range. Use numbers like 5 or 1-3."
  split.error.outOfRange.one: "“{part}” is outside the document, which has {pages} page."
  split.error.outOfRange.other: "“{part}” is outside the document, which has {pages} pages."
  split.error.reversed: "“{part}” goes backwards. Write the lower page number first."
  split.error.size: "Pages per file must be a whole number from 1 to {pages}."
---

## Three ways to split

**By page ranges** is the most flexible. Type exactly the pages you need: `1-3, 5, 8-` gives you three files (pages 1 to 3, page 5, and page 8 to the end). Tick the box to put them all into one PDF instead, which is the quickest way to pull a few pages out of a long report. Ranges are taken in the order you type them, so `10-12, 1` puts page 1 last.

**Every page as its own PDF** turns a 20-page file into 20 one-page files. That is handy for scanned batches where each page is a separate receipt, form or letter.

**Every N pages** cuts the document into equal chunks. With a 30-page file and N = 10 you get pages 1–10, 11–20 and 21–30. If the page count does not divide evenly, the last file is shorter.

When there is more than one result you can download the parts one by one or all together as a .zip archive, which is also built in your browser.

## Privacy

Splitting happens entirely on your device. The page uses pdf-lib, an open-source PDF library, to copy the pages you chose into new documents. Nothing is uploaded, so this is a reasonable option for payslips, contracts and other papers you would rather not hand to a website.

## Limits worth knowing

- Password-protected or encrypted PDFs cannot be split; the tool tells you when that is the case.
- Each part keeps the fonts and images its pages use, so parts are not always much smaller than the original. To shrink them, run them through [Compress PDF](/compress-pdf/).
- Bookmarks and document-wide form features are not copied into the parts.
- To reorder, rotate or delete pages visually instead of by number, use [Organize PDF pages](/organize-pdf/).
