---
title: "Rimuovere la posizione dalle foto prima di condividerle | Eolietech"
description: "Controlla se una foto rivela dove è stata scattata, poi togli la posizione GPS e tieni data e fotocamera. JPG, PNG e WebP, puliti nel browser."
h1: "Rimuovere la posizione dalle foto"
intro: "Quasi tutte le foto fatte col telefono registrano il punto esatto in cui sono state scattate. Controllale qui e togli la posizione prima di inviarle o pubblicarle. Data, fotocamera e immagine restano come sono, e non viene caricato niente."
howTo:
  - "Scegli le foto che vuoi condividere, oppure trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "Guarda la riga Posizione sotto ogni foto. Se mostra delle coordinate, chiunque riceva il file può trovare quel punto su una mappa."
  - "Solo la posizione è già selezionato. Premi Rimuovi per togliere le coordinate GPS."
  - "Scarica le foto una per una oppure usa Scarica tutto per avere un .zip, poi condividi queste copie."
faq:
  - q: "Quanto è precisa la posizione in una foto?"
    a: "Di solito pochi metri, abbastanza per indicare una sola casa in una via. L'elenco la arrotonda a due decimali, circa un chilometro, così vedi più o meno dov'è senza che la pagina mostri il punto esatto."
  - q: "Le foto restano ordinate per data?"
    a: "Sì. Solo la posizione toglie le coordinate GPS e tiene tutto il resto: data e ora, fotocamera e rotazione, così l'app delle foto continua a metterle in ordine e a mostrarle dritte."
  - q: "La posizione può nascondersi anche altrove nel file?"
    a: "Può succedere. Le app di fotoritocco a volte copiano le coordinate nei dati XMP, e questa pagina toglie anche quelle. Un nome di luogo scritto in una didascalia o nelle parole chiave invece è testo normale, quindi resta. Per togliere anche quello, scegli Tutto, che rimuove tutti i metadati."
  - q: "Le mie foto vengono caricate?"
    a: "No. Le foto vengono lette e riscritte dentro questa scheda del browser, e i dati dell'immagine vengono copiati byte per byte, quindi la foto resta intatta e non passa niente dalla rete."
ui:
  exif.drop.hint: "Foto JPG, PNG o WebP. Controllate e pulite sul tuo dispositivo; non viene caricato niente."
---

## Perché una foto sa dove eri

Quando la localizzazione è attiva, il telefono scrive le coordinate GPS in ogni foto che scatta. Non fanno parte dell'immagine, quindi non le vedi mai, ma viaggiano con il file. Se mandi l'originale per email, con un link del cloud o come documento in una chat, oppure lo carichi su un sito di annunci o su un forum, chi lo riceve può aprirlo su una mappa.

Per un panorama dalla montagna non è un problema. Per una foto della porta di casa, della cameretta di tuo figlio o del divano che stai vendendo sì, perché insieme alla foto regala il tuo indirizzo.

## Cosa toglie questa pagina e cosa tiene

Toglie il blocco GPS dai dati EXIF della foto e le eventuali coordinate GPS nei dati XMP. Tutto il resto rimane: data e ora, fotocamera e impostazioni di scatto, indicazione di rotazione. L'immagine non viene aperta né salvata di nuovo; i dati compressi vengono copiati byte per byte, quindi la foto è identica e il file mantiene il suo peso.

Se preferisci togliere ogni dettaglio, compresi fotocamera, data e nome dell'app di fotoritocco, scegli Tutto qui sopra oppure usa lo strumento completo per [rimuovere i dati EXIF](/it/rimuovere-exif/).

## Spegnerla alla fonte

Puoi anche impedire alla fotocamera di salvare la posizione. Sull'iPhone vai in Impostazioni, Privacy e sicurezza, Localizzazione, Fotocamera, e scegli Mai. Su Android l'opzione di solito è nelle impostazioni dell'app Fotocamera, spesso con un nome come Tag posizione o Salva posizione. Le foto che hai già scattato mantengono la posizione, ed è a questo che serve questa pagina. Le foto dell'iPhone in formato HEIC si possono convertire con [da HEIC a JPG](/it/heic-in-jpg/), che non lascia alcun metadato.
