---
title: "Redact PDF: black out text for good, in your browser | Eolietech"
description: "Black out names, addresses, IBANs and phone numbers in a PDF. The text under each box is removed from the file, not just covered. Runs in your browser, nothing is uploaded."
h1: "Redact PDF"
intro: "Hide a name, an account number or a whole paragraph before you send a PDF to someone. Draw black boxes or search for what has to go, check them, and save a copy where that text is gone from the file, not just painted over. The PDF never leaves your device."
howTo:
  - "Choose a PDF or drop it on the box above. Its pages appear below, one under the other."
  - "Drag across a page to draw a black box over what you want to hide. To find words for you, type them in the search field, or press one of the buttons for email addresses, phone numbers, IBANs or Italian codici fiscali."
  - "Check every box. Drag a box to move it, drag its edges to resize it, and press the small × to remove it."
  - "Press Redact and save, then download the new PDF. Your original file is left as it was."
faq:
  - q: "Is the text under the boxes really gone?"
    a: "Yes. Every page with a box is redrawn as a picture with the boxes painted solid black, and the new PDF holds only that picture for the page. The original text, fonts and drawings of that page are not copied into the new file, so there is nothing left underneath to select, copy or search."
  - q: "Why does my redacted page look slightly less sharp?"
    a: "Because it is now a picture of the page, drawn at 200 dpi. That is sharp enough to read and to print small text, but up close it is not as crisp as the original text was. It is also why the text on that page can no longer be selected or searched, which is the point."
  - q: "Why is the redacted file bigger than the original?"
    a: "A page stored as text takes very little space; the same page as a picture takes more. Each redacted page adds about as much as a good photo of that page would, more for pages full of small print or pictures. Pages without boxes are copied as they were and add almost nothing."
  - q: "Search did not find a word I can see on the page. Why?"
    a: "Search reads the text stored in the PDF. If the page is a scan or a photo, the words are part of a picture and there is no text to read, so search finds nothing there. Draw those boxes by hand. The same goes for text inside images placed in an otherwise normal PDF."
  - q: "Is my PDF uploaded?"
    a: "No. PDF.js, the open-source PDF engine Firefox uses, draws and reads the pages inside this page, and the new PDF is assembled in your browser's memory. Nothing is sent to a server, which is the whole reason to redact here and not on a website that asks you to upload the file first."
  - q: "Can I redact a password-protected PDF?"
    a: "No. If you know the password, remove it with Unlock PDF on this site and redact the unlocked copy."
ui:
  redact.drop.label: "Choose a PDF or drop it here"
  redact.drop.replace: "Choose another PDF"
  redact.reading: "Reading {name}…"
  redact.fileInfo.one: "{name}: {pages} page, {size}"
  redact.fileInfo.other: "{name}: {pages} pages, {size}"
  redact.ready.one: "Ready. Draw a box over what you want to hide, or search for it."
  redact.ready.other: "Ready. Draw boxes over what you want to hide, or search for it. The PDF has {pages} pages."
  redact.search.legend: "Find and black out"
  redact.search.label: "Words or numbers"
  redact.search.action: "Black out every match"
  redact.quick.label: "Or look for:"
  redact.pattern.email: "Email addresses"
  redact.pattern.phone: "Phone numbers"
  redact.pattern.iban: "IBANs"
  redact.pattern.cf: "Codici fiscali"
  redact.search.note: "Search reads the real text in the PDF. Words on a scanned page are part of a picture, so search can't see them: draw those boxes by hand."
  redact.searching: "Searching page {current} of {total}…"
  redact.searchStopped: "Search stopped. Boxes it had already placed are still on their pages."
  redact.found.one: "Found {count} match: {pages}. It now has a box; check it before you save."
  redact.found.other: "Found {count} matches: {pages}. Each one now has a box; check them before you save."
  redact.found.page: "page {page} ({count})"
  redact.found.noneQuery: "No matches for {query}."
  redact.found.none.email: "No email addresses found."
  redact.found.none.phone: "No phone numbers found."
  redact.found.none.iban: "No IBANs found."
  redact.found.none.cf: "No codici fiscali found."
  redact.found.noText: "This PDF has no text that search can read, so it is probably a scan. Draw the boxes by hand."
  redact.error.emptyQuery: "Type a word or a number to look for."
  redact.hint: "Drag across a page to draw a box, or press Add a box. Drag a box to move it, drag its edges to resize it."
  redact.seeThrough: "Boxes are see-through here so you can check what they cover. In the saved file they are solid black."
  redact.listLabel: "Pages"
  redact.page.name: "Page {page}"
  redact.page.alt: "Page {page}"
  redact.page.loading: "Drawing page {page}…"
  redact.page.noBoxes: "No boxes"
  redact.page.boxes.one: "{count} box"
  redact.page.boxes.other: "{count} boxes"
  redact.page.found.one: "{count} match"
  redact.page.found.other: "{count} matches"
  redact.page.add: "Add a box"
  redact.page.addLabel: "Add a box to page {page}"
  redact.box.label: "Black box {box} on page {page}"
  redact.box.state: "{left}% from the left, {top}% from the top, {width}% wide, {height}% tall."
  redact.box.hint: "Arrow keys move the box, with Shift in bigger steps. Alt and the arrow keys change its size. Delete removes it."
  redact.box.remove: "Remove box {box} on page {page}"
  redact.announce.added: "Box {box} added to page {page}."
  redact.announce.box: "Box {box} on page {page}: {state}"
  redact.announce.removed: "Box removed from page {page}."
  redact.clear: "Remove all boxes"
  redact.cleared.one: "Removed {count} box."
  redact.cleared.other: "Removed {count} boxes."
  redact.action: "Redact and save"
  redact.stop: "Stop"
  redact.stopped: "Stopped. Nothing was saved, and your boxes are still here."
  redact.working: "Redacting page {current} of {total}…"
  redact.saving: "Putting the new PDF together…"
  redact.error.noBoxes: "There is nothing to redact yet. Draw a box on a page or search for a word first."
  redact.done.one: "Done. {count} page redacted, {size} in total."
  redact.done.other: "Done. {count} pages redacted, {size} in total."
  redact.download: "Download {name}"
  redact.outputName: "{name}-redacted.pdf"
  redact.note: "Pages with boxes are saved as pictures: their text can no longer be selected or searched, and the file may get bigger. Pages without boxes keep their text. Bookmarks, document properties, comments and form fields are removed from the whole file, because they can repeat the words you hid."
---

## Why a black box is not always a redaction

Most PDF editors let you draw a black rectangle, and on screen it looks done. But a PDF is made of layers. The rectangle is drawn on top, and the text it covers is still in the file underneath. Anyone who opens it can select the hidden line and paste it into an email, or simply search for it. Lawyers, courts and government offices have published documents this way, and the names under the black were readable by anyone who tried.

The same goes for highlighting text in black, for a black comment box, and for a screenshot of a page that is then pasted back into the same document next to the original.

This tool does it the other way round. Each page with a box is drawn as a picture, the boxes are painted into that picture, and the new page contains only the picture. What was under the black is not hidden in the file: it is no longer in it.

## What changes in the saved PDF

- **Pages with boxes** become pictures at 200 dpi. They look the same, but their text can no longer be selected, copied or searched, and each one makes the file somewhat bigger.
- **Pages without boxes** are copied as they were, text included.
- **Everything else that can hold text**: document properties such as title and author, the hidden XMP metadata, bookmarks, attachments, comments and form fields are removed from the whole file. They can repeat the very words you blacked out, and they are easy to forget because they do not show on the page. Filled-in form fields on pages you did not redact keep their look, but can no longer be edited. Links that jump to another page of the document are removed too; links to websites stay.

## Search, and what it can't see

The search field finds every place a word or number appears, ignoring capitals, and puts a box over each one. The four buttons look for common personal data: email addresses, phone numbers (Italian and international formats), IBANs (checked with their control digits, so the box stops where the IBAN ends) and Italian codici fiscali.

Search only works on real text. A scanned contract or a photo of a document has no text inside, only a picture of it, so search finds nothing there. In that case, draw the boxes yourself. Search can also be slightly off on unusual fonts, because a PDF tells it where a line of text is, not where each letter is. Look at every box before you save, and make one bigger by dragging its edge if a letter peeks out.

## Your PDF stays on your device

The pages are drawn and read by PDF.js, the open-source PDF engine inside Firefox, running in this page. The new PDF is put together by pdf-lib, also in your browser. Nothing is uploaded at any point, which matters most for exactly the documents people redact: payslips, medical reports, contracts, bank statements.

## Related tools

- To shrink a redacted PDF that came out large, try [Compress PDF](/compress-pdf/).
- To send only some pages, cut them out first with [Split PDF](/split-pdf/).
- Photos carry hidden data too, such as where they were taken: [Remove EXIF](/remove-exif/) strips it.
