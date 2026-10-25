---
title: "Convertire HEIC in PNG senza perdita di qualità | Eolietech"
description: "Converti le foto HEIC dell'iPhone in PNG senza perdita, per ritoccarle o usarle nei programmi che non leggono l'HEIC. Tutto nel browser: le foto non vengono caricate."
h1: "Convertire HEIC in PNG"
intro: "Converti le foto di iPhone e iPad da HEIC a PNG quando ti serve una copia senza perdita: per ritoccarle, per tenere nitido il testo o per usarle in un programma che non accetta l'HEIC. Tutto avviene sul tuo dispositivo, quindi le foto non vengono mai caricate."
howTo:
  - "Scegli le foto .heic o .heif, oppure trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta, ognuna fino a 100 MB."
  - "Il formato di uscita è già impostato su PNG. Il cursore della qualità resta disattivato, perché il PNG è senza perdita."
  - "Aspetta che ogni foto sia pronta. Nell'elenco vedi il peso prima e dopo e le dimensioni in pixel."
  - "Scarica ogni PNG, oppure usa Scarica tutto per avere un .zip con tutte le foto convertite."
faq:
  - q: "La conversione da HEIC a PNG è senza perdita?"
    a: "La conversione sì. Il PNG contiene esattamente i pixel decodificati dall'HEIC, e se lo salvi di nuovo in un editor non si rovina. Non può però recuperare i dettagli che la compressione HEIC ha già eliminato al momento dello scatto, anche se con le impostazioni dell'iPhone quella perdita è difficilissima da vedere."
  - q: "Posso rendere i PNG più leggeri?"
    a: "Solo di poco. Ogni file passa già da oxipng, un ottimizzatore senza perdita, e il PNG non ha un'impostazione di qualità perché non scarta mai dettagli: per questo il cursore è disattivato. Per un file molto più leggero serve un formato con perdita, cioè il JPG, che si apre ovunque, oppure il WebP, se il sito su cui carichi le foto lo accetta. Con [Convertire PNG in WebP](/it/png-in-webp/) puoi trasformare i PNG in WebP."
  - q: "Per le foto dell'iPhone è meglio il PNG o il JPG?"
    a: "Per la maggior parte delle foto, il JPG. Si apre ovunque e con qualità 85 a schermo sembra identico all'originale, con un peso molto inferiore a quello di un PNG. Scegli il PNG se devi ritoccare l'immagine, se contiene testo o linee sottili, o se un programma ti chiede proprio un PNG."
  - q: "Il PNG conserva la data dello scatto e la posizione?"
    a: "No. Il PNG contiene solo l'immagine, senza i dati EXIF presenti nell'HEIC: niente posizione GPS, data dello scatto o modello della fotocamera. Così i file sono più sicuri da condividere, ma le app per le foto potrebbero ordinarli secondo la data in cui hai creato il PNG, invece del giorno dello scatto."
  - q: "Le mie foto vengono caricate su un server?"
    a: "No. Decodifica e codifica avvengono dentro questa scheda del browser, quindi le foto non lasciano mai il tuo dispositivo. Per lo stesso motivo la velocità dipende dal dispositivo: con molte foto un telefono datato ci mette di più di un portatile recente."
ui:
  img.drop.hint: "Foto HEIC o HEIF, salvate in PNG senza perdita sul tuo dispositivo. Non viene caricato niente."
  img.zipName: "heic-in-png.zip"
---

## Quando conviene il PNG

Il PNG è un formato senza perdita. I pixel che ottieni sono quelli decodificati dall'HEIC, e restano identici anche se apri e salvi il file cento volte. Per questo è la scelta giusta in alcuni casi precisi.

- **Devi ritoccare la foto.** Ritagli, correzioni del colore, scritte o un montaggio in un progetto grafico vogliono dire salvare l'immagine più volte. Il JPG perde un po' di dettaglio a ogni salvataggio, il PNG no: lavori sul PNG ed esporti in JPG una volta sola, alla fine.
- **Nella foto c'è soprattutto testo.** Le foto di documenti, lavagne, slide e scontrini salvate in JPG mostrano spesso piccole sbavature attorno alle lettere. Il PNG lascia i contorni puliti, e torna utile anche se poi vuoi [estrarre il testo dall'immagine](/it/estrarre-testo-da-immagine/).
- **Il programma vuole un PNG.** Alcuni strumenti di grafica, modelli di presentazione e moduli di caricamento accettano il PNG ma non l'HEIC.

Gli screenshot fatti con l'iPhone sono già in PNG, quindi non serve convertirli. I file HEIC arrivano dall'app Fotocamera, che usa questo formato per impostazione predefinita da iOS 11.

## Il rovescio della medaglia: il peso

Il PNG di una fotografia pesa parecchio. HEIC e JPG scartano dettagli che l'occhio difficilmente nota, mentre il PNG conserva ogni pixel, e le foto della fotocamera sono piene di grana e di texture fini che la compressione senza perdita riesce a ridurre poco. Una foto da 12 megapixel che in HEIC occupa da 1 a 3 MB diventa di solito un PNG da 15 MB o più. Nell'elenco sotto il riquadro vedi il peso prima e dopo di ogni file, quindi te ne accorgi subito.

Se devi solo mandare le foto a qualcuno, pubblicarle o aprirle su un PC Windows, con [Convertire HEIC in JPG](/it/heic-in-jpg/) ottieni file molto più leggeri che a schermo sembrano uguali. Puoi anche passare al JPG direttamente qui, dal menu del formato: le foto già nell'elenco vengono riconvertite con la nuova impostazione.

## Come funziona

Ogni foto viene decodificata nel browser da libheif, la libreria HEIF open source compilata in WebAssembly. I pixel vengono poi salvati in PNG e passati a oxipng, che alleggerisce i file PNG senza cambiare nemmeno un pixel. Il lavoro avviene in worker in background, così la pagina resta utilizzabile, e le foto vengono raddrizzate usando l'orientamento salvato nel file. I PNG vengono creati in questa scheda e salvati direttamente sul tuo dispositivo; non passa niente dalla rete. La conversione funziona nelle versioni attuali di Chrome, Edge, Firefox e Safari.
