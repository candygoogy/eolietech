---
title: "Trascrivere audio in testo in privato | Eolietech"
description: "Trasforma registrazioni, memo vocali e video in testo e sottotitoli con Whisper, che gira nel tuo browser. Scarica TXT, SRT o VTT. Nessun caricamento."
h1: "Trascrivere audio in testo"
intro: "Trasforma un'intervista, una lezione, un memo vocale o l'audio di un video in testo con i tempi. Il modello di riconoscimento vocale gira sul tuo dispositivo, quindi la tua registrazione non viene mai caricata."
howTo:
  - "Scegli un file audio o video (MP3, M4A, WAV, OGG, FLAC, MP4, WebM e quasi tutti gli altri formati che il tuo browser sa riprodurre), oppure trascinalo nel riquadro qui sopra."
  - "Lascia la lingua su Rileva automaticamente, oppure scegli la lingua parlata se la conosci già."
  - "Premi Trascrivi. La prima volta il browser scarica il modello vocale e il suo motore, una volta sola, da questo sito: circa 90 MB, o circa 110 MB sui computer in cui gira sulla scheda grafica."
  - "Leggi la trascrizione nella pagina, copiala o scaricala come testo semplice (.txt) o come sottotitoli (.srt o .vtt)."
faq:
  - q: "La mia registrazione viene caricata?"
    a: "No. Il file viene decodificato dal tuo browser e il modello di riconoscimento vocale gira dentro questa scheda. L'unico download è il modello stesso, che arriva da questo sito. La trascrizione viene creata sul tuo dispositivo e resta lì finché non la salvi o la copi."
  - q: "Quanto tempo ci vuole?"
    a: "Dipende dal tuo dispositivo e dalla durata della registrazione. Su un computer desktop recente è diverse volte più veloce della riproduzione: nelle nostre prove circa 15 secondi per due minuti di parlato, e meno con una scheda grafica. I portatili di solito sono due o tre volte più lenti, e smartphone e computer meno recenti ancora di più. Con registrazioni molto lunghe la memoria potrebbe non bastare. Tieni aperta la scheda mentre lavora."
  - q: "Quali lingue capisce?"
    a: "Il modello Whisper conosce circa 100 lingue e funziona meglio con quelle più diffuse, come inglese, spagnolo, italiano, francese, tedesco e portoghese. Riconosce la lingua dai primi 30 secondi. Se una registrazione comincia con della musica o in un'altra lingua, scegli tu la lingua per evitare una trascrizione nella lingua sbagliata."
  - q: "Quanto è precisa?"
    a: "Un parlato chiaro con poco rumore di fondo viene trascritto bene, con qualche errore occasionale su nomi, numeri e termini tecnici. Accenti marcati, persone che si parlano sopra, audio di qualità telefonica e musica sotto la voce riducono tutti la precisione. Il modello non distingue chi sta parlando. Rileggi la trascrizione prima di farci affidamento."
  - q: "Perché prima scarica circa 90 MB?"
    a: "È il modello vocale Whisper (circa 76 MB) più il motore che lo fa girare (circa 14 MB). Dove il browser può usare la scheda grafica, scarica invece una versione della prima metà del modello adatta alle schede grafiche, per un totale di circa 110 MB. Prima di cominciare la pagina ti mostra il peso esatto per il tuo dispositivo. Non viene scaricato niente finché non premi Trascrivi, e il browser conserva i file nella sua memoria, così la trascrizione successiva parte senza scaricarli di nuovo."
  - q: "Può registrare dal mio microfono?"
    a: "No, questo strumento funziona solo con i file. Registra con l'app dei memo vocali del telefono o con un registratore qualsiasi, poi scegli il file qui."
ui:
  asr.modelNote: "La trascrizione usa un modello vocale e il suo motore, scaricati una volta da questo sito ({size}) quando premi Trascrivi. Poi girano sul tuo dispositivo."
  asr.listLabel: "Registrazione"
  asr.added: "Aggiunto: {name}."
  asr.language.label: "Lingua parlata"
  asr.language.auto: "Rileva automaticamente"
  asr.language.note: "Il rilevamento automatico ascolta i primi 30 secondi. Scegli tu la lingua se la registrazione comincia con della musica o in un'altra lingua."
  asr.action: "Trascrivi"
  asr.decoding: "Lettura dell'audio…"
  asr.loading: "Preparazione del modello vocale e del suo motore ({size}, solo la prima volta)…"
  asr.downloading: "Download del modello vocale: {loaded} di {total}, poi del suo motore ({engine})"
  asr.fromCache: "Caricamento del modello vocale dalla memoria del browser…"
  asr.starting: "Avvio del modello vocale…"
  asr.backend.webgpu: "In esecuzione sulla scheda grafica (WebGPU)."
  asr.backend.wasm.one: "In esecuzione sul processore (WebAssembly, {threads} thread). Tieni aperta questa scheda mentre lavora."
  asr.backend.wasm.other: "In esecuzione sul processore (WebAssembly, {threads} thread). Tieni aperta questa scheda mentre lavora."
  asr.detecting: "Riconoscimento della lingua…"
  asr.languageFound: "Lingua: {language}. Trascrizione in corso…"
  asr.progress: "Trascrizione in corso… {percent}%"
  asr.working: "Trascrizione di {length} di audio…"
  asr.done: "Trascrizione pronta."
  asr.doneMeta: "{length} di audio, {words} parole"
  asr.summary: "{language}, {length}, {words} parole. Controlla nomi e numeri prima di usarla."
  asr.empty: "In questa registrazione non è stato riconosciuto alcun parlato."
  asr.resultLabel: "Trascrizione"
  asr.transcriptLabel: "Testo della trascrizione"
  asr.copy: "Copia il testo"
  asr.copied: "Trascrizione copiata negli appunti."
  asr.copyFailed: "Copia non riuscita. Seleziona il testo e copialo a mano."
  asr.download.txt: "Scarica .txt"
  asr.download.srt: "Scarica .srt"
  asr.download.vtt: "Scarica .vtt"
  asr.error.decode: "Non è stato possibile leggere {name} come audio. Usa un formato comune come MP3, M4A, WAV o MP4. Le registrazioni molto lunghe potrebbero essere troppo grandi per la memoria del browser."
  asr.error.decodeShort: "Impossibile leggere l'audio"
  asr.error.load: "Non è stato possibile caricare il modello vocale. Controlla la connessione e riprova. Se continua a succedere, il browser potrebbe avere poca memoria: chiudi le altre schede e ricarica la pagina."
  asr.error.failed: "Qualcosa è andato storto durante la trascrizione di {name}. Se la registrazione è molto lunga, provane una più corta."
  asr.error.failedShort: "Trascrizione non riuscita"
---

## Come funziona

Questo strumento esegue [Whisper](https://github.com/openai/whisper), il modello aperto di riconoscimento vocale di OpenAI, dentro il tuo browser con Transformers.js e ONNX Runtime Web. Prima il browser decodifica il file, tiene il suono e scarta l'eventuale video, e lo converte nell'audio mono a 16 kHz che Whisper si aspetta. Poi il modello ascolta la registrazione in finestre da 30 secondi che si sovrappongono un po', scrive quello che sente e segna dove inizia e finisce ogni frase.

Usiamo la versione multilingue "base" di Whisper, in gran parte compressa a numeri a 8 bit, così si scarica più in fretta e sta nella memoria di un browser. È un compromesso: il Whisper più piccolo è più veloce ma sbaglia molto di più fuori dall'inglese, e quelli più grandi sono troppo pesanti da scaricare e far girare in una pagina web. Quando il browser supporta WebGPU, la parte del modello che ascolta l'audio gira sulla scheda grafica e quella che scrive il testo gira sul processore; altrimenti tutto gira sul processore con WebAssembly.

## Sottotitoli e testo

Il file .txt ha una riga per frase, senza tempi, per appunti e documenti. I file .srt e .vtt sono formati di sottotitoli con un tempo di inizio e di fine per ogni riga: SRT funziona con la maggior parte dei programmi di montaggio e dei lettori video, e VTT è il formato usato dai lettori video sul web. I tempi seguono le pause tra le frasi decise dal modello, quindi controllali nel tuo editor e dividi le righe lunghe se serve.

## Privacy, limiti e licenze

La tua registrazione non esce mai dal tuo dispositivo. Sono accettati file fino a 200 MB; quello che limita davvero un file è la sua durata, perché il browser tiene in memoria tutto l'audio decodificato. Se una registrazione lunga non va a buon fine, dividila in parti o estrai prima solo l'audio. I file del modello vengono forniti da questo sito, verificati con checksum fissi e conservati nella memoria del browser. Whisper è di OpenAI, rilasciato con licenza MIT; la conversione ONNX è della community ONNX di Hugging Face. Transformers.js è di Hugging Face (Apache 2.0) e ONNX Runtime di Microsoft (MIT).
