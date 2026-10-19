---
title: "Convertire PNG in PDF senza caricare niente | Eolietech"
description: "Trasforma screenshot, scansioni e altre immagini PNG in un unico PDF, un'immagine per pagina. I PNG restano senza perdita, quindi il testo resta nitido. Tutto nel browser."
h1: "Da PNG a PDF"
intro: "Metti screenshot, pagine scansionate e schemi in un unico PDF, facile da inviare, stampare o allegare a un modulo. I PNG entrano senza perdita, quindi il testo resta nitido, e tutto avviene sul tuo dispositivo."
howTo:
  - "Scegli i file PNG o trascinali nel riquadro qui sopra. Nello stesso PDF puoi mettere anche JPG, WebP, AVIF e HEIC."
  - "Mettili in ordine trascinandoli, oppure con i pulsanti Sposta su e Sposta giù. L'immagine in alto è la pagina uno."
  - "Lascia Adatta all'immagine per avere pagine grandi quanto ogni screenshot, oppure scegli A4 o Letter se il PDF va stampato."
  - "Premi Crea PDF e scarica il file."
faq:
  - q: "Il testo negli screenshot resta nitido?"
    a: "Sì. Le immagini PNG vengono salvate nel PDF senza compressione con perdita, quindi ogni pixel resta com'è e anche il testo piccolo appare identico allo screenshot originale."
  - q: "Cosa succede alle parti trasparenti?"
    a: "La trasparenza resta. Il lettore PDF mostra attraverso le parti trasparenti il colore della pagina, di solito bianco, come il tuo visualizzatore di immagini mostra una scacchiera o uno sfondo."
  - q: "Perché il PDF pesa più o meno quanto i PNG?"
    a: "Perché non viene buttato via niente. Se ti serve un file più leggero e le immagini sono foto e non screenshot, convertile prima in JPG con il convertitore da PNG a JPG, oppure passa il PDF finito in Comprimere PDF."
  - q: "Viene caricato qualcosa?"
    a: "No. Il PDF viene creato nel tuo browser con la libreria open source pdf-lib, e i tuoi file non lasciano mai il tuo dispositivo."
ui:
  topdf.drop: "Scegli le immagini PNG o trascinale qui"
  topdf.drop.hint: "PNG, ma anche JPG, WebP, AVIF e HEIC. Il PDF viene creato sul tuo dispositivo; non viene caricato niente."
---

## Screenshot e scansioni in un solo file

Una cartella di screenshot è scomoda da condividere: l'ordine si perde, alcune app li ridimensionano e molti moduli accettano un solo PDF. Mettendoli in un unico PDF risolvi tutti e tre i problemi. L'ordine che scegli qui è l'ordine delle pagine, e ogni pagina conserva esattamente i pixel del suo PNG.

## Senza perdita dall'inizio alla fine

Il PNG è un formato senza perdita, e resta tale anche nel PDF. È importante per screenshot di testo, ricevute, schemi e documenti scansionati, dove un formato con perdita sfocherebbe i bordi delle lettere. Il rovescio della medaglia è il peso: un PDF di PNG pesa più o meno quanto i PNG stessi.

## Formato della pagina

Con **Adatta all'immagine** ogni pagina ha le dimensioni del suo screenshot: si legge bene sullo schermo e gli screenshot del telefono restano alti e stretti. Se il PDF va stampato o allegato a una domanda, scegli **A4** o **Letter**: ogni immagine viene adattata e centrata, quelle larghe hanno pagine orizzontali, e il margine piccolo tiene tutto lontano dal bordo della stampante.

## Come funziona

Il tuo browser legge ogni PNG e lo inserisce in un nuovo PDF con pdf-lib, dentro un worker in background. Non viene caricato niente e il PDF finito va direttamente nei tuoi download. Devi aggiungerlo ad altri documenti? [Unire PDF](/it/unire-pdf/) mette insieme più PDF in uno solo. Se le immagini sono foto e il PDF viene troppo pesante, convertile prima con [Da PNG a JPG](/it/png-in-jpg/), oppure alleggerisci il file finito con [Comprimere PDF](/it/comprimere-pdf/).
