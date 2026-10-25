---
title: "Screenshot to text (OCR): copy text from a screenshot | Eolietech"
description: "Copy the text out of a screenshot of a chat, an app, a video or a web page. OCR runs in your browser in English or Italian, and the screenshot is never uploaded."
h1: "Screenshot to text"
intro: "Some text you can see but can't select: a message inside an app, a caption on a paused video, a page that blocks copying, a slide someone shared on a call. Take a screenshot, add it here and you get the words back as plain text you can copy, search or paste somewhere else. The screenshot is read on your device and never uploaded."
howTo:
  - "Take the screenshot, cropped to the text if you can. The keys for Windows, Mac, iPhone and Android are listed further down."
  - "Choose the screenshot (PNG, JPG or WebP) or drop it on the box above. You can add up to 20 at once, for example a long chat captured in several parts."
  - "Pick the language of the text and press Read text. The first time, your browser downloads the reading engine and the language data from this site: about 7 MB for English."
  - "Press Copy text, or save the text as a .txt file named after the screenshot. With several screenshots, Download all puts all the text files in one .zip."
faq:
  - q: "Can I paste a screenshot instead of saving it first?"
    a: "Yes, on a computer. Copy the screenshot, then press Ctrl+V (Cmd+V on a Mac) anywhere on this page, as long as the cursor isn't in a text field. On a phone, save the screenshot and choose it instead."
  - q: "Are my screenshots uploaded?"
    a: "No. Your browser opens the screenshot and Tesseract, an open source text recognition engine, reads it inside this tab. The only things downloaded are the engine and the language data, both from this site. The text exists only on your device until you copy or save it."
  - q: "Why did it get some letters or numbers wrong?"
    a: "Screenshots are about the easiest thing to read, being sharp, flat and straight, so most mistakes come from tiny text, faint grey text, text over a picture, or unusual fonts. Look-alike characters are the usual trap: 0 and O, 1, l and I, rn and m. For anything you'll type in or pay with, such as a code, a password, an IBAN or a tracking number, check every character against the screenshot. When Tesseract is unsure about a file, the tool shows a note telling you to check it."
  - q: "Can it read a photo of a screen, or handwriting?"
    a: "A photo of a monitor or a phone reads much worse than a real screenshot: the angle, the glare and the faint pattern of the screen's pixels all confuse it. Take a screenshot on the device itself whenever you can. Handwriting mostly fails, including notes written with a stylus, because Tesseract is trained on printed text."
  - q: "Which languages does it read?"
    a: "English and Italian, or both at once for a screenshot that mixes them. Other languages written in the Latin alphabet may partly come through with their accented letters wrong. Languages with other alphabets won't work."
  - q: "What if my screenshot is a HEIC file, or won't open?"
    a: "Screenshots taken on an iPhone are saved as PNG and open fine. HEIC is the format of iPhone camera photos, which this tool can't open: convert them with HEIC to JPG first, which also runs on your device. If a file still won't open, it may be damaged or in a format your browser can't show; opening it and taking a new screenshot of it works around that."
ui:
  ocr.drop.label: "Choose screenshots or drop them here"
  ocr.drop.hint: "PNG, JPG or WebP. Read on your device, never uploaded."
  ocr.zipName: "text-from-screenshots.zip"
---

## Taking the screenshot

The less there is around the text, the better the result, so capture just the part you need when your device lets you.

- Windows: press Windows key + Shift + S and drag a box around the text. The snip is copied to the clipboard; click the notification that appears to open it in Snipping Tool and save it. Windows key + PrtScn saves the whole screen in Pictures > Screenshots.
- Mac: press Cmd + Shift + 4 and drag around the text. The screenshot is saved on the desktop as a PNG. Cmd + Shift + 3 takes the whole screen. Add Control to either shortcut to copy the screenshot to the clipboard instead of saving it.
- iPhone: on models with Face ID, press the side button and volume up at the same time. On models with a Home button, press the Home button and the side (or top) button. Tap the thumbnail that appears to crop it before it goes into Photos.
- Android: on most phones, press the power button and volume down together. The screenshot goes into your gallery, usually in a Screenshots album.

## Getting a clean read

Crop to the text. Icons, profile pictures, menus and the keyboard turn into stray characters at the top and bottom of the result. If the screenshot is already taken, [Crop image](/crop-image/) trims it on your device.

Zoom in before you capture. Bigger letters mean fewer mistakes. In a browser, Ctrl and + (Cmd and + on a Mac) enlarges the page; on a phone, pinch to zoom. Screenshots whose longest side is under 2,000 pixels, which includes most cropped ones, are enlarged to twice their size before reading, but that can't add detail the capture didn't have.

Dark mode is fine most of the time: light text on a dark background usually reads, though dark text on a light background reads more reliably. If words are missing, switch the app to light mode and capture again. Grey text on a grey background, and captions over a busy video frame, are the hardest cases.

Pick the language the text is written in: with Italian selected, words like perché and città keep their accents. Choose both only when the screenshot really mixes the two, since it's a little slower.

## What the text looks like

You get plain text, line by line in reading order, with blank lines between separate blocks. Everything visual is gone. In a chat, the bubbles no longer show who wrote what, so a message is only tied to a person if their name appears in the shot, as it does in group chats. A table comes out as lines of words with no columns, and sometimes one column is read from top to bottom before the next. Indentation in code is lost, links become ordinary text, and emoji and icons are dropped or turn into odd characters.

Each screenshot gets its own text. If you captured a long conversation in several parts, add them in order, then copy each text in turn, or use Download all and join the .txt files.

## Screenshots often hold private things

People screenshot chats, bank apps, booking confirmations, delivery addresses, two-factor backup codes and work documents. Those are exactly the images you shouldn't hand to an online converter. Here nothing is sent to a server: the screenshot is opened in this tab and the text is produced there. You can add up to 20 files of up to 50 MB each, read one at a time, and stop whenever you like.

For photos of documents and scanned pages, [Image to text](/image-to-text/) has the full details on how the reading works. To make a scanned PDF searchable, use [OCR PDF](/ocr-pdf/).
