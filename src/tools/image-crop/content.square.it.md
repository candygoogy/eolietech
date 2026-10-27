---
title: "Ritagliare un'immagine quadrata | Eolietech"
description: "Ritaglia una foto in quadrato per la foto profilo, un avatar, la foto di un prodotto o un post quadrato. JPG, PNG, WebP e AVIF, nel browser, senza caricarla."
h1: "Ritaglia in quadrato"
intro: "Il riquadro si apre già quadrato e grande quanto la foto consente, quindi di solito basta spostarlo sul viso o sul prodotto e salvare. Il ritaglio avviene nel browser e la foto resta sul tuo dispositivo."
howTo:
  - "Scegli una foto o trascinala nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 100 MB."
  - "1:1 è già selezionato. Trascina il quadrato sulla parte che vuoi tenere e tira un angolo verso l'interno per stringere il ritaglio."
  - "Per una misura precisa, scrivila in Larghezza: l'altezza si adegua. In Salva come tieni il formato originale, oppure scegline un altro."
  - "Premi Ritaglia, controlla le misure in pixel e scarica il tuo quadrato."
faq:
  - q: "Come faccio una buona foto profilo?"
    a: "Molte app mostrano la foto profilo come un cerchio ritagliato al centro del quadrato, quindi gli angoli spariscono. Tieni il viso al centro, lascia un po' di spazio sopra la testa e fai un ritaglio un po' più largo di quanto ti verrebbe d'istinto."
  - q: "Quanto deve essere grande il quadrato?"
    a: "I siti rimpiccioliscono da soli le foto profilo, quindi per un avatar bastano poche centinaia di pixel. Instagram lavora con post larghi 1080 px, quindi per un post quadrato va bene 1080 × 1080 px. Se il ritaglio è molto più grande del necessario, rimpiccioliscilo con lo strumento per ridimensionare le immagini di questo sito."
  - q: "Perché usare foto quadrate per i prodotti?"
    a: "Negozi online e marketplace mostrano spesso i prodotti in una griglia di riquadri quadrati. Se carichi un quadrato, decidi tu cosa resta nell'inquadratura, invece di lasciare che sia il sito a tagliare i bordi."
  - q: "Il quadrato conserva la posizione della foto?"
    a: "No. Il file ritagliato contiene solo l'immagine, senza dati EXIF come la posizione GPS o il modello della fotocamera. Per una foto profilo conta, perché chiunque può vederla e salvarla."
  - q: "La mia foto viene caricata?"
    a: "No. Apertura, ritaglio e salvataggio avvengono tutti in questa scheda del browser. La pagina scarica una volta gli encoder da questo sito e non invia mai la tua foto da nessuna parte."
ui:
  crop.drop.hint: "JPG, PNG, WebP o AVIF. Il riquadro si apre quadrato; non viene caricato niente."
---

## Foto profilo e avatar

Una foto del telefono di solito è un rettangolo verticale o orizzontale, mentre quasi tutti gli spazi per la foto profilo vogliono un quadrato. Se carichi il rettangolo così com'è, il sito sceglie il centro al posto tuo, e spesso taglia la cima della testa o ti lascia spostato di lato. Ritagliarla tu richiede pochi secondi e mette il viso dove vuoi.

Il quadrato parte grande quanto la foto consente. Trascinalo sul viso, poi tira un angolo verso l'interno finché testa e spalle non ne riempiono la maggior parte. Se l'app mostra un cerchio, tieni le cose importanti lontane dagli angoli.

## Foto di prodotti e post quadrati

Una serie di foto di prodotti è più ordinata quando hanno tutte la stessa forma, e in una griglia il quadrato tiene il prodotto al centro. Ritaglia ogni foto lasciando un po' di spazio attorno all'oggetto, così non tocca i bordi. Se un ritaglio quadrato taglierebbe una parte del prodotto, [Foto quadrata senza tagliare](/it/foto-quadrata-senza-tagliare/) tiene la foto intera e riempie il resto del quadrato di bianco o con un altro sfondo. Per un post quadrato, 1080 × 1080 px è una misura sicura: ritaglia il quadrato che vuoi, poi riducilo a 1080 px con [Ridimensiona le immagini](/it/ridimensionare-immagini/).

Puoi passare ad altre proporzioni in qualsiasi momento con i pulsanti sopra l'immagine. Per tutte le forme e le opzioni, usa [Ritaglia un'immagine](/it/ritagliare-immagini/).

## Come funziona

La foto viene decodificata in un worker in background dentro questa scheda, e il quadrato viene tagliato dai pixel a piena risoluzione, non dall'anteprima più piccola. Le foto del telefono vengono prima raddrizzate secondo l'orientamento salvato con loro, quindi ottieni esattamente quello che vedi. Il risultato viene salvato in JPG, PNG, WebP o AVIF senza i dati EXIF dell'originale. Niente passa dalla rete.
