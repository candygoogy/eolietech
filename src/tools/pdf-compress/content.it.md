---
title: "Comprimere PDF in privato | Eolietech"
description: "Riduci il peso dei PDF con Ghostscript, che gira nel tuo browser. Scegli un livello di qualità e confronta le dimensioni prima di scaricare. Nessun caricamento."
h1: "Comprimere un PDF"
intro: "Riduci un PDF quanto basta per allegarlo a un'email o caricarlo in un modulo. Scegli quanta qualità sei disposto a cedere in cambio di un file più leggero; lo strumento ti mostra il peso prima e dopo, e tiene l'originale se non riesce a fare di meglio."
howTo:
  - "Scegli uno o più PDF, oppure trascinali nel riquadro qui sopra."
  - "Scegli un livello di qualità: File più leggero, Bilanciata o Alta qualità. Bilanciata va bene per la maggior parte dei documenti."
  - "Premi Comprimi. La prima volta il browser scarica il motore di compressione, una volta sola (circa 15 MB)."
  - "Confronta i pesi mostrati per ogni file e scarica il risultato. Se un file non è diventato più leggero, scarica invece l'originale."
faq:
  - q: "Di quanto si ridurrà il mio PDF?"
    a: "Dipende da cosa contiene. Le scansioni e i documenti con foto grandi spesso si riducono molto. I file fatti soprattutto di testo, o già compressi, possono cambiare appena, e a volte il risultato è più pesante. Lo strumento mostra sempre entrambi i pesi e ti propone l'originale quando la compressione non è servita."
  - q: "I miei file vengono caricati?"
    a: "No. La compressione avviene nel tuo browser con Ghostscript compilato in WebAssembly. L'unico download è il motore stesso, che arriva da questo sito e poi resta nella cache del browser. I tuoi PDF restano sul tuo dispositivo."
  - q: "Quale livello di qualità scelgo?"
    a: "File più leggero riduce le immagini a circa 72 dpi, sufficienti per leggere a schermo. Bilanciata usa circa 150 dpi ed è una buona scelta predefinita per la condivisione. Alta qualità mantiene circa 300 dpi per la stampa. Testo e grafica vettoriale restano nitidi a ogni livello; i livelli influiscono soprattutto su foto e scansioni."
  - q: "Perché la prima compressione ci mette di più?"
    a: "Il motore di compressione pesa circa 15 MB. Il browser lo scarica la prima volta che premi Comprimi e lo tiene nella cache, così le visite successive partono più in fretta. Non viene scaricato finché non chiedi di comprimere un file."
  - q: "Posso comprimere PDF protetti da password?"
    a: "No, se il file chiede una password per essere aperto. Se la conosci, toglila prima con Sbloccare PDF su questo sito, poi comprimi la copia sbloccata."
ui:
  compress.preset.legend: "Qualità"
  compress.preset.screen: "File più leggero"
  compress.preset.screen.hint: "Immagini a circa 72 dpi. Per leggere a schermo."
  compress.preset.ebook: "Bilanciata"
  compress.preset.ebook.hint: "Immagini a circa 150 dpi. Adatta a email e condivisione."
  compress.preset.printer: "Alta qualità"
  compress.preset.printer.hint: "Immagini a circa 300 dpi. Per la stampa."
  compress.engineNote: "La compressione usa Ghostscript, che il browser scarica una volta sola ({size}) quando premi Comprimi. Poi gira sul tuo dispositivo."
  compress.listLabel: "File da comprimere"
  compress.action: "Comprimi"
  compress.added.one: "Aggiunto {count} file."
  compress.added.other: "Aggiunti {count} file."
  compress.removed: "Rimosso: {name}."
  compress.removeLabel: "Rimuovi {name}"
  compress.loadingEngine: "Download del motore di compressione ({size}, solo la prima volta)…"
  compress.downloading: "Download del motore di compressione: {loaded} di {total}"
  compress.fileStatus: "Compressione del file {current} di {total}: {name}"
  compress.working: "Compressione…"
  compress.page: "Pagina {page} di {pages}"
  compress.result: "{before} → {after} ({percent}% in meno)"
  compress.notSmaller: "Non è stato possibile ridurre questo file ({before} → {after}). Probabilmente è già ben compresso, quindi tieni l'originale."
  compress.done.one: "Finito. {count} file pronto."
  compress.done.other: "Finito. {count} file pronti."
  compress.downloadOriginal: "Scarica l'originale"
  compress.downloadLabel: "Scarica {name}"
  compress.downloadOriginalLabel: "Scarica il file originale {name}"
  compress.outputName: "{name}_compresso.pdf"
  compress.zipName: "pdf_compressi.zip"
  compress.error.engine: "Non è stato possibile caricare il motore di compressione. Controlla la connessione e riprova."
  compress.error.failed: "Non è stato possibile comprimere {name}. Il file potrebbe essere danneggiato o usare funzioni che il motore non supporta."
---

## Come funziona

Questo strumento esegue [Ghostscript](https://www.ghostscript.com/), un motore PDF open source in circolazione da molti anni, dentro il tuo browser. È stato compilato in WebAssembly, quindi gira sul tuo processore come qualsiasi altra parte della pagina. Ghostscript legge il tuo PDF e ne scrive uno nuovo, ricomprimendo le immagini alla risoluzione che hai scelto, eliminando le immagini duplicate e comprimendo i font.

Il motore pesa circa 15 MB. Per tenere leggera la pagina, non viene caricato finché non premi Comprimi, e la pagina ti dice quanto pesa prima di cominciare. Dopo la prima volta, di solito il browser lo prende dalla sua cache.

## Cosa aspettarsi

I risultati cambiano molto da file a file, ed è meglio saperlo subito:

- **Documenti scansionati e PDF pieni di foto** di solito si riducono di più, perché il loro peso viene da immagini grandi che si possono salvare a una risoluzione più bassa.
- **Documenti di solo testo**, come quelli esportati da un programma di videoscrittura, spesso sono già compatti. Possono ridursi di poco o per niente.
- **Alcuni file diventano più pesanti.** Se il risultato non è più leggero del file di partenza, lo strumento te lo dice e ti propone l'originale invece di una versione peggiore.

Testo e grafica vettoriale restano nitidi con ogni impostazione. I livelli di qualità cambiano soprattutto il modo in cui vengono salvate foto e pagine scansionate, quindi se una scansione diventa difficile da leggere, prova un livello più alto.

## Privacy e limiti

I tuoi PDF non escono mai dal tuo dispositivo; viene scaricato solo il motore, da questo sito. I file che chiedono una password per essere aperti non si possono comprimere. I file molto grandi richiedono parecchia memoria, quindi sugli smartphone può aiutare comprimere un file alla volta. I campi interattivi dei moduli e alcuni elementi aggiuntivi del documento potrebbero essere appiattiti o persi quando Ghostscript riscrive il file, quindi tieni l'originale. Per ridurre le immagini prima di metterle in un PDF, può esserti utile [Comprimere immagini](/it/comprimere-immagini/).
