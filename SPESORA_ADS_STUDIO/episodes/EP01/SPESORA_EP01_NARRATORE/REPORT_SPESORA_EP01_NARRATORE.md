# SPESORA_EP01_NARRATORE · rapporto

Versione A: narratore in terza persona + Mina, protagonista muto. Durata 35,2 s (32 s di scena + 3,2 s di outro), 1080×1920, 30 fps.

## 1. Problemi trovati nel video originale (bozza da 35 s)

| Tempo | Problema |
|---|---|
| 2,60 s · 9,20 s | Il battito di ciglia lascia una fessura bianca: l'occhio non si chiude. |
| 2,8–3,6 s | Movimenti degli occhi casuali mentre parla: lo sguardo non ha un bersaglio. |
| 5,3–5,8 s | Il braccio attraversa il ripiano della porta del frigo. |
| 8,0–10,6 s | Il bordo del ripiano del frigo sembra un terzo sopracciglio; il ripiano della porta "taglia" la testa. |
| 11–27 s | Schermo del telefono sovraesposto e viola, scocca viola (non del marchio); interfaccia poco leggibile. |
| 13,3–14,4 s | Mina parla con la faccia coperta dal telefono. |
| 15,0 s | Mina esce dall'inquadratura. |
| 15,2–17 s | Il protagonista non guarda mai Mina (lei è alle sue spalle): guarda in alto o in camera. |
| 17,0–17,3 s | La camera attraversa la testa del protagonista. |
| 19,3–26 s | Il dito gigante di Mina copre l'interfaccia dell'app. |
| 27–29,6 s | Braccia rigide tese verso la camera. |
| finale | Cartello finale avorio, senza una struttura da outro. |

## 2. Correzioni effettuate

| Tempo nel nuovo video | Correzione |
|---|---|
| 1,05 s · 2,78 s · tutto il video | Palpebre: sopra il 60% di chiusura l'occhio passa all'arco chiuso, niente più fessura bianca. Battiti di ciglia intenzionali (dopo un pensiero, prima di uno sguardo nuovo). |
| 0–32 s | Sguardo sempre puntato su un bersaglio (frigo, telefono, Mina, camera) con anticipo degli occhi sulla testa; sopracciglia legate all'emozione. Il protagonista non muove mai la bocca per parlare. |
| 5,0–6,0 s | Spinta dello sportello ricalcolata sul bordo della porta: la mano non attraversa più il ripiano. |
| 8,0–11,0 s | Camera abbassata, nuova inquadratura che segue la testa; il ripiano della porta è nascosto solo in questa inquadratura. |
| 11–12,6 s · 18,6–27 s | Schermo: interfaccia reale di Spesora registrata dall'app e applicata in prospettiva sullo schermo 3D, nitida; luminosità ridotta; scocca antracite #24332C. |
| 12,6–13,4 s | Mina esce da dietro il telefono, a braccia alzate, e atterra accanto al telefono. |
| 13,4–17 s | Nuova inquadratura a due: Mina e il protagonista si guardano davvero; lei resta nel quadro. |
| 17–18,6 s | Movimento di camera rifatto: nessuna compenetrazione. |
| 17,3–19,4 s | Mina indica il bordo dello schermo senza coprirlo. |
| 18,6–27 s | Dimostrazione dell'app: 1 calendario della settimana (19,55 s), 2 ricetta del giorno (22,75 s), 3 lista della spesa (25,0 s), con etichette brevi e sottotitoli che non coprono l'interfaccia. |
| 27–32 s | Risoluzione con pose rilassate, niente braccia tese verso la camera; primo piano finale sorridente. |
| 31,87–32 s | Stacco con discesa al verde scuro. |
| 32–35,2 s | Nuovo outro: fondo verde antracite quasi nero, logo Spesora grande, slogan «Cosa cucini? Già deciso.», un rametto originale che si disegna sotto lo slogan, pausa finale. Niente badge degli store. |

## 3. Problemi rimasti

- Le gambe sono rigide (blocchi senza ginocchio): camminata e appoggio sono semplici.
- Leggera grana del render (10 campioni + denoise) nelle zone scure.
- Render a 540×960 e ingrandimento a 1080×1920: il formato di consegna è 1080×1920 ma non è risoluzione nativa. Per la versione finale serve un render a risoluzione piena (stima sotto).
- Nella inquadratura a due (13,4–17 s e 27–30,6 s) in alto a sinistra si vede la lampada a sospensione della cucina, tagliata dal bordo.
- Voci, musica e tempi sono provvisori: quando arrivano le voci reali, i tempi si adattano alle registrazioni.
- Il video di riferimento di Melo non era allegato: l'outro segue solo la descrizione testuale (stacco netto, logo, slogan, un segno grafico, pausa), senza copiarne elementi.

## 4. Tempi di render misurati

Cycles su CPU (Eevee non disponibile in questo ambiente: senza GPU/EGL va in crash), 540×960, 10 campioni, denoise.

| Fase | Tempo |
|---|---|
| Scena 0–8 s (240 fotogrammi) | 1269,5 s |
| Scena 8–16 s (240) | 1447,0 s |
| Scena 16–24 s (240) | 1345,4 s |
| Scena 24–32 s (240) | 1407,7 s |
| Totale 960 fotogrammi | 5469,6 s (≈ 91 min, ≈ 5,7 s per fotogramma) |
| Ri-render correzione 8–11 s (90 fotogrammi) | 593,1 s (≈ 6,6 s per fotogramma) |
| Montaggio (interfaccia, sottotitoli, outro, 3 export) | 10 min 56 s da solo; 12 min 27 s in parallelo con la versione B |

Stima per un render nativo 1080×1920 con 64 campioni sulla stessa CPU: circa 4×(pixel) × 4–6×(campioni) ≈ 25–35 h. Con una GPU il tempo scende a poche ore.

## 5. File pronti per le voci definitive

- `audio/stems/NARRATOR.wav`, `audio/stems/MINA.wav`: tracce vuote già della durata giusta (35,2 s, 48 kHz): si sostituiscono con le registrazioni.
- `audio/stems/SFX.wav`, `MUSIC.wav`, `AMBIENCE.wav` e `audio/mix_senza_voci.wav`: effetti, musica e ambiente originali, sintetizzati in codice (nessuna licenza di terzi).
- `audio/timeline_audio.csv`: ogni evento audio con tempo, durata, descrizione e origine.
- `COPIONE_SPESORA_EP01_NARRATORE.md`: copione temporizzato con nomi dei file da registrare (`audio/voices/narrator/EP01A_L01_narrator.wav`, …).
- `GUIDA_REGISTRAZIONE_NARRATORE_…md`, `GUIDA_REGISTRAZIONE_MINA_…md`: indicazioni per chi registra.
- `TIMELINE_SPESORA_EP01_NARRATORE.csv`: marcatori di battute, inquadrature, effetti, ambiente e musica.
- `SPESORA_EP01_NARRATORE_senza_dialoghi.mp4`: video pulito senza sottotitoli, su cui montare le voci.
- `SPESORA_EP01_NARRATORE.blend`: scena Blender con animazione e marcatori delle battute (la sequenza dell'interfaccia va rigenerata con `scripts/capture_ui_video.cjs`, vedi README).
