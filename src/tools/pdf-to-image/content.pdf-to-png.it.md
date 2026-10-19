---
title: "Da PDF a PNG: pagine nitide, senza caricare niente | Eolietech"
description: "Salva le pagine di un PDF come immagini PNG con testo e linee nitidi, a 72, 150 o 300 dpi. Tutte le pagine o solo alcune. Funziona nel browser; il PDF non viene mai caricato."
h1: "Da PDF a PNG"
intro: "Trasforma le pagine di un PDF in immagini PNG che tengono testo, linee e grafici perfettamente nitidi, pronte per slide, documentazione o ritocchi. Il PDF resta sempre sul tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra."
  - "PNG è già selezionato. Scegli 150 dpi per lo schermo o 300 dpi per la stampa o per ingrandire i dettagli."
  - "Lascia Tutte le pagine, oppure scegli Solo queste pagine e scrivile, per esempio 2, 4-6."
  - "Premi Converti in immagini e scarica il PNG, oppure tutti insieme in un unico file .zip."
faq:
  - q: "Perché PNG invece di JPG?"
    a: "PNG conserva ogni pixel esattamente, quindi testo piccolo, linee sottili e colori pieni restano puliti. JPG è più leggero ma può lasciare qualche leggera sbavatura sui bordi netti. Per una slide, un grafico o una pagina da annotare, PNG rende meglio; per condividere pagine scansionate di solito basta JPG."
  - q: "I PNG hanno lo sfondo trasparente?"
    a: "No. Le pagine vengono disegnate su bianco, come le vedi in un lettore PDF, così le immagini appaiono uguali ovunque le incolli."
  - q: "Perché i file sono così pesanti?"
    a: "PNG comprime senza perdere niente, quindi una pagina intera a 300 dpi può pesare qualche megabyte. Per lo schermo di solito bastano 150 dpi, con file circa quattro volte più leggeri."
  - q: "Il PDF viene caricato?"
    a: "No. PDF.js disegna le pagine dentro il tuo browser e i PNG vengono creati nella memoria della pagina. Non viene inviato niente."
---

## Pagine nitide per slide e documenti

PNG è il formato da scegliere quando una pagina deve restare identica all'originale: un grafico per una presentazione, uno schema per una wiki, una pagina da annotare in un programma di grafica. Il testo mantiene i bordi puliti e le linee sottili restano sottili, perché PNG non butta via nessun dettaglio.

## Scegliere la risoluzione

A **150 dpi** una pagina A4 diventa circa 1240 per 1750 pixel: riempie lo schermo di un portatile e resta leggibile in una slide. A **300 dpi** diventa circa 2480 per 3510 pixel, abbastanza per stampare o per ritagliare un piccolo dettaglio. Le pagine molto grandi, come i poster, si fermano a circa 16,7 megapixel perché il browser non resti senza memoria, e lo strumento ti avvisa quando succede.

## Privato per come è fatto

Tutto avviene in questa pagina: PDF.js disegna ogni pagina, il tuo browser la salva come PNG e, se sono più di una, le raccoglie in un .zip in memoria. Se preferisci file più leggeri, [Da PDF a JPG](/it/pdf-in-jpg/) fa lo stesso con JPG già selezionato. Per tenere le pagine come PDF usa [Dividi PDF](/it/dividere-pdf/); per trasformare immagini in un PDF usa [Da JPG a PDF](/it/jpg-in-pdf/).
