"""
Protagonista di Spesora, ricalcato dalla scheda di riferimento del cliente (pongo, altezza "umana", non uno stickman).

Unità: la testa è larga 1.0. Altezza totale ~3.1.
Differenze volute rispetto al riferimento: maglietta NERA (al posto di quella crema). Tutto il resto uguale.

Struttura (per il rig di una fase successiva): root > torso, pivot_testa > testa/faccia/naso, braccia (tubi), gambe.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import faces2 as F2  # noqa: E402
from characters import clay_material, srgb, _link, ellipsoid, tube, bez_pts  # noqa: E402

TMP = os.environ.get("ADS_TMP", "/tmp/ads_tmp")
os.makedirs(TMP, exist_ok=True)

# colori (sRGB) campionati dalla scheda di riferimento
C_SKIN = (0.88, 0.56, 0.43)
C_SHIRT = (0.095, 0.095, 0.105)  # nero (richiesta del cliente)
C_PANTS = (0.40, 0.42, 0.63)
C_NOSE = (0.80, 0.30, 0.25)

# misure ricavate dalla scheda (testa larga = 1.0)
HEAD_R = (0.50, 0.50, 0.545)
HEAD_Z = 2.565
NECK_Z = 2.02
TORSO = dict(w=1.075, d=0.86, h=1.12, z=1.49, bevel=0.30)
LEG = dict(w=0.52, d=0.68, h=0.98, x=0.265, bevel=0.20)
SHOULDER = dict(x=0.47, z=1.72)
ARM_R = (0.20, 0.20, 0.265)  # sottile alla spalla, si allarga verso il basso (come nel riferimento)  # raggio a spalla / metà / mano


def rounded_box(name, center, size, bevel, mat, parent=None, seg=8, subsurf=1, taper_top=1.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        t = v.co.z + 0.5  # 0 in basso, 1 in alto
        k = 1.0 + (taper_top - 1.0) * t
        v.co = Vector((v.co.x * size[0] * k, v.co.y * size[1] * (1.0 + (taper_top - 1.0) * 0.5 * t), v.co.z * size[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = center
    _link(ob, parent)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = bevel
    bv.segments = seg
    bv.limit_method = "NONE"
    if subsurf:
        sd = ob.modifiers.new("sub", "SUBSURF")
        sd.levels = subsurf
        sd.render_levels = subsurf
    return ob


def decal_material(name, color_path, height_path):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tc = nt.nodes.new("ShaderNodeTexImage")
    tc.name = "color"
    th = nt.nodes.new("ShaderNodeTexImage")
    th.name = "height"
    for n, p in ((tc, color_path), (th, height_path)):
        n.image = bpy.data.images.load(p, check_existing=False)
        n.extension = "CLIP"
    tc.image.alpha_mode = "STRAIGHT"
    th.image.colorspace_settings.name = "Non-Color"
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    bump.inputs["Distance"].default_value = 0.035
    bsdf.inputs["Roughness"].default_value = 0.78
    nt.links.new(tc.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tc.outputs["Alpha"], bsdf.inputs["Alpha"])
    nt.links.new(th.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def build(name="eroe"):
    skin = clay_material(f"{name}_skin", C_SKIN, 0.80, sss=0.05, bump=0.035)
    shirt = clay_material(f"{name}_shirt", C_SHIRT, 0.88, bump=0.10)
    pants = clay_material(f"{name}_pants", C_PANTS, 0.86, bump=0.10)
    nose_m = clay_material(f"{name}_nose", C_NOSE, 0.70, bump=0.03)

    root = bpy.data.objects.new(f"{name}_root", None)
    _link(root)
    ch = dict(root=root, nm=name, skin=skin, shirt=shirt, pants=pants, limbs=[])

    ch["torso"] = rounded_box(f"{name}_torso", (0, 0, TORSO["z"]), (TORSO["w"], TORSO["d"], TORSO["h"]), TORSO["bevel"], shirt, root, taper_top=0.86)
    for sx in (-1, 1):
        rounded_box(f"{name}_leg{'L' if sx < 0 else 'R'}", (sx * LEG["x"], 0, LEG["h"] / 2), (LEG["w"], LEG["d"], LEG["h"]), LEG["bevel"], pants, root)

    pivot = bpy.data.objects.new(f"{name}_headpivot", None)
    pivot.location = (0, 0, NECK_Z)
    _link(pivot, root)
    head = ellipsoid(f"{name}_head", (0, 0, HEAD_Z - NECK_Z), HEAD_R, skin, None, pivot, seg=96, rings=64)
    ch["pivot"], ch["head"] = pivot, head

    # naso rosso 3D
    nose = ellipsoid(f"{name}_nose", (0, -HEAD_R[1] + 0.010, HEAD_Z - NECK_Z - 0.03), (0.055, 0.055, 0.055), nose_m, None, pivot, seg=40, rings=24)
    ch["nose"] = nose

    # faccia 2D (decal con bump) proiettata sulla testa
    cp, hp = os.path.join(TMP, f"{name}_f_color.png"), os.path.join(TMP, f"{name}_f_height.png")
    c, h = F2.face_images("neutro", 1024)
    c.save(cp)
    h.save(hp)
    dw = 0.90
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=90, y_segments=90, size=dw / 2)
    me = bpy.data.meshes.new(f"{name}_facemesh")
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new(name="UV")
    s = dw / 2
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((v.x + s) / (2 * s), (v.y + s) / (2 * s))
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(decal_material(f"{name}_facemat", cp, hp))
    face = bpy.data.objects.new(f"{name}_face", me)
    face.rotation_euler = (math.radians(90), 0, 0)
    face.location = (0, -0.7, HEAD_Z - NECK_Z)
    _link(face, pivot)
    sw = face.modifiers.new("wrap", "SHRINKWRAP")
    sw.target = head
    sw.wrap_method = "PROJECT"
    sw.use_project_z = True
    sw.use_negative_direction = True
    sw.use_positive_direction = False
    sw.cull_face = "OFF"
    sw.offset = 0.004
    ch["face"] = face
    pose(ch)
    return ch


def set_face(ch, expr):
    cp = os.path.join(TMP, f"{ch['nm']}_f_{expr}_c.png")
    hp = os.path.join(TMP, f"{ch['nm']}_f_{expr}_h.png")
    if not os.path.exists(cp):
        c, h = F2.face_images(expr, 1024)
        c.save(cp)
        h.save(hp)
    mat = ch["face"].data.materials[0]
    for n in mat.node_tree.nodes:
        if n.type == "TEX_IMAGE":
            path = cp if n.name == "color" else hp
            n.image = bpy.data.images.load(path, check_existing=False)
            if n.name == "color":
                n.image.alpha_mode = "STRAIGHT"
            else:
                n.image.colorspace_settings.name = "Non-Color"


def _clear(ch):
    for o in ch["limbs"]:
        bpy.data.objects.remove(o, do_unlink=True)
    ch["limbs"] = []


def default_arm(sign):
    sh = Vector((sign * SHOULDER["x"], 0, SHOULDER["z"]))
    end = Vector((sign * 0.78, -0.02, 0.98))
    mid = Vector((sign * 0.74, 0.02, 1.42))
    return end, mid


def pose(ch, arm_l=None, arm_r=None, head_rot=(0, 0, 0), root_loc=(0, 0, 0), root_rot=(0, 0, 0), torso_rot=(0, 0, 0)):
    """arm_*: (punto della mano, gomito) in coordinate del root. Ricostruisce le braccia (tubi grossi con estremità tonda)."""
    _clear(ch)
    nm = ch["nm"]
    root = ch["root"]
    root.location = root_loc
    root.rotation_euler = root_rot
    ch["pivot"].rotation_euler = head_rot
    ch["torso"].rotation_euler = torso_rot

    def build_arm(side, spec):
        sign = -1 if side == "L" else 1
        sh = Vector((sign * SHOULDER["x"], 0, SHOULDER["z"]))
        end, elb = spec if spec is not None else default_arm(sign)
        end, elb = Vector(end), Vector(elb)
        pts = bez_pts(sh, elb, end, 36)
        n = len(pts) - 1
        # raggio che si assottiglia leggermente verso la mano: tubo a sezione costante + sfere ai capi
        arm = tube(f"{nm}_arm{side}", pts, ARM_R[1], ch["skin"], root, res=16, taper_end=ARM_R[2] / ARM_R[1], taper_pow=0.7)
        cap0 = ellipsoid(f"{nm}_sh{side}", sh, (ARM_R[0],) * 3, ch["skin"], None, root, seg=40, rings=24)
        cap1 = ellipsoid(f"{nm}_hand{side}", pts[-1], (ARM_R[2],) * 3, ch["skin"], None, root, seg=40, rings=24)
        return [arm, cap0, cap1]

    ch["limbs"] += build_arm("L", arm_l)
    ch["limbs"] += build_arm("R", arm_r)
