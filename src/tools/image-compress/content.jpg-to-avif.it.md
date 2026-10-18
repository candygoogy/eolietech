---
title: "Convertire JPG in AVIF per foto più leggere | Eolietech"
description: "Converti le foto JPG in AVIF, spesso a metà del peso con qualità simile. Conversione in blocco, qualità e dimensioni a tua scelta, tutto nel browser senza caricare nulla."
h1: "Convertitore da JPG a AVIF"
intro: "Converti le foto JPG in AVIF per renderle molto più leggere per il web. Scegli una qualità, limita le dimensioni se vuoi, e converti un blocco di foto senza che lascino il tuo computer."
howTo:
  - "Scegli le tue foto .jpg o .jpeg, oppure trascinale nel riquadro qui sopra."
  - "AVIF è già selezionato. Parti da qualità 75 e regolala dopo aver visto i risultati."
  - "Imposta una larghezza o un'altezza massima se le foto sono più grandi di come le mostrerai."
  - "Lascia all'encoder qualche istante per ogni foto, poi scarica i file AVIF o l'intero blocco in un .zip."
faq:
  - q: "Quanto è più leggero l'AVIF rispetto al JPG?"
    a: "Per le foto tipiche, i file AVIF sono spesso circa la metà di un JPG di qualità visiva simile, a volte molto meno. Il risparmio esatto dipende dalla foto: l'elenco mostra la dimensione prima e dopo per ognuna."
  - q: "Devo conservare i JPG originali?"
    a: "Sì, tienili. L'AVIF è un formato con perdita, e non tutte le app riescono ancora ad aprirlo. Usa le copie AVIF per pubblicare e i JPG come originali."
  - q: "Perché la conversione richiede qualche secondo per foto?"
    a: "L'encoder basato su AV1 prova molti modi di comprimere ogni blocco dell'immagine per trovare il più efficiente. È proprio questo impegno a rendere i file così piccoli. L'elaborazione avviene in background, quindi puoi continuare a usare la pagina."
  - q: "Cosa succede ai dati EXIF?"
    a: "La foto viene ruotata secondo il suo tag di orientamento, poi salvata senza metadati. Posizione GPS, dati della fotocamera e data dello scatto non vengono copiati nell'AVIF."
ui:
  img.drop.hint: "Immagini JPG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "jpg-in-avif.zip"
---

## Foto più leggere per pagine più veloci

Di solito le immagini sono la parte più pesante di una pagina web. L'AVIF, basato sul codec video AV1, salva le foto in modo molto più efficiente del JPG: i cieli uniformi restano senza bande a blocchi e i dettagli fini sopravvivono anche con file piccoli. Passare un sito ricco di foto dal JPG all'AVIF può ridurre drasticamente la banda usata dalle immagini e migliorare metriche di caricamento come il Largest Contentful Paint.

## Scegliere la qualità

Il cursore da 1 a 100 viene tradotto sulla scala di qualità propria dell'AVIF, quindi 75 qui somiglia più o meno a un JPG a 75 ma occupa molti meno byte. Ai valori bassi la qualità cala in modo graduale: invece degli artefatti a blocchi del JPG, l'AVIF tende ad ammorbidire le texture fini. Per ritratti e foto di prodotto, tra 75 e 85 è un buon intervallo; per le grandi immagini di sfondo spesso va bene anche 60.

Se le tue foto arrivano direttamente dal telefono, imposta anche una larghezza massima. Una foto da 4000 pixel mostrata a 1600 spreca la maggior parte dei suoi byte, e ridimensionarla prima della codifica rende l'AVIF sia più veloce sia più leggero.

## Supporto dei browser e alternative

Chrome, Edge, Firefox e Safari dalla 16 in poi mostrano l'AVIF. Per coprire i browser più vecchi, servi l'AVIF con un JPG o un WebP di riserva usando l'elemento HTML picture. Puoi creare la versione WebP con [JPG in WebP](/it/jpg-in-webp/).

## Funziona sul tuo dispositivo

Il decoder JPG (MozJPEG) e l'encoder AVIF (libavif) sono compilati in WebAssembly e girano in worker in background nel tuo browser. Le foto non vengono mai caricate. Dato che la codifica usa il tuo processore, un blocco grande va più veloce su un computer recente.
