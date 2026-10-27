---
title: "Unlock PDF: remove the password from a PDF | Eolietech"
description: "Remove the password from a PDF when you know it, or lift printing and copying restrictions. It runs in your browser, so the file and the password are never uploaded."
h1: "Unlock PDF"
intro: "Remove the password from a PDF you already know the password for, so the file opens without it and works in other PDF tools. Files that open freely but block printing, copying or editing have those restrictions removed, with no password needed. Nothing is guessed or cracked, and the PDF and the password stay in this browser tab."
howTo:
  - "Choose up to 10 PDFs, or drop them on the box above. Each one can be up to 200 MB."
  - "If the files ask for a password when you open them, type it in the Password field. For files that only block printing or copying, leave it empty."
  - "Press Unlock. The first time, your browser downloads the PDF engine once (about 1.3 MB)."
  - "Download each unlocked copy, or all of them as a .zip. If a file turns out to have no password, the tool says so and there is nothing to download."
faq:
  - q: "Can it remove a password I don't know or have forgotten?"
    a: "No. This tool never guesses or cracks passwords. A PDF with an open password is encrypted, and without that password there is nothing readable to work with. If someone sent you the file, ask them for the password or for a copy without one."
  - q: "What is the difference between a password and restrictions?"
    a: "An open password encrypts the whole file, and no reader can show it until the password is typed. Restrictions come from a second password, the permissions password: the file opens for anyone, but the reader is told to block printing, copying text or editing. Restrictions can be removed without knowing that second password, because the file already opens."
  - q: "My files have different passwords. What do I do?"
    a: "Type one of the passwords and press Unlock. The files it opens are unlocked, and the others are marked as needing a different password. Type the next password and press Unlock again: only the files that failed are tried again, and the ones already done stay ready to download."
  - q: "May I remove restrictions from any PDF?"
    a: "Use it on your own documents, or on ones you have the right to print and edit, such as a form you were asked to fill in. Restrictions are often there to protect someone else's work, and removing them from the file does not change what you are allowed to do with its content."
  - q: "Why does it say my file has nothing to unlock?"
    a: "The file has no encryption at all: no password to open it and no restrictions. The tool leaves it alone and offers no download. If your reader still will not let you edit it, the reason lies elsewhere: the pages may be scans, or the document may carry a digital signature that the reader protects."
  - q: "Will the unlocked PDF look any different?"
    a: "No. The pages are not redrawn. Text, images, links, bookmarks and form fields are copied as they are and only the encryption is removed, so the size changes very little. One exception: a digital signature in the file will no longer show as valid, because the file has been rewritten."
  - q: "Are my PDF and my password uploaded?"
    a: "No. qpdf, an open-source PDF program compiled to WebAssembly, removes the encryption inside this browser tab. Websites that remove PDF passwords on their servers need both the file and its password, which is the pair you would least want to hand over. Here the only download is the engine, from this website."
---

## Two kinds of protection

A PDF can be locked in two ways, and this tool handles both.

- **A password to open it.** The file is encrypted, and your reader asks for the password every time. Type it in the Password field and the tool writes a copy with no encryption left. Next to the file you will see Password removed.
- **Restrictions on printing, copying or editing.** The file opens without a password, but the reader greys out Print, will not let you select text, or refuses to let you fill in or change a form. No password is needed for this: leave the field empty and the tool writes a copy without the restrictions. Next to the file you will see Restrictions removed.

If a file has both, typing the open password removes the restrictions as well.

## When it helps

- **Statements and payslips.** Banks, payroll services and utilities often send PDFs protected with a password, for example your date of birth or part of your tax number, which you then have to type every time you open them. An unlocked copy opens straight away.
- **Other PDF tools.** The other PDF tools on this site, including [Merge PDF](/merge-pdf/), [Split PDF](/split-pdf/), [Compress PDF](/compress-pdf/) and [Sign PDF](/sign-pdf/), cannot open a file that needs a password. Unlock it here first, then carry on there.
- **Printing a form.** A form you were sent to print and sign sometimes has printing blocked. Removing the restriction lets you print it.

An unlocked copy opens for anyone who gets hold of it. Keep it where you keep your other private documents, and delete it when you no longer need it. To send it on with a password again, use [Protect PDF](/protect-pdf/).

## What it will not do

It does not find, guess or crack passwords. If you have lost the password, the file cannot be opened here. Ask whoever sent it for the password or for a new copy; banks and employers can usually tell you which password they used, or let you download the document again from their website.

It does not change the content either. qpdf copies the pages, text, links, bookmarks, form fields and attachments exactly as they are; only the encryption goes.

## How it works

The tool runs [qpdf](https://github.com/qpdf/qpdf) 12.2.0, an open-source PDF library compiled to WebAssembly. Your browser downloads it from this site the first time you press Unlock (about 1.3 MB) and keeps it in its cache. For each file it first checks whether the PDF is encrypted and whether it needs a password to open. Then it writes a copy without encryption, using your password only for the files that need one, and checks that no encryption is left in the copy before offering it. The new file's name ends in -unlocked.pdf, and your original is not modified.

The PDFs and the password stay in this tab: nothing is uploaded and the password is not stored. You can add up to 10 files of up to 200 MB each.
