---
title: "Ridurre il peso di una foto in KB | Eolietech"
description: "Porta una foto sotto il peso chiesto da un modulo online: 20, 50, 100 KB o qualsiasi altro. JPG o WebP, fino a 50 alla volta, nel browser: non si carica niente."
h1: "Comprimi foto in KB"
intro: "Capita spesso che un modulo online rifiuti una foto perché pesa qualche KB di troppo. Scrivi il limite indicato, aggiungi le foto e ognuna torna sotto quel peso con la qualità migliore possibile. Tutto avviene sul tuo dispositivo, quindi le foto non vengono mai caricate."
howTo:
  - "Scrivi il peso massimo indicato dal modulo, in KB. Si parte da 100 KB e puoi scrivere qualsiasi numero intero da 1 a 50.000."
  - "Lascia il formato JPG, accettato da quasi tutti i moduli, oppure scegli WebP se il modulo lo prevede."
  - "Scegli le immagini o trascinale nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 50 alla volta."
  - "Ogni riga mostra il nuovo peso, la misura in pixel e la qualità usata. Scarica le immagini una per una o usa Scarica tutto per avere un .zip. Se poi cambi peso o formato, l'elenco viene ricompresso."
faq:
  - q: "Le mie foto vengono caricate?"
    a: "No. Decodifica, riduzione e salvataggio avvengono in questa scheda del browser. La pagina scarica gli encoder da questo sito una volta sola e non invia mai i tuoi file da nessuna parte."
  - q: "Perché la foto è diventata più piccola in pixel?"
    a: "Una foto del telefono ha milioni di pixel, e un file leggero non riesce a descriverli tutti. Lo strumento mantiene la misura originale ogni volta che la foto ci sta con una qualità di almeno 40. Se non ci sta, la rimpicciolisce fino alla misura più grande che rientra nel limite, e in quel caso la riga mostra di solito una qualità vicina a 40."
  - q: "1 KB vale 1000 o 1024 byte?"
    a: "Qui vale 1000. Un file sotto i 100 KB contati così è sotto i 100 KB anche se il modulo conta 1024 byte per KB, quindi va bene in entrambi i casi."
  - q: "E se l'immagine pesa già meno del limite?"
    a: "Se è già sotto il peso che hai scritto e nel formato che hai scelto, non viene compressa di nuovo. Vengono tolti solo i metadati nascosti, così pesa anche un po' meno, e la sua riga te lo dice. Un PNG sotto il limite viene comunque salvato in JPG o WebP, perché è il formato che hai chiesto."
  - q: "Posso impostare anche larghezza e altezza?"
    a: "Non in questa pagina. Se il modulo chiede misure precise in pixel, ridimensiona o ritaglia prima la foto con gli strumenti di ridimensionamento e ritaglio di questo sito, poi comprimi qui il risultato. Finché ci sta con una qualità di almeno 40, la misura in pixel resta quella."
  - q: "Cosa vuol dire che l'immagine non scende sotto il peso scelto?"
    a: "Lo strumento non rimpicciolisce mai un'immagine sotto i 200 px sul lato lungo. Alcune immagini, per esempio quelle molto sgranate o piene di rumore, pesano troppo anche a quella misura, e la loro riga mostra un errore. Scrivi un peso maggiore, oppure ritaglia le parti che non servono e riprova."
  - q: "La foto conserva la posizione e i dati della fotocamera?"
    a: "No. Ogni file che scarichi contiene solo l'immagine, senza dati EXIF come la posizione GPS o il modello della fotocamera, anche quelli che erano già abbastanza leggeri. Le foto restano comunque nel verso giusto."
ui:
  img.drop.hint: "JPG, PNG, WebP o AVIF. Compresse sul tuo dispositivo; non viene caricato niente."
  img.option.targetKb: "Peso massimo (KB)"
  img.option.saveAs: "Salva come"
  img.note.target: "Ogni immagine viene salvata sotto i {kb} KB ({bytes} byte) con la qualità più alta possibile, e rimpicciolita in pixel solo se serve."
  img.note.kb: "Qui 1 KB vale 1.000 byte, così il file va bene anche per i moduli che ne contano 1.024."
  img.note.missing: "Scrivi un peso da 1 a {max} KB."
  img.progress: "Avanzamento"
  img.list: "Le tue immagini"
  img.zipName: "immagini-compresse.zip"
  img.status.pending: "In attesa ({size})"
  img.status.working: "Compressione ({size})…"
  img.status.resized: "{fromWidth} × {fromHeight} → {width} × {height} px"
  img.status.smaller: "{before} → {after}, {percent}% in meno"
  img.status.larger: "{before} → {after}, {percent}% in più"
  img.status.same: "{before} → {after}, stesso peso"
  img.status.dimensions: "{width} × {height} px"
  img.status.quality: "Qualità {quality}"
  img.status.unchanged: "Già sotto il limite: immagine lasciata com'è, senza metadati ({after})"
  img.status.keepOriginal: "Il nuovo file non è più leggero, quindi conviene tenere l'originale"
  img.status.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza"
  img.error.decode: "non è stato possibile leggere questo file. Potrebbe essere danneggiato, animato o non essere davvero un'immagine di questo tipo."
  img.error.unsupported: "questo tipo di file non è supportato qui."
  img.error.memory: "non c'era abbastanza memoria per questa immagine. Prova con meno file alla volta."
  img.error.noFit: "questa immagine non scende sotto il peso scelto, nemmeno a 200 px sul lato lungo e con qualità bassa. Prova con un peso maggiore."
  img.downloadNamed: "Scarica {name}"
  img.downloadOriginal: "Scarica l'originale"
  img.downloadOriginalNamed: "Scarica l'originale di {name}"
  img.downloadNew: "Scarica comunque il nuovo file"
  img.downloadNewNamed: "Scarica comunque il nuovo {name}"
  img.removeNamed: "Rimuovi {name}"
  img.summary.working.one: "Compressione in corso: {done} su {total}."
  img.summary.working.other: "Compressione in corso: {done} su {total}."
  img.summary.done.one: "Fatto. Immagini pronte: {done} su {total}."
  img.summary.done.other: "Fatto. Immagini pronte: {done} su {total}."
  img.summary.sizes: "Peso totale {before} → {after}."
  img.summary.failed.one: "Non compressa: {failed}."
  img.summary.failed.other: "Non compresse: {failed}."
---

## Come si arriva al peso giusto

Lo strumento lascia ogni immagine alla sua misura originale quando può, e cerca la qualità più alta, tra 40 e 92, che la tiene sotto il peso che hai scritto. Il tetto è 92 perché oltre i file crescono molto senza differenze visibili, e il minimo è 40 perché sotto le foto JPG cominciano a mostrare i quadretti e quelle WebP sembrano impastate.

Se anche a qualità 40 la foto pesa troppo, lo strumento la rimpicciolisce, con le sue proporzioni, fino alla misura più grande che rientra nel limite. Per capire quanto ridurla parte da una piccola copia di prova invece di andare a tentativi, quindi per una grande foto del telefono bastano di solito pochi passaggi. Si ferma a 200 px sul lato lungo: un'immagine che a quel punto pesa ancora troppo viene segnalata con un errore e non viene salvata.

## Perché qui 1 KB vale 1.000 byte

Alcuni siti contano un kilobyte come 1.000 byte, altri come 1.024, e il modulo di rado dice quale. Anche Windows conta 1.024, quindi un file da 100.000 byte lì appare di circa 98 KB, mentre macOS conta 1.000. Tenendo ogni file sotto il peso scelto moltiplicato per 1.000 byte, lo strumento ti dà un file che passa entrambi i controlli. La nota sotto il campo del peso mostra il numero esatto di byte.

## I pesi più richiesti

Ognuna di queste pagine parte dal suo peso e spiega a cosa serve:

- [Comprimi una foto a 20 KB](/it/comprimere-foto-a-20kb/) per firme scansionate e piccole foto tessera.
- [Comprimi una foto a 50 KB](/it/comprimere-foto-a-50kb/) per foto da allegare alle domande e scansioni di documenti.
- [Comprimi una foto a 100 KB](/it/comprimere-foto-a-100kb/) per portali di lavoro e foto profilo.
- [Comprimi una foto a 200 KB](/it/comprimere-foto-a-200kb/) per forum, siti meno recenti ed email più leggere.

## Come funziona

Tutto avviene in un worker in background dentro questa scheda, con MozJPEG per il JPG, libwebp per il WebP e il filtro Lanczos3 quando una foto va rimpicciolita. Nessun file passa dalla rete, cosa che conta quando la foto è un documento d'identità o una firma. Se vuoi file più leggeri senza un limite fisso, [Comprimere immagini](/it/comprimere-immagini/) ti fa scegliere la qualità. Le foto dell'iPhone salvate in HEIC vanno prima convertite con [HEIC in JPG](/it/heic-in-jpg/).
