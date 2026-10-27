---
title: "Adattare un'immagine al 16:9 senza tagliarla | Eolietech"
description: "Metti la foto intera in un riquadro 16:9 per copertine YouTube, slide e TV, su sfondo sfocato, nero, bianco o colorato. Fino a 50 alla volta, senza caricarle."
h1: "Adatta un'immagine al 16:9"
intro: "Una foto verticale del telefono o un'immagine quadrata non riempiono uno schermo 16:9. Qui la foto entra intera in un riquadro 16:9 e i lati vengono riempiti con una sua copia sfocata, con il nero, il bianco o un colore a scelta, senza tagliare niente. Puoi lavorare fino a 50 foto alla volta, sul tuo dispositivo."
howTo:
  - "Scegli le immagini o trascinale nel riquadro qui sopra. Vanno bene JPG, PNG, WebP e AVIF, fino a 50 alla volta e 100 MB ciascuna."
  - "In Formato è già selezionato 16:9. Scegli lo Sfondo: per i video di solito Foto sfocata o Nero, per una slide Bianco o Colore."
  - "In Dimensione scegli Larghezza fissa e scrivi 1920 per un riquadro da 1920 × 1080 px, oppure 1280 per 1280 × 720 px. Con Come la foto la foto resta alla sua misura e vengono aggiunti solo i lati."
  - "Controlla le nuove misure accanto a ogni immagine, poi scaricale una per una o usa Scarica tutto per avere un .zip."
faq:
  - q: "Quanto deve essere grande la copertina di un video YouTube?"
    a: "YouTube consiglia 3840 × 2160 px, cioè 16:9, e almeno 640 px di larghezza, quindi va bene anche 1280 × 720 px. Scegli Larghezza fissa e scrivi 3840 o 1280: la nota sotto il campo mostra l'altezza. Una foto più piccola del riquadro viene ingrandita per riempirlo e può risultare morbida, quindi parti dalla copia più grande che hai. Dal telefono YouTube accetta copertine fino a 2 MB: se il file pesa di più, salvalo in JPG e abbassa la qualità."
  - q: "Come metto una foto verticale in un video orizzontale?"
    a: "Adattala qui al 16:9 con Foto sfocata o Nero, imposta in Larghezza fissa la larghezza del video, per esempio 1920 per un progetto in 1080p, e inseriscila nella tua app di montaggio. Riempie già l'inquadratura così com'è, quindi l'app non ha niente da tagliare o deformare."
  - q: "Come metto una foto in una slide senza tagliarla?"
    a: "PowerPoint e Presentazioni Google usano le slide in 16:9 come formato predefinito, quindi un'immagine 16:9 riempie la slide da bordo a bordo. Adatta qui la foto e inseriscila a tutta pagina. Se la slide ha già un suo sfondo o una sua grafica, salva in PNG e scegli Trasparente: ai lati della foto si vedrà la slide."
  - q: "La foto risulterà piccola sullo schermo?"
    a: "Occupa tutta l'altezza del riquadro, quindi lo spazio che avanza ai lati dipende dalla sua forma. Una foto orizzontale in 4:3 copre tre quarti della larghezza, una quadrata poco più della metà, una foto verticale del telefono meno della metà. Se resta troppo sfondo, ritaglia la foto in 16:9 con lo strumento per ritagliare di questo sito, oppure togli prima un po' sopra e sotto e adatta qui quello che resta."
  - q: "Le mie immagini vengono caricate?"
    a: "No. Apertura, adattamento e salvataggio avvengono tutti in questa scheda del browser, e niente viene inviato a un server. I nuovi file non contengono i dati EXIF, come la posizione GPS, ed è bene saperlo prima di mettere una foto in un video pubblico."
---

## Copertine, video e slide

Il 16:9 è il formato della maggior parte dei televisori, dei player video e delle slide. Le foto del telefono di solito sono in 3:4 se scattate in verticale e in 4:3 se scattate in orizzontale, e nessuna delle due riempie un riquadro 16:9. Se le metti così come sono in un video o in una slide, di solito compaiono bande nere ai lati, oppure l'immagine viene ingrandita finché i bordi non spariscono. Adattandole qui ottieni un'immagine 16:9 con la foto intera e i lati che hai scelto tu.

## Le misure del 16:9

Con **Larghezza fissa** l'altezza segue il 16:9:

- 1280 px di larghezza danno 1280 × 720 px (720p), abbastanza per una copertina YouTube.
- 1920 px danno 1920 × 1080 px (1080p, Full HD), la misura tipica di un progetto video e di molti monitor.
- 3840 px danno 3840 × 2160 px (4K), la misura che YouTube consiglia per le copertine.

**Come la foto** lascia la foto alla sua misura e allarga il riquadro intorno: una foto verticale del telefono da 3024 × 4032 px diventa 7168 × 4032 px. Va bene se poi ridimensionerai l'immagine nella tua app di montaggio.

## Lati sfocati o bande piene

**Foto sfocata** riempie i lati con una copia della stessa foto, ingrandita, sfocata e un po' più scura, come si vede spesso quando un video girato in verticale passa su uno schermo largo. **Nero** si confonde con le bande che il player aggiungerebbe comunque e lascia tutta l'attenzione alla foto. **Bianco** o **Colore** vanno bene in una slide, dove i lati possono riprendere lo sfondo della presentazione.

Per la versione verticale della stessa foto, [Adatta un'immagine al 9:16](/it/adattare-immagine-9-16/) parte già in 9:16. Se preferisci riempire il riquadro 16:9 con una parte della foto, usa [Ritaglia in 16:9](/it/ritagliare-immagine-16-9/).

## Come funziona

Le immagini vengono decodificate in un worker in background dentro questa scheda, le foto del telefono vengono prima raddrizzate e la foto viene ridimensionata con il filtro Lanczos3 solo quando il riquadro lo richiede. Il lato lungo del riquadro arriva al massimo a 20.000 px, quindi con Come la foto una foto molto grande viene rimpicciolita insieme al suo riquadro. I file vengono salvati senza dati EXIF e niente passa dalla rete.
