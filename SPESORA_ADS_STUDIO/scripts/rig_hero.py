"""
Rig del protagonista (pongo, proporzioni del riferimento): gerarchia di giunti + braccia morbide con IK + viso a parti animabili.

    root ── hips ── torso
     │        ├── neck ── testa, naso, face_root (parti del viso)
     │        └── braccia (spalla, omero, gomito, avambraccio, mano) risolte con IK analitica
     ├── gamba_L (perno all'anca) ── gamba
     └── gamba_R

Lato L = lato -X del personaggio (a schermo a sinistra quando guarda la camera), R = lato +X.
I controlli sono parametri numerici (dict) passati a apply(); l'animazione li campiona nel tempo (anim.py) e li "cuoce" in keyframe.
Unità: la testa è larga 1.0, il personaggio è alto ~3.1.
"""
import math
import os

import bpy
from mathutils import Vector

import faces2 as F2
import facekit
import hero as H
from characters import clay_material, ellipsoid, decal_material as alpha_decal, _link
from rig_common import joint, xf, solve_ik, place_segment, cone, part_mesh, add_wrap, Registry

HIPS_Z = 0.95
SH = (0.47, 0.0, 1.72 - HIPS_Z)  # spalla in coordinate dei fianchi (x = ±0.47)
L1, L2 = 0.41, 0.41
MAX_STRETCH = 1.45  # le braccia si allungano come elastico se la mano deve arrivare lontano
HAND_FREE = (0.78, -0.02, 0.98 - HIPS_Z)

DEFAULT = dict(
    x=0, y=0, z=0, yaw=0, sx=1, sy=1, sz=1,
    hips_pitch=0, hips_roll=0, hips_twist=0, hips_squash=0,
    neck_pitch=0, neck_roll=0, neck_yaw=0, neck_squash=0,
    legL=0, legR=0,
    armL_free=(-HAND_FREE[0], HAND_FREE[1], HAND_FREE[2]), armR_free=HAND_FREE,
    armL_world=(0, 0, 0), armL_w=0.0, armR_world=(0, 0, 0), armR_w=0.0,
    armL_pole=(-1.0, 0.25, 0.1), armR_pole=(1.0, 0.25, 0.1),
    # viso
    browL_dy=0.0, browL_rot=17.0, browR_dy=0.0, browR_rot=-17.0,
    lidL=0.0, lidR=0.0, blink=0.0, eyeL_scale=1.0, eyeR_scale=1.0, pupil_scale=1.0,
    gaze_x=0.0, gaze_y=-0.4, converge=0.8,
    eye_mode="open", mouth="m_smile", blush=False,
)

PX = facekit.HS  # px per unità


class HeroRig:
    def __init__(self, tmp, name="eroe"):
        self.nm = name
        self.reg = Registry()
        skin = clay_material(f"{name}_skin", H.C_SKIN, 0.80, sss=0.05, bump=0.035)
        shirt = clay_material(f"{name}_shirt", H.C_SHIRT, 0.88, bump=0.10)
        pants = clay_material(f"{name}_pants", H.C_PANTS, 0.86, bump=0.10)
        nosem = clay_material(f"{name}_nose", H.C_NOSE, 0.70, bump=0.03)
        self.skin = skin

        self.root = joint(f"{name}_root")
        self.reg.add(self.root, "location", "rotation_euler", "scale")
        # gambe
        self.legs = {}
        for side, key in ((-1, "L"), (1, "R")):
            piv = joint(f"{name}_leg{key}_pivot", self.root, (side * H.LEG["x"], 0, H.LEG["h"]))
            H.rounded_box(f"{name}_leg{key}", (0, 0, -H.LEG["h"] / 2), (H.LEG["w"], H.LEG["d"], H.LEG["h"]), H.LEG["bevel"], pants, piv)
            self.legs[key] = piv
            self.reg.add(piv, "rotation_euler")
        # fianchi, busto, collo, testa
        self.hips = joint(f"{name}_hips", self.root, (0, 0, HIPS_Z))
        self.reg.add(self.hips, "rotation_euler", "scale")
        H.rounded_box(f"{name}_torso", (0, 0, H.TORSO["z"] - HIPS_Z), (H.TORSO["w"], H.TORSO["d"], H.TORSO["h"]), H.TORSO["bevel"], shirt, self.hips, taper_top=0.86)
        self.neck = joint(f"{name}_neck", self.hips, (0, 0, H.NECK_Z - HIPS_Z))
        self.reg.add(self.neck, "rotation_euler", "scale")
        hz = H.HEAD_Z - H.NECK_Z
        self.head = ellipsoid(f"{name}_head", (0, 0, hz), H.HEAD_R, skin, None, self.neck, seg=96, rings=64)
        ellipsoid(f"{name}_nose", (0, -H.HEAD_R[1] + 0.010, hz - 0.03), (0.055, 0.055, 0.055), nosem, None, self.neck, seg=40, rings=24)
        self.face = joint(f"{name}_face_root", self.neck, (0, -0.7, hz), (math.radians(90), 0, 0))
        self._build_face(tmp)
        self._build_arms(skin)

    # ------------------------------------------------------------------ viso
    def _build_face(self, tmp):
        P = facekit.hero_parts(tmp)
        self.P = P
        nm = self.nm

        def mat_for(key):
            d = P[key]
            if d["height"]:
                return H.decal_material(f"{nm}_m_{key}", d["color"], d["height"])
            return alpha_decal(f"{nm}_m_{key}", d["color"])

        def make(key, parent, loc, offset, hidden=False, tag=""):
            d = P[key]
            n = max(2, int(max(d["size"]) / 0.014))
            ob = part_mesh(f"{nm}_{key}{tag}", d["size"], mat_for(key), parent, loc, grid=n)
            add_wrap(ob, self.head, offset)
            if hidden:
                ob.hide_render = True
            return ob

        ex = abs((F2.EX) / PX)
        ey = (512 - F2.EY) / PX
        self.eye_pos = {"L": (-ex, ey), "R": (ex, ey)}
        self.sclera_h = P["sclera"]["size"][1]
        self.sclera_w = P["sclera"]["size"][0]
        hs = self.sclera_h / 2
        self.eyeg, self.scl, self.pup = {}, {}, {}
        for key, side in (("L", -1), ("R", 1)):
            g = joint(f"{nm}_eye{key}", self.face, (self.eye_pos[key][0], self.eye_pos[key][1] - hs, 0), size=0.04)
            self.eyeg[key] = g
            self.scl[key] = make("sclera", g, (0, hs), 0.004, tag=key)
            self.pup[key] = make("pupil", g, (0, hs), 0.008, tag=key)
            self.reg.add(g, "scale", "location")
            self.reg.add(self.pup[key], "location", "scale")
        by = (512 - F2.BY) / PX
        bx = (172 + 18) / PX
        self.brows = {"L": make("brow", self.face, (-bx, by), 0.005, tag="L"), "R": make("brow", self.face, (bx, by), 0.005, tag="R")}
        self.brow_base = {"L": (-bx, by), "R": (bx, by)}
        for k in ("L", "R"):
            self.reg.add(self.brows[k], "location", "rotation_euler")
        # bocche
        self.mouths = {}
        for key in [k for k in P if k.startswith("m_")]:
            ob = make(key, self.face, P[key]["center"], 0.004, hidden=True)
            self.mouths[key] = ob
            self.reg.add(ob, "hide_render")
        # occhi chiusi / arrabbiati
        self.alt = {}
        for key, side in (("L", -1), ("R", 1)):
            cx, cy = self.eye_pos[key]
            for kind in ("arc_happy", "arc_sleep"):
                d = P[kind]
                self.alt[(kind, key)] = make(kind, self.face, (cx, d["center"][1]), 0.005, hidden=True, tag=key)
            d = P["angry_" + key]
            self.alt[("angry", key)] = make("angry_" + key, self.face, d["center"], 0.005, hidden=True)
            self.reg.add(self.alt[("arc_happy", key)], "hide_render")
            self.reg.add(self.alt[("arc_sleep", key)], "hide_render")
            self.reg.add(self.alt[("angry", key)], "hide_render")
            self.reg.add(self.scl[key], "hide_render")
            self.reg.add(self.pup[key], "hide_render")
        # guance
        self.blush_o = {}
        for key, side in (("L", -1), ("R", 1)):
            ob = make("blush", self.face, (side * 0.255, ey - 0.095), 0.003, hidden=True, tag=key)
            self.blush_o[key] = ob
            self.reg.add(ob, "hide_render")

    # ------------------------------------------------------------------ braccia
    def _build_arms(self, skin):
        nm = self.nm
        self.arm = {}
        for key, side in (("L", -1), ("R", 1)):
            up = cone(f"{nm}_arm{key}_up", L1, 0.215, 0.285, skin, self.hips)
            fo = cone(f"{nm}_arm{key}_fo", L2, 0.285, 0.262, skin, self.hips)
            sh = ellipsoid(f"{nm}_sh{key}", (side * SH[0], 0, SH[2]), (0.215,) * 3, skin, None, self.hips, seg=40, rings=24)
            el = ellipsoid(f"{nm}_el{key}", (0, 0, 0), (0.285,) * 3, skin, None, self.hips, seg=40, rings=24)
            ha = ellipsoid(f"{nm}_ha{key}", (0, 0, 0), (0.262,) * 3, skin, None, self.hips, seg=40, rings=24)
            self.arm[key] = dict(up=up, fo=fo, el=el, ha=ha, side=side)
            for o in (up, fo):
                self.reg.add(o, "location", "rotation_quaternion", "scale")
            for o in (el, ha):
                self.reg.add(o, "location")

    # ------------------------------------------------------------------ applicazione dei parametri
    def apply(self, q):
        p = dict(DEFAULT)
        p.update(q)
        rad = math.radians
        r = self.root
        r.location = (p["x"], p["y"], p["z"])
        r.rotation_euler = (0, 0, rad(p["yaw"]))
        r.scale = (p["sx"], p["sy"], p["sz"])
        s = p["hips_squash"]
        self.hips.rotation_euler = (rad(p["hips_pitch"]), rad(p["hips_roll"]), rad(p["hips_twist"]))
        self.hips.scale = (1 + s * 0.45, 1 + s * 0.45, 1 - s)
        ns = p["neck_squash"]
        self.neck.rotation_euler = (rad(p["neck_pitch"]), rad(p["neck_roll"]), rad(p["neck_yaw"]))
        self.neck.scale = (1 + ns * 0.4, 1 + ns * 0.4, 1 - ns)
        self.legs["L"].rotation_euler = (rad(p["legL"]), 0, 0)
        self.legs["R"].rotation_euler = (rad(p["legR"]), 0, 0)
        # braccia (IK)
        Mh = xf((p["x"], p["y"], p["z"]), (0, 0, p["yaw"]), (p["sx"], p["sy"], p["sz"])) @ xf((0, 0, HIPS_Z), (p["hips_pitch"], p["hips_roll"], p["hips_twist"]), (1 + s * 0.45, 1 + s * 0.45, 1 - s))
        Mi = Mh.inverted()
        for key in ("L", "R"):
            a = self.arm[key]
            side = a["side"]
            S = Vector((side * SH[0], 0, SH[2]))
            free = Vector(p[f"arm{key}_free"])
            w = p[f"arm{key}_w"]
            tgt_local = free.lerp(Mi @ Vector(p[f"arm{key}_world"]), w) if w > 0 else free
            dist = (tgt_local - S).length
            f = min(MAX_STRETCH, max(1.0, dist / ((L1 + L2) * 0.97)))
            E, Hh = solve_ik(S, tgt_local, L1 * f, L2 * f, Vector(p[f"arm{key}_pole"]))
            place_segment(a["up"], S, E, L1)
            place_segment(a["fo"], E, Hh, L2)
            a["el"].location = E
            a["ha"].location = Hh
        self._face(p)

    def _face(self, p):
        closedL = max(p["lidL"], p["blink"])
        closedR = max(p["lidR"], p["blink"])
        mode = p["eye_mode"]
        openeyes = mode == "open"
        for key, closed, es in (("L", closedL, p["eyeL_scale"]), ("R", closedR, p["eyeR_scale"])):
            g = self.eyeg[key]
            # oltre il 60% di chiusura l'occhio diventa la linea chiusa disegnata (niente fessura bianca schiacciata)
            em = "arc_sleep" if (mode == "open" and closed >= 0.6) else mode
            op = em == "open"
            g.scale = (es, max(0.45, 1 - closed) * es, 1)
            self.scl[key].hide_render = not op
            self.pup[key].hide_render = not op
            self.alt[("arc_happy", key)].hide_render = em != "arc_happy"
            self.alt[("arc_sleep", key)].hide_render = em != "arc_sleep"
            self.alt[("angry", key)].hide_render = em != "angry"
            side_in = 1 if key == "L" else -1
            ps = p["pupil_scale"]
            maxdx = max(0.0, (self.sclera_w - self.P["pupil"]["size"][0] * ps) / 2 * 0.92)
            maxdy = max(0.0, (self.sclera_h - self.P["pupil"]["size"][1] * ps) / 2 * 0.92)
            nx = max(-1.0, min(1.0, side_in * p["converge"] + p["gaze_x"]))
            ny = max(-1.0, min(1.0, p["gaze_y"]))
            hs = self.sclera_h / 2
            self.pup[key].location = (nx * maxdx, hs + ny * maxdy, 0)
            self.pup[key].scale = (ps, ps, 1)
        for key, sgn in (("L", 1), ("R", 1)):
            b = self.brows[key]
            bx, by = self.brow_base[key]
            b.location = (bx, by + p[f"brow{key}_dy"], 0)
            b.rotation_euler = (0, 0, math.radians(p[f"brow{key}_rot"]))
        for k, ob in self.mouths.items():
            ob.hide_render = (k != p["mouth"])
        for ob in self.blush_o.values():
            ob.hide_render = not p["blush"]
