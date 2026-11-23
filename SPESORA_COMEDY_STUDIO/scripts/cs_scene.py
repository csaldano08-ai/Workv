"""
Scena di prova, render e oggetti di scena ricorrenti (telefono) per SPESORA COMEDY STUDIO.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

from cs_char import _link, clay, lin

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UI_SPESA = os.path.join(REPO, "SPESORA_ADS_STUDIO", "props", "ui", "ui_spesa.png")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def render_setup(res=(720, 1280), samples=32, denoise=True):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = denoise
    sc.cycles.max_bounces = 6
    sc.cycles.transparent_max_bounces = 16  # i gusci del contorno sono trasparenti dal davanti
    sc.cycles.filter_width = 1.5             # antialiasing: filtro un po' più largo sui tratti sottili del volto
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.fps = 30
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.film_transparent = False
    return sc


def studio(floor_grid=True, backdrop=(0.86, 0.84, 0.8)):
    """Ciclorama caldo, pavimento con griglia (serve a vedere lo scivolamento dei piedi), tre luci morbide."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.66, 0.72, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.22
    sc.world = w
    # pavimento + fondale curvo in un pezzo (nessuna superficie sovrapposta)
    bm = bmesh.new()
    prof = []
    for i in range(10):
        prof.append((0.0, -6 + 9 * i / 9, 0.0))
    for i in range(1, 13):
        a = math.pi / 2 * i / 12
        prof.append((0.0, 3 + 1.5 * math.sin(a), 1.5 - 1.5 * math.cos(a)))
    prof.append((0.0, 4.5, 5.0))
    rows = []
    for x in (-6, -2, 2, 6):
        rows.append([bm.verts.new((x, y, z)) for _, y, z in prof])
    for i in range(len(rows) - 1):
        for j in range(len(prof) - 1):
            bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    me = bpy.data.meshes.new("cyc")
    bm.to_mesh(me)
    bm.free()
    backdrop = lin(backdrop)
    m = clay("floor", backdrop, 0.85, 0.0)
    if floor_grid:
        nt = m.node_tree
        b = nt.nodes["Principled BSDF"]
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], sep.inputs[0])
        lines = []
        for comp in ("X", "Y"):
            md = nt.nodes.new("ShaderNodeMath")
            md.operation = "PINGPONG"
            md.inputs[1].default_value = 0.125  # griglia di 25 cm
            nt.links.new(sep.outputs[comp], md.inputs[0])
            st = nt.nodes.new("ShaderNodeMath")
            st.operation = "LESS_THAN"
            st.inputs[1].default_value = 0.004
            nt.links.new(md.outputs[0], st.inputs[0])
            lines.append(st)
        mx = nt.nodes.new("ShaderNodeMath")
        mx.operation = "MAXIMUM"
        nt.links.new(lines[0].outputs[0], mx.inputs[0])
        nt.links.new(lines[1].outputs[0], mx.inputs[1])
        # solo sul pavimento (z basso)
        lt = nt.nodes.new("ShaderNodeMath")
        lt.operation = "LESS_THAN"
        lt.inputs[1].default_value = 0.01
        nt.links.new(sep.outputs["Z"], lt.inputs[0])
        mm = nt.nodes.new("ShaderNodeMath")
        mm.operation = "MULTIPLY"
        nt.links.new(mx.outputs[0], mm.inputs[0])
        nt.links.new(lt.outputs[0], mm.inputs[1])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs["A"].default_value = (*backdrop, 1)
        mix.inputs["B"].default_value = (backdrop[0] * 0.8, backdrop[1] * 0.8, backdrop[2] * 0.8, 1)
        nt.links.new(mm.outputs[0], mix.inputs["Factor"])
        nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    _link(bpy.data.objects.new("cyc", me))

    def area(name, loc, energy, size, col, target=(0, 0, 1.0)):
        L = bpy.data.lights.new(name, "AREA")
        L.energy = energy
        L.size = size
        L.color = col
        ob = bpy.data.objects.new(name, L)
        ob.location = loc
        d = Vector(target) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        _link(ob)
        return ob

    area("key", (-2.6, -3.2, 3.6), 380, 2.6, (1.0, 0.93, 0.84))
    area("fill", (3.2, -2.4, 2.0), 110, 3.0, (0.85, 0.9, 1.0))
    area("rim", (1.5, 3.0, 3.2), 260, 1.6, (1.0, 0.97, 0.92))


def camera(loc, target, lens=50, name="cam", clip=(0.05, 60.0)):
    c = bpy.data.cameras.new(name)
    c.lens = lens
    c.sensor_fit = "VERTICAL"
    c.sensor_height = 24
    c.clip_start, c.clip_end = clip  # rapporto ragionevole: niente problemi di profondità
    ob = bpy.data.objects.new(name, c)
    _link(ob)
    aim(ob, loc, target)
    bpy.context.scene.camera = ob
    return ob


def aim(ob, loc, target):
    ob.location = Vector(loc)
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ------------------------------------------------------------------ telefono di scena (in scala con le mani)
PHONE_W, PHONE_H, PHONE_T = 0.088, 0.168, 0.011


def build_phone(ui_png=UI_SPESA, name="phone", glow=0.85):
    """Corpo antracite arrotondato; lo schermo è la faccia interna (inset) dello stesso oggetto: nessuna superficie
    duplicata sopra il corpo → nessuno z-fighting. Lo schermo mostra la vera schermata di Spesora (emissione moderata)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * PHONE_W, v.co.y * PHONE_T, v.co.z * PHONE_H))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.006, segments=6, profile=0.5, affect="EDGES")
    # faccia frontale (normale -Y) più grande: è il vetro
    front = max(bm.faces, key=lambda f: (f.normal.y < -0.99) * f.calc_area())
    res = bmesh.ops.inset_individual(bm, faces=[front], thickness=0.003, depth=0.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # normali verso l'esterno garantite dal volume firmato (servono ai controlli dentro/fuori e allo schermo sul lato giusto)
    vol = sum(f.verts[0].co.dot(f.verts[i].co.cross(f.verts[i + 1].co)) for f in bm.faces for i in range(1, len(f.verts) - 1)) / 6
    if vol < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    body = clay(name + "_body", lin((0.141, 0.2, 0.172)), 0.4, 0.1, coat=0.3)  # antracite #24332C
    scr = bpy.data.materials.new(name + "_screen")
    scr.use_nodes = True
    nt = scr.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1)
    b.inputs["Roughness"].default_value = 0.25
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(ui_png, check_existing=True)
    tx.interpolation = "Cubic"
    tx.extension = "EXTEND"
    tx.name = "ui"
    uvn = nt.nodes.new("ShaderNodeUVMap")
    nt.links.new(uvn.outputs["UV"], tx.inputs["Vector"])
    nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = glow
    try:
        b.inputs["Coat Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.2  # riflessi tenui: lo schermo resta leggibile
    except KeyError:
        pass
    me.materials.append(body)
    me.materials.append(scr)
    uv = me.uv_layers.new(name="UVMap")
    # lo schermo è la faccia con normale -Y più al centro
    cand = [p for p in me.polygons if p.normal.y < -0.99]
    sp = min(cand, key=lambda p: Vector((p.center.x, p.center.z)).length)
    sp.material_index = 1
    xs = [me.vertices[i].co.x for i in sp.vertices]
    zs = [me.vertices[i].co.z for i in sp.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for li in sp.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        uv.data[li].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))
    for p in me.polygons:
        p.use_smooth = p.material_index == 0
    ob = _link(bpy.data.objects.new(name, me))
    ob["screen_size"] = (x1 - x0, z1 - z0)
    return ob
