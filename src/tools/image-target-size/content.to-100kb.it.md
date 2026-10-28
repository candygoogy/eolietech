---
title: "Comprimere una foto sotto i 100 KB | Eolietech"
description: "Porta la foto del curriculum o la foto profilo sotto i 100 KB per un portale di lavoro o un modulo online. JPG o WebP, fino a 50 alla volta, nel tuo browser."
h1: "Comprimi foto a 100 KB"
intro: "Portali di lavoro, iscrizioni universitarie e pagine profilo limitano spesso le immagini a circa 100 KB. Aggiungi qui le foto e ognuna torna sotto i 100.000 byte con la qualità migliore possibile, compressa nel browser, quindi non viene caricato niente."
howTo:
  - "Scegli le foto o trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta, quindi anche le foto di tutto un team passano in una volta sola."
  - "Il peso è già impostato a 100 KB. Scrivi un altro numero se il sito indica un limite diverso."
  - "Lascia il formato JPG, accettato da quasi tutti i moduli, oppure scegli WebP se il sito lo prevede."
  - "Controlla in ogni riga peso, misura in pixel e qualità, poi scarica le foto una per una o usa Scarica tutto per avere un .zip."
faq:
  - q: "100 KB bastano per una foto profilo?"
    a: "Sì. Le foto profilo e quelle del curriculum di solito si vedono a poche centinaia di pixel, e con 100 KB una normale foto del telefono resta più o meno tra 1.100 e 1.500 px sul lato lungo. Un primo piano davanti a una parete chiara spesso ne conserva di più."
  - q: "Il sito vuole una foto quadrata. Posso farlo qui?"
    a: "Questa pagina cambia il peso e lascia com'è la forma. Ritaglia prima la foto con lo strumento per il ritaglio quadrato di questo sito, poi comprimi qui la versione quadrata. Il ritaglio toglie anche pixel, quindi il volto conserva più dettaglio negli stessi 100 KB."
  - q: "Perché due foto dello stesso telefono escono con misure diverse?"
    a: "I dettagli costano byte. Un ritratto su sfondo uniforme si comprime bene e può tenere più pixel, mentre una foto piena di foglie, ghiaia o tessuti ha bisogno di più byte per la stessa superficie e viene rimpicciolita di più. Ogni foto è trattata a sé, quindi ognuna ottiene la misura più grande che ci sta."
  - q: "La mia foto è un HEIC dell'iPhone. Posso usarla?"
    a: "Non direttamente: questa pagina legge JPG, PNG, WebP e AVIF. Converti prima il file HEIC con il convertitore da HEIC a JPG di questo sito, poi comprimi qui il JPG."
  - q: "La foto che pubblico dice dove abito?"
    a: "No. I file che scarichi non contengono dati EXIF, quindi spariscono la posizione GPS, la data e il modello del telefono. Conta per una foto che finirà su un profilo pubblico."
ui:
  img.zipName: "immagini-100kb.zip"
---

## A cosa servono 100 KB

Con 100 KB una foto si vede pulita su una pagina profilo, in un modulo di candidatura o nell'elenco del personale di un sito. È un limite comune sui siti che conservano molte foto degli utenti e vogliono tenerle leggere. Una foto del telefono da 3 a 12 MB pesa da 30 a 120 volte di più, quindi gran parte del risparmio viene dal riportarla alla misura che uno schermo mostra davvero.

Se la foto ci sta già con una qualità tra 40 e 92, conserva tutti i suoi pixel e riceve la qualità più alta che rientra nel limite. Se non ci sta, lo strumento la rimpicciolisce fino alla misura più grande possibile. Un JPG che pesa già meno di 100 KB non viene compresso di nuovo: gli vengono tolti solo i metadati.

## Prima di comprimere

Conviene ritagliare prima. Una foto profilo di solito appare in un quadrato o in un cerchio, e tutto quello che resta fuori è peso sprecato. Con [Ritaglia un'immagine quadrata](/it/ritagliare-immagine-quadrata/) centri il volto, poi riporti qui la foto quadrata. Se un sito chiede misure precise, per esempio 400 × 400 px, impostale con [Ridimensiona le immagini](/it/ridimensionare-immagini/) prima di comprimere.

## Come funziona

Le foto vengono decodificate, ridotte e salvate in un worker in background dentro questa scheda, con MozJPEG per il JPG e libwebp per il WebP. Niente passa dalla rete. Se hai più margine, [Comprimi una foto a 200 KB](/it/comprimere-foto-a-200kb/) conserva più pixel, e [Comprimi foto in KB](/it/comprimere-foto-in-kb/) accetta qualsiasi limite.
