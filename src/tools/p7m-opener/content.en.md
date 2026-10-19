---
title: "Open P7M files: get the document out and check the signature | Eolietech"
description: "Open signed .p7m files in your browser: save the PDF or XML inside, see who signed it and when, and check the signature. Nothing is uploaded."
h1: "Open P7M files"
intro: "A .p7m file is a document sealed inside a digital signature, and most computers can't open it. Drop it here to get the original PDF, XML or other file back, see who signed it and when, and check that it hasn't changed since. It all happens in your browser."
howTo:
  - "Choose your .p7m files or drop them on the box above. You can add up to 20 at a time, including .pdf.p7m, .xml.p7m and files signed twice (.p7m.p7m)."
  - "Read who signed each one: the name, the tax code, the authority that issued the certificate and the date of the signature."
  - "Look at the line under each signer. Green means the document hasn't changed since it was signed and the signature matches the certificate."
  - "Download the document inside, or open a PDF in a new tab. With more than one file, Download all gives you a .zip."
faq:
  - q: "Are my files uploaded?"
    a: "No. This page opens the envelope and checks the signature inside your browser tab, with the browser's own cryptography. Nothing goes over the network, which you can check in your browser's developer tools while you use it."
  - q: "Does a green result mean the signature is legally valid?"
    a: "Not on its own. Green means the document is exactly what was signed and the signature was made with the key of the certificate in the file. It does not prove that the certificate is a qualified one or that it hadn't been revoked when the file was signed; that takes an online check with the authority that issued it. For a check with legal value, use one of the verifiers listed by AgID, the Italian digital agency."
  - q: "Why does it say my file holds only the signature?"
    a: "Some signatures travel separately from the document they sign. A .p7s file, or a .p7m saved that way, holds the signature and the certificate but not the document itself, so there is nothing to extract. You need the original file that came with it. The smime.p7s attached to every PEC message is this kind: it is the provider's signature on the email, and your documents are the other attachments."
  - q: "What is a .p7m.p7m file?"
    a: "A document signed twice: someone signed it, then a second person signed the already signed file, so the first envelope sits inside a second one. This page opens every envelope, up to five, and lists the signers of each, outermost first."
  - q: "Is the PDF I download still signed?"
    a: "No. The signature lives in the envelope, not in the PDF, so the file you save is the plain original. Keep the .p7m if you may ever need to prove who signed it."
ui:
  p7m.drop.hint: "Any .p7m file. Opened on your device, never uploaded."
  p7m.progress: "Progress"
  p7m.list: "Your files"
  p7m.note: "This page checks the signature mathematically: the document is unchanged and the signature matches the certificate inside the file. It does not confirm that the certificate is a qualified one or that it hadn't been revoked; that takes an online check with the authority that issued it. For a check with legal value, use one of the"
  p7m.note.link: "verifiers listed by AgID"
  p7m.note.end: " (page in Italian)."
  p7m.note.href: "https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica"
  p7m.type.pdf: "PDF document"
  p7m.type.xml: "XML file"
  p7m.type.image: "{format} image"
  p7m.type.zip: "ZIP archive"
  p7m.type.unknown: "File of an unknown type"
  p7m.layer: "Envelope {n} of {total}"
  p7m.layer.outer: "(the outer one, signed last)"
  p7m.layer.inner: "(the one holding the document)"
  p7m.layer.empty: "No signature in this envelope."
  p7m.signer.unnamed: "Signer not named in the file"
  p7m.signer.taxCode: "Tax code: {code}"
  p7m.signer.id: "ID: {id}"
  p7m.signer.organization: "Organization: {name}"
  p7m.signer.issuer: "Certificate issued by: {name}"
  p7m.signer.signedOn: "Signed on {date}"
  p7m.signer.validity: "Certificate valid from {from} to {until}"
  p7m.signer.notValidAtSigning: "The certificate was not valid on the date of the signature."
  p7m.signer.timestamp: "Timestamp attached (not checked here)"
  p7m.check.valid: "Signature intact: the document hasn't changed since it was signed, and the signature matches the certificate."
  p7m.check.changed: "Doesn't match: the document was changed after it was signed."
  p7m.check.damaged: "Doesn't match: the signature is damaged or wasn't made with this certificate."
  p7m.check.noCertificate: "Not checked: the file doesn't include the signer's certificate, so there is nothing to check the signature against."
  p7m.check.noWebCrypto: "Not checked: this browser can't run the check. A recent Chrome, Firefox, Edge or Safari can."
  p7m.check.unsupported: "Not checked: the signature uses a method ({method}) your browser can't check."
  p7m.notPdf: "This one doesn't hold a PDF. You can still download what's inside as it is."
  p7m.fattura: "This is an Italian e-invoice. To read it as a clear page, drop the same .p7m file on the"
  p7m.fattura.link: "e-invoice viewer"
  p7m.fattura.href: "/fatturapa-viewer/"
  p7m.status.reading: "Opening ({size})…"
  p7m.error.not-p7m: "this isn't a signed .p7m file. If it is already a PDF or an XML file, you can open it directly."
  p7m.error.detached: "it holds only the signature, not the document. The signed document is a separate file that should have come with it."
  p7m.error.malformed: "this file is damaged or incomplete, so the document inside can't be read. Try downloading it again."
  p7m.error.too-deep: "it has more than five envelopes one inside the other, which this page doesn't open."
  p7m.downloadPdf: "Download PDF"
  p7m.downloadPdfNamed: "Download PDF {name}"
  p7m.downloadNamed: "Download {name}"
  p7m.open: "Open"
  p7m.openNamed: "Open {name} in a new tab"
  p7m.removeFile: "Remove from list"
  p7m.removeNamed: "Remove {name} from the list"
  p7m.zipName: "documents-from-p7m.zip"
  p7m.summary.reading.one: "Opening: {done} of {total} file."
  p7m.summary.reading.other: "Opening: {done} of {total} files."
  p7m.summary.opened.one: "{count} document extracted."
  p7m.summary.opened.other: "{count} documents extracted."
  p7m.summary.valid.one: "The signature is intact."
  p7m.summary.valid.other: "All {count} signatures are intact."
  p7m.summary.invalid.one: "{count} has a signature that doesn't match."
  p7m.summary.invalid.other: "{count} have signatures that don't match."
  p7m.summary.unchecked.one: "{count} could not be checked."
  p7m.summary.unchecked.other: "{count} could not be checked."
  p7m.summary.failed.one: "{count} could not be opened."
  p7m.summary.failed.other: "{count} could not be opened."
---

## What a .p7m file is

A .p7m is an envelope. Inside it are the original document, one or more digital signatures, and the certificate of each person who signed. The format is called CAdES, a European standard built on the older PKCS#7, which is where the extension comes from. The document keeps its own name in front: contract.pdf.p7m holds contract.pdf, invoice.xml.p7m holds invoice.xml.

Your computer sees one unfamiliar file and has no app for it. Open the envelope and the document inside is the same file the signer had, byte for byte.

## Why you get them in Italy

Italian law gives a qualified digital signature (firma digitale) the same value as a handwritten one, and many of the signing apps that come with Italian signature kits save a CAdES envelope unless you ask for a signed PDF instead. So signed contracts, documents filed with public offices and papers sent by accountants and notaries often arrive as .p7m, usually as attachments to a PEC, the Italian certified email.

E-invoices are the other big source. Invoices sent to public offices have to be signed, and a CAdES envelope is one of the two accepted ways to do it, so many of them travel as .xml.p7m. Invoices between businesses can be signed the same way. When the document inside is an e-invoice, this page tells you, and the [e-invoice viewer](/fatturapa-viewer/) shows it as a readable page.

## Signed twice: .p7m.p7m

When a second person signs a file that is already signed, many apps wrap the whole envelope in a new one. The result ends in .p7m.p7m and holds two envelopes, one inside the other. This page opens them all, up to five, and lists the signers of each envelope, starting from the outer one, which is the signature added last. One envelope can also hold several signatures side by side; you see each of them.

## What the check covers, and what it doesn't

For every signature, the page checks two things. First, that the document's fingerprint matches the one the signer sealed, which proves that not a single byte has changed since. Second, that the signature was made with the private key belonging to the certificate in the file. If both hold, the line turns green.

What it can't see from inside your browser: whether the certificate comes from a qualified provider on the European trusted lists, and whether it was revoked before the signature, for example because the smart card was lost. Both need an online check with the authority that issued it. A timestamp attached to the file is noted but not checked either. For a verification with legal value, use one of the [verifiers listed by AgID](https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica) (page in Italian).

## Private by design

The files are read from your disk and opened in this browser tab, and the signature is checked with the cryptography built into your browser. Nothing is sent anywhere, which matters for contracts and invoices full of names and tax codes. If the document inside is a PDF you need to tidy up, [Merge PDF](/merge-pdf/) and [Compress PDF](/compress-pdf/) work the same way.
