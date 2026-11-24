"""
Prova del cast di EP01: tutti i personaggi in fila (fronte e tre quarti) + carrello e cartellina, con controlli in posa di riposo.
    python cs_test_cast.py <out_dir>
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import cs_pose as PO  # noqa: E402
import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_char import Character  # noqa: E402
from cs_face import draw_face  # noqa: E402
from cs_props import build_cart, build_clipboard  # noqa: E402

OUT = os.path.abspath(sys.argv[1])
os.makedirs(OUT, exist_ok=True)
S.reset()
S.render_setup((1600, 900), 24)
S.studio(floor_grid=False)
CAST = [("protagonista", "neutro"), ("dipendente", "felice"), ("responsabile", "ironico"), ("direttore", "felice"),
        ("cliente_felpa", "neutro"), ("cliente_signora", "sollievo")]
qc = {}
chars = []
for i, (nm, face) in enumerate(CAST):
    ch = Character(nm, os.path.join(OUT, "_wd"))
    x = (i - (len(CAST) - 1) / 2) * 1.15
    ch.rig.location = (x, 0, 0)
    ch.pose(PO.idle(ch))
    p = os.path.join(OUT, "_wd", f"face_{nm}.png")
    draw_face(ch.face_expr(face), gaze=(-x * 0.15, 0.0), size=1024).save(p)
    ch.set_face(p)
    shw = {s: ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{s}"].head for s in "LR"}
    r = {}
    for s in "LR":
        r[f"braccio.{s}"] = QC.penetration(ch.parts[f"arm.{s}"], ch.parts["torso"], ignore=lambda v, g, s=s: (v - shw[s]).length < QC.ARM_ROOT)["depth_mm"]
        r[f"mano.{s}"] = QC.penetration(ch.parts[f"hand.{s}"], ch.parts["torso"])["depth_mm"]
        r[f"piede.{s}_z_mm"] = round(QC.min_z(ch.parts[f"foot.{s}"]) * 1000, 2)
    r["altezza_m"] = round(max((ob.matrix_world @ v.co).z for ob in (ch.parts.get("hair") or ch.parts["head"],) for v in ob.data.vertices), 2)
    qc[nm] = r
    chars.append(ch)
cart = build_cart()
cart.location = (4.6, -0.6, 0)
cart.rotation_euler = (0, 0, 0.5)
clip = build_clipboard()
clip.location = (-4.4, -0.8, 0.9)
clip.rotation_euler = (0.2, 0, 0.3)
cam = S.camera((0, -9.5, 1.3), (0, 0, 0.95), 50)
t0 = time.time()
S.render(os.path.join(OUT, "CAST_fronte.png"))
S.aim(cam, (5.5, -8.0, 1.6), (0, 0, 0.9))
S.render(os.path.join(OUT, "CAST_tre_quarti.png"))
qc["tempo_render_s"] = round((time.time() - t0) / 2, 1)
json.dump(qc, open(os.path.join(OUT, "qc_cast.json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "cast_ep01.blend"))
print("ok", qc)
