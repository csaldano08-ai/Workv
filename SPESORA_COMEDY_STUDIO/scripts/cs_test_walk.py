"""
Prova di camminata con foot locking e controlli fotogramma per fotogramma.
    python cs_test_walk.py <out_dir> <stile: normale|imbarazzato|sicuro> <camera: lato|tre_quarti> [risoluzione=960x540] [campioni=10]
Misura: scivolamento del piede in appoggio (mm), piede sotto il pavimento (mm), gambe che si toccano, braccia nel busto.
"""
import json
import math
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_char import Character  # noqa: E402
from cs_face import draw_face, expr  # noqa: E402
from cs_walk import Walk  # noqa: E402

OUT, STYLE, CAMV = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
RES = tuple(int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else "960x540").split("x"))
SAMPLES = int(sys.argv[5]) if len(sys.argv) > 5 else 10
FPS = 30
tag = f"walk_{STYLE}_{CAMV}"
fdir = os.path.join(OUT, tag)
os.makedirs(fdir, exist_ok=True)

S.reset()
S.render_setup(RES, SAMPLES)
S.studio(backdrop=(0.74, 0.72, 0.68))
ch = Character("protagonista", os.path.join(OUT, "_wd_" + tag))
n_steps = {"normale": 7, "imbarazzato": 9, "sicuro": 6}[STYLE]
W = Walk(ch, start=(-1.3, 0.0), direction_deg=0.0, n_steps=n_steps, style=STYLE, anticip=0.4)
DUR = W.t_end + 0.5
NF = int(DUR * FPS)
mid = W.distance / 2 - 1.3
# camera che segue il personaggio (carrellata laterale morbida): il personaggio resta grande nel quadro
CAM_OFF = (0.0, -3.3, 0.95) if CAMV == "lato" else (1.7, -2.8, 1.25)
cam = S.camera((-1.3 + CAM_OFF[0], CAM_OFF[1], CAM_OFF[2]), (-1.3, 0, 0.8), 32)
cam_x = [None]

# volto: espressione per stile, sguardi intenzionali, battiti di ciglia non regolari
FACE = {"normale": "neutro", "imbarazzato": "imbarazzato", "sicuro": "falsa_sicurezza"}[STYLE]
BLINKS = [0.25, 1.9, 3.35] if STYLE != "imbarazzato" else [0.3, 1.2, 2.45, 3.1]


def blink_at(t):
    b = 0.0
    for tb in BLINKS:
        u = (t - tb) / 0.16
        if 0 <= u <= 1:
            b = max(b, math.sin(math.pi * u))
    return b


def gaze_at(t):
    """Sguardi tenuti, con spostamenti rapidi (saccadi di 0,12 s) verso bersagli precisi."""
    if STYLE == "imbarazzato":  # si guarda intorno: destra, sinistra, poi abbassa lo sguardo
        keys = [(0, (0.3, -0.2)), (0.9, (0.8, 0.0)), (1.5, (-0.8, 0.1)), (2.3, (0.1, -0.7)), (3.2, (0.7, -0.2))]
    elif STYLE == "sicuro":
        keys = [(0, (0.9, 0.2))]
    else:
        keys = [(0, (0.9, 0.0)), (2.6, (0.6, -0.3)), (3.4, (0.9, 0.0))]
    i = max(k for k in range(len(keys)) if keys[k][0] <= t)
    if i == 0:
        return keys[0][1]
    u = min(1.0, (t - keys[i][0]) / 0.12)
    u = u * u * (3 - 2 * u)
    a, b = keys[i - 1][1], keys[i][1]
    return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)


def extra(t, P):
    if STYLE == "imbarazzato":  # la testa accompagna gli sguardi intorno
        g = gaze_at(t)
        P["head_rot"] = (P["head_rot"][0] + 6, P["head_rot"][1] + g[0] * 14, P["head_rot"][2])
    return None


# ---------------------------------------------------------- bake + QC
qc = dict(slide_max_mm=0.0, piede_sotto_pavimento_mm=0.0, foot_min_z_mm=99.0, gambe_contatto=[], braccia_nel_busto_mm=0.0, mani_nel_busto_mm=0.0)
prev = {}
sh = {s: ch.rest[f"upperarm.{s}"][0] for s in "LR"}
t0 = time.time()
for fi in range(NF):
    t = fi / FPS
    Wm, P = W.pose_at(t, extra)
    ch.rig.matrix_world = Wm
    ch.pose(P)
    ch.key_all(fi + 1)
    bx = Wm.translation.x
    cam_x[0] = bx if cam_x[0] is None else cam_x[0] + (bx - cam_x[0]) * 0.12
    S.aim(cam, (cam_x[0] + CAM_OFF[0], CAM_OFF[1], CAM_OFF[2]), (cam_x[0] + 0.15, 0, 0.82))
    cam.keyframe_insert("location", frame=fi + 1)
    cam.keyframe_insert("rotation_euler", frame=fi + 1)
    for foot in ("L", "R"):
        s_, z_, pitch, air = W.foot_state(foot, t)
        pw = ch.rig.matrix_world @ ch.rig.pose.bones[f"foot.{foot}"].head
        if not air and foot in prev and not prev[foot][1]:
            qc["slide_max_mm"] = max(qc["slide_max_mm"], round((pw.xy - prev[foot][0].xy).length * 1000, 3))
        prev[foot] = (pw.copy(), air)
    if fi % 3 == 0:
        for foot in ("L", "R"):
            mz = QC.min_z(ch.parts[f"foot.{foot}"]) * 1000
            qc["foot_min_z_mm"] = round(min(qc["foot_min_z_mm"], mz), 2)
            qc["piede_sotto_pavimento_mm"] = round(max(qc["piede_sotto_pavimento_mm"], -mz), 2)
        r = QC.penetration(ch.parts["leg.L"], ch.parts["leg.R"])
        if r["tri_pairs"]:
            qc["gambe_contatto"].append(fi + 1)
        for s in "LR":
            shw = ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{s}"].head  # giunto della spalla IN POSA
            a = QC.penetration(ch.parts[f"arm.{s}"], ch.parts["torso"], ignore=lambda v, g, shw=shw: (v - shw).length < 0.11)
            qc["braccia_nel_busto_mm"] = max(qc["braccia_nel_busto_mm"], a["depth_mm"])
            h = QC.penetration(ch.parts[f"hand.{s}"], ch.parts["torso"])
            qc["mani_nel_busto_mm"] = max(qc["mani_nel_busto_mm"], h["depth_mm"])
qc["bake_s"] = round(time.time() - t0, 1)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, NF
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f"{tag}.blend"))

if os.environ.get("NO_RENDER"):
    print("qc", tag, qc)
    sys.exit(0)
# ---------------------------------------------------------- render (volto disegnato per fotogramma)
t0 = time.time()
fwd = os.path.join(OUT, "_wd_" + tag)
for fi in range(NF):
    t = fi / FPS
    sc.frame_set(fi + 1)
    p = os.path.join(fwd, f"face_{fi + 1:04d}.png")
    draw_face(expr(FACE), gaze=gaze_at(t), blink=blink_at(t), size=1024).save(p)
    ch.set_face(p)
    S.render(os.path.join(fdir, f"f_{fi + 1:04d}.png"))
qc["render_s"] = round(time.time() - t0, 1)
qc["render_s_per_frame"] = round(qc["render_s"] / NF, 2)
qc["fotogrammi"] = NF
qc["passi"] = n_steps
qc["distanza_m"] = round(W.distance, 3)
mp4 = os.path.join(OUT, f"{tag}.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fdir, "f_%04d.png"),
                "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", mp4], check=True)
json.dump(qc, open(os.path.join(OUT, f"qc_{tag}.json"), "w"), indent=1)
print("ok", tag, qc)
