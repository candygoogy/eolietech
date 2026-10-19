---
title: "Da PDF a JPG: salva le pagine di un PDF come immagini | Eolietech"
description: "Trasforma tutte le pagine di un PDF, o solo quelle che scegli, in immagini JPG o PNG a 72, 150 o 300 dpi. Funziona nel browser, quindi il PDF non viene mai caricato."
h1: "Da PDF a JPG"
intro: "Salva le pagine di un PDF come immagini da incollare in una presentazione, mandare in chat o allegare dove sono accettate solo foto. Scegli le pagine e la nitidezza: il PDF resta sempre sul tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Lo strumento ti dice quante pagine ha."
  - "Scegli JPG o PNG e una risoluzione: 150 dpi per lo schermo, 300 dpi se pensi di stampare."
  - "Lascia Tutte le pagine, oppure scegli Solo queste pagine e scrivile, per esempio 1-3, 5."
  - "Premi Converti in immagini. Una pagina si scarica come immagine singola; più pagine arrivano insieme in un unico file .zip."
faq:
  - q: "Che risoluzione devo scegliere?"
    a: "150 dpi va bene quasi sempre: una pagina A4 diventa circa 1240 per 1750 pixel, nitida sullo schermo di un portatile o di un telefono. Scegli 300 dpi se l'immagine verrà stampata o se devi ingrandire scritte piccole. 72 dpi dà anteprime piccole e veloci."
  - q: "Meglio JPG o PNG?"
    a: "JPG crea file molto più leggeri ed è accettato quasi ovunque, quindi è adatto a pagine scansionate e pagine con foto. PNG tiene testo e linee sottili perfettamente nitidi, ma i file sono più pesanti: è la scelta migliore per slide, schemi e testo che deve restare definito."
  - q: "Il mio PDF viene caricato da qualche parte?"
    a: "No. Le pagine vengono disegnate da PDF.js, un motore di rendering PDF open source, dentro il tuo browser, e le immagini vengono create nella memoria della pagina. Non viene inviato niente a un server, quindi buste paga, contratti e referti medici restano sul tuo dispositivo."
  - q: "Perché una pagina è stata salvata più piccola della risoluzione che ho scelto?"
    a: "Le pagine molto grandi, come poster o disegni tecnici, a 300 dpi richiederebbero centinaia di megapixel e potrebbero bloccare la scheda del browser. Ogni immagine si ferma a circa 16,7 megapixel, che bastano comunque per A4 e Letter a 300 dpi. Quando una pagina viene ridotta, lo strumento ti dice quale."
  - q: "Posso convertire un PDF protetto da password?"
    a: "No. Apri il file con la sua password nel tuo lettore PDF, salva una copia non protetta e converti quella."
ui:
  p2i.format.label: "Formato"
  p2i.format.jpg: "JPG (file più leggeri)"
  p2i.format.png: "PNG (testo nitido, file più pesanti)"
  p2i.dpi.label: "Risoluzione"
  p2i.dpi.72: "72 dpi (anteprime piccole)"
  p2i.dpi.150: "150 dpi (schermo)"
  p2i.dpi.300: "300 dpi (stampa)"
  p2i.pages.legend: "Quali pagine?"
  p2i.pages.all: "Tutte le pagine"
  p2i.pages.some: "Solo queste pagine"
  p2i.ranges.label: "Pagine"
  p2i.ranges.placeholder: "1-3, 5"
  p2i.ranges.hint: "Separa con le virgole. “8-” vuol dire dalla pagina 8 alla fine."
  p2i.action: "Converti in immagini"
  p2i.stop: "Ferma"
  p2i.stopped: "Fermato. Cambia le impostazioni o premi Converti in immagini per ricominciare."
  p2i.reading: "Lettura di {name}…"
  p2i.ready.one: "Pronto. Il PDF ha {pages} pagina."
  p2i.ready.other: "Pronto. Il PDF ha {pages} pagine."
  p2i.fileInfo.one: "{name}: {pages} pagina, {size}"
  p2i.fileInfo.other: "{name}: {pages} pagine, {size}"
  p2i.working: "Disegno la pagina {current} di {total}…"
  p2i.done.one: "Fatto: {count} immagine, {size}."
  p2i.done.other: "Fatto: {count} immagini, {size} in tutto."
  p2i.capped.one: "La pagina {pages} è molto grande a questa risoluzione, quindi è stata salvata più piccola, circa 16,7 megapixel, perché il browser non resti senza memoria."
  p2i.capped.other: "Le pagine {pages} sono molto grandi a questa risoluzione, quindi sono state salvate più piccole, circa 16,7 megapixel ciascuna, perché il browser non resti senza memoria."
  p2i.downloadOne: "Scarica {name}"
  p2i.outputName: "{name}-pagina-{page}.{ext}"
  p2i.zipName: "{name}-{ext}.zip"
  p2i.error.empty: "Scrivi le pagine che ti servono, per esempio 1-3, 5."
  p2i.error.syntax: "“{part}” non è una pagina né un intervallo. Usa numeri come 5 o 1-3."
  p2i.error.outOfRange.one: "“{part}” è fuori dal documento, che ha {pages} pagina."
  p2i.error.outOfRange.other: "“{part}” è fuori dal documento, che ha {pages} pagine."
  p2i.error.reversed: "“{part}” va all'indietro. Scrivi prima il numero di pagina più basso."
---

## Cosa vuol dire dpi per le tue immagini

Una pagina PDF ha una misura in pollici o centimetri, non in pixel. La risoluzione, in punti per pollice (dpi), decide quanti pixel diventa ogni pollice di carta. Una pagina A4 misura circa 8,3 per 11,7 pollici, quindi:

- **72 dpi** dà circa 600 per 840 pixel. Va bene per una miniatura o un'occhiata veloce, ma le scritte piccole si leggono male.
- **150 dpi** dà circa 1240 per 1750 pixel. Il testo è nitido sullo schermo di portatili e telefoni e i file restano di dimensioni ragionevoli. È l'impostazione predefinita.
- **300 dpi** dà circa 2480 per 3510 pixel, la risoluzione tipica per la stampa. I file pesano circa quattro volte quelli a 150 dpi, quindi sceglila solo quando ti serve il dettaglio.

## JPG o PNG

**JPG** è la scelta sicura per condividere. È leggero, si apre con qualsiasi app e va bene per pagine scansionate e foto. Sui bordi molto netti, come il testo nero su bianco, guardando da vicino può lasciare qualche leggera sbavatura.

**PNG** conserva ogni pixel esattamente com'è, quindi testo, linee e grafici restano perfettamente nitidi. Il prezzo è il peso: una pagina di testo può essere da tre a cinque volte più grande della stessa pagina in JPG. Se ti serve [solo il PNG](/it/pdf-in-png/), quella pagina parte con PNG già selezionato.

## Il tuo PDF resta sul tuo dispositivo

Le pagine vengono disegnate da PDF.js, il motore open source che Firefox usa per il suo lettore PDF, e funziona dentro questa pagina. Le immagini vengono create dal tuo browser e, quando sono più di una, raccolte in un .zip anch'esso creato in memoria. Non viene caricato niente, ed è importante per estratti conto, contratti e tutto quello che preferiresti non affidare a un sito web.

## Strumenti collegati

- Per tenere una parte del PDF come PDF invece che come immagini, usa [Dividi PDF](/it/dividere-pdf/).
- Per fare il contrario e trasformare foto o scansioni in un unico PDF, usa [Da JPG a PDF](/it/jpg-in-pdf/).
- I PDF protetti da password non si aprono qui; salva prima una copia non protetta.
