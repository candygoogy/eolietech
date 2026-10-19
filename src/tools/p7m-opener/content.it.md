---
title: "Aprire file P7M: estrai il documento e controlla la firma | Eolietech"
description: "Apri i file firmati .p7m nel browser: salva il PDF o l'XML che contengono, guarda chi li ha firmati e quando, e controlla la firma. Non viene caricato niente."
h1: "Aprire file P7M"
intro: "Un file .p7m è un documento chiuso dentro una firma digitale, e quasi nessun computer sa aprirlo da solo. Trascinalo qui: riavrai il PDF, l'XML o il file originale, vedrai chi l'ha firmato e quando, e saprai se è cambiato da allora. Tutto avviene nel tuo browser."
howTo:
  - "Scegli i file .p7m o trascinali nel riquadro qui sopra. Puoi aggiungerne fino a 20 alla volta, compresi .pdf.p7m, .xml.p7m e i file con doppia firma (.p7m.p7m)."
  - "Leggi chi ha firmato ciascun file: nome, codice fiscale, l'ente che ha rilasciato il certificato e la data della firma."
  - "Guarda la riga sotto ogni firmatario. In verde vuol dire che il documento non è cambiato dalla firma e che la firma corrisponde al certificato."
  - "Scarica il documento contenuto, oppure apri il PDF in una nuova scheda. Se hai più file, Scarica tutto ti dà un unico .zip."
faq:
  - q: "I miei file vengono caricati?"
    a: "No. Questa pagina apre la busta e controlla la firma dentro la scheda del browser, con le funzioni crittografiche del browser stesso. Non passa niente dalla rete, e puoi verificarlo negli strumenti per sviluppatori mentre la usi."
  - q: "Se la riga è verde, la firma ha valore legale?"
    a: "Non basta. Il verde dice che il documento è esattamente quello firmato e che la firma è stata fatta con la chiave del certificato contenuto nel file. Non dimostra che il certificato sia qualificato né che non fosse stato revocato al momento della firma: per questo serve un controllo online presso l'ente che l'ha rilasciato. Per una verifica con valore legale usa uno dei programmi di verifica indicati da AgID."
  - q: "Perché dice che il file contiene solo la firma?"
    a: "Alcune firme viaggiano separate dal documento che firmano. Un file .p7s, o un .p7m salvato in quel modo, contiene la firma e il certificato ma non il documento, quindi non c'è niente da estrarre: ti serve il file originale che lo accompagnava. Lo smime.p7s allegato a ogni messaggio PEC è proprio di questo tipo: è la firma del gestore sul messaggio, mentre i tuoi documenti sono gli altri allegati."
  - q: "Cos'è un file .p7m.p7m?"
    a: "Un documento firmato due volte: una persona l'ha firmato, poi una seconda ha firmato il file già firmato, e così la prima busta è finita dentro una seconda. Questa pagina apre tutte le buste, fino a cinque, ed elenca i firmatari di ciascuna partendo dalla più esterna."
  - q: "Il PDF che scarico è ancora firmato?"
    a: "No. La firma sta nella busta, non nel PDF, quindi il file che salvi è l'originale senza firma. Conserva il .p7m se un giorno dovessi dimostrare chi l'ha firmato."
ui:
  p7m.drop.hint: "Qualsiasi file .p7m. Resta sul tuo dispositivo."
  p7m.progress: "Avanzamento"
  p7m.list: "I tuoi file"
  p7m.note: "Questa pagina controlla la firma dal punto di vista matematico: il documento non è cambiato e la firma corrisponde al certificato contenuto nel file. Non conferma che il certificato sia qualificato né che non fosse stato revocato: per questo serve un controllo online presso l'ente che l'ha rilasciato. Per una verifica con valore legale usa uno dei"
  p7m.note.link: "programmi di verifica indicati da AgID"
  p7m.note.end: "."
  p7m.note.href: "https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica"
  p7m.type.pdf: "Documento PDF"
  p7m.type.xml: "File XML"
  p7m.type.image: "Immagine {format}"
  p7m.type.zip: "Archivio ZIP"
  p7m.type.unknown: "Tipo di file non riconosciuto"
  p7m.layer: "Busta {n} di {total}"
  p7m.layer.outer: "(la più esterna, firmata per ultima)"
  p7m.layer.inner: "(quella che contiene il documento)"
  p7m.layer.empty: "Nessuna firma in questa busta."
  p7m.signer.unnamed: "Firmatario senza nome nel file"
  p7m.signer.taxCode: "Codice fiscale: {code}"
  p7m.signer.id: "Identificativo: {id}"
  p7m.signer.organization: "Organizzazione: {name}"
  p7m.signer.issuer: "Certificato rilasciato da: {name}"
  p7m.signer.signedOn: "Firmato {date}"
  p7m.signer.validity: "Certificato valido {from} {until}"
  p7m.signer.notValidAtSigning: "Alla data della firma il certificato non era valido."
  p7m.signer.timestamp: "Con marca temporale (qui non verificata)"
  p7m.check.valid: "Firma integra: il documento non è cambiato da quando è stato firmato e la firma corrisponde al certificato."
  p7m.check.changed: "La firma non corrisponde: il documento è stato modificato dopo la firma."
  p7m.check.damaged: "La firma non corrisponde: è danneggiata o non è stata fatta con questo certificato."
  p7m.check.noCertificate: "Non verificata: il file non contiene il certificato di chi ha firmato, quindi manca il termine di confronto."
  p7m.check.noWebCrypto: "Non verificata: questo browser non sa fare il controllo. Una versione recente di Chrome, Firefox, Edge o Safari sì."
  p7m.check.unsupported: "Non verificata: la firma usa un metodo ({method}) che il browser non sa controllare."
  p7m.notPdf: "Questo file non contiene un PDF. Puoi comunque scaricare quello che c'è dentro così com'è."
  p7m.fattura: "È una fattura elettronica. Per leggerla come una pagina ordinata, trascina lo stesso file .p7m nel"
  p7m.fattura.link: "visualizzatore di fatture elettroniche"
  p7m.fattura.href: "/it/visualizzare-fattura-elettronica/"
  p7m.status.reading: "Apertura in corso ({size})…"
  p7m.error.not-p7m: "questo non è un file firmato .p7m. Se è già un PDF o un XML, puoi aprirlo direttamente."
  p7m.error.detached: "contiene solo la firma, non il documento. Il documento firmato è un file a parte, che dovrebbe esserti arrivato insieme a questo."
  p7m.error.malformed: "il file è danneggiato o incompleto, quindi il documento che contiene non si può leggere. Prova a scaricarlo di nuovo."
  p7m.error.too-deep: "ha più di cinque buste una dentro l'altra, e questa pagina non lo apre."
  p7m.downloadPdf: "Scarica il PDF"
  p7m.downloadPdfNamed: "Scarica il PDF {name}"
  p7m.downloadNamed: "Scarica {name}"
  p7m.open: "Apri"
  p7m.openNamed: "Apri {name} in una nuova scheda"
  p7m.removeFile: "Togli dall'elenco"
  p7m.removeNamed: "Togli {name} dall'elenco"
  p7m.zipName: "documenti-estratti-da-p7m.zip"
  p7m.summary.reading.one: "Apertura in corso: {done} su {total}."
  p7m.summary.reading.other: "Apertura in corso: {done} su {total}."
  p7m.summary.opened.one: "Documenti estratti: {count}."
  p7m.summary.opened.other: "Documenti estratti: {count}."
  p7m.summary.valid.one: "La firma è integra."
  p7m.summary.valid.other: "Tutte le {count} firme sono integre."
  p7m.summary.invalid.one: "{count} ha una firma che non corrisponde."
  p7m.summary.invalid.other: "{count} hanno firme che non corrispondono."
  p7m.summary.unchecked.one: "{count} non si è potuto verificare."
  p7m.summary.unchecked.other: "{count} non si sono potuti verificare."
  p7m.summary.failed.one: "{count} non si è potuto aprire."
  p7m.summary.failed.other: "{count} non si sono potuti aprire."
---

## Cos'è un file .p7m

Un .p7m è una busta. Dentro ci sono il documento originale, una o più firme digitali e il certificato di ogni persona che ha firmato. Il formato si chiama CAdES, uno standard europeo basato sul vecchio PKCS#7, da cui viene l'estensione. Il documento conserva il suo nome davanti: contratto.pdf.p7m contiene contratto.pdf, fattura.xml.p7m contiene fattura.xml.

Il computer vede un solo file sconosciuto e non ha un programma per aprirlo. Aperta la busta, il documento che trovi dentro è lo stesso file che aveva chi l'ha firmato, byte per byte.

## Perché in Italia arrivano così spesso

Per la legge italiana la firma digitale ha lo stesso valore di quella scritta a mano, e molti dei programmi forniti con i kit di firma salvano una busta CAdES, a meno che tu non chieda un PDF firmato. Per questo contratti firmati, pratiche inviate agli enti pubblici e documenti mandati da commercialisti e notai arrivano spesso come .p7m, di solito allegati a una PEC.

L'altra grande fonte sono le fatture elettroniche. Quelle verso la pubblica amministrazione devono essere firmate, e la busta CAdES è uno dei due modi ammessi, quindi molte viaggiano come .xml.p7m. Anche le fatture tra aziende possono essere firmate allo stesso modo. Quando dentro c'è una fattura elettronica, questa pagina te lo dice, e il [visualizzatore di fatture elettroniche](/it/visualizzare-fattura-elettronica/) la mostra come una pagina leggibile.

## Doppia firma: .p7m.p7m

Quando una seconda persona firma un file già firmato, molti programmi chiudono tutta la busta dentro una nuova. Il risultato finisce in .p7m.p7m e contiene due buste, una dentro l'altra. Questa pagina le apre tutte, fino a cinque, ed elenca i firmatari di ciascuna partendo da quella più esterna, cioè la firma aggiunta per ultima. Una stessa busta può contenere anche più firme affiancate: le vedi tutte.

## Cosa controlla la verifica, e cosa no

Per ogni firma la pagina controlla due cose. La prima: che l'impronta del documento sia uguale a quella sigillata da chi ha firmato, il che dimostra che da allora non è cambiato nemmeno un byte. La seconda: che la firma sia stata fatta con la chiave privata del certificato contenuto nel file. Se valgono entrambe, la riga diventa verde.

Quello che dal browser non si può vedere: se il certificato viene da un prestatore qualificato presente negli elenchi di fiducia europei, e se era stato revocato prima della firma, per esempio perché la smart card era stata smarrita. Per entrambe le cose serve un controllo online presso l'ente che l'ha rilasciato. Anche l'eventuale marca temporale viene segnalata ma non verificata. Per una verifica con valore legale usa uno dei [programmi di verifica indicati da AgID](https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica).

## Privato per come è fatto

I file vengono letti dal tuo disco e aperti in questa scheda del browser, e la firma viene controllata con la crittografia già presente nel browser. Non viene inviato niente, ed è importante, perché contratti e fatture sono pieni di nomi e codici fiscali. Se il documento estratto è un PDF da sistemare, [Unire PDF](/it/unire-pdf/) e [Comprimere PDF](/it/comprimere-pdf/) funzionano allo stesso modo.
