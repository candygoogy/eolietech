---
title: "Convertire JPG in WebP online, in privato | Eolietech"
description: "Converti le foto JPG in WebP per renderle più leggere a qualità simile. Conversione in blocco, qualità e dimensioni a tua scelta, tutto nel browser senza caricare nulla."
h1: "Convertitore da JPG a WebP"
intro: "Alleggerisci le foto JPG del tuo sito o blog convertendole in WebP. Scegli una qualità, limita le dimensioni se vuoi, e converti un'intera cartella senza che le foto lascino il tuo computer."
howTo:
  - "Scegli i tuoi file .jpg o .jpeg, oppure trascinali nel riquadro qui sopra."
  - "WebP è già selezionato. Lascia la qualità a 75 per le foto normali, oppure alzala per le immagini che richiedono dettagli fini."
  - "Inserisci una larghezza o un'altezza massima se le tue foto sono più grandi di come le mostra il sito."
  - "Scarica ogni WebP o l'intero blocco in un .zip, poi caricali sul tuo sito."
faq:
  - q: "Quanto è più leggero il WebP rispetto al JPG?"
    a: "Dai confronti di Google, i file WebP con perdita risultano più piccoli di circa il 25-34% rispetto a JPG di qualità visiva simile. Le foto appena uscite dalla fotocamera, salvate con una qualità JPG molto alta, spesso si riducono molto di più, perché vengono anche compresse di più."
  - q: "Perdo qualità convertendo da JPG a WebP?"
    a: "Un po', come succede ogni volta che si ricodifica un'immagine con perdita. Con qualità tra 75 e 85 la differenza è molto difficile da vedere alle normali dimensioni di visualizzazione. Conserva sempre i JPG originali come copie master."
  - q: "Le mie foto vengono ruotate correttamente?"
    a: "Sì. L'orientamento salvato nei dati EXIF del JPG viene applicato prima della codifica, quindi le foto in verticale restano dritte. Il resto dei dati EXIF, compresa la posizione GPS, non viene copiato nel WebP."
  - q: "Devo tenere anche i JPG per il mio sito?"
    a: "Tutti i browser attuali mostrano il WebP, quindi per la maggior parte dei siti basta il WebP. Se devi supportare browser molto vecchi, servi il WebP con un JPG di riserva usando l'elemento HTML picture."
ui:
  img.drop.hint: "Immagini JPG. Convertite sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "jpg-in-webp.zip"
---

## Un formato più leggero per le foto sul web

Il JPG è il formato predefinito per le foto da oltre trent'anni, ma la sua compressione è vecchia. Il WebP usa tecniche più recenti, prese dalla codifica video, come la predizione a blocchi e una codifica entropica migliore, per salvare la stessa immagine in meno byte. Per un sito questo significa pagine che si caricano più in fretta e meno banda consumata, soprattutto sulle connessioni mobili.

## Ottenere buoni risultati

Parti dalla qualità predefinita di 75 e guarda la riduzione di peso nell'elenco. Per le immagini di un portfolio o le foto di prodotto, dove i dettagli contano, tra 80 e 85 è una scelta più sicura. Scendere sotto 60 tende a produrre sfocature visibili nei cieli e nei toni della pelle.

Spesso ridimensionare fa risparmiare più della compressione. Una foto da 12 megapixel scattata col telefono è larga 4000 pixel, mentre la maggior parte dei layout mostra le immagini tra 1200 e 2000 pixel. Imposta una larghezza massima e la foto viene ridotta con un filtro Lanczos prima della codifica, il che può tagliare il peso del file di un altro 70% o più.

## Cosa non viene copiato

Il WebP contiene solo l'immagine. I metadati EXIF come modello della fotocamera, data dello scatto e posizione GPS vengono scartati, che di solito è proprio ciò che vuoi per le immagini da pubblicare. Prima la foto viene ruotata secondo il suo tag di orientamento, quindi viene comunque mostrata nel verso giusto. Nemmeno i profili colore incorporati vengono copiati.

La conversione avviene nel tuo browser con una versione WebAssembly di libwebp. Nessuna foto viene caricata.
