---
title: "Unire PDF nel browser | Eolietech"
description: "Unisci più PDF in un unico file, nell'ordine che scegli tu. L'unione avviene nel browser, quindi i tuoi documenti non vengono mai caricati. Gratis, senza account."
h1: "Unire PDF"
intro: "Metti insieme più PDF in un unico documento. Aggiungi i file, mettili nell'ordine che preferisci e scarica un solo PDF unito. Il lavoro si svolge sul tuo dispositivo: non viene inviato niente a un server."
howTo:
  - "Scegli i file PDF o trascinali nel riquadro qui sopra. Puoi aggiungerne altri in qualsiasi momento."
  - "Metti in ordine i file: trascinali con il mouse, oppure usa i pulsanti Sposta su e Sposta giù. Rimuovi i file che hai aggiunto per sbaglio."
  - "Premi Unisci PDF. Le pagine vengono unite nell'ordine dell'elenco, e quelle di ogni file restano nel loro ordine originale."
  - "Scarica il PDF unito e controllalo con il lettore PDF che usi di solito."
faq:
  - q: "I miei file vengono caricati da qualche parte?"
    a: "No. L'unione avviene nel tuo browser con la libreria open source pdf-lib. I tuoi PDF vengono letti dal disco nella memoria della pagina e il risultato viene salvato di nuovo sul disco. Dopo la prima apertura della pagina puoi anche scollegarti da internet: lo strumento funziona lo stesso."
  - q: "Posso unire PDF protetti da password?"
    a: "No. I PDF cifrati non si possono unire qui. Apri il file in un lettore che conosce la password, salva una copia non protetta e aggiungi quella."
  - q: "Link, segnalibri e campi dei moduli restano?"
    a: "Il contenuto delle pagine, cioè testo, immagini e grafica vettoriale, viene copiato esattamente. Gli elementi che riguardano l'intero documento, come l'indice dei segnalibri, e i campi dei moduli distribuiti su più file potrebbero non essere riportati, quindi controlla il risultato se ti servono."
  - q: "C'è un limite al numero o alla dimensione dei file?"
    a: "Puoi aggiungere fino a 50 file da massimo 500 MB l'uno. In pratica il limite è la memoria del tuo dispositivo: gruppi molto grandi possono essere lenti su smartphone o computer meno recenti."
  - q: "L'unione riduce la qualità?"
    a: "No. Le pagine vengono copiate così come sono, senza ricomprimere le immagini né convertire il testo, quindi il file unito è identico agli originali."
ui:
  merge.drop: "Scegli i file PDF o trascinali qui"
  merge.listLabel: "File da unire, in ordine"
  merge.orderHint: "Le pagine vengono unite dall'alto verso il basso. Trascina i file per riordinarli, oppure usa i pulsanti Sposta."
  merge.action: "Unisci PDF"
  merge.added.one: "Aggiunto {count} file."
  merge.added.other: "Aggiunti {count} file."
  merge.reading: "Lettura…"
  merge.pages: "Pagine: {count}"
  merge.moveUp: "Sposta su"
  merge.moveDown: "Sposta giù"
  merge.moveUpLabel: "Sposta su {name}"
  merge.moveDownLabel: "Sposta giù {name}"
  merge.removeLabel: "Rimuovi {name}"
  merge.moved: "{name} ora è il numero {position} di {total}."
  merge.removed: "Rimosso: {name}."
  merge.working: "Unione di {count} file…"
  merge.done.one: "Fatto: un PDF di {pages} pagina ({size})."
  merge.done.other: "Fatto: un PDF di {pages} pagine ({size})."
  merge.download.one: "Scarica il PDF unito ({pages} pagina, {size})"
  merge.download.other: "Scarica il PDF unito ({pages} pagine, {size})"
  merge.outputName: "unito.pdf"
---

## Perché unire i PDF nel browser

La maggior parte dei servizi online per unire PDF carica i tuoi file sui propri server, li elabora lì e ti rimanda il risultato. Funziona, ma significa che una copia del tuo contratto, del tuo estratto conto o della tua lettera medica resta sul computer di qualcun altro, almeno per un po'. Questo strumento salta quel passaggio. La pagina carica una libreria PDF nel tuo browser e i file vengono uniti in memoria, sul tuo dispositivo.

## Cosa succede alle pagine

Ogni pagina viene copiata nel nuovo documento così com'è. Il testo resta selezionabile, i disegni vettoriali restano nitidi e le immagini non vengono ricompresse, quindi il file unito ha lo stesso aspetto degli originali. L'ordine è semplice: tutte le pagine del primo file dell'elenco, poi tutte quelle del secondo, e così via.

Se devi cambiare l'ordine delle pagine *dentro* un file, ruotare una pagina scansionata o toglierne una bianca, prima unisci e poi apri il risultato in [Organizzare PDF](/it/organizzare-pdf/).

## Cose da sapere

- **I file cifrati vengono saltati.** Un PDF che richiede una password, o che usa la cifratura per limitare le modifiche, non si può unire qui. Lo strumento ti dice quale file crea il problema.
- **Alcuni elementi potrebbero perdersi.** I segnalibri (l'indice nella barra laterale del lettore) e alcune funzioni interattive dei moduli appartengono al documento intero e non alle singole pagine, quindi potrebbero mancare nel file unito.
- **I lavori grandi richiedono memoria.** Tutti i file restano nella memoria del browser mentre lavori. Decine di scansioni pesanti possono essere lente su uno smartphone. Chiudere le altre schede aiuta.
- **Il peso si somma.** Il PDF unito pesa più o meno quanto la somma dei file di partenza. Se è troppo grande per mandarlo via email, prova [Comprimere PDF](/it/comprimere-pdf/) sul risultato.
