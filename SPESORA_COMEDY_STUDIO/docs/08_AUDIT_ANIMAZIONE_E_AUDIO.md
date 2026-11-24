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

## 5 · Il test di recitazione (11,6 s)

`scripts/test_recitazione.py`. Montaggio: `scripts/assemble_test.py`. File in `renders/test_recitazione/`.

| Tempo | Azione (tutta animata, nessuna posa ferma con stacco) | Principi applicati |
|---|---|---|
| 0,0–4,0 s | Il protagonista cammina per 6 passi a impronte bloccate. Guarda il telefono, poi le cassette di verdura, poi di nuovo il telefono, poi nota Luca. | Occhi prima della testa; la mano col telefono oscilla meno di quella libera e la segue con una molla. |
| 3,96 s | Si ferma davanti a Luca: ultimo passo corto, assestamento, peso sulla gamba destra. | Trasferimento del peso. |
| 4,0–4,8 s | Solleva il telefono: prima abbassa la mano e porta il busto indietro, poi sale veloce, supera di poco e si posa. | Anticipazione, azione, superamento, assestamento. |
| 4,6–5,4 s | Legge (inquadratura sopra la spalla: si vede lo schermo). | Pausa viva: piccole derive, respiro. |
| 5,5–6,0 s | Ritira il telefono verso di sé, poi lo porge a Luca girandolo; con la destra fa «ecco», palmo in su; si sporge col busto. | Anticipazione del porgere, sovrapposizione mano, busto, testa. |
| 5,6–6,6 s | Luca guarda il telefono (gli occhi in 2 fotogrammi, la testa dopo), si sporge a leggere e porta il bacino indietro. Strizza gli occhi. | Peso, sguardo, volto a parti. |
| 6,6–7,3 s | La reazione di Luca: si contrae (spalle su, testa giù), poi sobbalza (occhi tondi, sopracciglia oltre la posa, bocca a «o», cartellina che salta), si assesta, capisce e sorride. | Contrazione e allungamento, superamento, assestamento. |
| 7,4–8,1 s | Luca fa il saluto «sissignore»: la mano scende un attimo, sale ad arco lontano dal petto e si posa alla tempia con un piccolo superamento. Due cenni. | Anticipazione e arco. |
| 8,1–9,3 s | Il protagonista passa da speranzoso a confuso (testa inclinata, sopracciglia asimmetriche) e poi a imbarazzato: spalle su, rossore che sale, goccia di sudore, telefono ritirato al petto, peso indietro. | Le sopracciglia partono prima, la bocca dopo; il corpo si chiude. |
| 9,0–9,6 s | Abbassa lo sguardo, poi guarda in camera: prima gli occhi, poi la testa, con un leggero superamento. | Sguardo che guida. |
| 9,6–11,6 s | Pausa comica in camera, voluta: respiro, battito lento, un sopracciglio che si alza e torna. | Pausa voluta, non animazione mancante. |

Inquadrature: tutte dallo stesso lato della linea d'azione.
- **1 · campo largo di 3/4:** la camera segue con ritardo (molla).
- **2 · sopra la spalla sinistra del protagonista:** lo schermo del telefono e il viso di Luca.
- **3 · primo piano pulito del protagonista:** lenta spinta in avanti.

Audio: nessuna voce. Ci sono l'ambiente del negozio, i **passi sincronizzati agli appoggi reali dei piedi**, il fruscio del telefono, il sobbalzo e i tacchi del saluto. I marcatori delle battute N04 e N05 sono in `marcatori.json` e nella versione con etichette.

## 6 · Risultati

### Controlli geometrici per fotogramma (347 fotogrammi, tutti)

| Test | Cosa | Risultato |
|---|---|---|
| A · Intersezioni | Per ogni braccio e ogni mano di entrambi i personaggi: contro busto **e testa**. Busti contro l'ambiente, busti tra loro, teste tra loro, mano dentro il telefono. | ✅ **0 mm** |
| B · Oggetti | telefono dentro busti, teste e altra mano; cartellina dentro i corpi; mani e braccia di Luca dentro il protagonista | ✅ **0 mm** |
| C · Camminata | scivolamento del piede in appoggio tra due fotogrammi; suole rispetto al pavimento | ✅ max **0,64 mm**; suole a 2,0 mm |
| E · Camera | distanza minima dai personaggi | ✅ **499 mm** |
| F · Telefono | vertici della mano davanti allo schermo | ✅ **0** |

Per arrivare a 0 il controllo ha trovato e fatto correggere:
- braccia del protagonista nel busto (254 fotogrammi, fino a 18,9 mm), risolte dal rig;
- telefono nella pancia durante la camminata (10,4 mm): telefono più avanti, oscillazione ridotta;
- braccio del saluto nella testa di Luca (52,8 mm): nuova posa del saluto, risolutore dei gomiti esteso alla testa;
- mano di Luca nel petto mentre sale al saluto (60 mm): arco laterale e rotazione della mano solo sopra il petto. Inoltre la sua mano «di riposo», scritta a mano, toccava il busto ed è stata sostituita con quella del rig.

### Movimento, misurato sulle curve (`docs/audit/confronto_movimento.json`)

| Misura | Episodio rifiutato | Test |
|---|---|---|
| Immagini al secondo | 15, ognuna ripetuta | **30**, una per fotogramma |
| Protagonista: testa e mani congelate | 45,3% dei fotogrammi, fino a 4,97 s di fila | **0%** |
| Protagonista: quasi fermo (sotto 0,8 mm e 0,15° per fotogramma) | 65,6% | **20,1%** |
| Luca: congelato | 67,2%, fino a 4,17 s | **0,6%**, 2 fotogrammi |
| Luca: quasi fermo | 73,6% | 55,5%: pause vive mentre ascolta (respiro e derive sotto la soglia) |
| Scatti della testa (salto > 4° in un fotogramma, 2,5 volte i vicini) | protagonista 20/min, Luca 12,5/min | **0** |
| Transizioni | una sola curva di 0,35 s per tutto | curve diverse per canale, con anticipazioni e superamenti |

Grafici:
- `docs/audit/CURVE_supermercato_protagonista_0-30s.png` e `CURVE_supermercato_luca_12-31s.png`: gradini, salti verticali, fasce grigie di immobilità;
- `CURVE_test_recitazione_protagonista.png` e `CURVE_test_recitazione_dipendente.png`: curve continue, sovrapposte, con superamenti e assestamenti.

### Immagine (test E) e verifica visiva

- **Fotogrammi:** 347 renderizzati a 540×960 con 6 campioni, montati a 1080×1920 e 30 fps. **Nessun fotogramma identico al precedente**: lo stop-motion è eliminato alla radice.
- **Sfarfallio:** pixel «A-B-A» isolati al massimo 0,28% (nell'animatic 0,53%). Sono solo fughe del pavimento in movimento e bordi delle parti animate. Nessun rumore né z-fighting sulle superfici ferme (mappe in `renders/test_recitazione/qc/`).
- **Verifica visiva della recitazione**, sulle tavole a fotogrammi consecutivi `renders/test_recitazione/TAVOLA_01…04.jpg`:
  - camminata con appoggi credibili e braccio libero che oscilla, il telefono che segue;
  - fermata con trasferimento del peso;
  - telefono sollevato con anticipazione e piccolo superamento, poi porto girandolo;
  - Luca che si sporge strizzando gli occhi, si contrae, sobbalza (occhi tondi, «o», cartellina che salta) e si assesta nel sorriso;
  - saluto ad arco fino alla tempia, con due cenni;
  - protagonista confuso, poi imbarazzato (rossore che sale, goccia, spalle su), sguardo in basso e poi in camera: prima gli occhi, poi la testa.
- **Due correzioni dopo la prima visione**, entrambe ri-renderizzate e ricontrollate (0 problemi):
  - nell'inquadratura 2 la testa del protagonista copriva il viso di Luca: camera 30 cm più di lato;
  - nella 3 lo sguardo in basso nascondeva il viso: sguardo meno chinato.
- **Tempo di rendering:** 61 min per 347 fotogrammi (9,3 s ciascuno, CPU a 4 core).

## 7 · Confronto visivo

- **Con il matrimonio: non eseguito** (video non arrivato). È la verifica più importante che manca.
- **Con l'episodio rifiutato:** `renders/test_recitazione/CONFRONTO_prima_dopo.mp4` mette affiancate la stessa azione (12,0–23,6 s dell'episodio) e il test.

## 8 · Problemi ancora presenti

1. **Manca il confronto con il matrimonio**: video non arrivati, nessun sorgente. È la verifica che la richiesta considera decisiva, e non l'ho fatta.
2. Il metodo nuovo è applicato **solo al test**. L'episodio di 90 s usa ancora il sistema vecchio e va ricostruito con `cs_acting` dopo l'approvazione (come richiesto, non l'ho rifatto).
3. **Pause di Luca:** è «quasi fermo» nel 55% dei fotogrammi. Non è congelato (0,6%), sono pause d'ascolto con respiro e derive lente sotto la soglia della misura. Va giudicato a occhio. La **mano con la cartellina** però resta ferma rispetto al corpo nelle pause: da animare con una piccola deriva.
4. **Inquadratura 2:** per circa 0,6 s, mentre il protagonista china la testa sul telefono, metà del viso di Luca resta coperta (tipico del campo sopra la spalla, ma si può aprire di più).
5. **Sorriso del saluto:** la bocca «denti in vista» può sembrare una smorfia più che orgoglio. Da valutare a occhio; in alternativa, sorriso aperto.
6. **Schermo del telefono:** è la schermata vera di Spesora, che mostra «Cipolla 1,5 pz» e non «Cipolle — 4» (vedi l'animatic). Nel test, alla distanza del campo sopra la spalla, non si legge.
7. **Qualità d'immagine da prova:** 540×960 con 6 campioni. Le fughe del pavimento tremolano un poco nei movimenti di camera. Il definitivo va a 1080×1920 (vedi `README`).
8. **Labiale:** nessuno, perché il test è senza voci. Va fatto sulle voci registrate.
9. **Narrazione v2:** scelta con misure, non con l'ascolto. Da ascoltare: N09–N10 più piatte; N03 che sale alla fine; pronuncia di «Spesora».

## 9 · Consegna

| File | Contenuto |
|---|---|
| `renders/test_recitazione/TEST_recitazione.mp4` | Il test, 11,6 s, 1080×1920, 30 fps, senza voce (ambiente e passi sincronizzati) |
| `renders/test_recitazione/TEST_recitazione_etichette.mp4` | Uguale, con il numero dell'inquadratura, il tempo e i marcatori delle battute N04 e N05 |
| `renders/test_recitazione/TEST_recitazione_ANTEPRIMA_narrazione_v2.mp4` | Anteprima con N04 e N05 della narrazione v2 (proposta) ai marcatori |
| `renders/test_recitazione/CONFRONTO_prima_dopo.mp4` | Affiancato: la stessa azione nell'episodio rifiutato e nel test |
| `renders/test_recitazione/TAVOLA_0x_*.jpg` | Fotogrammi consecutivi dei momenti chiave |
| `renders/test_recitazione/qc/` | Controlli A–F per fotogramma, sfarfallio |
| `docs/audit/` | Grafici delle curve (prima e dopo), statistiche, confronto del movimento |
| `audio/narrazione_v2_PROPOSTA/` | Narrazione v2: traccia continua, battute, marcatori, misure |


## 10 · Aggiornamento: nuova voce e episodio completo con il metodo nuovo

### Voce del narratore: `LUCASPESORA.mp3`

Richiesta: usare questa voce come base **senza comprimere emozioni o stile di parlata**; il tono è già quello giusto.
Script: `scripts/voice_narration_ref.py`, eseguito con `VOCE_AUTORIZZATA=1` perché l'utente l'ha chiesto esplicitamente.

- **Riferimento:** la registrazione intera (27,6 s, il testo di N01–N08), senza tagli né filtri.
  - Lo spettrogramma delle pause non mostra versi estranei: c'è solo un respiro naturale, lasciato com'è.
  - L'energia nelle pause è la coda delle parole, che Whisper chiude in anticipo.
- **Elaborazioni:** nessuna su intonazione e dinamica. Solo il taglio dei silenzi agli estremi e lo stesso guadagno per tutte le battute. Il testo è identico al copione.
- **Scelta delle prese:**
  - testo esatto;
  - nessun verso fuori dal parlato;
  - timbro, intonazione e velocità più **vicini** alla registrazione (né più piatti né più enfatici).
- **Risultato:** 16 battute, 61,5 s. Ogni battuta ha il testo esatto dopo il taglio.

| Misura | Valore |
|---|---|
| Somiglianza con la registrazione | 0,965–0,988 |
| Deviazione dell'intonazione | 3,2–4,2 semitoni (la registrazione ha 3,6) |
| Velocità | 5,6–6,5 sillabe/s (la registrazione 5,4) |

- **Tempi:** tutte le battute stanno nei marcatori dell'episodio. I margini minimi sono 0,2 s dopo N01 e 0,28 s dopo «Il problema?».
- **Riservatezza:** la registrazione e la narrazione generata **non sono nel repository**, che è pubblico. Sono consegnate direttamente all'utente.

### Episodio con il metodo del test (`ADS_ACTING=1`)

Il metodo del test è stato portato nel sistema degli attori (`cs_actor.py`, `cs_walk.py`). Tutto è calcolato dal tempo, quindi il rendering a blocchi resta identico.
- **Transizioni sfalsate:** il torace guida, le mani seguono con superamento (solo verso l'esterno) e anticipazione sui gesti grandi, la testa arriva per ultima.
- **Pose di contatto:** maniglia, cartellina e telefono senza superamento né derive. Alla porta si usa l'animazione già verificata.
- **Pause vive:** respiro e derive lente. Le derive delle mani vanno solo verso l'esterno.
- **Volto a parti** e **sguardo** con gli occhi che guidano la testa (superamento e assestamento), più i battiti sui cambi di sguardo.
- **Braccia che seguono il passo**, con 0,06 s di ritardo.
- **Correzione continua:** se un braccio tocca il busto, la mano si sposta all'esterno di pochi millimetri.
- **20 nuove battute di recitazione:**
  - i sobbalzi di Luca;
  - la lettura e il pollice in su;
  - i cenni del saluto;
  - le spalle su e la finta sicurezza del protagonista;
  - la sorpresa del personale;
  - il panico;
  - la sorpresa davanti al direttore;
  - il finale.
- **Saluti di Luca corretti:** i due saluti dell'episodio avevano la mano dentro la testa.
- **30 fps veri.**

**Controlli A–F su tutti i 2808 fotogrammi a 30 fps.** Il controllo intero è stato fatto, poi ripetuto sui tratti corretti: **0 problemi**. Per arrivarci si sono corretti:
- braccia del protagonista nel busto fino a 4,6 mm, dovute al torace che guida e al respiro;
- mano nel telaio della porta fino a 12,7 mm al rilascio della maniglia;
- un contatto di 0,85 mm a 69,7 s che **c'era già nell'animatic** ma non era stato visto, perché il controllo a 15 fps saltava quel fotogramma.

**Limiti noti:**
- Le inquadrature sono ancora quelle dell'animatic. Nelle inquadrature 05, 09 e 10 Luca è di spalle e le sue reazioni non si leggono bene. Rifare la regia come nel test, cioè sopra la spalla e in controcampo, è il passo successivo.
- Il confronto con il video del matrimonio non c'è ancora.
