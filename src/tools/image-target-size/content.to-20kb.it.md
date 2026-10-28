---
title: "Comprimere una foto a 20 KB | Eolietech"
description: "Porta una firma scansionata o una foto tessera sotto i 20 KB per una domanda online o un concorso. JPG o WebP, fino a 50 alla volta, compresse nel browser."
h1: "Comprimi foto a 20 KB"
intro: "Alcune domande online, per concorsi, esami o pratiche, chiedono la firma scansionata o una foto tessera da 20 KB al massimo. Aggiungila qui e ottieni un file sotto i 20.000 byte con la qualità migliore possibile, senza mandare la tua firma o il tuo volto a nessun server."
howTo:
  - "Se la foto o la scansione della firma ha molto sfondo vuoto, ritagliala prima con lo strumento di ritaglio di questo sito. Ogni pixel tolto lascia più spazio, nei 20 KB, a quello che conta."
  - "Scegli i file o trascinali nel riquadro qui sopra. Il peso è già impostato a 20 KB: cambialo se il bando o il modulo indica un altro limite."
  - "Lascia il formato JPG. I moduli che chiedono file così leggeri di solito vogliono un JPG."
  - "In ogni riga controlla sia il peso sia la misura in pixel, poi scarica i file uno per uno o in un .zip."
faq:
  - q: "Quanto è grande in pixel una foto da 20 KB?"
    a: "Dipende da quanti dettagli ha. Una normale foto del telefono di solito esce di qualche centinaio di pixel sul lato lungo, più o meno tra 400 e 600 px. Un primo piano su sfondo uniforme si comprime meglio e può restare più grande. La misura esatta è scritta in ogni riga."
  - q: "La firma resta leggibile a 20 KB?"
    a: "Di solito sì. Inchiostro scuro su carta bianca vuol dire grandi zone uniformi, che si comprimono molto bene, quindi una firma conserva molti più pixel di una foto dello stesso peso. Firma con una penna scura su un foglio bianco, scansiona o fotografa con una luce uniforme e ritaglia vicino al tratto. Se parti da un PNG con lo sfondo trasparente, nel JPG le parti trasparenti diventano bianche."
  - q: "Il modulo chiede anche un peso minimo. Il file sarà troppo leggero?"
    a: "Una foto che va compressa finisce di solito poco sotto i 20 KB, quindi un minimo come 10 KB raramente è un problema. Un'immagine piccola, che ci sta già con la qualità più alta usata dallo strumento, può uscire più leggera, e un JPG già sotto i 20 KB resta com'è. Prima di caricarlo, confronta il peso nella riga con le regole del modulo."
  - q: "20 KB sono 20000 o 20480 byte?"
    a: "Il file resta sotto i 20.000 byte, quindi va bene per i moduli che contano in entrambi i modi."
  - q: "I miei file vengono caricati?"
    a: "No. La compressione avviene in questa scheda del browser e la firma e le foto non lasciano mai il dispositivo. I file che scarichi non contengono nemmeno dati EXIF, come la posizione GPS del telefono che ha scattato la foto."
ui:
  img.zipName: "immagini-20kb.zip"
---

## Perché una foto da 20 KB deve essere piccola

Un file da 20 KB contiene 20.000 byte. Una foto scattata con un telefono da 12 megapixel ha 12 milioni di pixel: resterebbe un byte ogni 600 pixel. Nessun formato riesce a tenere nitida una foto con così poco, quindi oltre alla qualità la foto deve perdere anche pixel.

Lo strumento lascia la misura originale solo se la foto ci sta con una qualità tra 40 e 92. Quando anche 40 pesa troppo, e con una foto del telefono a 20 KB succede quasi sempre, la rimpicciolisce fino alla misura più grande che rientra nel limite. Ne esce una foto piccola e pulita, abbastanza nitida per un tesserino o per l'anteprima di un modulo. Non è fatta per essere stampata o ingrandita, e il dettaglio perso non si recupera, quindi conserva l'originale.

## Firme e foto tessera

I bandi e i moduli che chiedono 20 KB spesso hanno anche altre regole, come lo sfondo bianco, una misura in pixel o un rapporto tra larghezza e altezza. Questo strumento controlla solo il peso del file. Se il modulo indica misure precise, ritaglia e ridimensiona prima con [Ritaglia immagini](/it/ritagliare-immagini/) e [Ridimensiona le immagini](/it/ridimensionare-immagini/), poi comprimi qui il risultato. Se la foto ci sta già con una qualità di almeno 40, la sua misura in pixel non cambia.

Ritagliare aiuta anche quando il modulo non lo chiede. Un volto che riempie l'inquadratura, o una firma ritagliata vicino al tratto, dedica i 20 KB proprio ai dettagli che verranno controllati.

## Come funziona

Il lavoro lo fa il tuo browser, in un worker in background dentro questa scheda, con MozJPEG per il JPG e libwebp per il WebP. Nessun file passa dalla rete. Per altri limiti, [Comprimi una foto a 50 KB](/it/comprimere-foto-a-50kb/) va bene per le foto da allegare alle domande e le scansioni dei documenti, e [Comprimi foto in KB](/it/comprimere-foto-in-kb/) accetta qualsiasi peso.
