---
title: "Ridimensionare immagini per Instagram a 1080 px | Eolietech"
description: "Porta le foto ai 1080 px di larghezza che Instagram usa per i post del feed, mantenendo le proporzioni. Fino a 50 alla volta, nel browser, senza caricare nulla."
h1: "Ridimensiona per Instagram"
intro: "Instagram di solito salva le foto del feed larghe 1080 pixel. Questa pagina porta le tue foto a quella larghezza e ne mantiene le proporzioni, così sai la misura esatta di ogni file prima di pubblicarlo. Tutto avviene sul tuo dispositivo."
howTo:
  - "Scegli le foto o trascinale nel riquadro qui sopra. Puoi aggiungerne fino a 50 alla volta."
  - "La larghezza è già impostata a 1080 px, e l'altezza di ogni foto segue le sue proporzioni. Le foto più strette restano della loro misura."
  - "Lascia il formato com'è, oppure scegli JPG se le immagini sono WebP o AVIF. Per Instagram JPG e PNG sono le scelte sicure."
  - "Controlla la nuova misura accanto a ogni foto, per esempio 1080 × 1350 px per una verticale 4:5, poi scaricale una per una o usa Scarica tutto per avere un .zip."
faq:
  - q: "Che misura deve avere una foto per Instagram?"
    a: "Per i post del feed, 1080 pixel di larghezza. L'altezza dipende dalla forma: 1080 × 1080 px per una foto quadrata, 1080 × 1350 px per una verticale 4:5 e circa 1080 × 566 px per un'orizzontale 1,91:1. Instagram cambia i formati ogni tanto, quindi prima di pubblicare controlla l'anteprima nell'app."
  - q: "Instagram taglierà la mia foto?"
    a: "Può succedere. Da tempo i post del feed accettano forme tra l'orizzontale 1,91:1 e la verticale 4:5, e una foto fuori da questo intervallo può essere tagliata quando la pubblichi. Una foto scattata col telefono in verticale di solito è 3:4, cioè più alta di 4:5. Per scegliere tu cosa resta nell'inquadratura, ritagliala prima in 4:5 con lo strumento per ritagliare immagini di questo sito, poi ridimensionala qui."
  - q: "Ridimensionare prima rende la foto più bella su Instagram?"
    a: "Può aiutare, ma Instagram comprime di nuovo ogni foto caricata, qualunque cosa tu faccia. Ridimensionando prima carichi un file più leggero e già della larghezza che usa Instagram. Tieni la qualità a 85 o più, così la foto arriva in buone condizioni a quella seconda compressione."
  - q: "Funziona anche per le Storie?"
    a: "Sì. Anche le Storie sono larghe 1080 pixel, in un formato verticale 9:16 (1080 × 1920 px). L'impostazione della larghezza funziona allo stesso modo; per un'inquadratura esatta in 9:16, ritaglia prima la foto."
  - q: "Le mie foto vengono caricate?"
    a: "No. Il ridimensionamento avviene in questa scheda del browser, e le foto non lasciano mai il tuo dispositivo. Arrivano su Instagram solo quando le pubblichi tu."
ui:
  img.drop.hint: "Foto JPG, PNG, WebP o AVIF. Ridimensionate sul tuo dispositivo: non viene caricato nulla."
  img.zipName: "instagram-1080.zip"
---

## Perché 1080 pixel

Il feed di Instagram è pensato per immagini larghe 1080 pixel, e le foto più larghe vengono ridotte quando le carichi. Una foto del telefono è spesso larga da 3000 a 4000 pixel, quindi la maggior parte dei suoi pixel si perde comunque. Ridimensionandola qui prima, decidi tu come viene ridotta e conosci la misura esatta del file che pubblichi. Torna utile anche quando un'app per programmare i post, un grafico o un cliente ti chiede immagini larghe esattamente 1080 px.

## Forme e ritaglio

Il ridimensionamento mantiene la forma di ogni foto: un'orizzontale 3:2 resta 3:2, solo più piccola. Se vuoi un post quadrato o in 4:5, ritaglia prima la foto in quella forma con [Ritagliare immagini](/it/ritagliare-immagini/), poi torna qui per impostare la larghezza.

Potresti anche scegliere Larghezza e altezza, scrivere 1080 × 1350 e togliere la spunta a Mantieni le proporzioni, ma la foto verrebbe deformata per riempire il riquadro. Quasi sempre quello che ti serve è un ritaglio.

## Come funziona

Il tuo browser ridimensiona ogni foto con il filtro Lanczos3 e la salva con MozJPEG, libwebp, libavif o oxipng, a seconda del formato, in un worker in background dentro questa scheda. Dai nuovi file vengono tolti la posizione e i dati della fotocamera (i dati EXIF). Niente passa dalla rete. Per altre misure, [Ridimensiona le immagini](/it/ridimensionare-immagini/) ha tutte le opzioni.
