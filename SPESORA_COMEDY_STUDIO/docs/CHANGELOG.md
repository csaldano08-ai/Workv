# Changelog · SPESORA COMEDY STUDIO

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
