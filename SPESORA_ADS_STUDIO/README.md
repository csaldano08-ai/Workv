# SPESORA ADS STUDIO

Studio di produzione delle pubblicità animate di Spesora (Blender, stile 2.5D).
Questa cartella è **separata** dal codice dell'app (`spesora/`): non modifica la logica di Spesora.

## Stato

Fase attuale: **EP01 in due versioni complete** (voci ancora provvisorie):

- `episodes/EP01/SPESORA_EP01_NARRATORE/`: versione A, narratore + Mina, protagonista muto. Rapporto: `REPORT_SPESORA_EP01_NARRATORE.md`.
- `episodes/EP01/SPESORA_EP01_DIALOGHI/`: versione B, protagonista parlante + Mina. Registro: `REGISTRO_CORREZIONI_SPESORA_EP01_DIALOGHI.md`, test: `REPORT_TEST_SPESORA_EP01_DIALOGHI.md`.

Ogni cartella contiene: MP4 1080×1920 con sottotitoli provvisori, versione senza dialoghi, anteprima 540×960, file `.blend`, tracce audio separate
(voci vuote da sostituire, SFX, musica, ambiente), copione temporizzato, guide di registrazione e timeline dei marcatori.

Script della versione attuale: `scripts/ep01_v2.py` (scena, animazione e render; `ADS_VERSION=A|B`), `scripts/assemble_v2.py` (interfaccia reale sullo schermo,
sottotitoli, outro, export), `scripts/outro.py`, `scripts/audio_ep01.py` (effetti, musica e ambiente originali sintetizzati in codice), `scripts/docs_v2.py` (copioni e guide).
Il `.blend` legge l'interfaccia dell'app come sequenza di immagini registrata con `scripts/capture_ui_video.cjs` (non inclusa nel repository per peso: 108 MB).

La bozza precedente (`episodes/EP01/animazione/`) e l'animatic a pose fisse (`episodes/EP01/animatic/`) sono superati.
Il design scelto è quello **ricalcato dalla scheda di riferimento del cliente** (`scripts/hero.py`, `scripts/faces2.py`).
Le prime tre varianti A/B/C (`scripts/characters.py`, `renders/previews/concept_protagonista/`) sono superate e restano solo come storico.
Non è stato prodotto nessun video dell'episodio.

Struttura prevista (le cartelle vuote sono segnaposto): `characters/`, `environments/`, `props/`, `rigs/`, `expressions/`,
`episodes/EP01/`, `audio/{voices,sfx,music}/`, `renders/{previews,final}/`, `scripts/`, `docs/`.

## Cosa c'è

- `scripts/hero.py` + `scripts/faces2.py` + `scripts/render_hero.py` + `scripts/boards_hero.py`: **protagonista ricalcato dal riferimento**
  (testa tonda, busto rastremato, braccia grosse, gambe tozze, naso rosso 3D, occhi come il riferimento, sopracciglia nere rialzate come pongo,
  maglietta nera). Tavola in `renders/previews/concept_protagonista_ricalcato/`.
- `scripts/mina.py` + `scripts/faces_mina.py` + `scripts/render_mina.py` + `scripts/boards_mina.py`: **Mina in 3D** fedele al design
  approvato (libro 3D con cerniera sulla copertina, faccia e illustrazioni 2D). Tavola in `renders/previews/concept_mina/`.
- `scripts/kitchen.py` + `scripts/render_ep01.py` + `scripts/animatic_ep01.py` + `scripts/capture_ui.cjs`: cucina 3D, fotogrammi chiave dell'episodio,
  montaggio dell'animatic (sottotitoli provvisori, indicazioni suoni/musica) e cattura delle schermate reali dell'app. Storyboard: `episodes/EP01/STORYBOARD_EP01.md`.
- `scripts/rig_hero.py`, `rig_mina.py`, `facekit.py`, `anim.py`, `ep01_anim.py`, `assemble_ep01.py`, `fx2d.py`: rig, viso animabile, animazione continua e montaggio. Vedi `docs/RIG_E_ANIMAZIONE.md`.
- `docs/COPIONE_VOCI_EP01.md`, `docs/PIANO_SUONI_EP01.md`, `docs/REGISTRO_LICENZE.md`: copione delle voci, piano suoni, registro licenze (vuoto).
- `scripts/faces.py` (storico A/B/C): sistema delle facce 2D (13 stati: neutro, felice, sorpreso, confuso, stanco, frustrato, imbarazzato,
  ironico, sguardo laterale, guarda in camera, occhi chiusi, semichiusi, sbadiglio).
- `scripts/characters.py`: costruzione del protagonista in Blender (3 varianti A/B/C), materiale pongo, faccia come decal
  proiettato sulla testa (resta ancorata alla curvatura quando la testa ruota), braccia senza mani con estremità a paletta.
- `scripts/phone.py`: smartphone di scena con la vera schermata "Oggi" dell'app (`props/spesora_oggi_screen.png`).
- `scripts/studio.py`: scena di studio (sfondo crema, 3 luci morbide, camera, Cycles CPU).
- `scripts/render_concepts.py`: render di turnaround, espressioni e prova col telefono.
- `scripts/boards.py`: tavole di presentazione.
- `renders/previews/concept_protagonista/`: le tavole dei concept.

## Come rigenerare i concept

Serve Python 3.13 con `bpy` (Blender come modulo), `pillow` e `numpy`:

```bash
python3 -m venv venv && venv/bin/pip install bpy pillow numpy
ADS_SCREEN=SPESORA_ADS_STUDIO/props/spesora_oggi_screen.png ADS_SAMPLES=48 \
  venv/bin/python SPESORA_ADS_STUDIO/scripts/render_concepts.py A /percorso/assoluto/output
venv/bin/python SPESORA_ADS_STUDIO/scripts/boards.py /percorso/assoluto/output /percorso/tavole
```

(Ripetere con `B` e `C`.) Il modulo `bpy` non è nel repository.

## Note oneste

- Le pose dei concept sono generate da codice (curve per le braccia, parametri per testa e busto): **non c'è ancora un rig**
  con armatura. Il rig riutilizzabile è il passo successivo, dopo l'approvazione del design.
- Non esiste ancora Mina in 3D, né la cucina, né l'audio.
- Nei workflow allegati (`Workflow_01/02.zip`) non ci sono skill Blender: contengono un motore 2D in Python (skia) per video
  scientifici. Non è stato usato per questi concept.
