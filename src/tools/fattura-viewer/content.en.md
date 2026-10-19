---
title: "Italian e-invoice viewer: open FatturaPA XML and .p7m | Eolietech"
description: "Open Italian electronic invoices in XML, signed .xml.p7m files included, and read them as a clear page or save them as PDF. All in your browser; the invoice is never uploaded."
h1: "Italian e-invoice viewer"
intro: "The .xml file of an Italian e-invoice is not meant for human eyes. Drop it here, even if it is a signed .p7m, and you get the supplier, lines, VAT and payment laid out like a paper invoice. Save it as a PDF if you need one. The file stays on your device."
howTo:
  - "Choose your invoices or drop them on the box above. Both .xml and .xml.p7m files work, up to 50 at a time."
  - "Each invoice gets a row with the supplier, number, date and total. For a signed file, a line underneath says who signed it and whether the signature matches."
  - "Press View to read the whole invoice: both parties, the lines, the VAT summary, the payment details and any attachments."
  - "Press Download PDF to save a readable copy, or Download all PDFs to get them in one .zip."
faq:
  - q: "Is my invoice uploaded to a server?"
    a: "No. Your browser reads the file inside this tab, and the PDF is made here too. Invoices hold tax codes, addresses and bank details; none of it goes over the network, which you can check in your browser's developer tools while you use the page."
  - q: "Is the PDF a legal invoice?"
    a: "No. It is a readable copy, like the courtesy copy a supplier sometimes emails. The legal invoice is still the XML file that went through the SdI exchange system, and that is the one to keep. The PDF says so at the bottom of every page."
  - q: "What does it mean when the signature matches?"
    a: "That the content of the .p7m file is exactly what was signed, and the signature checks out against the certificate inside the file. This page does not check whether that certificate was valid or who issued it, since that needs the network. Open P7M files shows all the details."
  - q: "My file holds several invoices. Does that work?"
    a: "Yes. One XML file can carry several invoices from the same supplier to the same customer, a batch. Each one gets its own row and its own PDF."
  - q: "Does it read simplified invoices and invoices to public bodies?"
    a: "Yes: FPR12 (between businesses and to consumers), FPA12 (to the public administration) and FSM10 (simplified invoice). Codes such as TD01, N2.2 or MP05 are turned into words, following version 1.9 of the Agenzia delle Entrate technical specifications. A code the page does not know is shown as it is."
ui:
  fv.drop.hint: ".xml or .xml.p7m files. Read on your device; nothing is uploaded."
  fv.progress: "Progress"
  fv.list: "Your invoices"
  fv.view: "View"
  fv.hide: "Close"
  fv.viewNamed: "View the invoice from {name}"
  fv.hideNamed: "Close the invoice from {name}"
  fv.downloadPdf: "Download PDF"
  fv.downloadPdfNamed: "Download {name}"
  fv.downloadAllPdf: "Download all PDFs (.zip)"
  fv.zipName: "invoices-pdf.zip"
  fv.removeFile: "Remove from list"
  fv.removeNamed: "Remove {name} from the list"
  fv.fileOf: "{name}, invoice {n} of {count}"
  fv.attachmentNamed: "Download the attachment {name}"
  fv.attachmentFallback: "attachment-{n}"
  fv.status.reading: "Reading…"
  fv.status.zipping: "Making the PDFs…"
  fv.sig.byOn: "Signed by {name} on {date}."
  fv.sig.by: "Signed by {name}."
  fv.sig.signed: "Signed file (.p7m)."
  fv.sig.more.one: "{name} and one other person"
  fv.sig.more.other: "{name} and {count} other people"
  fv.sig.valid: "The signature matches: the file has not changed since it was signed."
  fv.sig.invalid: "The signature does not match: the file may have been changed after signing."
  fv.sig.unsupported: "This signature cannot be checked here."
  fv.sig.link: "Signature details"
  fv.sig.href: "/open-p7m-file/"
  fv.error.xml: "this is not a readable XML file. It may be incomplete or damaged: try downloading it again."
  fv.error.not-invoice: "this is an XML file, but not an Italian e-invoice."
  fv.error.empty: "this e-invoice has no document inside."
  fv.error.detached: "this holds only the signature, without the invoice. You need the full .xml.p7m file."
  fv.error.p7m: "this looks like a signed .p7m file, but it cannot be opened. It may be damaged."
  fv.error.generic: "this file could not be read."
  fv.error.pdf: "The PDF for {name} could not be made."
  fv.error.attachment: "The attachment {name} cannot be extracted: its data in the XML file is damaged."
  fv.summary.reading.one: "Reading: {done} of {total} file."
  fv.summary.reading.other: "Reading: {done} of {total} files."
  fv.summary.read.one: "{count} invoice read."
  fv.summary.read.other: "{count} invoices read."
  fv.summary.failed.one: "{count} file could not be read."
  fv.summary.failed.other: "{count} files could not be read."
---

## What a FatturaPA XML file is

Since 2019 almost every invoice issued in Italy has been electronic. These are not PDFs: they are XML files in the FatturaPA format, set by the Agenzia delle Entrate (the Italian tax agency), and they pass through its exchange system, the Sistema di Interscambio or SdI, on their way to the customer. They hold everything a paper invoice does, written for accounting software: codes instead of words, amounts with a decimal point, no layout at all. Open one in a text editor and you get a wall of tags.

This page puts it back in order: supplier and customer at the top, then the document details, the lines, the VAT summary and the payment, with dates and amounts written the way you would write them.

## Why .xml or .xml.p7m

The file name nearly always follows one pattern: the country code and tax ID of whoever sent it, an underscore and a running number, like IT01234567890_00001.xml. If it ends in .xml.p7m, the file was digitally signed: the signature wraps the XML in an envelope that has to be opened before the invoice can be read. Invoices to the Italian public administration must be signed; between businesses the signature is optional, but plenty of software adds one anyway.

Here the envelope opens by itself, and the invoice row tells you who signed, when, and whether the signature matches the content. Some invoices carry their signature inside the XML instead (this is called XAdES). They read normally, but the page does not check that kind of signature.

## The courtesy copy

Many suppliers email a PDF alongside the e-invoice. Italians call it the copia di cortesia, the courtesy copy. It is easy to read but has no legal value, and it does not always arrive. When all you have is the XML, downloaded from the Fatture e Corrispettivi area of the Agenzia delle Entrate website, received by certified email (PEC) or forwarded by your accountant, this page does the same job: it gives you a readable version to look at on screen or save as a PDF.

Keep the XML file anyway. For tax purposes, that is the invoice, not the PDF.

## What the page and the PDF show

Supplier and customer with VAT number, tax code, address and tax regime; document type, number, date and total; the description; the lines with quantity, price, discounts and VAT rate; the VAT summary, with the reason for any zero-VAT amount spelled out; withholding tax, stamp duty and pension fund contributions; payment terms with IBAN and due dates; the transmission details. Labels follow the language of the page, so this English page explains an Italian invoice in English.

Attachments inside the XML, often the supplier's own PDF or a delivery note, download under their own names and are never opened automatically. The PDF is an A4 sheet with the same information: long line tables continue onto the next pages, and a note at the bottom of every page says which file it came from.

## Nothing is uploaded

An invoice says a lot: who buys what from whom, for how much, into which account. So everything happens in this browser tab: the file is read from your disk, the .p7m envelope opened and the PDF made in memory. If the PDF is all you need, [FatturaPA to PDF](/fatturapa-to-pdf/) puts that button first. To get the document out of any signed file, use [Open P7M files](/open-p7m-file/), and to combine several PDFs into one, [Merge PDF](/merge-pdf/).
