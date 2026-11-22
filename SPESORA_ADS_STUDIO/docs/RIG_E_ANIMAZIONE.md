# Rig e animazione (come è fatto e come si modifica)

L'episodio è un'**animazione continua a 30 fps**: ogni fotogramma ha il suo valore di posa. Non ci sono pose fisse con tagli e zoom.

## Rig dei personaggi

Gerarchia di giunti (empty) con parti morbide: nessuna articolazione anatomica visibile.

**Protagonista** (`scripts/rig_hero.py`): `root` → `hips` (busto, squash e stretch, inclinazione) → `neck` (testa, naso, viso) e braccia;
gambe con perno all'anca (camminata). Le braccia sono morbide (omero, gomito, avambraccio) con **IK a due segmenti**: la mano va dove serve
(ad esempio sulla maniglia del frigo che si apre) e le braccia si allungano come un elastico se il punto è lontano.
Niente mani e niente dita: l'estremità è tonda e continua.

**Mina** (`scripts/rig_mina.py`): `root` (ai piedi, scala e squash) → `body` (libro) con dorso, pagine, elastico, linguette, **copertina incernierata**
(si apre), **segnalibro che oscilla**, braccia con IK e mano a muffola con pollice; due gambe corte con piedi.

## Viso a parti animabili (`scripts/facekit.py`)

Ogni elemento è un'immagine 2D separata, proiettata sulla testa (protagonista) o appoggiata sulla copertina (Mina):

- **Protagonista**: sclera, pupilla (scorre dentro il bianco), sopracciglia (si alzano e ruotano), palpebre (scala dell'occhio), bocche (cambio forma),
  occhi chiusi/arrabbiati, guance. Il naso rosso è 3D.
- **Mina**: bianco dell'occhio, iride con riflesso (**si muove solo l'iride**), palpebra con ciglia che scende per ammiccare, sopracciglia, bocche,
  guance, rametto. Nessun naso.

Le espressioni sono miscele di preset (stanco, sorpreso, felice, ironico, guarda in camera...), quindi cambiano in modo fluido.
Il parlato è **provvisorio**: la bocca si muove a ritmo irregolare nei tratti di dialogo; il labiale vero si fa sulle registrazioni reali.

## Animazione (`scripts/anim.py`, `scripts/ep01_anim.py`)

Le curve sono scritte in codice: chiavi `(tempo, valore)` con interpolazione morbida (senza sovraelongazioni), molle per l'inerzia e il rimbalzo,
respiro e ammiccamenti procedurali, ciclo di camminata ricavato dallo spostamento della radice, parlato con piccoli movimenti di testa e sopracciglia.
Poi tutto viene **cotto in keyframe su ogni fotogramma** nel file Blender: si può aprire, scorrere la timeline e ritoccare le curve.

Per cambiare la regia: modifica le chiavi in `ep01_anim.py` (percorsi `hx`, `hy`, `hyaw`, pose del busto `h_pitch`, espressioni `hw`, ecc.) e rigenera.
Le telecamere sono oggetti con keyframe e marker (tagli), con movimenti di camera dolci.

## Cosa si vede dello schermo del telefono

Lo schermo riproduce una **registrazione reale** della demo dell'app (`scripts/capture_ui_video.cjs`): calendario, ricetta, lista della spesa.
Nessuna interfaccia inventata.

## Limiti attuali

- Il rig è una gerarchia di giunti con IK analitica: non è un'armatura con ossa Blender. È riutilizzabile via codice, ma per un animatore umano
  un'armatura con controlli sarebbe più comoda: è una evoluzione possibile.
- Le gambe del protagonista sono rigide (pongo): la camminata è un'oscillazione, non un passo con piede che si appoggia.
- Nessun labiale vero e nessun suono.
- Render di bozza: bassa risoluzione e pochi campioni (rumore visibile). Il render finale va fatto con più campioni o con Eevee su una macchina con GPU.
