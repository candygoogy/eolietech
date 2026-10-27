---
title: "Comprimere un PDF da inviare via email | Eolietech"
description: "PDF troppo pesante per l'email? Riducilo con l'impostazione più forte, immagini a circa 72 dpi, e controlla il peso prima di allegarlo. Nessun caricamento."
h1: "Comprimere PDF per email"
intro: "Gmail e Outlook.com accettano fino a 25 MB per messaggio, e un contratto scansionato o una brochure piena di foto possono superarli da soli. Questa pagina parte dall'impostazione più forte, che salva le immagini a circa 72 dpi, così il tuo PDF ha più probabilità di starci. Tutto avviene nel browser: il file non viene mai caricato."
howTo:
  - "Scegli il PDF da mandare, oppure trascinalo nel riquadro qui sopra. Puoi aggiungere fino a 10 file, ognuno fino a 200 MB."
  - "File più leggero è già selezionato. Salva foto e pagine scansionate a circa 72 dpi e lascia com'erano testo e grafica vettoriale."
  - "Premi Comprimi. La prima volta il browser scarica il motore di compressione, una volta sola (circa 15 MB)."
  - "Controlla il peso prima e dopo accanto a ogni file, poi scarica il risultato e aprilo. Se una pagina scansionata si legge male, scegli Bilanciata e premi di nuovo Comprimi."
faq:
  - q: "Quanto può pesare un PDF da mandare via email?"
    a: "Dipende dal servizio. Gmail e Outlook.com accettano fino a 25 MB per messaggio, e con un account di lavoro o di scuola il limite può essere diverso. In più, quando l'email parte gli allegati crescono di circa un terzo per la codifica, quindi anche un PDF da 20 MB può essere troppo, e il server di chi riceve può avere un limite più basso del tuo: meglio restare ben sotto la soglia."
  - q: "Perché il mio PDF pesa così tanto?"
    a: "Quasi sempre per colpa delle immagini. Uno scanner o un'app di scansione spesso salva ogni pagina come immagine a colori a 300 dpi o più, e relazioni e brochure contengono spesso foto alla risoluzione piena della fotocamera. Le pagine di testo esportate da un programma di videoscrittura occupano pochissimo, quindi è raro che un PDF di solo testo sia troppo pesante per l'email."
  - q: "A 72 dpi il testo si legge ancora?"
    a: "Il testo che puoi selezionare con il cursore e la grafica vettoriale, come grafici e loghi, restano nitidi a ogni livello, perché vengono mantenuti come testo e forme. Una pagina scansionata invece è una foto del testo, quindi a 72 dpi le scritte piccole possono diventare sfocate. In quel caso scegli Bilanciata (circa 150 dpi) e comprimi di nuovo."
  - q: "Perché il mio PDF non è diventato più leggero?"
    a: "Probabilmente il file è già compresso, oppure il suo peso non dipende dalle immagini. Lo strumento ti avvisa quando il risultato non è più leggero e ti propone l'originale invece di una copia peggiore. Comprimerlo di nuovo non serve: conviene dividerlo in parti o mandare un link da un servizio cloud."
  - q: "Posso comprimere un PDF protetto da password?"
    a: "No, se il file chiede una password per essere aperto: lo strumento ti dirà che è protetto. Se la conosci, toglila prima con Sbloccare PDF su questo sito, poi comprimi la copia sbloccata. La copia compressa non ha password, quindi pensa a chi potrà leggere l'email prima di inviarla."
  - q: "Il mio PDF viene caricato?"
    a: "No. Ghostscript, compilato in WebAssembly, comprime il file in questa scheda del browser. L'unico download è il motore stesso, da questo sito. Il PDF lascia il tuo dispositivo solo quando lo alleghi tu all'email."
ui:
  compress.preset.screen.hint: "Immagini a circa 72 dpi. Più probabilità di stare sotto il limite dell'email."
  compress.preset.ebook.hint: "Immagini a circa 150 dpi. Prova questa se testo scansionato o foto risultano sfocati."
  compress.preset.printer.hint: "Immagini a circa 300 dpi. Se chi lo riceve deve stamparlo."
---

## Perché un PDF diventa troppo pesante per l'email

Le pagine di testo occupano poco spazio, le immagini molto. Un documento di 20 pagine scansionato a colori a 300 dpi può arrivare facilmente a 20 MB o più, perché ogni pagina viene salvata come una grande foto del foglio. Lo stesso succede con relazioni e brochure in cui le foto sono state inserite così come uscivano dalla fotocamera o dal telefono.

Per leggere il documento a schermo tutto quel dettaglio non serve. Il livello File più leggero, da cui parte questa pagina, salva di nuovo ogni immagine a circa 72 dpi, elimina le immagini ripetute e comprime i font. Le immagini già più piccole non vengono ingrandite. Scansioni e file pieni di foto di solito si riducono di più; un PDF fatto quasi solo di testo può cambiare di poco.

## Se pesa ancora troppo

- **Dividilo.** Con [Dividi PDF](/it/dividere-pdf/) puoi tagliare il documento in parti per intervalli di pagine e mandare ogni parte in un'email diversa. Anche le parti si possono comprimere qui.
- **Manda un link.** Carica il PDF su un servizio cloud come Google Drive, OneDrive o Dropbox e invia via email il link di condivisione. Gmail lo fa da solo con un link di Google Drive quando superi il limite.
- **Scansionalo di nuovo a una risoluzione più bassa.** Per un documento da leggere a schermo bastano 150 dpi, e in scala di grigi o in bianco e nero le pagine di testo pesano molto meno che a colori.
- **Ricostruiscilo da foto più leggere.** Se il PDF è nato da foto fatte con il telefono, riducile con [Ridimensiona per email](/it/ridimensionare-immagini-per-email/) e rimettile insieme con [Da JPG a PDF](/it/jpg-in-pdf/).

## Prima di inviarlo

Apri il file compresso e guarda la pagina con le scritte più piccole. Se cambi livello, i risultati si azzerano e devi premere di nuovo Comprimi; il motore è già caricato, quindi non viene scaricato una seconda volta. Quando riscrive il file, Ghostscript può appiattire o togliere i campi compilabili dei moduli: se chi lo riceve deve compilarlo, manda l'originale. Per i file che non devi mandare via email, la pagina principale [Comprimi PDF](/it/comprimere-pdf/) ha lo stesso strumento e parte da Bilanciata.
