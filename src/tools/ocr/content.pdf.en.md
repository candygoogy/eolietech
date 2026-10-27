---
title: "OCR PDF: make a scanned PDF searchable, no upload | Eolietech"
description: "Turn a scanned PDF into one you can search and copy from. Tesseract reads each page in your browser and adds an invisible text layer. English and Italian."
h1: "OCR PDF"
intro: "A scanned PDF is only pictures of pages, so you can't search it or copy a sentence out of it. This tool reads every page and gives you back the same PDF with a hidden layer of text under the scan, plus the text on its own. Your file never leaves your device."
howTo:
  - "Choose a scanned PDF or drop it on the box above."
  - "Pick the language of the document. Pages that already have text you can select are left as they are, unless you tick Also read pages that already have text."
  - "Press Read text and keep the tab open while it works through the pages. You can stop at any time."
  - "Download the searchable PDF, named after your file with -ocr at the end, or just the text as a .txt file."
faq:
  - q: "Does the PDF look any different?"
    a: "No. The pages are copied over untouched: same scan, same size, same order. The text Tesseract recognised is added in invisible type, lined up with the words in the scan, so selecting, copying and searching work in any PDF reader. The file size barely changes."
  - q: "How long does it take?"
    a: "Each page is drawn at 300 dpi and read on its own, which takes a few seconds per page on a recent computer and longer on a phone or an older laptop. A long scan can take several minutes. Keep the tab open; the progress shows which page it's on, and you can stop whenever you want."
  - q: "How good is the text?"
    a: "Typed and printed documents scanned flat usually come out with few mistakes. Faint photocopies, skewed or low-resolution scans, handwriting and decorative fonts read much worse. When a document reads poorly the tool tells you. Search will find what Tesseract read correctly, so check names, numbers and amounts against the scan before you rely on them."
  - q: "Is my PDF uploaded?"
    a: "No. PDF.js draws each page inside your browser, Tesseract reads it in the same tab and pdf-lib writes the new file in the page's memory. The engine and the language data are the only downloads, and they come from this site."
  - q: "Is anything lost in the searchable copy?"
    a: "Every page is kept as it is. Document-wide extras are not carried over: bookmarks, fillable form fields and attached files. If you need those, keep the original next to the searchable copy."
  - q: "Can it handle a password-protected PDF?"
    a: "No. If you know the password, remove it with Unlock PDF on this site and use the unlocked copy."
---

## A searchable copy of your scan

When you scan a contract, a bank statement or an old letter, the PDF holds a picture of each page and nothing else. Tesseract reads the picture and writes down each word together with where it sits on the page. The tool then copies your original pages into a new PDF and lays that text over them in invisible type, word by word, the way scanners with built-in OCR do. The page looks exactly the same, but now you can find a name with Ctrl+F, select a paragraph and paste it into an email, and your computer's search can find the file by what it says.

## Pages that already have text

Many PDFs mix scanned pages with pages made on a computer. Pages that already have real text are not read again: they are copied as they are, and their text goes into the .txt as it is. If that text looks wrong, or your scanner adds a small printed stamp to every page, tick Also read pages that already have text and every page gets read.

## Private by design

Everything happens in this tab, and nothing is sent anywhere. To get the text out of photos and screenshots, use [Image to text](/image-to-text/). To shrink a big scan afterwards, use [Compress PDF](/compress-pdf/).
