---
title: "Estrarre testo da uno screenshot e copiarlo (OCR) | Eolietech"
description: "Copia il testo di uno screenshot: una chat, un'app, un video, una pagina web. L'OCR gira nel tuo browser, in italiano o in inglese, e lo screenshot non viene mai caricato."
h1: "Estrarre testo da uno screenshot"
intro: "Certi testi li vedi ma non li puoi selezionare: un messaggio dentro un'app, i sottotitoli di un video in pausa, una pagina che blocca la copia, una slide condivisa in videochiamata. Fai uno screenshot, aggiungilo qui e ottieni le parole come testo normale, da copiare, cercare o incollare dove ti serve. Lo screenshot viene letto sul tuo dispositivo e non viene mai caricato."
howTo:
  - "Fai lo screenshot, se puoi già ritagliato sul testo. Più sotto trovi i tasti per Windows, Mac, iPhone e Android."
  - "Scegli lo screenshot (PNG, JPG o WebP) o trascinalo nel riquadro qui sopra. Puoi aggiungerne fino a 20 alla volta, per esempio una chat lunga catturata in più pezzi."
  - "Scegli la lingua del testo e premi Leggi il testo. La prima volta il browser scarica da questo sito il motore di lettura e i dati della lingua: circa 5,5 MB per l'italiano."
  - "Premi Copia il testo, oppure salvalo come file .txt con lo stesso nome dello screenshot. Con più screenshot, Scarica tutto mette tutti i file di testo in un unico .zip."
faq:
  - q: "Posso incollare lo screenshot invece di salvarlo?"
    a: "Sì, dal computer. Copia lo screenshot, poi premi Ctrl+V (Cmd+V sul Mac) in qualsiasi punto di questa pagina, purché il cursore non sia in un campo di testo. Dal telefono, salva lo screenshot e sceglilo."
  - q: "I miei screenshot vengono caricati?"
    a: "No. Il browser apre lo screenshot e Tesseract, un motore open source di riconoscimento del testo, lo legge dentro questa scheda. Gli unici download sono il motore e i dati della lingua, entrambi da questo sito. Il testo esiste solo sul tuo dispositivo finché non lo copi o lo salvi."
  - q: "Perché ha sbagliato qualche lettera o numero?"
    a: "Gli screenshot sono tra le immagini più facili da leggere, perché sono nitidi, piatti e dritti. Gli errori arrivano quasi sempre da testo minuscolo, grigio chiaro, sopra una foto o con caratteri insoliti. La trappola più comune sono i caratteri che si somigliano: 0 e O, 1, l e I, rn e m. Per tutto quello che dovrai digitare o usare per pagare, come un codice, una password, un IBAN o un numero di spedizione, controlla ogni carattere sullo screenshot. Quando Tesseract non è sicuro di un file, lo strumento mostra una nota che ti invita a ricontrollarlo."
  - q: "Legge anche la foto di uno schermo, o la scrittura a mano?"
    a: "La foto di un monitor o di un telefono si legge molto peggio di un vero screenshot: l'angolazione, i riflessi e la trama sottile dei pixel dello schermo lo confondono. Quando puoi, fai lo screenshot direttamente sul dispositivo. La scrittura a mano quasi sempre non funziona, anche quella con la penna digitale, perché Tesseract è addestrato sul testo stampato."
  - q: "Quali lingue legge?"
    a: "Italiano e inglese, oppure tutte e due insieme per uno screenshot che le mescola. Altre lingue scritte con l'alfabeto latino possono uscire in parte, con le lettere accentate sbagliate. Le lingue con altri alfabeti non funzionano."
  - q: "E se lo screenshot è un file HEIC, o non si apre?"
    a: "Gli screenshot dell'iPhone vengono salvati in PNG e si aprono senza problemi. HEIC è il formato delle foto scattate con la fotocamera dell'iPhone, che questo strumento non sa aprire: convertile prima con da HEIC a JPG, che lavora anche lui sul tuo dispositivo. Se un file continua a non aprirsi, potrebbe essere danneggiato o in un formato che il browser non sa mostrare; aprirlo e farne un nuovo screenshot risolve."
ui:
  ocr.drop.label: "Scegli gli screenshot o trascinali qui"
  ocr.drop.hint: "PNG, JPG o WebP. Letti sul tuo dispositivo, mai caricati."
  ocr.zipName: "testo-dagli-screenshot.zip"
---

## Come fare lo screenshot

Meno cose ci sono intorno al testo, migliore è il risultato: se il dispositivo te lo permette, cattura solo la parte che ti serve.

- Windows: premi tasto Windows + Maiusc + S e trascina un riquadro intorno al testo. Il ritaglio viene copiato negli appunti; fai clic sulla notifica che compare per aprirlo nello Strumento di cattura e salvarlo. Tasto Windows + Stamp salva tutto lo schermo in Immagini > Screenshot.
- Mac: premi Cmd + Maiusc + 4 e trascina intorno al testo. Lo screenshot viene salvato sulla scrivania in PNG. Cmd + Maiusc + 3 cattura tutto lo schermo. Aggiungi Control a una delle due combinazioni per copiare lo screenshot negli appunti invece di salvarlo.
- iPhone: sui modelli con Face ID premi insieme il tasto laterale e il tasto volume su. Sui modelli con il tasto Home premi insieme il tasto Home e il tasto laterale (o quello in alto). Tocca la miniatura che compare per ritagliarlo prima che finisca in Foto.
- Android: sulla maggior parte dei telefoni premi insieme il tasto di accensione e il tasto volume giù. Lo screenshot finisce nella galleria, di solito in un album Screenshot.

## Per una lettura pulita

Ritaglia sul testo. Icone, foto profilo, menu e tastiera diventano caratteri a caso all'inizio e alla fine del risultato. Se lo screenshot l'hai già fatto, [Ritaglia un'immagine](/it/ritagliare-immagini/) lo sistema sul tuo dispositivo.

Ingrandisci prima di catturare. Lettere più grandi vogliono dire meno errori. Nel browser Ctrl e + (Cmd e + sul Mac) ingrandisce la pagina; sul telefono allarga con due dita. Gli screenshot con il lato lungo sotto i 2.000 pixel, cioè quasi tutti quelli ritagliati, vengono letti al doppio delle dimensioni, ma questo non aggiunge dettagli che la cattura non aveva.

La modalità scura di solito va bene: il testo chiaro su sfondo scuro in genere si legge, anche se quello scuro su sfondo chiaro si legge con più sicurezza. Se mancano delle parole, passa l'app alla modalità chiara e rifai lo screenshot. Testo grigio su sfondo grigio e sottotitoli sopra un fotogramma pieno di dettagli sono i casi più difficili.

Scegli la lingua in cui è scritto il testo: con l'italiano selezionato, parole come perché e città mantengono gli accenti. Scegli entrambe solo se lo screenshot mescola davvero le due lingue, perché è un po' più lento.

## Che aspetto ha il testo

Ottieni testo semplice, riga per riga nell'ordine di lettura, con una riga vuota tra un blocco e l'altro. Tutta la parte grafica sparisce. In una chat i fumetti non mostrano più chi ha scritto cosa, quindi un messaggio resta legato a una persona solo se nello screenshot compare il suo nome, come succede nei gruppi. Una tabella esce come righe di parole senza colonne, e a volte una colonna viene letta tutta dall'alto in basso prima della successiva. Il rientro del codice si perde, i link diventano testo normale, e le emoji e le icone vengono saltate o diventano caratteri strani.

Ogni screenshot ha il suo testo. Se hai catturato una conversazione lunga in più pezzi, aggiungili in ordine e poi copia un testo alla volta, oppure usa Scarica tutto e unisci i file .txt.

## Negli screenshot ci sono spesso cose private

Si fanno screenshot di chat, app della banca, conferme di prenotazione, indirizzi di consegna, codici di backup per la verifica in due passaggi e documenti di lavoro. Sono proprio le immagini da non affidare a un convertitore online. Qui non viene inviato niente a un server: lo screenshot si apre in questa scheda e il testo nasce lì. Puoi aggiungere fino a 20 file da 50 MB ciascuno, letti uno alla volta, e fermarti quando vuoi.

Per foto di documenti e pagine scansionate, [Estrarre testo da un'immagine](/it/estrarre-testo-da-immagine/) spiega nel dettaglio come funziona la lettura. Per rendere ricercabile un PDF scansionato usa [OCR PDF](/it/ocr-pdf/).
