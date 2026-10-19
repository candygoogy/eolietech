---
title: "Visualizzare la fattura elettronica XML o .p7m | Eolietech"
description: "Apri le fatture elettroniche XML, anche firmate .xml.p7m, e leggile come una pagina chiara, oppure salvale in PDF. Tutto nel browser: la fattura non viene caricata."
h1: "Visualizzare fatture elettroniche"
intro: "Il file .xml di una fattura elettronica non si legge a occhio. Trascinalo qui, anche se è firmato .p7m, e vedrai fornitore, righe, IVA e pagamento come su una fattura di carta. Se ti serve, scarica un PDF. Il file resta sul tuo dispositivo."
howTo:
  - "Scegli le fatture o trascinale nel riquadro qui sopra. Vanno bene i file .xml e .xml.p7m, fino a 50 alla volta."
  - "Per ogni fattura compare una riga con fornitore, numero, data e totale. Se il file è firmato, sotto trovi chi l'ha firmato e se la firma corrisponde."
  - "Premi Visualizza per leggerla per intero: le due parti, le righe, il riepilogo IVA, il pagamento e gli eventuali allegati."
  - "Premi Scarica PDF per salvarne una copia leggibile, oppure Scarica tutti i PDF per averle in un unico .zip."
faq:
  - q: "La fattura viene caricata su un server?"
    a: "No. Il file viene letto dal browser, dentro questa scheda, e anche il PDF nasce qui. Una fattura contiene codici fiscali, indirizzi e IBAN: non passano dalla rete, e puoi verificarlo negli strumenti per sviluppatori del browser mentre usi la pagina."
  - q: "Il PDF ha valore fiscale?"
    a: "No. È una copia leggibile, come la copia di cortesia che a volte manda il fornitore. La fattura valida resta il file XML passato dal Sistema di Interscambio, ed è quello da conservare. Il PDF lo ricorda in fondo a ogni pagina."
  - q: "Cosa vuol dire che la firma corrisponde?"
    a: "Che il contenuto del file .p7m è identico a quello firmato e che la firma torna con il certificato contenuto nel file. Questa pagina non controlla se il certificato era valido o chi l'ha rilasciato, perché per farlo servirebbe la rete. Tutti i dettagli li trovi in Aprire file P7M."
  - q: "In un file ci sono più fatture. Funziona lo stesso?"
    a: "Sì. Un file XML può contenere più fatture dello stesso fornitore allo stesso cliente, il cosiddetto lotto. Ognuna compare nella sua riga e ha il suo PDF."
  - q: "Legge anche le fatture semplificate e quelle verso la pubblica amministrazione?"
    a: "Sì: i formati FPR12 (tra privati), FPA12 (verso la PA) e FSM10 (fattura semplificata). Codici come TD01, N2.2 o MP05 diventano parole, secondo le specifiche tecniche 1.9 dell'Agenzia delle Entrate. Un codice che la pagina non conosce viene mostrato così com'è."
ui:
  fv.drop.hint: "File .xml o .xml.p7m. Letti sul tuo dispositivo; non viene caricato niente."
  fv.progress: "Avanzamento"
  fv.list: "Le tue fatture"
  fv.view: "Visualizza"
  fv.hide: "Chiudi"
  fv.viewNamed: "Visualizza la fattura di {name}"
  fv.hideNamed: "Chiudi la fattura di {name}"
  fv.downloadPdf: "Scarica PDF"
  fv.downloadPdfNamed: "Scarica {name}"
  fv.downloadAllPdf: "Scarica tutti i PDF (.zip)"
  fv.zipName: "fatture-pdf.zip"
  fv.removeFile: "Togli dall'elenco"
  fv.removeNamed: "Togli {name} dall'elenco"
  fv.fileOf: "{name}, fattura {n} di {count}"
  fv.attachmentNamed: "Scarica l'allegato {name}"
  fv.attachmentFallback: "allegato-{n}"
  fv.status.reading: "Lettura…"
  fv.status.zipping: "Preparo i PDF…"
  fv.sig.byOn: "Firmato da {name} il {date}."
  fv.sig.by: "Firmato da {name}."
  fv.sig.signed: "File firmato (.p7m)."
  fv.sig.more.one: "{name} e un'altra persona"
  fv.sig.more.other: "{name} e altre {count} persone"
  fv.sig.valid: "La firma corrisponde: il file non è cambiato dopo la firma."
  fv.sig.invalid: "La firma non corrisponde: il file potrebbe essere stato modificato dopo la firma."
  fv.sig.unsupported: "Questa firma non si può controllare qui."
  fv.sig.link: "Dettagli della firma"
  fv.sig.href: "/it/aprire-file-p7m/"
  fv.error.xml: "non è un file XML leggibile. Potrebbe essere incompleto o danneggiato: prova a scaricarlo di nuovo."
  fv.error.not-invoice: "è un file XML, ma non una fattura elettronica."
  fv.error.empty: "è una fattura elettronica senza nessun documento dentro."
  fv.error.detached: "contiene solo la firma, senza la fattura. Serve il file .xml.p7m completo."
  fv.error.p7m: "sembra un file firmato .p7m, ma non si riesce ad aprire. Potrebbe essere danneggiato."
  fv.error.generic: "non è stato possibile leggere questo file."
  fv.error.pdf: "Non è stato possibile creare il PDF di {name}."
  fv.error.attachment: "L'allegato {name} non si può estrarre: nel file XML i suoi dati sono danneggiati."
  fv.summary.reading.one: "Lettura in corso: {done} su {total}."
  fv.summary.reading.other: "Lettura in corso: {done} su {total}."
  fv.summary.read.one: "Fatture lette: {count}."
  fv.summary.read.other: "Fatture lette: {count}."
  fv.summary.failed.one: "File non letti: {count}."
  fv.summary.failed.other: "File non letti: {count}."
---

## Cos'è il file XML di una fattura elettronica

Dal 2019 quasi tutte le fatture emesse in Italia sono elettroniche. Non sono PDF: sono file XML nel formato FatturaPA, definito dall'Agenzia delle Entrate, che passano dal Sistema di Interscambio (SdI) prima di arrivare a chi le riceve. Dentro c'è tutto quello che sta su una fattura di carta, ma scritto per i programmi di contabilità: codici al posto delle parole, importi con il punto decimale, nessuna impaginazione. Aperto con il blocco note è un muro di tag.

Questa pagina rimette le cose in ordine: fornitore e cliente in alto, poi i dati del documento, le righe, il riepilogo IVA e il pagamento, con le date e gli importi scritti come li scriveresti tu.

## Perché .xml oppure .xml.p7m

Il nome del file segue quasi sempre lo stesso schema: il codice del paese e l'identificativo fiscale di chi trasmette, un trattino basso e un progressivo, come IT01234567890_00001.xml. Se finisce in .xml.p7m, il file è stato firmato digitalmente: la firma chiude l'XML in una busta, e per leggerlo bisogna prima aprirla. Le fatture verso la pubblica amministrazione devono essere firmate; tra privati la firma è facoltativa, ma molti programmi la aggiungono comunque.

Qui la busta si apre da sola, e sotto la fattura trovi una riga con chi ha firmato, quando e se la firma corrisponde al contenuto. Alcune fatture invece portano la firma dentro l'XML stesso (si chiama XAdES): si leggono normalmente, ma quella firma la pagina non la verifica.

## La copia di cortesia

Molti fornitori, oltre alla fattura elettronica, mandano per email un PDF: è la copia di cortesia. È comoda da leggere ma non ha valore fiscale, e non sempre arriva. Quando hai solo l'XML, scaricato dall'area Fatture e Corrispettivi del sito dell'Agenzia delle Entrate, ricevuto via PEC o girato dal commercialista, questa pagina fa lo stesso lavoro: ne ricava una versione leggibile da guardare a schermo o da salvare in PDF.

Conserva comunque il file XML. Per il fisco conta quello, non il PDF.

## Cosa trovi nella pagina e nel PDF

Fornitore e cliente con partita IVA, codice fiscale, indirizzo e regime fiscale; tipo di documento, numero, data e totale; la causale; le righe con quantità, prezzo, sconti e aliquota; il riepilogo IVA, con la natura delle operazioni senza imposta spiegata a parole; ritenuta d'acconto, bollo e cassa previdenziale; le condizioni di pagamento con IBAN e scadenze; i dati di trasmissione.

Gli allegati contenuti nell'XML, spesso un PDF preparato dal fornitore o un documento di trasporto, si scaricano con il loro nome e non vengono mai aperti da soli. Il PDF è un foglio A4 con le stesse informazioni: se le righe sono tante la tabella continua sulle pagine successive, e in fondo a ogni pagina una nota ricorda da quale file viene.

## Niente viene caricato

Una fattura racconta molto: chi compra cosa da chi, per quanto, su quale conto. Per questo tutto avviene in questa scheda del browser: il file viene letto dal tuo disco, la busta .p7m aperta e il PDF creato in memoria. Se ti serve solo il PDF, [Fattura elettronica in PDF](/it/fattura-elettronica-in-pdf/) mette in primo piano quel pulsante. Per estrarre il documento da un file firmato di qualsiasi tipo c'è [Aprire file P7M](/it/aprire-file-p7m/), e per mettere insieme più PDF in un unico file [Unire PDF](/it/unire-pdf/).
