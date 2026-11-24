# Changelog · SPESORA COMEDY STUDIO

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
