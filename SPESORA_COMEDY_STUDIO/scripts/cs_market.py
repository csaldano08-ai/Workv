"""
Supermercato di EP01 (blockout dettagliato) — Blender 5 / bpy.

Una sola pianta dati (LAYOUT) genera il 3D e la pianta 2D del set: posizioni, corsie, casse, ortofrutta, ufficio, porte, percorsi.
Regole geometriche applicate per costruzione:
- porte e ingresso: il muro ha una VERA apertura (il muro è fatto a segmenti attorno al vano + architrave), telaio incastrato 5 mm nel muro;
- zoccolini interrotti alle aperture, incastrati 5 mm nel muro (nessuna faccia coincidente con il muro);
- prodotti appoggiati sui ripiani con 0,5 mm di aria (nessuna faccia coincidente), etichette nel materiale (nessun adesivo sovrapposto);
- frutta impilata con distanze di contatto calcolate (nessuna sfera dentro l'altra);
- pannelli luminosi 1 cm sotto il soffitto, insegne con spessore proprio.
Nome del supermercato: inventato (SUPER LAMPONE), segnaposto da confermare.
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

from cs_char import _link, clay, lin

STORE_NAME = "SUPER LAMPONE"
H_CEIL = 3.6
WALL_T = 0.2
FONT_B = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"

# ------------------------------------------------------------------ pianta (metri). x: destra, y: verso il fondo. Ingresso a y=0.
LAYOUT = dict(
    store=(-8.0, 8.0, 0.0, 14.0),                       # x0, x1, y0, y1
    entrance=dict(x0=-1.3, x1=1.3, h=2.4),              # vano nel muro frontale (porte scorrevoli)
    cart_area=dict(x=-3.9, y=1.5, n=4),                  # carrelli affiancati, verso +x
    checkouts=[dict(x=2.6, y=2.8, n=1), dict(x=4.6, y=2.8, n=2), dict(x=6.6, y=2.8, n=3)],  # cassa: centro, numero
    gondolas=[dict(x=-0.6, y0=5.6, y1=11.4, name="Pasta e riso"), dict(x=2.0, y0=5.6, y1=11.4, name="Conserve"),
              dict(x=4.6, y0=5.6, y1=11.4, name="Colazione")],
    wall_shelf=dict(x0=-3.0, x1=7.6, y=13.55),           # scaffale lungo il muro di fondo
    produce_tables=[dict(x=-6.6, y=4.6, rot=0, fruit=["mele", "arance"]), dict(x=-6.6, y=6.6, rot=0, fruit=["pomodori", "limoni"]),
                    dict(x=-4.4, y=5.6, rot=0, fruit=["insalata", "zucchine"])],
    displays=[dict(x=-4.2, y=8.4, kind="cipolle", label="CIPOLLE"), dict(x=-2.4, y=8.4, kind="patate", label="PATATE")],
    office=dict(x0=-8.0, x1=-4.4, y0=10.8, y1=14.0, door_x0=-6.2, door_x1=-5.1, door_h=2.1),  # luce libera ≈ 0,98 m (personaggi larghi 0,7 m con le braccia)
)

PALETTE = [(0.85, 0.25, 0.2), (0.95, 0.75, 0.2), (0.2, 0.45, 0.75), (0.3, 0.65, 0.35), (0.95, 0.95, 0.9), (0.75, 0.35, 0.55),
           (0.95, 0.55, 0.2), (0.35, 0.3, 0.6), (0.55, 0.75, 0.85), (0.9, 0.85, 0.65)]


# ------------------------------------------------------------------ primitive su bmesh
def add_box(bm, c, s, rot_z=0.0, uv_front=None):
    """Scatola centrata in c con dimensioni s. uv_front: imposta UV 0..1 sulla faccia -Y (per insegne)."""
    res = bmesh.ops.create_cube(bm, size=1.0)
    M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Diagonal((s[0], s[1], s[2], 1.0))
    for v in res["verts"]:
        v.co = M @ v.co
    return res["verts"]


def add_cyl(bm, c, r, h, seg=14, axis="Z", r2=None):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2 if r2 is not None else r, depth=h)
    R = {"Z": Matrix.Identity(4), "X": Matrix.Rotation(math.pi / 2, 4, "Y"), "Y": Matrix.Rotation(math.pi / 2, 4, "X")}[axis]
    M = Matrix.Translation(Vector(c)) @ R
    for v in res["verts"]:
        v.co = M @ v.co
    return res["verts"]


def add_sphere(bm, c, r, scale=(1, 1, 1), seg=12, rings=8):
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in res["verts"]:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) + Vector(c)
    return res["verts"]


def finish(name, bm, mats, smooth=False, coll=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    return _link(bpy.data.objects.new(name, me), coll)


# ------------------------------------------------------------------ materiali
def mat_tiles(name="pavimento", a=(0.78, 0.76, 0.71), b=(0.71, 0.69, 0.64), tile=0.5):
    m = clay(name, lin(a), 0.45, 0.0)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ch = nt.nodes.new("ShaderNodeTexChecker")
    ch.inputs["Scale"].default_value = 1.0 / tile
    ch.inputs["Color1"].default_value = (*lin(a), 1)
    ch.inputs["Color2"].default_value = (*lin(b), 1)
    br = nt.nodes.new("ShaderNodeTexBrick")  # fughe
    br.inputs["Scale"].default_value = 1.0 / tile
    br.inputs["Mortar Size"].default_value = 0.006 / tile
    br.offset = 0.0
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (1, 1, 1, 1)
    br.inputs["Mortar"].default_value = (0.55, 0.53, 0.5, 1)
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 2.0, 1.0)  # i mattoni diventano piastrelle quadrate
    nt.links.new(tc.outputs["Object"], ch.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], br.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(ch.outputs["Color"], mul.inputs["A"])
    nt.links.new(br.outputs["Color"], mul.inputs["B"])
    nt.links.new(mul.outputs["Result"], bsdf.inputs["Base Color"])
    return m


def mat_products():
    """Un solo materiale per tutti i prodotti: colore dall'attributo 'col' (per faccia), fascia etichetta chiara al centro."""
    m = clay("prodotti", (1, 1, 1), 0.5, 0.1)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "col"
    at2 = nt.nodes.new("ShaderNodeAttribute")
    at2.attribute_name = "band"  # 0..1: altezza relativa nel prodotto (per la fascia etichetta)
    lo = nt.nodes.new("ShaderNodeMath")
    lo.operation = "GREATER_THAN"
    lo.inputs[1].default_value = 0.38
    hi = nt.nodes.new("ShaderNodeMath")
    hi.operation = "LESS_THAN"
    hi.inputs[1].default_value = 0.72
    nt.links.new(at2.outputs["Fac"], lo.inputs[0])
    nt.links.new(at2.outputs["Fac"], hi.inputs[0])
    band = nt.nodes.new("ShaderNodeMath")
    band.operation = "MULTIPLY"
    nt.links.new(lo.outputs[0], band.inputs[0])
    nt.links.new(hi.outputs[0], band.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["B"].default_value = (0.92, 0.9, 0.84, 1)
    nt.links.new(band.outputs[0], mix.inputs["Factor"])
    nt.links.new(at.outputs["Color"], mix.inputs["A"])
    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    return m


def mat_image(name, path, emission=0.0):
    m = clay(name, (1, 1, 1), 0.6, 0.0)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(path, check_existing=True)
    tx.interpolation = "Cubic"
    nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
    if emission:
        nt.links.new(tx.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    return m


def sign_image(path, text, w=1600, h=400, bg=(46, 96, 72), fg=(250, 248, 240), size=None):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    s = size or int(h * 0.5)
    f = ImageFont.truetype(FONT_B, s)
    while d.textlength(text, font=f) > w * 0.9 and s > 10:
        s -= 4
        f = ImageFont.truetype(FONT_B, s)
    d.text((w / 2, h / 2), text, font=f, fill=fg, anchor="mm")
    im.save(path)
    return path


def sign(name, text, c, w, h, workdir, rot_z=0.0, bg=(46, 96, 72), fg=(250, 248, 240), depth=0.04, emission=0.0, two_sided=False):
    """Insegna: scatola con spessore; il testo è una texture sulla faccia frontale (-Y locale) e opzionalmente sul retro."""
    path = sign_image(os.path.join(workdir, f"sign_{name}.png"), text, int(400 * w / h) if w / h < 8 else 3200, 400, bg, fg)
    bm = bmesh.new()
    add_box(bm, (0, 0, 0), (w, depth, h))
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        front = n.y < -0.9 or (two_sided and n.y > 0.9)
        f.material_index = 1 if front else 0
        for l in f.loops:
            co = l.vert.co
            u = (co.x / w + 0.5) if n.y < 0 else (0.5 - co.x / w)
            l[uv].uv = (u, co.z / h + 0.5)
    base = clay(name + "_corpo", lin(tuple(x / 255 for x in bg)), 0.5, 0.0)
    ob = finish("insegna_" + name, bm, [base, mat_image(name + "_testo", path, emission)])
    ob.location = c
    ob.rotation_euler = (0, 0, rot_z)
    return ob


# ------------------------------------------------------------------ muri con aperture vere
def wall(bm, a, b, h, t, openings=(), base_bm=None, base_sides=(1, -1)):
    """Muro da a a b (piano XY), spessore t, altezza h. openings: [(s0, s1, z_top)] in metri lungo il muro.
    Costruisce segmenti pieni tra le aperture e un architrave sopra ognuna: il vano è vuoto davvero.
    base_bm: dove mettere gli zoccolini (interrotti alle aperture), sui lati indicati."""
    a, b = Vector((a[0], a[1], 0.0)), Vector((b[0], b[1], 0.0))
    L = (b - a).length
    d = (b - a).normalized()
    ang = math.atan2(d.y, d.x)
    cuts = sorted(openings)
    solids, s = [], 0.0
    for s0, s1, zt in cuts:
        if s0 > s:
            solids.append((s, s0, 0.0, h))
        solids.append((s0, s1, zt, h))  # architrave
        s = s1
    if s < L:
        solids.append((s, L, 0.0, h))
    for s0, s1, z0, z1 in solids:
        if s1 - s0 < 1e-4 or z1 - z0 < 1e-4:
            continue
        mid = a + d * ((s0 + s1) / 2)
        zb = -0.01 if z0 == 0.0 else z0          # 1 cm dentro il pavimento
        zt = z1 + 0.05 if z1 >= h else z1         # 5 cm dentro il soffitto: nessuna faccia coincidente
        add_box(bm, (mid.x, mid.y, (zb + zt) / 2), (s1 - s0, t, zt - zb), ang)
    if base_bm is not None:
        bh, bt = 0.1, 0.02
        floor_runs = [(s0, s1) for s0, s1, z0, z1 in solids if z0 == 0.0]
        nrm = Vector((-d.y, d.x, 0))
        for s0, s1 in floor_runs:
            mid = a + d * ((s0 + s1) / 2)
            for side in base_sides:
                c = mid + nrm * side * (t / 2 + bt / 2 - 0.005)  # 5 mm dentro il muro
                add_box(base_bm, (c.x, c.y, bh / 2 - 0.0025), (s1 - s0, bt + 0.01, bh + 0.005), ang)


# ------------------------------------------------------------------ costruzione
class Market:
    def __init__(self, workdir, seed=7):
        self.wd = workdir
        os.makedirs(workdir, exist_ok=True)
        self.rng = random.Random(seed)
        self.coll = bpy.data.collections.new("supermercato")
        bpy.context.scene.collection.children.link(self.coll)
        self.objs = {}
        self.M = dict(
            muro=clay("muro", lin((0.86, 0.83, 0.76)), 0.8, 0.0), zoccolo=clay("zoccolo", lin((0.3, 0.36, 0.33)), 0.5, 0.0),
            soffitto=clay("soffitto", lin((0.95, 0.95, 0.93)), 0.9, 0.0), metallo=clay("metallo", lin((0.72, 0.74, 0.74)), 0.45, 0.0),
            scuro=clay("scuro", lin((0.22, 0.24, 0.25)), 0.5, 0.0), legno=clay("legno", lin((0.72, 0.55, 0.36)), 0.65, 0.0),
            verde=clay("verde_spesa", lin((0.18, 0.42, 0.3)), 0.5, 0.0), vetro=self._glass(), luce=self._light_mat(),
            prodotti=mat_products(), banco=clay("banco", lin((0.62, 0.66, 0.68)), 0.4, 0.0), nastro=clay("nastro", lin((0.12, 0.12, 0.13)), 0.6, 0.0),
            porta=clay("porta", lin((0.55, 0.42, 0.3)), 0.5, 0.0), telaio=clay("telaio", lin((0.4, 0.33, 0.27)), 0.5, 0.0),
            maniglia=clay("maniglia", lin((0.75, 0.75, 0.72)), 0.25, 0.0))
        self.M["maniglia"].node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0

    def _glass(self):
        m = bpy.data.materials.new("vetro")
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (0.85, 0.95, 0.95, 1)
        b.inputs["Roughness"].default_value = 0.05
        b.inputs["Transmission Weight"].default_value = 1.0
        b.inputs["IOR"].default_value = 1.2
        return m

    def _light_mat(self):
        m = bpy.data.materials.new("pannello_luce")
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (1, 1, 1, 1)
        b.inputs["Emission Color"].default_value = (1.0, 0.97, 0.9, 1)
        b.inputs["Emission Strength"].default_value = 2.0
        return m

    def put(self, name, ob):
        ob.name = name
        if ob.users_collection and self.coll not in ob.users_collection:
            for c in ob.users_collection:
                c.objects.unlink(ob)
            self.coll.objects.link(ob)
        self.objs[name] = ob
        return ob

    # ---------------------------------------------- guscio: pavimento, muri, soffitto, luci, esterno
    def shell(self):
        x0, x1, y0, y1 = LAYOUT["store"]
        bm = bmesh.new()
        add_box(bm, ((x0 + x1) / 2, (y0 + y1) / 2 + 1.5, -0.05), (x1 - x0 + 2 * WALL_T, y1 - y0 + 3 + 2 * WALL_T, 0.1))
        self.put("pavimento", finish("pavimento", bm, [mat_tiles()]))
        walls, base = bmesh.new(), bmesh.new()
        e = LAYOUT["entrance"]
        t = WALL_T
        # muro frontale (y = 0) con il vano dell'ingresso
        wall(walls, (x0 - t / 2, y0 - t / 2), (x1 + t / 2, y0 - t / 2), H_CEIL, t, [(e["x0"] - (x0 - t / 2), e["x1"] - (x0 - t / 2), e["h"])], base, (1,))
        wall(walls, (x0 - t / 2, y1 + t / 2), (x1 + t / 2, y1 + t / 2), H_CEIL, t, (), base, (-1,))
        wall(walls, (x0 - t / 2, y0 - t), (x0 - t / 2, y1 + t), H_CEIL, t, (), base, (-1,))
        wall(walls, (x1 + t / 2, y0 - t), (x1 + t / 2, y1 + t), H_CEIL, t, (), base, (1,))
        # ufficio: due pareti interne, porta vera in quella frontale
        o = LAYOUT["office"]
        ti = 0.12
        wall(walls, (o["x0"], o["y0"] - ti / 2), (o["x1"] + ti / 2, o["y0"] - ti / 2), H_CEIL, ti,
             [(o["door_x0"] - o["x0"], o["door_x1"] - o["x0"], o["door_h"])], base, (1, -1))
        wall(walls, (o["x1"], o["y0"] - ti), (o["x1"], o["y1"]), H_CEIL, ti, (), base, (1, -1))
        self.put("muri", finish("muri", walls, [self.M["muro"]]))
        self.put("zoccolini", finish("zoccolini", base, [self.M["zoccolo"]]))
        # soffitto + pannelli luminosi 1 cm sotto
        bm = bmesh.new()
        add_box(bm, ((x0 + x1) / 2, (y0 + y1) / 2, H_CEIL + 0.05), (x1 - x0 + 0.4, y1 - y0 + 0.4, 0.1))
        self.put("soffitto", finish("soffitto", bm, [self.M["soffitto"]]))
        bm = bmesh.new()
        for gx in (-5.5, -1.8, 1.8, 5.5):
            for gy in (2.5, 6.0, 9.5, 12.8):
                add_box(bm, (gx, gy, H_CEIL - 0.02), (1.2, 0.6, 0.02))
        self.put("pannelli_luce", finish("pannelli_luce", bm, [self.M["luce"]]))
        for gx in (-5.5, -1.8, 1.8, 5.5):
            for gy in (2.5, 6.0, 9.5, 12.8):
                L = bpy.data.lights.new(f"luce_{gx}_{gy}", "AREA")
                L.shape = "RECTANGLE"
                L.size, L.size_y = 1.2, 0.6
                L.energy = 48
                L.color = (1.0, 0.96, 0.9)
                lo = bpy.data.objects.new(L.name, L)
                lo.location = (gx, gy, H_CEIL - 0.05)
                self.coll.objects.link(lo)
        # esterno visibile dall'ingresso: marciapiede e fondo chiaro
        w = bpy.context.scene.world or bpy.data.worlds.new("w")
        bpy.context.scene.world = w
        w.use_nodes = True
        w.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.86, 0.95, 1)
        w.node_tree.nodes["Background"].inputs[1].default_value = 0.35

    # ---------------------------------------------- ingresso con porte scorrevoli (vetro) e testata
    def entrance(self):
        e = LAYOUT["entrance"]
        bm = bmesh.new()
        t = WALL_T
        # telaio del vano: montanti e traverso incastrati 5 mm nel muro
        fw = 0.08
        for x in (e["x0"] + fw / 2 - 0.005, e["x1"] - fw / 2 + 0.005):
            add_box(bm, (x, -t / 2, e["h"] / 2), (fw, t + 0.04, e["h"]))
        add_box(bm, ((e["x0"] + e["x1"]) / 2, -t / 2, e["h"] - fw / 2 + 0.005), (e["x1"] - e["x0"], t + 0.04, fw))
        # cassonetto del meccanismo sopra il vano (lato interno)
        add_box(bm, ((e["x0"] + e["x1"]) / 2, 0.08, e["h"] + 0.15), (e["x1"] - e["x0"] + 1.6, 0.16, 0.3))
        self.put("ingresso_telaio", finish("ingresso_telaio", bm, [self.M["scuro"]]))
        # due ante di vetro (scorrono verso l'esterno del vano, davanti al muro interno: nessuna compenetrazione)
        self.doors_slide = []
        half = (e["x1"] - e["x0"]) / 2
        for side in (-1, 1):
            bm = bmesh.new()
            add_box(bm, (0, 0, 0), (half - 0.02, 0.025, e["h"] - 0.1))
            ob = finish(f"anta_{'sx' if side < 0 else 'dx'}", bm, [self.M["vetro"]])
            ob.location = ((e["x0"] + e["x1"]) / 2 + side * (half / 2), 0.06, (e["h"] - 0.1) / 2 + 0.01)
            ob["chiusa_x"] = ob.location.x
            ob["lato"] = side
            self.put(ob.name, ob)
            self.doors_slide.append(ob)

    def set_entrance_open(self, k):
        """k 0..1: apertura delle ante scorrevoli."""
        e = LAYOUT["entrance"]
        half = (e["x1"] - e["x0"]) / 2
        for ob in self.doors_slide:
            ob.location.x = ob["chiusa_x"] + ob["lato"] * half * 0.95 * k

    # ---------------------------------------------- porta dell'ufficio (a battente, cerniera vera)
    def office(self):
        o = LAYOUT["office"]
        ti = 0.12
        y = o["y0"] - ti / 2
        bm = bmesh.new()
        fw = 0.06
        for x in (o["door_x0"] + fw / 2 - 0.005, o["door_x1"] - fw / 2 + 0.005):
            add_box(bm, (x, y, o["door_h"] / 2), (fw, ti + 0.03, o["door_h"]))
        # traverso 2 mm più profondo dei montanti per lato: facce frontali non complanari (prima: quadratini scuri da z-fighting agli angoli)
        add_box(bm, ((o["door_x0"] + o["door_x1"]) / 2, y, o["door_h"] - fw / 2 + 0.005), (o["door_x1"] - o["door_x0"], ti + 0.034, fw))
        self.put("porta_telaio", finish("porta_telaio", bm, [self.M["telaio"]]))
        # anta: cerniera sul montante sinistro, si apre verso l'interno dell'ufficio (+y)
        hx = o["door_x0"] + fw - 0.005 + 0.003      # 3 mm di gioco dal montante anche ad anta aperta
        pivot = bpy.data.objects.new("porta_cerniera", None)
        pivot.location = (hx, y + ti / 2 - 0.02, 0)
        self.coll.objects.link(pivot)
        leaf_w = (o["door_x1"] - fw + 0.005) - hx - 0.003  # 3 mm di gioco dal montante opposto
        leaf_h = o["door_h"] - fw + 0.005 - 0.008 - 0.003  # 8 mm da terra, 3 mm dal traverso
        bm = bmesh.new()
        add_box(bm, (leaf_w / 2, -0.02, 0.008 + leaf_h / 2), (leaf_w, 0.04, leaf_h))
        leaf = finish("porta_anta", bm, [self.M["porta"]])
        leaf.parent = pivot
        bm = bmesh.new()
        for sy in (-1, 1):  # maniglie su entrambi i lati, fuori dallo spessore dell'anta
            add_cyl(bm, (leaf_w - 0.08, -0.02 + sy * 0.045, 1.0), 0.012, 0.05, axis="Y")
            add_box(bm, (leaf_w - 0.13, -0.02 + sy * 0.072, 1.0), (0.12, 0.02, 0.022))
        handle = finish("porta_maniglia", bm, [self.M["maniglia"]], smooth=True)
        handle.parent = pivot
        self.door = dict(pivot=pivot, leaf=leaf, handle=handle, width=leaf_w, handle_local=Vector((leaf_w - 0.15, -0.02 - 0.072, 1.0)))
        for ob in (leaf, handle):
            self.put(ob.name, ob)
        self.put("porta_cerniera", pivot)
        # targa "Direzione" sopra la porta (sul muro, lato negozio, con spessore)
        self.put("targa_direzione", sign("direzione", "DIREZIONE", ((o["door_x0"] + o["door_x1"]) / 2, y - ti / 2 - 0.0105, 2.35), 0.9, 0.18, self.wd,
                                          bg=(60, 60, 64), depth=0.02))
        # arredo dell'ufficio
        bm = bmesh.new()
        dx, dy = -6.4, 12.3   # scrivania e sedia: spazio per il direttore (pancia compresa), sedia 14 cm davanti al muro
        add_box(bm, (dx, dy, 0.74), (1.5, 0.75, 0.04))            # piano scrivania
        for sx in (-0.7, 0.7):
            add_box(bm, (dx + sx, dy, 0.36), (0.05, 0.7, 0.72))   # fianchi
        add_box(bm, (dx, dy + 1.3, 0.45), (0.5, 0.5, 0.06))       # sedia del direttore
        add_box(bm, (dx, dy + 1.53, 0.8), (0.5, 0.06, 0.7))
        for sx in (-0.22, 0.22):
            for sy in (-0.22, 0.22):
                add_box(bm, (dx + sx, dy + 1.3 + sy, 0.21), (0.04, 0.04, 0.42))  # gambe della sedia
        self.put("ufficio_arredo", finish("ufficio_arredo", bm, [self.M["legno"]]))
        bm = bmesh.new()
        add_cyl(bm, (-4.9, 13.5, 0.2), 0.18, 0.4, seg=16)          # vaso
        add_sphere(bm, (-4.9, 13.5, 0.75), 0.32, (1, 1, 1.3), seg=14, rings=10)
        self.put("pianta", finish("pianta", bm, [self.M["verde"]], smooth=True))

    def door_angle(self, deg):
        self.door["pivot"].rotation_euler = (0, 0, math.radians(deg))

    def door_handle_world(self):
        return self.door["pivot"].matrix_world @ self.door["handle_local"]

    # ---------------------------------------------- scaffali e prodotti
    def gondola(self, g, idx):
        x, y0, y1 = g["x"], g["y0"], g["y1"]
        L = y1 - y0
        bm = bmesh.new()
        add_box(bm, (x, (y0 + y1) / 2, 0.06), (0.92, L, 0.12))                 # zoccolo
        add_box(bm, (x, (y0 + y1) / 2, 0.95), (0.05, L, 1.7))                   # schiena
        levels = [0.48, 0.86, 1.24, 1.62]
        for z in levels:
            for side in (-1, 1):
                add_box(bm, (x + side * 0.2325, (y0 + y1) / 2, z - 0.0125), (0.425, L, 0.025))
        n_up = int(L / 1.2) + 1
        ups = [y0 + 0.015 + (L - 0.03) * i / (n_up - 1) for i in range(n_up)]  # i montanti di testa sporgono 5 mm: nessuna faccia coincidente
        for yy in ups:
            add_box(bm, (x, yy, 0.95), (0.9, 0.04, 1.7))                        # montanti
        self.put(f"scaffale_{idx}", finish(f"scaffale_{idx}", bm, [self.M["metallo"]]))
        # prodotti su tutti i livelli e su entrambi i lati
        pb = bmesh.new()
        col = pb.faces.layers.float_color.new("col")
        bnd = pb.verts.layers.float.new("band")
        tops = [0.12] + levels
        for side in (-1, 1):
            for li, ztop in enumerate(tops[:-1] if False else tops):
                clear = (tops[li + 1] - 0.025 - ztop - 0.035) if li + 1 < len(tops) else 0.3
                yy = y0 + 0.08
                while yy < y1 - 0.08:
                    kind = self.rng.choice(["box", "box", "can", "bottle", "bag"])
                    c = self.rng.choice(PALETTE)
                    if kind == "box":
                        w, dpt, h = self.rng.uniform(0.12, 0.2), self.rng.uniform(0.07, 0.16), min(clear, self.rng.uniform(0.18, 0.3))
                    elif kind == "can":
                        w = dpt = 2 * self.rng.uniform(0.035, 0.045)
                        h = min(clear, self.rng.uniform(0.1, 0.13))
                    elif kind == "bottle":
                        w = dpt = 2 * 0.04
                        h = min(clear, 0.27)
                    else:
                        w, dpt, h = self.rng.uniform(0.14, 0.2), 0.08, min(clear, self.rng.uniform(0.2, 0.26))
                    n = self.rng.randint(3, 6)
                    for k in range(n):
                        if yy + w > y1 - 0.06:
                            break
                        hit = [u for u in ups if yy - 0.03 < u < yy + w + 0.03]
                        if hit:  # salta il montante: nessun prodotto lo attraversa
                            yy = max(hit) + 0.035
                            if yy + w > y1 - 0.06:
                                break
                        for row in range(2):  # due file in profondità
                            cx = x + side * (0.05 + 0.02 + dpt / 2 + row * (dpt + 0.012))
                            if abs(cx - x) + dpt / 2 > 0.44:
                                continue
                            cz = ztop + 0.0005
                            if kind in ("box", "bag"):
                                vs = add_box(pb, (cx, yy + w / 2, cz + h / 2), (dpt, w * 0.97, h))
                            elif kind == "can":
                                vs = add_cyl(pb, (cx, yy + w / 2, cz + h / 2), w / 2 * 0.97, h, seg=12)
                            else:
                                vs = add_cyl(pb, (cx, yy + w / 2, cz + h * 0.35), w / 2 * 0.97, h * 0.7, seg=12)
                                vs += add_cyl(pb, (cx, yy + w / 2, cz + h * 0.85), w / 2 * 0.4, h * 0.3, seg=10, r2=w / 2 * 0.22)
                            for v in vs:
                                v[bnd] = (v.co.z - cz) / max(1e-3, h)
                            fs = {f for v in vs for f in v.link_faces}
                            for f in fs:
                                f[col] = (*lin(c), 1.0)
                        yy += w + 0.01
                    yy += 0.02
        self.put(f"prodotti_{idx}", finish(f"prodotti_{idx}", pb, [self.M["prodotti"]]))
        # cartello sospeso della corsia (fronte e retro)
        self.put(f"cartello_{idx}", sign(f"corsia_{idx}", g["name"], (x, y0 - 0.2, 2.75), 1.8, 0.36, self.wd, rot_z=0.0, two_sided=True))
        self.hang(f"corsia_{idx}", x, y0 - 0.2, 2.75 + 0.18 - 0.005, 1.8)

    # ---------------------------------------------- ortofrutta
    def crate(self, bm, c, w, d, h):
        """Cassetta di legno aperta: fondo + 4 sponde (spessore 1,5 cm). Ritorna la quota del fondo interno."""
        t = 0.015
        cx, cy, cz = c
        add_box(bm, (cx, cy, cz + t / 2), (w, d, t))
        for sx in (-1, 1):
            add_box(bm, (cx + sx * (w / 2 - t / 2), cy, cz + h / 2), (t, d, h))
        for sy in (-1, 1):
            add_box(bm, (cx, cy + sy * (d / 2 - t / 2), cz + h / 2), (w - 2 * t, t, h))
        return cz + t, (w - 2 * t, d - 2 * t)

    FRUIT = {"mele": ((0.8, 0.15, 0.12), 0.04, (1, 1, 0.92)), "arance": ((0.95, 0.55, 0.12), 0.042, (1, 1, 1)),
             "pomodori": ((0.85, 0.12, 0.1), 0.038, (1, 1, 0.85)), "limoni": ((0.95, 0.85, 0.25), 0.036, (1, 0.8, 0.8)),
             "insalata": ((0.45, 0.72, 0.3), 0.07, (1, 1, 0.8)), "zucchine": ((0.25, 0.5, 0.2), 0.025, (1, 4.0, 1)),
             "cipolle": ((0.78, 0.55, 0.28), 0.04, (1, 1, 0.9)), "patate": ((0.66, 0.5, 0.32), 0.038, (1.25, 1, 0.85))}

    def fill_crate(self, bm, col, kind, floor_z, inner, center, layers=2):
        """Frutti impilati: primo strato appoggiato sul fondo, secondo strato negli incavi (distanza di contatto calcolata)."""
        c_lin, r, sc = self.FRUIT[kind]
        rx, ry, rz = r * sc[0], r * sc[1], r * sc[2]
        nx, ny = max(1, int(inner[0] // (2 * rx + 0.004))), max(1, int(inner[1] // (2 * ry + 0.004)))
        sx, sy = inner[0] / nx, inner[1] / ny
        out = []
        for layer in range(layers):
            off = 0.5 if layer else 0.0
            z = floor_z + rz + 0.0008 + layer * (math.sqrt(max(0.0, (2 * rz) ** 2 - ((sx / 2) ** 2 + (sy / 2) ** 2) * (rz / max(rx, ry)) ** 2)) + 0.002)
            for i in range(nx - (1 if layer else 0)):
                for j in range(ny - (1 if layer else 0)):
                    px = center[0] - inner[0] / 2 + sx * (i + 0.5 + off)
                    py = center[1] - inner[1] / 2 + sy * (j + 0.5 + off)
                    vs = add_sphere(bm, (px, py, z), 1.0, (rx * 0.97, ry * 0.97, rz), seg=10, rings=7)
                    if kind == "cipolle":
                        vs += add_cyl(bm, (px, py, z + rz + 0.008), 0.008, 0.02, seg=6, r2=0.001)
                    for f in {f for v in vs for f in v.link_faces}:
                        f[col] = (*lin(tuple(min(1, max(0, x + self.rng.uniform(-0.05, 0.05))) for x in c_lin)), 1.0)
                    out.append((px, py, z))
        return out

    def produce(self):
        wood, fruit = bmesh.new(), bmesh.new()
        col = fruit.faces.layers.float_color.new("col")
        tab = bmesh.new()
        for t in LAYOUT["produce_tables"]:
            x, y = t["x"], t["y"]
            add_box(tab, (x, y, 0.72), (1.4, 1.0, 0.04))
            for sx in (-0.65, 0.65):
                for sy in (-0.45, 0.45):
                    add_box(tab, (x + sx, y + sy, 0.35), (0.05, 0.05, 0.7))
            for k, kind in enumerate(t["fruit"]):
                cx = x - 0.34 + k * 0.68
                fz, inner = self.crate(wood, (cx, y, 0.7405), 0.6, 0.9, 0.16)
                self.fill_crate(fruit, col, kind, fz, inner, (cx, y))
        # due espositori della gag A (cipolle e patate) con cartello
        self.onion_spots = []
        for dsp in LAYOUT["displays"]:
            x, y = dsp["x"], dsp["y"]
            if dsp["kind"] == "cipolle":
                # espositore su ruote (tavolo + cassetta + cipolle): un gruppo unico che i dipendenti spingono via nella gag A
                tb, cw, cf, wh = bmesh.new(), bmesh.new(), bmesh.new(), bmesh.new()
                ccol = cf.faces.layers.float_color.new("col")
                add_box(tb, (0, 0, 0.7), (0.9, 0.7, 0.04))
                for sx in (-0.4, 0.4):
                    for sy in (-0.3, 0.3):
                        add_box(tb, (sx, sy, 0.375), (0.05, 0.05, 0.61))          # gambe fino a 7 cm da terra
                        add_cyl(wh, (sx, sy, 0.0305), 0.03, 0.025, seg=14, axis="X")  # ruotine appoggiate (0,5 mm)
                        add_box(wh, (sx, sy, 0.065), (0.035, 0.03, 0.012))
                fz, inner = self.crate(cw, (0, 0, 0.7205), 0.8, 0.6, 0.2)
                self.onion_spots = self.fill_crate(cf, ccol, "cipolle", fz, inner, (0, 0), layers=2)
                root = bpy.data.objects.new("espositore_cipolle", None)
                self.coll.objects.link(root)
                root.location = (x, y, 0.0)
                self.onion_crate = root
                self.onion_crate_home = Vector((x, y, 0.0))
                self._onion_parts = (tb, cw, cf, wh)
                continue
            add_box(tab, (x, y, 0.7), (0.9, 0.7, 0.04))
            for sx in (-0.4, 0.4):
                for sy in (-0.3, 0.3):
                    add_box(tab, (x + sx, y + sy, 0.34), (0.05, 0.05, 0.68))
            fz, inner = self.crate(wood, (x, y, 0.7205), 0.8, 0.6, 0.2)
            self.fill_crate(fruit, col, dsp["kind"], fz, inner, (x, y), layers=2)
        for dsp in LAYOUT["displays"]:
            x, y = dsp["x"], dsp["y"]
            sg = self.put(f"cartello_{dsp['kind']}", sign(dsp["kind"], dsp["label"], (x, y - 0.36, 1.33), 0.7, 0.2, self.wd, bg=(250, 246, 235), fg=(46, 96, 72), depth=0.015))
            bm = bmesh.new()
            add_box(bm, (x, y - 0.32, 1.0), (0.02, 0.02, 0.62))  # asta del cartello, appoggiata al piano
            st = self.put(f"asta_{dsp['kind']}", finish(f"asta_{dsp['kind']}", bm, [self.M["scuro"]]))
            if dsp["kind"] == "cipolle":
                for ob in (sg, st):
                    mw = ob.matrix_world.copy()
                    ob.parent = self.onion_crate
                    ob.matrix_parent_inverse = self.onion_crate.matrix_world.inverted()
                    ob.matrix_world = mw
        self.put("ortofrutta_tavoli", finish("ortofrutta_tavoli", tab, [self.M["verde"]]))
        self.put("ortofrutta_cassette", finish("ortofrutta_cassette", wood, [self.M["legno"]]))
        m = clay("frutta", (1, 1, 1), 0.45, 0.2)
        nt = m.node_tree
        at = nt.nodes.new("ShaderNodeAttribute")
        at.attribute_name = "col"
        nt.links.new(at.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
        self.put("ortofrutta_frutta", finish("ortofrutta_frutta", fruit, [m], smooth=True))
        tb, cw, cf, wh = self._onion_parts
        parts = [finish("espositore_cipolle_tavolo", tb, [self.M["verde"]]), finish("espositore_cipolle_cassetta", cw, [self.M["legno"]]),
                 finish("espositore_cipolle_frutta", cf, [m], smooth=True), finish("espositore_cipolle_ruote", wh, [self.M["scuro"]], smooth=True)]
        for ob in parts:
            ob.parent = self.onion_crate
            self.put(ob.name, ob)
        self.put("espositore_cipolle", self.onion_crate)
        self.put("cartello_ortofrutta", sign("ortofrutta", "FRUTTA E VERDURA", (-5.6, 3.6, 2.75), 2.6, 0.42, self.wd, two_sided=True))
        self.hang("ortofrutta", -5.6, 3.6, 2.75 + 0.21 - 0.005, 2.6)

    # ---------------------------------------------- casse
    def checkouts(self):
        bm, belt, lamp = bmesh.new(), bmesh.new(), bmesh.new()
        self.cassa_lights = {}
        for ck in LAYOUT["checkouts"]:
            x, y = ck["x"], ck["y"]
            add_box(bm, (x, y, 0.425), (0.6, 2.0, 0.85))                     # banco
            add_box(belt, (x, y + 0.2, 0.86), (0.46, 1.5, 0.02))             # nastro appoggiato sul banco
            add_box(bm, (x + 0.42, y - 0.55, 0.6), (0.24, 0.5, 0.04))        # cassiere: piano laterale
            add_box(bm, (x - 0.05, y - 0.75, 0.97), (0.3, 0.25, 0.22))       # registratore
            add_box(lamp, (x - 0.28, y - 0.95, 1.2), (0.04, 0.04, 2.4 - 0.0))  # palo del numero (da terra)
            self.put(f"numero_cassa_{ck['n']}", sign(f"cassa{ck['n']}", str(ck["n"]), (x - 0.28, y - 0.95, 2.52), 0.36, 0.3, self.wd, bg=(46, 96, 72), depth=0.06, two_sided=True))
            L = bpy.data.lights.new(f"luce_cassa_{ck['n']}", "POINT")
            L.energy = 0.0
            L.color = (0.8, 1.0, 0.82)  # tinta leggera: un verde saturo colorava di verde le teste bianche vicine
            L.shadow_soft_size = 0.05
            lo = bpy.data.objects.new(L.name, L)
            lo.location = (x - 0.28, y - 0.95, 2.75)
            self.coll.objects.link(lo)
            self.cassa_lights[ck["n"]] = lo
        self.put("casse", finish("casse", bm, [self.M["banco"]]))
        self.put("casse_nastri", finish("casse_nastri", belt, [self.M["nastro"]]))
        self.put("casse_pali", finish("casse_pali", lamp, [self.M["scuro"]]))
        self.put("cartello_casse", sign("casse", "CASSE", (4.6, 1.4, 2.95), 1.6, 0.36, self.wd, two_sided=True))
        self.hang("casse", 4.6, 1.4, 2.95 + 0.18 - 0.005, 1.6)
        self.put("cartello_uscita", sign("uscita", "USCITA", (0.0, 0.25, 2.95), 1.0, 0.28, self.wd, bg=(40, 140, 70), two_sided=True))
        self.hang("uscita", 0.0, 0.25, 2.95 + 0.14 - 0.005, 1.0)

    def set_cassa_open(self, n, on):
        self.cassa_lights[n].data.energy = 14.0 if on else 0.0

    # ---------------------------------------------- scaffale a muro, insegna del negozio, carrelli
    def back_and_brand(self):
        ws = LAYOUT["wall_shelf"]
        bm = bmesh.new()
        L = ws["x1"] - ws["x0"]
        add_box(bm, ((ws["x0"] + ws["x1"]) / 2, ws["y"], 0.95), (L, 0.04, 1.9))
        for z in (0.12, 0.5, 0.9, 1.3, 1.7):
            add_box(bm, ((ws["x0"] + ws["x1"]) / 2, ws["y"] - 0.22, z - 0.0125), (L, 0.42, 0.025))
        self.put("scaffale_muro", finish("scaffale_muro", bm, [self.M["metallo"]]))
        pb = bmesh.new()
        col = pb.faces.layers.float_color.new("col")
        bnd = pb.verts.layers.float.new("band")
        for z0, z1 in ((0.12, 0.5), (0.5, 0.9), (0.9, 1.3), (1.3, 1.7)):
            xx = ws["x0"] + 0.1
            while xx < ws["x1"] - 0.25:
                c = self.rng.choice(PALETTE)
                w, h = self.rng.uniform(0.1, 0.18), min(z1 - z0 - 0.08, self.rng.uniform(0.18, 0.3))
                for k in range(self.rng.randint(3, 6)):
                    if xx + w > ws["x1"] - 0.1:
                        break
                    vs = add_box(pb, (xx + w / 2, ws["y"] - 0.15, z0 + 0.0005 + h / 2), (w * 0.97, 0.16, h))
                    for v in vs:
                        v[bnd] = (v.co.z - z0) / h
                    for f in {f for v in vs for f in v.link_faces}:
                        f[col] = (*lin(c), 1.0)
                    xx += w + 0.01
                xx += 0.03
        self.put("prodotti_muro", finish("prodotti_muro", pb, [self.M["prodotti"]]))
        self.put("insegna_negozio", sign("negozio", STORE_NAME, (2.3, LAYOUT["store"][3] - 0.0255, 2.65), 4.2, 0.6, self.wd, bg=(200, 40, 80), depth=0.05))

    def carts(self, build_cart):
        ca = LAYOUT["cart_area"]
        self.parked = []
        for i in range(ca["n"]):
            c = build_cart(f"carrello_fila_{i}")
            c.location = (ca["x"] + i * 0.62, ca["y"], 0)  # affiancati: 0,62 m di passo, 0,5 m di larghezza → 12 cm d'aria
            c.rotation_euler = (0, 0, 0)
            self.put(c.name, c)
            self.parked.append(c)

    def hang(self, name, x, y, z_top, w):
        bm = bmesh.new()
        for sx in (-0.4, 0.4):
            add_cyl(bm, (x + sx * w, y, (z_top + H_CEIL + 0.02) / 2), 0.004, H_CEIL + 0.02 - z_top + 0.01, seg=6)
        self.put("tiranti_" + name, finish("tiranti_" + name, bm, [self.M["scuro"]]))

    def build(self, build_cart=None):
        self.shell()
        self.entrance()
        self.office()
        for i, g in enumerate(LAYOUT["gondolas"]):
            self.gondola(g, i)
        self.produce()
        self.checkouts()
        self.back_and_brand()
        if build_cart:
            self.carts(build_cart)
        return self
