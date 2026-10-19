---
title: "Fattura elettronica in PDF: da XML o .p7m a PDF | Eolietech"
description: "Trasforma la fattura elettronica XML, anche firmata .xml.p7m, in un PDF leggibile da stampare o archiviare. Funziona nel browser, senza caricare la fattura."
h1: "Fattura elettronica in PDF"
intro: "Hai il file .xml o .xml.p7m di una fattura e ti serve un PDF da stampare, inoltrare o mettere in una cartella? Trascinalo qui: il PDF si crea nel browser, con tutte le righe e il riepilogo IVA. La fattura non lascia il tuo dispositivo."
howTo:
  - "Scegli le fatture o trascinale nel riquadro qui sopra: file .xml o .xml.p7m, fino a 50 alla volta."
  - "Controlla nella riga fornitore, numero, data e totale. Se vuoi leggerla prima, premi Visualizza."
  - "Premi Scarica PDF. Con più fatture, Scarica tutti i PDF le raccoglie in un unico .zip."
faq:
  - q: "Il PDF sostituisce la fattura XML?"
    a: "No. Il PDF è una copia leggibile e lo dice in fondo a ogni pagina. Per il fisco vale il file XML passato dal Sistema di Interscambio, quindi conserva anche quello."
  - q: "Come si chiama il PDF?"
    a: "Come il file di partenza, con .pdf al posto di .xml o .xml.p7m. Se un file contiene più fatture, ognuna ha il suo PDF con un numero in fondo al nome."
  - q: "Gli allegati finiscono nel PDF?"
    a: "No, il PDF ne riporta solo i nomi. Per scaricarli premi Visualizza: nella sezione Allegati ognuno ha il suo pulsante."
  - q: "La fattura viene caricata?"
    a: "No. La lettura del file e la creazione del PDF avvengono in questa scheda del browser, e niente passa dalla rete."
---

## Da XML a PDF, senza programmi

Il file XML è la fattura vera, ma per stamparla, mandarla a chi non ha un gestionale o archiviarla insieme alle altre spese serve un PDF. Molti fornitori mandano già una copia di cortesia in PDF; quando manca, questa pagina la crea dal file XML, anche se è firmato .p7m.

## Com'è fatto il PDF

Un foglio A4 con fornitore e cliente in alto, i dati del documento, la causale, la tabella delle righe, il riepilogo IVA, ritenuta, bollo e cassa se ci sono, e il pagamento con IBAN e scadenze. Se le righe sono tante la tabella continua sulle pagine successive, con l'intestazione ripetuta. In fondo a ogni pagina trovi il numero di pagina e una nota: è una copia leggibile creata dal file XML, e la fattura con valore fiscale resta l'XML.

Il PDF usa un carattere standard che copre le lettere accentate e i simboli comuni, euro compreso. I caratteri di altri alfabeti, rari nelle fatture italiane, compaiono come punto interrogativo; sulla pagina invece si vedono sempre come sono scritti.

## Privato per come è fatto

Il file viene letto dal tuo disco, la busta .p7m aperta e il PDF creato in memoria, tutto in questa scheda. Per leggere la fattura a schermo usa [Visualizzare fatture elettroniche](/it/visualizzare-fattura-elettronica/); per unire i PDF di un mese in un unico file c'è [Unire PDF](/it/unire-pdf/).
