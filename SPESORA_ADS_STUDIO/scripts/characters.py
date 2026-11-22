"""
Costruzione del protagonista in Blender (bpy), stile pongo digitale 2.5D.

Tre varianti di design (A "Goccia", B "Testone", C "Pillola"), stessi materiali e stessa palette.
Corpo = forme morbide (ellissoidi irregolari), arti = tubi con estremità a paletta (NIENTE mani né dita),
faccia = decal 2D proiettato sulla testa (shrinkwrap), quindi segue la curvatura anche quando la testa ruota.

Uso (da Blender / bpy):
    from characters import build, set_face, pose_phone, ...
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, Euler, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import faces as F  # noqa: E402

TMP = os.environ.get("ADS_TMP", "/tmp/ads_tmp")
os.makedirs(TMP, exist_ok=True)

# palette (riferimento: scheda del protagonista approvata come direzione)
C_SKIN = (0.91, 0.69, 0.56)
C_SHIRT = (0.46, 0.56, 0.44)
C_PANTS = (0.24, 0.20, 0.18)
C_SHOE = (0.93, 0.90, 0.82)
C_BG = (0.94, 0.91, 0.84)


def srgb(c):
    """sRGB 0..1 -> lineare (Blender lavora in lineare)."""
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)


# ----------------------------------------------------------------------------- materiali
def clay_material(name, color, rough=0.82, sss=0.0, bump=0.12):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*srgb(color), 1)
    bsdf.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.15
    if sss > 0 and "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = sss
        bsdf.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.2)
        bsdf.inputs["Subsurface Scale"].default_value = 0.06
    # microrilievo da impronte digitali / pongo
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 260
    noise.inputs["Detail"].default_value = 6
    noise.inputs["Roughness"].default_value = 0.6
    bump_n = nt.nodes.new("ShaderNodeBump")
    bump_n.inputs["Strength"].default_value = bump
    bump_n.inputs["Distance"].default_value = 0.004
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bump_n.inputs["Height"])
    nt.links.new(bump_n.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def decal_material(name, image_path, emission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path, check_existing=False)
    tex.image.alpha_mode = "STRAIGHT"
    tex.extension = "CLIP"
    bsdf.inputs["Roughness"].default_value = 0.7
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def set_decal_image(obj, image_path):
    mat = obj.data.materials[0]
    for n in mat.node_tree.nodes:
        if n.type == "TEX_IMAGE":
            n.image = bpy.data.images.load(image_path, check_existing=False)
            n.image.alpha_mode = "STRAIGHT"


# ----------------------------------------------------------------------------- geometria
def _link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj


def ellipsoid(name, center, scale, mat, deform=None, parent=None, rot=None, seg=64, rings=40):
    """Ellissoide morbido. deform(x,y,z)->(x,y,z) lavora su coordinate di sfera unitaria."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    if deform:
        for v in bm.verts:
            v.co = Vector(deform(*v.co))
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = center
    if rot is not None:
        ob.rotation_euler = rot
    return _link(ob, parent)


def tube(name, pts, radius, mat, parent=None, res=12, taper_end=None, taper_pow=2.0):
    """Tubo morbido lungo una polilinea (curva con bevel). taper_end: raggio finale relativo (0..1)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (p[0], p[1], p[2], 1)
        n = len(pts) - 1
        sp.points[i].radius = 1.0 if taper_end is None else 1.0 + (taper_end - 1.0) * (i / n) ** taper_pow
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu)
    return _link(ob, parent)


def bez_pts(p0, p1, p2, n=28):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(((1 - t) ** 2) * Vector(p0) + 2 * (1 - t) * t * Vector(p1) + t * t * Vector(p2))
    return out


def _smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


# ----------------------------------------------------------------------------- varianti
VARIANTS = {
    # A: testa a goccia allungata (direzione della scheda di riferimento), busto piccolo, arti lunghi
    "A": dict(
        name="A · Goccia",
        head_c=(0, 0, 1.92), head_s=(0.40, 0.36, 0.50), neck_z=1.50,
        torso_c=(0, 0, 1.16), torso_s=(0.30, 0.24, 0.40),
        sh_x=0.28, sh_z=1.34, arm_r=0.075, arm_len=(0.46, 0.50, 0.62), paddle=(0.105, 0.055, 0.15),
        hip_x=0.115, hip_z=0.82, leg_r=0.10, shoe=(0.125, 0.21, 0.085), foot_x=0.14,
        decal_w=0.78, decal_y=-0.5, decal_z=1.95, tuft=True,
    ),
    # B: testone tondo irregolare, corpo piccolo da stickman spesso (la direzione del testo originale)
    "B": dict(
        name="B · Testone",
        head_c=(0, 0, 1.52), head_s=(0.62, 0.56, 0.58), neck_z=1.00,
        torso_c=(0, 0, 0.84), torso_s=(0.27, 0.22, 0.36),
        sh_x=0.25, sh_z=1.02, arm_r=0.058, arm_len=(0.40, 0.46, 0.52), paddle=(0.085, 0.045, 0.125),
        hip_x=0.11, hip_z=0.52, leg_r=0.085, shoe=(0.13, 0.22, 0.085), foot_x=0.13,
        decal_w=1.05, decal_y=-0.6, decal_z=1.52, tuft=False,
    ),
    # C: testa a pillola, corpo a pera, braccia grosse con grande paletta
    "C": dict(
        name="C · Pillola",
        head_c=(0, 0, 1.68), head_s=(0.40, 0.38, 0.52), neck_z=1.26,
        torso_c=(0, 0, 0.96), torso_s=(0.36, 0.30, 0.38),
        sh_x=0.33, sh_z=1.12, arm_r=0.105, arm_len=(0.40, 0.44, 0.56), paddle=(0.14, 0.075, 0.185),
        hip_x=0.15, hip_z=0.70, leg_r=0.135, shoe=(0.16, 0.24, 0.095), foot_x=0.16,
        decal_w=0.80, decal_y=-0.5, decal_z=1.68, tuft=False,
    ),
}


def head_deform(variant):
    if variant == "A":  # goccia: la parte alta si restringe a punta morbida, leggera asimmetria
        def f(x, y, z):
            k = 1.0 - 0.30 * _smooth((z - 0.15) / 0.85)
            zz = z * (1.0 + 0.10 * _smooth(z))
            return (x * k * (1 + 0.03 * math.sin(3 * z)), y * k, zz)
        return f
    if variant == "B":  # tondo, leggermente irregolare (grumo di pongo)
        def f(x, y, z):
            r = 1.0 + 0.045 * math.sin(4 * x + 1.3) * math.cos(3 * z) + 0.04 * math.sin(3 * y - z)
            return (x * r, y * r, z * r)
        return f
    # C: pillola (capsula verticale)
    def f(x, y, z):
        zz = z * 1.0 + (0.22 if z > 0 else -0.22)
        s = math.sqrt(max(0.0, 1.0 - z * z))
        return (x, y, zz)
    return f


def torso_deform(variant):
    def f(x, y, z):
        w = 1.0 + (0.10 if variant != "C" else 0.22) * _smooth(-z) - 0.06 * _smooth(z)
        return (x * w, y * w, z)
    return f


def build(variant="A", name=None):
    """Crea il personaggio nella scena. Ritorna un dict con gli oggetti utili ai pose-script."""
    V = VARIANTS[variant]
    nm = name or f"hero{variant}"
    skin = clay_material(f"{nm}_skin", C_SKIN, 0.78, sss=0.06, bump=0.04)
    shirt = clay_material(f"{nm}_shirt", C_SHIRT, 0.9, bump=0.2)
    pants = clay_material(f"{nm}_pants", C_PANTS, 0.9, bump=0.2)
    shoe_m = clay_material(f"{nm}_shoe", C_SHOE, 0.75)

    root = bpy.data.objects.new(f"{nm}_root", None)
    _link(root)
    ch = {"root": root, "variant": variant, "V": V, "mats": dict(skin=skin, shirt=shirt, pants=pants)}

    # busto
    ch["torso"] = ellipsoid(f"{nm}_torso", V["torso_c"], V["torso_s"], shirt, torso_deform(variant), root)
    # collo
    nz = V["neck_z"]
    ch["neck"] = ellipsoid(f"{nm}_neck", (0, 0, nz), (0.095, 0.095, 0.10), skin, None, root)

    # testa su pivot (si inclina attorno al collo)
    pivot = bpy.data.objects.new(f"{nm}_headpivot", None)
    pivot.location = (0, 0, nz)
    _link(pivot, root)
    hc = V["head_c"]
    head = ellipsoid(f"{nm}_head", (hc[0], hc[1], hc[2] - nz), V["head_s"], skin, head_deform(variant), pivot)
    ch["pivot"], ch["head"] = pivot, head
    if V["tuft"]:  # ciuffo di pongo in cima (stile scheda di riferimento)
        top = hc[2] - nz + V["head_s"][2] * 1.18
        ellipsoid(f"{nm}_tuft", (0.03, 0.0, top - 0.02), (0.055, 0.05, 0.075), skin, None, pivot, rot=(0, math.radians(18), 0), seg=32, rings=20)

    # faccia 2D (decal) proiettata sulla testa
    face_path = os.path.join(TMP, f"{nm}_face.png")
    F.face_image("neutro", 1024).save(face_path)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=70, y_segments=70, size=V["decal_w"] / 2)
    me = bpy.data.meshes.new(f"{nm}_facemesh")
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new(name="UV")
    # mappa UV planare: x,y in [-s,s] -> [0,1]
    s = V["decal_w"] / 2
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((v.x + s) / (2 * s), (v.y + s) / (2 * s))
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(decal_material(f"{nm}_facemat", face_path))
    face = bpy.data.objects.new(f"{nm}_face", me)
    # il grid giace sul piano XY: lo ruoto in piedi (normale verso -Y) davanti alla testa
    face.rotation_euler = (math.radians(90), 0, 0)
    face.location = (hc[0], V["decal_y"], hc[2] - nz + 0.0)
    _link(face, pivot)
    sw = face.modifiers.new("wrap", "SHRINKWRAP")
    sw.target = head
    sw.wrap_method = "PROJECT"
    sw.use_project_x = False
    sw.use_project_y = False
    sw.use_project_z = True  # asse locale Z del decal (dopo la rotazione di 90° punta lungo Y del mondo)
    sw.use_negative_direction = True
    sw.use_positive_direction = False
    sw.cull_face = "OFF"
    sw.offset = 0.006
    ch["face"] = face
    ch["face_path"] = face_path

    # logo foglia sul petto
    leaf_path = os.path.join(TMP, f"{nm}_leaf.png")
    F.leaf_image(512).save(leaf_path)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=24, y_segments=24, size=0.09)
    me = bpy.data.meshes.new(f"{nm}_leafmesh")
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new(name="UV")
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((v.x + 0.09) / 0.18, (v.y + 0.09) / 0.18)
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(decal_material(f"{nm}_leafmat", leaf_path))
    leaf = bpy.data.objects.new(f"{nm}_leaf", me)
    leaf.rotation_euler = (math.radians(90), 0, 0)
    leaf.location = (-V["torso_s"][0] * 0.38, -0.6, V["torso_c"][2] + V["torso_s"][2] * 0.35)
    _link(leaf, root)
    sw2 = leaf.modifiers.new("wrap", "SHRINKWRAP")
    sw2.target = ch["torso"]
    sw2.wrap_method = "PROJECT"
    sw2.use_project_z = True
    sw2.use_negative_direction = True
    sw2.use_positive_direction = False
    sw2.cull_face = "OFF"
    sw2.offset = 0.004
    ch["leaf"] = leaf

    # gambe (pantaloni) e scarpe: create da pose() ma con riposo di base
    ch["limbs"] = []
    ch["skin_mat"], ch["shirt_mat"], ch["pants_mat"], ch["shoe_mat"] = skin, shirt, pants, shoe_m
    ch["nm"] = nm
    pose(ch)  # posa di riposo
    return ch


def _clear_limbs(ch):
    for o in ch["limbs"]:
        bpy.data.objects.remove(o, do_unlink=True)
    ch["limbs"] = []


def pose(ch, arm_l=None, arm_r=None, leg_l=None, leg_r=None, torso_rot=(0, 0, 0), head_rot=(0, 0, 0), root_loc=(0, 0, 0), root_rot=(0, 0, 0), foot_open=0.0):
    """
    Posa il personaggio. arm_*: (end(x,y,z), elbow_hint(x,y,z)) in coordinate del root.
    leg_*: posizione del piede (x,y,z) (default: in piedi). Ricostruisce arti/scarpe (leggeri).
    """
    V = ch["V"]
    nm = ch["nm"]
    _clear_limbs(ch)
    root = ch["root"]
    root.location = root_loc
    root.rotation_euler = root_rot
    ch["torso"].rotation_euler = torso_rot
    ch["pivot"].rotation_euler = head_rot

    shoulder_l = Vector((-V["sh_x"], 0, V["sh_z"]))
    shoulder_r = Vector((V["sh_x"], 0, V["sh_z"]))
    L1, L2, L3 = V["arm_len"]
    total = L1 + L2 + L3

    def default_arm(sign):
        sh = Vector((sign * V["sh_x"], 0, V["sh_z"]))
        return (Vector((sign * (V["sh_x"] + 0.05), -0.10, V["sh_z"] - total * 0.88)), Vector((sign * (V["sh_x"] + 0.12), 0.05, V["sh_z"] - total * 0.46)))

    def build_arm(side, spec):
        sign = -1 if side == "L" else 1
        sh = shoulder_l if side == "L" else shoulder_r
        end, elb = spec if spec is not None else default_arm(sign)
        end, elb = Vector(end), Vector(elb)
        # leggero ruotare della spalla col busto
        pts = bez_pts(sh, elb, end, 30)
        arm = tube(f"{nm}_arm{side}", pts, V["arm_r"], ch["skin_mat"], root, taper_end=0.92)
        # manica corta (tubo più spesso sul primo tratto)
        sleeve = tube(f"{nm}_sleeve{side}", pts[:7], V["arm_r"] * 1.65, ch["shirt_mat"], root)
        # estremità a paletta: ellissoide appiattito, allineato alla direzione finale
        dirv = (pts[-1] - pts[-3]).normalized()
        quat = dirv.to_track_quat("Z", "Y")
        pe = V["paddle"]
        end_pt = pts[-1] - dirv * pe[2] * 0.15
        pad = ellipsoid(f"{nm}_pad{side}", end_pt, pe, ch["skin_mat"], None, root, rot=quat.to_euler(), seg=32, rings=20)
        cap = ellipsoid(f"{nm}_shoulder{side}", sh, (V["arm_r"] * 1.9,) * 3, ch["shirt_mat"], None, root, seg=32, rings=20)
        return [arm, sleeve, pad, cap]

    ch["limbs"] += build_arm("L", arm_l)
    ch["limbs"] += build_arm("R", arm_r)

    # gambe
    def build_leg(side, foot):
        sign = -1 if side == "L" else 1
        hip = Vector((sign * V["hip_x"], 0, V["hip_z"]))
        ft = Vector(foot) if foot is not None else Vector((sign * V["foot_x"], -0.0, 0.10))
        knee = (hip + ft) / 2 + Vector((0, -0.04, 0))
        pts = bez_pts(hip, knee, ft + Vector((0, 0, 0.04)), 14)
        leg = tube(f"{nm}_leg{side}", pts, V["leg_r"], ch["pants_mat"], root)
        sh = V["shoe"]
        shoe = ellipsoid(f"{nm}_shoe{side}", (ft.x, ft.y - 0.07, ft.z - 0.02), sh, ch["shoe_mat"], None, root, rot=(0, 0, sign * math.radians(8 + foot_open * 20)), seg=32, rings=20)
        return [leg, shoe]

    ch["limbs"] += build_leg("L", leg_l)
    ch["limbs"] += build_leg("R", leg_r)
    # bacino (pantaloni sotto il busto)
    pel = ellipsoid(f"{nm}_pelvis", (0, 0, V["hip_z"] - 0.01), (V["hip_x"] * 2.0, V["torso_s"][1] * 0.8, 0.12), ch["pants_mat"], None, root, seg=32, rings=20)
    ch["limbs"].append(pel)


def set_face(ch, expr):
    path = os.path.join(TMP, f"{ch['nm']}_face_{expr}.png")
    if not os.path.exists(path):
        F.face_image(expr, 1024).save(path)
    set_decal_image(ch["face"], path)


def delete_all():
    bpy.ops.wm.read_factory_settings(use_empty=True)
