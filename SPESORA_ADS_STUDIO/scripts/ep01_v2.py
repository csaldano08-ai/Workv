"""
EP01 v2 — stessa scena, stessi personaggi, stessa cucina; regia rifinita dopo la verifica del primo montaggio.
Due versioni dallo stesso progetto:

  A = SPESORA_EP01_NARRATORE  (narratore esterno + Mina; il protagonista non parla mai)
  B = SPESORA_EP01_DIALOGHI   (il protagonista parla, Mina risponde)

    ADS_VERSION=A|B ADS_SAMPLES=10 ADS_RES=540x960 [ADS_RANGES="2.6-5.0,13.4-17"] python ep01_v2.py <out> <ui_seq> [--no-render]

Le due versioni hanno IDENTICA animazione del corpo fuori dai tratti in cui qualcuno parla: per B si renderizzano solo gli intervalli
che cambiano (B_RANGES) e il resto si riprende da A. Scrive:
  frames/f_####.png, screen_quads.json (angoli dello schermo per l'inserto nitido dell'app), fx.json, <nome>.blend, cue.json
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

import anim as A
from anim import K, Step, smoothstep, spring_series, FPS
import kitchen as KT
import rig_hero as RH
import rig_mina as RM
import mina as M
import phone as P

args = [a for a in sys.argv[1:] if a != "--"]
flags = [a for a in args if a.startswith("--")]
pos = [a for a in args if not a.startswith("--")]
OUT, UISEQ = pos[0], pos[1]
VERSION = os.environ.get("ADS_VERSION", "A")
SAMPLES = int(os.environ.get("ADS_SAMPLES", "10"))
RES = tuple(int(v) for v in os.environ.get("ADS_RES", "540x960").split("x"))
RANGES = [tuple(float(x) for x in r.split("-")) for r in os.environ.get("ADS_RANGES", "").split(",") if r]
DUR3D = 32.0
NFR = int(DUR3D * FPS)
CT = 2.03
# tratti che cambiano tra A e B (inquadrature in cui si vede chi parla)
B_RANGES = [(2.6, 5.0), (6.4, 9.1), (13.4, 17.0), (17.0, 18.6), (27.0, 32.0)]
os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(OUT, "_tmp")
os.makedirs(TMP, exist_ok=True)
M.CALIB = None


def in_b(t):
    return any(a <= t < b for a, b in B_RANGES)


# ====================================================================== COPIONE (tempi stimati: il montaggio si adatterà ai WAV reali)
if VERSION == "A":
    LINES = [
        ("NARRATORE", "Otto di sera. Frigo aperto. Idee per cena… nessuna.", 0.5, 4.7, "ironico, asciutto", "voice_narrator"),
        ("NARRATORE", "Ogni sera la stessa domanda: cosa si mangia?", 5.6, 9.0, "complice, leggermente divertito", "voice_narrator"),
        ("MINA", "Ehi! A questo ci penso io.", 14.1, 15.8, "allegra, sicura", "voice_mina"),
        ("NARRATORE", "Spesora organizza i pasti della settimana,", 17.6, 21.4, "chiaro, caldo, senza fretta", "voice_narrator"),
        ("NARRATORE", "ti mostra la ricetta del giorno", 22.4, 24.3, "chiaro, caldo", "voice_narrator"),
        ("NARRATORE", "e prepara la lista della spesa.", 24.9, 26.7, "chiaro, conclusivo", "voice_narrator"),
        ("NARRATORE", "E la cena di stasera… è già decisa.", 27.4, 30.4, "soddisfatto, chiusura", "voice_narrator"),
        ("NARRATORE", "Spesora. Cosa cucini? Già deciso.", 32.3, 34.9, "firma del brand", "voice_narrator"),
    ]
else:
    LINES = [
        ("PROTAGONISTA", "Sono le otto e non so ancora cosa cucinare.", 2.7, 4.8, "stanco, frustrato", "voice_protagonist"),
        ("PROTAGONISTA", "Non ditemi che succede solo a me.", 6.6, 8.9, "complice, rivolto allo spettatore", "voice_protagonist"),
        ("MINA", "Se ti organizzassi prima, non saremmo qui ogni sera.", 13.9, 16.8, "ironica ma gentile", "voice_mina"),
        ("MINA", "Guarda! Hai già i pasti della settimana,", 17.2, 20.2, "entusiasta, chiara", "voice_mina"),
        ("MINA", "le ricette e la lista della spesa.", 20.5, 22.6, "entusiasta, chiara", "voice_mina"),
        ("PROTAGONISTA", "Quindi domani so già cosa cucinare?", 27.3, 29.3, "sorpreso, quasi incredulo", "voice_protagonist"),
        ("MINA", "Anche dopodomani.", 29.5, 30.6, "soddisfatta, sorriso nella voce", "voice_mina"),
    ]
SPEAK_H = [(a, b, txt) for who, txt, a, b, *_ in LINES if who == "PROTAGONISTA"]
SPEAK_M = [(a, b, txt) for who, txt, a, b, *_ in LINES if who == "MINA" and b <= 32]

# ====================================================================== scena
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = KT.setup_render(RES, SAMPLES)
sc.cycles.max_bounces = 4
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.06
sc.render.use_persistent_data = True
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, NFR
kit = KT.build()
hero = RH.HeroRig(os.path.join(TMP, "hero"))
mina = RM.MinaRig(os.path.join(TMP, "mina"))

# telefono: cornice antracite, schermo come vero display (emissione = immagine, nessuna luce che lo "sbianca")
P.PHONE_W, P.PHONE_T, P.PHONE_H = 0.36, 0.05, 0.70
phone = P.build_phone(os.path.join(UISEQ, "ui_0001.png"))
screen_ob = [o for o in phone.children if o.name.endswith("_screen")][0]
UI_START = int(19.2 * FPS) + 1
UI_N = len([f for f in os.listdir(UISEQ) if f.startswith("ui_") and f.endswith(".png")])
FULLSEQ = os.path.join(TMP, "uiseq_full")
os.makedirs(FULLSEQ, exist_ok=True)
UI_INDEX = {}
for _f in range(1, NFR + 1):
    _i = 1 if _f < UI_START else min(UI_N, _f - UI_START + 1)
    UI_INDEX[_f] = _i
    _dst = os.path.join(FULLSEQ, f"ui_{_f:04d}.png")
    if os.path.lexists(_dst):
        os.remove(_dst)
    os.symlink(os.path.join(UISEQ, f"ui_{_i:04d}.png"), _dst)
scr_mat = bpy.data.materials.new("phone_display")
scr_mat.use_nodes = True
nt = scr_mat.node_tree
nt.nodes.clear()
n_out = nt.nodes.new("ShaderNodeOutputMaterial")
n_bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
n_tex = nt.nodes.new("ShaderNodeTexImage")
img = bpy.data.images.load(os.path.join(FULLSEQ, "ui_0001.png"))
img.source = "SEQUENCE"
n_tex.image = img
iu = n_tex.image_user
iu.frame_duration = NFR
iu.frame_start = 1
iu.use_auto_refresh = True
n_on = nt.nodes.new("ShaderNodeValue")
n_on.name = "on"
n_mix = nt.nodes.new("ShaderNodeMixRGB")
n_mix.blend_type = "MULTIPLY"
n_mix.inputs["Fac"].default_value = 1.0
nt.links.new(n_tex.outputs["Color"], n_mix.inputs["Color1"])
nt.links.new(n_on.outputs[0], n_mix.inputs["Color2"])
n_bsdf.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1)  # vetro nero: la luce della stanza non schiarisce i pixel
nt.links.new(n_mix.outputs["Color"], n_bsdf.inputs["Emission Color"])
n_bsdf.inputs["Emission Strength"].default_value = 0.92  # con "Standard": 1 = colore originale dell'interfaccia
n_bsdf.inputs["Roughness"].default_value = 0.18
if "Specular IOR Level" in n_bsdf.inputs:
    n_bsdf.inputs["Specular IOR Level"].default_value = 0.25
nt.links.new(n_bsdf.outputs["BSDF"], n_out.inputs["Surface"])
screen_ob.data.materials.clear()
screen_ob.data.materials.append(scr_mat)
FR0 = {k: kit[k].data.energy for k in ("fridge_light", "fridge_light2")}
glow = KT.light("phone_glow", "POINT", (-1.8, 3.6, 2.6), 0, (0.8, 0.9, 1.0), 0.15)

FW = KT.FRIDGE["x1"] - KT.FRIDGE["x0"]
H0 = Vector((KT.FRIDGE["x1"], KT.FRIDGE["y0"] - 0.06))
PHONE_LOC = (-1.8, 4.15, CT + 0.35)
MINA_SPOT = (-1.1, 3.95)
HERO_SPOT = (0.35, 2.85)


def door_pt(theta_deg, lx, ly, z):
    a = math.radians(theta_deg)
    return (H0.x + lx * math.cos(a) - ly * math.sin(a), H0.y + lx * math.sin(a) + ly * math.cos(a), z)


# ====================================================================== frigo e luci
door_target = K(0, 0, 0.85, 0, 1.55, 100, 5.2, 100, 5.3, 100, 6.1, 64, 40, 64)
door_series = spring_series([door_target(i / FPS) for i in range(NFR + 1)], freq=1.5, zeta=0.45)


def door_angle(t):
    return max(0.0, door_series[max(0, min(NFR, int(round(t * FPS))))])


def fridge_k(t):
    return 0.2 if 2.6 <= t < 5.0 else (0.8 if 5.0 <= t < 8.0 else (0.12 if 8.0 <= t < 11.0 else 1.0))


lamp_e = K(0, 330, 11.0, 330, 12.0, 430, 40, 430)
phone_on = K(0, 0, 10.98, 0, 11.12, 1, 40, 1)
glow_e = K(0, 0, 10.98, 0, 11.1, 7, 13.0, 6, 40, 5)
phone_buzz = lambda t: 2.6 * math.sin(2 * math.pi * 26 * t) * smoothstep(11.0, 11.05, t) * (1 - smoothstep(11.35, 11.5, t))

# ====================================================================== PROTAGONISTA (corpo condiviso da A e B)
hx = K(0, 1.0, 0.5, 1.0, 1.0, 0.8, 1.25, 0.95, 2.55, 3.2, 5.2, 3.2, 6.0, 2.6, 11.3, 2.6, 12.9, HERO_SPOT[0], 13.45, HERO_SPOT[0], 13.62, HERO_SPOT[0] + 0.22, 14.4, HERO_SPOT[0] + 0.1, 40, HERO_SPOT[0] + 0.1)
hy = K(0, 2.05, 0.5, 2.05, 1.0, 2.2, 1.25, 2.15, 2.55, 1.9, 6.0, 1.9, 11.3, 1.9, 12.9, HERO_SPOT[1], 40, HERO_SPOT[1])
hyaw = K(0, 170, 1.0, 172, 1.5, 178, 2.55, 180, 5.9, 180, 6.9, 8, 11.0, 8, 11.35, -8, 12.2, -40, 12.9, -26, 13.45, -26, 13.62, -16, 14.4, -26,
         17.3, -26, 18.0, -36, 19.4, -36, 27.0, -30, 27.4, -26, 30.4, -24, 30.85, -12, 40, -12)
walk_h = A.Walk(hx, hy, hyaw, DUR3D + 1)
h_pitch = K(0, 6, 0.4, 6, 0.75, -9, 1.0, -15, 1.4, -2, 2.5, 4, 4.3, 4, 4.7, 10, 5.1, 2, 6.0, 3, 6.9, 0, 7.6, -2, 8.2, 3, 9.6, 3, 10.3, 9, 11.0, 6, 11.15, -2,
            13.45, 0, 13.6, -14, 14.2, 2, 14.6, 0, 17.3, 0, 18.0, 6, 19.4, 6, 27.0, 4, 27.6, 0, 28.6, -2, 29.4, 1, 30.5, 0)
h_roll = K(0, 4, 3.0, 2, 4.5, -3, 7.6, 0, 8.0, 5, 10.3, 6, 11.0, 3, 13.5, 0, 13.65, 7, 14.4, -2, 15.5, 0, 27.0, 0, 28.0, -4, 29.4, 3, 30.5, 0)
h_twist = K(0, 0, 5.7, 0, 6.2, 10, 6.9, 0, 13.5, 0, 13.7, 9, 14.5, -3, 15.2, 0)
h_squash = K(0, 0, 4.5, 0, 4.8, 0.06, 5.1, -0.01, 5.3, 0, 7.7, 0, 7.9, -0.04, 8.1, 0.03, 8.3, 0, 10.2, 0, 10.5, 0.06, 10.9, 0,
             13.45, 0, 13.52, 0.12, 13.66, -0.12, 13.95, 0.06, 14.3, 0, 27.5, 0, 28.2, 0.05, 28.6, -0.02, 29.0, 0)
n_pitch = K(0, 10, 0.7, 14, 1.1, 2, 1.8, 6, 2.6, 4, 3.3, -4, 3.9, 6, 4.4, 12, 4.9, 14, 5.2, 4, 5.6, 4, 6.0, -2, 6.8, 2, 7.6, -3, 8.4, 3, 9.2, 3, 9.6, 6,
            10.3, 15, 10.9, 12, 11.1, 0, 12.9, 2, 13.45, 2, 13.6, -14, 14.3, 4, 15.0, 2, 17.3, 2, 18.0, 10, 19.4, 10, 27.0, 6, 27.4, 2, 28.6, 4, 29.4, 0, 30.6, -3, 31.4, 2)
n_roll = K(0, 6, 2.6, 8, 4.5, 3, 5.6, 3, 6.5, 0, 7.4, 6, 8.4, 4, 9.3, -5, 10.4, 7, 11.0, 4, 11.2, 0, 13.5, 0, 13.65, -8, 14.6, 2, 17.3, 0, 18.2, 4, 27.0, 3, 28.0, 7, 29.0, 2, 30.6, 0, 31.3, 9)
n_yaw = K(0, -8, 0.4, -16, 1.0, -10, 2.6, 0, 3.1, -10, 3.7, 9, 4.2, 0, 5.4, 0, 5.8, -34, 6.5, -10, 7.0, 0, 9.25, 0, 9.45, 20, 9.95, 18, 10.15, 0,
          11.0, 0, 11.15, -24, 12.9, -14, 13.45, -14, 13.55, -22, 14.1, -15, 17.25, -15, 17.5, -24, 19.4, -24, 27.0, -18, 27.3, -15, 28.5, -15, 28.65, -24,
          29.25, -24, 29.4, -15, 30.4, -15, 30.7, 0, 40, 0)
HP = dict(
    neutral=dict(browL_dy=0.0, browL_rot=17, browR_dy=0.0, browR_rot=-17, lidL=0.0, lidR=0.0, pupil_scale=1.0, eyeL_scale=1.0, eyeR_scale=1.0),
    tired=dict(browL_dy=-0.014, browL_rot=7, browR_dy=-0.014, browR_rot=-7, lidL=0.42, lidR=0.42, pupil_scale=1.0, eyeL_scale=1.0, eyeR_scale=1.0),
    surprised=dict(browL_dy=0.055, browL_rot=11, browR_dy=0.055, browR_rot=-11, lidL=0.0, lidR=0.0, pupil_scale=0.7, eyeL_scale=1.12, eyeR_scale=1.12),
    happy=dict(browL_dy=0.024, browL_rot=14, browR_dy=0.024, browR_rot=-14, lidL=0.0, lidR=0.0, pupil_scale=1.0, eyeL_scale=1.0, eyeR_scale=1.0),
    ironic=dict(browL_dy=-0.012, browL_rot=4, browR_dy=0.045, browR_rot=-16, lidL=0.42, lidR=0.0, pupil_scale=1.0, eyeL_scale=1.0, eyeR_scale=1.0),
    camera=dict(browL_dy=0.016, browL_rot=15, browR_dy=0.016, browR_rot=-15, lidL=0.12, lidR=0.12, pupil_scale=1.05, eyeL_scale=1.0, eyeR_scale=1.0),
    curious=dict(browL_dy=0.03, browL_rot=13, browR_dy=0.012, browR_rot=-18, lidL=0.0, lidR=0.0, pupil_scale=1.0, eyeL_scale=1.04, eyeR_scale=1.04),
)
hw = dict(
    neutral=K(0, 0.25, 40, 0.25),
    tired=K(0, 1, 5.6, 1, 6.0, 0.15, 9.1, 0.15, 9.5, 1, 11.0, 1, 11.1, 0, 40, 0),
    camera=K(0, 0, 6.1, 0, 6.5, 1, 9.1, 1, 9.3, 0, 40, 0),
    surprised=K(0, 0, 11.0, 0, 11.08, 0.7, 11.5, 0.2, 13.45, 0.2, 13.52, 1, 14.3, 1, 14.7, 0, 40, 0),
    curious=K(0, 0, 14.5, 0, 14.9, 1, 17.2, 1, 17.6, 0.6, 19.4, 0.6, 27.0, 0.4, 27.3, 0, 40, 0),
    happy=K(0, 0, 28.0, 0, 28.5, 1, 40, 1),
)
# sguardo: gli occhi anticipano la testa di ~0.12 s e hanno sempre un bersaglio
#   gaze_x > 0 verso la destra del personaggio (sinistra dello schermo quando guarda la camera)
hgaze_x = K(0, 0.2, 2.6, 0.0, 2.95, -0.75, 3.55, 0.75, 4.05, 0.0, 5.3, 0.0, 5.65, -0.6, 6.3, 0.0, 9.2, 0.0, 9.33, 0.9, 9.95, 0.9, 10.05, 0.0,
            11.0, 0.0, 11.05, -0.9, 13.4, -0.9, 13.5, -0.4, 13.9, -0.95, 17.2, -0.95, 17.33, -1.0, 27.0, -1.0, 27.15, -0.95, 28.45, -0.95, 28.55, -1.0, 29.2, -1.0,
            29.3, -0.95, 30.45, -0.95, 30.58, 0.0, 40, 0.0)
hgaze_y = K(0, -0.4, 2.6, -0.2, 2.95, 0.5, 3.55, 0.1, 4.05, -0.6, 4.5, -0.5, 6.3, 0.0, 9.2, 0.0, 9.33, -0.2, 10.05, -0.4, 11.0, -0.3, 11.05, -0.1,
            13.5, 0.2, 13.9, 0.0, 17.2, 0.0, 17.33, -0.45, 27.0, -0.45, 27.15, 0.0, 28.45, 0.0, 28.55, -0.45, 29.2, -0.45, 29.3, 0.0, 30.58, 0.0)
hconv = K(0, 0.8, 2.85, 0.8, 2.95, 0.1, 4.0, 0.1, 4.2, 0.7, 6.3, 0.7, 6.5, 0.3, 9.2, 0.3, 9.33, 0.0, 10.05, 0.0, 10.2, 0.6, 11.0, 0.6, 11.05, 0.05, 30.45, 0.05, 30.58, 0.3, 40, 0.3)
# battiti di ciglia intenzionali: sui cambi di sguardo e sui cambi di pensiero
blinks_h = [1.05, 2.78, 4.05, 5.62, 6.35, 7.9, 9.2, 10.85, 11.12, 12.4, 14.4, 15.9, 17.25, 19.0, 27.05, 28.5, 30.5, 31.6]
if VERSION == "A":
    mode_h = Step([(0, "open"), (4.55, "arc_sleep"), (5.0, "open"), (10.35, "arc_sleep"), (10.8, "open"), (29.7, "arc_happy"), (30.25, "open")])
else:
    mode_h = Step([(0, "open"), (4.85, "arc_sleep"), (5.15, "open"), (10.35, "arc_sleep"), (10.8, "open"), (29.75, "arc_happy"), (30.25, "open")])
# bocca NON parlata (reazioni): A non parla mai
rest_h = Step([(0, "m_line"), (3.3, "m_wavy"), (4.4, "m_o"), (4.9, "m_line"), (6.4, "m_line"), (7.6, "m_wavy"), (8.6, "m_line"), (10.2, "m_osmall"),
               (10.75, "m_line"), (11.05, "m_osmall"), (11.6, "m_line"), (13.5, "m_o"), (14.3, "m_osmall"), (15.0, "m_line"), (17.4, "m_osmall"),
               (18.4, "m_smile"), (27.0, "m_smile"), (28.4, "m_open"), (29.0, "m_smile"), (30.7, "m_smirk"), (31.4, "m_smile")])
if VERSION == "B":
    rest_h = Step([(0, "m_line"), (4.85, "m_o"), (5.2, "m_line"), (9.0, "m_line"), (10.2, "m_osmall"), (10.75, "m_line"), (11.05, "m_osmall"), (11.6, "m_line"),
                   (13.5, "m_o"), (14.3, "m_osmall"), (15.0, "m_line"), (17.4, "m_osmall"), (18.4, "m_smile"), (27.0, "m_line"), (29.35, "m_line"),
                   (29.8, "m_open"), (30.3, "m_smile"), (30.7, "m_o"), (31.15, "m_open"), (31.5, "m_smile")])
vis_h = Step(sum([A.visemes(txt, a, b, rest="m_line") for a, b, txt in SPEAK_H], []), "m_line") if SPEAK_H else None


def hero_mouth(t):
    if vis_h and any(a <= t < b for a, b, _ in SPEAK_H):
        return vis_h(t)
    return rest_h(t)


# braccia (spazio dei fianchi)
hl_free = dict(
    x=K(0, -0.78, 7.6, -0.78, 7.9, -0.98, 8.3, -0.98, 8.6, -0.78, 13.45, -0.78, 13.55, -0.95, 14.1, -0.95, 14.6, -0.78, 40, -0.78),
    y=K(0, -0.02, 7.6, -0.02, 7.9, -0.25, 8.3, -0.25, 8.6, -0.02, 13.45, -0.02, 13.55, -0.45, 14.1, -0.45, 14.6, -0.02, 40, -0.02),
    z=K(0, 0.03, 7.6, 0.03, 7.9, 0.5, 8.3, 0.5, 8.6, 0.03, 13.45, 0.03, 13.55, 0.95, 14.1, 0.95, 14.6, 0.03, 40, 0.03),
)
hr_free = dict(
    x=K(0, 0.78, 7.6, 0.78, 7.9, 0.98, 8.3, 0.98, 8.6, 0.78, 13.45, 0.78, 13.55, 0.95, 14.1, 0.95, 14.6, 0.78, 27.2, 0.78, 27.6, 0.32, 28.5, 0.32, 28.9, 0.78, 40, 0.78),
    y=K(0, -0.02, 7.6, -0.02, 7.9, -0.25, 8.3, -0.25, 8.6, -0.02, 13.45, -0.02, 13.55, -0.45, 14.1, -0.45, 14.6, -0.02, 27.2, -0.02, 27.6, -0.48, 28.5, -0.48, 28.9, -0.02, 40, -0.02),
    z=K(0, 0.03, 7.6, 0.03, 7.9, 0.5, 8.3, 0.5, 8.6, 0.03, 13.45, 0.03, 13.55, 0.95, 14.1, 0.95, 14.6, 0.03, 27.2, 0.03, 27.6, 0.92, 28.5, 0.92, 28.9, 0.03, 40, 0.03),
)
w_armL = K(0, 0, 0.25, 0, 0.65, 1, 1.0, 1, 1.2, 0, 5.05, 0, 5.35, 1, 5.95, 1, 6.25, 0, 40, 0)
hz_jump = K(0, 0, 13.45, 0, 13.52, -0.05, 13.68, 0.38, 13.9, 0.0, 14.02, 0.03, 14.15, 0, 40, 0)
SPRING_H = {"hips_pitch": (2.4, 0.5), "hips_roll": (2.2, 0.55), "neck_pitch": (3.2, 0.55), "neck_roll": (2.6, 0.55), "neck_yaw": (3.4, 0.6)}
_series = {}


def _sp(name, trk, table):
    if name not in _series:
        f, z = table[name]
        _series[name] = spring_series([trk(i / FPS) for i in range(NFR + 1)], freq=f, zeta=z)
    return _series[name]


def mixp(presets, weights):
    tot = sum(weights.values()) or 1.0
    return {k: sum(presets[n][k] * w for n, w in weights.items()) / tot for k in presets["neutral"]}


def talk_e(t, segs):
    return max([smoothstep(a, a + 0.15, t) * (1 - smoothstep(b - 0.15, b, t)) for a, b, *_ in segs] or [0.0])


def hero_params(t):
    i = max(0, min(NFR, int(round(t * FPS))))
    wk = walk_h.at(t)
    theta = door_angle(t)
    p = dict(
        x=hx(t), y=hy(t), z=wk["bob"] + hz_jump(t), yaw=hyaw(t),
        hips_pitch=_sp("hips_pitch", h_pitch, SPRING_H)[i] + wk["lean"], hips_roll=_sp("hips_roll", h_roll, SPRING_H)[i] + wk["roll"], hips_twist=h_twist(t) + wk["twist"],
        hips_squash=h_squash(t) + A.breathe(t, 0.30, 0.011),
        neck_pitch=_sp("neck_pitch", n_pitch, SPRING_H)[i] - wk["lean"] * 0.5, neck_roll=_sp("neck_roll", n_roll, SPRING_H)[i], neck_yaw=_sp("neck_yaw", n_yaw, SPRING_H)[i],
        legL=wk["legL"], legR=wk["legR"],
    )
    # mentre parla (solo nella versione B e solo nei tratti inquadrati): accenti di testa e sopracciglia sulle sillabe
    e = talk_e(t, SPEAK_H) if in_b(t) else 0.0
    p["neck_pitch"] += e * 3.0 * math.sin(2 * math.pi * 2.1 * t)
    p["neck_roll"] += e * 1.8 * math.sin(2 * math.pi * 1.05 * t + 1.0)
    p.update(mixp(HP, {k: max(0.0, v(t)) for k, v in hw.items()}))
    p["browL_dy"] += e * 0.008 * max(0.0, math.sin(2 * math.pi * 2.1 * t))
    p["browR_dy"] += e * 0.008 * max(0.0, math.sin(2 * math.pi * 2.1 * t + 0.4))
    p["gaze_x"], p["gaze_y"], p["converge"] = hgaze_x(t), hgaze_y(t), hconv(t)
    p["blink"] = A.blink_curve(t, blinks_h)
    p["eye_mode"] = mode_h(t)
    p["mouth"] = hero_mouth(t)
    p["blush"] = False
    p["armL_free"] = (hl_free["x"](t), hl_free["y"](t), hl_free["z"](t) + 0.012 * math.sin(2 * math.pi * 0.7 * t))
    p["armR_free"] = (hr_free["x"](t), hr_free["y"](t), hr_free["z"](t) + 0.012 * math.sin(2 * math.pi * 0.7 * t + 1.2))
    w = w_armL(t)
    if w > 0:
        # 0.6–1.2 s: maniglia; 5.0–6.3 s: spinge lo sportello dal lato interno (mano appoggiata, senza compenetrare)
        tgt = door_pt(theta, -FW + 0.3, -0.34, KT.FRIDGE["h"] * 0.55) if t < 3.0 else door_pt(theta, -1.45, 0.40, 2.3)
        p["armL_world"], p["armL_w"] = tgt, w
    sw = wk["legL"] / 26.0
    p["armL_free"] = (p["armL_free"][0], p["armL_free"][1] + 0.18 * sw * (1 - p.get("armL_w", 0)), p["armL_free"][2])
    p["armR_free"] = (p["armR_free"][0], p["armR_free"][1] - 0.18 * sw, p["armR_free"][2])
    return p


# ====================================================================== MINA
mx = K(0, -1.8, 12.6, -1.8, 12.85, -1.76, 13.3, MINA_SPOT[0], 40, MINA_SPOT[0])
my = K(0, 4.35, 12.6, 4.35, 12.85, 4.3, 13.3, MINA_SPOT[1], 40, MINA_SPOT[1])
mz = K(0, CT + 0.1, 12.6, CT + 0.1, 12.85, CT + 0.85, 13.08, CT + 0.62, 13.3, CT, 40, CT)
mscale = K(0, 0.001, 12.56, 0.001, 12.64, 0.08, 12.85, 0.88, 13.3, 0.8, 40, 0.8)
m_yaw = K(0, 0, 12.6, 0, 13.0, 18, 13.3, 30, 17.15, 30, 17.5, -8, 19.4, -8, 27.0, 28, 40, 28)
m_squash = K(0, 0, 12.6, -0.25, 12.85, -0.18, 13.2, 0.05, 13.3, 0.28, 13.55, 0.0, 15.6, 0, 15.7, 0.12, 15.85, -0.05, 16.0, 0,
             29.5, 0, 29.62, 0.12, 29.8, -0.05, 30.0, 0)
m_pitch = K(0, 0, 13.4, 0, 13.7, -4, 14.2, 2, 17.2, 0, 17.5, 6, 19.0, 6, 27.0, 0, 29.5, 0, 29.62, 6, 29.9, -3, 30.3, 0)
m_roll = K(0, 0, 13.5, 6, 14.4, -2, 17.2, 0, 18.3, 4, 27.0, 0, 29.5, 8, 30.2, -3, 31.0, 0)
m_cover = K(0, 0, 15.65, 0, 15.85, 24, 16.1, 0, 29.6, 0, 29.8, 26, 30.1, 0)
m_book = K(0, 0, 12.7, 25, 13.3, -20, 13.7, 10, 14.3, -6, 15.2, 4, 16.0, 0, 17.2, 0, 17.5, 10, 18.0, -4, 18.6, 0)
MP = dict(
    neutral=dict(browL_dy=0.0, browL_rot=-9, browR_dy=0.0, browR_rot=9, lidL=0.0, lidR=0.0, eye_scale=1.0),
    happy=dict(browL_dy=0.012, browL_rot=-12, browR_dy=0.012, browR_rot=12, lidL=0.0, lidR=0.0, eye_scale=1.0),
    surprised=dict(browL_dy=0.03, browL_rot=-14, browR_dy=0.03, browR_rot=14, lidL=0.0, lidR=0.0, eye_scale=1.08),
    ironic=dict(browL_dy=-0.010, browL_rot=4, browR_dy=0.028, browR_rot=18, lidL=0.34, lidR=0.0, eye_scale=1.0),
)
if VERSION == "A":
    mw = dict(neutral=K(0, 0.3, 40, 0.3), happy=K(0, 0, 12.6, 0, 12.9, 1, 40, 1), surprised=K(0, 0, 12.6, 0.8, 12.85, 0.8, 13.1, 0, 40, 0), ironic=K(0, 0, 40, 0))
else:
    # "Se ti organizzassi prima…": ironica e gentile; poi entusiasta sull'app; soddisfatta alla fine
    mw = dict(neutral=K(0, 0.3, 40, 0.3), happy=K(0, 0, 12.6, 0, 12.9, 1, 13.8, 1, 14.0, 0.2, 16.7, 0.2, 17.0, 1, 40, 1),
              surprised=K(0, 0, 12.6, 0.8, 12.85, 0.8, 13.1, 0, 40, 0), ironic=K(0, 0, 13.85, 0, 14.05, 1, 16.6, 1, 16.9, 0, 40, 0))
# Mina guarda chi parla; durante la dimostrazione guarda il telefono; nei momenti di complicità guarda lo spettatore
if VERSION == "A":
    mgaze_x = K(0, 0.3, 13.3, 0.3, 13.45, 0.95, 15.0, 0.95, 15.1, 0.0, 15.6, 0.0, 15.7, 0.95, 17.1, 0.95, 17.2, -0.95, 27.0, -0.95, 27.12, 0.95, 29.5, 0.95, 29.6, 0.0, 40, 0.0)
else:
    mgaze_x = K(0, 0.3, 13.3, 0.3, 13.45, 0.95, 17.1, 0.95, 17.2, -0.95, 27.0, -0.95, 27.12, 0.95, 30.6, 0.95, 30.7, 0.0, 40, 0.0)
mgaze_y = K(0, -0.2, 13.4, 0.0, 17.1, 0.0, 17.2, -0.35, 27.0, -0.35, 27.12, 0.0, 40, 0.0)
mmode = Step([(0, "open"), (29.85, "arc_happy"), (30.4, "open")]) if VERSION == "A" else Step([(0, "open"), (30.65, "arc_happy"), (31.2, "open")])
blinks_m = [13.42, 15.08, 16.9, 17.18, 19.2, 27.1, 28.6, 31.5]
rest_m = Step([(0, "m_smile"), (12.62, "m_vO"), (13.0, "m_open"), (13.35, "m_smile"), (17.2, "m_smile"), (29.6, "m_open"), (30.2, "m_smile")]) if VERSION == "A" else \
    Step([(0, "m_smile"), (12.62, "m_vO"), (13.0, "m_open"), (13.35, "m_smile"), (16.8, "m_smirk"), (17.2, "m_smile"), (30.6, "m_open"), (31.1, "m_smile")])
vis_m = Step(sum([A.visemes(txt, a, b, rest="m_smile") for a, b, txt in SPEAK_M], []), "m_smile")
m_point_w = K(0, 0, 17.3, 0, 17.6, 1, 19.1, 1, 19.4, 0, 40, 0)
m_up_w = K(0, 0, 12.62, 0, 12.75, 1, 13.25, 1, 13.45, 0, 40, 0)
SCREEN_EDGE = (-1.64, 4.0, CT + 0.48)


def mina_params(t):
    s = mscale(t)
    p = dict(x=mx(t), y=my(t), z=mz(t), yaw=m_yaw(t), sx=s, sy=s, sz=s,
             body_pitch=m_pitch(t), body_roll=m_roll(t), body_squash=m_squash(t) + A.breathe(t, 0.45, 0.012),
             cover_open=m_cover(t), bookmark=m_book(t), legL=0.0, legR=0.0)
    talking = any(a <= t < b for a, b, _ in SPEAK_M)
    e = talk_e(t, SPEAK_M)
    # parla con tutto il corpo: piccoli rimbalzi, inclinazioni e la copertina che si muove sulle parole forti
    p["body_roll"] += e * 3.0 * math.sin(2 * math.pi * 1.6 * t)
    p["body_z"] = e * 0.016 * abs(math.sin(2 * math.pi * 1.6 * t))
    p["cover_open"] += e * 6.0 * max(0.0, math.sin(2 * math.pi * 0.9 * t))
    p.update(mixp(MP, {k: max(0.0, v(t)) for k, v in mw.items()}))
    p["browL_dy"] += e * 0.006 * max(0.0, math.sin(2 * math.pi * 1.6 * t))
    p["browR_dy"] += e * 0.006 * max(0.0, math.sin(2 * math.pi * 1.6 * t + 0.5))
    p["gaze_x"], p["gaze_y"] = mgaze_x(t), mgaze_y(t)
    p["blink"] = A.blink_curve(t, blinks_m)
    p["eye_mode"] = mmode(t)
    p["mouth"] = vis_m(t) if talking else rest_m(t)
    wu = m_up_w(t)
    if wu > 0:  # esce dal telefono con le braccia in alto ("eccomi!")
        p["armL_free"] = (-0.45, -0.06, 0.40 * wu + (1 - wu) * -0.2)
        p["armR_free"] = (0.45, -0.06, 0.40 * wu + (1 - wu) * -0.2)
    wm = m_point_w(t)
    if wm > 0:  # indica lo schermo, senza coprirlo
        p["armL_world"], p["armL_w"] = SCREEN_EDGE, wm
    if talking and wm == 0 and wu == 0:  # gesto della mano destra mentre parla
        g = e * (0.5 + 0.5 * math.sin(2 * math.pi * 0.8 * t))
        p["armR_free"] = (0.40, -0.12 * g - 0.03, -0.18 + 0.32 * g)
    return p


# ====================================================================== TELECAMERE
# Nuove inquadrature a due quando Mina e il protagonista interagiscono: lui la guarda davvero, nessuna camera attraverso i personaggi.
two_c, two_t = (-0.4, -3.4, 3.1), (-0.6, 3.3, 2.45)
cu_c = (HERO_SPOT[0] + 0.1 - 2.2 * math.sin(math.radians(12)), HERO_SPOT[1] - 2.2 * math.cos(math.radians(12)), 2.72)
SHOTS = [
    ("c1a", 0.0, 2.6, [(0, (-1.5, -7.0, 3.2)), (2.6, (-0.5, -6.4, 3.1))], [(0, (1.8, 2.4, 2.3)), (2.6, (2.5, 2.4, 2.3))], 30),
    ("c1b", 2.6, 5.0, [(2.6, (3.2, 4.6, 2.85)), (5.0, (3.2, 4.2, 2.85))], [(2.6, (3.2, 1.9, 2.62)), (5.0, (3.2, 1.9, 2.6))], 40),
    ("c2a", 5.0, 8.0, [(5.0, (1.5, -5.2, 2.7)), (8.0, (1.9, -4.6, 2.65))], [(5.0, (2.9, 1.9, 2.4)), (8.0, (2.6, 1.9, 2.4))], 32),
    ("c2b", 8.0, 11.0, [(8.0, (2.7, -1.5, 2.45)), (11.0, (2.65, -1.25, 2.46))], [(8.0, (2.6, 1.9, 2.66)), (11.0, (2.6, 1.9, 2.64))], 48),
    ("c3a", 11.0, 12.6, [(11.0, (-1.8, 2.3, 2.5)), (12.6, (-1.8, 2.85, 2.47))], [(11.0, (-1.8, 4.2, 2.39)), (12.6, (-1.8, 4.2, 2.4))], 50),
    ("c3b", 12.6, 13.4, [(12.6, (-1.35, 1.15, 2.95)), (13.4, (-1.3, 1.3, 2.9))], [(12.6, (-1.45, 4.1, 2.65)), (13.4, (-1.4, 4.0, 2.55))], 38),
    ("c3c", 13.4, 17.0, [(13.4, two_c), (17.0, (-0.42, -3.1, 3.08))], [(13.4, two_t), (17.0, two_t)], 34),
    ("c4a", 17.0, 18.6, [(17.0, (-0.42, -3.1, 3.08)), (18.6, (-1.1, 0.6, 2.75))], [(17.0, two_t), (18.6, (-1.45, 4.05, 2.45))], 34),
    ("c4b", 18.6, 27.0, [(18.6, (-1.8, 2.98, 2.48)), (27.0, (-1.8, 3.08, 2.47))], [(18.6, (-1.8, 4.15, 2.39)), (27.0, (-1.8, 4.15, 2.39))], 40),
    ("c5a", 27.0, 30.6, [(27.0, (-0.35, -2.6, 3.0)), (30.6, (-0.33, -2.35, 2.98))], [(27.0, (-0.45, 3.3, 2.45)), (30.6, (-0.45, 3.3, 2.45))], 34),
    ("c5b", 30.6, 32.0, [(30.6, cu_c), (32.0, (cu_c[0] + 0.04, cu_c[1] + 0.15, cu_c[2]))], [(30.6, (HERO_SPOT[0] + 0.1, HERO_SPOT[1], 2.65)), (32.0, (HERO_SPOT[0] + 0.1, HERO_SPOT[1], 2.64))], 46),
]
cams = []
for name, t0, t1, cpos, ctgt, lens in SHOTS:
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    sc.collection.objects.link(cam)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36
    cam.data.lens = lens
    tg = bpy.data.objects.new(name + "_tgt", None)
    sc.collection.objects.link(tg)
    con = cam.constraints.new("TRACK_TO")
    con.target = tg
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    tr = [K(*[v for t, p_ in cpos for v in (t, p_[c])]) for c in range(3)]
    gr = [K(*[v for t, p_ in ctgt for v in (t, p_[c])]) for c in range(3)]
    cams.append((cam, tg, t0, t1, tr, gr))
    sc.timeline_markers.new(name, frame=int(round(t0 * FPS)) + 1).camera = cam
for who, txt, a, b, *_ in LINES:
    sc.timeline_markers.new(f"{who}: {txt[:28]}", frame=int(round(a * FPS)) + 1)


def frame_of(t):
    return int(round(t * FPS)) + 1


def cam_at(t):
    for cam, tg, t0, t1, *_ in cams:
        if t0 <= t < t1:
            return cam
    return cams[-1][0]


# ====================================================================== bake
regs = [hero.reg, mina.reg]
door_shelf = bpy.data.objects["fr_door_shelf1"]
vl = bpy.context.view_layer
c2b_s = [None]
t_bake = time.time()
for fi in range(NFR):
    t = fi / FPS
    f = fi + 1
    hero.apply(hero_params(t))
    mina.apply(mina_params(t))
    for r in regs:
        r.key(f)
    th = door_angle(t)
    kit["door_hinge"].rotation_euler = (0, 0, math.radians(th))
    kit["door_hinge"].keyframe_insert("rotation_euler", frame=f)
    lit = smoothstep(2.0, 30.0, th)
    for nm_ in ("fridge_light", "fridge_light2"):
        kit[nm_].data.energy = FR0[nm_] * lit * fridge_k(t)
        kit[nm_].data.keyframe_insert("energy", frame=f)
    kit["lamp"].data.energy = lamp_e(t)
    kit["lamp"].data.keyframe_insert("energy", frame=f)
    glow.data.energy = glow_e(t)
    glow.data.keyframe_insert("energy", frame=f)
    phone.location = PHONE_LOC
    phone.rotation_mode = "XYZ"
    phone.rotation_euler = (math.radians(-10), 0, math.radians(phone_buzz(t)))
    phone.keyframe_insert("rotation_euler", frame=f)
    phone.keyframe_insert("location", frame=f)
    n_on.outputs[0].default_value = phone_on(t)
    nt.keyframe_insert(data_path='nodes["on"].outputs[0].default_value', frame=f)
    # c2b (8–11 s): il ripiano alto della porta entrava nell'inquadratura e "tagliava" la testa accanto al sopracciglio;
    # fuori da questa inquadratura la porta non si vede da vicino, quindi lo nascondiamo solo qui.
    shelf_hide = 8.0 - 0.001 <= t < 11.0
    door_shelf.hide_render = shelf_hide
    door_shelf.keyframe_insert("hide_render", frame=f)
    for cam, tg, t0, t1, tr, gr in cams:
        if t0 - 0.001 <= t <= t1 + 0.001:
            cam.location = Vector((tr[0](t), tr[1](t), tr[2](t)))
            tg.location = Vector((gr[0](t), gr[1](t), gr[2](t)))
            if cam.name == "c2b":
                # la camera segue con morbidezza la testa: il volto resta sempre nel quadro anche quando lui si sposta
                vl.update()
                hp = hero.head.matrix_world.translation
                want = Vector((0.45 * tg.location.x + 0.55 * hp.x, tg.location.y, 0.45 * tg.location.z + 0.55 * (hp.z + 0.04)))
                c2b_s[0] = want if c2b_s[0] is None else c2b_s[0].lerp(want, 0.2)
                tg.location = c2b_s[0]
            cam.keyframe_insert("location", frame=f)
            tg.keyframe_insert("location", frame=f)
print(f"bake {VERSION}: {time.time() - t_bake:.1f} s per {NFR} fotogrammi", flush=True)


def _fcurves(act):
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    return [fc for layer in act.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]


for act in bpy.data.actions:
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

# angoli dello schermo in ogni fotogramma in cui il telefono è inquadrato da vicino (per l'inserto nitido dell'interfaccia reale)
quads = {}
for t0, t1 in ((11.0, 12.6), (18.6, 27.0)):
    for f in range(frame_of(t0), frame_of(t1)):
        sc.frame_set(f)
        cam = cam_at((f - 1) / FPS)
        sc.camera = cam
        mw_ = screen_ob.matrix_world
        pts = []
        for lx, ly in ((-0.5, 0.5), (0.5, 0.5), (0.5, -0.5), (-0.5, -0.5)):  # alto-sx, alto-dx, basso-dx, basso-sx dell'interfaccia
            co = world_to_camera_view(sc, cam, mw_ @ Vector((lx, ly, 0)))
            pts.append([co.x, 1 - co.y])
        quads[f] = dict(quad=pts, ui=UI_INDEX[f], on=phone_on((f - 1) / FPS))
json.dump(quads, open(os.path.join(OUT, "screen_quads.json"), "w"))
sc.frame_set(frame_of(12.62))
sc.camera = bpy.data.objects["c3b"]
co = world_to_camera_view(sc, sc.camera, Vector((-1.8, 4.3, CT + 0.62)))
json.dump(dict(burst_uv=[co.x, 1 - co.y], t=12.6), open(os.path.join(OUT, "fx.json"), "w"))
json.dump(dict(version=VERSION, lines=[dict(chi=w, testo=x, inizio=a, fine=b, emozione=e, traccia=tr) for w, x, a, b, e, tr in LINES],
               shots=[dict(nome=n, inizio=a, fine=b) for n, a, b, *_ in SHOTS], b_ranges=B_RANGES), open(os.path.join(OUT, "cue.json"), "w"), indent=1, ensure_ascii=False)

name = "SPESORA_EP01_NARRATORE" if VERSION == "A" else "SPESORA_EP01_DIALOGHI"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f"{name}.blend"), compress=True)
print("blend salvato", flush=True)
if "--no-render" in flags:
    sys.exit(0)

os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = os.path.join(OUT, "frames", "f_")
sc.frame_step = int(os.environ.get("ADS_STEP", "1"))
t0r = time.time()
nfr = 0
for a, b in (RANGES or [(0.0, DUR3D)]):
    sc.frame_start, sc.frame_end = frame_of(a), min(NFR, frame_of(b) - 1)
    bpy.ops.render.render(animation=True)
    nfr += sc.frame_end - sc.frame_start + 1
print(f"render {VERSION}: {time.time() - t0r:.1f} s per {nfr} fotogrammi", flush=True)
