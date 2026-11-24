# SPESORA COMEDY STUDIO

Cortometraggi comici animati in Blender per la serie promozionale di Spesora (pubblico italiano, verticale 1080×1920, 30 fps).
Progetto separato dall'app (`spesora/`) e dagli spot (`SPESORA_ADS_STUDIO/`): non modifica il codice dell'app.

**Episodio 01:** *L'uomo che diventò direttore del supermercato* (≈ 90 s).

## Stato

| Fase | Stato |
|---|---|
| 1 · Analisi del video di riferimento | ✅ `docs/01_ANALISI_REFERENCE.md`, `docs/reference/TAVOLA_analisi_reference.png` |
| Skill realmente trovate | ✅ `docs/02_SKILL_UTILIZZATE.md` (il workflow di Rick è 2D: nessuna skill Blender installata) |
| 2 · Personaggio base, variante femminile, rig, prove | ✅ `renders/tests/`, `docs/03_PERSONAGGI_E_RIG.md`, `docs/04_REPORT_TEST_FASE2.md` |
| Narrazione con voce clonata | ✅ `audio/README_NARRAZIONE.md`, `audio/narrazione_clonata/` |
| 3 · Approvazione | ✅ via libera dell'utente («vabene dai continua») |
| 4 · Blockout del supermercato + personaggi secondari | ✅ `environments/supermercato/`, `characters/cast_ep01/`, `docs/06_REPORT_FASI_4_6.md` |
| 5 · Storyboard e animatic | ⏳ rendering dell'animatic in corso; copione delle voci e piano di montaggio pronti (`docs/07_COPIONE_VOCI_E_MONTAGGIO_EP01.md`) |
| 6 · Prove critiche (carrello, porta, oggetti, camminate, telefono) | ✅ controlli su tutti i 1404 fotogrammi dell'animatic: 0 problemi (`renders/animatic/qc/`) |
| 7–8 · Animazione e render definitivi | ⏳ **in attesa di approvazione dell'animatic** |

## Struttura

```
scripts/      codice (personaggi, volto 2D, pose, camminata, controlli, scene, prove)
characters/   specifiche e tavole dei personaggi approvati (dopo l'approvazione)
rigs/         note e file del rig
assets/       oggetti di scena (telefono, carrello, prodotti…)
environments/ supermercato (blockout → definitivo)
animations/   azioni riutilizzabili (camminate, gesti)
shots/        file per inquadratura
renders/      tests/ (prove), animatic/, final/
audio/        copioni, effetti, musica (voci definitive fornite in seguito)
docs/         analisi, rapporti, changelog
```

## Requisiti e comandi

Python 3.13 con `bpy` (Blender come modulo), `pillow`, `numpy`; `ffmpeg` per i video.

```bash
python scripts/cs_face.py faces.png                                   # tavola 2D delle espressioni
python scripts/cs_test_phase2.py out turn,expr,arms,phone             # giro, espressioni 3D, braccia, telefono + controlli
python scripts/cs_test_walk.py out normale lato 960x540 10            # camminata + controlli fotogramma per fotogramma
python scripts/cs_test_market.py out                                  # supermercato: viste del blockout + controlli
python scripts/cs_test_cast.py out                                    # tavola dei personaggi + controlli
python scripts/cs_plan.py pianta.png                                  # pianta del set dalla stessa tabella del 3D
# EP01 (cartella di uscita = argomento)
ADS_MODE=storyboard ADS_RES=540x960 ADS_SAMPLES=10 python scripts/ep01_animatic.py out          # un fotogramma per inquadratura + controlli
ADS_MODE=qc ADS_STEP=2 ADS_RANGE=0-95 python scripts/ep01_animatic.py out_qc                    # controlli A–F su ogni fotogramma (senza render)
ADS_MODE=render ADS_STEP=2 ADS_RANGE=0-95 ADS_RES=432x768 ADS_SAMPLES=6 python scripts/ep01_animatic.py out   # animatic
python scripts/assemble_ep01.py out audio/narrazione_clonata/battute out/montaggio              # video 1080×1920 con audio
python scripts/storyboard_extract.py out && python scripts/storyboard_sheet.py out STORYBOARD_EP01.jpg 6
python scripts/edit_plan.py out/cue.json audio/narrazione_clonata/battute docs/07_COPIONE_VOCI_E_MONTAGGIO_EP01.md
```

Render: Cycles su CPU. Eevee non è utilizzabile in questo ambiente, che non ha GPU.
