# SPESORA ADS STUDIO

Studio di produzione delle pubblicità animate di Spesora (Blender, stile 2.5D).
Questa cartella è **separata** dal codice dell'app (`spesora/`): non modifica la logica di Spesora.

## Stato

Fase attuale: **concept del protagonista, in attesa di approvazione**.
Non è stato prodotto nessun video dell'episodio.

Struttura prevista (le cartelle vuote sono segnaposto): `characters/`, `environments/`, `props/`, `rigs/`, `expressions/`,
`episodes/EP01/`, `audio/{voices,sfx,music}/`, `renders/{previews,final}/`, `scripts/`, `docs/`.

## Cosa c'è

- `scripts/faces.py`: sistema delle facce 2D (13 stati: neutro, felice, sorpreso, confuso, stanco, frustrato, imbarazzato,
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
