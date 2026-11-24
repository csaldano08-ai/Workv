"""
Blockout del supermercato: costruzione, controlli geometrici, viste e pianta del set.
    python cs_test_market.py <out_dir>
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_market import LAYOUT, Market  # noqa: E402
from cs_props import build_cart, cart_parts  # noqa: E402

OUT = os.path.abspath(sys.argv[1])
os.makedirs(OUT, exist_ok=True)
S.reset()
S.render_setup((1280, 720), 16)
bpy.context.scene.cycles.max_bounces = 4
t0 = time.time()
mk = Market(os.path.join(OUT, "_wd")).build(build_cart)
qc = dict(costruzione_s=round(time.time() - t0, 1))
O = mk.objs

# --------------------------------------------------------------- controlli
for i in range(len(LAYOUT["gondolas"])):
    r = QC.penetration(O[f"prodotti_{i}"], O[f"scaffale_{i}"])
    qc[f"prodotti_dentro_scaffale_{i}"] = r
qc["prodotti_muro_dentro_scaffale"] = QC.penetration(O["prodotti_muro"], O["scaffale_muro"])
qc["frutta_dentro_cassette"] = QC.penetration(O["ortofrutta_frutta"], O["ortofrutta_cassette"])
qc["cassette_dentro_tavoli"] = QC.penetration(O["ortofrutta_cassette"], O["ortofrutta_tavoli"])
# porta dell'ufficio: rotazione completa, l'anta non deve toccare muri, telaio, arredo
door_hits = []
for ang in range(0, 89, 4):  # la porta si ferma a 88° (oltre andrebbe nel muro, come una porta vera)
    mk.door_angle(ang)
    bpy.context.view_layer.update()
    for other in ("muri", "porta_telaio", "ufficio_arredo", "pianta", "zoccolini"):
        r = QC.penetration(O["porta_anta"], O[other])
        if r["depth_mm"] > 0 or r["tri_pairs"]:
            door_hits.append((ang, other, r["depth_mm"], r["tri_pairs"]))
qc["porta_rotazione_0_88_contatti"] = door_hits
mk.door_angle(0)
# luce libera dei vani
o, e = LAYOUT["office"], LAYOUT["entrance"]
qc["porta_ufficio_luce_libera_m"] = dict(larghezza=round(mk.door["width"], 3), altezza=round(o["door_h"] - 0.06, 3))
qc["ingresso_luce_libera_m"] = dict(larghezza=round(e["x1"] - e["x0"] - 0.16, 3), altezza=round(e["h"] - 0.08, 3))
# zoccolini interrotti: nessun vertice dentro i vani
zz, _, _ = QC.world_mesh(O["zoccolini"])
inside_door = [v for v in zz if o["door_x0"] + 0.01 < v.x < o["door_x1"] - 0.01 and abs(v.y - (o["y0"] - 0.06)) < 0.1]
inside_ent = [v for v in zz if e["x0"] + 0.01 < v.x < e["x1"] - 0.01 and v.y < 0.05]
qc["zoccolini_nei_vani_vertici"] = dict(ufficio=len(inside_door), ingresso=len(inside_ent))
# porte scorrevoli aperte: le ante non entrano nei muri
mk.set_entrance_open(1.0)
bpy.context.view_layer.update()
qc["ante_scorrevoli_aperte_nei_muri"] = [QC.penetration(a, O["muri"])["depth_mm"] for a in mk.doors_slide]
mk.set_entrance_open(0.0)
# carrelli parcheggiati: nessun carrello dentro l'altro
cp = [cart_parts(c) for c in mk.parked]
hits = 0
for i in range(len(cp) - 1):
    for a in cp[i]:
        for b in cp[i + 1]:
            hits += QC.penetration(a, b)["tri_pairs"]
qc["carrelli_fila_contatti"] = hits
# larghezza delle corsie
xs = sorted(g["x"] for g in LAYOUT["gondolas"])
qc["corsie_larghezza_m"] = [round(xs[i + 1] - xs[i] - 0.92, 2) for i in range(len(xs) - 1)]
json.dump(qc, open(os.path.join(OUT, "qc_supermercato.json"), "w"), indent=1, ensure_ascii=False)
print("QC", json.dumps({k: (v["depth_mm"] if isinstance(v, dict) and "depth_mm" in v else v) for k, v in qc.items()}, ensure_ascii=False))

# --------------------------------------------------------------- viste
views = [("ingresso", (0.0, 1.2, 1.65), (-1.5, 8.0, 1.1), 24), ("corsia", (0.7, 4.4, 1.6), (0.7, 12.0, 1.0), 28),
         ("ortofrutta", (-2.2, 3.0, 1.75), (-5.2, 7.5, 0.7), 26), ("casse", (1.0, 5.6, 1.9), (4.6, 1.8, 0.9), 26),
         ("porta_ufficio", (-3.2, 8.6, 1.6), (-5.65, 10.8, 1.2), 26), ("dall_alto", (0.0, 3.0, 9.0), (0.0, 8.0, 0.0), 18)]
cam = S.camera(views[0][1], views[0][2], views[0][3])
times = []
for name, loc, tgt, lens in views:
    S.aim(cam, loc, tgt)
    cam.data.lens = lens
    hide = name == "dall_alto"
    for n in ("soffitto", "pannelli_luce"):
        O[n].hide_render = hide
    if name == "porta_ufficio":
        mk.door_angle(70)
    t1 = time.time()
    S.render(os.path.join(OUT, f"BLOCKOUT_{name}.png"))
    times.append(round(time.time() - t1, 1))
    mk.door_angle(0)
qc["tempi_render_viste_s"] = times
json.dump(qc, open(os.path.join(OUT, "qc_supermercato.json"), "w"), indent=1, ensure_ascii=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "supermercato_blockout.blend"))
print("ok", times)
