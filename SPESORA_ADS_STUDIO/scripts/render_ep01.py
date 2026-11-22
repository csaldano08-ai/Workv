"""
EP01 — "Il frigorifero delle 21:00": render dei fotogrammi chiave per l'ANIMATIC (versione semplificata, 720x1280).

    ADS_SCREEN=<png schermata app> ADS_SAMPLES=40 python render_ep01.py <cartella-output-assoluta> [nome_shot ...]

Ogni inquadratura è un fotogramma chiave (posa) del protagonista e/o di Mina nella cucina 3D. L'animatic le monta con tempi,
sottotitoli provvisori e movimenti di camera semplici. NON è il render finale e NON contiene voci né effetti definitivi.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
import kitchen as K
import hero as H
import mina as M
import phone as P

args = [a for a in sys.argv[1:] if a != "--"]
OUT = [a for a in args if os.path.isabs(a)][-1]
ONLY = [a for a in args if not os.path.isabs(a)]
SAMPLES = int(os.environ.get("ADS_SAMPLES", "40"))
SCREEN = os.environ["ADS_SCREEN"]
RES = (720, 1280)
os.makedirs(OUT, exist_ok=True)
tmp = os.path.join(OUT, "_tmp")
os.makedirs(tmp, exist_ok=True)
H.TMP = tmp
M.TMP = tmp
M.CALIB = None  # in cucina le luci sono diverse: nessuna calibrazione
times = {}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = K.setup_render(RES, SAMPLES)
kit = K.build()
hero = H.build()
mina = M.build()
P.PHONE_W, P.PHONE_T, P.PHONE_H = 0.36, 0.05, 0.70
phone = P.build_phone(SCREEN)
PARK = (0, -80, 0)
glow = K.light("phone_glow", "POINT", (-1.8, 3.4, 2.6), 0, (0.8, 0.9, 1.0), 0.15)

CT = 2.03  # altezza del piano di lavoro (superficie)
FR0 = {"fridge_light": kit["fridge_light"].data.energy, "fridge_light2": kit["fridge_light2"].data.energy}


def fridge(open_deg, on=True, k=1.0):
    K.set_door(kit, open_deg)
    for k_, e in FR0.items():
        kit[k_].data.energy = e * k if on else 0


def lamp(e):
    kit["lamp"].data.energy = e


def to_local(root_loc, yaw_deg, scale, world):
    v = (Vector(world) - Vector(root_loc)) / scale
    return Matrix.Rotation(-math.radians(yaw_deg), 3, "Z") @ v


def hero_at(loc, yaw, face, head=(0, 0, 0), arms=None):
    H.set_face(hero, face)
    al = ar = None
    if arms:
        al, ar = arms
    H.pose(hero, arm_l=al, arm_r=ar, head_rot=head, root_loc=loc, root_rot=(0, 0, math.radians(yaw)))


def hero_park():
    H.pose(hero, root_loc=PARK)


def mina_at(loc, yaw, face, scale=0.8, arm_l=None, arm_r=None, cover_open=0.0):
    """arm_*: (mano_mondo, gomito_mondo) in coordinate del MONDO."""
    M.set_face(mina, face)
    conv = lambda a: None if a is None else (to_local(loc, yaw, scale, a[0]), to_local(loc, yaw, scale, a[1]))
    M.pose(mina, arm_l=conv(arm_l), arm_r=conv(arm_r), root_loc=loc, root_rot=(0, 0, math.radians(yaw)), root_scale=scale, cover_open=cover_open)


def mina_park():
    M.pose(mina, root_loc=PARK)


def phone_at(loc, tilt=-10, spin=0, visible=True):
    P.place(phone, loc if visible else PARK, spin, tilt)


def shot(name, loc, target, lens=40, fstop=None):
    if ONLY and name not in ONLY:
        return False
    K.aim(loc, target, lens, fstop)
    sc.render.filepath = os.path.join(OUT, f"EP01_{name}.png")
    import time
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    times[name] = time.time() - t0
    print(f"{name}: {times[name]:.1f}s", flush=True)
    return True


def wants(*names):
    return (not ONLY) or any(n in ONLY for n in names)


# ================================================================= SCENA 1 — IL PROBLEMA
lamp(380)
mina_park()
phone_at((0, 0, 0), visible=False)
hero_at((2.7, 1.6, 0), 180, "stanco", head=(0.2, 0, 0.0))
fridge(100)
if wants("S1a_frigo_largo"):
    shot("S1a_frigo_largo", (0.2, -7.0, 3.2), (2.6, 2.4, 2.4), 30)
# primo piano del viso illuminato dalla luce del frigorifero (camera DENTRO il frigo che guarda verso di lui)
hero_at((2.7, 1.6, 0), 180, "stanco", head=(0.14, 0, 0.0))
fridge(100, k=0.22)
if wants("S1b_viso_frigo"):
    shot("S1b_viso_frigo", (2.8, 4.55, 2.85), (2.7, 1.6, 2.62), 40, fstop=2.2)

# ================================================================= SCENA 2 — QUARTA PARETE
lamp(380)
fridge(75, k=0.8)
hero_at((2.2, 1.6, 0), 80, "neutro", head=(0.0, 0, -0.35))
if wants("S2a1_si_gira"):
    shot("S2a1_si_gira", (2.4, -5.4, 2.7), (3.0, 1.8, 2.4), 32)
fridge(70, k=0.8)
hero_at((2.2, 1.6, 0), 8, "guarda_in_camera", head=(-0.04, 0, 0))
if wants("S2a2_guarda_camera"):
    shot("S2a2_guarda_camera", (2.4, -5.4, 2.7), (3.0, 1.8, 2.4), 32)
fridge(70, k=0.25)
hero_at((2.2, 1.6, 0), 0, "sguardo_laterale", head=(0.0, 0.05, 0.0))
if wants("S2b1_pausa_sguardo"):
    shot("S2b1_pausa_sguardo", (2.2, -1.5, 2.7), (2.2, 1.6, 2.6), 48, fstop=2.8)
hero_at((2.2, 1.6, 0), 0, "stanco", head=(0.12, 0.1, 0.0))
if wants("S2b2_pausa_stanco"):
    shot("S2b2_pausa_stanco", (2.2, -1.5, 2.7), (2.2, 1.6, 2.6), 48, fstop=2.8)

# ================================================================= SCENA 3 — ARRIVA MINA
lamp(430)
fridge(0, on=False)
hero_at((2.6, 1.2, 0), 340, "occhi_semichiusi", head=(0.1, 0, 0.0))
phone_at((-1.8, 4.15, CT + 0.35), tilt=-10)
glow.data.energy = 18
if wants("S3a_telefono_notifica"):
    shot("S3a_telefono_notifica", (-1.8, 1.3, 2.6), (-1.8, 4.2, 2.45), 50)
# Mina sbuca da dietro il telefono
hero_park()
ml = (-1.8, 4.6, CT)
mina_at(ml, 0, "felice", 0.8,
        arm_l=((-2.0, 4.05, CT + 0.7), (-2.25, 4.3, CT + 0.62)), arm_r=((-1.6, 4.05, CT + 0.7), (-1.35, 4.3, CT + 0.62)))
if wants("S3b1_mina_sbuca"):
    shot("S3b1_mina_sbuca", (-2.4, 0.7, 3.1), (-1.8, 4.2, 2.6), 42)
# Mina fuori, sul piano; il protagonista si spaventa
glow.data.energy = 30
mina_at((-1.0, 3.9, CT), -18, "ironica", 0.8,
        arm_r=((-0.45, 3.6, CT + 0.55), (-0.5, 3.85, CT + 0.35)))
hero_at((0.5, 2.1, 0), 335, "sorpreso", head=(-0.15, 0, -0.1),
        arms=(((-0.95, -0.2, 1.95), (-0.9, 0.05, 1.5)), ((0.95, -0.2, 1.95), (0.9, 0.05, 1.5))))
if wants("S3c_spavento"):
    shot("S3c_spavento", (0.9, -2.8, 2.9), (-0.45, 3.2, 2.45), 32)

# ================================================================= SCENA 4 — MOSTRIAMO SPESORA
hero_at((0.5, 2.1, 0), 330, "sguardo_sinistra", head=(0.0, 0, 0.1))
mina_at((-1.0, 3.9, CT), -12, "felice", 0.8,
        arm_l=((-1.75, 3.6, CT + 0.45), (-1.45, 3.75, CT + 0.5)))
if wants("S4a_mina_indica"):
    shot("S4a_mina_indica", (-0.2, -0.4, 3.0), (-1.3, 4.0, 2.55), 40)

# ================================================================= SCENA 5 — LA SOLUZIONE
hero_at((0.5, 2.1, 0), 335, "felice", head=(0.0, 0, 0.0))
mina_at((-1.0, 3.9, CT), -15, "soddisfatta", 0.8)
if wants("S5a_soluzione"):
    shot("S5a_soluzione", (0.8, -2.4, 2.8), (-0.35, 3.3, 2.45), 32)
hero_at((0.9, 1.7, 0), 0, "ironico", head=(0.0, 0.12, -0.08))
mina_park()
if wants("S5b_sguardo_pubblico"):
    shot("S5b_sguardo_pubblico", (1.0, -1.4, 2.7), (0.9, 1.7, 2.6), 48, fstop=2.8)

with open(os.path.join(OUT, "EP01_tempi.txt"), "w") as f:
    for k_, v in times.items():
        f.write(f"{k_}\t{v:.1f}\n")
    f.write(f"TOTALE\t{sum(times.values()):.1f}\n")
print("FATTO", round(sum(times.values())))

# sorgente Blender (immagini incorporate), per riprendere il lavoro
if not ONLY:
    try:
        K.set_door(kit, 0)
        hero_at((0.9, 1.7, 0), 335, "felice")
        mina_at((-1.0, 3.9, CT), -15, "soddisfatta", 0.8)
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "ep01_cucina.blend"), compress=True)
        print("blend salvato")
    except Exception as e:  # noqa: BLE001
        print("blend non salvato:", e)
