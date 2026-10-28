---
title: "Ridurre una foto a 50 KB | Eolietech"
description: "Comprimi la foto per una domanda online o la scansione di un documento sotto i 50 KB. JPG o WebP, fino a 50 alla volta, nel browser: non si carica niente."
h1: "Comprimi foto a 50 KB"
intro: "Diversi portali per iscrizioni e domande online fissano a 50 KB il peso della foto o della scansione del documento d'identità. Aggiungi qui i tuoi file: ognuno torna sotto i 50.000 byte con la qualità migliore possibile, compresso sul tuo dispositivo, quindi i documenti non vengono mai caricati."
howTo:
  - "Ritaglia la scansione lungo i bordi del documento, o la foto secondo l'inquadratura richiesta. Il tavolo o il muro intorno occupano solo spazio."
  - "Scegli i file o trascinali nel riquadro qui sopra. Fronte e retro della carta d'identità, o una serie di documenti, possono andare insieme, fino a 50 alla volta."
  - "Il peso è già impostato a 50 KB e il formato a JPG. Cambiali se il modulo chiede altro."
  - "Scarica i file uno per uno o in un .zip, poi aprili e ingrandisci le scritte piccole prima di caricarli sul portale."
faq:
  - q: "Quanti pixel ci stanno in 50 KB?"
    a: "Per una normale foto del telefono, più o meno tra 800 e 1.000 px sul lato lungo, abbastanza per occupare buona parte dello schermo di un portatile. Le foto con lo sfondo uniforme conservano più pixel di quelle piene di dettagli, quindi due foto dello stesso peso possono uscire di misure diverse. Ogni riga mostra la misura ottenuta."
  - q: "Le scritte di un documento restano leggibili?"
    a: "Su un documento formato tessera, come la carta d'identità, di solito sì, soprattutto se la scansione è ritagliata sul documento. Una pagina A4 piena di caratteri piccoli è più difficile, perché tutta la pagina deve stare negli stessi 50 KB di una sola foto. Ingrandisci il risultato prima di caricarlo e, se le scritte piccole sono sfocate, controlla se il modulo accetta un PDF o un file più pesante."
  - q: "Il computer dice che il file pesa 48,8 KB. C'è qualcosa che non va?"
    a: "No. Lo strumento conta 1 KB come 1.000 byte e tiene il file sotto i 50.000 byte. Windows conta 1 KB come 1.024 byte, quindi lo stesso file lì appare di circa 48,8 KB. In entrambi i casi è sotto il limite."
  - q: "Meglio JPG o WebP?"
    a: "JPG, a meno che il modulo non indichi chiaramente il WebP. A parità di peso un WebP di solito conserva un po' più di dettaglio, ma molti portali accettano solo JPG o JPEG, e alcuni anche PNG. Un PNG non riesce a contenere una foto in 50 KB senza perdere quasi tutti i pixel, per questo lo strumento salva solo in JPG o WebP."
  - q: "I miei documenti vengono caricati?"
    a: "No. Le scansioni vengono decodificate e compresse in questa scheda del browser, e i file che scarichi non contengono dati EXIF come la posizione o il dispositivo che ha scattato la foto."
ui:
  img.zipName: "immagini-50kb.zip"
---

## Cosa ci sta in 50 KB

50 KB è un limite che si incontra spesso per le foto e le scansioni da allegare alle domande online, anche su alcuni portali pubblici e universitari. Bastano per un ritratto riconoscibile o per un documento leggibile, purché l'immagine non sia molto più grande in pixel del necessario. Una foto appena scattata con il telefono pesa 3 MB o più, quindi per arrivarci deve perdere sia qualità sia pixel.

Lo strumento lascia la misura originale se il file ci sta con una qualità tra 40 e 92, e sceglie la qualità più alta che rientra nel limite. Se non è possibile, rimpicciolisce l'immagine fino alla misura più grande che ci sta a qualità 40. Ogni riga mostra il peso finale, la misura in pixel e la qualità, così vedi cosa è cambiato.

## Preparare una scansione

Per un limite di 50 KB le scansioni migliori sono piatte, illuminate in modo uniforme e ritagliate sul documento. Ombre, un tavolo colorato e una pagina storta costano byte senza aggiungere niente di utile a chi controlla la domanda. [Ritaglia immagini](/it/ritagliare-immagini/) taglia i bordi nel browser, e se il modulo vuole un PDF invece di un'immagine, [JPG in PDF](/it/jpg-in-pdf/) può trasformare i file compressi in un PDF. Prima di caricarlo, controlla quanto pesa.

## Come funziona

La compressione avviene in un worker in background dentro questa scheda, con MozJPEG per il JPG e libwebp per il WebP, quindi il tuo documento non passa mai dalla rete. Per firme e piccole foto tessera, [Comprimi una foto a 20 KB](/it/comprimere-foto-a-20kb/) parte dal limite più basso. Per qualsiasi altro peso, usa [Comprimi foto in KB](/it/comprimere-foto-in-kb/).
