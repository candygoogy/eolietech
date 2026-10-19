---
title: "Oscurare PDF: copri il testo per davvero, nel browser | Eolietech"
description: "Oscura nomi, indirizzi, IBAN e numeri di telefono in un PDF. Il testo sotto i riquadri viene tolto dal file, non solo coperto. Funziona nel browser, non carichi niente."
h1: "Oscurare PDF"
intro: "Prima di mandare un PDF a qualcuno, nascondi un nome, un numero di conto o un paragrafo intero. Disegna i riquadri neri o fai cercare allo strumento quello che va tolto, controlla, e salva una copia in cui quel testo non c'è più, invece di essere solo coperto. Il PDF non lascia mai il tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Le pagine compaiono sotto, una dopo l'altra."
  - "Trascina sulla pagina per disegnare un riquadro nero sopra quello che vuoi nascondere. Se preferisci farlo cercare, scrivi le parole nel campo di ricerca, oppure premi uno dei pulsanti per email, numeri di telefono, IBAN o codici fiscali."
  - "Controlla ogni riquadro. Trascinalo per spostarlo, trascina i bordi per cambiarne la misura e premi la piccola × per toglierlo."
  - "Premi Oscura e salva, poi scarica il nuovo PDF. Il file originale resta com'era."
faq:
  - q: "Il testo sotto i riquadri sparisce davvero?"
    a: "Sì. Ogni pagina con un riquadro viene ridisegnata come immagine, con i riquadri dipinti di nero pieno, e nel nuovo PDF quella pagina contiene solo l'immagine. Testo, caratteri e disegni originali della pagina non vengono copiati nel nuovo file, quindi sotto non resta niente da selezionare, copiare o cercare."
  - q: "Perché la pagina oscurata sembra un po' meno nitida?"
    a: "Perché adesso è un'immagine della pagina, disegnata a 200 dpi. Basta per leggere e stampare anche le scritte piccole, ma da vicino non è definita come il testo originale. È anche il motivo per cui il testo di quella pagina non si può più selezionare né cercare, ed è proprio quello che vuoi."
  - q: "Perché il file oscurato pesa più dell'originale?"
    a: "Una pagina salvata come testo occupa pochissimo; la stessa pagina come immagine occupa di più. Ogni pagina oscurata aggiunge più o meno quanto una buona foto di quella pagina, di più se è piena di scritte piccole o di immagini. Le pagine senza riquadri vengono copiate così come sono e non aggiungono quasi niente."
  - q: "La ricerca non trova una parola che vedo sulla pagina. Come mai?"
    a: "La ricerca legge il testo contenuto nel PDF. Se la pagina è una scansione o una foto, le parole fanno parte di un'immagine e non c'è testo da leggere, quindi lì la ricerca non trova niente. Quei riquadri disegnali a mano. Vale lo stesso per il testo dentro le immagini inserite in un PDF normale."
  - q: "Il mio PDF viene caricato da qualche parte?"
    a: "No. Le pagine vengono disegnate e lette da PDF.js, il motore PDF open source di Firefox, dentro questa pagina, e il nuovo PDF viene montato nella memoria del tuo browser. Non arriva niente a un server, ed è proprio il motivo per oscurare qui e non su un sito che ti chiede prima di caricare il file."
  - q: "Posso oscurare un PDF protetto da password?"
    a: "No. Aprilo con la password nel tuo lettore PDF, salva una copia non protetta e oscura quella."
ui:
  redact.drop.label: "Scegli un PDF o trascinalo qui"
  redact.drop.replace: "Scegli un altro PDF"
  redact.reading: "Lettura di {name}…"
  redact.fileInfo.one: "{name}: {pages} pagina, {size}"
  redact.fileInfo.other: "{name}: {pages} pagine, {size}"
  redact.ready.one: "Pronto. Disegna un riquadro sopra quello che vuoi nascondere, oppure cercalo."
  redact.ready.other: "Pronto. Disegna i riquadri sopra quello che vuoi nascondere, oppure cercalo. Il PDF ha {pages} pagine."
  redact.search.legend: "Trova e oscura"
  redact.search.label: "Parole o numeri"
  redact.search.action: "Oscura tutti i risultati"
  redact.quick.label: "Oppure cerca:"
  redact.pattern.email: "Indirizzi email"
  redact.pattern.phone: "Numeri di telefono"
  redact.pattern.iban: "IBAN"
  redact.pattern.cf: "Codici fiscali"
  redact.search.note: "La ricerca legge il testo vero del PDF. Le parole di una pagina scansionata fanno parte di un'immagine e la ricerca non le vede: quei riquadri disegnali a mano."
  redact.searching: "Cerco nella pagina {current} di {total}…"
  redact.searchStopped: "Ricerca fermata. I riquadri che aveva già messo restano sulle loro pagine."
  redact.found.one: "Trovato {count} risultato: {pages}. Ora è coperto da un riquadro: controllalo prima di salvare."
  redact.found.other: "Trovati {count} risultati: {pages}. Ora sono tutti coperti da un riquadro: controllali prima di salvare."
  redact.found.page: "pagina {page} ({count})"
  redact.found.noneQuery: "Nessun risultato per {query}."
  redact.found.none.email: "Nessun indirizzo email trovato."
  redact.found.none.phone: "Nessun numero di telefono trovato."
  redact.found.none.iban: "Nessun IBAN trovato."
  redact.found.none.cf: "Nessun codice fiscale trovato."
  redact.found.noText: "Questo PDF non ha testo che la ricerca possa leggere, quindi probabilmente è una scansione. Disegna i riquadri a mano."
  redact.error.emptyQuery: "Scrivi una parola o un numero da cercare."
  redact.hint: "Trascina sulla pagina per disegnare un riquadro, oppure premi Aggiungi un riquadro. Trascina un riquadro per spostarlo e i suoi bordi per cambiarne la misura."
  redact.seeThrough: "Qui i riquadri sono trasparenti, così vedi cosa coprono. Nel file salvato diventano neri pieni."
  redact.listLabel: "Pagine"
  redact.page.name: "Pagina {page}"
  redact.page.alt: "Pagina {page}"
  redact.page.loading: "Disegno la pagina {page}…"
  redact.page.noBoxes: "Nessun riquadro"
  redact.page.boxes.one: "{count} riquadro"
  redact.page.boxes.other: "{count} riquadri"
  redact.page.found.one: "{count} risultato"
  redact.page.found.other: "{count} risultati"
  redact.page.add: "Aggiungi un riquadro"
  redact.page.addLabel: "Aggiungi un riquadro alla pagina {page}"
  redact.box.label: "Riquadro nero {box} della pagina {page}"
  redact.box.state: "a {left}% da sinistra, a {top}% dall'alto, largo {width}%, alto {height}%."
  redact.box.hint: "Le frecce spostano il riquadro, con Maiusc a passi più lunghi. Alt e le frecce ne cambiano la misura. Canc lo toglie."
  redact.box.remove: "Togli il riquadro {box} della pagina {page}"
  redact.announce.added: "Riquadro {box} aggiunto alla pagina {page}."
  redact.announce.box: "Riquadro {box} della pagina {page}: {state}"
  redact.announce.removed: "Riquadro tolto dalla pagina {page}."
  redact.clear: "Togli tutti i riquadri"
  redact.cleared.one: "Tolto {count} riquadro."
  redact.cleared.other: "Tolti {count} riquadri."
  redact.action: "Oscura e salva"
  redact.stop: "Ferma"
  redact.stopped: "Fermato. Non è stato salvato niente e i tuoi riquadri sono ancora qui."
  redact.working: "Oscuro la pagina {current} di {total}…"
  redact.saving: "Preparo il nuovo PDF…"
  redact.error.noBoxes: "Non c'è ancora niente da oscurare. Prima disegna un riquadro su una pagina o cerca una parola."
  redact.done.one: "Fatto. {count} pagina oscurata, {size} in tutto."
  redact.done.other: "Fatto. {count} pagine oscurate, {size} in tutto."
  redact.download: "Scarica {name}"
  redact.outputName: "{name}-oscurato.pdf"
  redact.note: "Le pagine con i riquadri vengono salvate come immagini: il loro testo non si potrà più selezionare né cercare e il file può diventare più pesante. Le pagine senza riquadri conservano il loro testo. Segnalibri, proprietà del documento, commenti e campi dei moduli vengono tolti da tutto il file, perché possono ripetere le parole che hai nascosto."
---

## Perché un rettangolo nero non sempre oscura

Quasi tutti gli editor PDF ti fanno disegnare un rettangolo nero, e sullo schermo sembra fatto. Ma un PDF è fatto a strati: il rettangolo sta sopra, e il testo che copre resta nel file, sotto. Chiunque apra il documento può selezionare la riga nascosta e incollarla in una mail, o semplicemente cercarla. Studi legali, tribunali e uffici pubblici hanno pubblicato documenti così, e i nomi sotto il nero li poteva leggere chiunque ci provasse.

Lo stesso vale per l'evidenziatore nero, per un commento con lo sfondo nero e per lo screenshot di una pagina incollato nello stesso documento accanto all'originale.

Questo strumento fa il contrario. Ogni pagina con un riquadro viene disegnata come immagine, i riquadri vengono dipinti dentro l'immagine e la nuova pagina contiene solo quella. Quello che stava sotto il nero non è nascosto nel file: non c'è più.

## Cosa cambia nel PDF salvato

- **Le pagine con i riquadri** diventano immagini a 200 dpi. Si vedono uguali, ma il loro testo non si può più selezionare, copiare o cercare, e ognuna rende il file un po' più pesante.
- **Le pagine senza riquadri** vengono copiate così come sono, testo compreso.
- **Tutto il resto che può contenere testo** viene tolto da tutto il file: le proprietà del documento come titolo e autore, i metadati XMP nascosti, i segnalibri, gli allegati, i commenti e i campi dei moduli. Possono ripetere proprio le parole che hai oscurato, ed è facile dimenticarsene perché non si vedono sulla pagina. I campi già compilati sulle pagine che non hai oscurato restano visibili, ma non si possono più modificare. Anche i link che portano a un'altra pagina del documento vengono tolti; quelli ai siti restano.

## La ricerca, e cosa non vede

Il campo di ricerca trova ogni punto in cui compare una parola o un numero, senza badare a maiuscole e minuscole, e ci mette sopra un riquadro. I quattro pulsanti cercano i dati personali più comuni: indirizzi email, numeri di telefono (italiani e internazionali), IBAN (verificati con le cifre di controllo, così il riquadro finisce dove finisce l'IBAN) e codici fiscali.

La ricerca funziona solo sul testo vero. Un contratto scansionato o la foto di un documento non contengono testo, solo l'immagine del testo, quindi lì la ricerca non trova niente: in quel caso i riquadri disegnali tu. Con alcuni caratteri particolari la ricerca può anche sbagliare di poco, perché il PDF le dice dove sta una riga di testo, non dove sta ogni lettera. Guarda ogni riquadro prima di salvare e, se spunta una lettera, allargalo trascinando il bordo.

## Il tuo PDF resta sul tuo dispositivo

Le pagine vengono disegnate e lette da PDF.js, il motore PDF open source di Firefox, che gira dentro questa pagina. Il nuovo PDF lo monta pdf-lib, sempre nel tuo browser. Non viene caricato niente in nessun momento, e conta soprattutto per i documenti che di solito si oscurano: buste paga, referti, contratti, estratti conto.

## Strumenti collegati

- Se il PDF oscurato è venuto pesante, prova [Comprimere PDF](/it/comprimere-pdf/).
- Per mandare solo alcune pagine, ritagliale prima con [Dividere PDF](/it/dividere-pdf/).
- Anche le foto hanno dati nascosti, come il luogo in cui sono state scattate: [Rimuovere EXIF](/it/rimuovere-exif/) li toglie.
