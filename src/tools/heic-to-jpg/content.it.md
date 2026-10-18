---
title: "Convertire HEIC in JPG nel browser | Eolietech"
description: "Trasforma le foto HEIC e HEIF dell'iPhone in file JPG che si aprono ovunque. Converti più foto insieme nel browser; le tue foto non vengono mai caricate."
h1: "Convertire HEIC in JPG"
intro: "Converti le foto di iPhone e iPad da HEIC a JPG, così si aprono su Windows, nelle app più vecchie e su qualsiasi sito. La conversione avviene sul tuo dispositivo, quindi le tue foto non vengono mai caricate."
howTo:
  - "Scegli le foto .heic o .heif, oppure trascinale nel riquadro qui sopra. Puoi convertirne fino a 50 alla volta."
  - "Lascia il formato su JPG, oppure scegli PNG se ti serve una copia senza perdita."
  - "Imposta la qualità JPG. Con 85 le foto restano fedeli all'originale e occupano meno spazio."
  - "Scarica ogni JPG, oppure usa Scarica tutto per avere un .zip con tutte le foto convertite."
faq:
  - q: "Perché le foto del mio iPhone sono file HEIC?"
    a: "Da iOS 11 gli iPhone salvano le foto in HEIC (High Efficiency Image Container) per impostazione predefinita, perché occupa circa metà dello spazio di un JPG. I dispositivi Apple lo aprono senza problemi, ma molte app per Windows, programmi più vecchi e moduli di caricamento non lo accettano."
  - q: "Le mie foto vengono caricate su un server?"
    a: "No. Il decoder HEIC (libheif, compilato in WebAssembly) e l'encoder JPG girano dentro questa scheda del browser. Le foto vengono lette dal tuo disco e i risultati vengono salvati di nuovo lì; non passa niente dalla rete."
  - q: "Perdo qualità convertendo da HEIC a JPG?"
    a: "Il JPG è un formato con perdita, quindi ogni salvataggio comporta una piccola perdita. Con qualità 85 o superiore è difficilissima da vedere. Se ti serve una copia esatta dei pixel, scegli PNG, ma aspettati file parecchie volte più pesanti."
  - q: "Il JPG conserva la posizione e i dati della fotocamera?"
    a: "No. Il file convertito contiene solo l'immagine, senza dati EXIF come posizione GPS, data dello scatto o modello della fotocamera. È comodo prima di condividere foto in pubblico, ma significa anche che le app per le foto non ordineranno i JPG secondo la data di scatto originale."
  - q: "E le Live Photo e le foto a raffica?"
    a: "Lo strumento converte l'immagine fissa principale di ogni file. La parte video di una Live Photo è un file .mov separato e non viene inclusa. Se un file HEIC contiene più immagini, viene convertita solo quella principale."
ui:
  img.drop.hint: "Foto HEIC o HEIF. Convertite sul tuo dispositivo; non viene caricato niente."
  img.option.format: "Formato di uscita"
  img.option.quality: "Qualità JPG"
  img.option.qualityNote: "Più è alta, più dettagli conserva; 85 è un buon equilibrio per le foto."
  img.option.qualityPng: "Il PNG è senza perdita, quindi la qualità non si applica."
  img.progress: "Avanzamento"
  img.list: "Le tue foto"
  img.privacy: "Le tue foto vengono convertite in questa scheda del browser e non vengono mai caricate."
  img.zipName: "foto-convertite.zip"
  img.status.pending: "In attesa ({size})"
  img.status.working: "Conversione ({size})…"
  img.status.smaller: "{before} → {after}, {percent}% in meno"
  img.status.larger: "{before} → {after}, {percent}% in più"
  img.status.same: "{before} → {after}, stesso peso"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "Il nuovo file non è più leggero dell'originale, quindi conviene tenere l'originale"
  img.status.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza"
  img.error.decode: "non è stato possibile leggere questa foto. Potrebbe essere danneggiata o usare una variante HEIF che questo strumento non sa decodificare."
  img.error.unsupported: "non sembra una foto HEIC o HEIF, oppure il tuo browser è troppo vecchio per convertirla qui."
  img.error.memory: "non c'era abbastanza memoria per convertire questa foto. Prova con meno file alla volta."
  img.downloadNamed: "Scarica {name}"
  img.downloadOriginal: "Scarica l'originale"
  img.downloadOriginalNamed: "Scarica l'originale di {name}"
  img.downloadNew: "Scarica comunque il nuovo file"
  img.downloadNewNamed: "Scarica comunque il nuovo {name}"
  img.removeNamed: "Rimuovi {name}"
  img.summary.working: "Conversione: {done} foto su {total} completate."
  img.summary.done: "Fatto: {done} foto su {total} convertite."
  img.summary.sizes: "Peso totale {before} → {after}."
  img.summary.failed: "Non convertite: {failed}."
---

## Quando ti serve un JPG al posto di un HEIC

L'HEIC è un formato efficiente, ma fuori dall'ecosistema Apple è supportato a macchia di leopardo. Windows ha bisogno di un codec aggiuntivo dal Microsoft Store per aprirlo, molti siti web e moduli della pubblica amministrazione accettano solo JPG o PNG, e i vecchi programmi di fotoritocco rifiutano del tutto il file. Convertendo in JPG ottieni un file che si apre praticamente su qualsiasi dispositivo e in qualsiasi app.

Se hai solo poche foto e l'iPhone a portata di mano, puoi anche impostare **Impostazioni → Fotocamera → Formati → Più compatibile**, così le foto future vengono salvate in JPG. Questo però non converte le foto che hai già, ed è lì che ti aiuta questo strumento.

## Peso e qualità

Aspettati un JPG più pesante dell'HEIC da cui proviene, spesso da 1,5 a 2 volte con qualità 85. È il prezzo della compatibilità: l'HEIC usa un metodo di compressione più recente ed efficiente. Abbassando la qualità a 75 il peso si avvicina a quello originale, con poca differenza visibile sullo schermo di uno smartphone o di un portatile. Il PNG conserva esattamente ogni pixel ma produce file molto più grandi, quindi usalo solo se pensi di modificare ancora l'immagine.

## Come funziona

Il tuo browser legge ogni file, lo decodifica con libheif (la libreria HEIF open source, compilata in WebAssembly) e codifica il risultato con MozJPEG, tutto in worker in background, così la pagina resta utilizzabile. Le foto vengono raddrizzate usando l'orientamento salvato nel file. La conversione funziona nelle versioni attuali di Chrome, Edge, Firefox e Safari. Dato che tutto avviene in locale, con un gruppo numeroso di foto contano la velocità e la memoria del tuo dispositivo: un portatile recente di solito gestisce una foto da 12 megapixel in un secondo o due.
