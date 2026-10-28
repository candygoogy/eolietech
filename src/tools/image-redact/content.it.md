---
title: "Oscurare parte di una foto o di uno screenshot | Eolietech"
description: "Copri nomi, IBAN, numeri d'ordine, volti e targhe in uno screenshot o in una foto, con un riquadro nero, la sfocatura o i pixel. Funziona nel browser, non carichi niente."
h1: "Oscurare parte di una foto"
intro: "Prima di pubblicare uno screenshot o mandare una foto, nascondi quello che gli altri non devono vedere: un nome, un IBAN, un numero d'ordine, un volto, una targa. Disegna un riquadro su ognuno, scegli tra riquadro nero, sfocatura e pixel e salva una copia. L'immagine non lascia mai il tuo dispositivo."
howTo:
  - "Scegli un'immagine o trascinala nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, una alla volta, fino a 100 MB."
  - "Trascina sull'immagine per disegnare un riquadro su ogni cosa da nascondere. Trascina un riquadro per spostarlo, tira bordi e angoli per cambiarne la misura e premi la sua × per toglierlo. Da tastiera, premi Aggiungi un riquadro e spostalo con le frecce."
  - "Riquadro nero è già selezionato, ed è la scelta giusta per testo e numeri. Per i volti puoi passare a Sfocatura o Pixel e regolare l'intensità. L'anteprima si aggiorna mentre lavori."
  - "Premi Salva l'immagine oscurata, poi Scarica. In Salva come tieni il formato originale, oppure scegli JPG, PNG o WebP."
faq:
  - q: "Meglio il riquadro nero, la sfocatura o i pixel?"
    a: "Per testo e numeri usa Riquadro nero. Sfocatura e pixel lasciano una traccia di quello che c'era, e sul testo quella traccia a volte si può ricostruire in parte o indovinare per tentativi, soprattutto con stringhe corte come una targa o le ultime cifre di una carta. Il riquadro nero rende nero pieno ogni pixel al suo interno, quindi dell'originale non resta niente. Sfocatura e pixel vanno bene per volti e sfondi, quando vuoi che la foto resti naturale."
  - q: "Qualcuno può togliere il riquadro nero dall'immagine salvata?"
    a: "No. Il nero è scritto nei pixel del nuovo file, e i pixel che stavano sotto il riquadro non vengono salvati da nessuna parte. JPG, PNG e WebP non hanno livelli da staccare. L'immagine originale resta com'era sul tuo dispositivo, quindi assicurati di condividere la copia oscurata."
  - q: "Il file salvato conserva la posizione e i dati del telefono?"
    a: "No. Il nuovo file contiene solo i pixel, senza dati EXIF come le coordinate GPS, la data o il modello del telefono. Le foto scattate con la localizzazione attiva di solito registrano il punto in cui sono state fatte, e per una foto di casa tua, della tua auto o della tua via è un dettaglio che conta."
  - q: "Salvando, l'immagine peggiora?"
    a: "Il PNG conserva ogni pixel così com'è, quindi è il formato migliore per gli screenshot. JPG, WebP e AVIF ricomprimono tutta l'immagine quando salvi, con qualità 90 se non la cambi, che tiene le foto vicine all'originale. Le dimensioni in pixel restano le stesse."
  - q: "La mia immagine viene caricata da qualche parte?"
    a: "No. L'immagine viene decodificata, oscurata e salvata di nuovo dentro questa scheda del browser, sul tuo dispositivo. La pagina scarica una volta gli encoder da questo sito e non invia mai la tua immagine da nessuna parte."
  - q: "Posso oscurare le foto HEIC dell'iPhone?"
    a: "Non direttamente. Prima convertile con lo strumento da HEIC a JPG di questo sito, poi apri qui il JPG."
ui:
  redact.drop.label: "Scegli un'immagine o trascinala qui"
  redact.drop.replace: "Scegli un'altra immagine"
  redact.drop.hint: "JPG, PNG, WebP o AVIF. Oscurata sul tuo dispositivo; non viene caricato niente."
  redact.opening: "Apertura di {name}…"
  redact.opened: "Hai aperto {name}, {width} × {height} px. Trascina sull'immagine per disegnare un riquadro su ciò che vuoi nascondere."
  redact.fileInfo: "{name} · {width} × {height} px · {size}"
  redact.previewAlt: "Anteprima di {name} con i riquadri applicati"
  redact.effect.legend: "Effetto"
  redact.effect.black: "Riquadro nero"
  redact.effect.blur: "Sfocatura"
  redact.effect.pixelate: "Pixel"
  redact.strength: "Intensità"
  redact.strength.note: "Cresce con ogni riquadro, così la stessa impostazione nasconde un volto grande e una targa piccola."
  redact.strength.noteBlack: "Il riquadro nero copre tutto quello che c'è sotto, quindi non c'è un'intensità da regolare."
  redact.safe: "Sul testo, sfocatura e pixel a volte si possono annullare in parte. Per testo e numeri la scelta sicura è il riquadro nero."
  redact.add: "Aggiungi un riquadro"
  redact.clear: "Togli tutti i riquadri"
  redact.count.none: "Ancora nessun riquadro"
  redact.count.one: "{count} riquadro"
  redact.count.other: "{count} riquadri"
  redact.cleared.one: "Hai tolto {count} riquadro."
  redact.cleared.other: "Hai tolto {count} riquadri."
  redact.hint: "Trascina sull'immagine per disegnare un riquadro, oppure premi Aggiungi un riquadro. Trascina un riquadro per spostarlo, e i suoi bordi o angoli per cambiarne la misura."
  redact.box.label: "Riquadro {box}"
  redact.box.state: "{width} × {height} px, a {x} px da sinistra e {y} px dall'alto."
  redact.box.hint: "Le frecce spostano il riquadro, e con Maiusc ogni passo vale 10 px. Alt (Opzione su Mac) più una freccia lo ridimensiona. Canc lo elimina."
  redact.box.remove: "Togli il riquadro {box}"
  redact.announce.added: "Aggiunto il riquadro {box}."
  redact.announce.box: "Riquadro {box}: {state}"
  redact.announce.removed: "Riquadro tolto."
  redact.option.format: "Salva come"
  redact.format.original: "Come l'originale, {format}"
  redact.option.quality: "Qualità"
  redact.option.qualityNote: "Vale per JPG, WebP e AVIF. Con 90 le foto restano vicine all'originale."
  redact.option.qualityPng: "Il PNG è senza perdita, quindi la qualità non si applica."
  redact.action: "Salva l'immagine oscurata"
  redact.working: "Oscuramento in corso…"
  redact.progress: "Avanzamento"
  redact.result: "Salvata a {width} × {height} px, {size}, senza dati EXIF."
  redact.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza."
  redact.downloadLabel: "Scarica {name}"
  redact.fileSuffix: "oscurata"
  redact.error.noBoxes: "Prima disegna almeno un riquadro su ciò che vuoi nascondere."
  redact.error.decode: "Non è stato possibile leggere {name}. Potrebbe essere danneggiato, animato o non essere davvero un'immagine di questo tipo."
  redact.error.unsupported: "{name} è un tipo di immagine che questo strumento non apre. Usa JPG, PNG, WebP o AVIF."
  redact.error.memory: "Non c'era abbastanza memoria per lavorare su {name}. Chiudi altre schede o prova con un'immagine più piccola."
  redact.error.failed: "Qualcosa è andato storto durante l'oscuramento di {name}. Riprova, oppure salvala in un altro formato."
  redact.error.heic: "{name} è una foto HEIC, che questo strumento non sa aprire. Convertila prima con"
  redact.error.heicLink: "da HEIC a JPG"
  redact.error.heicHref: "/it/heic-in-jpg/"
---

## Oscurare i dati in uno screenshot

Lo screenshot di una chat, di una conferma d'ordine, dell'app della banca o di un messaggio d'errore spesso mostra più di quanto volevi: nome e cognome, un indirizzo email, il numero dell'ordine o della spedizione, un IBAN, un codice fiscale, un numero di telefono in un angolo. Prima di pubblicarlo in un forum, in un gruppo WhatsApp o in una richiesta di assistenza, coprili con un riquadro nero.

Fai ogni riquadro un po' più grande del testo che copre: una lettera che spunta dal bordo può bastare per indovinare una parola. Gli screenshot di solito sono PNG, e se in Salva come lasci PNG il resto dell'immagine resta nitido come prima.

## Coprire la targa, il numero civico e i documenti

Le foto per un annuncio, che sia un'auto in vendita, una casa in affitto o una bici su un sito di usato, spesso mostrano più dell'oggetto: la targa, il numero civico, il nome della via, il cognome sul campanello. Per coprire la targa in una foto basta un riquadro nero, e ci vogliono pochi secondi.

Vale lo stesso per un documento che fotografi col telefono per mandarlo come prova, come la carta d'identità, una busta paga o una bolletta: copri i numeri che all'altra persona non servono.

## Perché per il testo il riquadro nero è la scelta sicura

Sfocatura e pixel mescolano tra loro i pixel di una zona, e qualcosa dell'originale sopravvive. Su un volto conta poco. Con il testo è diverso, perché lettere e cifre sono poche e molti numeri seguono uno schema noto. Si possono scrivere le combinazioni probabili con lo stesso carattere, sfocarle o pixelarle allo stesso modo e confrontarle con la tua immagine. Depix, uno strumento open source pubblicato nel 2020, in alcuni casi ricostruisce così il testo pixelato negli screenshot.

Il riquadro nero non lascia niente da confrontare: ogni pixel al suo interno diventa nero pieno, anche quelli trasparenti. La stessa prudenza vale per l'evidenziatore o il pennarello dell'editor di foto del telefono: se il tratto non è del tutto coprente, alzando la luminosità il testo sotto può tornare leggibile.

## Posizione e altri dati nascosti

Una foto del telefono contiene più dell'immagine: la data, il modello del telefono e, se la localizzazione è attiva, le coordinate GPS del punto in cui l'hai scattata. La copia oscurata viene scritta da zero a partire dai pixel e non contiene niente di tutto questo. Se vuoi solo togliere quei dati e lasciare l'immagine com'è, usa [Rimuovere EXIF](/it/rimuovere-exif/).

## Come funziona

L'immagine viene decodificata in un worker in background dentro questa scheda. Le foto del telefono vengono prima raddrizzate secondo l'orientamento salvato con loro, così i riquadri finiscono dove li hai disegnati. L'anteprima è una copia più piccola dell'immagine, e l'effetto che vedi lo calcola lo stesso codice che, quando salvi, lavora sui pixel a piena risoluzione. Ogni effetto cambia solo i pixel dentro il suo riquadro.

Un solo effetto e una sola intensità valgono per tutti i riquadri dell'immagine. Per sfocare un volto e coprire di nero un nome nella stessa foto, salva una volta con un effetto, poi apri la copia salvata e oscurala di nuovo con l'altro.

## Strumenti collegati

- Per i PDF c'è [Oscurare PDF](/it/oscurare-pdf/), che copre il testo e lo toglie dal file.
- Se quello che vuoi nascondere sta su un bordo, tagliarlo via con [Ritaglia un'immagine](/it/ritagliare-immagini/) può essere più pulito che coprirlo.
- [Sfocare i volti in una foto](/it/sfocare-volti-foto/) e [Pixelare un'immagine](/it/pixelare-immagine/) aprono questo strumento con la sfocatura o i pixel già selezionati.
