# Narrazione EP01 · versione 2 · PROPOSTA (non definitiva)

Rifatta su richiesta esplicita («rifai la voce che ti ho mandato… da narratore che esplica»), con la voce del file `ItalianoSpesora.mp3`.
Non è una voce scelta come definitiva: la decide l'utente dopo l'ascolto.
La generazione è bloccata per default (`VOCE_AUTORIZZATA=1` per rigenerarla).

## Cosa cambia rispetto alla v1 (rifiutata)

| | v1 | v2 |
|---|---|---|
| Modello | Qwen3-TTS 0.6B Base | **1.7B Base** |
| Riferimento | per le battute calme la frase più piatta (F08) | il racconto naturale: F01 + F06 + F04 |
| Generazione | 16 frasi staccate | **7 paragrafi** (le frasi si legano), poi tagliati nelle pause |
| Intonazione | compressa a posteriori con PSOLA | **non toccata** |
| Tocchi di testo | — | solo punteggiatura: pausa prima di «le cipolle» (N08) e di «nemmeno una cipolla» (N16) |
| Scelta delle prese | testo, versi, somiglianza, «calma» | testo, versi, somiglianza, intonazione **non più piatta dell'originale**, velocità come l'originale |

## Misure (Whisper, WavLM-SV, pYIN)

- **Testo:** esatto in tutti i 7 paragrafi e in tutte le 16 battute dopo il taglio.
- **Somiglianza con la voce originale:** 0,984–0,993 per paragrafo.
- **Velocità:** 4,6–6,0 sillabe al secondo, contro 5,7 dell'originale.

Deviazione dell'intonazione, in semitoni, sulle battute che nella v1 erano state appiattite:

| Battuta | v1 | v2 |
|---|---|---|
| N05 «E lui non ebbe il coraggio…» | 2,67 | **4,98** |
| N07 «Il problema?» | 2,70 | **4,62** |
| N08 «Non aveva ancora trovato… le cipolle.» | 2,55 | **4,54** |
| N13 «A quel punto capì…» | 2,59 | 3,21 |
| N16 «Alla fine… non comprò nemmeno una cipolla.» | 2,71 | **5,61** |

L'originale registrato va da 3,1 a 5,3. I valori di ogni battuta sono in `confronto_v1_v2.json`.

## Da controllare all'ascolto (io non posso ascoltare)

- **N09–N10**, le gag elencate: sono più piatte che nella v1 (2,7 e 2,3 semitoni). Se suonano spente, si rigenera solo quel paragrafo.
- **N03** «…su Spesora,»: sale alla fine, come una sospensione prima di «ma un dipendente». Whisper la trascrive con il punto interrogativo.
- **N02** «Quattro.»: troppo breve per misurarne l'intonazione.
- Pronuncia di «Spesora».

## File

- `EP01_narrazione_v2_PROPOSTA.mp3`: traccia continua (62,8 s) con le pause del racconto.
- `battute/EP01_Nxx_narratore.wav`: una battuta per file, stesso livello per tutte.
- `marcatori_narrazione_v2.json`: inizio e fine di ogni battuta nella traccia continua. Nel montaggio si riposizionano sui marcatori delle inquadrature.
- `selezione_prese_v2.json`: tutte le prese con le misure.

Consenso: la voce clonata è quella del file fornito dall'utente. Per un uso commerciale serve il consenso della persona che l'ha registrata.
