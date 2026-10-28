---
title: "Numerare le pagine di un PDF dal browser | Eolietech"
description: "Aggiungi i numeri di pagina a un PDF, in alto o in basso, come 1, 1 / 12 o Pagina 1 di 12, saltando la copertina se serve. Il PDF non viene mai caricato."
h1: "Numerare pagine PDF"
intro: "Numera le pagine di un PDF per la tesi di laurea, una relazione o un atto da depositare. Scegli l'angolo, il formato (solo il numero o Pagina 1 di 12) e la pagina da cui partire, controlla l'anteprima e salva una copia numerata. Il file resta sul tuo dispositivo."
howTo:
  - "Scegli un PDF o trascinalo nel riquadro qui sopra. Può pesare fino a 200 MB."
  - "Fai clic su uno dei sei punti della piccola pagina per scegliere dove vanno i numeri, poi scegli formato e dimensione."
  - "Se il documento ha una copertina, metti 2 in Prima pagina da numerare. Cambia Inizia a contare da se la numerazione non deve partire da 1."
  - "Controlla l'anteprima della prima pagina numerata, premi Aggiungi i numeri di pagina e scarica la copia."
faq:
  - q: "Il PDF viene caricato su un server?"
    a: "No. I numeri vengono aggiunti dentro il tuo browser con la libreria open source pdf-lib. Il file viene letto dal tuo disco, la copia numerata viene salvata nella cartella Download e il file originale resta com'era."
  - q: "Come lascio la copertina senza numero?"
    a: "Metti 2 in Prima pagina da numerare. La copertina resta senza numero e la pagina dopo prende il numero di partenza, che è 1 se non lo cambi. Se la copertina deve comunque contare, così che il primo numero visibile sia 2, metti 2 anche in Inizia a contare da."
  - q: "Cosa conta il totale in 1 / 12 o Pagina 1 di 12?"
    a: "È l'ultimo numero stampato nel documento. Se salti la copertina in un file di 12 pagine, i numeri vanno da 1 / 11 a 11 / 11. L'elenco Formato mostra le diciture con le impostazioni che hai scelto, così vedi il totale prima di salvare."
  - q: "Posso usare i numeri romani, un altro carattere o un altro colore?"
    a: "No. I numeri sono sempre in cifre arabe, in Helvetica nera. Puoi scegliere la dimensione, da 6 a 72 punti, e la distanza dal bordo della pagina, da 0 a 50 mm."
  - q: "Moduli, link e segnalibri funzionano ancora dopo?"
    a: "Sì. Lo strumento aggiunge solo i numeri. Testo, immagini, link, segnalibri e campi dei moduli restano come prima, compreso quello che era già scritto nei campi. Diverso è il caso di una firma digitale già presente nel file: salvando il file lo modifichi, quindi quella firma non risulterà più valida alla verifica."
  - q: "Posso numerare un PDF protetto da password?"
    a: "No, e lo stesso vale per un PDF che si apre senza password ma blocca la stampa o le modifiche. Sbloccare PDF su questo sito toglie una password che conosci, e toglie quei blocchi anche senza password. Poi numera la copia sbloccata."
  - q: "I numeri finiscono nel posto giusto anche sulle pagine orizzontali o ruotate?"
    a: "Sì. Ogni numero viene messo sulla pagina come la vedi in un lettore PDF, dritto e dentro l'area visibile, anche sulle pagine ruotate o ritagliate. In un file con pagine di formati diversi, ogni pagina ha il numero alla stessa distanza dai propri bordi."
ui:
  numbers.drop.replace: "Scegli un altro PDF"
  numbers.reading: "Apro {name}…"
  numbers.fileInfo.one: "{name}: {pages} pagina, {size}"
  numbers.fileInfo.other: "{name}: {pages} pagine, {size}"
  numbers.opened.one: "{name} è aperto. Ha {pages} pagina."
  numbers.opened.other: "{name} è aperto. Ha {pages} pagine."
  numbers.position.legend: "Posizione"
  numbers.position.top-left: "In alto a sinistra"
  numbers.position.top-center: "In alto al centro"
  numbers.position.top-right: "In alto a destra"
  numbers.position.bottom-left: "In basso a sinistra"
  numbers.position.bottom-center: "In basso al centro"
  numbers.position.bottom-right: "In basso a destra"
  numbers.format.label: "Formato"
  numbers.words: "Pagina {n} di {total}"
  numbers.size.label: "Dimensione"
  numbers.size.preset: "{name} ({pt} pt)"
  numbers.size.small: "Piccola"
  numbers.size.medium: "Media"
  numbers.size.large: "Grande"
  numbers.size.custom: "Personalizzata"
  numbers.size.points: "Dimensione in punti"
  numbers.start.label: "Inizia a contare da"
  numbers.first.label: "Prima pagina da numerare"
  numbers.first.hint: "Le pagine prima di questa restano senza numero. Metti 2 per saltare la copertina."
  numbers.margin.label: "Margine (mm)"
  numbers.preview.caption: "A pagina {page} comparirà “{label}”"
  numbers.preview.error: "Non riesco a mostrare la pagina {page}. Puoi comunque aggiungere i numeri."
  numbers.action: "Aggiungi i numeri di pagina"
  numbers.working: "Aggiungo i numeri di pagina…"
  numbers.done.one: "Fatto: {count} pagina numerata, {size}."
  numbers.done.other: "Fatto: {count} pagine numerate, {size}."
  numbers.download: "Scarica {name}"
  numbers.outputName: "{name}-numerato.pdf"
  numbers.error.start: "Il numero di partenza deve essere un numero intero da 0 a {max}."
  numbers.error.first: "La prima pagina da numerare deve essere una pagina di questo PDF, da 1 a {pages}."
  numbers.error.size: "La dimensione deve essere da {min} a {max} punti."
  numbers.error.margin: "Il margine deve essere da 0 a {max} mm."
---

## Dove mettere i numeri

La piccola pagina nello strumento ha sei punti: in alto o in basso, a sinistra, al centro o a destra. In basso al centro è la scelta predefinita. Il margine è la distanza tra il bordo della pagina e il bordo più vicino del numero: 10 mm, se non lo cambi. Il numero finisce nello stesso punto su tutte le pagine.

I formati sono tre. Il semplice **1** è quello di libri, tesi e relazioni. **1 / 12** e **Pagina 1 di 12** mostrano anche il totale, così su una copia stampata ci si accorge subito se manca un foglio.

L'anteprima mostra la prima pagina numerata con il numero al suo posto, in proporzione alla pagina. Il numero viene scritto sopra quello che c'è già, quindi se il documento ha un piè di pagina o del testo vicino al bordo, controlla qualche altra pagina nella copia salvata. Di solito basta un margine più ampio, o il bordo opposto, per evitare che si sovrapponga.

## Tesi di laurea e documenti con copertina

Una tesi, una relazione o un manuale di solito si apre con un frontespizio senza numero. Metti 2 in **Prima pagina da numerare** e il frontespizio viene saltato. Se anche le pagine iniziali (dediche, indice, abstract) devono restare senza numero, indica la pagina in cui comincia il primo capitolo. Molti atenei e dipartimenti hanno regole proprie su dove parte la numerazione e se il frontespizio conta: se ci sono, seguile.

**Inizia a contare da** è il numero che compare sulla prima pagina numerata. Serve quando un capitolo è in un file a parte e deve continuare dal precedente, o quando la copertina deve contare senza mostrare il suo numero.

## Contratti e atti da depositare

Contratti, atti e relativi allegati spesso vengono numerati come Pagina 1 di 12, così chiunque li legga vede che la copia è completa. Tribunali e uffici che fissano regole per il deposito a volte indicano dove va il numero e come deve essere scritto: controlla quelle che valgono per te e imposta posizione, formato e dimensione di conseguenza.

Se il documento va poi firmato con firma digitale, aggiungi prima i numeri e firma dopo. Qui il file viene salvato di nuovo per intero, quindi una firma messa prima della numerazione non risulterebbe più valida alla verifica.

## Più file con un'unica numerazione

Lo strumento numera un PDF alla volta. Per dare una numerazione continua a più documenti, uniscili prima con [Unire PDF](/it/unire-pdf/), metti in ordine le pagine o togli quelle che non servono con [Organizzare PDF](/it/organizzare-pdf/), poi numera qui il file unito.

## Stampa fronte e retro

Il numero sta nello stesso punto su tutte le pagine. Stampando fronte e retro e rilegando, un numero nell'angolo a destra finisce verso la rilegatura una pagina sì e una no. Per la stampa fronte e retro, in alto o in basso al centro si legge allo stesso modo su entrambi i lati. Molte stampanti di casa e d'ufficio non stampano fino al bordo del foglio, quindi lascia almeno qualche millimetro di margine.

## Cosa cambia nel file

Vengono aggiunti solo i numeri. Sono testo vero in Helvetica, uno dei caratteri standard che ogni lettore PDF mette a disposizione, quindi restano nitidi in stampa a qualsiasi dimensione e si possono selezionare e cercare. Il carattere non viene incorporato nel file, quindi la forma delle cifre può cambiare leggermente da un lettore all'altro. Testo, immagini, link, segnalibri, campi dei moduli e numero di pagine restano gli stessi. Lo strumento scrive i numeri sulle pagine e non cambia la numerazione che il lettore PDF mostra nella sua barra.

Due cose possono smettere di funzionare: una firma digitale già presente, che dopo la modifica non risulta più valida, e la conformità PDF/A, perché il PDF/A richiede che tutti i caratteri siano incorporati nel file. Se un archivio o un ufficio ti chiede un PDF/A, controlla la copia numerata prima di inviarla.

Il PDF viene letto e salvato nel tuo browser e non viene mai caricato. I file molto grandi richiedono parecchia memoria, quindi sullo smartphone un PDF pesante può richiedere un po' di tempo.

## Strumenti collegati

- Per unire più file prima di numerarli, usa [Unire PDF](/it/unire-pdf/).
- Per riordinare, ruotare o togliere pagine prima, usa [Organizzare PDF](/it/organizzare-pdf/).
- Per firmare la copia numerata, usa [Firmare PDF](/it/firmare-pdf/).
- I PDF protetti da password non si aprono qui; se conosci la password, toglila prima con [Sbloccare PDF](/it/sbloccare-pdf/).
