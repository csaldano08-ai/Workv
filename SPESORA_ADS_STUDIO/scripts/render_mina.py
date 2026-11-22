"""
Render dei concept di Mina in 3D: turnaround, espressioni, pose e scena col protagonista.
    ADS_SCREEN=<png schermata app> ADS_SAMPLES=48 python render_mina.py <cartella-output-assoluta>
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import mina as M
import hero as H
import studio as S
import phone as P
import faces_mina as FM

OUT = [a for a in sys.argv if os.path.isabs(a)][-1]
SAMPLES = int(os.environ.get("ADS_SAMPLES", "48"))
SCREEN = os.environ["ADS_SCREEN"]
os.makedirs(OUT, exist_ok=True)
tmp = os.path.join(OUT, "_tmp")
os.makedirs(tmp, exist_ok=True)
M.TMP = tmp
H.TMP = tmp
times = {}


def rnd(name, res, loc, target, lens=85, samples=SAMPLES):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    S.aim(sc.camera, loc, target, lens)
    times[name] = S.render(os.path.join(OUT, f"M_{name}.png"))
    print(f"{name}: {times[name]:.1f}s", flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = S.setup((640, 800), SAMPLES)
mina = M.build()

# turnaround
M.set_face(mina, "felice")
for view, yaw in (("fronte", 0), ("tre_quarti", 35), ("lato", 90)):
    M.pose(mina, root_rot=(0, 0, math.radians(yaw)))
    rnd(f"turn_{view}", (640, 800), (0, -5.2, 1.5), (0, 0, 0.62))
M.pose(mina)

# espressioni
for e in FM.EXPRESSIONS:
    M.set_face(mina, e)
    rnd(f"expr_{e}", (480, 480), (0, -3.3, 0.9), (0, 0, 0.78), samples=32)

# pose
def arm_up(sign):  # braccio alzato che saluta
    sh = Vector((sign * (M.W / 2 + 0.01), 0, M.SH_Z))
    return (Vector((sign * 0.52, -0.10, M.Z0 + 1.12)), Vector((sign * 0.55, 0.0, M.Z0 + 0.72)))

M.set_face(mina, "felice")
M.pose(mina, arm_r=arm_up(1), root_rot=(0, 0, math.radians(18)))
rnd("pose_saluta", (640, 800), (0, -5.2, 1.5), (0, 0, 0.62))

M.set_face(mina, "ironica")
M.pose(mina, arm_r=(Vector((0.85, -0.55, M.Z0 + 0.62)), Vector((0.58, -0.1, M.Z0 + 0.5))), root_rot=(0, 0, math.radians(-20)))
rnd("pose_indica", (640, 800), (0, -5.2, 1.5), (0.1, 0, 0.62))

M.set_face(mina, "soddisfatta")
M.pose(mina, root_rot=(0, 0, math.radians(30)), cover_open=75)
rnd("pose_apre", (640, 800), (0, -5.2, 1.5), (0, 0, 0.62))
M.pose(mina)

# sbuca dal telefono: telefono verticale davanti, Mina dietro che sporge dal bordo alto
P.PHONE_W, P.PHONE_T, P.PHONE_H = 0.78, 0.09, 1.5
ph = P.build_phone(SCREEN)
P.place(ph, (0, -0.2, 0.75), 0, 0)
M.set_face(mina, "felice")
M.pose(mina, root_loc=(0, 0.45, 1.05), root_scale=1.0,
       arm_l=(Vector((-0.34, -0.66, 0.48)), Vector((-0.55, -0.30, 0.55))), arm_r=(Vector((0.34, -0.66, 0.48)), Vector((0.55, -0.30, 0.55))))
rnd("pose_telefono", (640, 800), (0, -7.2, 2.0), (0, 0, 1.45))
ph.hide_render = True
ph.hide_viewport = True
for ch_ in ph.children:
    ch_.hide_render = True

# scena con il protagonista (scala relativa)
hero = H.build()
H.set_face(hero, "sorpreso")
H.pose(hero, root_loc=(-1.35, 0, 0), root_rot=(0, 0, math.radians(32)), head_rot=(-0.05, 0, 0.0))
M.set_face(mina, "guarda_sinistra")
M.pose(mina, root_loc=(1.05, -0.25, 0), root_rot=(0, 0, math.radians(-30)), root_scale=1.6)
rnd("scena_con_protagonista", (1200, 800), (0.1, -12.5, 1.8), (-0.1, 0, 1.55), samples=SAMPLES)

with open(os.path.join(OUT, "M_tempi.txt"), "w") as f:
    for k, v in times.items():
        f.write(f"{k}\t{v:.1f}\n")
    f.write(f"TOTALE\t{sum(times.values()):.1f}\n")
print("FATTO", round(sum(times.values())))
