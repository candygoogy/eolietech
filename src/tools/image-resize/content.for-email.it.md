---
title: "Ridimensionare foto da allegare alle email | Eolietech"
description: "Riduci le foto del telefono a JPG da 1600 px, così ne mandi tante in una sola email. Fino a 50 alla volta, nel browser: le tue foto non vengono mai caricate."
h1: "Ridimensiona per email"
intro: "Le foto appena scattate con il telefono pesano spesso da 3 a 12 MB l'una, e ne bastano poche per superare il limite di un'email. Qui diventano JPG da 1600 px, ancora nitidi su qualsiasi schermo, senza caricarle da nessuna parte."
howTo:
  - "Scegli le foto da mandare, oppure trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "La misura è già impostata: ogni foto entra in 1600 × 1600 px, quindi il lato lungo diventa di 1600 px, che la foto sia verticale o orizzontale."
  - "Il formato è già JPG con qualità 85. Se il totale è ancora troppo per la tua email, abbassa la qualità a 75 o la misura a 1280 px."
  - "Controlla il peso totale nel riepilogo, poi scarica le foto una per una o usa Scarica tutto per avere un .zip da allegare."
faq:
  - q: "Quanto può pesare un allegato?"
    a: "Dipende dal servizio. Gmail accetta fino a 25 MB di allegati per messaggio, Outlook di solito 20 MB. In più, quando l'email parte gli allegati crescono di circa un terzo per la codifica, e il server di chi riceve può avere un limite più basso del tuo: meglio restare ben sotto la soglia."
  - q: "1600 px bastano?"
    a: "Per guardare le foto su uno schermo, sì. La finestra di un'email sul portatile è più stretta, e sul telefono la foto appare ancora più piccola. Bastano anche per una stampa classica 10 × 15 cm. Se a qualcuno serve la risoluzione piena per modificare o stampare in grande, condividi gli originali con un link al cloud."
  - q: "Perché proprio JPG?"
    a: "Qualsiasi app di posta, su telefono o computer, mostra i JPG direttamente nel messaggio. Una foto salvata in PNG pesa parecchie volte di più, e alcune app di posta non mostrano l'anteprima di WebP e AVIF. Se un'immagine ha lo sfondo trasparente, le parti trasparenti diventano bianche."
  - q: "Posso ridimensionare qui le foto HEIC dell'iPhone?"
    a: "Non direttamente: questa pagina legge JPG, PNG, WebP e AVIF. Prima converti i file HEIC con il convertitore da HEIC a JPG di questo sito, poi ridimensiona qui i JPG."
  - q: "Le mie foto vengono caricate?"
    a: "No. Il ridimensionamento e la codifica in JPG avvengono in questa scheda del browser, e le foto non lasciano mai il tuo dispositivo. Partono solo quando le alleghi tu all'email."
ui:
  img.drop.hint: "Foto JPG, PNG, WebP o AVIF. Ridimensionate sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "foto-per-email.zip"
---

## Perché le foto del telefono sono troppo pesanti per l'email

Un telefono recente salva le foto a 4000 pixel di larghezza o più, e ognuna di solito pesa tra 3 e 12 MB. Ne bastano tre o quattro tra le più pesanti per riempire un limite di 25 MB. Gmail, quando lo superi, passa a un link di Google Drive; con altri servizi il messaggio non parte o torna indietro.

In un'email la maggior parte di quei pixel non si vede mai. Il messaggio si legge in una finestra molto più stretta della foto, quindi il dettaglio in più occupa spazio e non aggiunge niente.

## Cosa succede alle tue foto

Ogni foto viene ridotta per entrare in 1600 × 1600 px, con le sue proporzioni, e salvata in JPG con qualità 85. A questa misura una foto pesa di solito qualche centinaio di kilobyte, quindi in un'email ne possono stare una ventina. L'elenco mostra il peso esatto di ogni foto e il totale, così puoi controllare prima di allegarle.

Le foto già più piccole di 1600 px restano della loro misura. La posizione e i dati della fotocamera (i dati EXIF) vengono tolti, così una foto scattata a casa non dice a chi la riceve dove abiti.

## Come funziona

Il tuo browser ridimensiona ogni foto con il filtro Lanczos3 e la salva con MozJPEG, in un worker in background dentro questa scheda. Niente passa dalla rete, quindi puoi usarlo anche per le foto che preferisci non affidare a un sito. Se ti serve un'altra misura, [Ridimensiona le immagini](/it/ridimensionare-immagini/) ha tutte le opzioni, e [Comprimere immagini](/it/comprimere-immagini/) alleggerisce i file senza cambiare la loro misura in pixel.
