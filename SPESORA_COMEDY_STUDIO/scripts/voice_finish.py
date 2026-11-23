"""
Rifinitura e montaggio della narrazione clonata.
    python voice_finish.py <out_dir_generazione> <narrazione_ep01.json> <dest_dir>
Per ogni battuta prende la presa scelta, taglia i silenzi, porta tutte allo stesso volume e sulle battute "calme" applica
una compressione dolce (riduce i picchi delle parole troppo enfatizzate). Poi monta la traccia completa con le pause del copione.
"""
import csv
import json
import os
import sys

import numpy as np
import soundfile as sf

GEN, COP, DEST = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(DEST, "battute"), exist_ok=True)
sel = {b["id"]: b for b in json.load(open(os.path.join(GEN, "selezione_prese.json")))["battute"]}
cop = json.load(open(COP))
TARGET_RMS_DB = -19.0


def trim(y, sr, thr_db=-42, keep=0.04):
    win = int(0.01 * sr)
    e = np.array([np.sqrt(np.mean(y[i:i + win] ** 2)) for i in range(0, len(y) - win, win)])
    db = 20 * np.log10(e + 1e-9)
    act = np.where(db > thr_db)[0]
    if len(act) == 0:
        return y
    a = max(0, act[0] * win - int(keep * sr))
    b = min(len(y), (act[-1] + 1) * win + int(keep * sr))
    out = y[a:b].copy()
    f = int(0.01 * sr)
    out[:f] *= np.linspace(0, 1, f)
    out[-f:] *= np.linspace(1, 0, f)
    return out


def compress(y, sr, thr_db=-21, ratio=2.2, att=0.02, rel=0.15):
    """Compressore sull'inviluppo RMS: sopra la soglia il guadagno scende (enfasi più contenuta, voce invariata)."""
    win = int(0.01 * sr)
    env = np.sqrt(np.convolve(y ** 2, np.ones(win) / win, mode="same")) + 1e-9
    db = 20 * np.log10(env)
    over = np.maximum(0, db - thr_db)
    g_db = -over * (1 - 1 / ratio)
    # attacco / rilascio
    a_c, r_c = np.exp(-1 / (att * sr)), np.exp(-1 / (rel * sr))
    sm = np.zeros_like(g_db)
    cur = 0.0
    for i, g in enumerate(g_db):
        c = a_c if g < cur else r_c
        cur = c * cur + (1 - c) * g
        sm[i] = cur
    return y * 10 ** (sm / 20)


def loudness(y, target=TARGET_RMS_DB):
    rms = np.sqrt(np.mean(y[np.abs(y) > 0.01] ** 2)) if np.any(np.abs(y) > 0.01) else 1e-3
    y = y * 10 ** ((target - 20 * np.log10(rms)) / 20)
    pk = np.max(np.abs(y))
    return y / pk * 0.95 if pk > 0.95 else y


parts, rows, t = [], [], 0.0
sr0 = None
for line in cop["battute"]:
    b = sel.get(line["id"])
    if not b:
        continue
    take = next(p for p in b["prese"] if p["presa"] == b["scelta"])
    y, sr = sf.read(take["file"], dtype="float32")
    sr0 = sr0 or sr
    y = trim(y, sr)
    if line["tono"] == "calmo":
        y = compress(y, sr)
    y = loudness(y)
    p = os.path.join(DEST, "battute", f"EP01_{line['id']}_narratore.wav")
    sf.write(p, y, sr, subtype="PCM_16")
    rows.append([line["id"], round(t, 2), round(t + len(y) / sr, 2), round(len(y) / sr, 2), line["tono"], b["scelta"], line["testo"]])
    parts += [y, np.zeros(int(line["pausa_dopo"] * sr), np.float32)]
    t += len(y) / sr + line["pausa_dopo"]
full = np.concatenate(parts)
sf.write(os.path.join(DEST, "EP01_narrazione_voce_clonata.wav"), full, sr0, subtype="PCM_16")
with open(os.path.join(DEST, "EP01_narrazione_timeline.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["id", "inizio_s", "fine_s", "durata_s", "tono", "presa_scelta", "testo"])
    w.writerows(rows)
print("narrazione", round(len(full) / sr0, 1), "s")
