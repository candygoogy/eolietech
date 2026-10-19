---
title: "P7M to PDF: get the PDF out of a signed file | Eolietech"
description: "Turn a .pdf.p7m back into the PDF you can open, print and send. The signature is checked on the way, and nothing leaves your browser."
h1: "P7M to PDF"
intro: "Got a contract.pdf.p7m that nothing will open? The PDF is inside, untouched. Drop the file here to save it as a normal PDF, and see who signed it while you're at it. Nothing is uploaded."
howTo:
  - "Choose your .pdf.p7m files or drop them on the box above. You can add up to 20 at a time, and files signed twice (.pdf.p7m.p7m) work too."
  - "Check who signed each one and whether the line under the signer is green: that means the PDF hasn't changed since it was signed."
  - "Press Download PDF to save it, or Open to look at it in a new tab first. With more than one file, Download all gives you a .zip."
faq:
  - q: "Is the PDF converted or rebuilt?"
    a: "No. A .pdf.p7m already contains the PDF exactly as it was signed. This page takes it out of the envelope without changing a byte, so it looks and prints the same as the signer's copy."
  - q: "Is the PDF I download still signed?"
    a: "No. The signature lives in the .p7m envelope, not in the PDF, so the file you save is the plain original. Keep the .p7m too if you may ever need to prove who signed it."
  - q: "My file is a .xml.p7m. Can I get a PDF of it?"
    a: "The envelope holds an XML file, usually an Italian e-invoice, which has no page layout to save as a PDF. Drop the same .p7m file on FatturaPA to PDF, which lays the invoice out as a page and saves it as a PDF."
  - q: "Are my files uploaded?"
    a: "No. The envelope is opened and the signature checked inside your browser tab. Nothing goes over the network."
ui:
  p7m.drop.hint: "A .pdf.p7m or other .p7m. It never leaves your device."
  p7m.fattura: "This is an Italian e-invoice: an XML file with no page layout of its own. To get a PDF of it, drop the same .p7m file on"
  p7m.fattura.link: "FatturaPA to PDF"
  p7m.fattura.href: "/fatturapa-to-pdf/"
---

## The PDF is already in there

A file called contract.pdf.p7m is contract.pdf sealed in a digital signature envelope. The format, CAdES, puts the original PDF, the signature and the signer's certificate into one file, and most computers have no app for it. Opening the envelope gives you back the PDF exactly as it was signed. Nothing is converted, so the text, the fonts and the pages are the same.

## Do you still need the .p7m?

The PDF you save is the plain original, without the signature. That's fine for reading, printing or forwarding it. If you may need to prove who signed it and that it hasn't changed since, for example with an office or in a dispute, keep the .p7m as well. The signature lives only there.

If you sign documents yourself and the recipients struggle with .p7m files, most signing apps can also make a signed PDF (the PAdES format). The signature then sits inside the PDF, and any PDF reader opens it.

## What the green line means

Each signer gets a line with the result of the check. Green means the PDF's fingerprint matches the one that was signed and the signature was made with the key of the certificate in the file. It does not confirm that the certificate was qualified or not revoked: that needs an online check, and the [verifiers listed by AgID](https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica) (page in Italian) do it. For other kinds of .p7m, such as e-invoices, [Open P7M files](/open-p7m-file/) explains what you'll find inside.
