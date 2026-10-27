---
title: "Dividere PDF per intervalli di pagine | Eolietech"
description: "Dividi un PDF per intervalli di pagine come 1-3, 5, 8- oppure in pagine singole o blocchi di N pagine. Funziona nel browser, quindi il file non viene mai caricato."
h1: "Dividere un PDF"
intro: "Estrai pagine da un PDF o taglialo in file più piccoli. Scrivi le pagine che ti servono, oppure separa ogni pagina o ogni gruppo di pagine in documenti a sé. Il PDF resta sempre sul tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Lo strumento ti mostra quante pagine ha."
  - "Scegli come dividerlo: per intervalli di pagine (per esempio 1-3, 5, 8-), ogni pagina in un file a sé, oppure ogni N pagine."
  - "Con gli intervalli di pagine, spunta “Metti tutte le pagine selezionate in un solo PDF” se vuoi un unico file invece di un file per intervallo."
  - "Premi Dividi PDF, poi scarica ogni parte, oppure tutte insieme in un file .zip."
faq:
  - q: "Come si scrivono gli intervalli di pagine?"
    a: "Separa le parti con le virgole. “1-3” vuol dire dalla pagina 1 alla 3, “5” solo la pagina 5, “8-” dalla pagina 8 alla fine e “-4” le prime quattro pagine. Le pagine sono numerate da 1, come le mostra il tuo lettore PDF."
  - q: "Il PDF viene caricato su un server?"
    a: "No. La divisione avviene dentro il tuo browser con la libreria open source pdf-lib. Il file viene letto dal tuo disco, le parti vengono create nella memoria della pagina e poi salvate nella cartella Download."
  - q: "Perché una parte pesa quasi quanto il file originale?"
    a: "Spesso le pagine condividono risorse come font e immagini. Ogni parte conserva tutto quello che serve alle sue pagine, quindi anche una sola pagina che usa un font incorporato o un'immagine pesante può dare un file di dimensioni notevoli."
  - q: "Posso dividere un PDF protetto da password?"
    a: "No. I PDF cifrati non si possono dividere qui. Se conosci la password, toglila con Sbloccare PDF su questo sito e dividi la copia sbloccata."
  - q: "Posso mettere le pagine in un ordine diverso?"
    a: "Gli intervalli vengono estratti nell'ordine in cui li scrivi, quindi “5, 1-3” comincia dalla pagina 5. Per trascinare le pagine, ruotarle o eliminarle, usa Organizzare PDF."
ui:
  split.mode.legend: "Come vuoi dividerlo?"
  split.mode.ranges: "Per intervalli di pagine"
  split.mode.each: "Ogni pagina in un PDF a sé"
  split.mode.every: "Ogni N pagine"
  split.ranges.label: "Pagine"
  split.ranges.placeholder: "1-3, 5, 8-"
  split.ranges.hint: "Separa con le virgole. “8-” vuol dire dalla pagina 8 alla fine."
  split.combine: "Metti tutte le pagine selezionate in un solo PDF"
  split.every.label: "Pagine per file"
  split.action: "Dividi PDF"
  split.reading: "Lettura di {name}…"
  split.ready.one: "Pronto. Il PDF ha {pages} pagina."
  split.ready.other: "Pronto. Il PDF ha {pages} pagine."
  split.fileInfo.one: "{name}: {pages} pagina, {size}"
  split.fileInfo.other: "{name}: {pages} pagine, {size}"
  split.working: "Creazione della parte {current} di {total}…"
  split.done.one: "Fatto: {count} file pronto da scaricare."
  split.done.other: "Fatto: {count} file pronti da scaricare."
  split.resultsLabel: "Risultati della divisione"
  split.pages: "Pagine: {count}"
  split.downloadLabel: "Scarica {name}"
  split.downloadOne: "Scarica {name}"
  split.outputName: "{name}_pagine_{pages}.pdf"
  split.zipName: "{name}_diviso.zip"
  split.error.empty: "Scrivi le pagine che ti servono, per esempio 1-3, 5, 8-."
  split.error.syntax: "“{part}” non è una pagina né un intervallo. Usa numeri come 5 o 1-3."
  split.error.outOfRange.one: "“{part}” è fuori dal documento, che ha {pages} pagina."
  split.error.outOfRange.other: "“{part}” è fuori dal documento, che ha {pages} pagine."
  split.error.reversed: "“{part}” va all'indietro. Scrivi prima il numero di pagina più basso."
  split.error.size: "Le pagine per file devono essere un numero intero da 1 a {pages}."
---

## Tre modi per dividere

**Per intervalli di pagine** è il modo più flessibile. Scrivi esattamente le pagine che ti servono: `1-3, 5, 8-` ti dà tre file (pagine da 1 a 3, pagina 5 e dalla pagina 8 alla fine). Spunta la casella per metterle tutte in un solo PDF: è il modo più veloce per estrarre qualche pagina da un lungo report. Gli intervalli vengono presi nell'ordine in cui li scrivi, quindi `10-12, 1` mette la pagina 1 in fondo.

**Ogni pagina in un PDF a sé** trasforma un file di 20 pagine in 20 file di una pagina. È comodo per le scansioni in blocco in cui ogni pagina è una ricevuta, un modulo o una lettera diversa.

**Ogni N pagine** taglia il documento in blocchi uguali. Con un file di 30 pagine e N = 10 ottieni le pagine 1-10, 11-20 e 21-30. Se il numero di pagine non si divide in parti uguali, l'ultimo file è più corto.

Quando i risultati sono più di uno puoi scaricare le parti una per una oppure tutte insieme in un archivio .zip, creato anche quello nel tuo browser.

## Privacy

La divisione avviene interamente sul tuo dispositivo. La pagina usa pdf-lib, una libreria PDF open source, per copiare le pagine che hai scelto in nuovi documenti. Non viene caricato niente, quindi è una scelta sensata per buste paga, contratti e altri documenti che preferiresti non affidare a un sito web.

## Limiti da conoscere

- I PDF protetti da password o cifrati non si possono dividere; lo strumento ti avvisa quando è così.
- Ogni parte conserva i font e le immagini usati dalle sue pagine, quindi le parti non sono sempre molto più leggere dell'originale. Per ridurle, passale da [Comprimere PDF](/it/comprimere-pdf/).
- I segnalibri e le funzioni dei moduli che riguardano l'intero documento non vengono copiati nelle parti.
- Per riordinare, ruotare o eliminare le pagine guardandole invece che per numero, usa [Organizzare PDF](/it/organizzare-pdf/).
