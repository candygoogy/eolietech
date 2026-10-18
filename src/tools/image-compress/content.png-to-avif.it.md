---
title: "Convertire PNG in AVIF mantenendo la trasparenza | Eolietech"
description: "Converti le immagini PNG in AVIF per file molto più leggeri, con la trasparenza mantenuta. Scegli qualità e dimensioni: la codifica avviene nel browser, senza caricare nulla."
h1: "Convertitore da PNG a AVIF"
intro: "Converti le immagini PNG in AVIF, un formato moderno che spesso salva la stessa immagine in una piccola frazione dello spazio e mantiene gli sfondi trasparenti. La codifica avviene sul tuo dispositivo, quindi non viene caricato nulla."
howTo:
  - "Scegli i tuoi file .png, oppure trascinali nel riquadro qui sopra."
  - "AVIF è già selezionato. Scegli una qualità: 75 va bene per la maggior parte delle immagini, più alta per gli screenshot con testo piccolo."
  - "Se vuoi, imposta una larghezza o un'altezza massima per rimpicciolire le immagini troppo grandi."
  - "Aspetta che l'encoder finisca (l'AVIF richiede più tempo degli altri formati), poi scarica i file o un .zip."
faq:
  - q: "Quali browser mostrano l'AVIF?"
    a: "Chrome dalla versione 85, Firefox dalla 93, Safari dalla 16 (iOS 16 e macOS Ventura o successivi) ed Edge dalla 121. I browser più vecchi e molte app desktop non aprono l'AVIF, quindi conserva i PNG originali."
  - q: "Lo sfondo trasparente viene mantenuto?"
    a: "Sì. L'AVIF supporta un canale alfa, e le zone trasparenti del PNG vengono conservate."
  - q: "Perché l'AVIF richiede più tempo di WebP o JPG?"
    a: "L'AVIF si basa sul codec video AV1, che cerca molto più a fondo il modo più efficiente di salvare ogni parte dell'immagine. Lo strumento usa un'impostazione di velocità bilanciata, ma un blocco grande può comunque richiedere un po'. Nel frattempo la pagina resta utilizzabile."
  - q: "Gli screenshot sono adatti all'AVIF?"
    a: "Di solito sì, con un'impostazione di qualità alta. L'encoder salva il colore a metà risoluzione, quindi il testo colorato molto piccolo può sembrare un po' morbido: confronta il risultato, e tieni il PNG se deve restare identico al pixel."
ui:
  img.drop.hint: "Immagini PNG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "png-in-avif.zip"
---

## Perché l'AVIF

L'AVIF salva le immagini statiche con AV1, il codec video libero da royalty sviluppato dall'Alliance for Open Media. Rispetto ai formati più vecchi gestisce in modo molto efficiente sfumature, texture fini e trasparenza, e i PNG fotografici spesso si riducono dell'80-90%. Per un sito, questo può trasformare un'immagine di apertura da diversi megabyte in qualcosa che si carica quasi all'istante.

A differenza del JPG, l'AVIF mantiene il canale alfa, quindi può prendere il posto dei PNG trasparenti come foto di prodotti scontornate e illustrazioni.

## Scegliere le impostazioni

Il cursore della qualità usa la stessa scala da 1 a 100 degli altri formati del sito e viene tradotto sulla scala propria dell'AVIF, quindi 75 dà più o meno la qualità visiva che ti aspetteresti da un JPG a 75, in un file molto più piccolo. Per le immagini con testo nitido o disegni al tratto, parti da 85 o 90. Una qualità moderata insieme a una larghezza massima è la combinazione che fa risparmiare più spazio.

La codifica AVIF impegna molto il processore. Avviene in worker in background così la pagina non si blocca, ma convertire decine di immagini grandi può richiedere qualche minuto su un portatile datato. L'elenco si aggiorna man mano che ogni file è pronto.

## Compatibilità

Tutti i principali browser attuali mostrano l'AVIF, ma altrove il supporto è ancora in crescita: alcuni visualizzatori di immagini, editor e social non lo accettano ancora. L'AVIF è ideale per le immagini che pubblichi sul tuo sito, mentre il PNG resta il file migliore da archiviare o da condividere per le modifiche. Se ti serve un supporto più ampio con la trasparenza, [PNG in WebP](/it/png-in-webp/) è una buona via di mezzo.

La codifica usa una versione WebAssembly di libavif, interamente nel tuo browser. Le tue immagini non vengono mai caricate.
