---
title: "Ridurre una foto a 200 KB | Eolietech"
description: "Porta le foto sotto i 200 KB per un forum, un sito meno recente o un'email più leggera, con ancora molti dettagli. JPG o WebP, fino a 50 alla volta, nel browser."
h1: "Comprimi foto a 200 KB"
intro: "Forum, CMS meno recenti e alcuni moduli online si fermano a circa 200 KB per immagine. Bastano per una foto che si vede ancora bene a tutto schermo su un portatile. Aggiungi qui le foto e ognuna torna sotto i 200.000 byte, compressa nel browser, quindi non viene caricato niente."
howTo:
  - "Scegli le foto o trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "Il peso è già impostato a 200 KB. Scrivi un altro numero se il sito indica un limite diverso."
  - "Lascia il formato JPG per forum, email e siti meno recenti. Scegli WebP solo se il sito lo accetta."
  - "Controlla in ogni riga peso e misura in pixel, e nel riepilogo il totale, poi scarica le foto una per una o in un .zip."
faq:
  - q: "Quanto è nitida una foto da 200 KB?"
    a: "Abbastanza per quasi tutti gli schermi. Una normale foto del telefono di solito esce più o meno tra 1.600 e 2.200 px sul lato lungo, quanto basta per riempire lo schermo di un portatile. Per una stampa grande è poco, quindi conserva l'originale se pensi di stamparla."
  - q: "Il mio JPG pesa già meno di 200 KB. Che fine fa?"
    a: "Resta com'è, senza essere compresso di nuovo, quindi non perde qualità. Vengono tolti solo i metadati nascosti, come la posizione GPS e i dati della fotocamera, e la riga ti dice che l'immagine era già sotto il limite."
  - q: "Va bene anche per gli screenshot?"
    a: "Sì, ma diventano JPG o WebP. In un JPG le scritte e le linee nette possono prendere leggere sbavature intorno, quando il file deve scendere molto. Se il sito accetta PNG, prova prima lo strumento Comprimere immagini, che tiene lo screenshot in PNG senza perdita, e torna qui solo se pesa ancora troppo."
  - q: "È la pagina giusta per mandare foto via email?"
    a: "Sì, quando il servizio pone un limite a ogni allegato, perché ogni foto finisce sotto gli stessi 200 KB. Per mandare un intero album è meglio la pagina che ridimensiona le immagini per email: le porta a 1600 px con qualità 85, e di solito le foto vengono meglio, a qualche centinaio di KB l'una."
  - q: "Per il mio sito conviene WebP?"
    a: "Se il sito accetta WebP, vale la pena provarlo: a parità di peso una foto WebP di solito conserva un po' più di dettaglio di un JPG. Alcuni CMS e forum meno recenti però rifiutano i WebP, quindi nel dubbio il JPG è la scelta più sicura."
ui:
  img.zipName: "immagini-200kb.zip"
---

## Cosa ti lasciano 200 KB

Tra i quattro pesi che hanno una pagina dedicata su questo sito, 200 KB è il più generoso. Una foto del telefono va comunque rimpicciolita per arrivarci, ma molto meno che per 20 o 50 KB. Il risultato di solito riempie lo schermo di un portatile senza quadretti visibili, e va bene per un post su un forum, un'immagine in un articolo su un sito meno recente o una foto da condividere in un gruppo.

Se la foto ci sta già con una qualità tra 40 e 92, conserva ogni pixel e riceve la qualità più alta che rientra nel limite. Se non ci sta, lo strumento la rimpicciolisce fino alla misura più grande che ci sta a qualità 40. Le foto più piccole spesso restano alla loro misura con una qualità alta, e i JPG già sotto i 200 KB restano come sono, senza i metadati.

## Tante foto insieme

Puoi aggiungere fino a 50 foto alla volta, e ognuna viene trattata a sé, quindi un paesaggio pieno di dettagli e un ritratto su sfondo chiaro ottengono ciascuno il risultato migliore possibile. Il riepilogo mostra il peso totale prima e dopo. Usa Scarica tutto per avere un unico .zip, oppure scarica una per una le foto che ti servono.

## Come funziona

Tutto avviene in un worker in background dentro questa scheda, con MozJPEG per il JPG e libwebp per il WebP, quindi le foto non lasciano mai il dispositivo. Per un'email piena di foto delle vacanze, di solito è più adatto [Ridimensiona per email](/it/ridimensionare-immagini-per-email/). Per un limite più stretto, vedi [Comprimi una foto a 100 KB](/it/comprimere-foto-a-100kb/) oppure scrivi qualsiasi numero in [Comprimi foto in KB](/it/comprimere-foto-in-kb/).
