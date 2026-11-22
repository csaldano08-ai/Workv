"""
Render dei concept del protagonista: per ogni variante -> turnaround, espressioni, prova col telefono.
    python render_concepts.py <variante A|B|C> <cartella-output> [campioni]
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import characters as C
import studio as S
import phone as P

variant = sys.argv[-3] if len(sys.argv) > 3 else sys.argv[-2]
OUT = sys.argv[-2] if len(sys.argv) > 3 else sys.argv[-1]
SAMPLES = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 36
variant = [a for a in sys.argv if a in ("A", "B", "C")][-1]
OUT = [a for a in sys.argv if os.path.isabs(a) or a.startswith(".")][-1]
SAMPLES = int(os.environ.get("ADS_SAMPLES", "36"))
SCREEN = os.environ.get("ADS_SCREEN")
os.makedirs(OUT, exist_ok=True)
os.environ.setdefault("ADS_TMP", os.path.join(OUT, "_tmp"))
C.TMP = os.environ["ADS_TMP"]
os.makedirs(C.TMP, exist_ok=True)

times = {}


def rnd(name, res, aim, lens=85, samples=SAMPLES):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    S.aim(sc.camera, aim[0], aim[1], lens)
    times[name] = S.render(os.path.join(OUT, f"{variant}_{name}.png"))
    print(f"[{variant}] {name}: {times[name]:.1f}s", flush=True)


C.delete_all()
sc = S.setup((640, 960), SAMPLES)
ch = C.build(variant)
V = ch["V"]
hc = V["head_c"]

# ---------------------------------------------------------------- turnaround
C.set_face(ch, "neutro")
for view, yaw in (("fronte", 0), ("tre_quarti", 38), ("lato", 90)):
    C.pose(ch, root_rot=(0, 0, math.radians(yaw)))
    rnd(f"turn_{view}", (640, 960), ((0, -8.4, 1.2), (0, 0, 1.2)))
C.pose(ch)

# ---------------------------------------------------------------- espressioni
EXPR = [
    ("neutro", (0.0, 0.0, 0.05)), ("felice", (-0.05, 0.0, 0.0)), ("sorpreso", (-0.12, 0.0, 0.0)), ("confuso", (0.0, 0.16, 0.15)),
    ("stanco", (0.22, 0.05, 0.0)), ("frustrato", (0.10, 0.0, 0.0)), ("imbarazzato", (0.05, -0.12, 0.2)), ("ironico", (0.0, 0.10, -0.2)),
]
for name, hr in EXPR:
    C.set_face(ch, name)
    C.pose(ch, head_rot=hr)
    rnd(f"expr_{name}", (480, 480), ((0, -4.0, hc[2] - 0.1), (0, 0, hc[2] - 0.1)), samples=28)
C.pose(ch)

# ---------------------------------------------------------------- prova col telefono: 3 fotogrammi
ph = P.build_phone(SCREEN)
sh = V["sh_z"]
chest = V["torso_c"][2] + V["torso_s"][2] * 0.15


def hold(ph_loc, spin, tilt, roll=0.0, face="neutro", head=(0, 0, 0), root_rot=(0, 0, 0), name="x", dz=-0.22):
    R = P.place(ph, ph_loc, spin, tilt, roll)
    a, b = P.hand_points(ph_loc, R, dz)
    left, right = (a, b) if a.x < b.x else (b, a)

    def spec(end, sign):
        shp = Vector((sign * V["sh_x"], 0, sh))
        elbow = (shp + end) / 2 + Vector((sign * 0.32, 0.10, -0.32))
        return (end, elbow)

    C.set_face(ch, face)
    C.pose(ch, arm_l=spec(left, -1), arm_r=spec(right, 1), head_rot=head, root_rot=root_rot)
    cz = V["torso_c"][2] + 0.28
    rnd(f"phone_{name}", (540, 810), ((0, -6.2, cz + 0.2), (0, 0, cz + 0.2)), samples=SAMPLES)


# 1) guarda il telefono, annoiato (schermo verso il viso)
hold((0, -0.48, chest + 0.08), 180, -28, face="occhi_semichiusi", head=(0.20, 0.0, 0.0), name="1_guarda")
# 2) si accorge della notifica: sorpresa, si tira indietro
hold((0, -0.52, chest + 0.18), 180, -18, face="sorpreso", head=(-0.16, 0, 0), root_rot=(math.radians(-5), 0, 0), name="2_sorpresa")
# 3) gira il telefono verso la camera (quarta parete)
hold((0, -0.60, chest + 0.22), 0, 6, face="ironico", head=(0.0, 0.14, -0.12), name="3_mostra")

with open(os.path.join(OUT, f"{variant}_tempi.txt"), "w") as f:
    for k, v in times.items():
        f.write(f"{k}\t{v:.1f}\n")
    f.write(f"TOTALE\t{sum(times.values()):.1f}\n")
print(f"[{variant}] FATTO totale {sum(times.values()):.0f}s")
