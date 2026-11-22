"""
Cucina di EP01 ("Il frigorifero delle 21:00"), ambiente 3D di sera, volutamente più realistico dei personaggi.

Unità: la testa del protagonista è larga 1.0, il protagonista è alto ~3.1. Piano di lavoro alto 2.0, frigorifero alto 4.3.
Mondo: x a destra, y verso il fondo (parete di fondo a y=5), z in alto. La camera sta a y negativo.

Luci: lampada a sospensione calda sopra il piano, striscia sotto i pensili, luce fredda DENTRO il frigorifero (che si
riversa sul protagonista), luce lunare dalla finestra, un riempimento tenue.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from characters import _link, ellipsoid, srgb  # noqa: E402
from hero import rounded_box  # noqa: E402


# ------------------------------------------------------------------ materiali
def mat(name, color, rough=0.6, metal=0.0, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(color), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission is not None:
        b.inputs["Emission Color"].default_value = (*srgb(emission), 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def wood_mat(name, c1=(0.55, 0.38, 0.24), c2=(0.42, 0.28, 0.17), scale=(1.4, 14.0)):
    """Assi di legno a strisce (Brick texture come doghe)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale[0], scale[1], 1)
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Color1"].default_value = (*srgb(c1), 1)
    br.inputs["Color2"].default_value = (*srgb(c2), 1)
    br.inputs["Mortar"].default_value = (*srgb((0.2, 0.13, 0.08)), 1)
    br.inputs["Mortar Size"].default_value = 0.006
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 7.0
    br.inputs["Row Height"].default_value = 0.4
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5
    return m


def tile_mat(name, color=(0.74, 0.73, 0.69), grout=(0.45, 0.44, 0.4)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.5
    br.inputs["Color1"].default_value = (*srgb(color), 1)
    br.inputs["Color2"].default_value = (*srgb((color[0] * 0.96, color[1] * 0.96, color[2] * 0.96)), 1)
    br.inputs["Mortar"].default_value = (*srgb(grout), 1)
    br.inputs["Mortar Size"].default_value = 0.015
    br.inputs["Brick Width"].default_value = 0.55
    br.inputs["Row Height"].default_value = 0.55
    br.inputs["Scale"].default_value = 1.0
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.25
    return m


# ------------------------------------------------------------------ primitive
def box(name, center, size, material, bevel=0.025, parent=None, seg=3):
    return rounded_box(name, center, size, bevel, material, parent, seg=seg, subsurf=0)


def cylinder(name, center, r, h, material, rot=(0, 0, 0), parent=None, seg=40):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    ob.location = center
    ob.rotation_euler = rot
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = min(0.02, r * 0.3)
    bv.segments = 3
    return _link(ob, parent)


def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0, target=None, spot=None):
    d = bpy.data.lights.new(name, kind)
    d.energy = energy
    d.color = color
    if kind == "AREA":
        d.size = size
    elif kind == "POINT":
        d.shadow_soft_size = size
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if target is not None:
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


# ------------------------------------------------------------------ scena
def setup_render(res=(540, 960), samples=40):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb((0.10, 0.12, 0.2)), 1)
    bg.inputs["Strength"].default_value = 0.25
    sc.world = w
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36
    return sc


def aim(loc, target, lens=40, fstop=None, focus=None):
    cam = bpy.context.scene.camera
    cam.location = loc
    cam.data.lens = lens
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    if fstop:
        cam.data.dof.use_dof = True
        cam.data.dof.aperture_fstop = fstop
        cam.data.dof.focus_distance = focus or (Vector(target) - Vector(loc)).length
    else:
        cam.data.dof.use_dof = False


FRIDGE = dict(x0=1.6, x1=4.4, y0=3.0, y1=4.95, h=4.3)


def build():
    """Costruisce la cucina. Ritorna un dict con gli oggetti utili (porta del frigo, luci, telefono-posto)."""
    K = {}
    wallc = mat("wall", (0.55, 0.60, 0.52), 0.85)
    floor = wood_mat("floor")
    cab = mat("cab", (0.88, 0.84, 0.74), 0.55)
    cab2 = mat("cab2", (0.38, 0.47, 0.40), 0.55)
    top = mat("top", (0.46, 0.44, 0.41), 0.35)
    steel = mat("steel", (0.78, 0.80, 0.82), 0.28, metal=1.0)
    white = mat("fridgewhite", (0.92, 0.93, 0.93), 0.35)
    inner = mat("inner", (0.95, 0.97, 0.98), 0.4)
    rug = mat("rug", (0.5, 0.34, 0.27), 0.95)

    # pavimento, pareti
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-1, -1, 0))
    fl = bpy.context.active_object
    fl.scale = (16, 18, 1)
    fl.data.materials.append(floor)
    box("backwall", (-1, 5.2, 5.0), (16, 0.4, 10.0), wallc, 0.0)
    box("leftwall", (-6.4, 0, 5.0), (0.4, 20, 10.0), wallc, 0.0)
    box("rightwall", (7.0, 0, 5.0), (0.4, 20, 10.0), wallc, 0.0)
    box("rug", (2.4, 1.2, 0.012), (4.6, 2.8, 0.024), rug, 0.01)

    # piano di lavoro con base, ante, maniglie
    cx0, cx1 = -5.9, 1.4
    cw = cx1 - cx0
    box("base", ((cx0 + cx1) / 2, 4.15, 0.95), (cw, 1.6, 1.9), cab, 0.03)
    n = 6
    for i in range(n):
        x = cx0 + (i + 0.5) * cw / n
        box(f"door{i}", (x, 3.34, 0.95), (cw / n - 0.06, 0.05, 1.7), cab2 if i % 2 == 0 else cab, 0.025)
        box(f"handle{i}", (x + 0.35, 3.29, 1.55), (0.05, 0.05, 0.4), steel, 0.02)
    box("counter", ((cx0 + cx1) / 2, 4.1, 1.96), (cw + 0.1, 1.75, 0.14), top, 0.03)
    # alzatina in piastrelle
    box("backsplash", ((cx0 + cx1) / 2, 4.98, 2.8), (cw, 0.06, 1.5), tile_mat("tiles"), 0.0)
    # pensili
    for i, (x0, x1) in enumerate(((-2.7, -0.7), (-0.6, 1.3))):
        box(f"upper{i}", ((x0 + x1) / 2, 4.65, 4.55), (x1 - x0, 0.7, 1.6), cab, 0.03)
        box(f"upper_door{i}", ((x0 + x1) / 2, 4.28, 4.55), (x1 - x0 - 0.06, 0.05, 1.5), cab2, 0.025)
        box(f"upper_handle{i}", ((x0 + x1) / 2 + 0.3, 4.23, 3.95), (0.4, 0.05, 0.05), steel, 0.02)
    # finestra notturna a sinistra
    sky = mat("sky", (0.12, 0.17, 0.35), 0.9, emission=(0.25, 0.33, 0.6), strength=1.3)
    box("window_sky", (-4.4, 4.96, 4.2), (2.5, 0.04, 2.2), sky, 0.0)
    frame = mat("frame", (0.9, 0.9, 0.88), 0.5)
    for nm, c, s in (("wf_t", (-4.4, 4.9, 5.35), (2.7, 0.12, 0.14)), ("wf_b", (-4.4, 4.9, 3.05), (2.7, 0.12, 0.14)), ("wf_l", (-5.7, 4.9, 4.2), (0.14, 0.12, 2.3)),
                     ("wf_r", (-3.1, 4.9, 4.2), (0.14, 0.12, 2.3)), ("wf_m", (-4.4, 4.9, 4.2), (0.08, 0.12, 2.2))):
        box(nm, c, s, frame, 0.02)

    # frigorifero (corpo aperto sul davanti, porta incernierata a destra)
    F = FRIDGE
    fw, fd = F["x1"] - F["x0"], F["y1"] - F["y0"]
    fx, fy = (F["x0"] + F["x1"]) / 2, (F["y0"] + F["y1"]) / 2
    t = 0.12
    box("fr_back", (fx, F["y1"] - t / 2, F["h"] / 2), (fw, t, F["h"]), inner, 0.01)
    box("fr_left", (F["x0"] + t / 2, fy, F["h"] / 2), (t, fd, F["h"]), white, 0.02)
    box("fr_right", (F["x1"] - t / 2, fy, F["h"] / 2), (t, fd, F["h"]), white, 0.02)
    box("fr_top", (fx, fy, F["h"] - t / 2), (fw, fd, t), white, 0.02)
    box("fr_bot", (fx, fy, t / 2 + 0.2), (fw, fd, t), white, 0.02)
    box("fr_plinth", (fx, fy - 0.05, 0.1), (fw - 0.1, fd - 0.2, 0.2), steel, 0.02)
    shelfm = mat("shelf", (0.32, 0.4, 0.43), 0.8)
    for i, z in enumerate((1.25, 2.3, 3.35)):
        box(f"shelf{i}", (fx, fy + 0.05, z), (fw - 2 * t, fd - 0.2, 0.06), shelfm, 0.01)
    # contenuto: pochissimo (il problema della scena)
    milk = mat("milk", (0.95, 0.96, 0.98), 0.5)
    blue = mat("blue", (0.2, 0.4, 0.75), 0.5)
    box("milk", (F["x0"] + 0.55, fy + 0.2, 1.25 + 0.03 + 0.42), (0.38, 0.38, 0.84), milk, 0.04)
    box("milk_cap", (F["x0"] + 0.55, fy + 0.2, 1.25 + 0.03 + 0.88), (0.16, 0.16, 0.08), blue, 0.02)
    jar = mat("jar", (0.7, 0.2, 0.18), 0.4)
    cylinder("jar", (F["x0"] + 1.5, fy + 0.3, 1.25 + 0.03 + 0.28), 0.2, 0.52, jar)
    cylinder("jar_lid", (F["x0"] + 1.5, fy + 0.3, 1.25 + 0.03 + 0.56), 0.21, 0.06, steel)
    egg = mat("egg", (0.93, 0.86, 0.72), 0.6)
    box("eggtray", (F["x1"] - 0.85, fy + 0.3, 2.3 + 0.03 + 0.06), (0.7, 0.3, 0.1), mat("tray", (0.7, 0.62, 0.5), 0.9), 0.03)
    for i in range(3):
        ellipsoid(f"egg{i}", (F["x1"] - 1.05 + i * 0.2, fy + 0.3, 2.3 + 0.03 + 0.16), (0.075, 0.075, 0.1), egg, None, None, seg=24, rings=14)
    carrot = mat("carrot", (0.9, 0.4, 0.1), 0.6)
    cylinder("carrot", (F["x0"] + 0.9, fy + 0.2, 2.3 + 0.03 + 0.09), 0.09, 0.8, carrot, rot=(0, math.radians(90), math.radians(15)))
    box("tupper", (F["x0"] + 1.9, fy + 0.2, 3.35 + 0.03 + 0.17), (0.7, 0.5, 0.3), mat("tupper", (0.85, 0.9, 0.92), 0.2), 0.05)
    box("lid", (F["x0"] + 1.9, fy + 0.2, 3.35 + 0.03 + 0.34), (0.72, 0.52, 0.05), mat("tupperlid", (0.3, 0.55, 0.75), 0.4), 0.02)
    ellipsoid("cheese", (F["x1"] - 0.7, fy + 0.2, 3.35 + 0.03 + 0.14), (0.28, 0.2, 0.14), mat("cheese", (0.95, 0.8, 0.3), 0.6), None, None, seg=24, rings=14)
    # luce interna fredda
    K["fridge_light"] = light("fridge_light", "AREA", (fx, F["y1"] - 0.5, F["h"] - 0.5), 650, (0.85, 0.95, 1.0), 1.8, (fx, F["y0"] - 3, 1.8))
    K["fridge_light2"] = light("fridge_light2", "AREA", (fx, F["y0"] + 0.5, 1.2), 250, (0.85, 0.95, 1.0), 1.5, (fx, F["y0"] - 3, 1.5))

    # porta del frigo: cerniera sul bordo destro, si apre verso la camera
    hinge = bpy.data.objects.new("fr_hinge", None)
    hinge.location = (F["x1"], F["y0"] - 0.06, 0)
    _link(hinge)
    door = box("fr_door", (-fw / 2, 0, F["h"] / 2), (fw, 0.22, F["h"] - 0.06), white, 0.05, parent=hinge)
    box("fr_handle", (-fw + 0.3, -0.22, F["h"] * 0.55), (0.1, 0.16, 1.2), steel, 0.04, parent=hinge)
    # interno della porta (ripiani con bottiglie) sul lato che guarda dentro
    box("fr_door_shelf0", (-fw / 2, 0.22, 1.6), (fw - 0.3, 0.22, 0.05), shelfm, 0.01, parent=hinge)
    box("fr_door_shelf1", (-fw / 2, 0.22, 2.7), (fw - 0.3, 0.22, 0.05), shelfm, 0.01, parent=hinge)
    for i, c in enumerate(((0.2, 0.6, 0.3), (0.85, 0.7, 0.2), (0.9, 0.3, 0.2))):
        cylinder(f"bottle{i}", (-0.7 - i * 0.55, 0.22, 1.6 + 0.4), 0.1, 0.7, mat(f"bottle{i}", c, 0.3), parent=hinge)
    # magneti e foglietti sul davanti (lato esterno)
    notes = [((0.97, 0.9, 0.5), 0.55, 3.7, 0.5, 0.5), ((0.95, 0.6, 0.6), 1.2, 3.2, 0.45, 0.35), ((0.6, 0.8, 0.95), 0.8, 2.7, 0.5, 0.4), ((0.98, 0.98, 0.98), 1.9, 3.5, 0.5, 0.65)]
    for i, (c, dx, dz, w, h) in enumerate(notes):
        box(f"note{i}", (-dx - 0.2, -0.13, dz), (w, 0.02, h), mat(f"note{i}", c, 0.8), 0.005, parent=hinge)
        cylinder(f"magnet{i}", (-dx - 0.2, -0.15, dz + h / 2 - 0.05), 0.045, 0.03, mat(f"mag{i}", (0.8, 0.2, 0.2), 0.4), rot=(math.radians(90), 0, 0), parent=hinge)
    K["door_hinge"] = hinge

    # oggetti sul piano di lavoro
    bowl = mat("bowl", (0.85, 0.8, 0.7), 0.4)
    ellipsoid("fruit_bowl", (-0.1, 4.2, 2.1), (0.5, 0.5, 0.2), bowl, None, None, seg=40, rings=20)
    for i, (col, dx, dy) in enumerate((((0.85, 0.2, 0.15), -0.15, 0.0), ((0.9, 0.7, 0.2), 0.1, 0.1), ((0.6, 0.7, 0.2), 0.05, -0.1))):
        ellipsoid(f"fruit{i}", (-0.1 + dx, 4.2 + dy, 2.28), (0.15, 0.15, 0.15), mat(f"fruit{i}", col, 0.5), None, None, seg=24, rings=14)
    cylinder("kettle", (-3.4, 4.4, 2.35), 0.35, 0.75, steel)
    box("kettle_handle", (-3.4, 4.4, 2.8), (0.5, 0.06, 0.06), mat("khandle", (0.15, 0.15, 0.15), 0.6), 0.02)
    box("cutting_board", (-1.5, 4.3, 2.04), (0.9, 0.6, 0.05), mat("board", (0.7, 0.5, 0.3), 0.6), 0.02)
    cylinder("jar2", (-5.2, 4.4, 2.35), 0.22, 0.55, mat("jar2", (0.85, 0.85, 0.7), 0.3))
    cylinder("pot", (-5.0, 3.9, 2.2), 0.25, 0.4, mat("pot", (0.75, 0.45, 0.3), 0.8))
    for i in range(5):
        ang = i / 5 * 2 * math.pi
        ellipsoid(f"leaf{i}", (-5.0 + 0.18 * math.cos(ang), 3.9 + 0.18 * math.sin(ang), 2.6), (0.07, 0.2, 0.28), mat("leaf", (0.3, 0.55, 0.3), 0.6), None, None, rot=(0.4 * math.sin(ang), 0.4 * math.cos(ang), ang), seg=16, rings=10)
    # zona giorno dietro la camera: parete, divano, lampada da terra (si vedono nel primo piano girato verso l'interno)
    box("frontwall", (-1, -9.5, 5.0), (16, 0.4, 10.0), mat("frontwall", (0.62, 0.55, 0.48), 0.85), 0.0)
    sofa = mat("sofa", (0.35, 0.42, 0.55), 0.9)
    box("sofa_base", (2.2, -8.2, 0.7), (4.2, 1.5, 1.4), sofa, 0.1)
    box("sofa_back", (2.2, -8.85, 1.7), (4.2, 0.4, 1.3), sofa, 0.1)
    for dx in (-2.0, 2.0):
        box(f"sofa_arm{dx}", (2.2 + dx, -8.2, 1.2), (0.4, 1.5, 1.0), sofa, 0.1)
    box("picture", (-0.6, -9.28, 4.2), (2.2, 0.06, 1.5), mat("pic", (0.85, 0.7, 0.45), 0.8), 0.02)
    flamp = mat("flamp", (1.0, 0.85, 0.6), 0.3, emission=(1.0, 0.8, 0.5), strength=5.0)
    cylinder("floorlamp_pole", (-3.8, -8.0, 2.0), 0.04, 4.0, mat("pole", (0.15, 0.15, 0.15), 0.4))
    ellipsoid("floorlamp_shade", (-3.8, -8.0, 4.2), (0.5, 0.5, 0.4), flamp, None, None, seg=32, rings=16)
    K["floorlamp"] = light("floorlamp_light", "POINT", (-3.8, -8.0, 4.2), 250, (1.0, 0.8, 0.55), 0.4)
    # sedia a sinistra e tavolino per profondità
    wood2 = mat("wood2", (0.6, 0.42, 0.28), 0.5)
    box("stool_seat", (-4.6, 1.8, 1.6), (0.9, 0.9, 0.12), wood2, 0.03)
    for dx in (-0.35, 0.35):
        for dy in (-0.35, 0.35):
            box(f"stool_leg{dx}{dy}", (-4.6 + dx, 1.8 + dy, 0.8), (0.1, 0.1, 1.6), wood2, 0.02)

    # lampada a sospensione + luci
    lampm = mat("lamp", (1.0, 0.85, 0.6), 0.3, emission=(1.0, 0.8, 0.5), strength=7.0)
    ellipsoid("lamp_bulb", (-1.6, 3.2, 5.6), (0.35, 0.35, 0.28), lampm, None, None, seg=32, rings=16)
    cylinder("lamp_cord", (-1.6, 3.2, 6.3), 0.02, 1.4, mat("cord", (0.1, 0.1, 0.1), 0.5))
    K["lamp"] = light("lamp_light", "POINT", (-1.6, 3.2, 5.55), 600, (1.0, 0.8, 0.55), 0.35)
    K["under"] = light("under_cabinet", "AREA", (-0.2, 4.1, 3.7), 38, (1.0, 0.82, 0.6), 1.8, (-0.2, 4.0, 2.0))
    K["moon"] = light("moon", "AREA", (-4.4, 3.5, 4.2), 380, (0.55, 0.65, 1.0), 2.5, (-3.0, 0.5, 2.0))
    K["fill"] = light("fill", "AREA", (0.5, -4.8, 4.8), 900, (1.0, 0.9, 0.78), 6.0, (0.0, 2.5, 2.2))
    return K


def set_door(K, angle_deg):
    """0 = chiusa, 100 = aperta verso la camera."""
    K["door_hinge"].rotation_euler = (0, 0, math.radians(angle_deg))
