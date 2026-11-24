"""
Controlli geometrici sulle mesh VALUTATE (dopo armatura e modificatori; il guscio del contorno è escluso perché attivo solo in render).

- penetration(a, b): quanto i vertici di A entrano dentro B (profondità massima in mm, numero di vertici) + coppie di triangoli che si intersecano.
- min_z(ob): punto più basso (piedi sul pavimento).
- screen_cover(hand, phone): vertici della mano davanti all'area dello schermo.
Non basta l'intersezione dei bounding box: si misura la profondità reale con il punto più vicino e la normale.
"""
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ARM_ROOT = 0.12   # m: tratto del braccio che nasce dentro il busto per costruzione (attacco alla spalla)
LEG_ROOT = 0.16   # m: idem per la gamba all'anca


def world_mesh(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    M = ob.matrix_world
    verts = [M @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    groups = None
    if ob.vertex_groups:
        names = {g.index: g.name for g in ob.vertex_groups}
        groups = []
        for v in ob.data.vertices:  # stessa topologia: l'armatura non cambia i vertici
            best = max(v.groups, key=lambda g: g.weight, default=None)
            groups.append(names[best.group] if best else "")
        if len(groups) != len(verts):
            groups = None
    ev.to_mesh_clear()
    return verts, polys, groups


def bvh(ob):
    verts, polys, groups = world_mesh(ob)
    return BVHTree.FromPolygons(verts, polys), verts, polys, groups


def inside(tree, v, max_probe=0.06):
    """(dentro?, distanza dalla superficie). Normale della faccia più vicina + conferma con un raggio (parità degli attraversamenti)."""
    hit = tree.find_nearest(v, max_probe)
    if hit[0] is None:
        return False, 9.0
    loc, nrm, idx, dist = hit
    if (v - loc).dot(nrm) >= 0:
        return False, dist
    n_hits, o = 0, v.copy()
    d = Vector((0.0, 0.0, 1.0))
    for _ in range(30):
        h = tree.ray_cast(o, d)
        if h[0] is None:
            break
        n_hits += 1
        o = h[0] + d * 1e-5
    return n_hits % 2 == 1, dist


def penetration(a, b, ignore=None, max_probe=0.06):
    """Profondità massima (m) dei vertici di A dentro la superficie chiusa di B. ignore(v, group) → True per saltare (zone innestate di proposito)."""
    tb, vb, pb, _ = bvh(b)
    ta, va, pa, ga = bvh(a)
    depth, count, worst = 0.0, 0, None
    for i, v in enumerate(va):
        if ignore and ignore(v, ga[i] if ga else ""):
            continue
        hit = tb.find_nearest(v, max_probe)
        if hit[0] is None:
            continue
        loc, nrm, idx, dist = hit
        if (v - loc).dot(nrm) < 0:  # dalla parte interna della faccia più vicina
            # conferma con un raggio: un punto dentro un solido chiuso incontra un numero dispari di superfici
            n_hits, o = 0, v.copy()
            d = Vector((0.0, 0.0, 1.0))
            for _ in range(30):
                h = tb.ray_cast(o, d)
                if h[0] is None:
                    break
                n_hits += 1
                o = h[0] + d * 1e-5
            if n_hits % 2 == 1:
                count += 1
                if dist > depth:
                    depth, worst = dist, (i, ga[i] if ga else "")
    pairs = len(ta.overlap(tb))
    return dict(depth_mm=round(depth * 1000, 2), verts_inside=count, tri_pairs=pairs, worst=worst)


def min_z(ob):
    verts, _, _ = world_mesh(ob)
    return min(v.z for v in verts)


def nearest_gap(a, b, group_filter=None):
    """Distanza minima (mm) tra i vertici di A (opz. solo certi gruppi) e la superficie di B."""
    tb, _, _, _ = bvh(b)
    va, _, ga = world_mesh(a)
    best = 9.0
    for i, v in enumerate(va):
        if group_filter and ga and not group_filter(ga[i]):
            continue
        hit = tb.find_nearest(v, 0.2)
        if hit[0] is not None:
            best = min(best, hit[3])
    return round(best * 1000, 2)


def screen_cover(hand, phone, screen_w, screen_h, thick):
    """Vertici della mano che stanno davanti allo schermo (nello spazio del telefono: davanti = -Y)."""
    inv = phone.matrix_world.inverted()
    va, _, _ = world_mesh(hand)
    n = 0
    for v in va:
        p = inv @ v
        if abs(p.x) < screen_w / 2 and abs(p.z) < screen_h / 2 and p.y < -thick / 2 + 0.0005 and p.y > -thick / 2 - 0.05:
            n += 1
    return n
