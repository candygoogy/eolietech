---
title: "Ridimensionare immagini nel browser | Eolietech"
description: "Ridimensiona immagini JPG, PNG, WebP e AVIF per larghezza, altezza o percentuale, fino a 50 alla volta. Tutto avviene nel browser: non viene caricato niente."
h1: "Ridimensiona le immagini"
intro: "Porta le immagini a una larghezza, un'altezza o una percentuale precisa, una sola o 50 insieme. Il ridimensionamento avviene sul tuo dispositivo, quindi le immagini non vengono mai caricate."
howTo:
  - "Scegli le immagini o trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "Scegli come ridimensionare: per larghezza, per altezza, dentro una larghezza e un'altezza o in percentuale, poi scrivi la misura. La riga sotto i campi ti dice cosa succederà."
  - "Lascia il formato com'è, oppure passa a JPG, PNG, WebP o AVIF. Per le foto, con qualità 85 non noti differenze dall'originale."
  - "Controlla la nuova misura in pixel e il peso accanto a ogni immagine, poi scaricale una per una o usa Scarica tutto per avere un .zip."
faq:
  - q: "Le mie immagini vengono caricate?"
    a: "No. Decodifica, ridimensionamento e codifica avvengono in questa scheda del browser. La pagina scarica gli encoder da questo sito una volta sola e non invia mai i tuoi file da nessuna parte."
  - q: "Le immagini verranno deformate?"
    a: "Solo se lo chiedi tu. Larghezza, altezza e percentuale mantengono sempre le proporzioni di ogni immagine. Con larghezza e altezza, togli la spunta a Mantieni le proporzioni solo se ogni immagine deve avere esattamente quella misura, anche a costo di deformarla."
  - q: "Cosa succede alle immagini più piccole della misura scelta?"
    a: "Restano della loro misura, e la riga te lo dice, perché ingrandire non aggiunge dettagli. Spunta Ingrandisci anche le immagini più piccole se ti servono comunque più grandi, sapendo che possono sembrare meno nitide."
  - q: "Posso ritagliare le immagini in un quadrato o in un altro formato?"
    a: "Non qui. Il ridimensionamento tiene tutta l'immagine e cambia solo quanti pixel ha. Per ritagliarla in un quadrato, in 4:5 o in 16:9 usa lo strumento Ritagliare immagini di questo sito, poi ridimensiona qui il risultato se ti serve."
  - q: "Il ridimensionamento conserva la posizione e i dati della fotocamera?"
    a: "No. I nuovi file contengono solo l'immagine, senza dati EXIF come la posizione GPS o il modello della fotocamera. Prima le foto vengono raddrizzate, così anche quelle scattate di lato escono nel verso giusto."
ui:
  img.drop.hint: "JPG, PNG, WebP o AVIF. Ridimensionate sul tuo dispositivo; non viene caricato niente."
  img.option.mode: "Ridimensiona per"
  img.mode.width: "Larghezza"
  img.mode.height: "Altezza"
  img.mode.box: "Larghezza e altezza"
  img.mode.percent: "Percentuale"
  img.option.width: "Larghezza (px)"
  img.option.height: "Altezza (px)"
  img.option.percent: "Percentuale (%)"
  img.option.keepAspect: "Mantieni le proporzioni"
  img.option.enlarge: "Ingrandisci anche le immagini più piccole"
  img.note.width: "Ogni immagine diventa larga {width} px, e l'altezza si adegua."
  img.note.height: "Ogni immagine diventa alta {height} px, e la larghezza si adegua."
  img.note.fit: "Ogni immagine entra in {width} × {height} px e mantiene le sue proporzioni."
  img.note.stretch: "Ogni immagine diventa esattamente {width} × {height} px, deformata se ha una forma diversa."
  img.note.percent: "Ogni immagine diventa il {percent}% della sua larghezza e altezza."
  img.note.noEnlarge: "Le immagini già più piccole restano della loro misura."
  img.note.enlarge: "Anche le immagini più piccole vengono ingrandite, e possono sembrare meno nitide."
  img.note.missing.width: "Scrivi una larghezza da 1 a {max} px."
  img.note.missing.height: "Scrivi un'altezza da 1 a {max} px."
  img.note.missing.both: "Scrivi una larghezza e un'altezza da 1 a {max} px."
  img.note.missing.percent: "Scrivi una percentuale da 1 a {maxPercent}."
  img.option.format: "Formato di uscita"
  img.format.original: "Come l'originale"
  img.option.quality: "Qualità"
  img.option.qualityNote: "Vale per JPG, WebP e AVIF. Con 85 le foto restano quasi identiche all'originale."
  img.option.qualityPng: "Il PNG è senza perdita, quindi la qualità non si applica."
  img.progress: "Avanzamento"
  img.list: "Le tue immagini"
  img.privacy: "Le tue immagini vengono ridimensionate in questa scheda del browser e non vengono mai caricate."
  img.zipName: "immagini-ridimensionate.zip"
  img.status.pending: "In attesa ({size})"
  img.status.working: "Ridimensionamento ({size})…"
  img.status.resized: "{fromWidth} × {fromHeight} → {width} × {height} px"
  img.status.notEnlarged: "Più piccola della misura scelta, quindi non ingrandita"
  img.status.smaller: "{before} → {after}, {percent}% in meno"
  img.status.larger: "{before} → {after}, {percent}% in più"
  img.status.same: "{before} → {after}, stesso peso"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "Stessa misura in pixel e il nuovo file non è più leggero, quindi conviene tenere l'originale"
  img.status.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza"
  img.error.decode: "non è stato possibile leggere questo file. Potrebbe essere danneggiato, animato o non essere davvero un'immagine di questo tipo."
  img.error.unsupported: "questo tipo di file non è supportato qui."
  img.error.memory: "non c'era abbastanza memoria per questa misura. Prova con una misura più piccola o con meno file alla volta."
  img.downloadNamed: "Scarica {name}"
  img.downloadOriginal: "Scarica l'originale"
  img.downloadOriginalNamed: "Scarica l'originale di {name}"
  img.downloadNew: "Scarica comunque il nuovo file"
  img.downloadNewNamed: "Scarica comunque il nuovo {name}"
  img.removeNamed: "Rimuovi {name}"
  img.summary.working.one: "Ridimensionamento in corso: {done} su {total}."
  img.summary.working.other: "Ridimensionamento in corso: {done} su {total}."
  img.summary.done.one: "Fatto. File ridimensionati: {done} su {total}."
  img.summary.done.other: "Fatto. File ridimensionati: {done} su {total}."
  img.summary.sizes: "Peso totale {before} → {after}."
  img.summary.failed.one: "Non ridimensionato: {failed}."
  img.summary.failed.other: "Non ridimensionati: {failed}."
---

## Quale opzione scegliere

- **Larghezza** o **Altezza**: ogni immagine prende la stessa larghezza (o altezza), e l'altro lato segue le sue proporzioni. È la scelta giusta quando le immagini vanno in una colonna di larghezza fissa, come un articolo di blog o la scheda di un prodotto.
- **Larghezza e altezza**: ogni immagine entra nel riquadro, quindi nessun lato lo supera. Con un riquadro di 1600 × 1600 px le foto orizzontali e verticali hanno lo stesso lato lungo. Togli la spunta a **Mantieni le proporzioni** solo se ogni immagine deve avere esattamente quella misura.
- **Percentuale**: ogni immagine si riduce (o cresce) nella stessa misura, qualunque sia la sua grandezza. Con 50% larghezza e altezza si dimezzano, e restano circa un quarto dei pixel.

## Le misure per gli usi più comuni

Per un sito web, da 1600 a 2000 px di larghezza bastano per quasi tutti i layout, anche sugli schermi più nitidi. Per l'email, 1600 px sul lato lungo sono più che sufficienti, e [Ridimensiona le immagini per email](/it/ridimensionare-immagini-per-email/) parte già con questa misura e il JPG. Per Instagram, [Ridimensiona le immagini per Instagram](/it/ridimensionare-immagini-per-instagram/) parte da 1080 px di larghezza.

Il ridimensionamento mantiene la forma di ogni immagine. Se ti serve un quadrato o un formato 4:5, ritaglia prima con [Ritagliare immagini](/it/ritagliare-immagini/). Se la misura in pixel va già bene e vuoi solo file più leggeri, usa [Comprimere immagini](/it/comprimere-immagini/).

## Come funziona

Questo strumento ricampiona ogni immagine con il filtro Lanczos3, lo stesso di Squoosh, e poi la salva con MozJPEG, libwebp, libavif o oxipng. Tutto gira in un worker in background dentro questa scheda, così la pagina resta usabile anche con molti file e nessun file passa dalla rete. Ogni immagine può pesare fino a 100 MB. La velocità dipende dal processore e dalla memoria del tuo dispositivo, e l'AVIF richiede parecchio più tempo degli altri formati per essere salvato.
