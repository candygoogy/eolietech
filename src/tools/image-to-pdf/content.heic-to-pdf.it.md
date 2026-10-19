---
title: "Convertire HEIC in PDF: le foto dell'iPhone in un PDF | Eolietech"
description: "Trasforma le foto HEIC di iPhone e iPad in un unico PDF, una foto per pagina, nel verso giusto. Tutto nel browser, quindi le tue foto non vengono mai caricate."
h1: "Da HEIC a PDF"
intro: "Metti le foto di iPhone e iPad direttamente in un PDF, senza convertirle prima in JPG. Aggiungi i file HEIC, scegli l'ordine e il formato della pagina e scarica un solo PDF. Le tue foto restano sempre sul tuo dispositivo."
howTo:
  - "Scegli le foto .heic o .heif, oppure trascinale nel riquadro qui sopra. Nello stesso PDF puoi mettere anche JPG, PNG, WebP e AVIF."
  - "Mettile in ordine trascinandole, oppure con i pulsanti Sposta su e Sposta giù. La foto in alto è la pagina uno."
  - "Lascia Adatta all'immagine per avere le foto a piena pagina, oppure scegli A4 o Letter per un PDF da stampare o da allegare a un modulo."
  - "Premi Crea PDF e scarica il file."
faq:
  - q: "Perché non posso mettere direttamente i file HEIC in un PDF?"
    a: "Il PDF non prevede immagini HEIC, e molti programmi per PDF non le leggono proprio. Questo strumento decodifica ogni foto nel tuo browser e la salva nel PDF come JPG di alta qualità (qualità 92), che qualsiasi lettore PDF sa mostrare."
  - q: "Le foto perdono qualità?"
    a: "Ogni foto viene convertita una sola volta, con qualità 92, che la mantiene molto vicina all'originale: quasi nessuno nota la differenza, nemmeno ingrandendo. Le foto con trasparenza vengono invece salvate in PNG, senza perdita."
  - q: "Le foto saranno nel verso giusto?"
    a: "Sì. La rotazione che l'iPhone ha salvato con ogni foto viene applicata durante la decodifica, quindi le foto in verticale restano in verticale e niente esce girato di lato."
  - q: "Le mie foto vengono caricate?"
    a: "No. Il decoder HEIC (libheif, compilato in WebAssembly) e la libreria per i PDF girano dentro questa scheda del browser. Le foto vengono lette dal tuo disco e il PDF viene salvato di nuovo lì."
ui:
  topdf.drop: "Scegli le foto o trascinale qui"
  topdf.drop.hint: "Foto HEIC o altre immagini. Il PDF viene creato sul tuo dispositivo; non viene caricato niente."
  topdf.outputName: "foto.pdf"
---

## Le foto dell'iPhone in PDF, in un solo passaggio

Da iOS 11 gli iPhone salvano le foto in HEIC per impostazione predefinita. È ottimo per lo spazio, ma diventa scomodo quando la scuola, il datore di lavoro o un ufficio ti chiedono un unico PDF: molti strumenti per PDF rifiutano l'HEIC, e convertire prima ogni foto in JPG significa un altro giro di file da gestire. Qui aggiungi direttamente i file HEIC e ottieni un solo PDF.

## Cosa succede a ogni foto

Il tuo browser decodifica ogni foto HEIC con libheif, la libreria HEIF open source, e la salva nel PDF come JPG con qualità 92. Con questa impostazione la differenza dall'originale è difficilissima da vedere, anche su uno schermo grande. La rotazione salvata dalla fotocamera viene applicata, quindi ogni pagina esce dritta. Delle Live Photo viene usata solo l'immagine fissa.

Se ti servono le foto stesse in JPG, da condividere o modificare, usa invece [Convertire HEIC in JPG](/it/heic-in-jpg/).

## Formato della pagina

**Adatta all'immagine** rende ogni pagina grande quanto la sua foto, l'ideale per guardarla su telefono o computer. Per stampare, o per moduli che si aspettano pagine da ufficio, scegli **A4** o **Letter**: ogni foto viene adattata e centrata, gli scatti orizzontali hanno pagine orizzontali e il margine piccolo tiene la foto lontana dal bordo della stampante.

## Le tue foto restano sul tuo dispositivo

Non viene caricato niente, in nessun momento. Conta soprattutto per le foto di documenti, carte d'identità e ricevute, che spesso sono proprio quelle che finiscono in un PDF. Se il PDF è troppo pesante per un'email, [Comprimere PDF](/it/comprimere-pdf/) può alleggerirlo, anche lui senza caricare niente.
