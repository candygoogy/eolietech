---
title: "Convertire JPG in PNG per modifiche senza perdita | Eolietech"
description: "Converti le foto JPG in file PNG senza perdita, così le modifiche successive non aggiungono altri danni da compressione. Conversione in blocco nel browser, senza caricare nulla."
h1: "Convertitore da JPG a PNG"
intro: "Converti le immagini JPG in PNG quando ti serve un file senza perdita da modificare, annotare o passare a un programma che richiede il PNG. La conversione avviene nel browser e le tue foto restano sul tuo dispositivo."
howTo:
  - "Scegli i tuoi file .jpg o .jpeg, oppure trascinali nel riquadro qui sopra."
  - "PNG è già selezionato. Non c'è un'impostazione di qualità, perché il PNG è sempre senza perdita."
  - "Se vuoi, imposta una larghezza o un'altezza massima per ridurre le foto grandi."
  - "Scarica i PNG uno per uno oppure tutti insieme in un .zip."
faq:
  - q: "Convertire in PNG migliora la qualità?"
    a: "No. Il PNG conserva esattamente i pixel del JPG, compresi gli artefatti di compressione già presenti nella foto. Quello che il PNG evita sono le perdite successive: puoi modificarlo e salvarlo tutte le volte che vuoi senza che l'immagine peggiori."
  - q: "Perché il PNG è così più grande?"
    a: "Il JPG scarta dettagli per risparmiare spazio, mentre il PNG conserva ogni pixel. Per le foto, un PNG è di solito da tre a dieci volte più grande del JPG. È normale."
  - q: "Posso ottenere uno sfondo trasparente?"
    a: "La sola conversione non toglie lo sfondo: il PNG supporta la trasparenza, ma un JPG non ne ha da trasferire. Dovrai rimuovere lo sfondo dopo, con un editor o uno strumento apposito."
  - q: "La foto viene ruotata correttamente?"
    a: "Sì. L'orientamento EXIF viene applicato durante la decodifica, quindi le foto in verticale restano dritte nel PNG. Gli altri metadati, come la posizione GPS e i dati della fotocamera, non vengono copiati."
ui:
  img.drop.hint: "Immagini JPG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "jpg-in-png.zip"
---

## Perché convertire un JPG in PNG

Ogni volta che un JPG viene aperto, modificato e salvato di nuovo, viene ricompresso e perde un altro po' di dettaglio. Se devi lavorare su un'immagine in più passaggi (aggiungere testo, ritagliarla, ritoccarla o combinarla con altra grafica), convertirla prima in PNG fa sì che da lì in poi le tue modifiche vengano salvate senza perdita.

Alcuni strumenti e flussi di lavoro, poi, chiedono semplicemente il PNG: certe app di grafica e per presentazioni, i generatori di sticker ed emoji, i motori di gioco e i sistemi di documentazione che preferiscono screenshot senza perdita.

## Cosa aspettarti

Il PNG è una copia fedele del JPG decodificato, pixel per pixel. La conversione non può annullare la compressione che il JPG ha già subito, quindi blocchetti o sfocature presenti nell'originale restano visibili. Il risultato passa anche per oxipng, che trova il modo più compatto di salvare il PNG senza perdita e senza cambiare alcun pixel, ma il PNG di una foto resta comunque molto più grande del JPG.

Se in realtà ti serve un file più leggero, questa è la direzione sbagliata. Usa [comprimi immagine](/it/comprimere-immagini/) per ridurre il JPG, oppure convertilo in WebP o AVIF.

## Ridimensionamento e privacy

Puoi ridurre le foto grandi durante la conversione inserendo una larghezza o un'altezza massima. L'immagine mantiene le proporzioni e non viene mai ingrandita.

L'intera conversione avviene nel tuo browser con versioni WebAssembly del decoder di MozJPEG e di oxipng. Le tue foto non vengono mai caricate, e la pagina resta reattiva mentre il blocco viene elaborato in un worker in background.
