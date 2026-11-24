"""
Copione delle voci e piano di montaggio di EP01, generati dagli stessi dati dell'animatic (cue.json + battute registrate).
    python edit_plan.py <cue.json> <dir_battute_narratore> <out.md>
"""
import json
import os
import sys

import wave

CUE, NB, OUT = sys.argv[1:4]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
cue = json.load(open(CUE))
narr = {b["id"]: b for b in json.load(open(os.path.join(ROOT, "audio", "narrazione_ep01.json")))["battute"]}

# effetti dell'animatic (stessi tempi di assemble_ep01.py)
SFX = [(5.85, "«Quattro.»: piccolo pop della mano"), (6.6, "carrello: tintinnio delle ruote (4 s)"), (20.4, "pollice su di Luca: clic"),
       (47.7, "cassa 2 si accende: bip"), (47.95, "cassa 2: secondo bip"), (69.15, "maniglia della porta: scatto"),
       (69.3, "porta dell'ufficio: cigolio"), (93.5, "passaggio al marchio: soffio")]


def dur(nid):
    with wave.open(os.path.join(NB, f"EP01_{nid}_narratore.wav")) as w:
        return w.getnframes() / w.getframerate()


def shots_between(t0, t1):
    return [s["n"] for s in cue["inquadrature"] if s["inizio"] < t1 and s["fine"] > t0]


L = []
L.append("# 07 · Copione delle voci e piano di montaggio · EP01\n")
L.append("Generato da `scripts/edit_plan.py` con gli stessi dati dell'animatic (`shots/cue_EP01.json`, battute in `audio/narrazione_clonata/battute/`).")
L.append("Durata: {:.1f} s a {} fps; marchio Spesora da 93,6 s.\n".format(cue["durata"], cue["fps"]))
L.append("## 1 · Copione delle voci\n")
L.append("Una sola voce fuori campo, il **narratore**, clonata dalla registrazione fornita. Tutte le altre voci sono battute brevi dei personaggi "
         "**da registrare** con voci vere: nell'animatic sono mute e appaiono come sottotitoli gialli.\n")
L.append("| ID | Chi | Inizio | Fine | Durata | Inquadrature | Testo | Note di recitazione |")
L.append("|---|---|---|---|---|---|---|---|")
rows = []
for n in cue["narrazione"]:
    d = dur(n["id"])
    b = narr[n["id"]]
    rows.append((n["inizio"], n["id"], "Narratore (clonata)", n["inizio"] + d, d, b["testo"], b.get("tono", b.get("nota", ""))))
NOTE_PERSONAGGI = {"P01": "a mezza voce, perplesso, piccola pausa sui puntini", "D01": "entusiasta, a voce alta, rivolto al personale fuori campo"}
for c in cue["battute"]:
    rows.append((c["inizio"], c["id"], c["chi"].capitalize() + " · **da registrare**", c["fine"], c["fine"] - c["inizio"], c["testo"], NOTE_PERSONAGGI.get(c["id"], "")))
for t0, nid, who, t1, d, txt, note in sorted(rows):
    L.append(f"| {nid} | {who} | {t0:.1f} s | {t1:.1f} s | {d:.1f} s | {', '.join(shots_between(t0, t1))} | {txt} | {note} |")
L.append("\nBattute dei personaggi: 2 in tutto, brevissime, come richiesto («non ne voglio molti che parlino»). Il labiale nell'animatic è "
         "generico: con le voci registrate si rifà sulle sillabe reali.\n")
L.append("## 2 · Piano di montaggio\n")
L.append("| Inq. | Da | A | Durata | Lente | Cosa si vede | Narrazione | Battute | Effetti |")
L.append("|---|---|---|---|---|---|---|---|---|")
for s in cue["inquadrature"]:
    t0, t1 = s["inizio"], s["fine"]
    ns = [n["id"] for n in cue["narrazione"] if n["inizio"] < t1 and n["inizio"] + dur(n["id"]) > t0]
    bs = [c["id"] for c in cue["battute"] if c["inizio"] < t1 and c["fine"] > t0]
    fx = [f"{tt:.2f} s {what}" for tt, what in SFX if t0 <= tt < t1]
    L.append(f"| {s['n']} | {t0:.1f} | {t1:.1f} | {t1 - t0:.1f} s | {s['lente']} mm | {s['descrizione']} | {', '.join(ns)} | {', '.join(bs)} | {'; '.join(fx)} |")
L.append("\n## 3 · Tracce audio\n")
L.append("- **NARRATORE**: 16 battute clonate, posate ai tempi qui sopra; nessuna battuta si sovrappone a un'altra.")
L.append("- **AMBIENTE**: brusio del negozio, ronzio dei frigoriferi e rari bip lontani, sintetizzati nel codice. Dentro l'ufficio, dai 71 s, il volume scende al 35%.")
L.append("- **SFX**: gli effetti elencati, anch'essi sintetizzati nel codice, quindi senza licenze di terzi.")
L.append("- **VOCI PERSONAGGI**: traccia vuota, riservata alle 2 battute da registrare.")
L.append("- **MUSICA**: nessuna nell'animatic; la scelta della musica è una decisione da prendere per il montaggio finale.\n")
L.append("I mix dell'animatic e le tracce separate si rigenerano con `python scripts/assemble_ep01.py <render> audio/narrazione_clonata/battute <uscita>`, "
         "che produce `EP01_animatic_{NARRATORE,AMBIENTE,SFX,mix}.wav`.")
open(OUT, "w").write("\n".join(L) + "\n")
print(OUT)
