---
title: "Sbloccare PDF: togliere la password da un PDF | Eolietech"
description: "Togli la password da un PDF quando la conosci, o rimuovi le restrizioni su stampa e copia. Funziona nel browser: il file e la password non vengono caricati."
h1: "Sbloccare PDF"
intro: "Togli la password da un PDF di cui la conosci già, così il file si apre senza chiederla e funziona con gli altri strumenti PDF. Ai file che si aprono liberamente ma bloccano stampa, copia o modifiche vengono tolte le restrizioni, senza bisogno di password. Nessuna password viene indovinata o forzata, e il PDF e la password restano in questa scheda del browser."
howTo:
  - "Scegli fino a 10 PDF, oppure trascinali nel riquadro qui sopra. Ognuno può pesare fino a 200 MB."
  - "Se i file chiedono una password quando li apri, scrivila nel campo Password. Per i file che bloccano solo stampa o copia, lascialo vuoto."
  - "Premi Sblocca. La prima volta il browser scarica il motore PDF, una volta sola (circa 1,3 MB)."
  - "Scarica ogni copia sbloccata, oppure tutte insieme in un file .zip. Se un file risulta senza password, lo strumento te lo dice e non c'è niente da scaricare."
faq:
  - q: "Può togliere una password che non conosco o che ho dimenticato?"
    a: "No. Questo strumento non indovina e non forza mai le password. Un PDF con password di apertura è cifrato, e senza quella password non c'è niente di leggibile su cui lavorare. Se qualcuno ti ha mandato il file, chiedigli la password o una copia senza."
  - q: "Che differenza c'è tra password e restrizioni?"
    a: "La password di apertura cifra tutto il file, e nessun lettore può mostrarlo finché non la scrivi. Le restrizioni vengono da una seconda password, quella dei permessi: il file si apre per chiunque, ma il lettore viene invitato a bloccare stampa, copia del testo o modifiche. Le restrizioni si possono togliere senza conoscere questa seconda password, perché il file si apre già."
  - q: "I miei file hanno password diverse. Come faccio?"
    a: "Scrivi una delle password e premi Sblocca. I file che si aprono vengono sbloccati, per gli altri lo strumento ti segnala che serve un'altra password. Scrivi la password successiva e premi di nuovo Sblocca: vengono riprovati solo i file non riusciti, e quelli già pronti restano lì da scaricare."
  - q: "Posso togliere le restrizioni da qualsiasi PDF?"
    a: "Usalo sui tuoi documenti, o su quelli che hai il diritto di stampare e modificare, come un modulo che ti hanno chiesto di compilare. Spesso le restrizioni servono a tutelare il lavoro di qualcun altro, e toglierle dal file non cambia quello che puoi fare con il contenuto."
  - q: "Perché dice che non c'è niente da sbloccare?"
    a: "Il file non è cifrato affatto: non chiede una password e non ha restrizioni. Lo strumento lo lascia com'è e non propone nessun download. Se il tuo lettore continua a non farti modificare il file, il motivo è un altro: le pagine potrebbero essere scansioni, oppure il documento potrebbe avere una firma digitale che il lettore protegge."
  - q: "Il PDF sbloccato sarà diverso?"
    a: "No. Le pagine non vengono ridisegnate. Testo, immagini, link, segnalibri e campi dei moduli vengono copiati così come sono e viene tolta solo la cifratura, quindi il peso cambia di poco. Unica eccezione: una firma digitale presente nel file non risulterà più valida, perché il file è stato riscritto."
  - q: "Il mio PDF e la password vengono caricati online?"
    a: "No. qpdf, un programma PDF open source compilato in WebAssembly, toglie la cifratura dentro questa scheda del browser. I siti che sbloccano i PDF sui loro server hanno bisogno sia del file sia della password, cioè proprio la coppia che meno vorresti consegnare. Qui l'unico download è il motore, da questo sito."
---

## Due tipi di protezione

Un PDF si può bloccare in due modi, e questo strumento li gestisce entrambi.

- **Una password per aprirlo.** Il file è cifrato e il lettore chiede la password ogni volta. Scrivila nel campo Password e lo strumento crea una copia senza più cifratura. Accanto al file compare Password rimossa.
- **Restrizioni su stampa, copia o modifica.** Il file si apre senza password, ma il lettore disattiva Stampa, non ti fa selezionare il testo o non ti lascia compilare o cambiare un modulo. Qui non serve nessuna password: lascia vuoto il campo e lo strumento crea una copia senza restrizioni. Accanto al file compare Restrizioni rimosse.

Se un file ha entrambe le protezioni, scrivendo la password di apertura togli anche le restrizioni.

## Quando serve

- **Estratti conto e cedolini.** Banche, uffici paghe e fornitori di luce e gas spesso mandano PDF protetti da una password, per esempio la data di nascita o una parte del codice fiscale, da scrivere ogni volta che li apri. Una copia sbloccata si apre subito.
- **Altri strumenti PDF.** Gli altri strumenti PDF di questo sito, tra cui [Unire PDF](/it/unire-pdf/), [Dividere un PDF](/it/dividere-pdf/), [Comprimere un PDF](/it/comprimere-pdf/) e [Firmare PDF](/it/firmare-pdf/), non aprono un file che chiede una password. Sbloccalo qui, poi continua lì.
- **Stampare un modulo.** Capita che un modulo da stampare e firmare abbia la stampa bloccata. Togliendo la restrizione puoi stamparlo.

Una copia sbloccata si apre per chiunque ne entri in possesso. Tienila dove tieni gli altri documenti privati e cancellala quando non ti serve più. Per mandarla di nuovo con una password, usa [Proteggere PDF con password](/it/proteggere-pdf/).

## Cosa non fa

Non trova, non indovina e non forza le password. Se hai perso la password, qui il file non si può aprire. Chiedi la password o una nuova copia a chi te l'ha mandato; di solito banche e datori di lavoro sanno dirti quale password hanno usato, oppure ti fanno scaricare di nuovo il documento dal loro sito.

Non cambia nemmeno il contenuto. qpdf copia pagine, testo, link, segnalibri, campi dei moduli e allegati esattamente come sono; se ne va solo la cifratura.

## Come funziona

Lo strumento usa [qpdf](https://github.com/qpdf/qpdf) 12.2.0, una libreria PDF open source compilata in WebAssembly. Il browser la scarica da questo sito la prima volta che premi Sblocca (circa 1,3 MB) e la tiene nella cache. Per ogni file controlla prima se il PDF è cifrato e se serve una password per aprirlo. Poi scrive una copia senza cifratura, usando la tua password solo per i file che la chiedono, e verifica che nella copia non sia rimasta cifratura prima di proportela. Il nome del nuovo file finisce in -sbloccato.pdf, e l'originale non viene modificato.

I PDF e la password restano in questa scheda: niente viene caricato e la password non viene conservata. Puoi aggiungere fino a 10 file da 200 MB ciascuno.
