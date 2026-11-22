"""
EP01 — "Il frigorifero delle 21:00": ANIMAZIONE CONTINUA (non pose fisse).

Costruisce la cucina 3D, i due personaggi con rig, il telefono e le telecamere; poi campiona la regia a 30 fps, la "cuoce" in
keyframe su ogni fotogramma e renderizza la sequenza.

    ADS_SAMPLES=14 ADS_RES=540x960 python ep01_anim.py <cartella-output-assoluta> <cartella-sequenza-ui> [t0 t1] [--no-render]

Con [t0 t1] (secondi) renderizza solo quel tratto (anteprime). Scrive anche ep01_cucina_animata.blend (con i keyframe).
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
from anim import K, Step, smoothstep, lerp, spring_series, FPS
import kitchen as KT
import rig_hero as RH
import rig_mina as RM
import mina as M
import phone as P
from rig_common import xf

args = [a for a in sys.argv[1:] if a != "--"]
flags = [a for a in args if a.startswith("--")]
pos = [a for a in args if not a.startswith("--")]
OUT, UISEQ = pos[0], pos[1]
RANGE = (float(pos[2]), float(pos[3])) if len(pos) >= 4 else None
SAMPLES = int(os.environ.get("ADS_SAMPLES", "14"))
RES = tuple(int(v) for v in os.environ.get("ADS_RES", "540x960").split("x"))
DUR3D = 32.0  # secondi di animazione 3D (poi 3 s di cartello finale 2D)
NFR = int(DUR3D * FPS)
CT = 2.03
os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(OUT, "_tmp")
os.makedirs(TMP, exist_ok=True)
M.CALIB = None  # in cucina: nessuna calibrazione delle illustrazioni

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

# telefono con schermo che mostra il filmato reale dell'app
P.PHONE_W, P.PHONE_T, P.PHONE_H = 0.36, 0.05, 0.70
phone = P.build_phone(os.path.join(UISEQ, "ui_0001.png"))  # (materiale schermo sostituito sotto)
screen_ob = [o for o in phone.children if o.name.endswith("_screen")][0]
UI_START = int(19.2 * FPS) + 1
UI_N = len([f for f in os.listdir(UISEQ) if f.startswith("ui_") and f.endswith(".png")])
FULLSEQ = os.path.join(TMP, "uiseq_full")
os.makedirs(FULLSEQ, exist_ok=True)
for _f in range(1, NFR + 1):
    _i = 1 if _f < UI_START else min(UI_N, _f - UI_START + 1)
    _dst = os.path.join(FULLSEQ, f"ui_{_f:04d}.png")
    if os.path.lexists(_dst):
        os.remove(_dst)
    os.symlink(os.path.join(UISEQ, f"ui_{_i:04d}.png"), _dst)
scr_mat = bpy.data.materials.new("phone_screen_anim")
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
iu.frame_offset = 0
iu.use_cyclic = False
iu.use_auto_refresh = True
n_on = nt.nodes.new("ShaderNodeValue")
n_on.name = "on"
n_on.outputs[0].default_value = 0.0
n_mix = nt.nodes.new("ShaderNodeMixRGB")
n_mix.blend_type = "MULTIPLY"
n_mix.inputs["Fac"].default_value = 1.0
nt.links.new(n_tex.outputs["Color"], n_mix.inputs["Color1"])
nt.links.new(n_on.outputs[0], n_mix.inputs["Color2"])
nt.links.new(n_mix.outputs["Color"], n_bsdf.inputs["Base Color"])
nt.links.new(n_mix.outputs["Color"], n_bsdf.inputs["Emission Color"])
n_bsdf.inputs["Emission Strength"].default_value = 0.22
n_bsdf.inputs["Roughness"].default_value = 0.35
nt.links.new(n_bsdf.outputs["BSDF"], n_out.inputs["Surface"])
screen_ob.data.materials.clear()
screen_ob.data.materials.append(scr_mat)
FR0 = {k: kit[k].data.energy for k in ("fridge_light", "fridge_light2")}
glow = KT.light("phone_glow", "POINT", (-1.8, 3.6, 2.6), 0, (0.8, 0.9, 1.0), 0.15)

# ====================================================================== luoghi e punti di contatto
FW = KT.FRIDGE["x1"] - KT.FRIDGE["x0"]
H0 = Vector((KT.FRIDGE["x1"], KT.FRIDGE["y0"] - 0.06))
PHONE_LOC = (-1.8, 4.15, CT + 0.35)


def door_pt(theta_deg, lx, ly, z):
    a = math.radians(theta_deg)
    x = lx * math.cos(a) - ly * math.sin(a)
    y = lx * math.sin(a) + ly * math.cos(a)
    return (H0.x + x, H0.y + y, z)


# ====================================================================== regia: PORTA DEL FRIGO e luci
door_target = K(0, 0, 0.85, 0, 1.55, 100, 5.2, 100, 5.3, 100, 6.1, 64, 40, 64)
door_series = spring_series([door_target(i / FPS) for i in range(NFR + 1)], freq=1.5, zeta=0.45)


def door_angle(t):
    i = max(0, min(NFR, int(round(t * FPS))))
    return max(0.0, door_series[i])


def fridge_k(t):
    return 0.2 if 2.6 <= t < 5.0 else (0.8 if 5.0 <= t < 8.0 else (0.12 if 8.0 <= t < 11.0 else 1.0))


lamp_e = K(0, 330, 11.0, 330, 12.0, 430, 40, 430)
phone_on = K(0, 0, 10.98, 0, 11.12, 1, 40, 1)
glow_e = K(0, 0, 10.98, 0, 11.1, 26, 12.5, 24, 14, 14, 17, 14, 19, 8, 40, 8)
phone_buzz = lambda t: 2.6 * math.sin(2 * math.pi * 26 * t) * smoothstep(11.0, 11.05, t) * (1 - smoothstep(11.35, 11.5, t))

# ====================================================================== PROTAGONISTA
SEG_HERO = [(2.0, 4.9, "m_line"), (6.4, 8.6, "m_line"), (27.1, 29.2, "m_smile")]
rest_mouth = Step([(0, "m_line"), (5.0, "m_line"), (9.2, "m_line"), (14.0, "m_line"), (16.0, "m_osmall"), (16.9, "m_line"), (26.5, "m_smile"), (29.3, "m_smile"), (30.5, "m_smile"), (31.2, "m_smirk")])
talk_h = A.talk_events(SEG_HERO, rest="m_line", seed=11)
talk_h_f = Step(talk_h, "m_line")


def hero_mouth(t):
    if A.talk_energy(t, SEG_HERO) > 0.05:
        return talk_h_f(t)
    return rest_mouth(t)


hx = K(0, 1.0, 0.5, 1.0, 1.0, 0.8, 1.25, 0.95, 2.55, 3.2, 5.2, 3.2, 6.0, 2.6, 11.0, 2.6, 13.4, 0.1, 40, 0.1)
hy = K(0, 2.05, 0.5, 2.05, 1.0, 2.2, 1.25, 2.15, 2.55, 1.9, 6.0, 1.9, 11.0, 1.9, 13.4, 2.2, 40, 2.2)
hyaw = K(0, 170, 1.0, 172, 1.5, 178, 2.55, 180, 5.9, 180, 6.9, 8, 11.0, 8, 12.3, -26, 15.2, -26, 15.55, -36, 16.3, -22, 29.8, -22, 30.5, 6, 40, 6)
walk_h = A.Walk(hx, hy, hyaw, DUR3D + 1)

# corpo
h_pitch = K(0, 6, 0.4, 6, 0.75, -9, 1.0, -15, 1.4, -2, 2.5, 4, 4.2, 4, 4.6, 9, 5.0, 2, 6.0, 3, 6.9, 0, 7.5, -3, 8.2, 4, 10.0, 7, 11.0, 5, 15.2, 0, 15.45, -16, 16.2, 2, 27.0, 1, 28.3, -3, 29.2, 2, 30.5, 0)
h_roll = K(0, 4, 3.0, 2, 4.4, -3, 8.4, 5, 10.0, 6, 11.0, 3, 15.4, 6, 16.4, -2, 28.0, -4, 29.4, 3)
h_twist = K(0, 0, 5.7, 0, 6.2, 10, 6.9, 0, 15.3, 8, 16.0, -5, 29.0, -5, 29.6, 3)
h_squash = K(0, 0, 4.4, 0, 4.7, 0.05, 5.0, -0.01, 15.2, 0, 15.35, 0.12, 15.55, -0.1, 15.9, 0.07, 16.3, 0)
# collo / testa
n_pitch = K(0, 10, 0.7, 14, 1.1, 2, 1.8, 6, 2.6, 4, 3.1, -6, 3.5, 2, 4.0, 11, 4.6, 14, 5.0, 4, 5.6, 4, 6.0, -2, 6.8, 2, 7.6, -5, 8.4, 4, 9.0, 3, 9.8, 12, 10.6, 15, 11.0, 6, 15.0, 4, 15.4, -14, 16.3, 3, 28.0, 0, 29.4, 5, 30.6, -4, 31.5, 3)
n_roll = K(0, 6, 2.6, 8, 4.5, 3, 5.6, 3, 6.5, 0, 8.0, 7, 9.3, -6, 10.4, 7, 11.0, 4, 15.4, -8, 16.6, 3, 28.0, 5, 30.5, 8, 31.3, 11)
n_yaw = K(0, -8, 0.4, -16, 1.0, -10, 2.6, 0, 3.0, 10, 3.5, -8, 4.1, 0, 5.4, 0, 5.8, -34, 6.5, -10, 7.0, 0, 8.3, 16, 8.9, 14, 9.4, 0, 11.0, 0, 12.0, 14, 15.0, 6, 15.5, 22, 16.4, 14, 29.0, 8, 29.7, 14, 30.4, 0)
# viso: espressioni come miscela di preset
HP = dict(
    neutral=dict(browL_dy=0.0, browL_rot=17, browR_dy=0.0, browR_rot=-17, lidL=0.0, lidR=0.0, pupil_scale=1.0, converge=0.8, eyeL_scale=1.0, eyeR_scale=1.0, gaze_y=-0.4),
    tired=dict(browL_dy=-0.014, browL_rot=7, browR_dy=-0.014, browR_rot=-7, lidL=0.42, lidR=0.42, pupil_scale=1.0, converge=0.55, eyeL_scale=1.0, eyeR_scale=1.0, gaze_y=-0.6),
    surprised=dict(browL_dy=0.055, browL_rot=11, browR_dy=0.055, browR_rot=-11, lidL=0.0, lidR=0.0, pupil_scale=0.7, converge=0.6, eyeL_scale=1.1, eyeR_scale=1.1, gaze_y=0.25),
    happy=dict(browL_dy=0.022, browL_rot=14, browR_dy=0.022, browR_rot=-14, lidL=0.0, lidR=0.0, pupil_scale=1.0, converge=0.6, eyeL_scale=1.0, eyeR_scale=1.0, gaze_y=-0.2),
    ironic=dict(browL_dy=-0.012, browL_rot=4, browR_dy=0.045, browR_rot=-16, lidL=0.45, lidR=0.0, pupil_scale=1.0, converge=0.5, eyeL_scale=1.0, eyeR_scale=1.0, gaze_y=-0.2),
    camera=dict(browL_dy=0.018, browL_rot=15, browR_dy=0.018, browR_rot=-15, lidL=0.0, lidR=0.0, pupil_scale=1.06, converge=0.28, eyeL_scale=1.0, eyeR_scale=1.0, gaze_y=0.0),
)
hw = dict(
    neutral=K(0, 0.3, 40, 0.3),
    tired=K(0, 1, 5.2, 1, 5.7, 0.1, 9.4, 0.1, 9.8, 1, 11.0, 1, 12.0, 0.2, 14.8, 0.2, 15.0, 0, 16.4, 0, 16.9, 0.5, 26.0, 0.5, 27.0, 0, 40, 0),
    surprised=K(0, 0, 15.2, 0, 15.4, 1, 16.0, 1, 16.5, 0, 40, 0),
    happy=K(0, 0, 26.5, 0, 27.3, 1, 30.4, 1, 30.7, 0.2, 40, 0.2),
    ironic=K(0, 0, 30.3, 0, 30.7, 1, 32, 1, 40, 1),
    camera=K(0, 0, 5.6, 0, 6.3, 1, 8.0, 1, 8.3, 0.2, 9.2, 0.2, 9.5, 1, 9.8, 0, 40, 0),
)
# sguardo (gaze_x -1..+1 verso la destra dello schermo se converge è basso)
hgaze_x = K(0, 0.5, 0.5, 0.3, 2.6, 0.0, 2.9, -0.7, 3.4, 0.7, 3.9, 0.0, 4.3, 0.0, 5.6, 0.0, 8.3, 0.9, 9.0, 0.9, 9.4, 0.0, 15.4, 0.0, 16.0, -0.6, 28.0, -0.5, 29.4, -0.8, 30.5, 0.0)
hgaze_y = K(0, -0.4, 2.6, -0.2, 3.0, 0.5, 3.4, 0.1, 3.9, -0.6, 4.4, -0.5, 8.3, 0.0, 9.6, -0.5, 15.4, 0.3, 16.3, 0.0, 29.0, 0.0)
hconv_override = K(0, 0.8, 2.8, 0.8, 2.95, 0.05, 3.9, 0.05, 4.1, 0.8, 8.2, 0.8, 8.4, 0.0, 9.2, 0.0, 9.5, 0.6, 15.3, 0.6, 15.5, 0.0, 16.2, 0.0, 16.6, 0.6, 28.0, 0.6, 28.2, 0.2, 29.3, 0.2, 29.5, 0.0, 30.4, 0.0, 30.6, 0.3, 40, 0.3)
mode_h = Step([(0, "open"), (4.55, "arc_sleep"), (4.95, "open"), (10.2, "arc_sleep"), (10.6, "open"), (26.9, "open"), (27.6, "arc_happy"), (28.0, "open"), (30.0, "arc_happy"), (30.25, "open")])
blinks_h = A.auto_blinks(0.5, DUR3D, seed=2, avoid=[(4.4, 5.1), (10.0, 10.7), (27.5, 28.1), (29.9, 30.4)])
HOLD_L = Step([(0, "w")])  # solo per chiarezza

# braccia (spazio dei fianchi): gesti
hl_free = dict(
    x=K(0, -0.78, 4.4, -0.78, 4.7, -0.74, 5.0, -0.78, 7.1, -0.78, 7.5, -1.05, 8.0, -1.05, 8.4, -0.78, 15.2, -0.78, 15.35, -0.95, 16.0, -0.95, 16.5, -0.78, 27.0, -0.78, 27.6, -0.9, 28.6, -1.0, 29.2, -0.78, 40, -0.78),
    y=K(0, -0.02, 7.1, -0.02, 7.5, -0.3, 8.0, -0.3, 8.4, -0.02, 15.2, -0.02, 15.35, -0.5, 16.0, -0.5, 16.5, -0.02, 40, -0.02),
    z=K(0, 0.03, 4.4, 0.03, 4.7, -0.04, 5.0, 0.03, 7.1, 0.03, 7.5, 0.65, 8.0, 0.65, 8.4, 0.03, 15.2, 0.03, 15.35, 1.0, 16.0, 1.0, 16.5, 0.03, 27.0, 0.03, 27.6, 0.4, 28.6, 0.5, 29.2, 0.03, 40, 0.03),
)
hr_free = dict(
    x=K(0, 0.78, 4.4, 0.78, 4.7, 0.74, 5.0, 0.78, 7.1, 0.78, 7.5, 1.05, 8.0, 1.05, 8.4, 0.78, 15.2, 0.78, 15.35, 0.95, 16.0, 0.95, 16.5, 0.78, 27.0, 0.78, 27.5, 0.95, 28.5, 1.05, 29.3, 0.78, 40, 0.78),
    y=K(0, -0.02, 7.1, -0.02, 7.5, -0.3, 8.0, -0.3, 8.4, -0.02, 15.2, -0.02, 15.35, -0.5, 16.0, -0.5, 16.5, -0.02, 27.0, -0.02, 27.5, -0.45, 28.5, -0.35, 29.3, -0.02, 40, -0.02),
    z=K(0, 0.03, 4.4, 0.03, 4.7, -0.04, 5.0, 0.03, 7.1, 0.03, 7.5, 0.65, 8.0, 0.65, 8.4, 0.03, 15.2, 0.03, 15.35, 1.0, 16.0, 1.0, 16.5, 0.03, 27.0, 0.03, 27.5, 0.55, 28.5, 0.7, 29.3, 0.03, 40, 0.03),
)
w_armL = K(0, 0, 0.25, 0, 0.65, 1, 1.0, 1, 1.2, 0, 5.05, 0, 5.35, 1, 5.95, 1, 6.25, 0, 40, 0)
HEAD_BASE_Z = 0.0
# salto di spavento (radice z) e rinculo
hz_jump = K(0, 0, 15.2, 0, 15.3, -0.05, 15.5, 0.42, 15.8, 0.0, 15.95, 0.04, 16.1, 0, 40, 0)
hy_back = K(0, 0, 15.2, 0, 15.5, 0.25, 16.1, 0.12, 16.6, 0, 40, 0)

# molle per l'inerzia (lieve) su corpo e testa
SPRING_H = {"hips_pitch": (2.4, 0.5), "hips_roll": (2.2, 0.55), "neck_pitch": (3.2, 0.5), "neck_roll": (2.6, 0.5), "neck_yaw": (3.0, 0.55)}
_series_h = {}


def _hs(name, trk):
    if name not in _series_h:
        f, z = SPRING_H[name]
        _series_h[name] = spring_series([trk(i / FPS) for i in range(NFR + 1)], freq=f, zeta=z)
    return _series_h[name]


def mixp(presets, weights):
    tot = sum(weights.values()) or 1.0
    out = {}
    for k in presets["neutral"]:
        out[k] = sum(presets[n][k] * w for n, w in weights.items()) / tot
    return out


def hero_params(t):
    i = max(0, min(NFR, int(round(t * FPS))))
    wk = walk_h.at(t)
    theta = door_angle(t)
    p = dict(
        x=hx(t), y=hy(t) + hy_back(t) * 0.0, z=wk["bob"] + hz_jump(t), yaw=hyaw(t),
        hips_pitch=_hs("hips_pitch", h_pitch)[i] + wk["lean"] + (-0.0), hips_roll=_hs("hips_roll", h_roll)[i] + wk["roll"], hips_twist=h_twist(t) + wk["twist"],
        hips_squash=h_squash(t) + A.breathe(t, 0.30, 0.011) + (0.012 if wk["lean"] > 1 else 0.0),
        neck_pitch=_hs("neck_pitch", n_pitch)[i] - wk["lean"] * 0.5, neck_roll=_hs("neck_roll", n_roll)[i], neck_yaw=_hs("neck_yaw", n_yaw)[i],
        legL=wk["legL"], legR=wk["legR"],
    )
    # parlato: leggere oscillazioni della testa e delle sopracciglia
    e = A.talk_energy(t, SEG_HERO)
    p["neck_pitch"] += e * 2.6 * math.sin(2 * math.pi * 2.3 * t)
    p["neck_roll"] += e * 1.6 * math.sin(2 * math.pi * 1.1 * t + 1.0)
    # espressione
    ex = mixp(HP, {k: max(0.0, v(t)) for k, v in hw.items()})
    p.update(ex)
    p["browL_dy"] += e * 0.006 * math.sin(2 * math.pi * 2.3 * t)
    p["browR_dy"] += e * 0.006 * math.sin(2 * math.pi * 2.3 * t + 0.6)
    p["gaze_x"] = hgaze_x(t)
    p["gaze_y"] = hgaze_y(t) if hgaze_y(t) is not None else ex["gaze_y"]
    p["converge"] = hconv_override(t)
    p["blink"] = A.blink_curve(t, blinks_h)
    p["eye_mode"] = mode_h(t)
    p["mouth"] = hero_mouth(t)
    p["blush"] = False
    # braccia
    p["armL_free"] = (hl_free["x"](t), hl_free["y"](t), hl_free["z"](t) + 0.012 * math.sin(2 * math.pi * 0.7 * t))
    p["armR_free"] = (hr_free["x"](t), hr_free["y"](t), hr_free["z"](t) + 0.012 * math.sin(2 * math.pi * 0.7 * t + 1.2))
    w = w_armL(t)
    if w > 0:
        if t < 3.0:
            tgt = door_pt(theta, -FW + 0.3, -0.34, KT.FRIDGE["h"] * 0.55)
        else:
            tgt = door_pt(theta, -1.45, 0.2, 2.3)
        p["armL_world"], p["armL_w"] = tgt, w
    # camminata: oscillazione delle braccia (contro-fase delle gambe)
    sw = wk["legL"] / 26.0
    p["armL_free"] = (p["armL_free"][0], p["armL_free"][1] + 0.18 * sw * (1 - p.get("armL_w", 0)), p["armL_free"][2])
    p["armR_free"] = (p["armR_free"][0], p["armR_free"][1] - 0.18 * sw, p["armR_free"][2])
    return p


# ====================================================================== MINA
SEG_MINA = [(12.9, 16.4, "m_smile"), (29.4, 30.6, "m_smile")]
mina_rest = Step([(0, "m_smile"), (12.6, "m_open"), (13.0, "m_smile"), (16.4, "m_smile"), (17.0, "m_smirk"), (19.0, "m_smile"), (29.0, "m_smile"), (30.6, "m_open"), (31.2, "m_smile")])
talk_m_f = Step(A.talk_events(SEG_MINA, rest="m_smile", seed=23, shapes=("m_t2", "m_t1", "m_t3", "m_t2", "m_t1", "m_smile"), rate=7.0), "m_smile")


def mina_mouth(t):
    return talk_m_f(t) if A.talk_energy(t, SEG_MINA) > 0.05 else mina_rest(t)


mx = K(0, -1.8, 12.6, -1.8, 13.35, -1.8, 14.5, -1.8, 15.0, -1.0, 17.0, -1.0, 17.5, -1.05, 26.4, -1.05, 27.0, -0.9, 40, -0.9)
my = K(0, 4.12, 12.6, 4.12, 13.3, 4.55, 14.5, 4.55, 15.0, 3.9, 26.4, 3.9, 27.0, 3.7, 40, 3.7)
mz = K(0, CT + 0.4, 12.6, CT + 0.4, 12.92, CT + 0.95, 13.25, CT, 14.5, CT, 14.78, CT + 0.5, 15.03, CT, 40, CT)
mscale = K(0, 0.001, 12.55, 0.001, 12.62, 0.05, 12.85, 0.9, 13.3, 0.8, 26.4, 0.8, 27.0, 1.0, 40, 1.0)
m_yaw = K(0, 0, 12.6, 0, 13.0, 25, 13.3, 20, 14.4, 25, 15.0, 22, 15.4, 25, 17.0, 10, 17.6, -5, 18.0, 10, 26.5, 10, 27.0, 25, 29.4, 20, 40, 25)
m_squash = K(0, 0, 12.6, -0.25, 12.9, -0.2, 13.2, 0.05, 13.3, 0.28, 13.55, 0.0, 14.45, 0, 14.6, 0.15, 14.78, -0.2, 15.03, 0.26, 15.25, 0, 29.4, 0, 29.55, 0.12, 29.75, -0.05, 30.0, 0)
m_pitch = K(0, 0, 13.4, 0, 13.7, -4, 14.2, 3, 16.0, -2, 29.4, 0, 29.55, 6, 29.9, -3, 30.3, 0)
m_roll = K(0, 0, 13.5, 6, 14.5, -5, 15.3, 5, 17.3, -4, 18.3, 5, 28.0, 0, 29.5, 8, 30.2, -3)
m_cover = K(0, 0, 13.7, 0, 13.95, 26, 14.2, 0, 14.6, 0, 14.9, 22, 15.2, 0, 15.5, 0, 15.8, 22, 16.1, 0, 29.45, 0, 29.65, 28, 30.0, 0)
m_book = K(0, 0, 12.7, 25, 13.3, -20, 13.7, 10, 14.3, -6, 15.2, 18, 15.5, -10, 16.0, 4, 17, 0)
MP = dict(
    neutral=dict(browL_dy=0.0, browL_rot=-9, browR_dy=0.0, browR_rot=9, lidL=0.0, lidR=0.0, eye_scale=1.0),
    happy=dict(browL_dy=0.012, browL_rot=-12, browR_dy=0.012, browR_rot=12, lidL=0.0, lidR=0.0, eye_scale=1.0),
    surprised=dict(browL_dy=0.03, browL_rot=-14, browR_dy=0.03, browR_rot=14, lidL=0.0, lidR=0.0, eye_scale=1.1),
    ironic=dict(browL_dy=-0.012, browL_rot=4, browR_dy=0.03, browR_rot=18, lidL=0.36, lidR=0.0, eye_scale=1.0),
)
mw = dict(
    neutral=K(0, 0.4, 40, 0.4),
    happy=K(0, 0, 12.6, 0, 12.9, 1, 15.3, 1, 15.5, 0, 26.9, 0, 27.3, 1, 29.4, 0.6, 30.6, 1, 40, 1),
    surprised=K(0, 0, 12.6, 0.8, 12.85, 0.8, 13.1, 0, 40, 0),
    ironic=K(0, 0, 15.2, 0, 15.5, 1, 18.4, 1, 18.8, 0, 40, 0),
)
mgaze_x = K(0, 0.3, 12.8, 0.3, 13.1, 1.0, 14.0, 1.0, 14.5, -0.2, 15.4, 1.0, 16.3, 1.0, 17.0, -0.6, 17.5, 1.0, 18.3, -0.6, 19.0, -0.9, 26.0, -0.9, 27.2, 1.0, 29.4, 0.3, 30.5, 0.3)
mgaze_y = K(0, -0.2, 17.0, 0.0, 19.0, -0.3, 26.0, -0.3, 27.0, 0.0, 40, 0.0)
mmode = Step([(0, "open"), (29.9, "arc_happy"), (30.5, "open")])
blinks_m = A.auto_blinks(12.9, DUR3D, seed=7, avoid=[(29.8, 30.6)])
PHONE_TOP = (-1.8, 4.1, CT + 0.72)
# mano di Mina che indica / tocca lo schermo (spazio mondo)
m_point_w = K(0, 0, 17.0, 0, 17.25, 1, 18.4, 1, 18.7, 0, 19.15, 0, 19.35, 1, 19.9, 1, 20.15, 0, 21.95, 0, 22.1, 1, 22.6, 1, 22.8, 0, 24.5, 0, 24.65, 1, 25.2, 1, 25.4, 0, 40, 0)
w_peek = K(0, 0, 13.0, 0, 13.35, 1, 14.4, 1, 14.62, 0, 40, 0)
m_point_tgt = dict(
    x=K(0, -1.78, 18.4, -1.78, 19.35, -1.7, 19.9, -1.7, 22.1, -1.68, 22.6, -1.68, 24.65, -1.8, 25.4, -1.8, 26.4, -1.8),
    y=K(0, 4.02, 40, 4.02),
    z=K(0, CT + 0.5, 18.4, CT + 0.5, 19.35, CT + 0.64, 19.9, CT + 0.64, 22.1, CT + 0.22, 22.6, CT + 0.22, 24.65, CT + 0.46, 25.4, CT + 0.46, 26.4, CT + 0.46),
)


def mina_params(t):
    i = int(t * FPS)
    mixw = {k: max(0.0, v(t)) for k, v in mw.items()}
    ex = mixp(MP, mixw)
    s = mscale(t)
    p = dict(
        x=mx(t), y=my(t), z=mz(t), yaw=m_yaw(t), sx=s, sy=s, sz=s,
        body_pitch=m_pitch(t), body_roll=m_roll(t), body_squash=m_squash(t) + A.breathe(t, 0.45, 0.012),
        cover_open=m_cover(t), bookmark=m_book(t),
        legL=0.0, legR=0.0,
    )
    # saltelli mentre parla
    e = A.talk_energy(t, SEG_MINA)
    p["body_roll"] += e * 2.2 * math.sin(2 * math.pi * 1.7 * t)
    p["body_z"] = e * 0.012 * abs(math.sin(2 * math.pi * 1.7 * t))
    p.update(ex)
    p["gaze_x"], p["gaze_y"] = mgaze_x(t), mgaze_y(t)
    p["blink"] = A.blink_curve(t, blinks_m)
    p["eye_mode"] = mmode(t)
    p["mouth"] = mina_mouth(t)
    # gambe: piccoli passi durante gli spostamenti
    p["legL"] = 22 * math.sin(2 * math.pi * 3 * t) * smoothstep(0, 1, abs(mx(t + 0.05) - mx(t - 0.05)) * 14)
    p["legR"] = -p["legL"]
    # braccia: appoggio sul bordo del telefono (peek), indicazione / tocco dello schermo
    wp = w_peek(t)
    wm = m_point_w(t)
    top = PHONE_TOP
    if wp > 0:
        p["armL_world"] = (top[0] - 0.16, top[1], top[2])
        p["armR_world"] = (top[0] + 0.16, top[1], top[2])
        p["armL_w"] = p["armR_w"] = wp
    if wm > 0:
        p["armL_world"] = (m_point_tgt["x"](t), m_point_tgt["y"](t), m_point_tgt["z"](t))
        p["armL_w"] = wm
    # saluto: braccio destro alzato mentre appare
    return p


# ====================================================================== TELECAMERE
SHOTS = [
    # nome, t0, t1, camera (chiavi t: pos), target, lens
    ("c1a", 0.0, 2.6, [(0, (-1.5, -7.0, 3.2)), (2.6, (-0.5, -6.4, 3.1))], [(0, (1.8, 2.4, 2.3)), (2.6, (2.5, 2.4, 2.3))], 30),
    ("c1b", 2.6, 5.0, [(2.6, (3.2, 4.6, 2.85)), (5.0, (3.2, 4.2, 2.85))], [(2.6, (3.2, 1.9, 2.62)), (5.0, (3.2, 1.9, 2.6))], 40),
    ("c2a", 5.0, 8.0, [(5.0, (1.5, -5.2, 2.7)), (8.0, (1.9, -4.6, 2.65))], [(5.0, (2.9, 1.9, 2.4)), (8.0, (2.6, 1.9, 2.4))], 32),
    ("c2b", 8.0, 11.0, [(8.0, (2.8, -1.6, 2.7)), (11.0, (2.7, -1.3, 2.68))], [(8.0, (2.6, 1.9, 2.6)), (11.0, (2.6, 1.9, 2.55))], 48),
    ("c3a", 11.0, 12.6, [(11.0, (-1.8, 2.3, 2.62)), (12.6, (-1.8, 2.85, 2.56))], [(11.0, (-1.8, 4.2, 2.47)), (12.6, (-1.8, 4.2, 2.5))], 50),
    ("c3b", 12.6, 15.2, [(12.6, (-2.4, 0.7, 3.1)), (15.2, (-2.1, 1.0, 3.0))], [(12.6, (-1.8, 4.2, 2.6)), (15.2, (-1.5, 4.1, 2.6))], 42),
    ("c3c", 15.2, 17.0, [(15.2, (0.6, -2.6, 2.9)), (17.0, (0.5, -2.3, 2.85))], [(15.2, (-0.6, 3.2, 2.45)), (17.0, (-0.6, 3.2, 2.45))], 32),
    ("c4", 17.0, 27.0, [(17.0, (-0.2, -0.4, 3.0)), (17.9, (-1.5, 0.3, 2.8)), (18.6, (-1.8, 1.6, 2.65)), (19.4, (-1.8, 3.25, 2.55)), (23.0, (-1.77, 3.3, 2.53)), (27.0, (-1.8, 3.28, 2.55))],
     [(17.0, (-1.3, 4.0, 2.55)), (17.9, (-1.6, 4.1, 2.52)), (18.6, (-1.8, 4.15, 2.5)), (27.0, (-1.8, 4.15, 2.5))], 40),
    ("c5a", 27.0, 30.6, [(27.0, (0.4, -1.9, 2.8)), (30.6, (0.45, -1.6, 2.78))], [(27.0, (-0.5, 3.3, 2.45)), (30.6, (-0.5, 3.3, 2.45))], 30),
    ("c5b", 30.6, 32.0, [(30.6, (0.1, -1.4, 2.7)), (32.0, (0.1, -1.2, 2.68))], [(30.6, (0.1, 2.2, 2.6)), (32.0, (0.1, 2.2, 2.58))], 48),
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
    m = sc.timeline_markers.new(name, frame=int(round(t0 * FPS)) + 1)
    m.camera = cam

# ====================================================================== bake
def frame_of(t):
    return int(round(t * FPS)) + 1


regs = [hero.reg, mina.reg]
t_bake = time.time()
fx = {}
for fi in range(NFR):
    t = fi / FPS
    f = fi + 1
    hero.apply(hero_params(t))
    mina.apply(mina_params(t))
    for r in regs:
        r.key(f)
    # porta e luci
    th = door_angle(t)
    kit["door_hinge"].rotation_euler = (0, 0, math.radians(th))
    kit["door_hinge"].keyframe_insert("rotation_euler", frame=f)
    lit = smoothstep(2.0, 30.0, th)
    for nm_ in ("fridge_light", "fridge_light2"):
        kit[nm_].data.energy = FR0[nm_] * lit * fridge_k(t)
    kit["lamp"].data.energy = lamp_e(t)
    glow.data.energy = glow_e(t)
    # telefono
    phone.location = PHONE_LOC
    phone.rotation_mode = "XYZ"
    phone.rotation_euler = (math.radians(-10), 0, math.radians(phone_buzz(t)))
    phone.keyframe_insert("rotation_euler", frame=f)
    phone.keyframe_insert("location", frame=f)
    n_on.outputs[0].default_value = phone_on(t)
    nt.keyframe_insert(data_path='nodes["on"].outputs[0].default_value', frame=f)
    kit["lamp"].data.keyframe_insert("energy", frame=f)
    kit["fridge_light"].data.keyframe_insert("energy", frame=f)
    kit["fridge_light2"].data.keyframe_insert("energy", frame=f)
    glow.data.keyframe_insert("energy", frame=f)
    # telecamere (solo nel loro intervallo)
    for cam, tg, t0, t1, tr, gr in cams:
        if t0 - 0.001 <= t <= t1 + 0.001:
            cam.location = Vector((tr[0](t), tr[1](t), tr[2](t)))
            tg.location = Vector((gr[0](t), gr[1](t), gr[2](t)))
            cam.keyframe_insert("location", frame=f)
            tg.keyframe_insert("location", frame=f)
print(f"bake: {time.time() - t_bake:.1f} s per {NFR} fotogrammi", flush=True)

# interpolazione lineare ovunque (un keyframe per fotogramma = valore esatto). Blender 5: azioni a livelli/strisce.
def _fcurves(act):
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out += list(cb.fcurves)
    return out


nfc = 0
for act in bpy.data.actions:
    for fc in _fcurves(act):
        nfc += 1
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
print("curve di animazione:", nfc, flush=True)

# posizione sullo schermo del punto di uscita di Mina (per l'effetto 2D)
sc.frame_set(frame_of(12.62))
cam_active = bpy.data.objects["c3b"]
sc.camera = cam_active
co = world_to_camera_view(sc, cam_active, Vector((-1.8, 4.05, CT + 0.45)))
json.dump(dict(burst_uv=[co.x, 1 - co.y], t=12.6), open(os.path.join(OUT, "fx.json"), "w"))

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "ep01_cucina_animata.blend"), compress=True)
print("blend salvato", flush=True)

if "--no-render" in flags:
    sys.exit(0)

# ====================================================================== render
a, b = RANGE if RANGE else (0.0, DUR3D)
sc.frame_start, sc.frame_end = frame_of(a), min(NFR, frame_of(b) - 1)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = os.path.join(OUT, "frames", "f_")
os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
sc.render.use_overwrite = True
sc.frame_step = int(os.environ.get("ADS_STEP", "1"))
t0r = time.time()
bpy.ops.render.render(animation=True)
print(f"render: {time.time() - t0r:.1f} s per {sc.frame_end - sc.frame_start + 1} fotogrammi", flush=True)
