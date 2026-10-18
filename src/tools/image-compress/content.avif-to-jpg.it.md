---
title: "Convertire AVIF in JPG che si apre ovunque | Eolietech"
description: "Converti le immagini AVIF in JPG per le app e i siti che non supportano ancora l'AVIF. Scegli la qualità e converti in blocco, in privato nel tuo browser."
h1: "Convertitore da AVIF a JPG"
intro: "Hai un file .avif che il tuo editor, il telefono o un modulo di caricamento non vogliono aprire? Convertilo qui in un normale JPG. La qualità la scegli tu, e la conversione avviene sul tuo dispositivo."
howTo:
  - "Scegli i tuoi file .avif, oppure trascinali nel riquadro qui sopra."
  - "JPG è già selezionato. Imposta la qualità: tra 80 e 90 il risultato resta vicino all'AVIF."
  - "Se vuoi, inserisci una larghezza o un'altezza massima per rimpicciolire le immagini."
  - "Scarica ogni JPG o l'intero blocco in un .zip."
faq:
  - q: "Perché non riesco ad aprire i file AVIF?"
    a: "L'AVIF è un formato piuttosto recente (2019). I browser attuali lo mostrano, ma molti visualizzatori di immagini, sistemi operativi più vecchi, app per ufficio e siti web ancora non lo accettano. Il JPG funziona quasi ovunque."
  - q: "Perché il JPG è più grande dell'AVIF?"
    a: "L'AVIF comprime in modo molto più efficiente del JPG, quindi un JPG di qualità visiva simile di solito ha bisogno di almeno il doppio dei byte. Abbassare la qualità del JPG riduce il peso, ma rende più visibili gli artefatti."
  - q: "Cosa succede alla trasparenza?"
    a: "L'AVIF può essere trasparente, il JPG no. Le zone trasparenti vengono fuse su uno sfondo bianco, e l'elenco ti dice quando è successo. Per mantenere la trasparenza usa da AVIF a PNG."
  - q: "Funziona con gli AVIF HDR o animati?"
    a: "Lo strumento converte immagini statiche in JPG standard a 8 bit. Gli AVIF animati non vengono convertiti come animazioni, e le immagini HDR vengono convertite senza tone mapping HDR, quindi le zone molto luminose possono sembrare bruciate."
ui:
  img.drop.hint: "Immagini AVIF. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "avif-in-jpg.zip"
---

## Rendere i file AVIF utilizzabili ovunque

L'AVIF è sempre più diffuso sul web: i siti lo servono ai browser che lo supportano, e alcuni telefoni e fotocamere possono salvarci le foto. Prova però a salvare una di quelle immagini e potresti scoprire che il tuo visualizzatore di foto, il programma di videoscrittura o il sito su cui vuoi caricarla non riconoscono il file. Il JPG è da decenni il formato universale per le foto, quindi convertire è il modo più semplice per aggirare il problema.

## Impostazioni di qualità

Entrambi i formati sono con perdita. Dato che l'AVIF è così efficiente, un JPG ha bisogno di una qualità piuttosto alta per sembrare uguale, quindi tra 80 e 90 è un buon punto di partenza. Se conta di più il peso, prova 75 e confronta. L'elenco mostra le dimensioni prima e dopo, e spostando il cursore il blocco viene riconvertito, così trovi in fretta il giusto equilibrio.

## Trasparenza e limiti

Alcune immagini AVIF, come loghi e sticker, hanno lo sfondo trasparente. Il JPG non può contenere trasparenza, quindi quelle zone diventano bianche. Se ti serve mantenerle trasparenti, usa invece [AVIF in PNG](/it/avif-in-png/).

Il convertitore è fatto per le immagini statiche: le sequenze AVIF animate non vengono convertite come animazioni, e le immagini HDR a 10 o 12 bit vengono ridotte al colore standard a 8 bit senza tone mapping, il che va bene per le foto comuni ma può appiattire le luci più intense.

## Conversione privata

Il decoder AVIF (libavif) e l'encoder MozJPEG girano come WebAssembly dentro il tuo browser. Non viene caricato nulla, e la conversione avviene in un worker in background, così la pagina resta reattiva.
