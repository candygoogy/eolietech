---
title: "Convertire PNG in WebP per pagine più veloci | Eolietech"
description: "Converti le immagini PNG in WebP per ridurne il peso mantenendo la trasparenza. Imposta la qualità, converti in blocco e tieni ogni file sul tuo dispositivo."
h1: "Convertitore da PNG a WebP"
intro: "Alleggerisci le immagini PNG del tuo sito convertendole in WebP. La trasparenza resta, la qualità la decidi tu, e la conversione avviene nel browser senza caricare nulla."
howTo:
  - "Scegli i tuoi file .png, oppure trascinali nel riquadro qui sopra."
  - "WebP è già selezionato. Regola il cursore della qualità: 75 va bene per la maggior parte delle immagini, tra 85 e 90 è più sicuro per testo e linee sottili."
  - "Se vuoi, imposta una larghezza o un'altezza massima per ridurre le immagini troppo grandi."
  - "Confronta le dimensioni nell'elenco, poi scarica i file WebP o l'intero blocco in un .zip."
faq:
  - q: "Di quanto si alleggeriranno le mie immagini?"
    a: "Dipende dal contenuto. Le foto e le illustrazioni dettagliate in PNG spesso si riducono del 70% o più. La grafica semplice con pochi colori è già efficiente in PNG e può ridursi molto meno, o persino crescere: l'elenco mostra il risultato esatto per ogni file."
  - q: "Il WebP mantiene lo sfondo trasparente?"
    a: "Sì. Il canale alfa viene salvato a piena qualità, quindi i bordi trasparenti e semitrasparenti appaiono come nel PNG."
  - q: "La conversione è senza perdita?"
    a: "No, questo strumento usa il WebP con perdita, ed è proprio questo a rendere i file tanto più piccoli. Da qualità 80 in su la differenza è molto difficile da vedere. Se ti serve un risultato identico al pixel, tieni il PNG."
  - q: "Tutti i browser mostrano il WebP?"
    a: "Tutte le versioni attuali di Chrome, Edge, Firefox e Safari mostrano il WebP. Safari lo supporta dalla versione 14 (2020) e per mostrarlo richiede macOS Big Sur o successivo."
ui:
  img.drop.hint: "Immagini PNG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "png-in-webp.zip"
---

## Perché convertire PNG in WebP

Il PNG è un formato senza perdita, ideale per le modifiche ma costoso per il web: uno screenshot o la foto di un prodotto salvati in PNG possono pesare diversi megabyte. Il WebP è stato progettato da Google apposta per le immagini sul web. La sua modalità con perdita mantiene un canale alfa, cosa che il JPG non sa fare, quindi può sostituire il PNG per le immagini trasparenti usando una frazione dei byte. Immagini più leggere vogliono dire pagine che si caricano più in fretta e punteggi Core Web Vitals migliori.

## Scegliere la qualità

Il cursore stabilisce quanto dettaglio il WebP può scartare. Foto e illustrazioni con sfumature morbide stanno bene tra 70 e 80. Le immagini con testo nitido, linee sottili o elementi d'interfaccia piatti possono mostrare leggere sbavature sui bordi alle impostazioni basse, quindi per screenshot e diagrammi usa tra 85 e 90. Spostando il cursore l'intero blocco viene riconvertito, così puoi confrontare subito le dimensioni.

Se una grafica semplice, come un logo con pochi colori piatti, in WebP viene più grande, tienila in PNG. Per quel tipo di immagine la compressione del PNG è molto efficace.

## Trasparenza e ridimensionamento

Gli sfondi trasparenti vengono mantenuti. Il canale alfa è codificato a piena qualità anche quando i dati di colore vengono compressi, così i bordi scontornati restano puliti. Per ottenere in un solo passaggio immagini a misura di web, inserisci una larghezza massima (per esempio 1600 pixel): le immagini più grandi vengono ridotte con un filtro Lanczos, quelle più piccole restano come sono.

Tutto questo avviene nel tuo browser con una versione WebAssembly di libwebp. I tuoi file non vengono caricati da nessuna parte.
