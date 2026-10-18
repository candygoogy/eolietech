---
title: "Merge PDF files in your browser | Eolietech"
description: "Combine several PDFs into one file, in the order you choose. Merging runs in your browser, so your documents are never uploaded. Free, no account."
h1: "Merge PDF files"
intro: "Put several PDFs together into a single document. Add the files, arrange them in the order you want, and download one combined PDF. The work happens on your device: nothing is sent to a server."
howTo:
  - "Choose your PDF files or drop them on the box above. You can add more at any time."
  - "Arrange the files: drag them with the mouse, or use the Move up and Move down buttons. Remove any file you added by mistake."
  - "Press Merge PDFs. Pages are joined in list order, each file's pages staying in their original order."
  - "Download the combined PDF and check it in your usual PDF reader."
faq:
  - q: "Are my files uploaded anywhere?"
    a: "No. The merge runs in your browser with the open-source pdf-lib library. Your PDFs are read from your disk into the page's memory and the result is saved back to your disk. You can disconnect from the internet after the page has loaded and the tool still works."
  - q: "Can I merge password-protected PDFs?"
    a: "No. Encrypted PDFs cannot be combined here. Open the file in a reader that knows the password, save an unprotected copy, and add that copy instead."
  - q: "Do links, bookmarks and form fields survive?"
    a: "Page content, including text, images and vector graphics, is copied exactly. Document-level extras such as the bookmark outline, and form fields that span several files, may not carry over, so check the result if you rely on them."
  - q: "Is there a limit on the number or size of files?"
    a: "You can add up to 50 files of up to 500 MB each. In practice the limit is your device's memory: very large batches can be slow on phones or older computers."
  - q: "Will merging reduce quality?"
    a: "No. Pages are copied as they are, without re-compressing images or converting text, so the combined file looks exactly like the originals."
ui:
  merge.drop: "Choose PDF files or drop them here"
  merge.listLabel: "Files to merge, in order"
  merge.orderHint: "Pages are merged from top to bottom. Drag files to reorder them, or use the Move buttons."
  merge.action: "Merge PDFs"
  merge.added: "Added {count} file(s)."
  merge.reading: "Reading…"
  merge.pages: "Pages: {count}"
  merge.moveUp: "Move up"
  merge.moveDown: "Move down"
  merge.moveUpLabel: "Move {name} up"
  merge.moveDownLabel: "Move {name} down"
  merge.removeLabel: "Remove {name}"
  merge.moved: "{name} is now number {position} of {total}."
  merge.removed: "Removed {name}."
  merge.working: "Merging {count} files…"
  merge.done: "Done: one PDF with {pages} pages ({size})."
  merge.download: "Download merged PDF ({pages} pages, {size})"
  merge.outputName: "merged.pdf"
---

## Why merge PDFs in the browser

Most online PDF mergers upload your files to their servers, process them there and send the result back. That works, but it means a copy of your contract, bank statement or medical letter sits on someone else's computer, at least for a while. This tool skips that step. The page loads a PDF library into your browser, and your files are combined in memory on your own device.

## What happens to the pages

Each page is copied into the new document as it is. Text stays selectable, vector drawings stay sharp, and images are not re-compressed, so the merged file looks the same as the originals. The order is simple: all pages of the first file in the list, then all pages of the second, and so on.

If you need to change the page order *inside* a file, rotate a scanned page or drop a blank one, merge first and then open the result in [Organize PDF pages](/organize-pdf/).

## Things to know

- **Encrypted files are skipped.** A PDF that needs a password, or that uses encryption to restrict editing, cannot be merged here. The tool tells you which file is the problem.
- **Extras may not carry over.** Bookmarks (the outline in a reader's sidebar), and some interactive form features, belong to a whole document rather than to pages, so they may be missing from the combined file.
- **Big jobs take memory.** All files are held in your browser's memory while you work. Dozens of large scans can be slow on a phone. Closing other tabs helps.
- **File size adds up.** The merged PDF is roughly the sum of the inputs. If it is too large to email, try [Compress PDF](/compress-pdf/) on the result.
