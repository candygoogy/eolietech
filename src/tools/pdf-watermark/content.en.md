---
title: "Watermark a PDF: add text or a logo, free and in your browser | Eolietech"
description: "Put CONFIDENTIAL, DRAFT, a name or your logo on every page of a PDF, or only on some. Choose the size, colour, angle and opacity. Free, and the PDF is never uploaded."
h1: "Add a watermark to a PDF"
intro: "Mark a PDF as a draft or as confidential, write on a copy who it is meant for, or put your logo on it. Type the text or choose the image, watch the preview while you adjust it, and save a watermarked copy. The PDF stays on your device."
howTo:
  - "Choose a PDF or drop it on the box above. It can be up to 200 MB."
  - "Type the watermark, for example DRAFT or Copy for Mario Rossi. For a logo, choose Image and pick a PNG or JPG file."
  - "Set the size, colour, angle, layout and opacity, then choose All pages or Only some pages. The preview shows the first page that gets the watermark and follows every change."
  - "Press Add watermark, download the copy and open it to check it before you send it."
faq:
  - q: "Is my PDF uploaded?"
    a: "No. The watermark is added inside your browser by pdf-lib, an open-source PDF library, and the preview is drawn by PDF.js, the PDF engine inside Firefox. Nothing is sent to a server. Your original file stays as it was, and the copy is saved with a name ending in -watermarked.pdf."
  - q: "Can someone remove the watermark?"
    a: "Yes, if they have a PDF editor and want to. The watermark is drawn on top of the page as a separate piece of text or image, so an editor can select it and delete it, and the text underneath is still in the file. It discourages casual copying and shows who a copy was meant for. It doesn't stop anyone from opening, printing or editing the file. To decide who can open it, use Protect PDF on this site. To take text out of a document for good, use Redact PDF."
  - q: "Why are some characters refused?"
    a: "The watermark is written in Helvetica, one of the standard fonts every PDF reader already has. These fonts cover the letters of Italian, French, Spanish, German, Portuguese and the other Western European languages, plus symbols such as € and curly quotes. Letters such as ł, č or ğ, Greek and Cyrillic, Chinese and emoji can't be drawn. The tool lists the characters it can't use under the text field, so you can remove them or replace them with a plain letter."
  - q: "Why is the diagonal steeper on some pages?"
    a: "Diagonal runs from the bottom-left to the top-right corner of each page, so the angle follows the shape of the page: about 55 degrees on a portrait A4 page and about 35 degrees on a landscape one. With Fit to the page, the size is also worked out page by page. For the same angle everywhere, choose Custom and type the degrees."
  - q: "Does it work on rotated or cropped pages?"
    a: "Yes. The watermark is placed on the page as a PDF reader shows it, after rotation and inside the visible area, so it reads the right way up and sits in the middle of landscape scans, rotated pages and cropped pages alike. A logo stays upright too."
  - q: "The PDF has a digital signature. Can I add a watermark?"
    a: "You can, but saving changes the file, so a digital signature already in it, such as an Italian firma digitale, will no longer verify. If the document still has to be signed, add the watermark first and sign afterwards."
  - q: "Can I watermark a password-protected PDF?"
    a: "No, and the same goes for a PDF that opens freely but blocks printing or editing. Unlock PDF on this site removes a password you know, and removes those restrictions without one. Then add the watermark to the unlocked copy."
ui:
  watermark.drop.replace: "Choose another PDF"
  watermark.reading: "Opening {name}…"
  watermark.fileInfo.one: "{name}: {pages} page, {size}"
  watermark.fileInfo.other: "{name}: {pages} pages, {size}"
  watermark.opened.one: "{name} is open. It has {pages} page."
  watermark.opened.other: "{name} is open. It has {pages} pages."
  watermark.kind.legend: "Watermark"
  watermark.kind.text: "Text"
  watermark.kind.image: "Image"
  watermark.text.label: "Text"
  watermark.text.default: "CONFIDENTIAL"
  watermark.text.note: "For example CONFIDENTIAL, DRAFT or Copy for Mario Rossi."
  watermark.size.label: "Size in points"
  watermark.size.fit: "Fit to the page"
  watermark.bold: "Bold"
  watermark.color.legend: "Colour"
  watermark.color.grey: "Grey"
  watermark.color.red: "Red"
  watermark.color.blue: "Blue"
  watermark.color.black: "Black"
  watermark.color.custom: "Other colour"
  watermark.angle.legend: "Angle"
  watermark.angle.diagonal: "Diagonal"
  watermark.angle.horizontal: "Horizontal"
  watermark.angle.custom: "Custom"
  watermark.angle.degrees: "Degrees"
  watermark.layout.legend: "Layout"
  watermark.layout.single: "Centred"
  watermark.layout.tile: "Repeated"
  watermark.image.choose: "Choose an image"
  watermark.image.another: "Choose another image"
  watermark.image.note: "PNG or JPG. A logo on a transparent background (PNG) looks best."
  watermark.image.chosen: "{name}, {width} × {height} px"
  watermark.image.scale: "Width, share of the page"
  watermark.image.error.type: "{name} isn't a PNG or JPG image."
  watermark.image.error.decode: "{name} couldn't be opened as an image. Try saving it again as PNG."
  watermark.image.error.none: "Choose the image to use as a watermark."
  watermark.image.error.embed: "{name} couldn't be added to the PDF. Try saving it again as PNG or JPG."
  watermark.position.label: "Position"
  watermark.position.center: "Centre"
  watermark.position.top-left: "Top left"
  watermark.position.top-right: "Top right"
  watermark.position.bottom-left: "Bottom left"
  watermark.position.bottom-right: "Bottom right"
  watermark.opacity: "Opacity"
  watermark.pages.legend: "Pages"
  watermark.pages.all: "All pages"
  watermark.pages.some: "Only some pages"
  watermark.pages.label: "Pages"
  watermark.pages.placeholder: "1-3, 5, 8-"
  watermark.pages.hint: "Separate with commas. “8-” means page 8 to the end."
  watermark.pages.error.empty: "Type the pages you want, for example 1-3, 5, 8-."
  watermark.pages.error.syntax: "“{part}” is not a page or range. Use numbers like 5 or 1-3."
  watermark.pages.error.outOfRange.one: "“{part}” is outside the document, which has {pages} page."
  watermark.pages.error.outOfRange.other: "“{part}” is outside the document, which has {pages} pages."
  watermark.pages.error.reversed: "“{part}” goes backwards. Write the lower page number first."
  watermark.error.noText: "Type the text of the watermark."
  watermark.error.chars.one: "The standard PDF fonts can't draw this character: {chars}. Remove it or replace it."
  watermark.error.chars.other: "The standard PDF fonts can't draw these characters: {chars}. Remove them or replace them."
  watermark.preview.caption: "Preview of page {page} of {total}"
  watermark.preview.error: "Page {page} couldn't be drawn for the preview. The watermark will still be added."
  watermark.save: "Add watermark"
  watermark.saving: "Adding the watermark…"
  watermark.done.one: "Done: watermark on {pages} page, {size}."
  watermark.done.other: "Done: watermark on {pages} pages, {size}."
  watermark.download: "Download {name}"
  watermark.outputName: "{name}-watermarked.pdf"
  watermark.after: "Open the file and check it before you send it. To change something, adjust the settings above and add the watermark again."
---

## What people use it for

- **DRAFT on a draft.** A contract, a thesis chapter or a report sent round for comments is less likely to be taken for the final version, or printed and forwarded as if it were. Red, bold and diagonal at 20 to 30% opacity keep the text underneath easy to read.
- **CONFIDENTIAL on internal documents.** Reports, budgets and HR papers meant for a few colleagues. The word on every page reminds whoever opens the file, including someone who gets it later by mistake, that it wasn't meant to travel.
- **A name on a copy for one person.** When you send a copy of an identity card, a passport or a payslip to a landlord, an agency or a new employer, you can write on it who it is for and why, for example Copy for Rossi Lettings, rental application only. In Italy many people already do this on paper copies with a pen. If the copy turns up somewhere else, the text shows where it came from, and it is harder to reuse for something else. Choose Repeated, so the text also crosses the photo and the document number; a single line in a corner is easier to cut off.
- **A logo on quotes and portfolios.** Put your logo in a corner of every page of a quote, a price list or a set of drawings, or large and faint across a portfolio you send to a prospective client.

If your copy of an ID card is a photo, turn it into a PDF first with [JPG to PDF](/jpg-to-pdf/).

## What a watermark doesn't do

The watermark is added on top of the existing pages. It doesn't encrypt anything, and the text and pictures under it stay in the file as they were. Anyone with a PDF editor can select the watermark and delete it, and anyone can copy the text under it. That is enough to deter casual copying and to mark drafts and recipients, while someone determined to remove it will manage.

Other jobs need other tools:

- To decide who can open the file at all, add a password with [Protect PDF](/protect-pdf/). Add the watermark first, because the tools on this site can't open a password-protected file.
- To hide a name, an account number or a paragraph so that it is gone from the file, use [Redact PDF](/redact-pdf/). Text under a watermark can still be read and copied.

## Text watermarks

The text is one line of up to 200 characters. Line breaks and runs of spaces become single spaces.

- **Size.** With **Fit to the page** ticked, the text is made as large as fits on each page at the chosen angle, with a margin around it. Untick it to set the size in points, from 4 to 400. Bold is ticked at the start, since thicker letters stay visible at low opacity.
- **Colour.** Grey, red, blue or black, or any other shade from Other colour.
- **Angle.** Diagonal follows each page's own diagonal, Horizontal runs straight across, and Custom takes any angle from -180 to 180 degrees. With positive angles the text rises from left to right.
- **Layout.** Centred puts one copy in the middle of the page. Repeated covers the whole page with rows of copies, offset like bricks in a wall, at the size you set in points; Fit to the page doesn't apply here. With very small text the copies are spaced further apart, so a page doesn't fill up with thousands of tiny ones.

## Logo watermarks

Choose Image and pick a PNG or JPG of up to 20 MB. A PNG with a transparent background looks best, because the page shows through around the logo; a JPG always brings a rectangle of its background colour with it. The logo keeps its proportions. **Width, share of the page** goes from 5% to 100% of the page width, and the logo is made smaller if it would not fit on the page otherwise. **Position** puts it in the centre or in one of the four corners, a small margin away from the edges. The logo is always drawn upright, and a phone photo stored sideways is turned the way your browser shows it.

Opacity goes from 5% to 100%, for text and logos alike. At around 30%, the starting value, the content underneath stays easy to read. A logo in the corner of a quote can go up to 100%, but then it covers whatever is printed in that corner, so check the preview.

## Choosing pages

The watermark goes on all pages unless you choose Only some pages. Then type pages and ranges separated by commas: 1-3, 5, 8- means pages 1 to 3, page 5 and page 8 to the end. The preview moves to the first page in the list. Every page is measured on its own, so in a file that mixes portrait and landscape pages, or A4 and Letter, each page gets the watermark centred on its own visible area.

## What changes in the file

Only the watermark is added. Text, images, links, bookmarks, form fields and document properties stay as they were, and the existing text can still be selected and searched. A text watermark is real text in Helvetica, so it stays sharp in print, and it may also turn up when someone searches the file or copies text from the page. Helvetica is not embedded in the file, so the letters can look slightly different from one PDF reader to another. A logo is stored once and reused on every page, so the file grows by roughly the size of the image; a text watermark adds very little.

Form fields and comments are drawn by the PDF reader above the page, so where they overlap the watermark they may cover it.

Two things can stop working: a digital signature already on the file, which no longer verifies once the file changes, and PDF/A compliance, because PDF/A expects every font to be embedded and some of its versions don't allow transparency. If an archive or an office asks for PDF/A, check the watermarked copy before you send it.

Your settings stay when you choose another PDF, so you can give several files the same watermark one after the other.

## Related tools

- To combine several documents before adding the watermark, use [Merge PDF](/merge-pdf/).
- To number the pages as well, use [Add page numbers to a PDF](/add-page-numbers-to-pdf/).
- To add your signature, use [Sign PDF](/sign-pdf/).
- Password-protected or restricted PDFs can't be opened here; [Unlock PDF](/unlock-pdf/) removes a password you know, and restrictions without one.
