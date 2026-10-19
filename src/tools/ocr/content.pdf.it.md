---
title: "OCR PDF: rendi ricercabile un PDF scansionato, senza caricarlo | Eolietech"
description: "Trasforma un PDF scansionato in un PDF in cui puoi cercare e da cui puoi copiare. Tesseract legge ogni pagina nel tuo browser e aggiunge un livello di testo invisibile."
h1: "OCR PDF"
intro: "Un PDF scansionato contiene solo le foto delle pagine: non puoi cercarci dentro né copiarne una frase. Questo strumento legge ogni pagina e ti restituisce lo stesso PDF con uno strato di testo nascosto sotto la scansione, più il testo da solo. Il file non esce mai dal tuo dispositivo."
howTo:
  - "Scegli un PDF scansionato o trascinalo nel riquadro qui sopra."
  - "Scegli la lingua del documento. Le pagine con testo già selezionabile restano come sono, a meno che tu non spunti Leggi anche le pagine che hanno già del testo."
  - "Premi Leggi il testo e tieni aperta la scheda mentre scorre le pagine. Puoi fermarlo quando vuoi."
  - "Scarica il PDF ricercabile, che ha il nome del tuo file con -ocr alla fine, oppure solo il testo come file .txt."
faq:
  - q: "Il PDF cambia aspetto?"
    a: "No. Le pagine vengono copiate intatte: stessa scansione, stesse dimensioni, stesso ordine. Il testo riconosciuto da Tesseract viene aggiunto con caratteri invisibili, allineato alle parole della scansione, così selezionare, copiare e cercare funzionano in qualsiasi lettore PDF. Il peso del file cambia appena."
  - q: "Quanto ci mette?"
    a: "Ogni pagina viene disegnata a 300 dpi e letta da sola: su un computer recente servono pochi secondi a pagina, su un telefono o un portatile meno recente di più. Una scansione lunga può richiedere diversi minuti. Tieni aperta la scheda: l'avanzamento ti mostra a che pagina è arrivato e puoi fermarlo quando vuoi."
  - q: "Quanto è buono il testo?"
    a: "I documenti dattiloscritti e stampati, scansionati ben distesi, di solito escono con pochi errori. Fotocopie sbiadite, scansioni storte o a bassa risoluzione, scrittura a mano e caratteri decorativi vengono letti molto peggio. Quando un documento viene letto male, lo strumento te lo dice. La ricerca trova ciò che Tesseract ha letto bene, quindi controlla nomi, numeri e importi sulla scansione prima di fidarti."
  - q: "Il mio PDF viene caricato?"
    a: "No. PDF.js disegna ogni pagina dentro il browser, Tesseract la legge nella stessa scheda e pdf-lib scrive il nuovo file nella memoria della pagina. Il motore e i dati della lingua sono gli unici download e arrivano da questo sito."
  - q: "Nella copia ricercabile si perde qualcosa?"
    a: "Ogni pagina resta com'è. Non vengono riportati gli elementi che valgono per tutto il documento: segnalibri, campi compilabili dei moduli e file allegati. Se ti servono, tieni l'originale accanto alla copia ricercabile."
  - q: "Funziona con un PDF protetto da password?"
    a: "No. Aprilo con la sua password nel tuo lettore PDF, salva una copia senza password e usa quella."
---

## Una copia ricercabile della tua scansione

Quando scansioni un contratto, un estratto conto o una vecchia lettera, il PDF contiene l'immagine di ogni pagina e nient'altro. Tesseract legge l'immagine e annota ogni parola insieme alla sua posizione sulla pagina. Lo strumento copia poi le tue pagine originali in un nuovo PDF e ci appoggia sopra quel testo con caratteri invisibili, parola per parola, come fanno gli scanner con l'OCR integrato. La pagina resta identica, ma adesso puoi trovare un nome con Ctrl+F, selezionare un paragrafo e incollarlo in una mail, e la ricerca del tuo computer trova il file in base a quello che c'è scritto.

## Pagine che hanno già del testo

Molti PDF mescolano pagine scansionate e pagine create al computer. Le pagine che hanno già testo vero non vengono rilette: vengono copiate così come sono e il loro testo finisce nel .txt tale e quale. Se quel testo ti sembra sbagliato, o se il tuo scanner aggiunge un piccolo timbro stampato a ogni pagina, spunta Leggi anche le pagine che hanno già del testo e verranno lette tutte.

## Privato per come è fatto

Tutto succede in questa scheda e niente viene inviato altrove. Per estrarre il testo da foto e screenshot usa [Estrarre testo da immagine](/it/estrarre-testo-da-immagine/). Per alleggerire una scansione pesante usa [Comprimere PDF](/it/comprimere-pdf/).
