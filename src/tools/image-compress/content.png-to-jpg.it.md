---
title: "Convertire PNG in JPG senza caricare nulla | Eolietech"
description: "Converti immagini PNG e screenshot in file JPG più leggeri. Le zone trasparenti diventano bianche. Scegli la qualità e converti in blocco, tutto sul tuo dispositivo."
h1: "Convertitore da PNG a JPG"
intro: "Trasforma file PNG pesanti in JPG compatti per email, documenti e moduli di caricamento con limiti di dimensione. Imposta la qualità, converti tanti file in una volta e tieni tutto sul tuo dispositivo."
howTo:
  - "Scegli i tuoi file .png, oppure trascinali nel riquadro qui sopra."
  - "JPG è già selezionato. Usa il cursore della qualità per bilanciare peso del file e dettaglio."
  - "Se vuoi, inserisci una larghezza o un'altezza massima per rimpicciolire le immagini grandi."
  - "Controlla le nuove dimensioni, poi scarica i JPG uno per uno o in un unico .zip."
faq:
  - q: "Cosa succede a uno sfondo trasparente?"
    a: "Il JPG non ha trasparenza, quindi i pixel trasparenti e parzialmente trasparenti vengono fusi sul bianco. L'elenco segnala ogni file in cui è successo. Se vuoi mantenere la trasparenza, prova invece da PNG a WebP."
  - q: "Il testo negli screenshot resta nitido?"
    a: "Il JPG è pensato per le foto, quindi i bordi netti come quelli del testo possono prendere leggeri aloni alle qualità più basse. Per gli screenshot usa una qualità tra 85 e 90, oppure tienili in PNG se devono restare nitidi."
  - q: "Perché il mio JPG non è molto più leggero?"
    a: "La grafica semplice con ampie zone a tinta unita, come diagrammi o loghi, è già salvata in modo efficiente in PNG. Il JPG fa risparmiare di più su foto e immagini ricche di dettagli."
  - q: "Viene caricato qualcosa?"
    a: "No. Il decoder PNG e l'encoder MozJPEG girano nel tuo browser, e i tuoi file non lasciano mai il dispositivo."
ui:
  img.drop.hint: "Immagini PNG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "png-in-jpg.zip"
---

## Quando trasformare un PNG in JPG

Il PNG conserva ogni pixel esattamente com'è, il che è ideale per le modifiche ma rende pesanti foto e screenshot dettagliati. Una foto salvata in PNG è spesso da cinque a dieci volte più grande della stessa foto in JPG. Conta quando un'email torna indietro perché troppo grande, quando un modulo accetta file solo fino a 2 MB, o quando devi far stare tante immagini in un documento.

Il JPG è accettato praticamente ovunque, dai programmi di videoscrittura ai negozi online, e con qualità tra 75 e 85 la maggior parte delle persone non lo distingue dal PNG originale.

## Foto o grafica

Il JPG rende al meglio con le fotografie e le immagini con passaggi di colore morbidi. Sulle immagini con bordi netti e colori piatti, come loghi, grafici, screenshot di interfacce e pixel art, la compressione JPG può creare aloni visibili lungo i bordi e potrebbe non far risparmiare molto spazio. In quei casi tieni il PNG oppure usa un'impostazione di qualità alta.

## Trasparenza

I file PNG hanno spesso lo sfondo trasparente, il JPG no. I pixel trasparenti vengono fusi su uno sfondo bianco così non diventano neri, e l'elenco dei risultati ti dice quali file sono stati interessati. Se la tua immagine deve restare trasparente e diventare più leggera, [PNG in WebP](/it/png-in-webp/) mantiene il canale alfa.

## Come funziona

Il tuo browser decodifica il PNG e codifica il JPG con MozJPEG, un encoder messo a punto per produrre JPG più piccoli rispetto alla maggior parte degli strumenti standard, a parità di qualità. Entrambi girano come WebAssembly in un worker in background, quindi i blocchi grandi non bloccano la pagina e non viene caricato nulla.
