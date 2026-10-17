---
title: "Compress PDF files privately | Eolietech"
description: "Make PDFs smaller with Ghostscript running in your browser. Pick a quality level and compare sizes before you download. Nothing is uploaded."
h1: "Compress a PDF"
intro: "Shrink a PDF so it fits an email or an upload form. Choose how much quality you are willing to trade for size; the tool shows the size before and after, and keeps your original if it cannot do better."
howTo:
  - "Choose one or more PDFs, or drop them on the box above."
  - "Pick a quality level: Smallest file, Balanced or High quality. Balanced suits most documents."
  - "Press Compress. The first time, your browser downloads the compression engine once (about 15 MB)."
  - "Compare the sizes shown for each file and download the result. If a file did not get smaller, download the original instead."
faq:
  - q: "How much smaller will my PDF get?"
    a: "It depends on what is inside. Scans and documents with large photos often shrink a lot. Files that are mostly text, or that were already compressed, may barely change, and occasionally the output is larger. The tool always shows both sizes and offers the original when compression did not help."
  - q: "Are my files uploaded?"
    a: "No. Compression runs in your browser using Ghostscript compiled to WebAssembly. The only download is the engine itself, which comes from this website and is then cached by your browser. Your PDFs stay on your device."
  - q: "Which quality level should I choose?"
    a: "Smallest file reduces images to about 72 dpi, fine for reading on screen. Balanced uses about 150 dpi and is a good default for sharing. High quality keeps about 300 dpi for printing. Text and vector graphics stay sharp at every level; the levels mostly affect photos and scans."
  - q: "Why does the first compression take longer?"
    a: "The compression engine is about 15 MB. Your browser downloads it the first time you press Compress and keeps it in its cache, so later visits start faster. It is not downloaded until you ask to compress a file."
  - q: "Can I compress password-protected PDFs?"
    a: "Not if the file needs a password to open. Save an unprotected copy in your PDF reader first, then compress that copy."
ui:
  compress.preset.legend: "Quality"
  compress.preset.screen: "Smallest file"
  compress.preset.screen.hint: "Images at about 72 dpi. For reading on screen."
  compress.preset.ebook: "Balanced"
  compress.preset.ebook.hint: "Images at about 150 dpi. Good for email and sharing."
  compress.preset.printer: "High quality"
  compress.preset.printer.hint: "Images at about 300 dpi. For printing."
  compress.engineNote: "Compressing uses Ghostscript, which your browser downloads once ({size}) when you press Compress. It then runs on your device."
  compress.listLabel: "Files to compress"
  compress.action: "Compress"
  compress.added: "Added {count} file(s)."
  compress.removed: "Removed {name}."
  compress.removeLabel: "Remove {name}"
  compress.loadingEngine: "Downloading the compression engine ({size}, one time only)…"
  compress.downloading: "Downloading the compression engine: {loaded} of {total}"
  compress.fileStatus: "Compressing file {current} of {total}: {name}"
  compress.working: "Compressing…"
  compress.page: "Page {page} of {pages}"
  compress.result: "{before} → {after} ({percent}% smaller)"
  compress.notSmaller: "Could not make this file smaller ({before} → {after}). It is probably already well compressed, so keep the original."
  compress.done: "Finished. {count} file(s) ready."
  compress.downloadOriginal: "Download original"
  compress.downloadLabel: "Download {name}"
  compress.downloadOriginalLabel: "Download the original file {name}"
  compress.outputName: "{name}_compressed.pdf"
  compress.zipName: "compressed_pdfs.zip"
  compress.error.engine: "The compression engine could not be loaded. Check your connection and try again."
  compress.error.failed: "{name} could not be compressed. The file may be damaged or use features the engine does not support."
  pdf.error.encrypted: "{name} is password-protected or encrypted. Save an unprotected copy and try again."
  pdf.error.invalid: "{name} could not be read as a PDF. It may be damaged or not a PDF at all."
  pdf.error.failed: "Something went wrong while processing {name}."
---

## How it works

This tool runs [Ghostscript](https://www.ghostscript.com/), a long-established open-source PDF engine, inside your browser. It has been compiled to WebAssembly, so it runs on your own processor like any other part of the page. Ghostscript reads your PDF and writes a new one, re-compressing images at the resolution you picked, removing duplicate images and compressing fonts.

The engine is about 15 MB. To keep the page light it is not loaded until you press Compress, and the page tells you the size before it starts. After the first time your browser usually serves it from its cache.

## What to expect

Results vary a lot, and it is better to know that up front:

- **Scanned documents and photo-heavy PDFs** usually shrink the most, because their size comes from large images that can be stored at a lower resolution.
- **Text-only documents**, such as exports from a word processor, are often already compact. They may shrink a little or not at all.
- **Some files get bigger.** If the output is not smaller than the input, the tool says so and offers your original file instead of a worse one.

Text and vector graphics stay sharp at every setting. The quality levels mostly change how photos and scanned pages are stored, so if a scan becomes hard to read, try a higher level.

## Privacy and limits

Your PDFs never leave your device; only the engine is downloaded, from this site. Files that need a password to open cannot be compressed. Very large files need a lot of memory, so on phones it can help to compress one file at a time. Interactive form fields and some document extras may be flattened or dropped when Ghostscript rewrites the file, so keep your original. To shrink images before they go into a PDF, [Compress image](/compress-image/) can help.
