---
title: "Add page numbers to a PDF in your browser | Eolietech"
description: "Number the pages of a PDF as 1, 1 / 12 or Page 1 of 12, at the top or bottom, and skip the cover if you need to. The PDF is never uploaded."
h1: "Add page numbers to a PDF"
intro: "Add page numbers to a PDF for a thesis, a report or a court filing. Choose the corner, the format (a plain number or Page 1 of 12) and the page where counting starts, then check the preview and save a numbered copy. The file stays on your device."
howTo:
  - "Choose a PDF or drop it on the box above. It can be up to 200 MB."
  - "Click one of the six spots on the small page to choose where the numbers go, then pick a format and a size."
  - "If the document has a cover, set First page to number to 2. Change Start counting at if the numbering should begin at something other than 1."
  - "Check the preview of the first numbered page, press Add page numbers and download the copy."
faq:
  - q: "Is the PDF uploaded to a server?"
    a: "No. The numbers are added inside your browser with the open-source pdf-lib library. The file is read from your disk, the numbered copy is saved to your Downloads folder, and your original file is left as it was."
  - q: "How do I leave the cover without a number?"
    a: "Set First page to number to 2. The cover gets no number and the next page gets the start number, which is 1 unless you change it. If the cover should still count, so that the first visible number is 2, also set Start counting at to 2."
  - q: "What does the total in 1 / 12 or Page 1 of 12 count?"
    a: "It is the last number printed in the document. Skip a cover on a 12-page file and the numbers run from 1 / 11 to 11 / 11. The Format list shows the labels with your current settings, so you can see the total before you save."
  - q: "Can I use Roman numerals, another font or a colour?"
    a: "No. The numbers are always Arabic numerals in black Helvetica. You can choose the size, from 6 to 72 points, and the distance from the edge of the page, from 0 to 50 mm."
  - q: "Do forms, links and bookmarks still work afterwards?"
    a: "Yes. The tool only adds the numbers. Text, images, links, bookmarks and form fields stay as they were, including anything already typed into the fields. A digital signature already on the file is different: saving changes the file, so that signature will no longer verify."
  - q: "Can I number a password-protected PDF?"
    a: "No, and the same goes for a PDF that opens freely but blocks printing or editing. Unlock PDF on this site removes a password you know, and removes those restrictions without one. Then number the unlocked copy."
  - q: "Do the numbers land in the right place on landscape or rotated pages?"
    a: "Yes. Each number is placed on the page as you see it in a PDF reader, upright and inside the visible area, even on rotated or cropped pages. In a file that mixes page sizes, each page gets its number at the same distance from its own edges."
ui:
  numbers.drop.replace: "Choose another PDF"
  numbers.reading: "Opening {name}…"
  numbers.fileInfo.one: "{name}: {pages} page, {size}"
  numbers.fileInfo.other: "{name}: {pages} pages, {size}"
  numbers.opened.one: "{name} is open. It has {pages} page."
  numbers.opened.other: "{name} is open. It has {pages} pages."
  numbers.position.legend: "Position"
  numbers.position.top-left: "Top left"
  numbers.position.top-center: "Top centre"
  numbers.position.top-right: "Top right"
  numbers.position.bottom-left: "Bottom left"
  numbers.position.bottom-center: "Bottom centre"
  numbers.position.bottom-right: "Bottom right"
  numbers.format.label: "Format"
  numbers.words: "Page {n} of {total}"
  numbers.size.label: "Size"
  numbers.size.preset: "{name} ({pt} pt)"
  numbers.size.small: "Small"
  numbers.size.medium: "Medium"
  numbers.size.large: "Large"
  numbers.size.custom: "Custom"
  numbers.size.points: "Size in points"
  numbers.start.label: "Start counting at"
  numbers.first.label: "First page to number"
  numbers.first.hint: "Pages before it get no number. Use 2 to skip a cover."
  numbers.margin.label: "Margin (mm)"
  numbers.preview.caption: "Page {page} will read “{label}”"
  numbers.preview.error: "Page {page} couldn't be shown. The numbers can still be added."
  numbers.action: "Add page numbers"
  numbers.working: "Adding page numbers…"
  numbers.done.one: "Done: {count} page numbered, {size}."
  numbers.done.other: "Done: {count} pages numbered, {size}."
  numbers.download: "Download {name}"
  numbers.outputName: "{name}-numbered.pdf"
  numbers.error.start: "The start number must be a whole number from 0 to {max}."
  numbers.error.first: "First page to number must be a page of this PDF, from 1 to {pages}."
  numbers.error.size: "The size must be from {min} to {max} points."
  numbers.error.margin: "The margin must be from 0 to {max} mm."
---

## Choosing where the numbers go

The small page in the tool has six spots: top or bottom, on the left, in the centre or on the right. Bottom centre is the default. The margin is the gap between the edge of the page and the nearest edge of the number, 10 mm unless you change it. Every page gets its number in the same spot.

There are three formats. A plain **1** is the usual choice for books, theses and reports. **1 / 12** and **Page 1 of 12** also show the total, which makes a missing page easy to spot on a printout.

The preview shows the first numbered page with its number in place, in proportion to the page. The number is drawn on top of what is already on the page, so if the document has a footer or text close to the edge, look at a few more pages in the saved copy. A larger margin or the other edge of the page usually fixes an overlap.

## Theses and documents with a cover

A thesis, a report or a manual usually starts with a cover that carries no number. Set **First page to number** to 2 and the cover is skipped. If the front matter (title page, abstract, table of contents) should stay unnumbered too, set First page to number to the page where the first chapter starts. Many universities have their own rules on where the numbering starts and whether the cover counts, so check your guidelines if you have them.

**Start counting at** sets the number on that first numbered page. Use it when a chapter is sent as a separate file and has to continue from the previous one, or when the cover should count without showing its number.

## Legal documents and filings

Contracts, briefs and the exhibits that go with them are often numbered as Page 1 of 12, so every reader can tell the copy is complete. Courts and offices that set rules for filings often say where the number goes and how it should read, so check the rules that apply to you and set the position, format and size to match.

If the document will also get a digital signature, add the numbers first and sign afterwards. Saving the file here rewrites it, so a signature added before the numbers would no longer verify.

## Several files numbered as one

The tool numbers one PDF at a time. To number a set of documents in one continuous run, put them together with [Merge PDF](/merge-pdf/) first, put the pages in order or drop the ones you don't need with [Organize PDF](/organize-pdf/), then number the merged file here.

## Printing double-sided

The number sits in the same spot on every page. Once the sheets are printed on both sides and bound, a number in the right corner ends up next to the binding on every other page. For double-sided printing, top centre or bottom centre reads the same on both sides. Many home and office printers can't print right up to the edge of the sheet, so leave the margin at a few millimetres or more.

## What changes in the file

Only the numbers are added. They are real text in Helvetica, one of the standard fonts every PDF reader supplies, so they print sharply at any size and can be selected and searched. The font itself isn't stored in the file, so the shapes of the digits can vary slightly from one reader to another. Text, images, links, bookmarks, form fields and the number of pages stay the same. The tool draws the numbers on the pages and does not change the page numbers shown in your PDF reader's toolbar.

Two things can stop working: a digital signature already on the file, which no longer verifies once the file changes, and PDF/A compliance, because PDF/A expects every font to be embedded in the file. If an archive or an office asks for PDF/A, check the numbered copy before you send it.

The PDF is read and saved in your browser and never uploaded. Very large files need a lot of memory, so on a phone a big PDF can take a while.

## Related tools

- To combine several files before numbering them, use [Merge PDF](/merge-pdf/).
- To reorder, rotate or remove pages first, use [Organize PDF](/organize-pdf/).
- To sign the numbered copy, use [Sign PDF](/sign-pdf/).
- Password-protected PDFs can't be opened here; remove a password you know with [Unlock PDF](/unlock-pdf/) first.
