"""
Grafici dei canali animati (come le curve del Graph Editor) da un file di campionamento a 30 fps.
    python audit_plot.py <audit.json> <out.png> <personaggio> <t0> <t1> [titolo]
Il file viene da `ep01_animatic.py` (ADS_MODE=audit) o da `test_recitazione.py` (TR_MODE=curves): stesso formato.
Le fasce grigie sono i tratti in cui il corpo è completamente fermo (mani < 0,8 mm, rotazioni < 0,15° per fotogramma);
le linee verticali tratteggiate sono gli stacchi di inquadratura; i triangoli rossi sono gli scatti della testa: più di 4° in un
fotogramma e almeno 2,5 volte il movimento dei fotogrammi vicini (una rotazione veloce ma continua non conta).
"""
import json
import math
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

src, out, who, t0, t1 = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5])
title = sys.argv[6] if len(sys.argv) > 6 else ""
rows = sorted([r for r in json.load(open(src)) if r["n"] == who and t0 <= r["t"] <= t1], key=lambda r: r["f"])
T = [r["t"] for r in rows]
fig, ax = plt.subplots(4, 1, figsize=(13, 9.5), sharex=True)
ser = [
    ("testa: rotazione laterale (°)", [r["head"][1] for r in rows], "#c0392b"),
    ("testa: su/giù (°)", [r["head"][0] for r in rows], "#e67e22"),
    ("torace: avanti/indietro (°)", [r["chest"][0] for r in rows], "#2c3e50"),
    ("mano sinistra: altezza (m)", [r["hand_L"][2] for r in rows], "#2980b9"),
]
static = []
for a, b in zip(rows, rows[1:]):
    dh = max(math.dist(a["hand_L"], b["hand_L"]), math.dist(a["hand_R"], b["hand_R"]))
    dr = max(max(abs(x - y) for x, y in zip(a["head"], b["head"])), max(abs(x - y) for x, y in zip(a["chest"], b["chest"])))
    static.append(dh < 0.0008 and dr < 0.15 and math.dist(a["pos"], b["pos"]) < 0.0005)
cuts = [b["t"] for a, b in zip(rows, rows[1:]) if a["shot"] != b["shot"]]
# scatto = salto della testa in un fotogramma (> 4°) almeno 2,5 volte più grande dei fotogrammi vicini (discontinuità);
# una rotazione veloce ma continua (velocità simile prima e dopo) non è uno scatto
dh = [max(abs(x - y) for x, y in zip(a["head"], b["head"])) if a["shot"] == b["shot"] else 0.0 for a, b in zip(rows, rows[1:])]
snaps = [rows[i + 1]["t"] for i, d in enumerate(dh)
         if d > 4 and d > 2.5 * max(dh[i - 1] if i > 0 else 0.0, dh[i + 1] if i + 1 < len(dh) else 0.0)]
for k, (lab, ys, col) in enumerate(ser):
    a_ = ax[k]
    for i, s in enumerate(static):
        if s:
            a_.axvspan(T[i], T[i + 1], color="#bbbbbb", alpha=0.35, lw=0)
    a_.plot(T, ys, color=col, lw=1.6)
    for c in cuts:
        a_.axvline(c, color="k", ls="--", lw=0.6, alpha=0.6)
    if k < 2:
        for s in snaps:
            i = T.index(s)
            a_.plot([s], [ys[i]], marker="v", color="red", ms=7)
    a_.set_ylabel(lab, fontsize=9)
    a_.grid(alpha=0.25)
fr = 100 * sum(static) / max(1, len(static))
ax[0].set_title(f"{title}  ·  {who}  ·  {t0:.1f}–{t1:.1f} s  ·  fermo {fr:.0f}% dei fotogrammi  ·  scatti della testa: {len(snaps)}", fontsize=11)
ax[-1].set_xlabel("tempo (s)")
plt.tight_layout()
plt.savefig(out, dpi=110)
print("ok", out, round(fr, 1), len(snaps))
