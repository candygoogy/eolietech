---
title: "Ritagliare un'immagine in 16:9 | Eolietech"
description: "Ritaglia foto e screenshot in 16:9 per copertine dei video, slide, banner e sfondi panoramici. A piena risoluzione, nel browser, senza caricare nulla."
h1: "Ritaglia in 16:9"
intro: "16:9 è il formato della maggior parte dei televisori, dei player video e delle slide. Il riquadro si apre già in 16:9 e largo quanto l'immagine consente: spostalo sulla parte che vuoi e salva. L'immagine non lascia mai il tuo dispositivo."
howTo:
  - "Scegli un'immagine o trascinala nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 100 MB."
  - "16:9 è già selezionato. Trascina il riquadro in alto o in basso per scegliere cosa resta nell'inquadratura, oppure tira un angolo verso l'interno per stringere il ritaglio."
  - "Ti serve il 9:16 per una storia o un video verticale? Premi Ruota proporzioni. In Salva come tieni il formato originale, oppure scegline un altro."
  - "Premi Ritaglia, controlla le misure in pixel e scarica il file."
faq:
  - q: "Quanto deve essere grande la copertina di un video YouTube?"
    a: "YouTube consiglia 3840 × 2160 px, cioè 16:9, e almeno 640 px di larghezza, quindi va bene anche un'immagine 16:9 più piccola come 1280 × 720 px. Ritaglia prima qui, poi imposta la larghezza nello strumento per ridimensionare le immagini di questo sito: con 3840 px l'altezza diventa 2160, con 1280 px diventa 720, purché il ritaglio sia largo almeno così. Il file può pesare fino a 50 MB se lo carichi dal computer e 2 MB dal telefono."
  - q: "Un'immagine 16:9 riempie le mie slide?"
    a: "Sì, se le slide sono in 16:9, che è il formato predefinito di PowerPoint e Presentazioni Google. Una presentazione più vecchia impostata in 4:3 è più quadrata, quindi un'immagine 16:9 lascia spazio vuoto sopra e sotto, a meno di deformarla o tagliarla."
  - q: "Posso fare uno sfondo per il mio schermo?"
    a: "La maggior parte dei televisori e molti monitor sono 16:9, quindi un ritaglio 16:9 li riempie senza bande nere. Molti portatili usano invece il 16:10, e i telefoni sono molto più alti. In quei casi scegli Libero e scrivi larghezza e altezza dello schermo in pixel: ottieni esattamente quella misura, purché l'immagine sia almeno così grande."
  - q: "Il ritaglio peggiora la qualità?"
    a: "I pixel che tieni non vengono ridimensionati, quindi il ritaglio è nitido quanto l'originale. JPG, WebP e AVIF vengono salvati di nuovo con la qualità che imposti, 90 di partenza, e le foto restano molto vicine all'originale. Il PNG è senza perdita."
  - q: "La mia immagine viene caricata?"
    a: "No. Apertura, ritaglio e salvataggio avvengono tutti in questa scheda del browser. La pagina scarica una volta gli encoder da questo sito e non invia mai la tua immagine da nessuna parte."
ui:
  crop.drop.hint: "JPG, PNG, WebP o AVIF. Il riquadro si apre in 16:9; non viene caricato niente."
---

## Copertine, slide e banner

Un'immagine 16:9 riempie la copertina di un video YouTube, una slide panoramica, un televisore o quasi tutti i player video, senza bande e senza deformazioni. Anche molte testate e molti banner dei siti sono larghi; quando il modello del sito non indica una misura, il 16:9 è un buon punto di partenza. Se ti serve la versione verticale per una storia o un video da telefono, premi **Ruota proporzioni** e il riquadro passa a 9:16.

## Scegliere cosa resta nell'inquadratura

Quasi tutte le foto sono meno allungate del 16:9, quindi il ritaglio toglie qualcosa sopra e sotto. Un ritaglio 16:9 a tutta larghezza di una tipica foto orizzontale del telefono (4:3) perde un quarto dell'altezza. Da una foto verticale ne tiene meno della metà, quindi scegli la parte che conta e lascia fuori il resto. Trascina il riquadro in alto o in basso finché l'orizzonte, i visi o il testo non stanno dove vuoi.

Per una misura finale precisa, come 1280 × 720 o 1920 × 1080 px, ritaglia qui e poi usa [Ridimensiona le immagini](/it/ridimensionare-immagini/). Per altre forme, [Ritaglia un'immagine](/it/ritagliare-immagini/) ha tutte le proporzioni e il riquadro libero.

## Come funziona

L'immagine viene decodificata in un worker in background dentro questa scheda, e l'area 16:9 viene tagliata dai pixel a piena risoluzione, non dall'anteprima più piccola. Le foto del telefono vengono prima raddrizzate secondo l'orientamento salvato con loro, quindi il ritaglio corrisponde a quello che vedi. Il risultato viene salvato in JPG, PNG, WebP o AVIF senza i dati EXIF dell'originale, come la posizione GPS. Niente passa dalla rete.
