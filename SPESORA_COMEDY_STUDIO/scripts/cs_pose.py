"""
Libreria di pose (spazio del corpo: il personaggio guarda -Y, X = sua sinistra, Z = su, piedi a z=0).
Ogni posa è un dizionario per Character.pose(). Le mani si danno come (posizione del polso, direzione delle dita, normale del palmo).
"""
import math

from mathutils import Matrix, Vector

FEET = {"foot.L": ((0.115, 0.0, 0.05), 5, 0), "foot.R": ((-0.115, 0.0, 0.05), -5, 0)}  # caviglia a 5 cm: suola a 2 mm dal pavimento


def idle(ch, relax=1.0):
    P = dict(FEET)
    for side, sg in (("L", 1), ("R", -1)):
        hx = ch.spec["torso_bot"] + 0.2           # le mani stanno fuori dal busto qualunque sia la corporatura
        hz = ch.z_tb + 0.16
        P[f"hand.{side}"] = ((sg * hx, -0.05, hz), (sg * 0.15, -0.2, -1.0), (-sg, 0.0, 0.0))
        P[f"elbow.{side}"] = (sg * 0.7, 0.18, 0.85)  # gomito verso fuori e appena indietro: braccio rilassato
        P[f"fingers.{side}"] = (22, 26, 30, 10)
    return P


def with_(P, **kw):
    Q = dict(P)
    Q.update({k.replace("__", "."): v for k, v in kw.items()})
    return Q


def point(ch, side="R"):
    sg = 1 if side == "L" else -1
    P = idle(ch)
    P[f"hand.{side}"] = ((sg * 0.7, -0.12, 1.16), (sg * 1.0, -0.12, 0.1), (0, 0, -1))
    P[f"elbow.{side}"] = (sg * 0.5, 0.3, 0.9)
    P[f"fingers.{side}"] = (0, 92, 98, 55)
    P["chest_rot"] = (0, -sg * 8, 0)
    P["head_rot"] = (0, -sg * 14, 0)
    return P


def wave(ch, side="L", t=0.0):
    sg = 1 if side == "L" else -1
    P = idle(ch)
    a = math.sin(t * 2 * math.pi * 2.2) * 18
    P[f"hand.{side}"] = ((sg * 0.5, -0.12, 1.5), (sg * math.sin(math.radians(a)) * 0.6, 0.0, 1.0), (0, -1, 0))
    P[f"elbow.{side}"] = (sg * 0.75, 0.1, 1.05)
    P[f"fingers.{side}"] = (4, 2, 4, 6)
    P[f"spread.{side}"] = 10
    P["head_rot"] = (0, 0, -sg * 6)
    return P


def shrug(ch):
    P = idle(ch)
    for side, sg in (("L", 1), ("R", -1)):
        P[f"hand.{side}"] = ((sg * 0.44, -0.38, 0.88), (sg * 0.55, -0.7, 0.15), (0, 0, 1))
        P[f"elbow.{side}"] = (sg * 0.55, 0.15, 0.7)
        P[f"fingers.{side}"] = (8, 8, 10, 4)
        P[f"spread.{side}"] = 8
        P[f"shrug.{side}"] = 22
    P["head_rot"] = (-6, 0, 10)
    P["chest_rot"] = (-3, 0, 0)
    return P


def think(ch, side="R", hand_z=1.1):
    sg = 1 if side == "L" else -1
    P = idle(ch)
    P[f"hand.{side}"] = ((sg * 0.04, -0.3, hand_z), (-sg * 0.2, 0.15, 1.0), (0, 1, 0.1))
    P[f"elbow.{side}"] = (sg * 0.6, -0.25, 0.85)
    P[f"fingers.{side}"] = (95, 100, 105, 60)
    P["head_rot"] = (-5, sg * 6, sg * 8)
    return P


# ---------------------------------------------------------------- telefono
# socket: posizione e orientamento del telefono nello spazio dell'osso mano (Y lungo le dita, Z = normale del palmo).
# "read": lo schermo guarda chi lo tiene (palmo verso il viso). "show": lo schermo guarda chi sta davanti.
def phone_socket(ch, mode="read", gap=0.0015):
    """Il telefono poggia sul palmo con la larghezza lungo le dita; il bordo lontano sta 2 mm prima delle nocche,
    così le dita possono avvolgerlo. Valori ricavati dalle ossa reali della mano."""
    from cs_scene import PHONE_T, PHONE_W
    hs = ch.spec["hand_scale"]
    hb = ch.rig.data.bones[f"hand.R"]
    knuck = min((ch.rig.data.bones[f"{f}_1.R"].head_local - hb.head_local).length for f in ("index", "middle", "ring"))
    finger_r = 0.0105 * hs
    z = 0.018 * hs + PHONE_T / 2 + gap
    y = knuck - PHONE_W / 2 - finger_r - 0.002
    if mode == "read":
        cols = (Vector((0, -1, 0)), Vector((0, 0, -1)), Vector((1, 0, 0)))
    else:
        cols = (Vector((0, 1, 0)), Vector((0, 0, -1)), Vector((-1, 0, 0)))
    M = Matrix(cols).transposed().to_4x4()
    M.translation = Vector((0.0, y, z))
    return M


def read_phone(ch, side="R"):
    sg = 1 if side == "L" else -1
    P = idle(ch)
    P[f"hand.{side}"] = ((sg * 0.12, -0.4, 1.0), (-sg * 1.0, 0.05, 0.18), (sg * 0.08, 0.5, 0.86))
    P[f"elbow.{side}"] = (sg * 0.55, 0.1, 0.7)
    P["head_rot"] = (16, sg * 6, 0)
    P["chest_rot"] = (4, 0, 0)
    return P


def show_phone(ch, side="R"):
    sg = 1 if side == "L" else -1
    P = idle(ch)
    P[f"hand.{side}"] = ((sg * 0.3, -0.56, 1.16), (-sg * 0.9, 0.0, 0.42), (0, -1, 0.12))
    P[f"elbow.{side}"] = (sg * 0.7, 0.05, 0.85)
    P["head_rot"] = (-4, -sg * 12, 0)
    return P


def place_prop(ch, prop, side, socket):
    """Mette l'oggetto nel socket della mano (posizione assoluta calcolata dalla posa attuale: nessun salto)."""
    ch.update()
    hb = ch.rig.pose.bones[f"hand.{side}"]
    prop.matrix_world = ch.rig.matrix_world @ hb.matrix @ socket
    ch.update()


def solve_grip(ch, prop, side, fingers=("index", "middle", "ring", "thumb"), step=2.0, tol=0.0003, screen=None):
    """Chiude ogni dito finché TOCCA l'oggetto senza entrarci, prima la falange vicina poi quella lontana.
    Se screen=(w, h, t) la falange lontana si ferma prima di coprire lo schermo. Controllo sulla mesh valutata (BVH)."""
    from cs_qc import bvh, world_mesh, inside
    hand = ch.parts[f"hand.{side}"]
    tb = bvh(prop)[0]
    pbs = ch.rig.pose.bones
    inv = prop.matrix_world.inverted()

    def measure(f):
        ch.update()
        va, _, ga = world_mesh(hand)
        depth, gap, cover = 0.0, 9.0, 0
        for i, v in enumerate(va):
            if ga[i] not in (f"{f}_1.{side}", f"{f}_2.{side}"):
                continue
            ins, dist = inside(tb, v)
            if ins:
                depth = max(depth, dist)
            else:
                gap = min(gap, dist)
            if screen:
                p = inv @ v
                if abs(p.x) < screen[0] / 2 and abs(p.z) < screen[1] / 2 and -screen[2] / 2 - 0.04 < p.y < -screen[2] / 2 + 0.0005:
                    cover += 1
        return depth, gap, cover

    result = {}
    for f in fingers:
        b1, b2 = pbs[f"{f}_1.{side}"], pbs[f"{f}_2.{side}"]
        a1, a2 = -30.0, 0.0
        # 1) parti aperto (anche oltre il dritto) finché non c'è compenetrazione
        while True:
            b1.rotation_euler = (math.radians(a1), 0, 0)
            b2.rotation_euler = (math.radians(a2), 0, 0)
            d, g, c = measure(f)
            if d <= tol or a1 <= -60:
                break
            a1 -= 4
        # 2) chiudi la prima falange fino al contatto
        while a1 < 110:
            b1.rotation_euler = (math.radians(a1 + step), 0, 0)
            d, g, c = measure(f)
            if d > tol:
                break
            a1 += step
            if g < 0.0012:
                break
        b1.rotation_euler = (math.radians(a1), 0, 0)
        # 3) chiudi la seconda falange fino al contatto, senza coprire lo schermo
        while a2 < 110:
            b2.rotation_euler = (math.radians(a2 + step), 0, 0)
            d, g, c = measure(f)
            if d > tol or c > 0:
                break
            a2 += step
            if g < 0.0012:
                break
        b2.rotation_euler = (math.radians(a2), 0, 0)
        d, g, c = measure(f)
        result[f] = dict(falange1=round(a1, 1), falange2=round(a2, 1), contatto_mm=round(g * 1000, 2), dentro_mm=round(d * 1000, 2), copre_schermo=c)
    return result


def grip_pose(result):
    """Converte il risultato del risolutore in rotazioni fisse per Character.pose()."""
    return {f: (r["falange1"], r["falange2"]) for f, r in result.items()}


def solve_elbow(ch, P, side, prefer=None, steps=24, radius=0.45):
    """Sceglie la direzione del gomito più vicina a quella voluta SENZA che braccio o mano entrino nel busto.
    Prova le direzioni attorno all'asse spalla-polso; costo = compenetrazione (molto pesante) + distanza angolare dalla preferita."""
    from cs_qc import penetration
    hand = P.get(f"hand.{side}")
    if not hand:
        return None
    ch.pose(P)
    sh = ch.rig.pose.bones[f"upperarm.{side}"].head.copy()
    wr = Vector(hand[0])
    ax = (wr - sh).normalized()
    mid = (sh + wr) / 2
    pref = Vector(prefer or P.get(f"elbow.{side}") or (sh + Vector((1 if side == "L" else -1, 0.2, 0))))
    pd = (pref - mid)
    pd = (pd - ax * pd.dot(ax)).normalized()
    u = pd
    w = ax.cross(u).normalized()
    best = None
    tried = []
    for k in range(steps):
        a = 2 * math.pi * k / steps
        dvec = u * math.cos(a) + w * math.sin(a)
        Q = dict(P)
        Q[f"elbow.{side}"] = tuple(mid + dvec * radius)
        ch.pose(Q)
        shw = ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{side}"].head
        from cs_qc import ARM_ROOT
        ra = penetration(ch.parts[f"arm.{side}"], ch.parts["torso"], ignore=lambda v, g: (v - shw).length < ARM_ROOT)
        rh = penetration(ch.parts[f"hand.{side}"], ch.parts["torso"])
        pen = ra["depth_mm"] + rh["depth_mm"]
        ang = math.degrees(min(a, 2 * math.pi - a))
        cost = pen * 1000 + ang
        tried.append((round(ang), pen))
        if best is None or cost < best[0]:
            best = (cost, Q[f"elbow.{side}"], pen, ang)
    P[f"elbow.{side}"] = best[1]
    ch.pose(P)
    return dict(compenetrazione_mm=best[2], scarto_dalla_posa_gradi=round(best[3], 1))


def approach_contact(ch, P, side, target_ob, target_point, gap_mm=2.0, max_iter=60, step=0.004):
    """Avvicina il polso al punto bersaglio finché la mano tocca l'oggetto (distanza < gap) senza entrarci."""
    from cs_qc import nearest_gap, penetration
    pos, fd, pn = P[f"hand.{side}"]
    pos = Vector(pos)
    g = None
    for _ in range(max_iter):
        ch.pose(P)
        g = nearest_gap(ch.parts[f"hand.{side}"], target_ob)
        pen = penetration(ch.parts[f"hand.{side}"], target_ob)["depth_mm"]
        if pen > 0:
            pos -= (Vector(target_point) - pos).normalized() * step
            P[f"hand.{side}"] = (tuple(pos), fd, pn)
            ch.pose(P)
            g = nearest_gap(ch.parts[f"hand.{side}"], target_ob)
            break
        if g <= gap_mm:
            break
        pos += (Vector(target_point) - pos).normalized() * min(step, g / 1000 * 0.8)
        P[f"hand.{side}"] = (tuple(pos), fd, pn)
    return dict(distanza_mm=g)
