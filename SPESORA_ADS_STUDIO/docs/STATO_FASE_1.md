# Stato della fase 1

## Correzione importante

La prima consegna (`episodes/EP01/animatic/`) era fatta di **pose fisse con zoom e tagli**, quindi il movimento andava a scatti: non era lo stile richiesto.
È **superata**. La versione corrente è un'**animazione continua a 30 fps** (`episodes/EP01/animazione/`), con rig, movimento fluido e facce animate.

## Cosa c'è ora

- `episodes/EP01/animazione/spesora_ep01_animazione_bozza.mp4`: bozza animata di 35 s, 1080×1920, 30 fps (versione pulita).
- `episodes/EP01/animazione/spesora_ep01_animazione_bozza_con_sottotitoli.mp4`: stessa bozza con sottotitoli provvisori, indicazioni di effetti sonori/musica e timecode.
- `episodes/EP01/animazione/ep01_cucina_animata.blend`: sorgente Blender (cucina, personaggi con rig, telefono, telecamere, keyframe su ogni fotogramma).
- Rig e viso animabile: `scripts/rig_hero.py`, `rig_mina.py`, `rig_common.py`, `facekit.py`; animazione: `anim.py`, `ep01_anim.py`; montaggio: `assemble_ep01.py`, `fx2d.py`.
- Come funziona e come si modifica: `docs/RIG_E_ANIMAZIONE.md`.

## Tempi misurati

- Bake dei keyframe (960 fotogrammi): circa 7 s.
- Render bozza (Cycles CPU, 4 core, 540×960, 10 campioni, adattivo): circa 5–6,5 s a fotogramma. Tutta la sequenza (960 fotogrammi) ha richiesto circa 1 h 40 min,
  più circa 14 min per rifare due tratti corretti. Il risultato è rumoroso e a bassa risoluzione: è una bozza.
- **Render finale non stimato in modo affidabile**: 1080×1920 ha circa 4 volte i pixel e servono molti più campioni. Eevee non gira in questo ambiente (nessuna GPU/EGL).
  Va misurato su una macchina con GPU prima di promettere una consegna.

## Problemi noti

- Rumore e bassa risoluzione (bozza).
- Le gambe del protagonista sono rigide (pongo): la camminata è un'oscillazione, non un passo vero.
- Nessun labiale reale: la bocca cambia forma a ritmo irregolare durante il parlato; il labiale vero si fa sulle registrazioni.
- Il rig è una gerarchia di giunti con IK via codice, non un'armatura Blender con controlli per un animatore.
- Mina è un libro rigido: l'espressività viene da viso, copertina e braccia, non da deformazioni.
- Lo schermo del telefono nei primi secondi del tratto 11–12 è ancora sovraesposto.
- La cucina è semplificata; le luci vanno rifinite.
- Nessuna voce, nessun effetto, nessuna musica (solo segnaposto). Nessuna licenza da verificare finché non si scelgono gli asset.

## Skill e strumenti

Nell'ambiente non c'erano skill Blender. I workflow allegati (`Workflow_01/02.zip`) sono un motore 2D Python/skia e non sono stati usati.
Blender 5.3 è usato come modulo Python (`bpy`) in un ambiente separato (non nel repository). Il video allegato è usato come riferimento di stile.
