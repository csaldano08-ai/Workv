# Narrazione EP01 · voce clonata del narratore

**Sorgente:** `ItalianoSpesora.mp3`, il file caricato nella sessione: 28,5 s, mono, 24 kHz.
**Modello:** Qwen3-TTS-12Hz-**0.6B**-Base, licenza Apache-2.0, clonazione in modalità ICL (audio di riferimento più la sua trascrizione), eseguito su CPU.

## 1. Pulizia della registrazione, frase per frase

Trascrizione con Whisper large-v3-turbo, con i tempi di ogni parola, poi analisi dello spettrogramma. I file sono in `sorgente_narratore/`.

| Tempo | Cosa c'era | Intervento |
|---|---|---|
| 0,03–0,42 s | soffio di rumore a banda larga, senza parole, prima di «Quest'uomo» | rimosso |
| **19,62–19,90 s** | **verso estraneo** tra «correggerlo» e «Così»: stessa firma del precedente; Whisper, forzato, lo legge «Peace» | rimosso |
| 16,2–16,8 s | solo silenzio (la parola «E» era datata male da Whisper) | nessuno |

Risultato: 8 frasi pulite (`frasi_pulite/F01–F08.wav`), ricontrollate una per una con Whisper (testo intatto), e la narrazione originale rimontata senza versi (`narrazione_originale_pulita.wav/.mp3`).

## 2. Clonazione e scelta delle prese

- **Riferimento fatto solo di frasi pulite.** Per il tono calmo uso F04 + F08: F08 è la frase più piatta dell'originale e il modello imita soprattutto la fine del riferimento. Per il racconto uso F04 + F05, per le gag F04 + F06.
- **Prese:** 3–7 per battuta, di più per le battute calme e per quelle molto brevi.
- **Scelta automatica**, perché non posso ascoltare. Ogni presa viene:
  - trascritta con Whisper, e serve il testo esatto (WER 0);
  - controllata per energia fuori dalle parole, così vengono scartate quelle con versi;
  - confrontata con la voce originale tramite l'embedding del parlante WavLM-SV;
  - misurata nell'enfasi rispetto al tono richiesto.
- **Prese scartate:**
  - «Il problema?»: 6 prese su 7, tutte per versi aggiunti dal modello;
  - «Quattro.»: 1 presa, per un verso forte quanto la parola;
  - N10: 1 presa, per una parola sbagliata.

## 3. Enfasi più calma, in modo coerente

Su ogni battuta ho fissato un tetto all'escursione dell'intonazione:
- **calmo:** 2,8 semitoni;
- **racconto:** 4,2;
- **gag:** 4,8.

Dove una presa supera il suo tetto, l'intonazione viene compressa attorno alla nota media con PSOLA di Praat: il timbro resta uguale, cambia quanto la voce sale e scende sulle parole enfatizzate. Sulle battute calme si aggiunge una compressione dolce del volume. Poi tutte le battute vengono portate allo stesso livello.

| Misura | Originale (con enfasi) | Narrazione clonata |
|---|---|---|
| Escursione nelle frasi calme | 3,0–5,3 semitoni | **2,2–2,8** |
| Escursione nelle frasi di racconto | 3,6–4,5 | 3,6–4,6 |
| Salti di volume sulle parole enfatizzate (picco/mediana) | 2,1–2,7 | 1,6–1,9 sulle calme |
| Somiglianza della voce (0–1) | 0,93–0,985 tra le frasi originali | 0,89–0,98 per battuta, **0,986** sulla traccia |
| Testo riconosciuto | — | **esatto** (WER 0) in tutte le 16 battute e sulla traccia completa |
| Versi fuori dalle parole | 2 | **0** |

## 4. File

- `narrazione_clonata/EP01_narrazione_voce_clonata.wav` e `.mp3`: 60,6 s, battute N01–N16 con le pause del copione.
- `narrazione_clonata/battute/EP01_Nxx_narratore.wav`: una battuta per file, da montare sull'animazione.
- `narrazione_clonata/EP01_narrazione_timeline.csv`: inizio e fine di ogni battuta, tono, presa scelta, escursione prima e dopo.
- `narrazione_clonata/selezione_prese.json` e `verifica_finale.json`: tutte le misure.
- `narrazione_ep01.json`: il testo. N01–N08 è il testo della registrazione originale; N09–N16 è la continuazione nello stesso stile, fino al finale.
- Script: `scripts/voice_clone_narration.py`, `scripts/voice_finish.py`, `scripts/voice_eval.py`.

## Altri personaggi che parlano

Solo **due battute brevi**, non clonate. Tutto il resto lo racconta il narratore.
- **PROTAGONISTA**, sottovoce: «Ma… le cipolle?»
- **DIRETTORE**: «Avete sentito? Controllate subito le cipolle!»

## Limiti dichiarati

- **Ascolto:** non posso ascoltare l'audio. Le scelte si basano su misure oggettive, quindi un ascolto umano resta indispensabile: naturalezza, eventuali piccoli artefatti della compressione dell'intonazione, pronuncia di «Spesora».
- **Modello:** ho usato il modello da 0,6 miliardi. Quello da 1,7 miliardi è scaricato, ma la prova è stata terminata per memoria esaurita mentre girava insieme ad altri processi. Si può rifare da solo per un confronto.
- **Consenso:** la voce clonata è quella del file fornito. Per un uso commerciale serve il consenso della persona che l'ha registrata, oppure i diritti sulla voce se è stata generata da un altro servizio.
