---
title: "Ritagliare foto per Instagram: 4:5, 3:4 o quadrato | Eolietech"
description: "Ritaglia le foto per i post del feed di Instagram in verticale 4:5, in 3:4 o in quadrato, a piena risoluzione. JPG, PNG, WebP e AVIF, nel browser, senza caricarle."
h1: "Ritaglia per Instagram"
intro: "Il riquadro si apre in 4:5, il formato verticale che Instagram usa da anni per i post del feed, 1080 × 1350 px a misura piena. Spostalo sulla parte che vuoi, oppure passa a 3:4 o a 1:1, e salva. La foto viene ritagliata nel browser e resta sul tuo dispositivo finché non la pubblichi."
howTo:
  - "Scegli una foto o trascinala nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 100 MB."
  - "4:5 è già selezionato. Trascina il riquadro sulla parte che vuoi pubblicare, oppure scegli 3:4 per un post più alto o 1:1 per un quadrato."
  - "In Salva come tieni il formato originale, oppure scegline un altro. Per Instagram JPG e PNG sono le scelte sicure, quindi scegli JPG se la foto è WebP o AVIF."
  - "Premi Ritaglia e scarica il file. Per portarlo a 1080 px di larghezza, aprilo con lo strumento per ridimensionare le immagini per Instagram di questo sito."
faq:
  - q: "Meglio 4:5 o 3:4?"
    a: "Il 3:4 (1080 × 1440 px) è il formato più alto che un post del feed mantiene senza essere tagliato, quindi occupa più spazio sullo schermo. È anche il formato di una foto scattata col telefono in verticale: il riquadro parte coprendo tutta l'immagine e lo stringi solo se vuoi. Il 4:5 (1080 × 1350 px) è un po' più basso, ed è la misura che molti modelli e molte app per programmare i post chiedono ancora. Instagram cambia i formati ogni tanto, quindi prima di pubblicare controlla l'anteprima nell'app."
  - q: "Posso pubblicare una foto orizzontale?"
    a: "Sì. Il formato più largo che un post del feed mantiene è 1,91:1, circa 1080 × 566 px. Qui non c'è un pulsante apposito, ma 3:2 e 16:9 rientrano entrambi nell'intervallo, quindi una foto orizzontale ritagliata in uno dei due viene pubblicata così com'è. Per avere esattamente 1,91:1, scegli Libero e scrivi larghezza e altezza in pixel."
  - q: "Come ritaglio le foto per un carosello?"
    a: "Instagram mostra tutte le foto di un carosello con la forma della prima e taglia le altre per adeguarle. Ritagliale tutte con le stesse proporzioni prima di pubblicarle. Questa pagina lavora su una foto alla volta, e le proporzioni che hai scelto restano selezionate quando apri la foto successiva."
  - q: "Perché sul profilo il post si vede diverso?"
    a: "La griglia del profilo mostra ogni post come un rettangolo verticale ritagliato al centro, quindi lì i bordi della foto possono sparire. Un post in 4:5 o 3:4 perde pochissimo, mentre un quadrato o una foto orizzontale perdono di più sui lati. Se ci tieni a come appare la griglia, tieni il soggetto vicino al centro."
  - q: "La mia foto viene caricata?"
    a: "No. La foto viene aperta, ritagliata e salvata dentro questa scheda del browser, e niente viene inviato a un server. Il file salvato non contiene nemmeno i dati EXIF come la posizione GPS, quindi la copia che pubblichi porta con sé solo i pixel che hai tenuto."
ui:
  crop.drop.hint: "JPG, PNG, WebP o AVIF. Il riquadro si apre in 4:5; non viene caricato niente."
---

## I formati del feed di Instagram

Un post del feed può avere qualsiasi forma tra l'orizzontale 1,91:1 e la verticale 3:4, e Instagram taglia quello che esce da questo intervallo quando pubblichi. Se ritagli prima, decidi tu cosa resta fuori. Queste sono le proporzioni della pagina adatte a un post del feed, con la loro misura a 1080 px di larghezza:

- 4:5 verticale, 1080 × 1350 px. La pagina si apre con questa.
- 3:4 verticale, 1080 × 1440 px, la più alta che un post del feed mantiene.
- 1:1 quadrato, 1080 × 1080 px.
- 3:2 e 16:9 per le foto orizzontali, 1080 × 720 e circa 1080 × 608 px.

Per una foto profilo o un post quadrato, [Ritaglia in quadrato](/it/ritagliare-immagine-quadrata/) si apre in 1:1. Per storie e Reel, che riempiono tutto lo schermo del telefono, usa [Ritaglia in 9:16](/it/ritagliare-immagine-9-16/).

## Dalla foto del telefono al post

Una foto scattata col telefono in verticale è già in 3:4, quindi puoi pubblicarla così o portarla a 4:5, togliendo una striscia sottile sopra e sotto. Una foto orizzontale del telefono ritagliata in 4:5 tiene il 60% della larghezza, quindi sposta il riquadro di lato finché il soggetto non sta dove vuoi. Le foto dell'iPhone salvate in HEIC vanno convertite prima: [HEIC in JPG](/it/heic-in-jpg/) le converte, sempre nel browser.

Il ritaglio tiene tutti i pixel dell'area che scegli, quindi una foto del telefono esce molto più larga di 1080 px. Instagram la riduce quando la pubblichi. Per farlo tu e conoscere la misura esatta del file, apri il ritaglio in [Ridimensiona per Instagram](/it/ridimensionare-immagini-per-instagram/), che imposta la larghezza a 1080 px.

## Come funziona

La foto viene decodificata in un worker in background dentro questa scheda, e l'area scelta viene tagliata dai pixel a piena risoluzione, non dall'anteprima più piccola. Le foto del telefono vengono prima raddrizzate secondo l'orientamento salvato con loro, quindi il ritaglio corrisponde a quello che vedi. Il risultato viene salvato in JPG, PNG, WebP o AVIF senza i dati EXIF dell'originale. Niente passa dalla rete. Per tutte le proporzioni e il riquadro libero, usa [Ritaglia un'immagine](/it/ritagliare-immagini/).
