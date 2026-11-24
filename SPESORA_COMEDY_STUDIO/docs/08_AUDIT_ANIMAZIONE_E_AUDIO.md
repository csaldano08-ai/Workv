# 08 · Audit critico dell'animazione e dell'audio del supermercato

Data: 25/11. Richiesta: capire perché il supermercato (rifiutato) è lontano dal video del matrimonio (approvato), correggere il metodo e dimostrarlo con un test di 10–12 s prima di toccare l'episodio.

## 0 · Cosa avevo davvero (e cosa no)

| Materiale | Stato |
|---|---|
| `1000068463.mp4` (supermercato, rifiutato) | **Non arrivato nella sessione.** Nella cartella dei caricamenti ci sono solo i file del 21–23/11. Presumo che sia l'animatic che ho consegnato (`renders/animatic/EP01_animatic.mp4`, 95 s): **da confermare**. |
| `1000068308.mp4` (matrimonio, riferimento) | **Non arrivato.** |
| Sorgenti del matrimonio (blend, script, rig, impostazioni) | **Non disponibili.** Non c'è nessun progetto «matrimonio» in questo repository. Ho aggiunto alla sessione il repository `EconomyAnimation` a titolo di tentativo, ma non l'ho scaricato né letto. L'aggiunta del repository `Animation` è stata rifiutata dal sistema dei permessi. Non ho cercato altrove. |
| Sorgenti del supermercato | **Tutti disponibili**, e sono quelli analizzati qui. |

Conseguenza: **il confronto con il matrimonio (punti 1 e 7) non l'ho potuto fare.** Tutto ciò che segue sul supermercato è misurato nei file; sul matrimonio non affermo niente. Le differenze tra i due progetti si potranno verificare quando avrò il video e, se esistono, i sorgenti.

## 1 · Skill effettivamente usate

- **Supermercato:** nessuna skill di Blender. Non ne esistono né in questo ambiente né nei pacchetti caricati (`Workflow_01/02.zip` contiene un motore **2D**). Il metodo 3D è stato scritto da me in questo progetto (`docs/02_SKILL_UTILIZZATE.md`).
- **Matrimonio:** non verificabile senza i suoi file.

## 2 · Come era fatta l'animazione del supermercato (verificato nei sorgenti)

L'animazione **non usa keyframe di Blender**. `ep01_animatic.py` ricalcola la posa di ogni personaggio a ogni fotogramma in Python (`cs_actor.py`), quindi non esistono Action o F-curve da aprire nel Graph Editor.
Per guardarne le «curve» ho aggiunto una modalità di campionamento (`ADS_MODE=audit`): registra a 30 fps, per ogni personaggio in scena, mani, testa (dopo lo sguardo), torace, bacino, espressione, bersaglio dello sguardo e palpebre. I grafici sono in `docs/audit/CURVE_supermercato_*.png`, le misure in `docs/audit/statistiche_supermercato.json`.

| Problema percepito | Causa trovata nei sorgenti | Dove | Misura |
|---|---|---|---|
| **Effetto stop-motion** | Animatic renderizzato a 15 immagini al secondo, ognuna ripetuta per 2 fotogrammi | `run_animatic.sh` (`ADS_STEP=2`), `assemble_ep01.py` | 50% dei fotogrammi sono copie del precedente |
| **Troppo statico** | Ogni posa è un blocco fermo; le soste sono una posa di riposo più un «respiro» di ±0,8° del torace | `Hold.at`, `upper_at` in `cs_actor.py` | Protagonista: testa e mani **congelate nel 45%** dei fotogrammi (fino a 5,0 s di fila), quasi fermo nel 65,6%. Luca: congelato nel 67%, quasi fermo nel 73,6%. Su tutti i personaggi, quasi fermi il 69% del tempo. |
| **Movimenti artificiali** | Una sola transizione di 0,35 s con curva cosinusoidale, uguale per tutto il corpo: mani, gomiti, testa e torace partono e arrivano insieme. Nessuna anticipazione, nessun superamento, nessun assestamento, nessuna sovrapposizione | `upper_at` (`trans=0.35`, `ease`) | Nei grafici: gradini con la stessa curva a S, poi linee piatte |
| **Scatti involontari** | Quando cambia il bersaglio dello sguardo, la testa ruota verso il nuovo bersaglio **nello stesso fotogramma** (nessun inseguimento) | `look()` in `cs_actor.py`, chiamata ogni fotogramma in `apply_actor` | Protagonista: **12 scatti** in 0–30 s (54° in un fotogramma a 2,9 s). Luca: 6 scatti in 12–31 s (48° a 6,2 s). |
| **Espressioni povere** | Il volto cambia tutto insieme (occhi, sopracciglia, bocca) in 0,15 s lineari; le sopracciglia non anticipano; i battiti sono casuali, slegati dagli sguardi; il labiale è un ciclo fisso di vocali a 9 Hz | `face_at`, `blink_at`, `talk_at` | Protagonista: 30 cambi d'espressione in 93 s, tutti dello stesso tipo |
| **Interazioni poco sviluppate** | Il telefono si «mostra» girando la mano in due tempi, senza ritirarlo prima né porgerlo; le reazioni sono un cambio d'espressione senza corpo | `ep01_animatic.py`, scene 06–07 | Verifica visiva |
| **Contatti non credibili (nascosto)** | La mano del saluto di Luca era **dentro la sua testa** (a 27,6 cm dal centro, con raggio 29 cm). Il controllo dell'episodio confrontava le braccia solo con il busto. | Posa del saluto, `qc_frame` | Trovato rifacendo il controllo con la testa |
| Camminata | Buona nelle impronte (scivolamento ≤ 0,87 mm), ma braccia e testa sono calcolate dalla fase del passo senza alcun ritardo | `cs_walk.py` | Verifica visiva |
| Camera | Due chiavi per inquadratura, stessa curva cosinusoidale | `place_camera` | — |

Riassunto: il problema non era il rendering, ma **il metodo d'animazione**. Si trattava di pose a blocchi raggiunte tutte con la stessa transizione, teste che saltavano, volti che cambiavano in un colpo solo, e un'immagine ogni due fotogrammi.

## 3 · Correzioni effettuate (metodo nuovo)

`scripts/cs_acting.py`, usato dal test `scripts/test_recitazione.py`.

1. **Curve per canale, con l'interpolazione scelta chiave per chiave**, come nel Graph Editor:
   - `ease`: cubica lenta-veloce-lenta;
   - `out`: parte veloce e frena, per i gesti che «scattano» e si posano;
   - `in`: accelera;
   - `back`: supera la posa del 7% e torna, per gli accenti comici;
   - `back_small`: supera del 2%;
   - `linear`;
   - `hold`: solo dove la pausa è voluta.

   Non è Bézier automatica dappertutto, e non ci sono rallentamenti infiniti.
2. **Sovrapposizione**:
   - bacino, torace e testa hanno chiavi diverse;
   - le mani seguono il corpo con una molla (ritardo, superamento, assestamento);
   - la testa parte 2 fotogrammi dopo gli occhi e si assesta con una molla.
3. **Sguardo vero**: gli occhi arrivano al bersaglio in 2 fotogrammi, la testa li segue, e intanto gli occhi compensano. Niente teste che saltano.
4. **Volto a parti**:
   - ogni parametro (sopracciglia, apertura degli occhi, pupille, bocca, rossore, sudore) ha la sua curva;
   - le sopracciglia partono 0,08 s prima;
   - la bocca segue 0,06 s dopo;
   - i cambi di forma (occhi tondi, bocca a «o») cadono dentro la transizione;
   - i battiti cadono sui cambi di sguardo, più un battito lento voluto.
5. **Peso**:
   - il bacino si sposta prima dei gesti (anticipazione) e dopo (assestamento);
   - chi si sporge porta il bacino indietro;
   - nel sobbalzo il corpo prima si schiaccia e poi si allunga.
6. **Pause vive**: respiro e derive lente su testa, torace e bacino («moving hold»). Ferme ma non congelate.
7. **30 fps veri**: un'immagine renderizzata per ogni fotogramma.
8. **Gomiti risolti dal rig** (contro busto **e** testa) dove il gesto li farebbe entrare nel corpo. Poi vengono interpolati, così nessun gomito salta.
9. **Regia di copertura**:
   - campo largo di tre quarti sulla camminata;
   - sopra la spalla del protagonista: si vedono la lista sullo schermo e il viso di Luca;
   - controcampo sopra la spalla di Luca: il viso del protagonista, che guarda in camera.

   Tutte le camere stanno dallo stesso lato della linea d'azione.

## 4 · Audio: com'era fatto e cosa cambia

### Sistema usato per il video rifiutato

| Voce | Valore |
|---|---|
| Modello | Qwen3-TTS-12Hz-**0.6B**-Base (Apache-2.0), su CPU |
| Clonazione | Sì, in modalità ICL: audio di riferimento più la sua trascrizione |
| File di riferimento | `ItalianoSpesora.mp3` (28,5 s), ripulito e diviso in 8 frasi (`audio/sorgente_narratore/frasi_pulite/F01–F08`) |
| Riferimenti per tono | calmo: F04 + **F08** (la frase più piatta); racconto: F04 + F05; vivace: F04 + F06 |
| Parametri | temperatura 0,9 (predefinita), 3–7 prese per battuta, scelta automatica con Whisper (testo esatto), WavLM (somiglianza) ed escursione d'intonazione |
| Elaborazioni | **compressione dell'intonazione con PSOLA** fino a 2,8 / 4,2 / 4,8 semitoni (calmo / racconto / gag), compressione del volume sulle battute calme, livellamento |
| Sincronizzazione | ogni battuta è un file separato, posato al tempo d'inizio scritto nel copione (`NARR` in `ep01_animatic.py`), senza adattamento al taglio |

**Cause verificate della voce «senza effetto»:**
1. il modello piccolo (0,6B);
2. il riferimento piatto (F08) per le battute calme;
3. soprattutto, l'intonazione compressa a posteriori con PSOLA: deviazione di 2,2–2,8 semitoni contro 3,1–5,3 dell'originale;
4. 16 frasi generate una per una, ognuna con il suo attacco e la sua chiusa, quindi senza legato tra le frasi.

### Cosa ho fatto

- **Generazione delle voci bloccata**: `voice_clone_narration.py` e `voice_narration_v2.py` si fermano senza `VOCE_AUTORIZZATA=1`. Nessun modello sceglie da solo una voce definitiva.
- Il **test di recitazione è senza doppiaggio**. Le battute del narratore sono solo marcatori, in `marcatori.json` e nella versione con etichette.
- **Narrazione v2: proposta, non definitiva.** L'ho fatta perché nel messaggio mi hai chiesto esplicitamente di rifare la voce che mi hai mandato. Script `voice_narration_v2.py`. Cosa cambia:
  - modello 1.7B;
  - riferimento = il racconto naturale (F01 + F06 + F04);
  - **nessuna compressione dell'intonazione**;
  - generazione per paragrafi, poi taglio nelle pause tra le frasi;
  - tocchi minimi di punteggiatura (una pausa prima di «le cipolle» e di «nemmeno una cipolla»), senza forzare.

  Scelta delle prese:
  - testo esatto;
  - nessun verso;
  - voce simile all'originale;
  - intonazione **non più piatta** dell'originale;
  - velocità simile.

  I risultati sono nella sezione 6.

## 5 · Il test di recitazione (10–12 s)

_(risultati nella sezione 6)_

## 6 · Risultati

_(in compilazione)_

## 7 · Problemi ancora presenti

_(in compilazione)_
