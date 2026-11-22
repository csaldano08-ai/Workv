# Stato della fase 1 (animatic EP01)

## Strumenti e skill

- **Nessuna skill Blender era disponibile** nell'ambiente, e i workflow allegati (`Workflow_01/02.zip`) sono un motore 2D in Python (skia) per video scientifici: non contengono
  skill Blender e non sono stati usati. Il video `VID-...WA0019.mp4` allegato è stato usato come riferimento di stile (ambiente 3D + personaggi semplici con faccia 2D).
- Blender è usato come modulo Python: `bpy` 5.3.0 da PyPI, installato in un ambiente separato (non è nel repository).

## Cosa è stato realizzato

- Protagonista ricalcato dal riferimento del cliente (`scripts/hero.py`, `faces2.py`), 13 espressioni 2D.
- Mina 3D fedele al design ufficiale, occhi identici all'originale (`scripts/mina.py`, `faces_mina.py`).
- Cucina 3D di sera con frigorifero apribile e luce interna (`scripts/kitchen.py`).
- 12 fotogrammi chiave dell'episodio (`scripts/render_ep01.py`) e **animatic muto di 35 s** (`episodes/EP01/animatic/spesora_ep01_animatic.mp4`).
- Schermate reali dell'app catturate dalla demo (`props/ui/`, `scripts/capture_ui.cjs`).
- Copione delle voci, piano suoni, registro licenze (vuoto), tracce silenziose segnaposto con i nomi dei file da registrare.
- Sorgente Blender della cucina con i personaggi: `environments/kitchen/ep01_cucina.blend` (immagini incorporate).

## Cosa è stato testato davvero

- Tutti i render sono veri (Cycles, CPU, 4 core). Tempi misurati:
  - Mina: 19 immagini (640×800, 480×480, scena 1200×800), 48 campioni: circa 176 s in totale.
  - EP01: 12 fotogrammi 720×1280, 40 campioni: da 33 s a 59 s per immagine, circa 505 s in totale.
- **Eevee non ha potuto essere usato**: in questo ambiente non c'è scheda grafica né libreria EGL/Vulkan e Blender si interrompe. Non ho misurato Eevee.
- Stima (non misurata) per il render finale a 1080×1920 in Cycles CPU: circa 2,25 volte il costo di 720×1280, cioè 75–130 s per fotogramma.
  35 s a 30 fps sono 1050 fotogrammi: circa 22–38 ore di CPU su questa macchina. Per questo serve Eevee su una macchina con GPU, meno campioni,
  o un servizio di render. Il tempo definitivo va misurato prima di promettere una consegna.

## Problemi noti

- L'animatic non è animazione: sono fotogrammi chiave con zoom e tagli. Mancano i movimenti dei personaggi.
- Nessun rig con armatura: le pose sono generate da codice (tubi per le braccia). Il rig riutilizzabile è il passo successivo.
- Il sistema facciale cambia espressione per immagini intere: non ci sono ancora forme di bocca per il labiale italiano né transizioni fra espressioni.
- La transizione illustrata dell'ingresso di Mina dal telefono non è disegnata (c'è solo il fotogramma di Mina che sbuca).
- Nelle inquadrature S4b–S4d Mina è la posa 2D ufficiale usata come segnaposto.
- Scala di Mina e del telefono sono scelte da cartoon, da confermare.
- La cucina è semplificata (poche geometrie, materiali base): da rifinire.
- Le battute sono solo sottotitoli provvisori: nessuna voce, nessun effetto, nessuna musica.

## Cosa manca prima del render definitivo

Approvazione dell'animatic · rig e controlli · animazione continua · forme della bocca e labiale sulle registrazioni reali · transizione illustrata di Mina ·
voci, effetti e musica con licenze verificate · rifinitura di cucina e luci · test sulle inquadrature più difficili · misura reale dei tempi di render.
