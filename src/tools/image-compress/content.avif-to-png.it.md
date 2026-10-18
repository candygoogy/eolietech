---
title: "Convertire AVIF in PNG mantenendo la trasparenza | Eolietech"
description: "Converti le immagini AVIF in file PNG senza perdita, con gli sfondi trasparenti conservati. Conversione in blocco nel browser: le tue immagini non vengono mai caricate."
h1: "Convertitore da AVIF a PNG"
intro: "Converti le immagini AVIF in PNG per aprirle in qualsiasi editor mantenendo la trasparenza. Il PNG conserva i pixel decodificati senza ulteriori perdite, e la conversione avviene interamente nel tuo browser."
howTo:
  - "Scegli i tuoi file .avif, oppure trascinali nel riquadro qui sopra."
  - "PNG è già selezionato. Non c'è un cursore della qualità, perché il PNG è senza perdita."
  - "Se vuoi, imposta una larghezza o un'altezza massima per ridurre le immagini grandi."
  - "Scarica i file PNG uno alla volta oppure tutti insieme in un .zip."
faq:
  - q: "Il PNG è identico all'AVIF?"
    a: "Contiene esattamente i pixel in cui l'AVIF viene decodificato, senza ulteriori perdite di compressione. L'eventuale morbidezza dovuta alla compressione con perdita dell'AVIF resta così com'è."
  - q: "La trasparenza viene mantenuta?"
    a: "Sì. Entrambi i formati hanno un canale alfa, quindi le zone trasparenti e semitrasparenti passano senza cambiamenti."
  - q: "Perché il PNG è così grande?"
    a: "L'AVIF è uno dei formati con perdita più efficienti disponibili; il PNG è senza perdita. Il PNG di una foto può essere dieci o più volte più grande dell'AVIF. Per loghi e grafica a tinte piatte la differenza è molto minore."
  - q: "Può convertire gli AVIF animati?"
    a: "No. Questo strumento è fatto per le immagini statiche e non produce PNG animati."
ui:
  img.drop.hint: "Immagini AVIF. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "avif-in-png.zip"
---

## Quando il PNG è la scelta giusta

Convertire un AVIF in PNG ha senso quando vuoi modificare l'immagine o ti serve la trasparenza in un formato che capiscono tutti. Il PNG è supportato da ogni editor di immagini, strumento di grafica e sistema operativo, e dato che è senza perdita puoi fare modifiche e salvare più volte senza che l'immagine peggiori.

I casi tipici sono foto di prodotti scontornate e loghi scaricati da un sito che serve AVIF, illustrazioni da ritoccare, o immagini da inserire in una presentazione o in uno strumento di grafica che non importa ancora l'AVIF.

## Quanto peserà

L'AVIF ottiene file piccoli scartando dettagli in modi difficili da notare. Il PNG conserva ogni pixel, quindi il file convertito è molto più grande, soprattutto per le foto. Il risultato passa per oxipng, che sceglie la codifica senza perdita più compatta senza cambiare alcun pixel, ma questo non basta a colmare del tutto la differenza. Se ti serve solo una foto che si apra ovunque e la trasparenza non conta, [AVIF in JPG](/it/avif-in-jpg/) produce file molto più piccoli.

Puoi ridurre il peso rimpicciolendo l'immagine: inserisci una larghezza o un'altezza massima e l'immagine viene ridimensionata con un filtro Lanczos, mantenendo le proporzioni.

## Limiti

Il convertitore gestisce immagini statiche con colore standard a 8 bit. Gli AVIF animati non vengono convertiti come animazioni, e le immagini HDR vengono portate alla gamma standard senza tone mapping.

## Privato e in locale

La decodifica (libavif) e l'ottimizzazione PNG (oxipng) girano come WebAssembly in un worker in background nel tuo browser. Le tue immagini non vengono mai caricate su un server.
