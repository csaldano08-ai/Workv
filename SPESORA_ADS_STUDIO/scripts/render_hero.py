"""
Render del protagonista ricalcato dal riferimento: turnaround, 13 espressioni, prova col telefono.
    ADS_SCREEN=<png schermata app> ADS_SAMPLES=48 python render_hero.py <cartella-output-assoluta>
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import hero as H
import studio as S
import phone as P
import faces2 as F2

OUT = [a for a in sys.argv if os.path.isabs(a)][-1]
SAMPLES = int(os.environ.get("ADS_SAMPLES", "48"))
SCREEN = os.environ["ADS_SCREEN"]
os.makedirs(OUT, exist_ok=True)
os.environ.setdefault("ADS_TMP", os.path.join(OUT, "_tmp"))
H.TMP = os.environ["ADS_TMP"]
os.makedirs(H.TMP, exist_ok=True)
times = {}


def rnd(name, res, loc, target, lens=85, samples=SAMPLES):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    S.aim(sc.camera, loc, target, lens)
    times[name] = S.render(os.path.join(OUT, f"H_{name}.png"))
    print(f"{name}: {times[name]:.1f}s", flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = S.setup((640, 960), SAMPLES)
ch = H.build()

# turnaround
H.set_face(ch, "neutro")
for view, yaw in (("fronte", 0), ("tre_quarti", 38), ("lato", 90)):
    H.pose(ch, root_rot=(0, 0, math.radians(yaw)))
    rnd(f"turn_{view}", (640, 960), (0, -9.6, 1.6), (0, 0, 1.6))
H.pose(ch)

# espressioni (tutte e 13), primi piani
HEADROT = {
    "neutro": (0.0, 0.0, 0.05), "felice": (-0.06, 0.0, 0.0), "sorpreso": (-0.14, 0.0, 0.0), "confuso": (0.0, 0.16, 0.16),
    "stanco": (0.24, 0.06, 0.0), "frustrato": (0.10, 0.0, 0.0), "imbarazzato": (0.06, -0.12, 0.22), "ironico": (0.0, 0.10, -0.2),
    "sguardo_laterale": (0.0, 0.0, 0.42), "guarda_in_camera": (0.0, 0.0, 0.0), "occhi_chiusi": (0.08, 0.04, 0.0),
    "occhi_semichiusi": (0.16, 0.0, 0.0), "sbadiglio": (-0.12, 0.0, 0.0),
}
for e in F2.EXPRESSIONS:
    H.set_face(ch, e)
    H.pose(ch, head_rot=HEADROT[e])
    rnd(f"expr_{e}", (480, 480), (0, -4.7, 2.35), (0, 0, 2.35), samples=32)
H.pose(ch)

# telefono: più grande, proporzionato a questo personaggio
P.PHONE_W, P.PHONE_T, P.PHONE_H = 0.46, 0.06, 0.92
ph = P.build_phone(SCREEN)


def hold(loc, spin, tilt, face, head, root_rot=(0, 0, 0), name="x", roll=0.0):
    R = P.place(ph, loc, spin, tilt, roll)
    a = Vector(loc) + R @ Vector((-P.PHONE_W / 2 - 0.10, 0, -0.30))
    b = Vector(loc) + R @ Vector((P.PHONE_W / 2 + 0.10, 0, -0.30))
    left, right = (a, b) if a.x < b.x else (b, a)

    def spec(end, sign):
        shp = Vector((sign * H.SHOULDER["x"], 0, H.SHOULDER["z"]))
        return (end, (shp + end) / 2 + Vector((sign * 0.34, 0.12, -0.40)))

    H.set_face(ch, face)
    H.pose(ch, arm_l=spec(left, -1), arm_r=spec(right, 1), head_rot=head, root_rot=root_rot)
    rnd(f"phone_{name}", (540, 810), (0, -8.0, 1.95), (0, 0, 1.95), samples=SAMPLES)


hold((0, -0.66, 1.42), 180, -26, "occhi_semichiusi", (0.18, 0, 0), name="1_guarda")
hold((0, -0.70, 1.52), 180, -16, "sorpreso", (-0.15, 0, 0), root_rot=(math.radians(-4), 0, 0), name="2_sorpresa")
hold((0, -0.78, 1.46), 0, 6, "ironico", (0.0, 0.14, -0.12), name="3_mostra")

with open(os.path.join(OUT, "H_tempi.txt"), "w") as f:
    for k, v in times.items():
        f.write(f"{k}\t{v:.1f}\n")
    f.write(f"TOTALE\t{sum(times.values()):.1f}\n")
print("FATTO", round(sum(times.values())))
