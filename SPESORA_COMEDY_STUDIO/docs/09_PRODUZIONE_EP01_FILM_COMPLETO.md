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

**Render:** 2808 fotogrammi validi su 2808, nessun buco, **nessun fotogramma duplicato** (hash di tutti i consecutivi). Tempo misurato ≈ 7 s a fotogramma, come previsto dal benchmark.

**Perché ci sono voluti due giorni:** il container viene spento quando la sessione resta inattiva, e il render staccato (`setsid nohup`) moriva con lui. Avanzava solo nei pochi minuti di attività di ogni ora (≈ 20 fotogrammi l'ora invece di ≈ 450). Risolto facendo girare il supervisore come attività seguita dalla sessione (limite 2 ore, poi rilancio): da lì il render è andato a ≈ 420–470 fotogrammi l'ora fino alla fine.

**Video** (verificato con ffprobe e ebur128):

| File | Contenuto |
|---|---|
| `EP01_FINALE.mp4` | narrazione + sottotitoli (consegnato direttamente, non nel repository) |
| `EP01_FINALE_senza_sottotitoli.mp4` | narrazione, senza sottotitoli (consegnato direttamente) |
| `renders/final/EP01_senza_voce_narratore.mp4` | solo effetti sonori, versione per il repository pubblico (ricodificato CRF 23) |
| `renders/final/EP01.srt`, `timeline_voci.json` | sottotitoli e tempi delle battute |

H.264 1080×1920, **30/1 fps reali**, **2850 fotogrammi** (2808 + 42 del cartello finale), **95,0 s**, AAC 48 kHz, loudness integrata **−16,5 LUFS**. Stem separati (NARRATOR, DIALOGUE, SFX, MUSIC, AMBIENCE, mix) consegnati fuori dal repository.

**Controlli sui fotogrammi:**
- I soli salti di luminosità grandi (fotogrammi 79, 187, 2521, 2569) cadono esattamente sugli stacchi di inquadratura.
- Test di sfarfallio (A-B-A) su tutti i 2808 fotogrammi: pixel A-B-A **isolati** (rumore) al massimo **0,29%** in un singolo triplo.
- Pixel A-B-A **in gruppo** fino al 7,8% (inquadratura 03, 7,77 s) e 4–6% nelle inquadrature 04, 05, 10: la mappa mostra che sono le **fughe delle piastrelle e la rete dei carrelli** durante i movimenti di camera. È aliasing di linee sottili (un campione per pixel), non rumore del denoiser: a velocità normale si vede come un leggero tremolio del pavimento nelle inquadrature con camera in movimento. Correggerlo richiede di ri-renderizzare quelle inquadrature con più campioni o una texture del pavimento più morbida.
- Fotogrammi consecutivi guardati a occhio (es. 1000–1003): movimento continuo, nessun salto.
