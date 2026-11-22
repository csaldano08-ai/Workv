"""
Rig di Mina (libro vivente, design approvato): gerarchia di giunti + braccia morbide con IK + viso a parti animabili.

    root (piedi) ── body (centro del libro) ── pagine, dorso, elastico, linguette, segnalibro (oscilla)
     │                  ├── hinge ── copertina ── viso (iride, palpebre, sopracciglia, bocca, guance, rametto)
     │                  └── braccia: spalla, omero, gomito, avambraccio, mano a muffola + pollice (IK)
     └── gambe: perno all'anca ── gamba + piede

Solo l'iride si muove dentro il bianco dell'occhio; la palpebra scende per ammiccare. Nessun naso.
Lato L = -X del personaggio (a schermo a sinistra quando guarda la camera), R = +X.
"""
import math
import os

import bpy
from mathutils import Vector

import facekit
import mina as M
import hero as H
from characters import clay_material, ellipsoid, decal_material as alpha_decal, _link
from rig_common import joint, xf, solve_ik, place_segment, cone, part_mesh, Registry

W, Hh, D = M.W, M.H, M.D
CY = M.CY
SHZ = M.SH_Z - CY  # spalla nel sistema del corpo
L1 = L2 = 0.16
MAX_STRETCH = 1.7
HAND_FREE = (W / 2 + 0.15, -0.03, M.SH_Z - 0.25 - CY)
ARM_R = 0.068

PU = 1000.0
EYE_L = ((131 - 330) / PU, (500 - 395) / PU)
EYE_R = ((379 - 330) / PU, (500 - 395) / PU)
BROW_Y = (500 - (395 - 125)) / PU
BROW_X = {"L": (127 - 330) / PU, "R": (383 - 330) / PU}

DEFAULT = dict(
    x=0, y=0, z=0, yaw=0, sx=1, sy=1, sz=1,
    body_pitch=0, body_roll=0, body_twist=0, body_squash=0, body_z=0,
    legL=0, legR=0, cover_open=0, bookmark=0,
    armL_free=(-HAND_FREE[0], HAND_FREE[1], HAND_FREE[2]), armR_free=HAND_FREE,
    armL_world=(0, 0, 0), armL_w=0.0, armR_world=(0, 0, 0), armR_w=0.0,
    armL_pole=(-1.0, 0.3, 0.2), armR_pole=(1.0, 0.3, 0.2),
    browL_dy=0.0, browL_rot=-9.0, browR_dy=0.0, browR_rot=9.0,
    lidL=0.0, lidR=0.0, blink=0.0, eye_scale=1.0,
    gaze_x=0.3, gaze_y=-0.2, eye_mode="open", mouth="m_smile",
)


class MinaRig:
    def __init__(self, tmp, name="mina"):
        self.nm = name
        os.makedirs(tmp, exist_ok=True)
        self.reg = Registry()
        mt = M
        paper = clay_material(f"{name}_paper", mt.IVORY, 0.92, bump=0.05)
        pages = clay_material(f"{name}_pages", mt.PAGES, 0.95, bump=0.15)
        spine = clay_material(f"{name}_spine", mt.SPINE, 0.9, bump=0.06)
        arm = clay_material(f"{name}_arm", mt.ARM, 0.9, bump=0.06)
        leg = clay_material(f"{name}_leg", mt.LEG, 0.9, bump=0.06)
        band = clay_material(f"{name}_band", mt.BAND, 0.85, bump=0.04)
        peach = clay_material(f"{name}_peach", mt.PEACH, 0.85, bump=0.04)
        sagetab = clay_material(f"{name}_sagetab", mt.SAGE_TAB, 0.85, bump=0.04)
        edgem = clay_material(f"{name}_edge", mt.SPINE_EDGE, 0.88, bump=0.05)
        self.arm_mat = arm

        self.root = joint(f"{name}_root")
        self.reg.add(self.root, "location", "rotation_euler", "scale")
        # gambe
        self.legs = {}
        for side, key in ((-1, "L"), (1, "R")):
            piv = joint(f"{name}_leg{key}", self.root, (side * 0.19, 0, mt.Z0 + 0.02))
            c = cone(f"{name}_leg{key}_c", mt.Z0 + 0.02 - 0.06, 0.072, 0.072, leg, piv)
            c.rotation_euler = (math.pi, 0, 0)
            ellipsoid(f"{name}_foot{key}", (0, -0.035, -(mt.Z0 + 0.02 - 0.06) - 0.0), (0.1, 0.14, 0.06), leg, None, piv, seg=32, rings=20)
            self.legs[key] = piv
            self.reg.add(piv, "rotation_euler")
        # corpo
        self.body = joint(f"{name}_body", self.root, (0, 0, CY))
        self.reg.add(self.body, "rotation_euler", "scale", "location")
        b = self.body
        pg = M.rounded_slab(f"{name}_pages", W - 0.05, Hh - 0.014, D - 0.1, 0.03, pages, b, bevel=0.006)
        for n in pages.node_tree.nodes:
            if n.type == "BUMP":
                wv = pages.node_tree.nodes.new("ShaderNodeTexWave")
                wv.wave_type = "BANDS"
                wv.bands_direction = "Z"
                wv.inputs["Scale"].default_value = 90
                wv.inputs["Distortion"].default_value = 1.5
                pages.node_tree.links.new(wv.outputs["Fac"], n.inputs["Height"])
                n.inputs["Strength"].default_value = 0.9
                n.inputs["Distance"].default_value = 0.02
        back = M.rounded_slab(f"{name}_back", W, Hh, 0.05, 0.05, spine, b)
        back.location = (0, D / 2 - 0.025, 0)
        H.rounded_box(f"{name}_spine", (-W / 2 - 0.005, 0, 0), (0.07, D, Hh), 0.03, spine, b, seg=5, subsurf=0)
        H.rounded_box(f"{name}_spine_edge", (-W / 2 + M.EDGE / 2, -D / 2 + 0.03, 0), (M.EDGE, 0.06, Hh - 0.01), 0.02, edgem, b, seg=4, subsurf=0)
        ex = -W / 2 + 0.84 * W
        H.rounded_box(f"{name}_band", (ex, -0.005, 0), (0.062, D + 0.01, Hh + 0.012), 0.022, band, b, seg=4, subsurf=0)
        t1 = M.rounded_slab(f"{name}_tab_peach", 0.15, 0.17, 0.03, 0.02, peach, b, bevel=0.008)
        t1.location = (W / 2 + 0.045, -D / 2 + 0.1, mt.Z0 + Hh - 0.14 - CY)
        t2 = M.rounded_slab(f"{name}_tab_sage", 0.15, 0.16, 0.03, 0.02, sagetab, b, bevel=0.008)
        t2.location = (W / 2 + 0.045, -D / 2 + 0.1, mt.Z0 + Hh - 0.40 - CY)
        # segnalibro (perno in alto: oscilla)
        import bmesh
        bm = bmesh.new()
        pts = [(-0.035, 0), (0.035, 0), (0.035, -0.16), (0, -0.115), (-0.035, -0.16)]
        vs = [bm.verts.new((x, 0, z)) for x, z in pts]
        f = bm.faces.new(vs)
        res = bmesh.ops.extrude_face_region(bm, geom=[f])
        ev = [v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, vec=(0, 0.012, 0), verts=ev)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new(f"{name}_bookmark")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(peach)
        self.bm_piv = joint(f"{name}_bookmark_piv", b, (-W / 2 + 0.14, -D / 2 + 0.02, -Hh / 2 + 0.006), (0, math.radians(8), 0))
        self.reg.add(self.bm_piv, "rotation_euler")
        _link(bpy.data.objects.new(f"{name}_bookmark", me), self.bm_piv)
        # copertina incernierata + viso
        self.hinge = joint(f"{name}_hinge", b, (-W / 2 + M.EDGE, -D / 2 + 0.03, 0))
        self.reg.add(self.hinge, "rotation_euler")
        self.cover = M.rounded_slab(f"{name}_cover", M.WC, Hh, 0.06, 0.055, paper, self.hinge)
        self.cover.location = (M.WC / 2, 0, 0)
        self.face = joint(f"{name}_face_root", self.cover, (0, -0.0305, 0), (math.radians(90), 0, 0))
        # illustrazione del dorso (statica)
        import faces_mina as FM
        sp_path = os.path.join(tmp, f"{name}_spine_art.png")
        M._calib(FM.spine_image()).save(sp_path)
        M.plane_decal(f"{name}_spine_art", D * 0.92, Hh * 0.98, alpha_decal(f"{name}_spinemat", sp_path), b, (-W / 2 - 0.0405, 0, 0), (math.radians(90), 0, math.radians(90)))
        self._build_face(tmp)
        self._build_arms()

    def _build_face(self, tmp):
        P = facekit.mina_parts(tmp)
        self.P = P
        nm = self.nm

        def make(key, parent, loc, z, hidden=False, tag=""):
            d = P[key]
            ob = part_mesh(f"{nm}_{key}{tag}", d["size"], alpha_decal(f"{nm}_m_{key}{tag}", d["color"]), parent, loc, grid=1, z=z)
            if hidden:
                ob.hide_render = True
            return ob

        self.sclera_w, self.sclera_h = P["sclera"]["size"]
        hs = self.sclera_h / 2
        self.eye_pos = {"L": EYE_L, "R": EYE_R}
        self.eyeg, self.scl, self.iris, self.lid, self.alt = {}, {}, {}, {}, {}
        for key in ("L", "R"):
            ex, ey = self.eye_pos[key]
            g = joint(f"{nm}_eye{key}", self.face, (ex, ey - hs, 0), size=0.03)
            self.eyeg[key] = g
            self.scl[key] = make("sclera", g, (0, hs), 0.001, tag=key)
            self.iris[key] = make("iris", g, (0, hs), 0.002, tag=key)
            ld = P["lid_" + key]
            self.lid[key] = make("lid_" + key, self.face, (ex + ld["center"][0], ey + ld["center"][1]), 0.004)
            for kind in ("arc_happy", "arc_sleep"):
                d = P[f"{kind}_{key}"]
                self.alt[(kind, key)] = make(f"{kind}_{key}", self.face, (ex + d["center"][0], ey + d["center"][1]), 0.003, hidden=True)
                self.reg.add(self.alt[(kind, key)], "hide_render")
            self.reg.add(g, "scale", "location")
            self.reg.add(self.iris[key], "location")
            self.reg.add(self.lid[key], "location")
            self.reg.add(self.scl[key], "hide_render")
            self.reg.add(self.iris[key], "hide_render")
            self.reg.add(self.lid[key], "hide_render")
            make("cheek_" + key, self.face, P["cheek_" + key]["center"], 0.001)
        self.brows, self.brow_base = {}, {}
        for key in ("L", "R"):
            base = (BROW_X[key], BROW_Y + P["brow"]["center"][1])
            self.brows[key] = make("brow", self.face, base, 0.002, tag=key)
            self.brow_base[key] = base
            self.reg.add(self.brows[key], "location", "rotation_euler")
        self.mouths = {}
        for key in [k for k in P if k.startswith("m_")]:
            ob = make(key, self.face, P[key]["center"], 0.002, hidden=True)
            self.mouths[key] = ob
            self.reg.add(ob, "hide_render")
        make("sprig", self.face, P["sprig"]["center"], 0.001)

    def _build_arms(self):
        nm = self.nm
        arm = self.arm_mat
        self.arm = {}
        for key, side in (("L", -1), ("R", 1)):
            S = Vector((side * (W / 2 + 0.01), 0, SHZ))
            up = cone(f"{nm}_arm{key}_up", L1, ARM_R, ARM_R * 1.03, arm, self.body)
            fo = cone(f"{nm}_arm{key}_fo", L2, ARM_R * 1.03, ARM_R * 1.06, arm, self.body)
            ellipsoid(f"{nm}_sh{key}", S, (0.075,) * 3, arm, None, self.body, seg=24, rings=14)
            el = ellipsoid(f"{nm}_el{key}", (0, 0, 0), (ARM_R * 1.03,) * 3, arm, None, self.body, seg=24, rings=14)
            mit = ellipsoid(f"{nm}_mitt{key}", (0, 0, 0), (0.078, 0.06, 0.088), arm, None, self.body, seg=32, rings=20)
            th = ellipsoid(f"{nm}_thumb{key}", (0, 0, 0), (0.034, 0.034, 0.06), arm, None, self.body, seg=20, rings=12)
            for o in (mit, th):
                o.rotation_mode = "QUATERNION"
                self.reg.add(o, "location", "rotation_quaternion")
            for o in (up, fo):
                self.reg.add(o, "location", "rotation_quaternion", "scale")
            self.reg.add(el, "location")
            self.arm[key] = dict(up=up, fo=fo, el=el, mit=mit, th=th, side=side, S=S)

    def apply(self, q):
        p = dict(DEFAULT)
        p.update(q)
        rad = math.radians
        r = self.root
        r.location = (p["x"], p["y"], p["z"])
        r.rotation_euler = (0, 0, rad(p["yaw"]))
        r.scale = (p["sx"], p["sy"], p["sz"])
        s = p["body_squash"]
        self.body.location = (0, 0, CY + p["body_z"])
        self.body.rotation_euler = (rad(p["body_pitch"]), rad(p["body_roll"]), rad(p["body_twist"]))
        bsc = (1 + s * 0.4, 1 + s * 0.4, 1 - s)
        self.body.scale = bsc
        self.legs["L"].rotation_euler = (rad(p["legL"]), 0, 0)
        self.legs["R"].rotation_euler = (rad(p["legR"]), 0, 0)
        self.hinge.rotation_euler = (0, 0, rad(-p["cover_open"]))
        self.bm_piv.rotation_euler = (rad(p["bookmark"]), rad(8), 0)
        Mb = xf((p["x"], p["y"], p["z"]), (0, 0, p["yaw"]), (p["sx"], p["sy"], p["sz"])) @ xf((0, 0, CY + p["body_z"]), (p["body_pitch"], p["body_roll"], p["body_twist"]), bsc)
        Mi = Mb.inverted()
        for key in ("L", "R"):
            a = self.arm[key]
            S = a["S"]
            free = Vector(p[f"arm{key}_free"])
            w = p[f"arm{key}_w"]
            tgt = free.lerp(Mi @ Vector(p[f"arm{key}_world"]), w) if w > 0 else free
            f = min(MAX_STRETCH, max(1.0, (tgt - S).length / ((L1 + L2) * 0.97)))
            E, Hh_ = solve_ik(S, tgt, L1 * f, L2 * f, Vector(p[f"arm{key}_pole"]))
            place_segment(a["up"], S, E, L1)
            place_segment(a["fo"], E, Hh_, L2)
            a["el"].location = E
            dirv = (Hh_ - E).normalized()
            quat = dirv.to_track_quat("Z", "Y")
            a["mit"].rotation_quaternion = quat
            a["mit"].location = Hh_ + dirv * 0.012
            side_vec = quat @ Vector((-a["side"], 0, 0))
            a["th"].rotation_quaternion = quat
            a["th"].location = Hh_ - dirv * 0.025 + side_vec * 0.05
        self._face(p)

    def _face(self, p):
        mode = p["eye_mode"]
        es = p["eye_scale"]
        P = self.P
        for key, lidv in (("L", p["lidL"]), ("R", p["lidR"])):
            closed = max(lidv, p["blink"])
            em = "arc_sleep" if (mode == "open" and closed >= 0.6) else mode
            op = em == "open"
            self.eyeg[key].scale = (es, max(0.5, 1 - closed) * es, 1)
            self.scl[key].hide_render = not op
            self.iris[key].hide_render = not op
            self.lid[key].hide_render = not op
            for kind in ("arc_happy", "arc_sleep"):
                self.alt[(kind, key)].hide_render = em != kind
            ex, ey = self.eye_pos[key]
            ld = P["lid_" + key]
            self.lid[key].location = (ex + ld["center"][0], ey + ld["center"][1] - min(closed, 0.5) * 0.1, 0.004)
            hs = self.sclera_h / 2
            maxdx = max(0.0, (self.sclera_w - P["iris"]["size"][0]) / 2 * 0.95)
            maxdy = max(0.0, (self.sclera_h - P["iris"]["size"][1]) / 2 * 0.95)
            nx = max(-1.0, min(1.0, p["gaze_x"]))
            ny = max(-1.0, min(1.0, p["gaze_y"]))
            self.iris[key].location = (nx * maxdx, hs + ny * maxdy, 0.002)
        for key in ("L", "R"):
            b = self.brows[key]
            bx, by = self.brow_base[key]
            b.location = (bx, by + p[f"brow{key}_dy"], 0.002)
            b.rotation_euler = (0, 0, math.radians(p[f"brow{key}_rot"]))
        for k, ob in self.mouths.items():
            ob.hide_render = (k != p["mouth"])
