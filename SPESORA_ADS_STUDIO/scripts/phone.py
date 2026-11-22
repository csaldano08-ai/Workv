"""Smartphone di scena (volutamente un po' grande, leggibile): schermo = vera schermata Oggi di Spesora."""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix
from characters import clay_material, srgb, _link

PHONE_W, PHONE_T, PHONE_H = 0.34, 0.045, 0.70


def build_phone(screen_png, name="phone"):
    mat_body = clay_material(f"{name}_body", (0.46, 0.40, 0.80), 0.5, bump=0.02)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * PHONE_W, v.co.y * PHONE_T, v.co.z * PHONE_H))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat_body)
    ob = bpy.data.objects.new(name, me)
    _link(ob)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = 0.035
    bv.segments = 5
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = 2
    for p in me.polygons:
        p.use_smooth = True
    # schermo (faccia locale -Y)
    sw, sh = PHONE_W * 0.9, PHONE_H * 0.93
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    me2 = bpy.data.meshes.new(name + "_screen")
    bm.to_mesh(me2)
    bm.free()
    uv = me2.uv_layers.new(name="UV")
    for loop in me2.loops:
        v = me2.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (v.x + 0.5, v.y + 0.5)
    m = bpy.data.materials.new(name + "_screenmat")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(screen_png, check_existing=False)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 0.18
    bsdf.inputs["Roughness"].default_value = 0.35
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    me2.materials.append(m)
    scr = bpy.data.objects.new(name + "_screen", me2)
    scr.scale = (sw, sh, 1)
    scr.rotation_euler = (math.radians(90), 0, 0)  # normale verso -Y
    scr.location = (0, -PHONE_T / 2 - 0.002, 0)
    _link(scr, ob)
    # dorso: piccolo modulo fotocamera sul lato +Y
    cam = bpy.data.objects.new(name + "_cam", bpy.data.meshes.new(name + "_cam"))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.045, radius2=0.04, depth=0.015)
    bm.to_mesh(cam.data)
    bm.free()
    cam.data.materials.append(clay_material(name + "_lens", (0.05, 0.05, 0.06), 0.25, bump=0))
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.location = (-PHONE_W * 0.25, PHONE_T / 2 + 0.006, PHONE_H * 0.37)
    _link(cam, ob)
    return ob


def place(ph, loc, spin_z_deg=0, tilt_x_deg=0, roll_y_deg=0):
    R = Matrix.Rotation(math.radians(tilt_x_deg), 4, "X") @ Matrix.Rotation(math.radians(roll_y_deg), 4, "Y") @ Matrix.Rotation(math.radians(spin_z_deg), 4, "Z")
    ph.rotation_mode = "QUATERNION"
    ph.rotation_quaternion = R.to_quaternion()
    ph.location = loc
    return R


def hand_points(loc, R, dz=-0.22):
    """Punti di presa ai due lati del telefono (coordinate mondo). Ritorna (sinistra_personaggio, destra_personaggio)."""
    l = Vector(loc) + R @ Vector((-PHONE_W / 2 - 0.01, 0, dz))
    r = Vector(loc) + R @ Vector((PHONE_W / 2 + 0.01, 0, dz))
    return l, r
