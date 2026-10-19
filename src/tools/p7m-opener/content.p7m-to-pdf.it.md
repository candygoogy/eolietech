---
title: "Da P7M a PDF: estrai il PDF da un file firmato | Eolietech"
description: "Trasforma un .pdf.p7m nel PDF che puoi aprire, stampare e inoltrare. La firma viene controllata strada facendo e non esce niente dal tuo browser."
h1: "Da P7M a PDF"
intro: "Ti è arrivato un contratto.pdf.p7m che non si apre? Il PDF è lì dentro, intatto. Trascina qui il file per salvarlo come un normale PDF, e intanto guarda chi l'ha firmato. Non viene caricato niente."
howTo:
  - "Scegli i file .pdf.p7m o trascinali nel riquadro qui sopra. Puoi aggiungerne fino a 20 alla volta, anche quelli con doppia firma (.pdf.p7m.p7m)."
  - "Controlla chi ha firmato ciascun file e se la riga sotto il firmatario è verde: vuol dire che il PDF non è cambiato dalla firma."
  - "Premi Scarica il PDF per salvarlo, oppure Apri per guardarlo prima in una nuova scheda. Se hai più file, Scarica tutto ti dà un unico .zip."
faq:
  - q: "Il PDF viene convertito o ricostruito?"
    a: "No. Un .pdf.p7m contiene già il PDF esattamente com'era al momento della firma. Questa pagina lo tira fuori dalla busta senza cambiare un byte, quindi si vede e si stampa identico alla copia di chi l'ha firmato."
  - q: "Il PDF che scarico è ancora firmato?"
    a: "No. La firma sta nella busta .p7m, non nel PDF, quindi il file che salvi è l'originale senza firma. Conserva anche il .p7m se un giorno dovessi dimostrare chi l'ha firmato."
  - q: "Il mio file è un .xml.p7m. Posso averlo in PDF?"
    a: "Dentro la busta c'è un file XML, di solito una fattura elettronica, che non ha un'impaginazione da salvare in PDF. Trascina lo stesso file .p7m in Fattura elettronica in PDF, che impagina la fattura e la salva come PDF."
  - q: "I miei file vengono caricati?"
    a: "No. La busta viene aperta e la firma controllata dentro la scheda del browser. Non passa niente dalla rete."
ui:
  p7m.drop.hint: "Un .pdf.p7m o qualsiasi .p7m. Resta sul tuo dispositivo."
  p7m.fattura: "È una fattura elettronica: un file XML, senza un'impaginazione sua. Per averla in PDF, trascina lo stesso file .p7m in"
  p7m.fattura.link: "Fattura elettronica in PDF"
  p7m.fattura.href: "/it/fattura-elettronica-in-pdf/"
---

## Il PDF c'è già

Un file che si chiama contratto.pdf.p7m è contratto.pdf chiuso in una busta di firma digitale. Il formato, CAdES, mette insieme in un solo file il PDF originale, la firma e il certificato di chi ha firmato, e quasi nessun computer ha un programma per aprirlo. Aprendo la busta riavrai il PDF esattamente com'era quando è stato firmato. Non viene convertito niente, quindi testo, caratteri e pagine sono gli stessi.

## Il .p7m ti serve ancora?

Il PDF che salvi è l'originale, senza firma. Per leggerlo, stamparlo o inoltrarlo va benissimo. Se però potresti dover dimostrare chi l'ha firmato e che da allora non è cambiato, per esempio con un ufficio pubblico o in una contestazione, conserva anche il .p7m: la firma sta solo lì.

Se firmi tu dei documenti e chi li riceve fa fatica con i .p7m, quasi tutti i programmi di firma possono creare anche un PDF firmato (il formato PAdES). In quel caso la firma sta dentro il PDF e qualsiasi lettore PDF lo apre.

## Cosa vuol dire la riga verde

Per ogni firmatario c'è una riga con l'esito del controllo. Verde vuol dire che l'impronta del PDF è uguale a quella firmata e che la firma è stata fatta con la chiave del certificato contenuto nel file. Non conferma che il certificato fosse qualificato o non revocato: per questo serve un controllo online, e lo fanno i [programmi di verifica indicati da AgID](https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata/software-verifica). Per gli altri tipi di .p7m, come le fatture elettroniche, [Aprire file P7M](/it/aprire-file-p7m/) spiega cosa puoi trovarci dentro.
