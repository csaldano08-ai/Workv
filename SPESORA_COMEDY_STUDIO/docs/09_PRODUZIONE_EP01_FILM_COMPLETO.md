# 09 · Produzione del film completo EP01

Ordine di produzione: film intero, 1080×1920, 30 fps veri, senza vento, con rendering ripristinabile. Il test di 11,6 s è approvato e non si rifà.

## 1 · Ambiente (misurato)

| | |
|---|---|
| CPU | 4 core Intel Xeon 2,1 GHz, nessuna GPU |
| RAM / disco | 15 GB / 13 GB liberi dopo aver tolto le cache dei modelli vocali |
| Blender | 5.3 (modulo `bpy`), Cycles CPU, denoiser OpenImageDenoise |
| Motore | **Cycles CPU**. Eevee non gira senza GPU e non è stato usato. |

## 2 · Benchmark e scelta del preset

Otto fotogrammi rappresentativi (campo largo con carrello, primo piano, corsia, gruppo, casse, porta, dettaglio telefono, primo piano finale). Dati grezzi in `docs/produzione/`.

**Dove va il tempo** (1080×1920, fotogramma medio):

| Voce | Tempo |
|---|---|
| Setup del fotogramma (pose, volti, camera) | 0,6–1,4 s |
| Sincronizzazione scena + BVH (costo fisso) | **0,2 s**: la geometria non è il collo di bottiglia, quindi non si tolgono oggetti per inquadratura |
| Un campione per pixel | 5,1 s (a 1080×1920) |
| Denoise OIDN qualità alta (predefinita) | **7,6 s** |
| Denoise qualità BALANCED con prefiltro FAST | **1,0 s** |

**Preset provati** (tempo per fotogramma, setup compreso; ore per i 2808 fotogrammi):

| Preset | s/fotogramma | Ore |
|---|---|---|
| 540×960, 6 campioni (l'animatic) | 9,5 | 7,4 |
| 720×1280, 4 campioni | 12,6 | 9,8 |
| 1080×1920, 2 campioni, denoise alto | 17,9 | 13,9 |
| 1080×1920, 3 campioni, denoise alto | 23,1 | 18,1 |
| **1080×1920, 1 campione, OIDN BALANCED/FAST (scelto)** | **≈ 7,3** | **≈ 5,7** |
| 1080×1920, 2 campioni, OIDN BALANCED/FAST | ≈ 12,4 | ≈ 9,7 |

**Qualità**, confrontata con un riferimento a 24 campioni sugli stessi fotogrammi (PSNR e errore medio su 255; i preset più piccoli sono ingranditi a 1080×1920):

| Preset | PSNR | Errore medio |
|---|---|---|
| 1080×1920, 2 spp, BALANCED/FAST | 35,7 dB | 2,09 |
| **1080×1920, 1 spp, BALANCED/FAST** | **34,6 dB** | **2,46** |
| 720×1280, 3 spp, BALANCED/FAST, ingrandito | 34,2 dB | 2,50 |
| 1080×1920, 2 spp, FAST senza prefiltro | 33,3 dB | 2,52 |
| 720×1280, 2 spp, ingrandito | 33,3 dB | 2,80 |
| con meno rimbalzi di luce (max 2, diffusi 1) | 23 dB | 14,9 |
| con Fast GI | 18,5 dB | 22,3 |

Scartati i preset con meno rimbalzi di luce e con Fast GI: sono più veloci ma **cambiano l'aspetto** (immagine più scura), che deve restare quello approvato.
Confronto a occhio sui dettagli (linee del volto, testo del telefono, rete del carrello, pavimento a piastrelle): `docs/produzione/CONFRONTO_PRESET_dettagli.jpg`.
A 1 campione il denoise ricostruisce linee e testo senza differenze visibili rispetto al riferimento.

**Preset di produzione:** Cycles CPU, **1080×1920 nativi**, 1 campione per pixel, OIDN BALANCED con prefiltro FAST, percorsi di luce originali, texture del volto 1024 px. Nessun ingrandimento da risoluzioni più basse, nessuna interpolazione.

La stima di 3 ore di rendering (3,85 s a fotogramma) **non è raggiungibile** su questa CPU a 1080×1920 senza cambiare l'aspetto: un solo campione costa già 5,1 s. Il preset scelto è il migliore verificato.

## 3 · Rendering ripristinabile

`scripts/render_supervisor.py` + `scripts/ep01_animatic.py` (modalità `render`).

- **Un file per fotogramma**, `frames/EP01_000001.png … EP01_002808.png`, scritto in modo atomico (prima `.part.png`, poi rinomina: un crash non lascia fotogrammi a metà).
- **Manifest** (`manifest.json`): previsti, completati, mancanti, stato di ogni chunk da 90 fotogrammi, secondi per fotogramma (ultimi 60), ore stimate, preset. Aggiornato ogni 30 s, con un segnale di vita (`heartbeat.txt`).
- **Ripresa**: all'avvio il supervisore decodifica i file presenti, scarta solo quelli incompleti, corrotti o di dimensione sbagliata, e rende solo i buchi. Rilancia Blender se si ferma (fino a 20 volte).
- **Un solo processo di Blender per tutti i buchi**, non uno per chunk: il setup della scena costa 2,5 min e per 30 chunk sarebbero 75 minuti.
- **Persistenza**: la cartella di lavoro è nel disco della sessione, che è sopravvissuto a tre riavvii del container (verificato: i fotogrammi erano al loro posto dopo ognuno). **Non** è al riparo dalla cancellazione dell'ambiente. Per questo il repository contiene tutti i sorgenti, la configurazione e il manifest, ma non i 2808 PNG (8 GB).
- **Dopo un riavvio** i processi si fermano: un controllo orario programmato nella sessione verifica il supervisore e lo rilancia con `prod/riprendi.sh`.

## 4 · Correzioni prima del render

- **Scatti a 0,03 s e 6,2 s:** non c'erano. Erano un artefatto dello strumento di misura, che valutava un solo passaggio per fotogramma invece dei due del render vero. Rimisurati a due passaggi non compaiono (resta uno sguardo veloce ma continuo a 3,0 s, non un salto).
- **Schermata dell'app:** catturata dalla **vera app** (esportazione web, non modificata) con la data simulata del 22/11 e 3 persone nell'onboarding: la lista mostra **«Cipolla 4 pz»** come primo prodotto, «Prima questi 7: servono oggi!». Il piano dell'app dipende dalla data e dal numero di persone; con 2 persone la stessa data dà «2,5 pz», con 4 «5 pz». Vedi `assets/ui/README.md`.
- **Dialoghi brevi** dei personaggi (solo testo e labiale, voci da registrare): Luca «Lei è quello mandato dalla direzione?» e «Ah, ha già iniziato i controlli!», il direttore «Mi hanno raccontato tutto.», più le due già presenti.

## 5 · Audio

La causa del «vento» era nel montaggio: un letto di rumore filtrato continuo più un ronzio a 50 Hz per tutta la durata. **Eliminato.**
Ora ci sono solo suoni motivati da ciò che si vede, sintetizzati nel codice (nessuna licenza di terzi): passi sugli appoggi reali dei piedi (dai piani delle impronte), ruote e tasselli del carrello e dell'espositore solo mentre si muovono, scatto e cardine della porta, cartellina, cassa che si apre, qualche bip lontano e un gong d'annuncio. Tra un suono e l'altro c'è silenzio (27% delle finestre da 0,1 s è silenzio digitale).
Stem: NARRATOR, DIALOGUE (vuoto: voci da registrare), SFX, MUSIC (vuoto), AMBIENCE.
La narrazione è quella già generata con `LUCASPESORA.mp3` su autorizzazione esplicita, senza nuova clonazione; non è nel repository pubblico.

## 6 · Risultati finali

_(compilati a render concluso)_
