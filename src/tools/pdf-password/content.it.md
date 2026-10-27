---
title: "Proteggere un PDF con password, nel browser | Eolietech"
description: "Metti una password a un PDF e cifralo con AES-256 senza caricarlo online. Il file e la password restano sul tuo dispositivo. Fino a 10 PDF alla volta."
h1: "Proteggere PDF con password"
intro: "Metti una password a un PDF, così solo chi la conosce può aprirlo. Il file viene cifrato con AES-256 dentro questa scheda del browser. Molti siti che proteggono i PDF ti chiedono di caricare il documento e di mandare loro la password; qui né l'uno né l'altra lasciano il tuo dispositivo."
howTo:
  - "Scegli fino a 10 PDF, oppure trascinali nel riquadro qui sopra. Ognuno può pesare fino a 200 MB."
  - "Scrivi una password, poi ripetila in Conferma la password. Tutti i file dell'elenco ricevono la stessa password."
  - "Premi Proteggi. La prima volta il browser scarica il motore PDF, una volta sola (circa 1,3 MB)."
  - "Scarica ogni copia protetta, oppure tutte insieme in un file .zip. Prima di inviarne una, aprila con la password per controllarla."
faq:
  - q: "Il mio PDF e la mia password vengono caricati online?"
    a: "No. La cifratura la fa qpdf, un programma PDF open source compilato in WebAssembly, che gira in questa scheda del browser. L'unico download è il motore stesso, da questo sito. La pagina non salva la password e non la invia da nessuna parte."
  - q: "Cosa succede se dimentico la password?"
    a: "La copia protetta non si può più aprire, né da te né da altri. AES-256 non ha scorciatoie e questo sito non vede mai la password, quindi nessuno può reimpostarla al posto tuo. Conserva l'originale non protetto in un posto sicuro, oppure salva la password in un gestore di password."
  - q: "Chi riceve il file riuscirà ad aprirlo?"
    a: "Quasi sicuramente, se usa un programma abbastanza aggiornato. AES-256 è supportato da Adobe Acrobat e Acrobat Reader, dai lettori PDF integrati in Chrome, Edge, Firefox e Safari, da Anteprima sul Mac e dalla maggior parte delle app PDF degli ultimi 15 anni circa. Un lettore molto vecchio potrebbe rifiutare la password o dire che il file è danneggiato; uno recente lo apre."
  - q: "Chi conosce la password può stampare o copiare il PDF?"
    a: "Sì. La password decide chi può aprire il file. Non mette limiti a stampa, copia del testo o modifiche, e una volta aperto il file si può salvare senza password, stampare o inoltrare come qualsiasi altro PDF. Dai la password solo a chi daresti il documento."
  - q: "Perché dice che il file ha già una password o delle restrizioni?"
    a: "Lo strumento cifra solo i PDF che non sono ancora cifrati e lascia gli altri come sono. Se un file chiede già una password, o blocca stampa e copia, togli prima la protezione con Sbloccare PDF su questo sito, poi proteggi qui la copia sbloccata."
  - q: "Posso dare una password diversa a ogni file?"
    a: "Non in un solo passaggio: tutti i file dell'elenco ricevono la password che hai scritto. Scarica le copie protette, premi Ricomincia, aggiungi gli altri file e scrivi la loro password. Se cambi la password prima di scaricare, i risultati vengono azzerati e devi premere di nuovo Proteggi."
  - q: "Perché la mia password è troppo lunga?"
    a: "In un PDF, AES-256 legge al massimo 127 byte della password. Le lettere senza accento e le cifre occupano un byte ciascuna; le lettere accentate, gran parte dei simboli e le emoji ne occupano da due a quattro. Il limite è quindi di 127 caratteri semplici, meno se ci sono accenti. Lo strumento rifiuta una password più lunga prima di cominciare, perché il file protetto potrebbe poi non aprirsi con quella che hai scritto."
ui:
  password.added.one: "Aggiunto {count} file."
  password.added.other: "Aggiunti {count} file."
  password.removed: "Rimosso: {name}."
  password.removeLabel: "Rimuovi {name}"
  password.downloadLabel: "Scarica {name}"
  password.show: "Mostra la password"
  password.engineNote: "Lo strumento usa qpdf, un motore PDF open source che il browser scarica una volta sola ({size}) quando avvii l'operazione. Poi gira sul tuo dispositivo."
  password.loadingEngine: "Download del motore PDF ({size}, solo la prima volta)…"
  password.done.one: "Finito. {count} file pronto."
  password.done.other: "Finito. {count} file pronti."
  password.error.engine: "Non è stato possibile caricare il motore PDF. Controlla la connessione e riprova."
  password.error.failed: "Qualcosa è andato storto con {name}. Il file potrebbe essere danneggiato."
  password.protect.label: "Password"
  password.protect.confirm: "Conferma la password"
  password.protect.note: "Tutti i file ricevono questa password. Conservala con cura: se la dimentichi, non si può recuperare."
  password.protect.action: "Proteggi"
  password.protect.listLabel: "File da proteggere"
  password.protect.fileStatus: "Protezione del file {current} di {total}: {name}"
  password.protect.working: "Protezione in corso…"
  password.protect.result: "Protetto con la tua password (AES-256)."
  password.protect.outputName: "{name}-protetto.pdf"
  password.protect.zipName: "pdf-protetti.zip"
  password.protect.error.empty: "Scrivi la password con cui proteggere i file."
  password.protect.error.mismatch: "Le due password non coincidono. Scrivi la stessa password in entrambi i campi."
  password.protect.error.tooLong: "Questa password è troppo lunga per un PDF. Usa al massimo 127 caratteri, meno se contiene lettere accentate o simboli."
  password.protect.error.encrypted: "{name} ha già una password o delle restrizioni. Prima sbloccalo, poi proteggilo di nuovo."
  password.unlock.label: "Password (se serve)"
  password.unlock.note: "Lasciala vuota se il file si apre senza password. Se più file ne chiedono una, deve essere questa per tutti."
  password.unlock.action: "Sblocca"
  password.unlock.listLabel: "File da sbloccare"
  password.unlock.fileStatus: "Sblocco del file {current} di {total}: {name}"
  password.unlock.working: "Sblocco in corso…"
  password.unlock.result.password: "Password rimossa."
  password.unlock.result.restrictions: "Restrizioni rimosse."
  password.unlock.notEncrypted: "{name} non ha password né restrizioni. Non c'è niente da sbloccare."
  password.unlock.outputName: "{name}-sbloccato.pdf"
  password.unlock.zipName: "pdf-sbloccati.zip"
  password.unlock.error.needsPassword: "{name} chiede una password per aprirsi. Scrivila nel campo Password e premi di nuovo Sblocca."
  password.unlock.error.wrongPassword: "La password non apre {name}. Controllala e premi di nuovo Sblocca."
---

## Cosa protegge la password

Un PDF può avere due password. La password di apertura, detta anche password utente, è quella che aggiunge questo strumento: senza, nessun lettore PDF riesce a mostrare il contenuto del file. Pagine, testo, immagini, dati dei moduli e proprietà del documento come titolo e autore vengono cifrati con AES-256, la cifratura più robusta prevista dal formato PDF.

L'altra è la password dei permessi, o password proprietario, che serve a impedire stampa, copia o modifica di un file che per il resto si apre liberamente. Questo strumento non imposta nessuno di questi limiti. Il file deve comunque contenere una password dei permessi, quindi lo strumento ne usa una casuale di 64 caratteri, che nessuno vede e che non servirà a nessuno. Le restrizioni funzionano solo se il lettore PDF sceglie di rispettarle, e molti programmi le ignorano: darebbero solo un'illusione di controllo.

Il nome del file non viene cifrato. Se si chiama per esempio cedolino-marzo-2026.pdf, chiunque veda l'allegato può leggerlo, quindi se il nome dice troppo rinomina il file prima di proteggerlo.

## Scegli una password che regga

Chi entra in possesso del file può provare password sul proprio computer tutte le volte che vuole. Non c'è il blocco dopo tre tentativi sbagliati come per un account online, quindi la protezione vale quanto la password. Una parola corta o una data di nascita si indovinano in fretta; una frase di quattro o cinque parole scollegate tra loro, oppure 12 o più caratteri misti, richiedono molto più tempo.

La password viene usata esattamente come la scrivi, spazi e maiuscole compresi. Spunta Mostra la password per controllarla prima di premere Proteggi.

Quando invii un PDF protetto, manda la password per un'altra strada: con un messaggio sul telefono, con una telefonata o a voce. Una password scritta nella stessa email dell'allegato non protegge niente da chi può leggere quell'email.

## Cosa resta uguale

qpdf non ridisegna le pagine. Testo, font, immagini, link, segnalibri, campi dei moduli e allegati vengono copiati così come sono e si aggiunge solo la cifratura: una volta aperto il file, tutto funziona come prima e il peso cambia di poco. Il file originale non viene toccato: lo strumento salva una nuova copia con il nome che finisce in -protetto.pdf.

Due cose da tenere a mente:

- **Proteggi per ultimo.** Gli altri strumenti PDF di questo sito non aprono un file che chiede una password. Comprimi, firma, oscura o unisci prima, poi metti la password al file finito.
- **Firme digitali.** Aggiungere la cifratura riscrive il file, quindi una firma digitale già presente nel PDF, come una firma PAdES o una firma con certificato aggiunta in Acrobat, non risulterà più valida. Conserva anche l'originale firmato.

## Come funziona

Lo strumento usa [qpdf](https://github.com/qpdf/qpdf) 12.2.0, una libreria open source che lavora sulla struttura dei file PDF, compilata in WebAssembly. Il browser la scarica da questo sito la prima volta che premi Proteggi (circa 1,3 MB) e la tiene nella cache. Per ogni file controlla che il PDF non sia già cifrato, ne scrive una copia cifrata e poi la apre con la tua password, per verificare che funzioni prima di proportela da scaricare.

Tutto avviene in questa scheda. I PDF e la password non vengono caricati da nessuna parte e la pagina non conserva la password. Puoi aggiungere fino a 10 file da 200 MB ciascuno. I file molto grandi richiedono parecchia memoria, quindi sullo smartphone può aiutare proteggerli uno alla volta.

## Strumenti collegati

- Per togliere la password da un PDF di cui la conosci, usa [Sbloccare PDF](/it/sbloccare-pdf/).
- Per eliminare davvero un nome o un IBAN prima di condividere un file, usa [Oscurare PDF](/it/oscurare-pdf/).
- Per rendere un PDF abbastanza leggero da allegarlo a un'email prima di proteggerlo, usa [Comprimere un PDF](/it/comprimere-pdf/).
