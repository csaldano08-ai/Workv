"""
Fotogrammi dello storyboard presi dall'animatic renderizzato (identici al video): per ogni inquadratura il fotogramma
più vicino al 60% della sua durata.
    python storyboard_extract.py <dir_render (cue.json + frames/)> [dir_uscita]
"""
import json
import os
import shutil
import sys

REN = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REN, "storyboard")
os.makedirs(OUT, exist_ok=True)
cue = json.load(open(os.path.join(REN, "cue.json")))
fps = cue["fps"]
done = []
for s in cue["inquadrature"]:
    if s["inizio"] >= 93.6:
        continue  # il marchio finale si monta a parte
    fi = int(round((s["inizio"] + (s["fine"] - s["inizio"]) * 0.6) * fps))
    for d in range(0, 30):
        cands = [fi - d, fi + d]
        hit = next((c for c in cands if os.path.exists(os.path.join(REN, "frames", f"f_{c + 1:05d}.png"))), None)
        if hit is not None:
            shutil.copy(os.path.join(REN, "frames", f"f_{hit + 1:05d}.png"), os.path.join(OUT, f"shot_{s['n']}.png"))
            done.append((s["n"], round(hit / fps, 2)))
            break
print(done)
