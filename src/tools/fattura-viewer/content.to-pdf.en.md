---
title: "FatturaPA to PDF: turn an Italian e-invoice XML into a PDF | Eolietech"
description: "Convert an Italian e-invoice in XML, signed .xml.p7m files included, into a readable PDF to print or file away. Works in your browser; the invoice is never uploaded."
h1: "FatturaPA to PDF"
intro: "Got the .xml or .xml.p7m file of an Italian invoice and need a PDF to print, forward or file? Drop it here: the PDF is made in your browser, with every line and the VAT summary. The invoice never leaves your device."
howTo:
  - "Choose your invoices or drop them on the box above: .xml or .xml.p7m files, up to 50 at a time."
  - "Check the supplier, number, date and total in each row. Press View if you want to read it first."
  - "Press Download PDF. With several invoices, Download all PDFs puts them in one .zip."
faq:
  - q: "Does the PDF replace the XML invoice?"
    a: "No. The PDF is a readable copy and says so at the bottom of every page. For tax purposes the invoice is the XML file that went through the SdI exchange system, so keep that too."
  - q: "What is the PDF called?"
    a: "The same as the original file, with .pdf instead of .xml or .xml.p7m. When one file holds several invoices, each gets its own PDF with a number at the end of the name."
  - q: "Are the attachments included in the PDF?"
    a: "No, the PDF lists their names only. To download them, press View: each one has its own button in the Attachments section."
  - q: "Is the invoice uploaded?"
    a: "No. Reading the file and making the PDF both happen in this browser tab, and nothing goes over the network."
---

## From XML to PDF without software

The XML file is the real invoice, but to print it, send it to someone without accounting software, or file it with your other expenses, you need a PDF. Many suppliers already email a courtesy copy as a PDF; when there is none, this page makes one from the XML file, even when it is signed as a .p7m.

## What the PDF looks like

An A4 sheet with supplier and customer at the top, then the document details, the description, the line table, the VAT summary, withholding tax, stamp duty and pension fund if there are any, and the payment with IBAN and due dates. When there are many lines the table carries on over the next pages with its header repeated. At the bottom of every page you get the page number and a note: this is a readable copy made from the XML file, which remains the legal invoice. The labels are in English on this page and in Italian on the Italian one.

The PDF uses a standard font that covers accented letters and common symbols, the euro sign included. Characters from other alphabets, rare on Italian invoices, come out as a question mark; on the page they always show as written.

## Private by design

The file is read from your disk, the .p7m envelope opened and the PDF made in memory, all in this tab. To read the invoice on screen, use the [Italian e-invoice viewer](/fatturapa-viewer/); to combine a month of PDFs into one file, use [Merge PDF](/merge-pdf/).
