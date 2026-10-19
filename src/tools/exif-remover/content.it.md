---
title: "Rimuovere i dati EXIF dalle foto, posizione compresa | Eolietech"
description: "Guarda cosa rivelano le tue foto, come la posizione GPS in cui sono state scattate, poi cancellalo senza toccare l'immagine. JPG, PNG e WebP, tutto nel browser."
h1: "Rimuovere i dati EXIF"
intro: "Le foto contengono dettagli nascosti: spesso il punto esatto in cui sono state scattate, il telefono che le ha fatte e l'ora. Trascinale qui per vedere cosa dice ciascuna, poi cancellalo. L'immagine non viene toccata e non viene caricato niente."
howTo:
  - "Scegli le foto o trascinale nel riquadro qui sopra. Puoi aggiungere fino a 50 file JPG, PNG o WebP alla volta."
  - "Leggi cosa rivela ogni foto: posizione, fotocamera, data, il programma che l'ha modificata e quanti altri tag contiene."
  - "Lascia selezionato Tutto, oppure scegli Solo la posizione se vuoi tenere fotocamera e data."
  - "Premi Rimuovi, poi scarica le foto pulite una per una oppure usa Scarica tutto per avere un .zip. I nomi dei file restano gli stessi."
faq:
  - q: "Le mie foto vengono caricate?"
    a: "No. Questa pagina legge e riscrive i file dentro la scheda del browser. Non passano mai dalla rete, e puoi verificarlo negli strumenti per sviluppatori del browser mentre la usi."
  - q: "Togliere i metadati abbassa la qualità?"
    a: "No. Lo strumento ritaglia i metadati dal file e copia i dati dell'immagine byte per byte, senza decodificare né salvare di nuovo la foto. L'immagine è identica; il file è solo un po' più leggero."
  - q: "Perché la foto pulita ha ancora un piccolo blocco EXIF?"
    a: "Quando scatti tenendo il telefono di lato, la fotocamera salva un'indicazione di rotazione invece di girare i pixel. Se la togliessimo, la foto si aprirebbe girata. In quel caso il file pulito tiene un solo tag, la rotazione, e nient'altro. Non dice niente di te né di dove eri."
  - q: "Instagram e WhatsApp non li tolgono già?"
    a: "Secondo quanto riportato da più fonti, i grandi social come Facebook, Instagram e X tolgono la posizione dalle copie che vedono gli altri, anche se l'azienda stessa può leggerla quando carichi la foto. Molte altre strade invece lasciano il file com'è: gli allegati email, i link di condivisione del cloud, i file inviati come documento su WhatsApp o Telegram, e tanti forum e piccoli siti. Se pulisci la foto prima, non devi sapere quale fa cosa."
  - q: "Posso pulire qui le foto HEIC dell'iPhone?"
    a: "Non direttamente: questo strumento legge JPG, PNG e WebP. Converti le foto HEIC con il convertitore da HEIC a JPG di questo sito. Il JPG che crea contiene solo l'immagine, quindi la posizione e tutti gli altri dettagli sono già spariti."
ui:
  exif.drop.hint: "JPG, PNG o WebP. Controllate e pulite sul tuo dispositivo; non viene caricato niente."
  exif.mode.legend: "Cosa rimuovere"
  exif.mode.all: "Tutto"
  exif.mode.gps: "Solo la posizione"
  exif.mode.allNote: "Posizione, fotocamera, date e ogni altro tag. Resta solo la rotazione, se serve."
  exif.mode.gpsNote: "Solo la posizione GPS. Fotocamera, data e il resto restano com'erano."
  exif.progress: "Avanzamento"
  exif.list: "Le tue foto"
  exif.factsLabel: "Cosa rivela questa foto"
  exif.clean.one: "Rimuovi i metadati da {count} foto"
  exif.clean.other: "Rimuovi i metadati da {count} foto"
  exif.cleanGps.one: "Rimuovi la posizione da {count} foto"
  exif.cleanGps.other: "Rimuovi la posizione da {count} foto"
  exif.zipName: "foto-senza-metadati.zip"
  exif.zipNameGps: "foto-senza-posizione.zip"
  exif.fact.clean: "Nessun metadato trovato. Questa foto è già pulita."
  exif.fact.location: "Posizione: {lat}, {lon} (arrotondata qui; nel file può essere più precisa)"
  exif.fact.locationUnreadable: "Posizione: sì, ma le coordinate non si possono leggere"
  exif.fact.noLocation: "Posizione: nessuna"
  exif.fact.camera: "Fotocamera: {camera}"
  exif.fact.date: "Scattata: {date}"
  exif.fact.software: "Programma: {software}"
  exif.fact.other.one: "Più {count} altro tag"
  exif.fact.other.other: "Più altri {count} tag"
  exif.fact.unreadable: "Un blocco EXIF che non si può leggere"
  exif.fact.blocks: "Inoltre: {list}"
  exif.block.xmp: "dati XMP"
  exif.block.iptc: "didascalie e crediti IPTC"
  exif.block.comment: "un commento"
  exif.block.text: "note di testo"
  exif.block.time: "l'ora dell'ultima modifica"
  exif.block.thumbnail: "una piccola anteprima della foto"
  exif.block.extra: "immagini extra salvate con la foto"
  exif.block.app: "altri dati delle app"
  exif.status.reading: "Lettura ({size})…"
  exif.status.ready: "{size}. Ancora nessuna modifica."
  exif.status.done: "Metadati rimossi: {before} → {after}"
  exif.status.doneGps: "Posizione rimossa: {before} → {after}"
  exif.status.nothing: "Niente da rimuovere: {before} → {after}"
  exif.status.noLocation: "Nessuna posizione da rimuovere: {before} → {after}"
  exif.status.keptOrientation: "Indicazione di rotazione tenuta, così si apre dritta"
  exif.status.droppedUnreadable: "Il suo blocco EXIF non si poteva leggere, quindi è stato rimosso tutto per sicurezza"
  exif.error.decode: "non è stato possibile leggere questo file. Potrebbe essere danneggiato o non essere davvero un JPG, PNG o WebP."
  exif.error.unsupported: "questo formato non è supportato qui. Lo strumento pulisce JPG, PNG e WebP."
  exif.error.heic: "le foto HEIC non sono supportate qui. Convertendole in JPG perdono tutti i metadati:"
  exif.error.heicLink: "da HEIC a JPG"
  exif.error.heicHref: "/it/heic-in-jpg/"
  exif.error.avif: "le immagini AVIF non sono supportate qui. Convertendole in JPG perdono tutti i metadati:"
  exif.error.avifLink: "da AVIF a JPG"
  exif.error.avifHref: "/it/avif-in-jpg/"
  exif.downloadNamed: "Scarica {name}"
  exif.removeFile: "Togli dall'elenco"
  exif.removeNamed: "Togli {name} dall'elenco"
  exif.summary.reading.one: "Lettura in corso: {done} su {total}."
  exif.summary.reading.other: "Lettura in corso: {done} su {total}."
  exif.summary.checked.one: "Foto controllate: {count}."
  exif.summary.checked.other: "Foto controllate: {count}."
  exif.summary.located.one: "{count} rivela dove è stata scattata."
  exif.summary.located.other: "{count} rivelano dove sono state scattate."
  exif.summary.done.one: "Fatto. Foto pulite pronte: {count}."
  exif.summary.done.other: "Fatto. Foto pulite pronte: {count}."
  exif.summary.sizes: "Peso totale {before} → {after}."
  exif.summary.failed.one: "Non letta: {count}."
  exif.summary.failed.other: "Non lette: {count}."
---

## Cosa sono i dati EXIF

Quando un telefono o una fotocamera salva una foto, scrive nel file, accanto all'immagine, un blocco di dettagli. Sono i dati EXIF. Di solito contengono marca e modello della fotocamera, data e ora, le impostazioni di scatto e, se la localizzazione è attiva, le coordinate GPS del punto in cui ti trovavi. Le app di fotoritocco aggiungono il proprio nome, e a volte dati XMP con altre informazioni.

Sullo schermo non si vede niente, ma chiunque riceva il file originale può leggerli con un'app gratuita, o aprendo le proprietà del file sul computer.

## Cosa può rivelare una foto

La posizione è il dato più delicato. Una foto scattata in salotto, davanti alla scuola di tuo figlio o con la macchina parcheggiata sotto casa contiene coordinate precise a pochi metri. Bastano poche foto così perché uno sconosciuto capisca dove abiti e quando ci sei di solito. Data e ora gli dicono quando, e il modello della fotocamera, insieme ad eventuali numeri di serie, può collegare foto pubblicate da account diversi alla stessa persona.

Secondo quanto riportato da più fonti, i grandi social come Facebook, Instagram e X tolgono questi dati dalle copie che vedono gli altri. Molte altre strade invece lasciano il file com'è: gli allegati email, i link di condivisione del cloud, i file inviati come documento su WhatsApp o Telegram, gli annunci su tanti siti di compravendita e forum, e il tuo sito personale. Sull'iPhone, inoltre, il foglio di condivisione ha un link Opzioni da cui puoi escludere la posizione per quella singola condivisione.

## Tutto, oppure solo la posizione

**Tutto** rimuove posizione, fotocamera, date, programmi, dati XMP e IPTC, commenti, la piccola anteprima che alcune fotocamere nascondono nel file e le eventuali immagini extra salvate con la foto, come la mappa di luminosità HDR che aggiungono alcuni telefoni recenti. Senza quella mappa, su uno schermo HDR la foto può sembrare un po' meno brillante; altrove resta identica.

**Solo la posizione** rimuove le coordinate GPS, sia dai dati EXIF sia dagli XMP, e tiene tutto il resto, così l'app delle foto continua a ordinarle per data e a sapere con quale fotocamera sono state scattate. Un nome di luogo scritto da te o da un'app in una didascalia resta; scegli Tutto per togliere anche quello. Se ti serve solo questo, [Rimuovere la posizione dalle foto](/it/rimuovere-posizione-dalle-foto/) parte già con questa opzione.

## L'indicazione di rotazione

Spesso il telefono salva la foto così come l'ha vista il sensore e aggiunge un'indicazione che dice "ruotala di 90 gradi". Se la togli, una foto in verticale si apre di lato. Per questo, quando una foto ce l'ha, il file pulito tiene un piccolissimo blocco EXIF con quel solo tag e nient'altro. Non dice niente di te, del luogo o del dispositivo.

## Perché l'immagine non viene salvata di nuovo

Molti strumenti per togliere i metadati aprono la foto e ne salvano una copia nuova. Per un JPG significa comprimerla di nuovo, e ogni volta si perde un po' di qualità. Questo strumento lavora sulla struttura del file: toglie i blocchi di metadati e copia i dati compressi dell'immagine byte per byte. La foto che scarichi è identica a quella che avevi, e il file pesa qualche kilobyte in meno.

Tutto avviene in questa scheda del browser. Le foto vengono lette dal tuo disco e le copie pulite vengono salvate di nuovo lì; non passa niente dalla rete. Le foto dell'iPhone in formato HEIC non si leggono qui, ma [da HEIC a JPG](/it/heic-in-jpg/) le converte in JPG senza alcun metadato. Se vuoi anche file più leggeri, [Comprimere immagini](/it/comprimere-immagini/) e [Ridimensionare immagini](/it/ridimensionare-immagini/) salvano copie nuove, anche loro senza dati EXIF.
