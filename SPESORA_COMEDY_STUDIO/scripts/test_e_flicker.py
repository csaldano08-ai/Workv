"""
Test E sulle immagini: sfarfallio temporale nei fotogrammi renderizzati dell'animatic.
    python test_e_flicker.py <dir_render (cue.json + frames/)> [out.json]

Per ogni inquadratura confronta i fotogrammi renderizzati consecutivi (senza attraversare gli stacchi):
- differenza media e 99° percentile della luminanza tra due fotogrammi;
- pixel «A-B-A»: cambiano di più di 10/255 e tornano indietro al fotogramma dopo (|f2 - f0| < 5/255).
  Il movimento normale va in una direzione; lo sfarfallio (rumore, z-fighting, texture che saltano) va e torna.
  Anche battiti di ciglia e bocca fanno A-B-A, quindi i pixel sono divisi in «isolati» (nessun vicino A-B-A:
  tipico di rumore e z-fighting) e «in gruppo» (tipico di parti animate), e i casi peggiori vanno guardati.
Salva la mappa (pixel A-B-A in rosso) del triplo peggiore di ogni inquadratura e una tavola con tutte, per il controllo visivo.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

REN = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REN, "test_e_sfarfallio.json")
THR, BACK = 10 / 255, 5 / 255
cue = json.load(open(os.path.join(REN, "cue.json")))
fps = cue["fps"]
fdir = os.path.join(REN, "frames")
idx = sorted(int(n[2:7]) - 1 for n in os.listdir(fdir) if n.startswith("f_") and n.endswith(".png"))


def shot_of(i):
    t = i / fps
    for s in cue["inquadrature"]:
        if s["inizio"] <= t < s["fine"]:
            return s["n"]
    return cue["inquadrature"][-1]["n"]


def lum(i):
    a = np.asarray(Image.open(os.path.join(fdir, f"f_{i + 1:05d}.png")).convert("RGB"), dtype=np.float32) / 255.0
    return a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32), a


per = {}
worst = {}
prev = []  # (indice, luminanza, rgb) degli ultimi due fotogrammi della stessa inquadratura
for i in idx:
    sh = shot_of(i)
    y, rgb = lum(i)
    if prev and shot_of(prev[-1][0]) != sh:
        prev = []
    r = per.setdefault(sh, {"coppie": 0, "diff_media": [], "diff_p99": [], "aba": [], "aba_isolati": [], "t_peggiore": None})
    if prev:
        d = np.abs(y - prev[-1][1])
        r["coppie"] += 1
        r["diff_media"].append(float(d.mean()))
        r["diff_p99"].append(float(np.percentile(d, 99)))
    if len(prev) == 2:
        (i0, y0, _), (i1, y1, rgb1) = prev
        d1, d2 = y1 - y0, y - y1
        m = (np.abs(d1) > THR) & (np.abs(d2) > THR) & (np.sign(d1) != np.sign(d2)) & (np.abs(y - y0) < BACK)
        nb = np.zeros_like(m, dtype=np.int32)
        mp = np.pad(m, 1)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    nb += mp[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]
        iso = m & (nb == 0)
        fa, fi = float(m.mean()), float(iso.mean())
        r["aba"].append(fa)
        r["aba_isolati"].append(fi)
        if not r["t_peggiore"] or fa > r["t_peggiore"][1]:
            r["t_peggiore"] = (round(i1 / fps, 2), fa)
        if sh not in worst or fa > worst[sh][0]:
            worst[sh] = (fa, i1, sh, m, rgb1)
    prev = (prev + [(i, y, rgb)])[-2:]

res = {"soglia_cambio": "10/255", "soglia_ritorno": "5/255", "fotogrammi": len(idx), "inquadrature": {}}
for sh, r in per.items():
    res["inquadrature"][sh] = {
        "coppie": r["coppie"],
        "diff_media_lum_255": round(255 * float(np.mean(r["diff_media"])), 2) if r["diff_media"] else None,
        "diff_p99_lum_255_max": round(255 * float(np.max(r["diff_p99"])), 1) if r["diff_p99"] else None,
        "pixel_aba_percento_max": round(100 * float(np.max(r["aba"])), 3) if r["aba"] else None,
        "pixel_aba_isolati_percento_max": round(100 * float(np.max(r["aba_isolati"])), 4) if r["aba_isolati"] else None,
        "t_peggiore": r["t_peggiore"][0] if r["t_peggiore"] else None,
    }
allaba = [v["pixel_aba_isolati_percento_max"] for v in res["inquadrature"].values() if v["pixel_aba_isolati_percento_max"] is not None]
res["pixel_aba_isolati_percento_max_episodio"] = max(allaba) if allaba else None
res["peggiori"] = []
odir = os.path.join(REN, "test_e")
os.makedirs(odir, exist_ok=True)
tiles = []
for k, (fa, i1, sh, m, rgb1) in enumerate(sorted(worst.values(), key=lambda w: w[1])):
    im = (rgb1 * 255).astype(np.uint8)
    im = (im * 0.55).astype(np.uint8)
    im[m] = (255, 30, 30)
    fn = f"aba_inq{sh}_t{i1 / fps:.2f}.png"
    Image.fromarray(im).save(os.path.join(odir, fn))
    tiles.append((sh, Image.fromarray(im)))
    res["peggiori"].append({"inquadratura": sh, "t": round(i1 / fps, 2), "pixel_aba_percento": round(100 * fa, 3), "mappa": fn})
if tiles:
    from PIL import ImageDraw
    cols, tw = 6, tiles[0][1].width // 2
    th = tiles[0][1].height // 2
    sheet = Image.new("RGB", (cols * tw, -(-len(tiles) // cols) * th), (20, 20, 20))
    for k, (sh, im) in enumerate(tiles):
        x, y = (k % cols) * tw, (k // cols) * th
        sheet.paste(im.resize((tw, th)), (x, y))
        ImageDraw.Draw(sheet).text((x + 6, y + 6), sh, fill=(255, 255, 0))
    sheet.save(os.path.join(odir, "TAVOLA_sfarfallio.png"))
json.dump(res, open(OUT, "w"), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in res.items() if k != "inquadrature"}, ensure_ascii=False))
for sh, v in res["inquadrature"].items():
    print(sh, v)
