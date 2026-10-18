---
title: "Comprimere e convertire immagini online | Eolietech"
description: "Riduci il peso di immagini JPG, PNG, WebP e AVIF o convertile da un formato all'altro nel browser. Più file insieme, qualità e dimensioni a scelta. Nessun caricamento."
h1: "Comprimere immagini"
intro: "Rendi più leggeri i file JPG, PNG, WebP e AVIF, o convertili in un altro formato, senza caricare niente. Gli encoder girano dentro questa pagina, quindi le tue foto restano sul tuo dispositivo."
howTo:
  - "Scegli le immagini o trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "Scegli il formato di uscita: lascia il formato originale di ogni file per comprimerlo e basta, oppure passa a JPG, PNG, WebP o AVIF."
  - "Regola il cursore della qualità per JPG, WebP e AVIF, e imposta una larghezza o un'altezza massima se le immagini sono più grandi di quanto ti serve."
  - "Controlla il nuovo peso accanto a ogni file, poi scaricali uno per uno o tutti insieme in un .zip."
faq:
  - q: "Le mie immagini vengono caricate da qualche parte?"
    a: "No. Decodifica, ridimensionamento e codifica avvengono nel tuo browser, con le versioni WebAssembly di MozJPEG, libwebp, libavif e oxipng. La pagina scarica solo gli encoder da questo sito; non invia mai i tuoi file a un server."
  - q: "Che qualità conviene usare?"
    a: "75 è un buon valore di partenza per le foto sul web: alla normale dimensione di visualizzazione quasi nessuno la distingue dall'originale. Sali a 85 o 90 per le immagini da stampare o da modificare ancora, e scendi a 60 per le miniature. Il PNG ignora il cursore perché è sempre senza perdita."
  - q: "Perché un file è diventato più grande?"
    a: "Un'immagine già ben compressa può uscire più pesante quando viene codificata di nuovo, soprattutto con una qualità alta. Se succede e il formato non è cambiato, lo strumento te lo dice e ti propone il file originale, e anche lo .zip usa l'originale."
  - q: "La compressione toglie i metadati della foto?"
    a: "Sì. I nuovi file non contengono dati EXIF come posizione GPS, modello della fotocamera o data. Prima l'immagine viene raddrizzata, così anche le foto scattate di lato si vedono nel verso giusto. Nemmeno i profili colore incorporati vengono conservati, quindi le foto ad ampia gamma cromatica possono apparire un po' meno sature."
  - q: "Posso ridurre anche le dimensioni in pixel?"
    a: "Sì. Inserisci una larghezza massima, un'altezza massima o entrambe. Le immagini più grandi vengono rimpicciolite per starci dentro, mantenendo le proporzioni; quelle più piccole restano alla dimensione originale e non vengono mai ingrandite."
ui:
  img.drop.hint: "JPG, PNG, WebP o AVIF. Elaborate sul tuo dispositivo; non viene caricato niente."
  img.option.format: "Formato di uscita"
  img.format.original: "Mantieni il formato originale"
  img.option.quality: "Qualità"
  img.option.qualityNote: "Vale per JPG, WebP e AVIF. Più è bassa, più i file sono leggeri; 75 va bene per la maggior parte delle foto."
  img.option.qualityPng: "Il PNG è senza perdita, quindi la qualità non si applica."
  img.option.maxWidth: "Larghezza max (px)"
  img.option.maxHeight: "Altezza max (px)"
  img.option.dimensionPlaceholder: "Originale"
  img.option.resizeNote: "Lascia vuoto per mantenere le dimensioni originali. Le immagini vengono solo rimpicciolite, mai ingrandite."
  img.progress: "Avanzamento"
  img.list: "Le tue immagini"
  img.privacy: "Le tue immagini vengono elaborate in questa scheda del browser e non vengono mai caricate."
  img.zipName: "immagini-compresse.zip"
  img.status.pending: "In attesa ({size})"
  img.status.working: "Elaborazione ({size})…"
  img.status.smaller: "{before} → {after}, {percent}% in meno"
  img.status.larger: "{before} → {after}, {percent}% in più"
  img.status.same: "{before} → {after}, stesso peso"
  img.status.dimensions: "{width} × {height} px"
  img.status.keepOriginal: "Il nuovo file non è più leggero dell'originale, quindi conviene tenere l'originale"
  img.status.flattened: "Le zone trasparenti sono state riempite di bianco, perché il JPG non supporta la trasparenza"
  img.error.decode: "non è stato possibile leggere questo file. Potrebbe essere danneggiato, animato o non essere davvero un'immagine di questo tipo."
  img.error.unsupported: "questo tipo di file non è supportato qui."
  img.error.memory: "non c'era abbastanza memoria per elaborare questa immagine. Prova con un'immagine più piccola o con meno file alla volta."
  img.downloadNamed: "Scarica {name}"
  img.downloadOriginal: "Scarica l'originale"
  img.downloadOriginalNamed: "Scarica l'originale di {name}"
  img.downloadNew: "Scarica comunque il nuovo file"
  img.downloadNewNamed: "Scarica comunque il nuovo {name}"
  img.removeNamed: "Rimuovi {name}"
  img.summary.working.one: "Elaborazione in corso: {done} su {total}."
  img.summary.working.other: "Elaborazione in corso: {done} su {total}."
  img.summary.done.one: "Fatto. File convertiti: {done} su {total}."
  img.summary.done.other: "Fatto. File convertiti: {done} su {total}."
  img.summary.sizes: "Peso totale {before} → {after}."
  img.summary.failed.one: "Non elaborato: {failed}."
  img.summary.failed.other: "Non elaborati: {failed}."
---

## Comprimi o converti, sul tuo dispositivo

Questo strumento ricodifica le immagini con gli stessi encoder open source che fanno funzionare Squoosh di Google: MozJPEG per i JPG, libwebp per i WebP, libavif per gli AVIF e oxipng per i PNG. Sono compilati in WebAssembly e girano in un worker in background dentro questa scheda, così la pagina resta reattiva mentre elabora un gruppo di file e nessun file passa mai dalla rete.

Con **Mantieni il formato originale** selezionato, ogni file viene compresso nel suo formato. Un JPG resta un JPG, un PNG resta un PNG. Se invece vuoi convertire tutto il gruppo, scegli un formato dall'elenco.

## Quale formato scegliere

- **JPG** funziona ovunque ed è la scelta sicura per le foto che mandi per email o carichi su altri servizi. Non supporta la trasparenza.
- **PNG** è senza perdita: ogni pixel viene conservato esattamente. È adatto a screenshot, schemi e loghi, ma poco alle foto, che diventano parecchie volte più pesanti di un JPG.
- **WebP** di solito pesa il 25-35% in meno di un JPG di qualità simile e supporta la trasparenza. Tutti i browser attuali lo visualizzano, anche se alcuni vecchi programmi desktop no.
- **AVIF** di solito dà i file più leggeri, spesso circa la metà di un JPG equivalente. La codifica è più lenta, quindi un gruppo numeroso richiede un po' di tempo. Chrome, Edge, Firefox e Safari dalla versione 16 in poi lo visualizzano.

## Quanto diventeranno più leggeri i miei file?

Dipende dall'origine. Le foto che arrivano direttamente da uno smartphone o da una fotocamera sono spesso salvate con una qualità molto alta e si riducono parecchio, a volte del 60-80% con qualità 75. Le immagini già ottimizzate per il web possono cambiare appena. La compressione PNG è senza perdita, quindi lì i risparmi tipici sono più bassi, intorno al 10-40%. Ogni risultato mostra il peso prima e dopo, così puoi confrontare prima di scaricare.

Se ti servono solo file più leggeri per un sito web, abbinare una qualità moderata a una larghezza massima (1600 o 2000 pixel bastano per la maggior parte dei layout) di solito fa risparmiare più che abbassare soltanto la qualità.
