---
title: "Password protect a PDF in your browser | Eolietech"
description: "Add a password to a PDF and encrypt it with AES-256 without uploading anything. The file and the password stay on your device. Up to 10 PDFs at once."
h1: "Password protect a PDF"
intro: "Add a password to a PDF so that only people who know it can open the file. The PDF is encrypted with AES-256 inside this browser tab. Many websites that encrypt PDFs need you to upload the document and send them the password; here neither leaves your device."
howTo:
  - "Choose up to 10 PDFs, or drop them on the box above. Each one can be up to 200 MB."
  - "Type a password, then type it again under Confirm password. Every file in the list gets this same password."
  - "Press Protect. The first time, your browser downloads the PDF engine once (about 1.3 MB)."
  - "Download each protected copy, or all of them as a .zip. Before you send one, open it with the password to check it."
faq:
  - q: "Are my PDF and my password uploaded?"
    a: "No. The encryption is done by qpdf, an open-source PDF program compiled to WebAssembly, running in this browser tab. The only thing downloaded is the engine itself, from this website. The page does not save your password or send it anywhere."
  - q: "What happens if I forget the password?"
    a: "The protected copy can no longer be opened, by you or by anyone else. AES-256 has no back door, and this site never sees the password, so nobody can reset it for you. Keep the unprotected original somewhere safe, or store the password in a password manager."
  - q: "Will the recipient be able to open the file?"
    a: "Almost certainly, if their software is reasonably up to date. AES-256 is supported by Adobe Acrobat and Acrobat Reader, the PDF viewers built into Chrome, Edge, Firefox and Safari, Preview on the Mac and most PDF apps from roughly the last 15 years. A much older reader may refuse the password or say the file is damaged; a current one will open it."
  - q: "Can someone who has the password print or copy the PDF?"
    a: "Yes. The password decides who can open the file. It sets no limits on printing, copying text or editing, and once the file is open it can be saved without a password, printed or forwarded like any other PDF. Give the password only to people you would hand the document to."
  - q: "Why does it say my file already has a password or restrictions?"
    a: "The tool only encrypts PDFs that have no encryption yet, and leaves the others as they are. If a file already asks for a password, or blocks printing or copying, remove that first with Unlock PDF on this site, then protect the unlocked copy here."
  - q: "Can each file get a different password?"
    a: "Not in one go: all the files in the list get the password you typed. Download the protected copies, press Start over, add the next files and type their password. If you change the password before downloading, the results are cleared and you press Protect again."
  - q: "Why is my password too long?"
    a: "AES-256 in a PDF reads at most 127 bytes of the password. Letters without accents and digits take one byte each; accented letters, most symbols and emoji take two to four. So the limit is 127 plain characters, or fewer with accents. The tool refuses a longer password before it starts, because the protected file might then not open with the password you typed."
ui:
  password.added.one: "Added {count} file."
  password.added.other: "Added {count} files."
  password.removed: "Removed {name}."
  password.removeLabel: "Remove {name}"
  password.downloadLabel: "Download {name}"
  password.show: "Show password"
  password.engineNote: "This uses qpdf, an open-source PDF engine your browser downloads once ({size}) when you start. It then runs on your device."
  password.loadingEngine: "Downloading the PDF engine ({size}, one time only)…"
  password.done.one: "Finished. {count} file ready."
  password.done.other: "Finished. {count} files ready."
  password.error.engine: "The PDF engine could not be loaded. Check your connection and try again."
  password.error.failed: "Something went wrong while processing {name}. The file may be damaged."
  password.protect.label: "Password"
  password.protect.confirm: "Confirm password"
  password.protect.note: "Every file gets this password. Keep it somewhere safe: a forgotten password cannot be recovered."
  password.protect.action: "Protect"
  password.protect.listLabel: "Files to protect"
  password.protect.fileStatus: "Protecting file {current} of {total}: {name}"
  password.protect.working: "Protecting…"
  password.protect.result: "Protected with your password (AES-256)."
  password.protect.outputName: "{name}-protected.pdf"
  password.protect.zipName: "protected-pdfs.zip"
  password.protect.error.empty: "Type the password to protect the files with."
  password.protect.error.mismatch: "The two passwords do not match. Type the same password in both fields."
  password.protect.error.tooLong: "This password is too long for a PDF. Use at most 127 characters, fewer if it has accented letters or symbols."
  password.protect.error.encrypted: "{name} already has a password or restrictions. Unlock it first, then protect it again."
  password.unlock.label: "Password (if needed)"
  password.unlock.note: "Leave it empty if the file opens without a password. If several files need one, they must all use this password."
  password.unlock.action: "Unlock"
  password.unlock.listLabel: "Files to unlock"
  password.unlock.fileStatus: "Unlocking file {current} of {total}: {name}"
  password.unlock.working: "Unlocking…"
  password.unlock.result.password: "Password removed."
  password.unlock.result.restrictions: "Restrictions removed."
  password.unlock.notEncrypted: "{name} has no password or restrictions. There is nothing to unlock."
  password.unlock.outputName: "{name}-unlocked.pdf"
  password.unlock.zipName: "unlocked-pdfs.zip"
  password.unlock.error.needsPassword: "{name} needs a password to open. Type it in the Password field and press Unlock again."
  password.unlock.error.wrongPassword: "The password does not open {name}. Check it and press Unlock again."
---

## What the password protects

A PDF can carry two passwords. The open password, sometimes called the user password, is the one this tool adds: without it, a PDF reader cannot show anything in the file. The pages, text, images, form data and document properties such as title and author are all encrypted with AES-256, the strongest encryption the PDF format offers.

The other one is the permissions password, or owner password, which is meant to stop people from printing, copying or editing a file that otherwise opens freely. This tool sets none of those limits. The file still has to contain a permissions password, so the tool uses a random one, 64 characters long, that nobody sees and nobody will need. Restrictions only work when a PDF reader chooses to respect them, and many programs ignore them, so they would give a false sense of control.

The file name is not encrypted. If it is something like payslip-march-2026.pdf, anyone who sees the attachment can read that, so rename the file before you protect it if the name says too much.

## Choose a password that holds up

Anyone who gets hold of the file can try passwords on their own computer as many times as they like. There is no lockout after three wrong attempts, as there is with an online account, so the protection is only as strong as the password. A short word or a date of birth can be guessed quickly; a phrase of four or five unrelated words, or 12 or more mixed characters, takes far longer.

The password is used exactly as you type it, spaces and capitals included. Tick Show password to check it before you press Protect.

When you send a protected PDF, send the password another way: in a text message, in a phone call or in person. A password in the same email as the attachment protects nothing from someone who can read that email.

## What stays the same

qpdf does not redraw the pages. Text, fonts, images, links, bookmarks, form fields and attachments are copied as they are and only the encryption is added, so once the file is open everything works as before and the size changes very little. Your original file is not modified: the tool saves a new copy whose name ends in -protected.pdf.

Two things to keep in mind:

- **Protect last.** The other PDF tools on this site cannot open a file that needs a password. Compress, sign, redact or merge first, then add the password to the finished file.
- **Digital signatures.** Adding encryption rewrites the file, so a digital signature already in it, such as a firma digitale or a certificate signature added in Acrobat, will no longer show as valid. Keep the signed original as well.

## How it works

The tool runs [qpdf](https://github.com/qpdf/qpdf) 12.2.0, an open-source library for working with the structure of PDF files, compiled to WebAssembly. Your browser downloads it from this site the first time you press Protect (about 1.3 MB) and keeps it in its cache. For each file it checks that the PDF is not already encrypted, writes an encrypted copy, then opens that copy with your password to make sure it works before offering it for download.

Everything happens in this tab. The PDFs and the password are never uploaded, and the page does not store the password. You can add up to 10 files of up to 200 MB each. Very large files need a lot of memory, so on a phone it can help to protect them one at a time.

## Related tools

- To take the password off a PDF you know the password for, use [Unlock PDF](/unlock-pdf/).
- To remove a name or an account number for good before you share a file, use [Redact PDF](/redact-pdf/).
- To make a PDF small enough to email before you protect it, use [Compress PDF](/compress-pdf/).
