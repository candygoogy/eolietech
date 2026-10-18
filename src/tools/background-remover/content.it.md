---
title: "Rimuovere lo sfondo da una foto in privato | Eolietech"
description: "Scontorna persone, prodotti e animali con un modello di AI che gira nel tuo browser. Ottieni PNG trasparenti a piena risoluzione. Le tue foto non vengono mai caricate."
h1: "Rimuovere lo sfondo da una foto"
intro: "Ottieni un PNG trasparente del soggetto della tua foto: un prodotto per un annuncio, un ritratto per l'immagine del profilo, il tuo animale per un biglietto. Un modello di AI fa lo scontorno sul tuo dispositivo, quindi le tue foto non vengono mai caricate."
howTo:
  - "Scegli una o più foto (JPG, PNG, WebP o AVIF), oppure trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 20 alla volta."
  - "Premi Rimuovi sfondo. La prima volta il browser scarica il modello di AI e il suo motore, una volta sola (circa 110 MB), da questo sito."
  - "Aspetta che ogni foto sia pronta. Di solito servono pochi secondi per foto; l'anteprima mostra lo scontorno su una scacchiera, che indica la trasparenza."
  - "Scarica ogni PNG, oppure usa Scarica tutto per avere un .zip con tutti i risultati."
faq:
  - q: "Le mie foto vengono caricate da qualche parte?"
    a: "No. Il modello di AI gira dentro questa scheda del browser, usando la scheda grafica (WebGPU) quando il browser lo consente e il processore (WebAssembly) negli altri casi. L'unico download è il modello stesso, che arriva da questo sito. Le foto vengono lette dal tuo disco e i PNG vengono salvati di nuovo lì."
  - q: "Perché prima scarica circa 110 MB?"
    a: "È il modello di AI (circa 94 MB) più il motore che lo fa girare (da 14 a 16 MB, a seconda che usi o no la scheda grafica). Non viene scaricato niente finché non premi Rimuovi sfondo, e il browser conserva entrambi nella sua memoria, così le visite successive partono senza scaricarli di nuovo. Se cancelli i dati del browser, verranno riscaricati la volta dopo."
  - q: "Quanto tempo ci vuole?"
    a: "Nelle nostre prove, circa 2 secondi per foto con il processore di un computer desktop e meno di un secondo con una scheda grafica, una volta pronto il modello. Sui portatili possono servire alcuni secondi per foto. I browser con WebGPU (le versioni attuali di Chrome ed Edge sulla maggior parte dei computer) usano la scheda grafica. Smartphone e computer meno recenti sono più lenti e possono esaurire la memoria con foto molto grandi; se succede, prova una foto alla volta."
  - q: "Il risultato avrà le stesse dimensioni della mia foto?"
    a: "Sì. Il modello guarda una versione da 512 × 512 pixel della foto per decidere cosa è soggetto e cosa è sfondo, e quella maschera viene poi ingrandita e applicata all'immagine originale. Il PNG ha la stessa larghezza e altezza della foto che hai aggiunto."
  - q: "Con che tipo di foto funziona meglio?"
    a: "Con foto che hanno un soggetto chiaro: una persona, un animale, un prodotto o un oggetto che si stacca bene da quello che c'è dietro. Scene affollate, soggetti che si confondono con lo sfondo e dettagli molto fini come capelli sciolti o pelo possono venire fuori con i bordi irregolari. Nelle foto di gruppo di solito restano tutte le persone in primo piano."
  - q: "Che modello di AI è, e posso usare i risultati per scopi commerciali?"
    a: "È BiRefNet lite, un modello di segmentazione di Peng Zheng e coautori, in un'esportazione ONNX a 512 × 512 di Studio Ludens. Sia il modello sia l'esportazione sono rilasciati con licenza MIT, che consente l'uso commerciale. Le immagini che crei sono tue."
ui:
  bg.modelNote: "Rimuovere lo sfondo usa un modello di AI e il suo motore, scaricati una volta da questo sito ({size}) quando premi Rimuovi sfondo. Poi girano sul tuo dispositivo."
  bg.listLabel: "Foto"
  bg.action: "Rimuovi sfondo"
  bg.added.one: "Aggiunta {count} foto."
  bg.added.other: "Aggiunte {count} foto."
  bg.removed: "Rimossa: {name}."
  bg.removeLabel: "Rimuovi {name}"
  bg.loading: "Preparazione del modello di AI e del suo motore ({size}, solo la prima volta)…"
  bg.downloading: "Download del modello di AI: {loaded} di {total}, poi del suo motore ({engine})"
  bg.fromCache: "Caricamento del modello di AI dalla memoria del browser…"
  bg.starting: "Avvio del modello di AI…"
  bg.backend.webgpu: "In esecuzione sulla scheda grafica (WebGPU)."
  bg.backend.wasm.one: "In esecuzione sul processore (WebAssembly, {threads} thread)."
  bg.backend.wasm.other: "In esecuzione sul processore (WebAssembly, {threads} thread)."
  bg.fileStatus: "Rimozione dello sfondo {current} di {total}: {name}"
  bg.working: "Rimozione dello sfondo…"
  bg.result: "PNG {width} × {height} px, {size}"
  bg.done.one: "Finito. {count} foto pronta."
  bg.done.other: "Finito. {count} foto pronte."
  bg.downloadLabel: "Scarica {name}"
  bg.previewAlt: "{name} senza sfondo"
  bg.zipName: "sfondo-rimosso.zip"
  bg.error.load: "Non è stato possibile caricare il modello di AI. Controlla la connessione e riprova. Se continua a succedere, il browser potrebbe avere poca memoria: chiudi le altre schede e ricarica la pagina."
  bg.error.decode: "Non è stato possibile aprire {name}. Usa una foto JPG, PNG, WebP o AVIF."
  bg.error.tooLarge: "{name} supera i 50 megapixel. Riducila e riprova."
  bg.error.failed: "Qualcosa è andato storto durante l'elaborazione di {name}. Se la foto è molto grande, prova a elaborarla da sola."
---

## Come funziona

Questo strumento esegue [BiRefNet](https://github.com/ZhengPeng7/BiRefNet), un modello di segmentazione delle immagini, dentro il tuo browser con ONNX Runtime Web. Per ogni foto il modello calcola, pixel per pixel, quanto è probabile che appartenga al soggetto principale. Questa stima diventa la trasparenza del risultato: i pixel del soggetto restano pieni, quelli dello sfondo diventano trasparenti, e i bordi intermedi sono semitrasparenti, così capelli e contorni morbidi si fondono con un nuovo sfondo.

Il modello e il suo motore pesano in tutto circa 110 MB. Per tenere leggera la pagina vengono scaricati solo quando premi Rimuovi sfondo, la pagina ti dice prima quanto pesano, e poi il browser li conserva. Quando il browser supporta WebGPU il modello gira sulla scheda grafica; altrimenti gira sul processore con WebAssembly, usando più core quando può.

## Cosa aspettarsi

- **Soggetti chiari**, come un prodotto su un tavolo, una persona davanti a un muro o un'auto in strada, di solito vengono scontornati in modo pulito.
- **I dettagli fini**, come capelli spettinati, pelo, pizzo o lo spazio tra le dita, sono la parte più difficile. I bordi possono risultare un po' morbidi o conservare una traccia del vecchio sfondo.
- **Le foto affollate o poco contrastate**, in cui il soggetto ha un colore simile a ciò che lo circonda, possono perdere parti del soggetto o tenere parti dello sfondo.

Il risultato è sempre un PNG, perché il JPG non può salvare la trasparenza. Il PNG di una foto grande può pesare diversi megabyte; per alleggerirlo per il web, [Comprimere immagini](/it/comprimere-immagini/) può convertirlo in WebP mantenendo la trasparenza. Le foto dell'iPhone in formato HEIC si possono prima trasformare in JPG con [Convertire HEIC in JPG](/it/heic-in-jpg/).

## Privacy e licenze

Le tue foto non escono mai dal tuo dispositivo. I file del modello vengono forniti da questo sito, verificati con checksum fissi e conservati nella memoria del browser. BiRefNet è di Peng Zheng, Dehong Gao, Deng-Ping Fan, Li Liu, Jorma Laaksonen, Wanli Ouyang e Nicu Sebe, rilasciato con licenza MIT; l'esportazione ONNX a 512 × 512 usata qui è di Studio Ludens, anch'essa MIT. ONNX Runtime è di Microsoft, con licenza MIT.
