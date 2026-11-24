"""
Oggetti di scena ricorrenti: carrello della spesa, cartellina.

Carrello (spazio locale): il davanti è verso -Y, il manico verso +Y (dove sta chi spinge), z = 0 a terra.
- maniglia a 1,0 m, prese sul manico in GRIP_L / GRIP_R;
- ruote vere (oggetti figli) che ruotano dell'angolo = distanza / raggio;
- cestello con pareti a rete (maschera nel materiale: nessuna rete sovrapposta a una superficie piena);
- telaio basso arretrato: c'è spazio per i piedi di chi spinge.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from cs_char import clay, lin
from cs_market import add_box, add_cyl, finish

WHEEL_R = 0.06
HANDLE = dict(y=0.5, z=1.0, half=0.24)
GRIP_L, GRIP_R = Vector((0.17, HANDLE["y"], HANDLE["z"])), Vector((-0.17, HANDLE["y"], HANDLE["z"]))
_MATS = {}


def _mats():
    if _MATS:
        return _MATS
    met = clay("carrello_metallo", lin((0.82, 0.84, 0.86)), 0.3, 0.0)
    met.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.8
    # rete: griglia di fili (2 cm) dove il resto è trasparente
    net = clay("carrello_rete", lin((0.82, 0.84, 0.86)), 0.3, 0.0)
    nt = net.node_tree
    nt.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.8
    out = nt.nodes["Material Output"]
    bsdf = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    wires = []
    for comp in ("X", "Y", "Z"):
        pp = nt.nodes.new("ShaderNodeMath")
        pp.operation = "PINGPONG"
        pp.inputs[1].default_value = 0.01
        nt.links.new(sep.outputs[comp], pp.inputs[0])
        lt = nt.nodes.new("ShaderNodeMath")
        lt.operation = "LESS_THAN"
        lt.inputs[1].default_value = 0.0018
        nt.links.new(pp.outputs[0], lt.inputs[0])
        wires.append(lt)
    m1 = nt.nodes.new("ShaderNodeMath")
    m1.operation = "MAXIMUM"
    nt.links.new(wires[0].outputs[0], m1.inputs[0])
    nt.links.new(wires[1].outputs[0], m1.inputs[1])
    m2 = nt.nodes.new("ShaderNodeMath")
    m2.operation = "MAXIMUM"
    nt.links.new(m1.outputs[0], m2.inputs[0])
    nt.links.new(wires[2].outputs[0], m2.inputs[1])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(m2.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(bsdf.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    _MATS.update(met=met, net=net, grip=clay("carrello_impugnatura", lin((0.85, 0.2, 0.25)), 0.5, 0.0),
                 wheel=clay("carrello_ruota", lin((0.12, 0.12, 0.13)), 0.6, 0.0))
    return _MATS


def build_cart(name="carrello"):
    m = _mats()
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    # cestello: pareti sottili con rete nel materiale
    bm = bmesh.new()
    L, W, z0, z1 = 0.82, 0.5, 0.52, 0.92
    cy = -0.05
    t = 0.008
    add_box(bm, (0, cy, z0), (W, L, t))                                   # fondo
    for sx in (-1, 1):
        add_box(bm, (sx * W / 2, cy, (z0 + z1) / 2), (t, L, z1 - z0))      # fianchi
    add_box(bm, (0, cy - L / 2, (z0 + z1) / 2), (W, t, z1 - z0))           # davanti
    add_box(bm, (0, cy + L / 2, (z0 + z1) / 2 + 0.02), (W, t, z1 - z0 - 0.04))  # dietro
    add_box(bm, (0, -0.02, 0.2), (0.44, 0.62, t))                          # ripiano basso
    basket = finish(name + "_cestello", bm, [m["net"]])
    # telaio: bordi del cestello, montanti, manico, base
    bm = bmesh.new()
    for sx in (-1, 1):
        add_cyl(bm, (sx * W / 2, cy, z1), 0.008, L, seg=8, axis="Y")
        add_cyl(bm, (sx * W / 2, cy, z0), 0.008, L, seg=8, axis="Y")
        # montante posteriore che porta al manico
        a, b = Vector((sx * W / 2, cy + L / 2, z0)), Vector((sx * HANDLE["half"], HANDLE["y"], HANDLE["z"]))
        mid, d = (a + b) / 2, (b - a)
        vs = add_cyl(bm, (0, 0, 0), 0.011, d.length, seg=8)
        R = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        for v in vs:
            v.co = Matrix.Translation(mid) @ R @ v.co
        # base: longheroni bassi, arretrati verso il davanti (spazio per i piedi)
        add_cyl(bm, (sx * 0.22, -0.05, 0.13), 0.012, 0.78, seg=8, axis="Y")
        add_cyl(bm, (sx * 0.22, -0.05 - 0.36, 0.3225), 0.01, 0.385, seg=8)  # gambe anteriori: finiscono sotto il fondo (0,5 cm)
        add_cyl(bm, (sx * 0.22, -0.05 + 0.33, 0.3225), 0.01, 0.385, seg=8)  # gambe posteriori
    add_cyl(bm, (0, cy - L / 2, z1), 0.008, W, seg=8, axis="X")
    add_cyl(bm, (0, HANDLE["y"], HANDLE["z"]), 0.012, 2 * HANDLE["half"] + 0.02, seg=10, axis="X")
    frame = finish(name + "_telaio", bm, [m["met"]], smooth=True)
    bm = bmesh.new()
    add_cyl(bm, (0, HANDLE["y"], HANDLE["z"]), 0.019, 2 * HANDLE["half"] - 0.04, seg=16, axis="X")  # impugnatura (attorno al tubo)
    grip = finish(name + "_impugnatura", bm, [m["grip"]], smooth=True)
    for ob in (basket, frame, grip):
        ob.parent = root
    # ruote con forcella
    wheels = []
    for sx in (-1, 1):
        for sy, yy in ((-1, -0.41), (1, 0.28)):
            fork = bpy.data.objects.new(f"{name}_forcella_{sx}_{sy}", None)
            bpy.context.scene.collection.objects.link(fork)
            fork.parent = root
            fork.location = (sx * 0.22, yy, 0.0)
            bm = bmesh.new()
            add_box(bm, (0, 0, WHEEL_R + 0.035), (0.05, 0.03, 0.02))
            for k in (-1, 1):
                add_box(bm, (k * 0.022, 0, WHEEL_R + 0.012), (0.006, 0.03, 0.06))
            add_cyl(bm, (0, 0, WHEEL_R + 0.07), 0.008, 0.05, seg=8)  # perno verso il longherone
            fk = finish(f"{name}_forc_{sx}_{sy}", bm, [m["met"]])
            fk.parent = fork
            bm = bmesh.new()
            add_cyl(bm, (0, 0, 0), WHEEL_R, 0.026, seg=18, axis="X")
            wh = finish(f"{name}_ruota_{sx}_{sy}", bm, [m["wheel"]], smooth=True)
            wh.parent = fork
            wh.location = (0, 0, WHEEL_R + 0.0005)  # la ruota appoggia a terra (0,5 mm d'aria)
            wheels.append(wh)
    root["ruote"] = [w.name for w in wheels]
    return root


def roll_wheels(cart, distance):
    """Rotazione delle ruote coerente con lo spostamento: angolo = distanza / raggio."""
    for n in cart["ruote"]:
        bpy.data.objects[n].rotation_euler = (-distance / WHEEL_R, 0, 0)


def cart_parts(cart):
    return [c for c in cart.children_recursive if c.type == "MESH"]


def note_texture(path, lines):
    """Foglio scritto a mano (testo inventato per la storia: non è un'interfaccia)."""
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGB", (630, 840), (248, 248, 244))
    d = ImageDraw.Draw(im)
    for k in range(14):
        d.line([(30, 120 + k * 52), (600, 120 + k * 52)], fill=(200, 215, 230), width=2)
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 54)
    for i, (txt, col) in enumerate(lines):
        d.text((50, 70 + i * 104), txt, font=f, fill=col)
    im.save(path)
    return path


def build_clipboard(name="cartellina", note=None):
    """note: percorso di un'immagine per il foglio (facoltativo)."""
    m = _mats()
    board = clay("cartellina_legno", lin((0.62, 0.45, 0.3)), 0.6, 0.0)
    paper = clay(name + "_foglio", lin((0.97, 0.97, 0.95)), 0.8, 0.0)
    if note:
        nt = paper.node_tree
        tx = nt.nodes.new("ShaderNodeTexImage")
        tx.image = bpy.data.images.load(note, check_existing=True)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Location"].default_value = (0.5, 0.5, 0)
        mp.inputs["Scale"].default_value = (1 / 0.21, 1, 1 / 0.285)
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        com = nt.nodes.new("ShaderNodeCombineXYZ")
        nt.links.new(tc.outputs["Object"], sep.inputs[0])
        nt.links.new(sep.outputs["X"], com.inputs["X"])
        nt.links.new(sep.outputs["Z"], com.inputs["Y"])
        nt.links.new(com.outputs[0], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], tx.inputs["Vector"])
        nt.links.new(tx.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    bm = bmesh.new()
    add_box(bm, (0, 0, 0), (0.23, 0.006, 0.32))                     # tavoletta (faccia -Y = fronte)
    b = finish(name + "_tavoletta", bm, [board])
    bm = bmesh.new()
    add_box(bm, (0, -0.003 - 0.0005 - 0.0005, -0.0075), (0.21, 0.001, 0.285))  # foglio appoggiato (0,5 mm d'aria), infilato sotto la molla
    p = finish(name + "_foglio", bm, [paper])
    bm = bmesh.new()
    add_box(bm, (0, -0.01175, 0.145), (0.1, 0.0185, 0.03))             # molla in metallo, 0,5 mm dentro la tavoletta
    c = finish(name + "_molla", bm, [m["met"]])
    for ob in (b, p, c):
        ob.parent = root
    return root
