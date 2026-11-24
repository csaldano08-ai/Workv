# Changelog · SPESORA COMEDY STUDIO

## 2026-11-25 (sera) · nuova voce e episodio con il metodo di recitazione

- **Voce:**
  - narrazione completa con `LUCASPESORA.mp3` come riferimento, senza nessuna elaborazione del tono (`voice_narration_ref.py`);
  - consegnata fuori dal repository pubblico.
- **Modalità recitazione** (`ADS_ACTING=1`) nel sistema degli attori:
  - transizioni sfalsate con anticipazione e superamento;
  - pause vive;
  - volto a parti;
  - sguardo con gli occhi che guidano;
  - braccia che seguono il passo;
  - pose di contatto pulite.
- **EP01:**
  - 20 battute di recitazione nuove;
  - saluti di Luca corretti (la mano era dentro la testa);
  - rilascio della maniglia corretto (difetto a 30 fps che il controllo a 15 fps non vedeva).
- **Controlli A–F** su tutti i 2808 fotogrammi a 30 fps: 0 problemi.

## 2026-11-25 · audit critico e test di recitazione (animatic rifiutato)

**Diagnosi** (`docs/08_AUDIT_ANIMAZIONE_E_AUDIO.md`, verificata nei sorgenti e misurata campionando i canali a 30 fps):
- immagini a 15 al secondo tenute 2 fotogrammi;
- pose a blocchi con un'unica transizione di 0,35 s per tutto il corpo;
- teste che saltavano sul nuovo bersaglio in un fotogramma (20 scatti al minuto per il protagonista);
- volti che cambiavano tutti insieme;
- testa e mani congelate nel 45% (protagonista) e 67% (Luca) dei fotogrammi;
- la mano del saluto di Luca era dentro la testa: il controllo guardava solo il busto.

**Aggiunto**
- `cs_acting.py`:
  - curve per canale con interpolazione per chiave (ease, out, in, back, hold voluto);
  - molle per il movimento secondario, ritardi per la sovrapposizione;
  - pause vive;
  - volto a parti (sopracciglia in anticipo, bocca in ritardo).
- `test_recitazione.py`: test di 11,6 s a 30 fps veri.
  - Azione: camminata, fermata, telefono, lista, reazione di Luca, imbarazzo, sguardo in camera.
  - Sguardi con gli occhi che guidano la testa.
  - Gomiti risolti contro busto e testa.
  - Tre inquadrature dallo stesso lato della linea d'azione.
  - Controlli A, B, C, E, F per fotogramma.
- Modalità `audit` di `ep01_animatic.py` e `audit_plot.py` (grafici stile Graph Editor).
- `assemble_test.py`: test senza voce, passi sincronizzati agli appoggi. `compare_test.py`: confronto affiancato prima/dopo.
- Narrazione **v2 PROPOSTA** (`voice_narration_v2.py`, `audio/narrazione_v2_PROPOSTA/`):
  - 1.7B, riferimento naturale, paragrafi interi;
  - **nessuna compressione dell'intonazione** (era la causa della voce piatta).

**Bloccato:** generazione delle voci senza `VOCE_AUTORIZZATA=1`; nessuna voce scelta come definitiva.

**Non fatto:**
- confronto con il video del matrimonio: i file `1000068463.mp4` e `1000068308.mp4` non sono arrivati nella sessione, e non ci sono sorgenti del matrimonio;
- episodio non rifatto, in attesa dell'approvazione del test.

## 2026-11-24 · animatic EP01 renderizzato e verificato

**Aggiunto**
- Animatic completo (`renders/animatic/`):
  - `EP01_animatic.mp4` con etichette e `EP01_animatic_senza_etichette.mp4`;
  - stem audio (ambiente, narratore, effetti);
  - `timeline_voci.json`.
- Storyboard preso dall'animatic: 24 fotogrammi e una tavola (`shots/storyboard/`).
- Test E sulle immagini (`scripts/test_e_flicker.py`):
  - sfarfallio «A-B-A» su tutti i 1404 fotogrammi;
  - mappe per inquadratura in `renders/animatic/qc/test_e/`.
- Prova a qualità finale (`renders/prova_qualita_finale/`): tre impostazioni con tempi misurati.

**Corretto**
- 21 · inq. 07: mostrando il telefono, Luca finiva col viso sul telefono. Ora il telefono è all'altezza del petto e Luca guarda in giù. Inquadratura ricontrollata (test A, B, E, F) e ri-renderizzata.
- Report: luce della porta dell'ufficio 0,984 m (riportava ancora 0,784).
- Audio del montaggio normalizzato a −16 LUFS (era −21): `loudnorm` in `assemble_ep01.py`.

**Misurato**
- Animatic: 1404 immagini in 2 h 45 min (7,05 s ciascuna).
- Definitivo a 1080×1920: 5 min 7 s per fotogramma a 64 campioni, 1 min 24 s a 16 campioni.
- La stima precedente di 30–40 h per il definitivo era sbagliata: a 16 campioni servono circa 72 h su questa CPU.

## 2026-11-24 · fasi 4–6 (blockout, storyboard, animatic, prove critiche)

**Aggiunto**
- Supermercato costruito da una sola tabella (`cs_market.py`), con pianta generata dalla stessa tabella (`cs_plan.py`):
  - ingresso con vano vero e ante scorrevoli;
  - zona carrelli, ortofrutta, 3 corsie, 3 casse;
  - ufficio con porta a battente e maniglie.
- Oggetti di scena (`cs_props.py`): carrello con ruote che girano, cartelline con foglio scritto.
- Sei personaggi secondari dal telaio approvato: Luca, Anna, responsabile, direttore, due clienti.
- Sistema degli attori (`cs_actor.py`): soste, giri a piedi bloccati, camminate, pose della parte alta anche calcolate, sguardi, espressioni, labiale.
- EP01 (`ep01_animatic.py`): 25 inquadrature e tre modalità:
  - storyboard;
  - `qc`, controlli su ogni fotogramma senza render;
  - render.
- Montaggio (`assemble_ep01.py`): 1080×1920 con narrazione, ambiente, effetti, etichette e sottotitoli; i fotogrammi vanno direttamente a ffmpeg.
- Copione delle voci e piano di montaggio (`edit_plan.py` → `docs/07_…`); tavola dello storyboard (`storyboard_extract.py`, `storyboard_sheet.py`).

**Corretto:** 20 problemi, descritti in `docs/06_REPORT_FASI_4_6.md`. I principali:
- volti fermi per la cache delle texture;
- dettagli del telefono neri;
- personaggi che tornavano indietro;
- piedi che saltavano alla partenza;
- mano nell'anta;
- porta troppo stretta per i personaggi;
- dita davanti allo schermo.

**Verifica:** controlli A–F su tutti i 1404 fotogrammi dell'animatic, 0 problemi residui.

**Come vedere i risultati**
- Supermercato: `environments/supermercato/` (viste del blockout e pianta).
- Personaggi: `characters/cast_ep01/`.
- Storyboard: `shots/storyboard/STORYBOARD_EP01.jpg`.
- Animatic: `renders/animatic/EP01_animatic.mp4`, oppure la versione senza etichette.
- Controlli: `renders/animatic/qc/`.

## 2026-11-23 · fasi 1–2 (in attesa di approvazione)

**Aggiunto**
- Analisi del video di riferimento, con tavola annotata, e rapporto sulle skill realmente trovate.
- Sistema dei personaggi (`cs_char.py`): protagonista e variante femminile preliminare, rig ad armatura con IK, dita a 2 falangi, contorno a inchiostro, abiti dipinti.
- Volto 2D (`cs_face.py`): 14 espressioni, sguardo, battito, rossore, lacrime e sudore.
- Libreria di pose (`cs_pose.py`) con socket del telefono e tre risolutori:
  - presa: le dita si chiudono fino al contatto;
  - gomito: sceglie una direzione senza compenetrazioni;
  - contatto: avvicina la mano a un bersaglio fino a toccarlo.
- Camminata con impronte e foot locking (`cs_walk.py`) in tre stili: normale, imbarazzato, sicuro.
- Controlli geometrici su mesh valutate (`cs_qc.py`).
- Narrazione con la voce clonata dal file fornito (Qwen3-TTS):
  - versi rimossi frase per frase;
  - prese scelte con misure oggettive;
  - enfasi calmata nei punti calmi.

**Corretto durante le prove:** 15 problemi, descritti in `docs/04_REPORT_TEST_FASE2.md`.

**Come vedere i risultati**
- Tavole in `renders/tests/fase2/`: `TAVOLA_APPROVAZIONE_personaggio.jpg` riassume tutto.
- Camminate: `renders/tests/fase2/PROVA_CAMMINATE_EP01.mp4`.
- Narrazione: `audio/narrazione_clonata/EP01_narrazione_voce_clonata.mp3`.
