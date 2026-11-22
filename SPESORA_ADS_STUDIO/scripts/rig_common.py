"""
Strumenti comuni dei rig: gerarchia di giunti (empty), segmenti morbidi con IK analitica a due ossa, parti del viso (decal)
che seguono la superficie, registro delle proprietà da animare (per il "bake" in keyframe).
"""
import math

import bpy
import bmesh
from mathutils import Vector, Matrix, Quaternion, Euler

from characters import _link


# ------------------------------------------------------------------ giunti e matrici
def joint(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), size=0.08):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.empty_display_size = size
    e.location = loc
    e.rotation_euler = rot
    return _link(e, parent)


def xf(loc=(0, 0, 0), rot_deg=(0, 0, 0), scale=(1, 1, 1)):
    """Matrice T·R·S identica a quella di un oggetto Blender con rotazione Euler XYZ."""
    r = Euler([math.radians(a) for a in rot_deg], "XYZ").to_matrix().to_4x4()
    s = Matrix.Diagonal((*scale, 1.0))
    return Matrix.Translation(loc) @ r @ s


def solve_ik(S, T, L1, L2, pole):
    """IK analitica a due segmenti. Ritorna (gomito, mano) clampando la portata."""
    S, T = Vector(S), Vector(T)
    d = T - S
    dist = d.length
    reach = (L1 + L2) * 0.998
    if dist > reach:
        T = S + d * (reach / dist)
        dist = reach
    if dist < 1e-5:
        dist = 1e-5
    lo = abs(L1 - L2) + 1e-3
    if dist < lo:
        dist = lo
    u = (T - S).normalized() if (T - S).length > 1e-6 else Vector((0, 0, -1))
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(L1 * L1 - a * a, 0.0))
    p = Vector(pole) - u * Vector(pole).dot(u)
    if p.length < 1e-6:
        p = Vector((0, 1, 0)) - u * u.y
    p.normalize()
    return S + u * a + p * h, S + u * dist


def place_segment(obj, start, end, rest_len):
    """Orienta un segmento (asse locale +Z, origine nel punto di partenza) tra start e end, con allungamento."""
    start, end = Vector(start), Vector(end)
    v = end - start
    L = max(v.length, 1e-5)
    obj.rotation_mode = "QUATERNION"
    obj.location = start
    obj.rotation_quaternion = v.to_track_quat("Z", "Y")
    obj.scale = (1.0, 1.0, L / rest_len)


def cone(name, length, r0, r1, mat, parent, seg=32):
    """Segmento morbido (cono tronco) lungo +Z da 0 a length."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r0, radius2=r1, depth=length)
    for v in bm.verts:
        v.co.z += length / 2
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    return _link(ob, parent)


# ------------------------------------------------------------------ parti del viso
def part_mesh(name, size, mat, parent, loc, grid=1, z=0.0):
    """Piano (w x h unità) con UV 0..1, centrato nell'origine; sul piano XY locale del genitore."""
    w, h = size
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=grid, y_segments=grid, size=0.5)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= h
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new(name="UV")
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (v.x / w + 0.5, v.y / h + 0.5)
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = (loc[0], loc[1], z)
    return _link(ob, parent)


def add_wrap(ob, target, offset):
    sw = ob.modifiers.new("wrap", "SHRINKWRAP")
    sw.target = target
    sw.wrap_method = "PROJECT"
    sw.use_project_z = True
    sw.use_negative_direction = True
    sw.use_positive_direction = False
    sw.cull_face = "OFF"
    sw.offset = offset


# ------------------------------------------------------------------ registro per il bake
class Registry:
    """Raccoglie (oggetto, percorso dati) da keyframare: location/rotation/scale e hide_render."""

    def __init__(self):
        self.items = []

    def add(self, ob, *paths):
        self.items.append((ob, paths))

    def key(self, frame):
        for ob, paths in self.items:
            for p in paths:
                ob.keyframe_insert(data_path=p, frame=frame)
