---
title: "Sign PDF: add your signature to a PDF in your browser | Eolietech"
description: "Draw your signature or use a photo of it, place it on any page of a PDF, add the date and save a signed copy. The PDF is never uploaded and your signature is never stored."
h1: "Sign PDF"
intro: "Sign a PDF the way you'd sign a printout, without the printer. Draw your signature or use a photo of it, put it where it goes, add the date if the form asks for one, and save. The file and your signature stay on this page."
howTo:
  - "Choose the PDF or drop it on the box above."
  - "Draw your signature with a mouse, a finger or a stylus, or use a photo of it signed on white paper."
  - "Go to the right page and click or tap where the signature goes. Drag it into place and pull a corner to resize it. Choose Date to add today's date the same way."
  - "Press Save signed PDF, download the copy and look through it before you send it."
faq:
  - q: "Is this a digital signature?"
    a: "No. It adds a picture of your signature to the page, the same thing you get when you sign a printout and scan it. It shows the document was signed, but it doesn't prove who signed it, and anyone could edit the file afterwards. A digital signature (in Italy a firma digitale, or a qualified or advanced electronic signature) is made with tools that tie it to you in a way that can be checked, and that is a different job."
  - q: "Will people accept a PDF signed like this?"
    a: "That depends on who asked for it. Plenty of everyday paperwork only needs a signed copy, and this gives the same result as a scan with cleaner pages. When a document needs legal weight, for example many forms for Italian public offices, you'll be asked for a firma digitale instead. If you're not sure, ask whoever sent you the document which kind of signature they accept."
  - q: "Is my signature saved anywhere?"
    a: "No. It lives in this page's memory while you work. It isn't sent to a server and it isn't kept in your browser's storage, so closing the tab or pressing Start over removes it. The PDF isn't uploaded either."
  - q: "My photo still shows grey paper or a shadow. What can I do?"
    a: "Move the Remove the paper slider to the right until the background is gone. Even light helps most: take the photo near a window and keep your own shadow off the page. If the edges of the photo are dark, crop it close to the signature first."
  - q: "The PDF already has a digital signature. Can I add mine?"
    a: "You can, but saving changes the file, so the earlier digital signature will no longer verify. If a document carries digital signatures, the next person to sign it usually needs one too."
  - q: "Can I sign a password-protected PDF?"
    a: "No. If you know the password, remove it with Unlock PDF on this site and sign the unlocked copy."
ui:
  sign.drop.replace: "Choose another PDF"
  sign.reading: "Opening {name}…"
  sign.fileInfo.one: "{name}: {pages} page, {size}"
  sign.fileInfo.other: "{name}: {pages} pages, {size}"
  sign.opened.one: "{name} is open. It has {pages} page."
  sign.opened.other: "{name} is open. It has {pages} pages."
  sign.step.signature: "Your signature"
  sign.mode.legend: "How do you want to add it?"
  sign.mode.draw: "Draw it"
  sign.mode.upload: "Use a photo"
  sign.pad.placeholder: "Sign here"
  sign.pad.a11y: "Drawing needs a mouse, a finger or a pen. You can use a photo of your signature instead."
  sign.pad.note: "Sign with your mouse, a finger or a stylus. It doesn't have to fill the box: the empty space is trimmed off."
  sign.pad.undo: "Undo stroke"
  sign.pad.clear: "Clear"
  sign.pad.cleared: "The signing box is empty."
  sign.ink.legend: "Ink"
  sign.ink.black: "Black"
  sign.ink.blue: "Blue"
  sign.photo.choose: "Choose a photo of your signature"
  sign.photo.another: "Choose another photo"
  sign.photo.note: "Sign a sheet of white paper and take the photo from straight above, in good light. JPG, PNG or WebP."
  sign.photo.clean: "Remove the paper"
  sign.photo.cleanHint: "Slide right if grey paper or shadows are left. Slide left if thin strokes start to disappear."
  sign.photo.previewAlt: "Your signature with the paper removed"
  sign.photo.error.type: "{name} isn't a JPG, PNG or WebP image."
  sign.photo.error.decode: "{name} couldn't be opened as an image. Try saving it as JPG or PNG."
  sign.photo.error.empty: "At this setting nothing of the signature is left. Slide to the left."
  sign.step.place: "Put it on the page"
  sign.arm.legend: "What to place"
  sign.kind.sig: "Signature"
  sign.kind.date: "Date"
  sign.date.label: "Date format"
  sign.page.label: "Page"
  sign.page.prev: "Previous page"
  sign.page.next: "Next page"
  sign.page.option: "Page {page} of {total}"
  sign.page.optionPlaced.one: "Page {page} of {total}, {count} item placed"
  sign.page.optionPlaced.other: "Page {page} of {total}, {count} items placed"
  sign.page.error: "Page {page} couldn't be drawn. You can still place your signature on it."
  sign.add.sig: "Add signature to this page"
  sign.add.date: "Add date to this page"
  sign.place.hint: "Click or tap the page where your signature goes. Drag it to move it and pull a corner to resize it. With the keyboard, the arrow keys move it (hold Shift for bigger steps), Alt with the arrows resizes it and Delete removes it."
  sign.place.hintDate: "Click or tap the page where the date goes. Drag it to move it and pull a corner to resize it. With the keyboard, the arrow keys move it (hold Shift for bigger steps), Alt with the arrows resizes it and Delete removes it."
  sign.box.role: "movable image"
  sign.state: "{what} on page {page}: {width} by {height} mm, {x} mm from the left edge and {y} mm from the top."
  sign.announce.placed: "{what} placed on page {page}."
  sign.announce.removed: "{what} removed from page {page}."
  sign.remove.sig: "Remove this signature from page {page}"
  sign.remove.date: "Remove this date from page {page}"
  sign.error.noSignature: "Draw your signature or choose a photo of it first, then click the page again."
  sign.error.nothingPlaced: "Nothing is on the pages yet. Click the page where your signature goes."
  sign.save: "Save signed PDF"
  sign.saving: "Saving the signed PDF…"
  sign.done.one: "Done: signed on {pages} page, {size}."
  sign.done.other: "Done: signed on {pages} pages, {size}."
  sign.download: "Download {name}"
  sign.outputName: "{name}-signed.pdf"
  sign.after: "Open the file and check every page before you send it. To change something, move or remove items above and save again."
---

## A picture of your signature, not a digital signature

This tool does on screen what you'd do with a pen and a scanner: it puts an image of your signature on the page. That is enough for a lot of everyday paperwork, such as a rental form, a school permission slip or a signed quote you send back by email. It doesn't prove who signed, and it isn't a digital signature.

In Italy, documents that need legal weight are signed with a **firma digitale**, using a smart card, a USB key or a remote signing service from a certified provider. Files signed that way often arrive as **.p7m**, and you can open them with [Open P7M files](/open-p7m-file/).

## Getting a clean signature

**Drawing** works best with a finger on a phone or a stylus on a tablet; a mouse is fine for short signatures. Sign at your normal size and speed. The tool smooths the strokes, trims the empty space and keeps the ink transparent, so the page shows through around it. Choose black or blue ink before or after you sign.

**A photo** gives you your real pen signature. Sign a sheet of plain white paper with a dark pen, then photograph it from straight above in daylight. The tool turns the paper transparent, keeps the colour of the ink and crops to the signature. If the photo has dark edges or a lot of background, [crop it](/crop-image/) close to the signature first.

## What changes in the file

Only the images you placed are added. The text, links, form fields, bookmarks and number of pages stay the same, and the text stays selectable and searchable as before. If the PDF already carries a digital signature, that signature stops verifying once the file is changed, as it would with any editor.

## Your signature stays with you

The PDF is read and saved inside your browser, and your signature only exists in this page's memory while you work. It is never sent anywhere and never stored: close the tab and it's gone. Next time you need it, draw it again or reuse the same photo.

## Related tools

- To open a document someone signed with a firma digitale, use [Open P7M files](/open-p7m-file/).
- To put the signed pages together with other documents, use [Merge PDF](/merge-pdf/).
- Password-protected PDFs can't be opened here; remove a password you know with [Unlock PDF](/unlock-pdf/) first.
