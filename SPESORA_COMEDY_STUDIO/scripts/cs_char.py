"""
SPESORA COMEDY STUDIO · sistema dei personaggi (Blender 5, modulo bpy).

Linguaggio visivo ricavato dal video di riferimento (VID-20261121-WA0019): testa bianca tondeggiante con volto 2D a inchiostro,
busto 3D morbido "a proiettile" (più largo in basso), arti sottili neri con gomiti e ginocchia veri, mani chiare da cartone
a quattro dita, piedi piccoli e tondi, contorno nero a inchiostro su tutto il personaggio.
I personaggi sono originali: cambiano proporzioni, abiti, capelli, colori e carattere.

Rig: armatura Blender reale.
  root · pelvis · spine · chest · head
  shoulder / upperarm / forearm / hand / dita (pollice + 3 dita, 2 falangi ciascuna)  — braccia IK con polo del gomito
  thigh / shin / foot                                                                   — gambe IK con polo del ginocchio
  controlli: ik_hand.*, pole_elbow.*, ik_foot.*, pole_knee.*   (non deformano)
Lo spazio dell'armatura è lo "spazio del corpo": il personaggio guarda verso -Y, Z in alto, piedi a z=0.
Si sposta nel mondo muovendo l'oggetto armatura (place / set_world).
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

# ------------------------------------------------------------------ specifiche (unità ≈ metri)
BASE_SPEC = dict(
    name="base",
    head_r=0.30, head_egg=1.06,
    torso_h=0.78, torso_top=0.245, torso_bot=0.305, torso_depth=0.84,
    leg_len=0.46, leg_r=0.024, ankle_h=0.05,
    arm_upper=0.28, arm_fore=0.27, arm_r=0.021, arm_out_deg=27,
    hand_scale=1.35,
    head_col=(0.95, 0.95, 0.93), hand_col=(0.97, 0.93, 0.89), limb_col=(0.09, 0.085, 0.09),
    shoe_col=(0.1, 0.1, 0.11), hair_col=(0.28, 0.18, 0.12),
    outfit="blazer", outfit_cols={}, hair="quiff", lashes=False,
    outline=0.0085,
)

CAST = {
    # protagonista: giacca blu su maglietta bianca (è il motivo dell'equivoco: «arriva uno in giacca blu che controlla tutto col telefono»)
    "protagonista": dict(name="protagonista", outfit="blazer",
                         outfit_cols=dict(main=(0.17, 0.25, 0.44), lapel=(0.12, 0.18, 0.33), tee=(0.98, 0.76, 0.52)),
                         hair="quiff", hair_col=(0.3, 0.19, 0.12), shoe_col=(0.42, 0.26, 0.16)),
    # variante femminile preliminare (stessa base, proporzioni e carattere diversi)
    "protagonista_f": dict(name="protagonista_f", torso_h=0.72, torso_top=0.215, torso_bot=0.315, leg_len=0.43,
                           head_r=0.29, arm_upper=0.26, arm_fore=0.25, outfit="dress",
                           outfit_cols=dict(main=(0.9, 0.5, 0.4), collar=(0.98, 0.96, 0.92), belt=(0.45, 0.3, 0.22)),
                           hair="bob", hair_col=(0.55, 0.28, 0.16), lashes=True, shoe_col=(0.75, 0.35, 0.3)),
}


def spec_for(name):
    s = dict(BASE_SPEC)
    s.update(CAST[name])
    return s


# ------------------------------------------------------------------ utilità
def _link(ob, coll=None):
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lin(c):
    """sRGB 0..1 → lineare (Cycles)."""
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c)


def clay(name, col, rough=0.62, sheen=0.25, bump=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    try:
        b.inputs["Sheen Weight"].default_value = sheen
        b.inputs["Coat Weight"].default_value = coat
    except KeyError:
        pass
    if bump > 0:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 60
        nz.inputs["Detail"].default_value = 3
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        nt.links.new(tc.outputs["Generated"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


_OUTLINE = None


def outline_material():
    """Inchiostro del contorno (guscio invertito): nero solo per i raggi di camera e solo sul lato interno del guscio."""
    global _OUTLINE
    if _OUTLINE and _OUTLINE.name in bpy.data.materials:
        return _OUTLINE
    m = bpy.data.materials.new("cs_outline")
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.012, 0.01, 0.01, 1)
    em.inputs["Strength"].default_value = 1.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    lp = nt.nodes.new("ShaderNodeLightPath")
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(lp.outputs["Is Camera Ray"], inv.inputs[1])
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MAXIMUM"
    nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
    nt.links.new(inv.outputs[0], mx.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mx.outputs[0], mix.inputs["Fac"])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    _OUTLINE = m
    return m


def add_outline(ob, width):
    """Contorno a inchiostro con guscio invertito (Solidify, normali capovolte), dopo l'armatura."""
    me = ob.data
    if outline_material().name not in [m.name for m in me.materials if m]:
        me.materials.append(outline_material())
    idx = [m.name for m in me.materials].index(outline_material().name)
    sol = ob.modifiers.new("outline", "SOLIDIFY")
    sol.thickness = width
    sol.offset = 1.0
    sol.use_flip_normals = True
    sol.use_rim = False
    sol.use_even_offset = True
    sol.material_offset = idx
    sol.material_offset_rim = idx
    return sol


def mesh_object(name, bm, mats, coll=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return _link(bpy.data.objects.new(name, me), coll)


def ellipsoid_bm(center, radii, seg=32, rings=20, bm=None, rot=None):
    bm = bm or bmesh.new()
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    M = rot.to_4x4() if rot is not None else Matrix.Identity(4)
    for v in res["verts"]:
        p = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
        v.co = (M @ p) + Vector(center)
    return bm, res["verts"]


def tube_bm(points, radii, seg=12, per_unit=90, bm=None):
    """Tubo morbido lungo una polilinea (estremità chiuse con semisfere). Ritorna bm, lista (vertici, parametro s lungo la linea)."""
    bm = bm or bmesh.new()
    pts = [Vector(p) for p in points]
    total = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    n = max(8, int(total * per_unit))
    # campionamento lungo la polilinea
    samples = []
    seglens = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    for k in range(n + 1):
        s = total * k / n
        acc = 0.0
        for i, L in enumerate(seglens):
            if s <= acc + L or i == len(seglens) - 1:
                t = (s - acc) / L if L > 0 else 0
                samples.append((pts[i].lerp(pts[i + 1], min(1.0, t)), s / total))
                break
            acc += L
    # direzioni morbide e trasporto parallelo del riferimento
    dirs = []
    for k in range(len(samples)):
        a = samples[max(0, k - 2)][0]
        b = samples[min(len(samples) - 1, k + 2)][0]
        dirs.append((b - a).normalized())
    ref = dirs[0].orthogonal().normalized()
    rings = []
    vinfo = []
    for k, ((p, s), d) in enumerate(zip(samples, dirs)):
        ref = (ref - d * ref.dot(d)).normalized()
        b2 = d.cross(ref)
        r = radii(s) if callable(radii) else radii
        ring = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            v = bm.verts.new(p + (ref * math.cos(a) + b2 * math.sin(a)) * r)
            ring.append(v)
            vinfo.append((v, s))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for j in range(seg):
            bm.faces.new((rings[k][j], rings[k][(j + 1) % seg], rings[k + 1][(j + 1) % seg], rings[k + 1][j]))
    # tappi a semisfera
    for end, ring, d, s in ((0, rings[0], -dirs[0], 0.0), (1, rings[-1], dirs[-1], 1.0)):
        p = samples[0][0] if end == 0 else samples[-1][0]
        r = radii(s) if callable(radii) else radii
        prev = ring
        steps = 4
        for q in range(1, steps + 1):
            ang = math.pi / 2 * q / steps
            if q == steps:
                tip = bm.verts.new(p + d * r)
                vinfo.append((tip, s))
                for j in range(seg):
                    f = (prev[j], prev[(j + 1) % seg], tip) if end == 1 else (prev[(j + 1) % seg], prev[j], tip)
                    bm.faces.new(f)
                break
            cur = []
            for j in range(seg):
                v0 = prev[j].co
                radial = (v0 - (p + d * d.dot(v0 - p))).normalized()
                nv = bm.verts.new(p + radial * r * math.cos(ang) + d * r * math.sin(ang))
                cur.append(nv)
                vinfo.append((nv, s))
            for j in range(seg):
                f = (prev[j], prev[(j + 1) % seg], cur[(j + 1) % seg], cur[j]) if end == 1 else (prev[(j + 1) % seg], prev[j], cur[j], cur[(j + 1) % seg])
                bm.faces.new(f)
            prev = cur
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm, vinfo


# ------------------------------------------------------------------ pittura degli abiti (texture UV del busto)
def paint_outfit(spec, path, W=2048, H=1024):
    """UV del busto: u = giro (0.5 = davanti), v = altezza (0 in basso). Abiti dipinti, nessuna geometria sovrapposta → niente z-fighting."""
    from PIL import Image, ImageDraw, ImageFilter
    import random
    c = spec["outfit_cols"]

    def C(t):  # colori sRGB 0..1
        return tuple(int(max(0, min(1, x)) * 255) for x in t)

    im = Image.new("RGB", (W, H), C(c.get("main", (0.5, 0.5, 0.5))))
    d = ImageDraw.Draw(im)
    X = lambda u: u * W
    Y = lambda v: (1 - v) * H
    if spec["outfit"] == "blazer":
        tee, lapel, main = C(c["tee"]), C(c["lapel"]), C(c["main"])
        # apertura a V che mostra la maglietta
        def half_open(v):
            return 0.0 if v < 0.40 else 0.085 * smoothstep(0.40, 0.88, v) + 0.02 * smoothstep(0.88, 1.0, v)
        poly_l, poly_r = [], []
        for i in range(61):
            v = 0.40 + 0.6 * i / 60
            poly_l.append((X(0.5 - half_open(v)), Y(v)))
            poly_r.append((X(0.5 + half_open(v)), Y(v)))
        d.polygon(poly_l + poly_r[::-1], fill=tee)
        # rever (risvolti) ai lati della V
        for sgn in (-1, 1):
            pts = [(X(0.5 + sgn * half_open(v)), Y(v)) for v in [0.42 + 0.5 * i / 30 for i in range(31)]]
            outer = [(X(0.5 + sgn * (half_open(v) + 0.035 * smoothstep(0.42, 0.6, v))), Y(v)) for v in [0.42 + 0.5 * i / 30 for i in range(31)]]
            d.polygon(pts + outer[::-1], fill=lapel)
            d.line(outer, fill=tuple(min(255, x + 35) for x in lapel), width=4)
        # chiusura, bottoni, tasche, orlo
        d.line([(X(0.5), Y(0.40)), (X(0.5), Y(0.0))], fill=lapel, width=6)
        for v in (0.33, 0.2):
            d.ellipse([X(0.5) - 13, Y(v) - 13, X(0.5) + 13, Y(v) + 13], fill=(25, 28, 40))
        for u0 in (0.37, 0.57):
            d.line([(X(u0), Y(0.2)), (X(u0 + 0.065), Y(0.2))], fill=lapel, width=7)
        d.rectangle([0, Y(0.03), W, H], fill=lapel)
        # collo della maglietta sul retro/lati in cima
        d.rectangle([0, 0, W, Y(0.985)], fill=tee)
    elif spec["outfit"] == "dress":
        main, collar, belt = C(c["main"]), C(c["collar"]), C(c["belt"])
        # colletto rotondo bianco davanti, cintura in vita, gonna con pieghe leggere
        d.rectangle([0, Y(0.56), W, Y(0.5)], fill=belt)
        d.ellipse([X(0.5) - 14, Y(0.53) - 14, X(0.5) + 14, Y(0.53) + 14], fill=(220, 190, 120))
        for sgn in (-1, 1):
            cx = 0.5 + sgn * 0.045
            d.pieslice([X(cx) - 95, Y(0.99) - 70, X(cx) + 95, Y(0.99) + 120], 0, 180, fill=collar)
        for k in range(12):
            u = (k + 0.5) / 12
            d.line([(X(u), Y(0.48)), (X(u + 0.01), Y(0.02))], fill=tuple(max(0, x - 18) for x in main), width=5)
        d.rectangle([0, 0, W, Y(0.985)], fill=collar)
    # trama leggera del tessuto
    rnd = random.Random(3)
    px = im.load()
    for _ in range(W * H // 18):
        x, y = rnd.randrange(W), rnd.randrange(H)
        r, g, b = px[x, y]
        k = rnd.randint(-7, 7)
        px[x, y] = (max(0, min(255, r + k)), max(0, min(255, g + k)), max(0, min(255, b + k)))
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    im.save(path)
    return path


def textured_material(name, img_path, rough=0.75, sheen=0.35):
    m = clay(name, (1, 1, 1), rough, sheen)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(img_path, check_existing=True)
    tx.interpolation = "Cubic"
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    nt.links.new(uv.outputs["UV"], tx.inputs["Vector"])
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
    return m


def face_material(name, head_col, img_path):
    """Testa bianca + volto 2D: colore = mix(bianco testa, texture, alfa × maschera frontale)."""
    m = clay(name, head_col, 0.58, 0.2)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.name = "face"
    tx.image = bpy.data.images.load(img_path, check_existing=False)
    tx.extension = "CLIP"
    tx.interpolation = "Cubic"
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    nt.links.new(uv.outputs["UV"], tx.inputs["Vector"])
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "front"
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(tx.outputs["Alpha"], mul.inputs[0])
    nt.links.new(attr.outputs["Fac"], mul.inputs[1])
    mixc = nt.nodes.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    mixc.inputs["A"].default_value = (*head_col, 1)
    nt.links.new(mul.outputs[0], mixc.inputs["Factor"])
    nt.links.new(tx.outputs["Color"], mixc.inputs["B"])
    nt.links.new(mixc.outputs["Result"], b.inputs["Base Color"])
    # l'inchiostro non deve lucidare
    rmix = nt.nodes.new("ShaderNodeMapRange")
    rmix.inputs["To Min"].default_value = 0.58
    rmix.inputs["To Max"].default_value = 0.9
    nt.links.new(mul.outputs[0], rmix.inputs["Value"])
    nt.links.new(rmix.outputs["Result"], b.inputs["Roughness"])
    return m


# ------------------------------------------------------------------ il personaggio
class Character:
    def __init__(self, spec_name, workdir, coll=None, suffix=""):
        self.spec = spec_for(spec_name)
        self.name = self.spec["name"] + suffix
        self.workdir = workdir
        os.makedirs(workdir, exist_ok=True)
        self.coll = coll or bpy.data.collections.new(self.name)
        if self.coll.name not in bpy.context.scene.collection.children:
            bpy.context.scene.collection.children.link(self.coll)
        self.parts = {}
        self._layout()
        self._build_rig()
        self._build_meshes()
        self._skin()
        self.rest_pose()

    # ---------------- proporzioni
    def _layout(self):
        s = self.spec
        self.z_ankle = s["ankle_h"]
        self.z_hip = self.z_ankle + s["leg_len"]
        self.z_tb = self.z_hip - 0.07
        self.z_top = self.z_tb + s["torso_h"]
        self.head_c = Vector((0, 0, self.z_top + s["head_r"] * 0.80))
        self.hip_x = 0.115
        self.z_sh = self.z_top - 0.14
        self.sh_x = self.torso_half(self.z_sh) - 0.014  # giunto appena sotto la superficie: il braccio nasce dalla spalla
        a = math.radians(s["arm_out_deg"])
        self.arm_dir = {}
        for side, sg in (("L", 1), ("R", -1)):
            d1 = Vector((sg * math.sin(a), 0.0, -math.cos(a)))
            sh = Vector((sg * self.sh_x, 0, self.z_sh))
            el = sh + d1 * s["arm_upper"] + Vector((0, 0.025, 0))
            d2 = Vector((sg * math.sin(a) * 0.9, -0.12, -math.cos(a))).normalized()
            wr = el + d2 * s["arm_fore"]
            self.arm_dir[side] = (sh, el, wr, d2)

    def head_surface(self, d):
        """Punto della superficie della testa (relativo al centro) nella direzione unitaria d. Usato da testa e capelli."""
        R, egg = self.spec["head_r"], self.spec["head_egg"]
        k = 1.0 + 0.05 * max(0.0, -d.z) - 0.02 * max(0.0, d.z)
        return Vector((d.x * k * R, d.y * k * R * 0.97, d.z * egg * R))

    def torso_half(self, z):
        """Mezza larghezza del busto alla quota z (mondo)."""
        s = self.spec
        h = s["torso_h"]
        zr = z - self.z_tb
        if zr <= 0 or zr >= h:
            return 0.0
        hw = s["torso_bot"] + (s["torso_top"] - s["torso_bot"]) * (zr / h)
        cb, ct = 0.11, 0.21
        k = 1.0
        if zr < cb:
            k = (1 - ((cb - zr) / cb) ** 2.4) ** (1 / 2.4)
        elif zr > h - ct:
            k = (1 - ((zr - (h - ct)) / ct) ** 2.2) ** (1 / 2.2)
        return hw * k

    # ---------------- armatura
    def _build_rig(self):
        s = self.spec
        arm = bpy.data.armatures.new(self.name + "_rig")
        arm.display_type = "STICK"
        ob = bpy.data.objects.new(self.name + "_rig", arm)
        _link(ob, self.coll)
        self.rig = ob
        bpy.context.view_layer.objects.active = ob
        for o in bpy.context.view_layer.objects:
            o.select_set(False)
        ob.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        eb = arm.edit_bones

        def bone(name, head, tail, parent=None, connect=False, deform=True, roll_to=None):
            b = eb.new(name)
            b.head, b.tail = Vector(head), Vector(tail)
            if roll_to is not None:
                b.align_roll(Vector(roll_to))
            if parent:
                b.parent = eb[parent]
                b.use_connect = connect
            b.use_deform = deform
            return b

        bone("root", (0, 0, 0), (0, 0.3, 0), deform=False)
        bone("pelvis", (0, 0, self.z_hip), (0, 0, self.z_hip + 0.12), "root", roll_to=(0, -1, 0))
        bone("spine", (0, 0, self.z_hip + 0.12), (0, 0, self.z_tb + 0.5 * s["torso_h"]), "pelvis", True, roll_to=(0, -1, 0))
        bone("chest", (0, 0, self.z_tb + 0.5 * s["torso_h"]), (0, 0, self.z_top), "spine", True, roll_to=(0, -1, 0))
        bone("head", (0, 0, self.z_top - 0.03), (0, 0, self.z_top + 0.5), "chest", roll_to=(0, -1, 0))
        self.hand_frames = {}
        for side, sg in (("L", 1), ("R", -1)):
            sh, el, wr, d2 = self.arm_dir[side]
            bone(f"shoulder.{side}", (sg * 0.05, 0, self.z_sh), sh, "chest", roll_to=(0, -1, 0))
            bone(f"upperarm.{side}", sh, el, f"shoulder.{side}", True, roll_to=(0, 1, 0))
            bone(f"forearm.{side}", el, wr, f"upperarm.{side}", True, roll_to=(0, 1, 0))
            palm_n = Vector((-sg, 0, 0))  # palmo verso il corpo
            hl = 0.055 * s["hand_scale"]
            hb = bone(f"hand.{side}", wr, wr + d2 * hl, f"forearm.{side}", True, roll_to=palm_n)
            M = hb.matrix.copy()  # spazio della mano: Y lungo le dita, Z = normale del palmo
            self.hand_frames[side] = M
            th_sign = -1 if side == "L" else 1  # lato del pollice nello spazio locale della mano
            hs = s["hand_scale"]
            fingers = {
                "index": (Vector((th_sign * 0.021, 0.066, 0.0)), Vector((th_sign * 0.12, 1, 0)), (0.031, 0.025)),
                "middle": (Vector((0.0, 0.07, 0.0)), Vector((0, 1, 0)), (0.033, 0.026)),
                "ring": (Vector((-th_sign * 0.021, 0.066, 0.0)), Vector((-th_sign * 0.12, 1, 0)), (0.029, 0.023)),
                "thumb": (Vector((th_sign * 0.036, 0.024, 0.0)), Vector((th_sign * 0.7, 0.71, 0.04)), (0.027, 0.021)),
            }
            for fname, (base, dloc, (l1, l2)) in fingers.items():
                dloc = dloc.normalized()
                p0 = M @ (base * hs)
                dw = (M.to_3x3() @ dloc).normalized()
                p1 = p0 + dw * l1 * hs
                p2 = p1 + dw * l2 * hs
                pn = (M.to_3x3() @ Vector((0, 0, 1))).normalized()
                bone(f"{fname}_1.{side}", p0, p1, f"hand.{side}", roll_to=pn)
                bone(f"{fname}_2.{side}", p1, p2, f"{fname}_1.{side}", True, roll_to=pn)
            # gambe
            hip = Vector((sg * self.hip_x, 0, self.z_hip))
            ankle = Vector((sg * self.hip_x, 0.0, self.z_ankle))
            knee = (hip + ankle) / 2 + Vector((0, -0.03, 0))
            toe = Vector((sg * self.hip_x, -0.1, 0.03))
            bone(f"thigh.{side}", hip, knee, "pelvis", roll_to=(0, -1, 0))
            bone(f"shin.{side}", knee, ankle, f"thigh.{side}", True, roll_to=(0, -1, 0))
            bone(f"foot.{side}", ankle, toe, f"shin.{side}", True, roll_to=(0, 0, 1))
            # controlli
            hb2 = bone(f"ik_hand.{side}", wr, wr + d2 * hl, "root", deform=False, roll_to=palm_n)
            bone(f"pole_elbow.{side}", el + Vector((sg * 0.12, 0.38, 0)), el + Vector((sg * 0.12, 0.38, 0.06)), "root", deform=False)
            bone(f"ik_foot.{side}", ankle, toe, "root", deform=False, roll_to=(0, 0, 1))
            bone(f"pole_knee.{side}", knee + Vector((0, -0.45, 0)), knee + Vector((0, -0.45, 0.06)), f"ik_foot.{side}", deform=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        self.rest = {b.name: (b.head_local.copy(), b.tail_local.copy(), b.matrix_local.copy()) for b in arm.bones}
        # vincoli IK
        pbs = ob.pose.bones
        for side in ("L", "R"):
            for chain, tgt, pole, base in ((f"forearm.{side}", f"ik_hand.{side}", f"pole_elbow.{side}", f"upperarm.{side}"),
                                           (f"shin.{side}", f"ik_foot.{side}", f"pole_knee.{side}", f"thigh.{side}")):
                c = pbs[chain].constraints.new("IK")
                c.target = ob
                c.subtarget = tgt
                c.pole_target = ob
                c.pole_subtarget = pole
                c.chain_count = 2
                c.pole_angle = self._pole_angle(base, chain, pole)
            for owner, tgt in ((f"hand.{side}", f"ik_hand.{side}"), (f"foot.{side}", f"ik_foot.{side}")):
                c = pbs[owner].constraints.new("COPY_ROTATION")
                c.target = ob
                c.subtarget = tgt
        for pb in pbs:
            pb.rotation_mode = "XYZ" if not pb.name.startswith(("ik_", "root")) else "QUATERNION"

    def _pole_angle(self, base, ik, pole):
        bones = self.rig.data.bones
        b, k = bones[base], bones[ik]
        p = bones[pole].head_local
        pole_normal = (k.tail_local - b.head_local).cross(p - b.head_local)
        proj = pole_normal.cross(b.tail_local - b.head_local)
        xa = b.matrix_local.to_3x3() @ Vector((1, 0, 0))
        ang = xa.angle(proj)
        if xa.cross(proj).angle(b.tail_local - b.head_local) < 1:
            ang = -ang
        return ang

    # ---------------- geometria
    def _build_meshes(self):
        s = self.spec
        wd = self.workdir
        limb = clay(self.name + "_limb", lin(s["limb_col"]), 0.45, 0.1)
        hand = clay(self.name + "_hand", lin(s["hand_col"]), 0.6, 0.25)
        shoe = clay(self.name + "_shoe", lin(s["shoe_col"]), 0.4, 0.1, coat=0.2)
        # --- busto (rivoluzione di un profilo a "proiettile", sezione ellittica)
        bm = bmesh.new()
        h = s["torso_h"]
        nz, nseg = 56, 72
        zs = [h * (0.5 - 0.5 * math.cos(math.pi * i / nz)) for i in range(nz + 1)]
        rings = []
        for i, zr in enumerate(zs[1:-1]):
            r = self.torso_half(self.z_tb + zr)
            ring = []
            for j in range(nseg):
                a = 2 * math.pi * j / nseg
                ring.append(bm.verts.new((r * math.sin(a), -r * s["torso_depth"] * math.cos(a), self.z_tb + zr)))
            rings.append(ring)
        bot = bm.verts.new((0, 0, self.z_tb))
        top = bm.verts.new((0, 0, self.z_top))
        for k in range(len(rings) - 1):
            for j in range(nseg):
                bm.faces.new((rings[k][j], rings[k][(j + 1) % nseg], rings[k + 1][(j + 1) % nseg], rings[k + 1][j]))
        for j in range(nseg):
            bm.faces.new((rings[0][(j + 1) % nseg], rings[0][j], bot))
            bm.faces.new((rings[-1][j], rings[-1][(j + 1) % nseg], top))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        uvl = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            us = []
            for l in f.loops:
                x, y, z = l.vert.co
                us.append(math.atan2(x, -y / s["torso_depth"]) / (2 * math.pi) + 0.5)  # 0.5 = davanti
            if max(us) - min(us) > 0.5:  # faccia sulla cucitura dietro
                us = [u + 1.0 if u < 0.5 else u for u in us]
            for l, u in zip(f.loops, us):
                l[uvl].uv = (u, (l.vert.co.z - self.z_tb) / h)
        tex = paint_outfit(s, os.path.join(wd, f"{self.name}_outfit.png"))
        torso = mesh_object(self.name + "_torso", bm, [textured_material(self.name + "_cloth", tex)], self.coll)
        self.parts["torso"] = torso
        # --- testa (uovo morbido, più piena in basso) con UV frontale per il volto
        R = s["head_r"]
        bm = bmesh.new()
        res = bmesh.ops.create_uvsphere(bm, u_segments=72, v_segments=48, radius=R)
        for v in res["verts"]:
            v.co = self.head_surface(v.co.normalized()) + self.head_c
        uvl = bm.loops.layers.uv.new("UVMap")
        fr = bm.verts.layers.float.new("front")
        span = R * 1.0
        for v in bm.verts:
            v[fr] = smoothstep(0.0, 0.35, -(v.co.y - self.head_c.y) / R)
        for f in bm.faces:
            for l in f.loops:
                p = l.vert.co - self.head_c
                l[uvl].uv = (0.5 + p.x / (2 * span), 0.5 + p.z / (2 * span))
        face_png = os.path.join(wd, f"{self.name}_face.png")
        from cs_face import draw_face, expr
        draw_face(expr("neutro", lashes=s["lashes"]), size=1024).save(face_png)
        headm = face_material(self.name + "_headmat", lin(s["head_col"]), face_png)
        head = mesh_object(self.name + "_head", bm, [headm], self.coll)
        # attributo "front" come float sul punto
        self.parts["head"] = head
        self.face_node = headm.node_tree.nodes["face"]
        # --- capelli
        self._build_hair()
        # --- braccia, mani, gambe, piedi
        for side, sg in (("L", 1), ("R", -1)):
            sh, el, wr, d2 = self.arm_dir[side]
            bm, vinfo = tube_bm([sh, el, wr + d2 * 0.012], s["arm_r"], seg=14)
            js = len(bm.verts)
            ellipsoid_bm(el, (s["arm_r"] * 1.03,) * 3, seg=16, rings=10, bm=bm)  # giunto: il gomito resta tondo anche piegato
            ob = mesh_object(f"{self.name}_arm.{side}", bm, [limb], self.coll)
            ob["joint_start"] = js
            self.parts[f"arm.{side}"] = ob
            hip = Vector((sg * self.hip_x, 0, self.z_hip + 0.03))
            ankle = Vector((sg * self.hip_x, 0.0, self.z_ankle + 0.01))
            knee = Vector((sg * self.hip_x, -0.03, (self.z_hip + self.z_ankle) / 2))
            bm, vinfo = tube_bm([hip, knee, ankle], s["leg_r"], seg=14)
            js = len(bm.verts)
            ellipsoid_bm(knee, (s["leg_r"] * 1.03,) * 3, seg=16, rings=10, bm=bm)
            self.parts[f"leg.{side}"] = mesh_object(f"{self.name}_leg.{side}", bm, [limb], self.coll)
            self.parts[f"leg.{side}"]["joint_start"] = js
            # scarpa: ovale con suola piatta (2 mm sopra il pavimento: nessuna compenetrazione, nessuno z-fighting)
            bm, vs = ellipsoid_bm((sg * self.hip_x, -0.04, 0.042), (0.048, 0.088, 0.042), seg=28, rings=16)
            for v in vs:
                v.co.z = max(v.co.z, 0.002)
            self.parts[f"foot.{side}"] = mesh_object(f"{self.name}_foot.{side}", bm, [shoe], self.coll)
            self.parts[f"hand.{side}"] = self._build_hand(side, hand)

    def _build_hand(self, side, mat):
        s = self.spec
        hs = s["hand_scale"]
        M = self.hand_frames[side]
        bm = bmesh.new()
        groups = []
        # palmo: ellissoide schiacciato nello spazio della mano
        _, vs = ellipsoid_bm((0, 0.037 * hs, 0.0), (0.04 * hs, 0.042 * hs, 0.018 * hs), seg=24, rings=14, bm=bm)
        for v in vs:
            v.co = M @ v.co
        groups.append((f"hand.{side}", vs))
        bones = self.rig.data.bones
        for fname in ("index", "middle", "ring", "thumb"):
            b1, b2 = bones[f"{fname}_1.{side}"], bones[f"{fname}_2.{side}"]
            r0 = (0.0105 if fname != "thumb" else 0.0115) * hs
            for b, r in ((b1, r0), (b2, r0 * 0.93)):
                before = set(bm.verts)
                tube_bm([b.head_local, b.tail_local], r, seg=12, per_unit=400, bm=bm)
                new = [v for v in bm.verts if v not in before]
                groups.append((b.name, new))
        bm.verts.index_update()
        gidx = [(g, [v.index for v in vs]) for g, vs in groups]
        ob = mesh_object(f"{self.name}_hand.{side}", bm, [mat], self.coll)
        for gname, idx in gidx:
            vg = ob.vertex_groups.get(gname) or ob.vertex_groups.new(name=gname)
            vg.add(idx, 1.0, "REPLACE")
        ob["rigid_groups"] = True
        return ob

    def _build_hair(self):
        """Calotta di capelli con attaccatura parametrica liscia (niente scalini), spessore vero (Solidify con bordo)."""
        s = self.spec
        R = s["head_r"]
        style = s["hair"]
        if style == "none":
            return
        hair = clay(self.name + "_hairmat", lin(s["hair_col"]), 0.6, 0.35, coat=0.05)

        def hairline(az):
            c = math.cos(az)  # 1 davanti, -1 dietro
            if style == "quiff":
                return 0.56 * max(0.0, c) ** 1.4 - 0.72 * max(0.0, -c) ** 0.7 - 0.12 * (1 - abs(c))
            if style == "bob":
                front = 0.5 * smoothstep(math.radians(60), math.radians(30), abs(az))
                return front * max(0.0, c) - (0.5 + 0.3 * max(0.0, -c)) * (1 - max(0.0, c))
            return 0.3

        def radius_k(az, zn):
            if style == "bob":
                side = 1 - max(0.0, math.cos(az)) ** 2
                return 1.0 + 0.09 * side * smoothstep(0.35, -0.3, zn) * (1 - 0.6 * smoothstep(-0.3, -0.5, zn))
            if style == "quiff":
                # ciuffo spazzolato all'insù, leggermente di lato: un rilievo morbido sopra la fronte
                da = (az - 0.35) / 0.75
                return 1.0 + 0.2 * math.exp(-da * da) * smoothstep(0.5, 0.82, zn) * (1 - smoothstep(0.9, 1.0, zn) * 0.6)
            return 1.0

        rr = R * 1.04
        N, M = 96, 26
        bm = bmesh.new()
        rows = []
        for j in range(M):
            ring = []
            for i in range(N):
                az = 2 * math.pi * i / N - math.pi
                z0 = hairline(az)
                zn = z0 + (0.985 - z0) * (j / (M - 1)) ** 0.85
                rxy = math.sqrt(max(0.0, 1 - zn * zn))
                # spessore sopra la testa: 0,8% al bordo (≈2 mm, niente z-fighting) → 4% in alto; segue la forma vera della testa
                k = radius_k(az, zn) * (1.008 + 0.032 * smoothstep(0.0, 0.22, j / (M - 1)))
                dirv = Vector((math.sin(az) * rxy, -math.cos(az) * rxy, zn))
                ring.append(bm.verts.new(self.head_surface(dirv) * k + self.head_c))
            rows.append(ring)
        pole = bm.verts.new(self.head_c + self.head_surface(Vector((0, 0, 1))) * 1.04)
        for j in range(M - 1):
            for i in range(N):
                bm.faces.new((rows[j][i], rows[j][(i + 1) % N], rows[j + 1][(i + 1) % N], rows[j + 1][i]))
        for i in range(N):
            bm.faces.new((rows[-1][i], rows[-1][(i + 1) % N], pole))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        ob = mesh_object(self.name + "_hair", bm, [hair], self.coll)
        sol = ob.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = R * 0.075
        sol.offset = -1.0
        sol.use_even_offset = True
        sol.use_rim = True
        self.parts["hair"] = ob
        if style == "quiff":
            # ciocche morbide lungo la frangia (spazzolate verso destra) + un ciuffo ribelle sulla nuca: segno del protagonista
            bm = bmesh.new()
            for k, az in enumerate([-0.75, -0.42, -0.1, 0.22, 0.52]):
                zn = hairline(az) + 0.06
                rxy = math.sqrt(1 - zn * zn)
                n = Vector((math.sin(az) * rxy, -math.cos(az) * rxy * 0.97, zn * s["head_egg"])).normalized()
                p = self.head_c + n * rr * 1.03
                tang = Vector((math.cos(az), math.sin(az), 0.0))  # verso destra lungo la fronte
                up = n.cross(tang).normalized()
                d = (tang * 0.8 + up * 0.35).normalized()
                rot = Matrix((d, n.cross(d).normalized(), n)).transposed()
                ellipsoid_bm(p + n * 0.004, (R * 0.27, R * 0.13, R * 0.085), seg=24, rings=12, bm=bm, rot=rot)
            crown = self.head_c + Vector((0.02, 0.12, rr * s["head_egg"] * 0.98))
            ax = Vector((0.15, 0.35, 1.0)).normalized()
            rot = ax.to_track_quat("Z", "Y").to_matrix()
            ellipsoid_bm(crown + ax * R * 0.07, (R * 0.07, R * 0.05, R * 0.14), seg=16, rings=10, bm=bm, rot=rot)
            self.parts["tuft"] = mesh_object(self.name + "_tufts", bm, [hair], self.coll)

    # ---------------- skinning
    def _skin(self):
        s = self.spec
        for nm, ob in self.parts.items():
            ob.parent = self.rig
            mod = ob.modifiers.new("rig", "ARMATURE")
            mod.object = self.rig
            mod.use_deform_preserve_volume = nm.startswith(("arm", "leg"))
            # l'armatura deve venire prima del guscio dei capelli/contorno
            ob.modifiers.move(ob.modifiers.find("rig"), 0)
            me = ob.data
            if nm == "torso":
                vp, vs, vc = (ob.vertex_groups.new(name=n) for n in ("pelvis", "spine", "chest"))
                for v in me.vertices:
                    t = (v.co.z - self.z_tb) / s["torso_h"]
                    wp = 1 - smoothstep(0.08, 0.4, t)
                    wc = smoothstep(0.45, 0.82, t)
                    ws = max(0.0, 1 - wp - wc)
                    for g, w in ((vp, wp), (vs, ws), (vc, wc)):
                        if w > 0.001:
                            g.add([v.index], w, "REPLACE")
            elif nm in ("head", "hair", "tuft"):
                g = ob.vertex_groups.new(name="head")
                g.add([v.index for v in me.vertices], 1.0, "REPLACE")
            elif nm.startswith(("arm", "leg")):
                side = nm[-1]
                a, b = (f"upperarm.{side}", f"forearm.{side}") if nm.startswith("arm") else (f"thigh.{side}", f"shin.{side}")
                ba, bb = self.rig.data.bones[a], self.rig.data.bones[b]
                ga, gb = ob.vertex_groups.new(name=a), ob.vertex_groups.new(name=b)
                joint = ba.tail_local
                axis = (ba.tail_local - ba.head_local).normalized()
                axis2 = (bb.tail_local - bb.head_local).normalized()
                blend = 0.01  # quasi rigido: il gomito si piega ad angolo netto come nel riferimento, senza pieghe interne
                js = ob.get("joint_start", 10 ** 9)
                for v in me.vertices:
                    # distanza firmata dal giunto lungo la bisettrice; la sfera del giunto segue l'osso inferiore (resta centrata)
                    bis = (axis + axis2).normalized()
                    dd = (v.co - joint).dot(bis)
                    wb = 1.0 if v.index >= js else smoothstep(-blend, blend, dd)
                    if wb < 0.999:
                        ga.add([v.index], 1 - wb, "REPLACE")
                    if wb > 0.001:
                        gb.add([v.index], wb, "REPLACE")
            elif nm.startswith("foot"):
                g = ob.vertex_groups.new(name=f"foot.{nm[-1]}")
                g.add([v.index for v in me.vertices], 1.0, "REPLACE")
            # mani: gruppi rigidi già creati
            if nm == "hair":
                pass
        for nm, ob in self.parts.items():
            w = self.spec["outline"] * (0.6 if nm.startswith(("hand", "arm", "leg")) else 1.0)
            sol = add_outline(ob, w)
            if nm.startswith(("hand", "arm", "leg")):
                sol.use_even_offset = False  # nelle pieghe strette l'offset "uniforme" crea pinne nere: qui si usa quello semplice
            sol.show_viewport = False  # il contorno esiste solo nel render: i controlli geometrici usano la mesh vera

    # ---------------- posa
    def rest_pose(self):
        for pb in self.rig.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.scale = (1, 1, 1)

    def update(self):
        bpy.context.view_layer.update()

    def set_bone_matrix(self, name, M):
        """Imposta la posa di un osso con una matrice nello spazio dell'armatura (corpo)."""
        self.rig.pose.bones[name].matrix = M

    def hand_matrix(self, side, pos, finger_dir, palm_normal):
        y = Vector(finger_dir).normalized()
        z = Vector(palm_normal)
        z = (z - y * z.dot(y)).normalized()
        x = y.cross(z)
        M = Matrix((x, y, z)).transposed().to_4x4()
        M.translation = Vector(pos)
        return M

    def foot_matrix(self, side, ankle_pos, yaw_deg=0.0, pitch_deg=0.0):
        rest = self.rest[f"ik_foot.{side}"][2]
        R = Matrix.Rotation(math.radians(yaw_deg), 4, "Z") @ Matrix.Rotation(math.radians(pitch_deg), 4, "X")
        M = R @ Matrix.Translation(-rest.translation) @ rest
        M.translation = Vector(ankle_pos)
        return M

    def pose(self, P):
        """Posa completa da un dizionario (spazio del corpo). Vedi cs_pose.default_pose()."""
        pbs = self.rig.pose.bones
        dx, dy, dz = P.get("pelvis_loc", (0, 0, 0))  # spazio del corpo
        pbs["pelvis"].location = (dx, dz, -dy)       # assi locali dell'osso: X = lato, Y = su, Z = avanti
        # rotazioni dei bones del tronco (gradi): (piega in avanti, torsione, piega laterale)
        for nm in ("pelvis", "spine", "chest", "head"):
            r = P.get(nm + "_rot", (0, 0, 0))
            pbs[nm].rotation_euler = tuple(math.radians(v) for v in r)
        for side in ("L", "R"):
            shrug = P.get(f"shrug.{side}", 0.0)  # gradi: >0 spalla su
            pbs[f"shoulder.{side}"].rotation_euler = (0, 0, math.radians(-shrug if side == "L" else shrug))
            fc = P.get(f"fingers.{side}", (10, 10, 10, 5))  # (indice, medio, anulare, pollice) in gradi, oppure {dito: (falange1, falange2)}
            spread = P.get(f"spread.{side}", 0.0)
            for i, fname in enumerate(("index", "middle", "ring", "thumb")):
                a1, a2 = fc[fname] if isinstance(fc, dict) else (fc[i] * 0.9, fc[i] * 1.1)
                sp = (-1, 0, 1, 0)[i] * spread * (1 if side == "L" else -1)
                pbs[f"{fname}_1.{side}"].rotation_euler = (math.radians(a1), 0, math.radians(sp))
                pbs[f"{fname}_2.{side}"].rotation_euler = (math.radians(a2), 0, 0)
        self.update()
        for side in ("L", "R"):
            h = P.get(f"hand.{side}")
            if h:
                self.set_bone_matrix(f"ik_hand.{side}", self.hand_matrix(side, *h))
            e = P.get(f"elbow.{side}")
            if e:
                M = Matrix.Translation(Vector(e)) @ self.rest[f"pole_elbow.{side}"][2].to_3x3().to_4x4()
                self.set_bone_matrix(f"pole_elbow.{side}", M)
            f = P.get(f"foot.{side}")
            if f:
                self.set_bone_matrix(f"ik_foot.{side}", self.foot_matrix(side, *f))
        self.update()

    def set_face(self, img_path):
        img = bpy.data.images.load(img_path, check_existing=False)
        old = self.face_node.image
        self.face_node.image = img
        if old and old.users == 0:
            bpy.data.images.remove(old)

    def key_all(self, frame):
        for pb in self.rig.pose.bones:
            pb.keyframe_insert("location", frame=frame)
            if pb.rotation_mode == "QUATERNION":
                pb.keyframe_insert("rotation_quaternion", frame=frame)
            else:
                pb.keyframe_insert("rotation_euler", frame=frame)
        self.rig.keyframe_insert("location", frame=frame)
        self.rig.keyframe_insert("rotation_euler", frame=frame)

    # ---------------- informazioni utili alle pose
    def shoulder_pos(self, side):
        return self.rest[f"upperarm.{side}"][0]

    def bone_world(self, name, tail=False):
        pb = self.rig.pose.bones[name]
        p = pb.tail if tail else pb.head
        return self.rig.matrix_world @ p
