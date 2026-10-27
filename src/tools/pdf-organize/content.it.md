---
title: "Riordinare, ruotare ed eliminare pagine PDF | Eolietech"
description: "Vedi ogni pagina di un PDF come miniatura, poi riordina, ruota o elimina le pagine e salva un nuovo file. Funziona nel browser; non viene caricato niente."
h1: "Organizzare le pagine di un PDF"
intro: "Sistema un PDF pagina per pagina: metti le pagine nell'ordine giusto, raddrizza le scansioni storte ed elimina quelle che non ti servono. Vedi una miniatura di ogni pagina e il file non esce mai dal tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Compare una miniatura per ogni pagina."
  - "Riordina le pagine trascinandole, oppure con i pulsanti Prima e Dopo sotto ogni pagina."
  - "Usa i pulsanti di rotazione per girare una pagina di un quarto di giro a sinistra o a destra, ed Elimina per toglierla. Annulla tutte le modifiche riporta il documento com'era."
  - "Premi Salva PDF, poi scarica il nuovo file. Il file originale non viene modificato."
faq:
  - q: "Il mio PDF viene caricato per mostrare le miniature?"
    a: "No. Le miniature vengono disegnate nel tuo browser da PDF.js, il visualizzatore PDF open source di Mozilla, e il nuovo file viene creato con pdf-lib, sempre nel tuo browser. Nessuna parte del documento viene inviata da qualche parte."
  - q: "Ruotare una pagina ne riduce la qualità?"
    a: "No. La rotazione viene salvata come impostazione della pagina, come fanno i lettori PDF. Testo, immagini e disegni non vengono ridisegnati né ricompressi."
  - q: "Posso usare la tastiera invece di trascinare?"
    a: "Sì. Ogni pagina ha i pulsanti per spostarla prima o dopo, ruotarla ed eliminarla. Usa Tab per raggiungerli; dopo ogni azione, il focus resta sulla pagina che hai appena modificato."
  - q: "Perché alcune miniature sono un po' diverse da come le vedo nel mio lettore PDF?"
    a: "Le miniature sono piccole anteprime. Font insoliti o profili colore particolari possono apparire leggermente diversi a quella dimensione, ma il PDF salvato conserva il contenuto originale delle pagine esattamente com'era."
  - q: "Posso aprire PDF protetti da password?"
    a: "No. I PDF cifrati non si possono modificare qui. Se conosci la password, toglila con Sbloccare PDF su questo sito, poi apri la copia sbloccata."
ui:
  organize.listLabel: "Pagine, nel nuovo ordine"
  organize.hint: "Trascina le pagine per riordinarle, oppure usa i pulsanti sotto ogni pagina."
  organize.reading: "Lettura di {name}…"
  organize.ready.one: "Caricata {pages} pagina. La miniatura compare appena viene disegnata."
  organize.ready.other: "Caricate {pages} pagine. Le miniature compaiono man mano che vengono disegnate."
  organize.fileInfo.one: "{name}: {pages} pagina, {size}"
  organize.fileInfo.other: "{name}: {pages} pagine, {size}"
  organize.thumbAlt: "Anteprima della pagina {page}"
  organize.thumbLoading: "Caricamento dell'anteprima…"
  organize.pageName: "Pagina {page}"
  organize.position: "Posizione {position}"
  organize.rotated: "Ruotata di {degrees}°"
  organize.moveEarlier: "Prima"
  organize.moveLater: "Dopo"
  organize.rotateLeft: "Ruota a sinistra"
  organize.rotateRight: "Ruota a destra"
  organize.delete: "Elimina"
  organize.moveEarlierLabel: "Sposta prima la pagina {page}"
  organize.moveLaterLabel: "Sposta dopo la pagina {page}"
  organize.rotateLeftLabel: "Ruota a sinistra la pagina {page}"
  organize.rotateRightLabel: "Ruota a destra la pagina {page}"
  organize.deleteLabel: "Elimina la pagina {page}"
  organize.moved: "La pagina {page} ora è in posizione {position} di {total}."
  organize.rotatedStatus: "Pagina {page} ruotata a {degrees}°."
  organize.deleted.one: "Pagina {page} eliminata. Resta {remaining} pagina."
  organize.deleted.other: "Pagina {page} eliminata. Restano {remaining} pagine."
  organize.undo: "Annulla tutte le modifiche"
  organize.undone: "Tutte le modifiche sono state annullate."
  organize.save: "Salva PDF"
  organize.working: "Salvataggio del nuovo PDF…"
  organize.done.one: "Fatto: nuovo PDF con {pages} pagina."
  organize.done.other: "Fatto: nuovo PDF con {pages} pagine."
  organize.download.one: "Scarica il PDF ({pages} pagina, {size})"
  organize.download.other: "Scarica il PDF ({pages} pagine, {size})"
  organize.outputName: "{name}_organizzato.pdf"
---

## Un ordinatore di pagine che resta sul tuo computer

I documenti scansionati raramente escono giusti al primo colpo. Una pagina è capovolta, il retro di un modulo è finito prima del fronte, oppure lo scanner ha aggiunto un foglio bianco. Questo strumento mostra l'intero documento come una griglia di miniature, così puoi sistemare tutto in un solo passaggio e salvare una copia pulita.

Tutto avviene nel tuo browser. Le miniature vengono disegnate da PDF.js, lo stesso motore che Firefox usa per mostrare i PDF, e il nuovo file viene composto con pdf-lib. Entrambi girano in locale, quindi il documento non viene mai caricato e lo strumento continua a funzionare anche se la connessione cade dopo che la pagina si è caricata.

## Cosa fa ogni azione

- **Prima / Dopo** sposta una pagina di una posizione alla volta. Con mouse o trackpad puoi anche trascinare una pagina nel punto in cui deve andare.
- **Ruota a sinistra / Ruota a destra** gira la pagina di 90 gradi. La rotazione viene salvata come impostazione della pagina, quindi non viene ridisegnato niente e la qualità resta la stessa.
- **Elimina** toglie la pagina dal nuovo file. L'ultima pagina rimasta non si può eliminare.
- **Annulla tutte le modifiche** ripristina l'ordine originale, la rotazione e tutte le pagine eliminate.

Quando salvi, ottieni un nuovo PDF. Il file originale sul tuo disco resta esattamente com'era.

## Buono a sapersi

- I documenti grandi richiedono un momento: le miniature vengono disegnate una dopo l'altra, e puoi cominciare a riordinare prima che siano tutte pronte.
- I PDF cifrati o protetti da password non si possono aprire.
- I link interni al documento e i segnalibri potrebbero puntare al posto sbagliato dopo che le pagine sono state spostate, perché fanno riferimento alla posizione delle pagine.
- Per combinare prima più file, usa [Unire PDF](/it/unire-pdf/). Per estrarre intervalli di pagine per numero, [Dividere PDF](/it/dividere-pdf/) è più veloce.
