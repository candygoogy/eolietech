---
title: "Ritagliare immagini nel browser | Eolietech"
description: "Ritaglia immagini JPG, PNG, WebP e AVIF in quadrato, 4:5, 16:9 o con la forma che disegni tu, a piena risoluzione. Tutto nel browser, senza caricare nulla."
h1: "Ritaglia un'immagine"
intro: "Disegna un riquadro sulla parte della foto che vuoi tenere, a mano libera o con proporzioni fisse come 1:1 o 16:9, e salva solo quella, a piena risoluzione. Il ritaglio avviene sul tuo dispositivo, quindi l'immagine non viene mai caricata."
howTo:
  - "Scegli un'immagine o trascinala nel riquadro qui sopra. Si ritaglia un'immagine alla volta, fino a 100 MB."
  - "Scegli le proporzioni (Libero, Originale, 1:1, 4:5, 3:2 o 16:9), poi trascina il riquadro sulla parte da tenere e tira gli angoli o i bordi per cambiarne la misura. Ruota proporzioni trasforma 4:5 in 5:4."
  - "Per un taglio preciso, scrivi posizione e misure in pixel nei campi sotto l'immagine. In Salva come lascia il formato originale, oppure scegli JPG, PNG, WebP o AVIF."
  - "Premi Ritaglia, controlla le nuove misure in pixel e scarica il file."
faq:
  - q: "La mia immagine viene caricata da qualche parte?"
    a: "No. L'immagine viene decodificata, ritagliata e salvata di nuovo dentro questa scheda del browser. La pagina scarica una volta gli encoder da questo sito e non invia mai il tuo file a un server."
  - q: "Il ritaglio peggiora la qualità?"
    a: "I pixel che tieni vengono copiati così come sono, senza ridimensionarli, quindi niente diventa sfocato. Il file però viene salvato di nuovo: JPG, WebP e AVIF usano la qualità che imposti, e con il valore predefinito, 90, le foto restano molto vicine all'originale. Il PNG è senza perdita, quindi esce identico pixel per pixel."
  - q: "Posso ritagliare a una misura precisa, per esempio 1080 × 1080 px?"
    a: "Sì. Scegli 1:1 e scrivi 1080 in Larghezza: l'altezza si adegua e ottieni un pezzo di 1080 × 1080 px dell'originale, con i suoi pixel reali. Se vuoi far stare una parte più ampia della foto in quei 1080 px, ritaglia prima un quadrato più grande e poi rimpiccioliscilo con lo strumento per ridimensionare le immagini di questo sito."
  - q: "Il file ritagliato conserva la posizione e i dati della fotocamera?"
    a: "No. Il nuovo file contiene solo i pixel che hai tenuto, senza dati EXIF come la posizione GPS o il modello della fotocamera. L'orientamento salvato dal telefono viene applicato prima del ritaglio, quindi le foto scattate in verticale appaiono dritte e il ritaglio corrisponde a quello che vedi."
  - q: "Posso ritagliare le foto HEIC dell'iPhone?"
    a: "Non direttamente: questa pagina apre JPG, PNG, WebP e AVIF. Prima converti i file HEIC con il convertitore da HEIC a JPG di questo sito, poi ritaglia qui il JPG."
ui:
  crop.drop.label: "Scegli un'immagine o trascinala qui"
  crop.drop.replace: "Scegli un'altra immagine"
  crop.drop.hint: "JPG, PNG, WebP o AVIF. Ritagliata sul tuo dispositivo; non viene caricato niente."
  crop.opening: "Apertura di {name}…"
  crop.fileInfo: "{name} · {width} × {height} px · {size}"
  crop.previewAlt: "Anteprima di {name}"
  crop.aspect.legend: "Proporzioni"
  crop.aspect.free: "Libero"
  crop.aspect.original: "Originale"
  crop.aspect.turn: "Ruota proporzioni"
  crop.aspect.turnLabel: "Ruota le proporzioni in {ratio}"
  crop.box.label: "Area di ritaglio"
  crop.box.hint: "Trascina il riquadro, o i suoi angoli e bordi, sulla parte da tenere. Da tastiera: le frecce spostano il riquadro, Alt (Opzione su Mac) più una freccia lo ridimensiona, e con Maiusc ogni passo vale 10 px."
  crop.announce: "Area di ritaglio {width} × {height} px, a {x} px da sinistra e {y} px dall'alto."
  crop.field.x: "Da sinistra (px)"
  crop.field.y: "Dall'alto (px)"
  crop.field.width: "Larghezza (px)"
  crop.field.height: "Altezza (px)"
  crop.fields.note: "In pixel dell'immagine originale, misurati dal suo angolo in alto a sinistra."
  crop.option.format: "Salva come"
  crop.format.original: "Come l'originale, {format}"
  crop.option.quality: "Qualità"
  crop.option.qualityNote: "Vale per JPG, WebP e AVIF. Con 90 le foto restano vicine all'originale."
  crop.option.qualityPng: "Il PNG è senza perdita, quindi la qualità non si applica."
  crop.action: "Ritaglia"
  crop.resetBox: "Ripristina il riquadro"
  crop.working: "Ritaglio in corso…"
  crop.progress: "Avanzamento"
  crop.result: "Ritagliata a {width} × {height} px, {size}"
  crop.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza."
  crop.downloadLabel: "Scarica {name}"
  crop.fileSuffix: "ritagliata"
  crop.error.decode: "Non è stato possibile leggere {name}. Potrebbe essere danneggiato, animato o non essere davvero un'immagine di questo tipo."
  crop.error.unsupported: "{name} è un tipo di immagine che questo strumento non apre. Usa JPG, PNG, WebP o AVIF."
  crop.error.memory: "Non c'era abbastanza memoria per lavorare su {name}. Chiudi altre schede o prova con un'immagine più piccola."
  crop.error.failed: "Qualcosa è andato storto durante il ritaglio di {name}. Riprova, oppure salvala in un altro formato."
---

## Quali proporzioni scegliere

- 1:1 va bene per foto profilo, avatar, foto di prodotti e post quadrati. [Ritaglia in quadrato](/it/ritagliare-immagine-quadrata/) si apre con queste proporzioni già impostate.
- 4:5 è un formato verticale comune nei feed dei social, più alto di un quadrato ma molto più basso dello schermo di un telefono.
- 3:2 è il formato delle foto di quasi tutte le reflex e le mirrorless, e della classica stampa 10 × 15 cm.
- 16:9 va bene per copertine dei video, slide, televisori e sfondi panoramici. [Ritaglia in 16:9](/it/ritagliare-immagine-16-9/) si apre con queste proporzioni già impostate.

**Originale** mantiene la forma della foto, comodo quando vuoi solo togliere un po' di bordo. **Libero** ti lascia disegnare qualsiasi rettangolo. Per girare un formato dall'altro lato premi **Ruota proporzioni**: 4:5 diventa 5:4, 3:2 diventa 2:3 e 16:9 diventa 9:16.

## Pixel esatti e tastiera

I quattro campi sotto l'immagine indicano la distanza del riquadro da sinistra e dall'alto, poi la sua larghezza e altezza, tutto in pixel dell'immagine originale. Con delle proporzioni impostate, se scrivi la larghezza l'altezza si adegua. Questi numeri scelgono l'area da tenere e non la ridimensionano mai. Se ti serve una misura finale precisa, come 1280 × 720 px, ritaglia prima e poi usa [Ridimensiona le immagini](/it/ridimensionare-immagini/).

Puoi fare tutto anche senza mouse. Con Tab arrivi all'area di ritaglio, e con le frecce sposti il riquadro di 1 px alla volta, o di 10 px tenendo premuto Maiusc. Alt (Opzione su Mac) più una freccia ridimensiona il riquadro dal suo angolo in basso a destra. Quando ti fermi, il lettore di schermo legge le nuove misure e la posizione. **Ripristina il riquadro** riporta il riquadro più grande che le proporzioni scelte consentono, al centro dell'immagine.

## Come funziona

L'anteprima sullo schermo è una copia più piccola, ricavata dagli stessi pixel decodificati che vengono tagliati, quindi il riquadro che disegni e il ritaglio coincidono sempre. Il taglio avviene a piena risoluzione in un worker in background dentro questa scheda, e il risultato viene salvato con MozJPEG, libwebp, libavif o oxipng. Il JPG non supporta la trasparenza: se salvi in JPG un'immagine trasparente, le zone trasparenti vengono riempite di bianco e la pagina te lo segnala.

Nessun file passa dalla rete, in nessun momento. Le immagini possono arrivare a 100 MB e il tempo dipende dal tuo dispositivo: una foto grande salvata in AVIF è quella che richiede più tempo. Se il file ritagliato pesa ancora troppo, [Comprimi le immagini](/it/comprimere-immagini/) può alleggerirlo.
