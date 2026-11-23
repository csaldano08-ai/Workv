# SPESORA COMEDY STUDIO

Cortometraggi comici animati in Blender per la serie promozionale di Spesora (pubblico italiano, verticale 1080×1920, 30 fps).
Progetto separato dall'app (`spesora/`) e dagli spot (`SPESORA_ADS_STUDIO/`): non modifica il codice dell'app.

**Episodio 01:** *L'uomo che diventò direttore del supermercato* (≈ 90 s).

## Stato

| Fase | Stato |
|---|---|
| 1 · Analisi del video di riferimento | ✅ `docs/01_ANALISI_REFERENCE.md`, `docs/reference/TAVOLA_analisi_reference.png` |
| Skill realmente trovate | ✅ `docs/02_SKILL_UTILIZZATE.md` (il workflow di Rick è 2D: nessuna skill Blender installata) |
| 2 · Personaggio base, variante femminile, rig, prove | ✅ in attesa di approvazione · `renders/tests/`, `docs/03_PERSONAGGI_E_RIG.md`, `docs/04_REPORT_TEST_FASE2.md` |
| 3 · Approvazione | ⏳ serve il via dell'utente prima di proseguire |
| 4 · Blockout del supermercato | non iniziato (dopo l'approvazione) |
| 5 · Storyboard e animatic | non iniziato |
| 6 · Prove critiche: carrello, porta, scaffali | non iniziato |
| 7–8 · Animazione e render definitivi | non iniziati |

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
NO_RENDER=1 python scripts/cs_test_walk.py out sicuro lato            # solo i controlli, senza render
```

Render: Cycles su CPU. Eevee non è utilizzabile in questo ambiente, che non ha GPU.
