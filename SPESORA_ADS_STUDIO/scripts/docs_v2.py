"""
Documenti di produzione per EP01 v2, generati dal copione temporizzato usato nell'animazione (cue.json) e dalla timeline audio.

    python docs_v2.py <A|B> <cue.json> <timeline_audio.csv> <out_dir>
"""
import csv
import json
import os
import sys

V, CUE, TL, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
cue = json.load(open(CUE))
NAME = "SPESORA_EP01_NARRATORE" if V == "A" else "SPESORA_EP01_DIALOGHI"
TRACK_DIR = {"voice_narrator": "audio/voices/narrator", "voice_mina": "audio/voices/mina", "voice_protagonist": "audio/voices/protagonist"}
TRACK_NAME = {"voice_narrator": "NARRATOR", "voice_mina": "MINA" if V == "A" else "VOICE_MINA", "voice_protagonist": "VOICE_PROTAGONIST"}

# gesti ed espressioni previsti in animazione (per chi registra: aiuta a recitare sul labiale e sui tempi)
GESTI = {
    "A": ["(il protagonista apre il frigo, scruta i ripiani, sospira)", "(lui guarda il frigo, poi dritto in camera; alza le spalle)",
          "(Mina esce dal telefono, atterra sul piano e lo guarda)", "(Mina indica il telefono; primo piano del calendario)", "(primo piano della ricetta)",
          "(primo piano della lista della spesa)", "(lui si rilassa e sorride; Mina soddisfatta)", "(outro: logo e slogan)"],
    "B": ["(guarda dentro il frigo, stanco; sospiro alla fine)", "(si gira e guarda lo spettatore; alza le spalle)",
          "(Mina lo guarda, ironica; lui ancora sorpreso dal salto)", "(Mina si gira e indica il telefono)", "(primo piano dell'app)",
          "(lui guarda Mina, poi il telefono; mano al mento)", "(Mina soddisfatta, la copertina si apre)"],
}
PAUSE = {"A": ["0.5 s prima", "pausa dopo «domanda:»", "—", "—", "—", "—", "pausa prima di «è già decisa»", "—"],
         "B": ["0.4 s prima, sospiro dopo", "pausa comica di ~1 s dopo", "pausa dopo «prima,»", "—", "—", "—", "— (risposta pronta)"]}

lines = cue["lines"]
rows = []
for i, l in enumerate(lines):
    fn = f"EP01{V}_L{i + 1:02d}_{TRACK_NAME[l['traccia']].lower()}.wav"
    rows.append(dict(id=f"L{i + 1:02d}", chi=l["chi"], testo=l["testo"], inizio=l["inizio"], fine=l["fine"], durata=round(l["fine"] - l["inizio"], 2),
                     emozione=l["emozione"], pausa=PAUSE[V][i] if i < len(PAUSE[V]) else "—", gesto=GESTI[V][i] if i < len(GESTI[V]) else "—",
                     traccia=TRACK_NAME[l["traccia"]], file=f"{TRACK_DIR[l['traccia']]}/{fn}"))

title = "Versione A — narratore + Mina, protagonista muto" if V == "A" else "Versione B — protagonista parlante + Mina"
md = [f"# {NAME} · copione temporizzato", "", f"**{title}.** Durata 35,2 s (32 s di scena + 3,2 s di outro), 1080×1920, 30 fps.",
      "I tempi sono stime: quando arrivano i WAV definitivi il montaggio e il labiale si adattano alle registrazioni reali, senza accelerare il parlato.", "",
      "| Id | Chi | Battuta | Inizio | Fine | Durata | Emozione / intenzione | Pause | In scena | Traccia | File da registrare |",
      "|---|---|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    md.append(f"| {r['id']} | {r['chi']} | «{r['testo']}» | {r['inizio']:.1f} s | {r['fine']:.1f} s | {r['durata']:.1f} s | {r['emozione']} | {r['pausa']} | {r['gesto']} | {r['traccia']} | `{r['file']}` |")
if V == "A":
    md += ["", "Il protagonista **non parla mai**: solo reazioni (sospiri, sorpresa, sorrisi, sguardi in camera). Eventuali sospiri e respiri si registrano come effetti di voce non verbali, non come battute."]
md += ["", "## Inquadrature", "", "| Camera | Inizio | Fine |", "|---|---|---|"]
for s in cue["shots"]:
    md.append(f"| {s['nome']} | {s['inizio']:.1f} s | {s['fine']:.1f} s |")
md.append("| outro | 32.0 s | 35.2 s |")
open(os.path.join(OUT, f"COPIONE_{NAME}.md"), "w").write("\n".join(md) + "\n")

# guida di registrazione separata per ogni voce
for who in sorted({r["chi"] for r in rows}):
    rr = [r for r in rows if r["chi"] == who]
    g = [f"# Guida di registrazione — {who} ({NAME})", "",
         "- Formato: WAV 48 kHz, 24 bit (o 16 bit), mono. Stanza silenziosa, microfono a 15–20 cm, niente musica sotto.",
         "- Registra ogni battuta in un file separato con il nome indicato; fai 2–3 prese e tieni la migliore (rinomina come indicato).",
         "- Lascia 0,5 s di silenzio prima e dopo ogni battuta: il taglio si fa in montaggio.",
         "- Non accelerare per stare nei tempi: se la battuta è più lunga, si adatta il montaggio.", ""]
    if who == "MINA":
        g += ["**Voce di Mina:** femminile o dal timbro delicato, simpatica, calda, espressiva; giovanile ma non infantile; una leggera ironia; naturale, non robotica. Non imitare voci famose.", ""]
    if who == "PROTAGONISTA":
        g += ["**Voce del protagonista:** la tua (o una voce autorizzata). Naturale, un po' pigra e simpatica; nelle battute in camera, complice con chi guarda.", ""]
    if who == "NARRATORE":
        g += ["**Narratore:** terza persona, tono leggermente ironico all'inizio, caldo e chiaro nella spiegazione dell'app, breve firma finale.", ""]
    g += ["| File | Battuta | Durata stimata | Intenzione | Pausa | Cosa succede in scena |", "|---|---|---|---|---|---|"]
    for r in rr:
        g.append(f"| `{os.path.basename(r['file'])}` | «{r['testo']}» | {r['durata']:.1f} s | {r['emozione']} | {r['pausa']} | {r['gesto']} |")
    open(os.path.join(OUT, f"GUIDA_REGISTRAZIONE_{who}_{NAME}.md"), "w").write("\n".join(g) + "\n")

# timeline dei marcatori (battute + inquadrature + effetti), utile in qualunque software di montaggio
with open(os.path.join(OUT, f"TIMELINE_{NAME}.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["traccia", "inizio_s", "fine_s", "durata_s", "evento", "note"])
    for r in rows:
        w.writerow([r["traccia"], r["inizio"], r["fine"], r["durata"], f"{r['id']} {r['chi']}", r["testo"]])
    for s in cue["shots"]:
        w.writerow(["VIDEO", s["inizio"], s["fine"], round(s["fine"] - s["inizio"], 2), f"camera {s['nome']}", ""])
    w.writerow(["VIDEO", 32.0, 35.2, 3.2, "outro", "logo + «Cosa cucini? Già deciso.»"])
    for r in csv.DictReader(open(TL)):
        if r["traccia"] in ("SFX",):
            w.writerow(["SFX", r["inizio"], round(float(r["inizio"]) + float(r["durata"]), 2), r["durata"], r["nome"], r["descrizione"]])
    w.writerow(["AMBIENCE", 0, 32.0, 32.0, "stanza di sera + ronzio del frigo quando è aperto", "sintetizzato in codice"])
    w.writerow(["MUSIC", 0.2, 31.9, 31.7, "corde pizzicate: sospesa → arriva Mina → positiva", "composta e sintetizzata in codice"])
print("documenti", V, "ok")
