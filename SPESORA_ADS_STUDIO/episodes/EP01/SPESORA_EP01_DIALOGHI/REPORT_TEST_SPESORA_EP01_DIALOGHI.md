# SPESORA_EP01_DIALOGHI · rapporto di test

## Controlli sugli export

| Controllo | Esito |
|---|---|
| `SPESORA_EP01_DIALOGHI.mp4`: H.264 1080×1920, 30 fps, AAC 48 kHz, 35,2 s | ok |
| `SPESORA_EP01_DIALOGHI_senza_dialoghi.mp4`: stessa durata, senza sottotitoli | ok |
| `SPESORA_EP01_DIALOGHI_anteprima_540x960.mp4` | ok |
| Outro completo (32,0–35,2 s): logo, slogan, rametto, pausa | ok (al primo montaggio mancava: collegamenti ai fotogrammi con percorso relativo, corretto in `assemble_v2.py`) |
| Fotogrammi B (2,6–5 · 6,4–9,1 · 13,4–18,6 · 27–32 s) inseriti al posto giusto, nessuno stacco con le parti in comune con A | ok |
| 8,0–10,7 s: ripiano della porta che taglia la testa, volto fuori quadro | trovato al controllo, corretto e ri-renderizzato (8,0–9,1 s per B, 8,0–11,0 s per A) |
| Sottotitoli dentro le zone sicure di TikTok/Instagram; durante la demo non coprono l'interfaccia | ok |
| Interfaccia sullo schermo: schermate reali di Spesora, leggibili, in prospettiva corretta | ok |
| Nessun badge App Store / Google Play | ok |
| Tracce audio: VOICE_PROTAGONIST e VOICE_MINA vuote (35,2 s), SFX, MUSIC, AMBIENCE originali | ok |
| Nessuna voce sintetica definitiva | ok (voci assenti; i sottotitoli dicono «voce provvisoria») |

## Limiti noti

- Labiale generato dal testo: va riallineato sulle registrazioni definitive.
- Gambe rigide; grana leggera nelle zone scure; render a 540×960 ingrandito a 1080×1920.
- Lampada a sospensione tagliata in alto a sinistra nelle inquadrature a due.

## Tempi di render misurati

| Fase | Tempo |
|---|---|
| B 2,6–5 · 6,4–9,1 · 13,4–18,6 s (309 fotogrammi) | 1744,1 s |
| B 27–32 s (150 fotogrammi) | 863,6 s |
| B ri-render correzione 8,0–9,1 s (33 fotogrammi) | 219,0 s |
| Resto della scena | riusato dalla versione A (stessa animazione del corpo) |
| Montaggio e 3 export | 12 min 27 s |
