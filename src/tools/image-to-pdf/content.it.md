---
title: "Convertire JPG in PDF nel browser | Eolietech"
description: "Metti foto, scansioni e screenshot in un unico PDF, un'immagine per pagina, nell'ordine che scegli tu. JPG e PNG entrano senza ricompressione. Non viene caricato niente."
h1: "Da JPG a PDF"
intro: "Trasforma foto, scansioni e screenshot in un unico PDF. Aggiungi le immagini, mettile in ordine, scegli il formato della pagina e scarica il file. Tutto avviene sul tuo dispositivo: le tue immagini non vengono mai caricate."
howTo:
  - "Scegli le immagini o trascinale nel riquadro qui sopra. Vanno bene JPG, PNG, WebP, AVIF e HEIC, e puoi aggiungerne altre in qualsiasi momento."
  - "Mettile in ordine: trascinale con il mouse, oppure usa i pulsanti Sposta su e Sposta giù. Ogni immagine diventa una pagina, dall'alto verso il basso."
  - "Scegli il formato della pagina. Con Adatta all'immagine ogni pagina ha le dimensioni della sua foto; A4 e Letter danno pagine da stampa, con un piccolo margine se vuoi."
  - "Premi Crea PDF, poi scarica il file e controllalo con il lettore PDF che usi di solito."
faq:
  - q: "Le mie immagini vengono caricate da qualche parte?"
    a: "No. Il PDF viene creato nel tuo browser con la libreria open source pdf-lib, in un worker in background sul tuo dispositivo. Le immagini vengono lette dal tuo disco e il PDF viene salvato di nuovo lì. Dopo la prima apertura della pagina puoi anche scollegarti da internet: lo strumento funziona lo stesso."
  - q: "Le immagini perdono qualità?"
    a: "Se sono JPG o PNG, no. I dati dell'immagine di un JPG entrano nel PDF esattamente come li ha salvati la fotocamera o lo scanner (restano fuori solo le note nascoste, come la posizione), e un PNG resta senza perdita. WebP, AVIF e HEIC non si possono mettere direttamente in un PDF, quindi vengono convertiti una volta sola: le foto in JPG di alta qualità (qualità 92), le immagini trasparenti o senza perdita in PNG."
  - q: "Le foto del telefono escono girate di lato?"
    a: "No. Spesso il telefono salva la foto di lato e aggiunge un'indicazione su come girarla. I lettori PDF ignorano questa indicazione, ed è per questo che alcuni convertitori producono pagine storte. Questo strumento la legge e gira l'immagine sulla pagina, senza toccarne i pixel."
  - q: "Quale formato di pagina scelgo?"
    a: "Adatta all'immagine è il migliore per leggere sullo schermo: ogni pagina è grande esattamente quanto la sua foto, senza bordi bianchi. Per stampare, o per moduli che si aspettano pagine da ufficio, scegli A4 (lo standard in Italia e in quasi tutto il mondo) oppure Letter (Stati Uniti e Canada). Con questi formati ogni pagina si gira in base all'immagine: orizzontale per le foto larghe, verticale per quelle alte."
  - q: "C'è un limite al numero o alla dimensione delle immagini?"
    a: "Puoi aggiungere fino a 50 immagini da massimo 100 MB l'una. In pratica conta la memoria del tuo dispositivo: decine di foto grandi possono richiedere un po' di tempo su uno smartphone. Il PDF pesa più o meno quanto le immagini che ci metti dentro."
ui:
  topdf.drop: "Scegli le immagini o trascinale qui"
  topdf.drop.hint: "JPG, PNG, WebP, AVIF o HEIC. Il PDF viene creato sul tuo dispositivo; non viene caricato niente."
  topdf.option.pageSize: "Formato pagina"
  topdf.option.fit: "Adatta all'immagine"
  topdf.option.letter: "Letter (USA)"
  topdf.option.margin: "Margine"
  topdf.option.marginNone: "Nessuno"
  topdf.option.marginSmall: "Piccolo (12,7 mm)"
  topdf.option.noteFit: "Ogni pagina è grande quanto la sua immagine. Il margine vale per A4 e Letter."
  topdf.option.notePaper: "Ogni immagine viene adattata alla pagina e centrata. Le immagini larghe hanno una pagina orizzontale."
  topdf.listLabel: "Immagini, nell'ordine delle pagine"
  topdf.orderHint: "Ogni immagine diventa una pagina, dall'alto verso il basso. Trascina le immagini per riordinarle, oppure usa i pulsanti Sposta."
  topdf.progress: "Avanzamento"
  topdf.action: "Crea PDF"
  topdf.added.one: "Aggiunta {count} immagine."
  topdf.added.other: "Aggiunte {count} immagini."
  topdf.reading: "Lettura…"
  topdf.moveUp: "Sposta su"
  topdf.moveDown: "Sposta giù"
  topdf.moveUpLabel: "Sposta su {name}"
  topdf.moveDownLabel: "Sposta giù {name}"
  topdf.removeLabel: "Rimuovi {name}"
  topdf.moved: "{name} ora è la pagina {position} di {total}."
  topdf.removed: "Rimossa: {name}."
  topdf.working: "Aggiungo l'immagine {current} di {total}…"
  topdf.saving: "Salvo il PDF…"
  topdf.done.one: "Fatto: un PDF di {pages} pagina ({size})."
  topdf.done.other: "Fatto: un PDF di {pages} pagine ({size})."
  topdf.download.one: "Scarica il PDF ({pages} pagina, {size})"
  topdf.download.other: "Scarica il PDF ({pages} pagine, {size})"
  topdf.outputName: "immagini.pdf"
  topdf.error.decode: "Non riesco a leggere {name} come immagine. Potrebbe essere danneggiato, oppure non è un file JPG, PNG, WebP, AVIF o HEIC."
  topdf.error.unsupported: "{name} non si può aprire in questo browser. Prova con una versione recente di Chrome, Edge, Firefox o Safari."
  topdf.error.memory: "Il tuo dispositivo ha esaurito la memoria con {name}. Prova con meno immagini o più piccole, oppure chiudi le altre schede."
  topdf.error.failed: "Qualcosa è andato storto durante la creazione del PDF. Riprova."
  topdf.error.skipHint: "Premi di nuovo Crea PDF per creare il PDF senza questo file, oppure rimuovilo dall'elenco."
---

## Come funziona

Quando aggiungi le immagini, compaiono in un elenco nell'ordine in cui le hai scelte. Quell'elenco è l'ordine delle pagine del PDF: la prima immagine in alto è la pagina uno. Trascina le immagini per spostarle, oppure usa i pulsanti Sposta su e Sposta giù, che funzionano anche da tastiera. Quando l'ordine ti va bene, premi **Crea PDF**. Un worker in background nel tuo browser costruisce il file un'immagine alla volta, così la pagina resta reattiva anche con un elenco lungo.

Se un'immagine non si riesce a leggere, lo strumento ti dice quale e la lascia fuori la volta successiva che premi Crea PDF. Tutto il resto rimane al suo posto.

## Formato della pagina e margini

- **Adatta all'immagine** (l'impostazione predefinita) rende ogni pagina grande esattamente quanto la sua foto, un pixel per punto. Non ci sono bordi bianchi e il lettore PDF mostra l'immagine a tutto schermo. Le pagine di uno stesso file possono avere dimensioni diverse: per un PDF è normale.
- **A4** e **Letter** danno pagine da stampa, per moduli, domande e pratiche. Ogni immagine viene adattata alla pagina e centrata, e la pagina si gira di conseguenza: una foto larga ha una pagina orizzontale, una alta una pagina verticale. In Italia il formato giusto è quasi sempre A4.
- **Margine** aggiunge un piccolo bordo bianco (12,7 mm) intorno all'immagine nelle pagine A4 e Letter. Molte stampanti non arrivano fino al bordo del foglio, quindi un margine tiene tutta la foto sulla carta.

## Qualità: cosa resta com'è

L'immagine di un JPG entra nel PDF senza modifiche: gli stessi dati salvati dalla fotocamera, dal telefono o dallo scanner, senza un secondo giro di compressione. Restano fuori solo le note nascoste che la accompagnano, come il modello della fotocamera e il luogo dello scatto, così il PDF non le condivide. Un PNG viene conservato senza perdita, quindi screenshot e scansioni di testo restano nitidi. Per questo il PDF di solito pesa più o meno quanto le immagini che hai aggiunto, ed è identico agli originali.

WebP, AVIF e HEIC non sono formati che un PDF può contenere, quindi vengono convertiti una volta sola sul tuo dispositivo: le foto diventano JPG di alta qualità, le immagini con trasparenza e i WebP senza perdita diventano PNG.

Le foto del telefono sono spesso salvate di lato, con un'indicazione nel file su come girarle. Lo strumento legge questa indicazione e gira l'immagine sulla pagina, così le foto escono dritte senza essere ricompresse.

## I tuoi file restano sul tuo dispositivo

Molti convertitori online caricano le tue foto sui loro server e ti rimandano un PDF. Qui non viene inviato niente. Le immagini vengono lette dal tuo disco, il PDF viene creato nella memoria del browser e salvato direttamente nei tuoi download. Dopo l'apertura della pagina puoi perfino staccare la connessione: continua a funzionare.

## Strumenti collegati

Devi aggiungere il risultato ad altri PDF? [Unire PDF](/it/unire-pdf/) mette insieme più file, e [Organizzare le pagine PDF](/it/organizzare-pdf/) ti permette poi di ruotare, riordinare o eliminare le pagine. Se il PDF è troppo pesante per un'email, prova [Comprimere PDF](/it/comprimere-pdf/), oppure alleggerisci prima le foto con [Comprimere immagini](/it/comprimere-immagini/). Per trasformare un PDF di nuovo in immagini, usa [Da PDF a JPG](/it/pdf-in-jpg/). Per togliere la posizione dalle foto che condividi così come sono, usa [Rimuovere i dati EXIF](/it/rimuovere-exif/).
