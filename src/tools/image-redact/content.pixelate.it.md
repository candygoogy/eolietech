---
title: "Pixelare un'immagine o un volto, nel browser | Eolietech"
description: "Pixela volti, passanti o qualsiasi parte di una foto con grossi blocchi quadrati. Disegni un riquadro, scegli la grandezza dei blocchi e salvi una copia. Non carichi niente."
h1: "Pixelare un'immagine"
intro: "Disegna un riquadro su un volto o su qualsiasi parte della foto e diventa subito a grossi blocchi quadrati. La pixelatura fa capire a colpo d'occhio che qualcosa è stato nascosto apposta, e conserva i colori della scena. L'immagine non lascia mai il tuo dispositivo."
howTo:
  - "Scegli un'immagine o trascinala nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 100 MB."
  - "Pixel è già selezionato. Trascina su ogni volto o zona per disegnarci sopra un riquadro. Puoi disegnarne quanti ne servono."
  - "Regola l'intensità: più è alta, meno blocchi ci sono e più sono grandi. Con il valore di partenza, 7, ogni riquadro è largo 7 blocchi sul lato più corto."
  - "Premi Salva l'immagine oscurata, poi Scarica. In Salva come tieni il formato originale, oppure scegli JPG, PNG o WebP."
faq:
  - q: "Quanto sono grandi i blocchi?"
    a: "Dipende dal riquadro. L'intensità decide quanti blocchi stanno sul lato più corto del riquadro: 32 con intensità 1, 7 con il valore di partenza e 4 a 10. Un volto grande e uno piccolo nella stessa foto ricevono lo stesso numero di blocchi, quindi sono nascosti più o meno allo stesso modo."
  - q: "Posso pixelare tutta l'immagine?"
    a: "Sì. Trascina da un angolo dell'immagine a quello opposto, oppure disegna un riquadro e tira i bordi fino ai lati. Anche l'impostazione più fine dà 32 blocchi sul lato più corto, quindi il risultato è un mosaico grossolano, più vicino a una foto censurata che alla pixel art."
  - q: "La pixelatura si può annullare?"
    a: "Su un volto con pochi blocchi grandi resta ben poco da recuperare. Con il testo è un'altra storia. Ogni blocco conserva il colore medio dei pixel che copre, e si possono pixelare allo stesso modo le parole probabili e confrontarle, cosa che ha funzionato con screenshot di password. Per testo, numeri e targhe usa Riquadro nero."
  - q: "Meglio pixelare o sfocare?"
    a: "Con un'intensità alta entrambi nascondono bene un volto. La pixelatura fa vedere chiaramente che qualcosa è stato nascosto, e si adatta a una foto in stile cronaca o a uno screenshot. La sfocatura si confonde con la foto, e si adatta alle foto di famiglia e agli sfondi. Prova tutti e due: cambiando effetto l'anteprima si aggiorna subito e i riquadri restano dove sono."
  - q: "L'immagine salvata conserva i dati EXIF?"
    a: "No. Il nuovo file contiene solo i pixel, quindi la posizione GPS, la data e il modello della fotocamera dell'originale non ci sono."
  - q: "La mia immagine viene caricata da qualche parte?"
    a: "No. L'immagine viene pixelata e salvata di nuovo dentro questa scheda del browser, sul tuo dispositivo. Non arriva niente a un server."
ui:
  redact.opened: "Hai aperto {name}, {width} × {height} px. Trascina sull'immagine per disegnare un riquadro su ciò che vuoi pixelare."
---

## Pixelare un volto

Disegna il riquadro dall'attaccatura dei capelli al mento, un po' più largo delle guance. Ogni blocco prende il colore medio dei pixel che copre, quindi con pochi blocchi grandi occhi, naso e bocca spariscono e restano solo il colore della pelle e dei capelli. Con l'intensità di partenza un riquadro è largo 7 blocchi sul lato più corto. Se il volto si riconosce ancora, sali a 9 o 10, che danno 5 e 4 blocchi.

Il numero di blocchi segue ogni riquadro, quindi un volto vicino all'obiettivo e uno lontano vengono pixelati allo stesso modo. I volti non vengono trovati in automatico: disegna un riquadro su ognuno di quelli da nascondere e controlla anche i bordi della foto.

## Persone, luoghi e oggetti

La pixelatura va bene per tutto quello che vuoi togliere da una foto senza ritagliarla: un passante, le foto di famiglia appese alle tue spalle nello screenshot di una videochiamata, la vista dalla finestra che fa capire in che via abiti, la facciata della casa dei vicini in una foto della tua.

Se quello che nascondi contiene lettere o numeri, come una targa, un numero civico o un cartellino con il nome, per quella parte usa un riquadro nero. Tutti i riquadri di un salvataggio hanno lo stesso effetto, quindi prima pixela, salva, poi apri la copia in [Oscurare parte di una foto](/it/oscurare-immagine/) e aggiungi i riquadri neri.

## Perché la pixelatura protegge poco il testo

Ogni blocco di testo pixelato conserva il colore medio delle lettere che copre. Chi conosce o indovina il carattere può pixelare allo stesso modo le parole probabili e cercare quella che corrisponde. Depix, uno strumento open source pubblicato nel 2020, lo fa con le password pixelate negli screenshot, e le stringhe corte con un formato noto, come targhe o numeri di carta, sono le più facili da indovinare. Per il testo l'effetto giusto è Riquadro nero.

## Cosa finisce nel file salvato

I blocchi partono dall'angolo in alto a sinistra di ogni riquadro, e l'ultima riga e l'ultima colonna vengono tagliate su misura, quindi la pixelatura non esce mai dal riquadro. L'anteprima usa lo stesso codice su una copia più piccola, mentre l'immagine salvata viene pixelata a piena risoluzione e mantiene le sue dimensioni in pixel. PNG, WebP e AVIF conservano la trasparenza; se salvi in JPG, le zone trasparenti vengono riempite di bianco.

Il nuovo file non ha dati EXIF, quindi la posizione GPS di una foto del telefono sparisce. Per togliere quei dati dalle foto che non devi pixelare, usa [Rimuovere EXIF](/it/rimuovere-exif/). Per i documenti in PDF c'è [Oscurare PDF](/it/oscurare-pdf/), che copre il testo e lo toglie dal file. Per un effetto più morbido sui volti, prova [Sfocare i volti in una foto](/it/sfocare-volti-foto/).
