---
title: "Reorder, rotate and delete PDF pages | Eolietech"
description: "See every page of a PDF as a thumbnail, then reorder, rotate or delete pages and save a new file. Runs in your browser; nothing is uploaded."
h1: "Organize PDF pages"
intro: "Fix a PDF page by page: put pages in the right order, turn sideways scans upright and drop the ones you do not need. You see a thumbnail of every page, and the file never leaves your device."
howTo:
  - "Choose a PDF or drop it on the box above. A thumbnail appears for each page."
  - "Reorder pages by dragging them, or with the Earlier and Later buttons under each page."
  - "Use the rotate buttons to turn a page a quarter turn left or right, and Delete to remove it. Undo all changes brings back the original."
  - "Press Save PDF, then download the new file. Your original file is not changed."
faq:
  - q: "Is my PDF uploaded to show the thumbnails?"
    a: "No. Thumbnails are drawn in your browser by PDF.js, the open-source PDF renderer from Mozilla, and the new file is built with pdf-lib, also in your browser. No part of the document is sent anywhere."
  - q: "Does rotating a page reduce its quality?"
    a: "No. Rotation is stored as a setting on the page, the same way PDF readers do it. Text, images and drawings are not redrawn or re-compressed."
  - q: "Can I use the keyboard instead of dragging?"
    a: "Yes. Every page has buttons to move it earlier or later, rotate it and delete it. Use Tab to reach them; after each action, focus stays on the page you just changed."
  - q: "Why do some thumbnails look slightly different from my PDF reader?"
    a: "Thumbnails are small previews. Unusual fonts or colour profiles may render a little differently at that size, but the saved PDF keeps the original page content exactly as it was."
  - q: "Can I open password-protected PDFs?"
    a: "No. Encrypted PDFs cannot be edited here. If you know the password, remove it with Unlock PDF on this site, then open the unlocked copy."
ui:
  organize.listLabel: "Pages, in their new order"
  organize.hint: "Drag pages to reorder them, or use the buttons under each page."
  organize.reading: "Reading {name}…"
  organize.ready.one: "Loaded {pages} page. Its thumbnail appears once it is drawn."
  organize.ready.other: "Loaded {pages} pages. Thumbnails appear as they are drawn."
  organize.fileInfo.one: "{name}: {pages} page, {size}"
  organize.fileInfo.other: "{name}: {pages} pages, {size}"
  organize.thumbAlt: "Preview of page {page}"
  organize.thumbLoading: "Loading preview…"
  organize.pageName: "Page {page}"
  organize.position: "Position {position}"
  organize.rotated: "Rotated {degrees}°"
  organize.moveEarlier: "Earlier"
  organize.moveLater: "Later"
  organize.rotateLeft: "Rotate left"
  organize.rotateRight: "Rotate right"
  organize.delete: "Delete"
  organize.moveEarlierLabel: "Move page {page} earlier"
  organize.moveLaterLabel: "Move page {page} later"
  organize.rotateLeftLabel: "Rotate page {page} left"
  organize.rotateRightLabel: "Rotate page {page} right"
  organize.deleteLabel: "Delete page {page}"
  organize.moved: "Page {page} is now at position {position} of {total}."
  organize.rotatedStatus: "Page {page} rotated to {degrees}°."
  organize.deleted.one: "Page {page} deleted. {remaining} page left."
  organize.deleted.other: "Page {page} deleted. {remaining} pages left."
  organize.undo: "Undo all changes"
  organize.undone: "All changes undone."
  organize.save: "Save PDF"
  organize.working: "Saving the new PDF…"
  organize.done.one: "Done: new PDF with {pages} page."
  organize.done.other: "Done: new PDF with {pages} pages."
  organize.download.one: "Download PDF ({pages} page, {size})"
  organize.download.other: "Download PDF ({pages} pages, {size})"
  organize.outputName: "{name}_organized.pdf"
---

## A page sorter that stays on your computer

Scanned documents rarely come out right the first time. A page is upside down, the back of a form ended up before the front, or the scanner added a blank sheet. This tool shows the whole document as a grid of thumbnails so you can fix all of that in one pass and save a clean copy.

Everything runs in your browser. The thumbnails are drawn by PDF.js, the same renderer Firefox uses to display PDFs, and the new file is assembled with pdf-lib. Both run locally, so the document is never uploaded and the tool keeps working if your connection drops after the page has loaded.

## What each action does

- **Earlier / Later** moves a page one position at a time. With a mouse or trackpad you can also drag a page onto the place where it should go.
- **Rotate left / Rotate right** turns the page by 90 degrees. The rotation is saved as a page setting, so nothing is redrawn and quality is unchanged.
- **Delete** removes the page from the new file. The last remaining page cannot be deleted.
- **Undo all changes** restores the original order, rotation and every deleted page.

When you save, you get a new PDF. The original file on your disk is left exactly as it was.

## Good to know

- Large documents take a moment: thumbnails are drawn one after another, and you can start rearranging before they are all ready.
- Encrypted or password-protected PDFs cannot be opened.
- Links inside the document and bookmarks may point to the wrong place after pages move, because they refer to page positions.
- To combine several files first, use [Merge PDF](/merge-pdf/). To pull out page ranges by number, [Split PDF](/split-pdf/) is quicker.
