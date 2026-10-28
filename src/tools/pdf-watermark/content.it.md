---
title: "Filigrana PDF: aggiungi una scritta o un logo, gratis dal browser | Eolietech"
description: "Metti RISERVATO, BOZZA, un nome o il tuo logo su tutte le pagine di un PDF, o solo su alcune. Scegli dimensione, colore, inclinazione e opacità. È gratis e il PDF non viene caricato."
h1: "Filigrana su PDF"
intro: "Segna un PDF come bozza o come riservato, scrivi su una copia a chi è destinata o mettici il tuo logo. Scrivi il testo o scegli l'immagine, guarda l'anteprima mentre la sistemi e salva una copia con la filigrana. Il PDF resta sul tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Può pesare fino a 200 MB."
  - "Scrivi il testo della filigrana, per esempio BOZZA o Copia per Mario Rossi. Per un logo scegli Immagine e seleziona un file PNG o JPG."
  - "Imposta dimensione, colore, inclinazione, disposizione e opacità, poi scegli Tutte le pagine o Solo alcune pagine. L'anteprima mostra la prima pagina che riceve la filigrana e si aggiorna a ogni modifica."
  - "Premi Aggiungi la filigrana, scarica la copia e aprila per controllarla prima di inviarla."
faq:
  - q: "Il PDF viene caricato su un server?"
    a: "No. La filigrana viene aggiunta dentro il tuo browser da pdf-lib, una libreria PDF open source, e l'anteprima viene disegnata da PDF.js, il motore PDF di Firefox. Non viene inviato niente a un server. Il file originale resta com'era e la copia viene salvata con un nome che finisce in -filigrana.pdf."
  - q: "Qualcuno può togliere la filigrana?"
    a: "Sì, se ha un programma per modificare i PDF e vuole farlo. La filigrana viene disegnata sopra la pagina come un elemento a parte, di testo o di immagine, quindi un editor PDF può selezionarla e cancellarla, e il testo che c'è sotto resta nel file. Scoraggia chi copia senza pensarci e mostra a chi era destinata una copia. Non impedisce di aprire, stampare o modificare il file. Per decidere chi può aprirlo usa Proteggere PDF con password su questo sito. Per togliere del testo dal documento in modo definitivo usa Oscurare PDF."
  - q: "Perché alcuni caratteri non vengono accettati?"
    a: "La filigrana è scritta in Helvetica, uno dei font standard che ogni lettore PDF ha già. Questi font coprono le lettere dell'italiano, del francese, dello spagnolo, del tedesco, del portoghese e delle altre lingue dell'Europa occidentale, più simboli come € e le virgolette curve. Lettere come ł, č o ğ, l'alfabeto greco e quello cirillico, il cinese e le emoji non si possono scrivere. Lo strumento elenca sotto il campo i caratteri che non può usare, così puoi toglierli o sostituirli con una lettera semplice."
  - q: "Perché la diagonale è più inclinata su alcune pagine?"
    a: "Diagonale va dall'angolo in basso a sinistra all'angolo in alto a destra di ogni pagina, quindi l'inclinazione segue la forma del foglio: circa 55 gradi su un A4 verticale e circa 35 gradi su un A4 orizzontale. Con Adatta alla pagina anche la dimensione viene calcolata pagina per pagina. Per avere la stessa inclinazione dappertutto scegli A scelta e scrivi i gradi."
  - q: "Funziona sulle pagine ruotate o ritagliate?"
    a: "Sì. La filigrana viene messa sulla pagina così come la mostra un lettore PDF, dopo la rotazione e dentro l'area visibile, quindi si legge nel verso giusto e resta al centro anche su scansioni in orizzontale, pagine ruotate e pagine ritagliate. Anche il logo resta dritto."
  - q: "Il PDF ha una firma digitale. Posso aggiungere la filigrana?"
    a: "Puoi, ma salvando il file lo modifichi, quindi la firma digitale che c'era non risulterà più valida alla verifica. Se il documento deve ancora essere firmato, metti prima la filigrana e firma dopo."
  - q: "Posso mettere la filigrana su un PDF protetto da password?"
    a: "No, e lo stesso vale per un PDF che si apre senza password ma blocca la stampa o le modifiche. Sbloccare PDF su questo sito toglie una password che conosci, e toglie quei blocchi anche senza password. Poi aggiungi la filigrana alla copia sbloccata."
ui:
  watermark.drop.replace: "Scegli un altro PDF"
  watermark.reading: "Apro {name}…"
  watermark.fileInfo.one: "{name}: {pages} pagina, {size}"
  watermark.fileInfo.other: "{name}: {pages} pagine, {size}"
  watermark.opened.one: "{name} è aperto. Ha {pages} pagina."
  watermark.opened.other: "{name} è aperto. Ha {pages} pagine."
  watermark.kind.legend: "Filigrana"
  watermark.kind.text: "Testo"
  watermark.kind.image: "Immagine"
  watermark.text.label: "Testo"
  watermark.text.default: "RISERVATO"
  watermark.text.note: "Per esempio RISERVATO, BOZZA o Copia per Mario Rossi."
  watermark.size.label: "Dimensione in punti"
  watermark.size.fit: "Adatta alla pagina"
  watermark.bold: "Grassetto"
  watermark.color.legend: "Colore"
  watermark.color.grey: "Grigio"
  watermark.color.red: "Rosso"
  watermark.color.blue: "Blu"
  watermark.color.black: "Nero"
  watermark.color.custom: "Altro colore"
  watermark.angle.legend: "Inclinazione"
  watermark.angle.diagonal: "Diagonale"
  watermark.angle.horizontal: "Orizzontale"
  watermark.angle.custom: "A scelta"
  watermark.angle.degrees: "Gradi"
  watermark.layout.legend: "Disposizione"
  watermark.layout.single: "Al centro"
  watermark.layout.tile: "Ripetuta"
  watermark.image.choose: "Scegli un'immagine"
  watermark.image.another: "Scegli un'altra immagine"
  watermark.image.note: "PNG o JPG. Un logo su sfondo trasparente (PNG) rende meglio."
  watermark.image.chosen: "{name}, {width} × {height} px"
  watermark.image.scale: "Larghezza rispetto alla pagina"
  watermark.image.error.type: "{name} non è un'immagine PNG o JPG."
  watermark.image.error.decode: "Non riesco ad aprire {name} come immagine. Prova a salvarla di nuovo in PNG."
  watermark.image.error.none: "Scegli l'immagine da usare come filigrana."
  watermark.image.error.embed: "Non riesco ad aggiungere {name} al PDF. Prova a salvarla di nuovo in PNG o JPG."
  watermark.position.label: "Posizione"
  watermark.position.center: "Al centro"
  watermark.position.top-left: "In alto a sinistra"
  watermark.position.top-right: "In alto a destra"
  watermark.position.bottom-left: "In basso a sinistra"
  watermark.position.bottom-right: "In basso a destra"
  watermark.opacity: "Opacità"
  watermark.pages.legend: "Pagine"
  watermark.pages.all: "Tutte le pagine"
  watermark.pages.some: "Solo alcune pagine"
  watermark.pages.label: "Pagine"
  watermark.pages.placeholder: "1-3, 5, 8-"
  watermark.pages.hint: "Separa con le virgole. “8-” vuol dire dalla pagina 8 alla fine."
  watermark.pages.error.empty: "Scrivi le pagine che ti servono, per esempio 1-3, 5, 8-."
  watermark.pages.error.syntax: "“{part}” non è una pagina né un intervallo. Usa numeri come 5 o 1-3."
  watermark.pages.error.outOfRange.one: "“{part}” è fuori dal documento, che ha {pages} pagina."
  watermark.pages.error.outOfRange.other: "“{part}” è fuori dal documento, che ha {pages} pagine."
  watermark.pages.error.reversed: "“{part}” va all'indietro. Scrivi prima il numero di pagina più basso."
  watermark.error.noText: "Scrivi il testo della filigrana."
  watermark.error.chars.one: "Questo carattere non si può scrivere con i font standard dei PDF: {chars}. Toglilo o sostituiscilo."
  watermark.error.chars.other: "Questi caratteri non si possono scrivere con i font standard dei PDF: {chars}. Toglili o sostituiscili."
  watermark.preview.caption: "Anteprima della pagina {page} di {total}"
  watermark.preview.error: "Non riesco a disegnare la pagina {page} per l'anteprima. La filigrana verrà aggiunta lo stesso."
  watermark.save: "Aggiungi la filigrana"
  watermark.saving: "Aggiungo la filigrana…"
  watermark.done.one: "Fatto: filigrana su {pages} pagina, {size}."
  watermark.done.other: "Fatto: filigrana su {pages} pagine, {size}."
  watermark.download: "Scarica {name}"
  watermark.outputName: "{name}-filigrana.pdf"
  watermark.after: "Apri il file e controllalo prima di inviarlo. Per cambiare qualcosa, modifica le impostazioni qui sopra e aggiungi di nuovo la filigrana."
---

## A cosa serve

- **BOZZA su una bozza.** Un contratto, un capitolo della tesi o una relazione che gira per le correzioni rischia meno di essere scambiato per la versione definitiva, o di essere stampato e inoltrato come se lo fosse. Rosso, grassetto e diagonale con un'opacità tra il 20 e il 30% lasciano leggibile il testo sotto.
- **RISERVATO sui documenti interni.** Relazioni, budget e pratiche del personale che girano tra pochi colleghi. La scritta su ogni pagina ricorda a chi apre il file, anche a chi lo riceve più tardi per sbaglio, che non doveva circolare.
- **Un nome sulla copia per una persona.** Molti scrivono sulla fotocopia della carta d'identità a chi la stanno dando e per cosa, per esempio Copia per Agenzia Rossi, solo per contratto di affitto. Lo stesso si può fare con passaporto, patente o busta paga quando li mandi a un padrone di casa, a un'agenzia o a un nuovo datore di lavoro. Se la copia salta fuori da un'altra parte, la scritta dice da dove viene, ed è più difficile usarla per altro. Scegli Ripetuta, così il testo passa anche sopra la foto e sul numero del documento; una riga sola in un angolo si taglia via più facilmente.
- **Il logo su preventivi e portfolio.** Metti il logo in un angolo di ogni pagina di un preventivo, di un listino o di una serie di tavole, oppure grande e leggero su un portfolio da mandare a un possibile cliente.

Se la copia del documento è una foto, trasformala prima in PDF con [Da JPG a PDF](/it/jpg-in-pdf/).

## Cosa la filigrana non fa

La filigrana viene aggiunta sopra le pagine che ci sono già. Non cifra niente, e testo e immagini che stanno sotto restano nel file come prima. Chi ha un editor PDF può selezionarla e cancellarla, e chiunque può copiare il testo che c'è sotto. Basta per scoraggiare le copie fatte con leggerezza e per segnare bozze e destinatari, mentre chi vuole toglierla a tutti i costi ci riesce.

Per altri scopi servono altri strumenti:

- Per decidere chi può aprire il file, mettigli una password con [Proteggere PDF con password](/it/proteggere-pdf/). Metti prima la filigrana, perché gli strumenti di questo sito non aprono i file protetti da password.
- Per nascondere un nome, un IBAN o un paragrafo in modo che sparisca dal file, usa [Oscurare PDF](/it/oscurare-pdf/). Il testo sotto una filigrana resta leggibile e si può copiare.

## Filigrana di testo

Il testo sta su una riga sola, fino a 200 caratteri. Gli a capo e gli spazi ripetuti diventano un solo spazio.

- **Dimensione.** Con **Adatta alla pagina** spuntato, il testo diventa grande quanto ci sta su ogni pagina con l'inclinazione scelta, con un margine intorno. Togli la spunta per indicare la dimensione in punti, da 4 a 400. Grassetto è spuntato all'inizio, perché con poca opacità le lettere più spesse si vedono meglio.
- **Colore.** Grigio, rosso, blu o nero, oppure qualsiasi tinta da Altro colore.
- **Inclinazione.** Diagonale segue la diagonale di ogni pagina, Orizzontale va dritta da sinistra a destra, A scelta accetta un angolo qualsiasi da -180 a 180 gradi. Con gli angoli positivi il testo sale da sinistra verso destra.
- **Disposizione.** Al centro mette una sola scritta in mezzo alla pagina. Ripetuta copre tutta la pagina con file di scritte sfalsate come i mattoni di un muro, alla dimensione in punti che hai scelto; qui Adatta alla pagina non c'è. Con un testo molto piccolo le scritte vengono distanziate di più, così la pagina non si riempie di migliaia di copie minuscole.

## Filigrana con il logo

Scegli Immagine e seleziona un PNG o un JPG fino a 20 MB. Rende meglio un PNG con lo sfondo trasparente, perché intorno al logo si vede la pagina; un JPG si porta sempre dietro un rettangolo del suo colore di sfondo. Il logo mantiene le proporzioni. **Larghezza rispetto alla pagina** va dal 5 al 100% della larghezza della pagina, e il logo viene rimpicciolito se altrimenti non ci starebbe. **Posizione** lo mette al centro o in uno dei quattro angoli, a una piccola distanza dai bordi. Il logo viene sempre disegnato dritto, e una foto del telefono salvata di lato viene girata come la mostra il browser.

L'opacità va dal 5 al 100%, per il testo come per il logo. Intorno al 30%, il valore di partenza, il contenuto sotto si legge senza fatica. Un logo nell'angolo di un preventivo può arrivare al 100%, ma allora copre quello che è stampato in quell'angolo, quindi controlla l'anteprima.

## Scegliere le pagine

La filigrana va su tutte le pagine, a meno che tu non scelga Solo alcune pagine. In quel caso scrivi pagine e intervalli separati da virgole: 1-3, 5, 8- vuol dire dalla pagina 1 alla 3, la pagina 5 e dalla pagina 8 alla fine. L'anteprima passa alla prima pagina dell'elenco. Ogni pagina viene misurata per conto suo, quindi in un file che mescola pagine verticali e orizzontali, o formati diversi, ognuna ha la filigrana centrata sulla propria area visibile.

## Cosa cambia nel file

Viene aggiunta solo la filigrana. Testo, immagini, link, segnalibri, campi dei moduli e proprietà del documento restano come prima, e il testo che c'era si può ancora selezionare e cercare. Una filigrana di testo è testo vero in Helvetica, quindi resta nitida in stampa, e può comparire anche quando qualcuno cerca nel file o copia il testo della pagina. Il font non viene incorporato nel file, quindi le lettere possono cambiare leggermente da un lettore PDF all'altro. Un logo viene salvato una volta sola e riusato su ogni pagina, quindi il file cresce più o meno quanto pesa l'immagine; una filigrana di testo aggiunge pochissimo.

I campi dei moduli e i commenti vengono disegnati dal lettore PDF sopra la pagina, quindi dove si sovrappongono alla filigrana possono coprirla.

Due cose possono smettere di funzionare: una firma digitale già presente, che dopo la modifica non risulta più valida, e la conformità PDF/A, perché il PDF/A richiede che tutti i font siano incorporati e alcune sue versioni non ammettono la trasparenza. Se un archivio o un ufficio ti chiede un PDF/A, controlla la copia con la filigrana prima di inviarla.

Le impostazioni restano quando scegli un altro PDF, quindi puoi mettere la stessa filigrana su più file, uno dopo l'altro.

## Strumenti collegati

- Per riunire più documenti in uno prima di mettere la filigrana, usa [Unire PDF](/it/unire-pdf/).
- Per numerare anche le pagine, usa [Numerare pagine PDF](/it/numerare-pagine-pdf/).
- Per aggiungere la tua firma, usa [Firmare PDF](/it/firmare-pdf/).
- I PDF protetti da password o con restrizioni non si aprono qui; [Sbloccare PDF](/it/sbloccare-pdf/) toglie una password che conosci, e le restrizioni anche senza password.
