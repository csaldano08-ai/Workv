"""
Mina in 3D (Blender/bpy), fedele al design approvato (spesora/assets/mascot/mina).

Parti: dorso salvia con rametti, copertina avorio (cerniera sul dorso, quindi apribile in futuro), blocco pagine crema,
elastico verde scuro vicino al bordo destro, linguette pesca e salvia a destra, segnalibro pesca a due punte sotto il lato sinistro,
braccia salvia con mani a muffola, due gambe corte con piedi arrotondati. Nessun naso. Faccia e illustrazioni = decal 2D.

Unità: libro alto 1.0, largo 0.72, spesso 0.34. Altezza totale ~1.22 (gambe incluse).
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import faces_mina as FM  # noqa: E402
from characters import clay_material, _link, ellipsoid, tube, bez_pts, decal_material, srgb  # noqa: E402
from hero import rounded_box  # noqa: E402

TMP = os.environ.get("ADS_TMP", "/tmp/ads_tmp")

# colori campionati dalla scheda ufficiale (sRGB 0..1)
IVORY = (0.90, 0.79, 0.71)
PAGES = (0.93, 0.86, 0.76)
SPINE = (0.42, 0.50, 0.39)
SPINE_EDGE = (0.55, 0.62, 0.51)
ARM = (0.44, 0.53, 0.41)
LEG = (0.41, 0.49, 0.38)
BAND = (0.30, 0.38, 0.29)
PEACH = (0.93, 0.65, 0.47)
SAGE_TAB = (0.53, 0.60, 0.50)

W, H, D = 0.72, 1.0, 0.34
EDGE = 0.06  # fascia chiara del dorso sul fronte
WC = W - EDGE  # larghezza della copertina
Z0 = 0.22  # il libro parte da qui (sotto: gambe)
CY = Z0 + H / 2


def rounded_slab(name, w, h, d, r, mat, parent=None, bevel=0.012):
    """Lastra con angoli arrotondati nel piano XZ (w x h), spessa d lungo Y."""
    bm = bmesh.new()
    pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(8):
            a = math.radians(a0 + k * 90 / 7)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    verts = [bm.verts.new((x, -d / 2, z)) for x, z in pts]
    f = bm.faces.new(verts)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    ev = [v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, d, 0), verts=ev)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    _link(ob, parent)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = bevel
    bv.segments = 4
    return ob


def plane_decal(name, w, h, mat, parent, loc, rot):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new(name="UV")
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (v.x + 0.5, v.y + 0.5)
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.scale = (w, h, 1)
    ob.rotation_euler = rot
    ob.location = loc
    return _link(ob, parent)


def build(name="mina"):
    paper = clay_material(f"{name}_paper", IVORY, 0.92, bump=0.05)
    pages = clay_material(f"{name}_pages", PAGES, 0.95, bump=0.15)
    spine = clay_material(f"{name}_spine", SPINE, 0.9, bump=0.06)
    arm = clay_material(f"{name}_arm", ARM, 0.9, bump=0.06)
    leg = clay_material(f"{name}_leg", LEG, 0.9, bump=0.06)
    band = clay_material(f"{name}_band", BAND, 0.85, bump=0.04)
    peach = clay_material(f"{name}_peach", PEACH, 0.85, bump=0.04)
    sagetab = clay_material(f"{name}_sagetab", SAGE_TAB, 0.85, bump=0.04)

    root = bpy.data.objects.new(f"{name}_root", None)
    _link(root)
    ch = dict(root=root, nm=name, arm=arm, leg=leg, limbs=[])

    # blocco pagine
    ch["pages"] = rounded_slab(f"{name}_pages", W - 0.05, H - 0.014, D - 0.1, 0.03, pages, root, bevel=0.006)
    for n in pages.node_tree.nodes:
        if n.type == 'BUMP':
            wv = pages.node_tree.nodes.new('ShaderNodeTexWave')
            wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 90; wv.inputs['Distortion'].default_value = 1.5
            pages.node_tree.links.new(wv.outputs['Fac'], n.inputs['Height'])
            n.inputs['Strength'].default_value = 0.9; n.inputs['Distance'].default_value = 0.02
    ch["pages"].location = (0.0, 0.0, CY)
    # copertina posteriore e dorso
    back = rounded_slab(f"{name}_back", W, H, 0.05, 0.05, spine, root)
    back.location = (0, D / 2 - 0.025, CY)
    sp = rounded_box(f"{name}_spine", (-W / 2 - 0.005, 0, CY), (0.07, D, H), 0.03, spine, root, seg=5, subsurf=0)
    ch["spine"] = sp
    # copertina anteriore: origine sulla cerniera (bordo sinistro), così si potrà aprire
    hinge = bpy.data.objects.new(f"{name}_cover_hinge", None)
    hinge.location = (-W / 2 + EDGE, -D / 2 + 0.03, CY)
    _link(hinge, root)
    cover = rounded_slab(f"{name}_cover", WC, H, 0.06, 0.055, paper, hinge)
    cover.location = (WC / 2, 0, 0)
    ch["hinge"], ch["cover"] = hinge, cover
    # bordo chiaro del dorso sul fronte (come nel master)
    edge = rounded_box(f"{name}_spine_edge", (-W / 2 + EDGE / 2, -D / 2 + 0.03, CY), (EDGE, 0.06, H - 0.01), 0.02, clay_material(f"{name}_edge", SPINE_EDGE, 0.88, bump=0.05), root, seg=4, subsurf=0)

    # elastico verde scuro che avvolge il libro, vicino al bordo destro
    ex = -W / 2 + 0.84 * W
    el = rounded_box(f"{name}_band", (ex, -0.005, CY), (0.062, D + 0.01, H + 0.012), 0.022, band, root, seg=4, subsurf=0)
    ch["band"] = el
    # linguette sul lato destro
    t1 = rounded_slab(f"{name}_tab_peach", 0.15, 0.17, 0.03, 0.02, peach, root, bevel=0.008)
    t1.location = (W / 2 + 0.045, -D / 2 + 0.1, Z0 + H - 0.14)
    t2 = rounded_slab(f"{name}_tab_sage", 0.15, 0.16, 0.03, 0.02, sagetab, root, bevel=0.008)
    t2.location = (W / 2 + 0.045, -D / 2 + 0.1, Z0 + H - 0.40)

    # segnalibro pesca a due punte, sotto il lato sinistro
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
    bmk = bpy.data.objects.new(f"{name}_bookmark", me)
    bmk.location = (-W / 2 + 0.14, -D / 2 + 0.02, Z0 + 0.006)
    bmk.rotation_euler = (0, math.radians(8), 0)
    _link(bmk, root)

    # decal faccia + rametto sulla copertina; rametti sul dorso
    cp = os.path.join(TMP, f"{name}_cover_neutra.png")
    FM.cover_image("neutra").save(cp)
    mat = decal_material(f"{name}_facemat", cp)
    face = plane_decal(f"{name}_face", WC, H, mat, cover, (0, -0.0305, 0), (math.radians(90), 0, 0))
    ch["face"] = face
    sp_path = os.path.join(TMP, f"{name}_spine_art.png")
    FM.spine_image().save(sp_path)
    plane_decal(f"{name}_spine_art", D * 0.92, H * 0.98, decal_material(f"{name}_spinemat", sp_path), root,
                (-W / 2 - 0.0405, 0, CY), (math.radians(90), 0, math.radians(90)))
    pose(ch)
    return ch


def set_face(ch, expr):
    path = os.path.join(TMP, f"{ch['nm']}_cover_{expr}.png")
    if not os.path.exists(path):
        FM.cover_image(expr).save(path)
    for n in ch["face"].data.materials[0].node_tree.nodes:
        if n.type == "TEX_IMAGE":
            n.image = bpy.data.images.load(path, check_existing=False)
            n.image.alpha_mode = "STRAIGHT"


def _clear(ch):
    for o in ch["limbs"]:
        bpy.data.objects.remove(o, do_unlink=True)
    ch["limbs"] = []


SH_Z = Z0 + 0.42  # punto di attacco delle braccia (circa il 58% dell'altezza)
ARM_R = 0.068


def default_arm(sign):
    sh = Vector((sign * (W / 2 + 0.01), 0, SH_Z))
    return (Vector((sign * (W / 2 + 0.15), -0.03, SH_Z - 0.25)), Vector((sign * (W / 2 + 0.12), 0.0, SH_Z - 0.11)))


def pose(ch, arm_l=None, arm_r=None, root_loc=(0, 0, 0), root_rot=(0, 0, 0), foot_l=None, foot_r=None, cover_open=0.0, root_scale=1.0):
    _clear(ch)
    nm = ch["nm"]
    root = ch["root"]
    root.location = root_loc
    root.rotation_euler = root_rot
    root.scale = (root_scale,) * 3
    ch["hinge"].rotation_euler = (0, 0, math.radians(-cover_open))

    def build_arm(side, spec):
        sign = -1 if side == "L" else 1
        sh = Vector((sign * (W / 2 + 0.01), 0, SH_Z))
        end, elb = spec if spec is not None else default_arm(sign)
        end, elb = Vector(end), Vector(elb)
        pts = bez_pts(sh, elb, end, 28)
        a = tube(f"{nm}_arm{side}", pts, ARM_R, ch["arm"], root, res=14, taper_end=1.05, taper_pow=0.8)
        # mano a muffola: ellissoide allineato alla direzione + piccolo pollice
        dirv = (pts[-1] - pts[-3]).normalized()
        quat = dirv.to_track_quat("Z", "Y")
        m = ellipsoid(f"{nm}_mitt{side}", pts[-1] + dirv * 0.012, (0.078, 0.06, 0.088), ch["arm"], None, root, rot=quat.to_euler(), seg=32, rings=20)
        side_vec = quat @ Vector((-sign, 0, 0))
        th = ellipsoid(f"{nm}_thumb{side}", pts[-1] - dirv * 0.025 + side_vec * 0.05, (0.034, 0.034, 0.06), ch["arm"], None, root, rot=quat.to_euler(), seg=20, rings=12)
        cap = ellipsoid(f"{nm}_shoulder{side}", sh, (0.075, 0.075, 0.075), ch["arm"], None, root, seg=24, rings=14)
        return [a, m, th, cap]

    ch["limbs"] += build_arm("L", arm_l)
    ch["limbs"] += build_arm("R", arm_r)

    def build_leg(side, foot):
        sign = -1 if side == "L" else 1
        hip = Vector((sign * 0.19, 0, Z0 + 0.02))
        ft = Vector(foot) if foot is not None else Vector((sign * 0.19, 0.0, 0.07))
        pts = bez_pts(hip, (hip + ft) / 2 + Vector((0, -0.01, 0)), ft + Vector((0, 0, 0.03)), 10)
        lg = tube(f"{nm}_leg{side}", pts, 0.072, ch["leg"], root, res=14)
        foot_o = ellipsoid(f"{nm}_foot{side}", (ft.x, ft.y - 0.035, ft.z - 0.015), (0.1, 0.14, 0.06), ch["leg"], None, root, seg=32, rings=20)
        return [lg, foot_o]

    ch["limbs"] += build_leg("L", foot_l)
    ch["limbs"] += build_leg("R", foot_r)
