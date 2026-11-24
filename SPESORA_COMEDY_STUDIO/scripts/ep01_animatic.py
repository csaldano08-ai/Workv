"""
EP01 · L'uomo che diventò direttore del supermercato · animatic 3D (≈ 95 s, 1080×1920 a 30 fps, render a bassa risoluzione).

    ADS_MODE=storyboard|render  ADS_RES=432x768  ADS_SAMPLES=6  ADS_RANGE=0-95  python ep01_animatic.py <out_dir>

storyboard: un fotogramma per inquadratura (tavola dello storyboard). render: tutti i fotogrammi dell'intervallo.
Scrive anche cue.json (inquadrature, battute, tempi) e qc_animatic.json (controlli ogni 15 fotogrammi).
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

import cs_pose as PO  # noqa: E402
import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_actor import Actor, body_matrix, head_world, look, resolve_target  # noqa: E402
from cs_char import Character  # noqa: E402
from cs_face import draw_face  # noqa: E402
from cs_market import LAYOUT, Market  # noqa: E402
from cs_props import GRIP_L, GRIP_R, build_cart, build_clipboard, cart_parts, note_texture, roll_wheels  # noqa: E402
from cs_walk import ease  # noqa: E402

OUT = os.path.abspath(sys.argv[1])
MODE = os.environ.get("ADS_MODE", "storyboard")
RES = tuple(int(v) for v in os.environ.get("ADS_RES", "432x768").split("x"))
SAMPLES = int(os.environ.get("ADS_SAMPLES", "6"))
RANGE = tuple(float(v) for v in os.environ.get("ADS_RANGE", "0-95").split("-"))
FPS = 30
DUR = 95.0
os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
WD = os.path.join(OUT, "_wd")
os.makedirs(WD, exist_ok=True)

# ====================================================================== narrazione e battute (tempi di partenza)
NARR = [("N01", 0.5), ("N02", 5.9), ("N03", 7.2), ("N04", 10.2), ("N05", 21.8), ("N06", 25.4), ("N07", 32.0), ("N08", 33.1),
        ("N09", 38.2), ("N10", 45.2), ("N11", 52.2), ("N12", 57.2), ("N13", 61.8), ("N14", 74.6), ("N15", 79.4), ("N16", 90.6)]
CHAR_LINES = [("P01", "PROTAGONISTA", "Ma… le cipolle?", 86.0, 87.3), ("D01", "DIRETTORE", "Avete sentito? Controllate subito le cipolle!", 88.0, 89.9)]

# ====================================================================== scena
S.reset()
S.render_setup(RES, SAMPLES)
sc = bpy.context.scene
sc.cycles.max_bounces = 3
sc.cycles.diffuse_bounces = 2
sc.cycles.glossy_bounces = 1
sc.cycles.transmission_bounces = 2
sc.render.use_persistent_data = True
mk = Market(os.path.join(WD, "set")).build(build_cart)
O = mk.objs

CAST = ["protagonista", "dipendente", "dipendente_b", "responsabile", "direttore", "cliente_felpa", "cliente_signora"]
CH = {n: Character(n, os.path.join(WD, n)) for n in CAST}
A = {n: Actor(CH[n], n, seed=i + 3) for i, n in enumerate(CAST)}
P, LU, AN, RE, DI, FE, SI = (A[n] for n in CAST)

phone = S.build_phone(name="telefono")
cart = build_cart("carrello_protagonista")
note = note_texture(os.path.join(WD, "nota_ispettore.png"), [("OGGI:", (180, 30, 50)), ("ISPETTORE", (30, 30, 30)), ("della direzione", (30, 30, 30)),
                                                              ("giacca blu,", (40, 60, 120)), ("controlla tutto", (30, 30, 30)), ("col telefono!", (30, 30, 30))])
clip_luca = build_clipboard("cartellina_luca", note=note)
clip_resp = build_clipboard("cartellina_responsabile")

# prese calcolate una volta con il risolutore (le dita toccano il telefono senza entrarci, schermo libero)
GRIPS = {}


def grip_for(actor, prop, side, socket, key):
    if key in GRIPS:
        return GRIPS[key]
    ch = actor.ch
    keep = ch.rig.matrix_world.copy()
    ch.rig.matrix_world = Matrix.Identity(4)
    Pp = PO.idle(ch)
    Pp[f"hand.{side}"] = ((0.15 if side == "L" else -0.15, -0.45, 1.0), (0.0, -0.3, 1.0), (0.0, 1.0, 0.2))
    Pp[f"fingers.{side}"] = (0, 0, 0, 0)
    ch.pose(Pp)
    PO.place_prop(ch, prop, side, socket)
    sw, shh = (phone["screen_size"] if prop is phone else (1, 1))
    res = PO.solve_grip(ch, prop, side, screen=(sw, shh, S.PHONE_T) if prop is phone else None)
    ch.rig.matrix_world = keep
    GRIPS[key] = PO.grip_pose(res)
    return GRIPS[key]


def mirror_socket(M):
    """Socket della mano destra → sinistra (specchio sull'asse X locale della mano)."""
    F = Matrix.Diagonal((-1, 1, 1, 1))
    return F @ M @ F


SOCK_READ_L = mirror_socket(PO.phone_socket(P.ch, "read"))
SOCK_SHOW_L = mirror_socket(PO.phone_socket(P.ch, "show"))
CLIP_SOCK = Matrix.Translation(Vector((0.0, 0.09, 0.03))) @ Matrix.Rotation(math.radians(90), 4, "X")

# ====================================================================== pose utili (spazio del corpo)
def phone_read_L(ch, z=1.0):
    """Specchio della presa «legge» della mano destra: dita verso la sua destra, palmo verso il viso."""
    return {"hand.L": ((0.12, -0.4, z), (-1.0, 0.05, 0.18), (0.08, 0.5, 0.86)), "elbow.L": (0.55, 0.1, 0.7), "head_rot": (16, -6, 0)}


_SCREEN_N = SOCK_READ_L.to_3x3() @ Vector((0, -1, 0))    # normale dello schermo nello spazio della mano
_SCREEN_UP = SOCK_READ_L.to_3x3() @ Vector((0, 0, 1))


def phone_show_to(target, k=1.0, pos=(0.2, -0.32, 1.04)):
    """Mostra il telefono a un altro personaggio: la mano ruota (dalla presa «legge») finché la normale dello schermo
    punta alla sua testa, con il lato lungo del telefono verso l'alto. k < 1: rotazione parziale (interpolazione sferica)."""
    pr, fdr, pmr = phone_read_L(P.ch)["hand.L"]
    Rr = P.ch.hand_matrix("L", pr, fdr, pmr).to_3x3()
    nr, ur = Rr @ _SCREEN_N, Rr @ _SCREEN_UP

    def basis(n, u):
        n = n.normalized()
        u = (u - n * u.dot(n)).normalized()
        return Matrix((n, u, n.cross(u))).transposed()

    def f(t, W):
        p = Vector(pos)
        d = (W.inverted() @ head_world(A[target]) - p).normalized()
        Q = (basis(d, Vector((0, 0, 1))) @ basis(nr, ur).transposed()).to_quaternion()
        Qk = Quaternion().slerp(Q, k).to_matrix()
        pk = Vector(pr).lerp(p, k)
        return {"hand.L": (tuple(pk), tuple(Qk @ Vector(fdr)), tuple(Qk @ Vector(pmr))), "elbow.L": (0.7, 0.05, 0.85), "head_rot": (-4 * k, 10 * k, 0)}
    return f


def phone_low_L(ch):
    return {"hand.L": ((0.16, -0.34, 0.84), (-1.0, -0.1, 0.25), (0.1, 0.4, 0.9)), "elbow.L": (0.6, 0.2, 0.7)}


def phone_show_L(ch):
    return {"hand.L": ((0.3, -0.56, 1.16), (-0.9, 0.0, 0.42), (0.0, -1.0, 0.12)), "elbow.L": (0.7, 0.05, 0.85), "head_rot": (-4, 10, 0)}


def point_R(dx, dy, dz=0.15):
    d = Vector((dx, dy, dz)).normalized()
    return {"hand.R": (tuple(Vector((-0.24, 0, 1.06)) + d * 0.52), tuple(d), (0, 0, -1)), "elbow.R": (-0.55, 0.25, 0.95),
            "fingers.R": (0, 92, 98, 55)}


class AtPose:
    """Posa che dipende dalla posizione del personaggio al momento della chiave (es. indicare un punto della scena).
    Viene valutata una volta, con la matrice del personaggio a quel tempo, e poi il gomito viene risolto."""
    def __init__(self, fn):
        self.fn = fn


def point_dict(W, target, side):
    Wi = W.inverted()
    sg = 1 if side == "L" else -1
    sh = Vector((sg * 0.24, 0.0, 1.06))
    d = (Wi @ Vector(target)) - sh
    d.z = max(-0.35, min(0.6, d.z / max(1e-3, d.length))) * d.length
    d = d.normalized()
    return {f"hand.{side}": (tuple(sh + d * 0.52), tuple(d), (0, 0, -1)), f"elbow.{side}": tuple(sh + Vector((sg * 0.3, 0.25, -0.15))),
            f"fingers.{side}": (0, 92, 98, 55)}


def point_at(target, side=None, base=None):
    def fn(W):
        s = side
        if s is None:
            s = "L" if (W.inverted() @ Vector(target)).x > 0 else "R"
        out = dict(base) if base else {}
        out.update(point_dict(W, target, s))
        return out
    return AtPose(fn)


def world_dir_to_body(actor_W, world_target, from_body=(0, 0, 1.06)):
    p = actor_W.inverted() @ Vector(world_target)
    return p - Vector(from_body)


def hand_to_world(side, world_pt, finger_dir_w=(0, 0, 1), palm_w=(0, 1, 0)):
    """Mano verso un punto del mondo (calcolato a ogni fotogramma con la matrice attuale del personaggio)."""
    def f(t, W):
        Wi = W.inverted()
        p = world_pt(t) if callable(world_pt) else Vector(world_pt)
        R = Wi.to_3x3()
        return {f"hand.{side}": (tuple(Wi @ p), tuple(R @ Vector(finger_dir_w)), tuple(R @ Vector(palm_w)))}
    return f


# ====================================================================== linee temporali
FAC_IN = 90.0  # rivolto verso il fondo del negozio
# --- protagonista
P.hold(0.0, (0.3, 2.3), FAC_IN)
P.pose(0.0, phone_read_L(P.ch))
P.face(0.0, "neutro")
P.gaze(0.0, "phone")
P.pose(2.9, phone_low_L(P.ch))
P.gaze(2.9, (0.6, 9.0, 3.2))                     # alza lo sguardo verso il negozio
P.face(3.2, "felice", mouth="smile")
P.pose(5.75, {**phone_low_L(P.ch), "hand.R": ((-0.32, -0.3, 1.3), (0.0, -0.15, 1.0), (0.0, -1.0, 0.0)), "elbow.R": (-0.6, 0.2, 1.0),
              "fingers.R": (0, 0, 0, 0), "spread.R": 14})  # «Quattro.»: mano aperta, quattro dita
P.pose(6.6, phone_low_L(P.ch))
# carrello: spinto con la destra, telefono nella sinistra
P.hold(6.2, (-2.4, 2.9), FAC_IN)
t = P.walk(6.6, (-2.4, 2.9), (-2.4, 5.4), "normale", overrides=dict(arm_sw=0.0, chest_yaw=3, pel_yaw=3))
CART_PUSH = (6.2, 11.6)
P.pose(6.2, {**phone_read_L(P.ch, 1.02), "hand.R": (tuple(Vector((-0.17, -0.45, 1.0))), (0.0, -1.0, 0.05), (0.0, 0.05, -1.0)),
             "elbow.R": (-0.55, 0.3, 0.8)})
P.gaze(6.2, (-2.4, 9.0, 1.2))
P.face(6.4, "neutro")
P.gaze(9.2, "phone")
P.pose(11.6, phone_read_L(P.ch))
P.turn(12.0, (-2.4, 5.4), FAC_IN, 0.0)                          # verso lo scaffale
P.gaze(12.6, (-1.06, 5.6, 1.2))
P.gaze(13.6, "phone")
P.gaze(14.5, (-1.06, 6.2, 0.9))
P.turn(16.9, (-2.4, 5.4), 0.0, -12.0, 0.45)                     # si gira verso Luca
P.gaze(16.8, "dipendente")
P.face(17.0, "sorpreso", eye_scale=0.85)
P.pose(19.1, phone_show_to("dipendente", 0.5))                  # mostra la lista: gira il telefono verso Luca (in due tempi)
P.pose(19.45, phone_show_to("dipendente", 1.0))
P.pose(20.65, phone_show_to("dipendente", 0.5))
P.face(19.2, "imbarazzato", blush=0.0, sweat=0.0)
P.pose(21.0, phone_low_L(P.ch))
P.face(21.3, "sorpreso")
P.gaze(21.3, "camera")
P.face(22.9, "falsa_sicurezza")
P.gaze(22.9, "dipendente")
P.turn(25.6, (-2.4, 5.4), -12.0, 35.0, 0.5)
P.face(25.8, "confuso")
P.turn(27.9, (-2.4, 5.4), 35.0, 112.0, 0.5)                    # si gira verso il reparto e lo indica davanti a sé
P.pose(28.5, point_at((-4.2, 8.4, 0.95), "R", phone_low_L(P.ch)))
P.pose(29.6, phone_low_L(P.ch))
P.face(29.5, "sorpreso")
P.face(31.2, "confuso")
P.gaze(32.2, "camera")
P.gaze(33.3, (-4.2, 8.4, 0.9))
P.face(33.4, "esasperato")

# gag A: espositori
P.hold(35.6, (-4.0, 6.85), FAC_IN)
P.walk(35.6, (-4.0, 6.85), (-4.0, 7.25), "normale")
P.pose(35.6, phone_low_L(P.ch))
P.gaze(36.2, "responsabile")
P.face(36.2, "neutro")
P.pose(37.6, point_at((-4.2, 8.4, 0.95), "R", phone_low_L(P.ch)))   # indica le cipolle
P.gaze(37.6, (-4.2, 8.4, 0.9))
P.face(37.7, "felice")
P.pose(38.9, phone_low_L(P.ch))
P.gaze(40.2, "espositore")
P.face(40.3, "sorpreso")
P.face(41.6, "frustrato")
# gag B: casse
P.hold(42.6, (1.5, 5.15), -18.0)
P.walk(42.6, (1.5, 5.15), (1.8, 5.05), "normale")
P.turn(44.3, (1.8, 5.05), -18.0, -90.0, 0.45)
P.pose(42.6, phone_low_L(P.ch))
P.gaze(43.6, (1.2, 0.2, 1.6))                                   # cerca l'uscita
P.face(43.6, "confuso")
P.pose(45.0, point_at((0.6, 0.3, 1.6), "R", {**phone_low_L(P.ch), "shrug.L": 10, "shrug.R": 10}))   # «dov'è l'uscita?»
P.pose(45.4, phone_low_L(P.ch))
P.gaze(45.6, "responsabile")
P.gaze(46.8, (4.6, 2.2, 2.4))                                    # la cassa 2 si accende
P.face(47.0, "sorpreso")
P.face(48.6, "imbarazzato")
# gag C: cartellina
P.pose(49.8, phone_read_L(P.ch))
P.gaze(49.8, "phone")
P.face(49.8, "neutro", brow_tilt=-0.3)
P.gaze(52.6, "responsabile")
P.face(52.8, "confuso")
HANDOFF = 53.2
MEET = Vector((1.56, 4.66, 1.02))  # alla destra del protagonista (la sinistra tiene il telefono)
P.pose(52.7, {**phone_read_L(P.ch), **hand_to_world("R", MEET, (0, 0, 1), (1, 0, 0))(0, body_matrix((1.8, 5.05), -90.0))})
P.pose(53.9, {**phone_read_L(P.ch), "hand.R": ((-0.24, -0.42, 0.98), (0.3, -0.2, 1.0), (0.9, 0.0, 0.0)), "elbow.R": (-0.6, 0.15, 0.8)})
P.gaze(54.0, "phone")
P.gaze(55.0, "cartellina_responsabile")
P.face(54.2, "preoccupato")
# crisi

P.gaze(57.0, "responsabile")
P.face(57.0, "imbarazzato")
P.face(61.0, "spaventato")
P.gaze(61.0, "dipendente_b")
P.gaze(62.2, "phone")
P.gaze(63.3, (-5.65, 10.7, 1.6))
P.face(63.3, "panico")
# verso l'ufficio
P.hold(65.0, (-4.6, 9.6), 146.0)
DOOR_POS = (-5.65, 10.28)
P.walk(65.0, (-4.6, 9.6), (-5.65, 10.28), "imbarazzato")
P.turn(68.5, DOOR_POS, 147.1, 90.0, 0.45)
P.face(65.1, "preoccupato")
P.gaze(65.1, (-5.65, 10.7, 1.5))
P.pose(65.0, {**phone_low_L(P.ch), "hand.R": ((-0.16, -0.32, 0.86), (0.2, -0.3, 1.0), (0.6, 0.6, 0.0))})
DOOR_T = (69.2, 70.2)  # apertura della porta
# mano destra sulla leva della maniglia: palmo in giù appoggiato sopra la barra (centro del palmo a 10 cm dall'anta, 3 mm sopra la barra),
# dita lungo la leva verso la cerniera; la sinistra resta con il telefono (niente transizione verso la posa di riposo)
def _door_pose(t, W):
    M = mk.door["pivot"].matrix_world
    fd = (M.to_3x3() @ Vector((-1.0, 0.0, -0.15))).normalized()
    palm = M.to_3x3() @ Vector((0.0, 0.0, -1.0))
    centre = M @ Vector((mk.door["width"] - 0.13, -0.10, 1.011 + 0.024 + 0.003))
    wrist = centre - fd * 0.05
    Wi = W.inverted()
    R = Wi.to_3x3()
    return {**phone_low_L(P.ch), "hand.R": (tuple(Wi @ wrist), tuple(R @ fd), tuple(R @ palm)), "fingers.R": (35, 38, 40, 20)}
P.pose(69.2, _door_pose)
P.pose(69.7, {**phone_low_L(P.ch), "hand.R": ((-0.45, -0.35, 1.0), (-0.3, -0.5, 0.8), (0.8, 0.2, 0.0)), "elbow.R": (-0.7, 0.15, 0.9)})  # lascia la maniglia verso l'esterno
P.pose(70.05, {**phone_low_L(P.ch), "hand.L": ((0.14, -0.36, 0.86), (0.2, -0.3, 1.0), (-0.6, 0.6, 0.0)), "hand.R": ((-0.24, -0.42, 0.9), (-0.2, -0.3, 1.0), (0.6, 0.6, 0.0)),
              "elbow.R": (-0.55, 0.2, 0.8), "elbow.L": (0.28, 0.4, 0.72)})                       # passa la porta con le mani davanti (spalle strette)
P.walk(70.2, DOOR_POS, (-5.65, 11.45), "imbarazzato", overrides=dict(arm_sw=0.0))
P.gaze(71.2, "direttore")
P.face(71.2, "imbarazzato")
P.face(74.0, "preoccupato")
P.face(79.0, "sorpreso", mouth="o", mouth_open=1.0)
P.gaze(79.0, "direttore")
P.gaze(84.0, "phone")
P.pose(84.0, phone_read_L(P.ch))
P.face(84.2, "neutro")
P.gaze(85.6, "direttore")
P.face(85.8, "confuso", mouth="line")
P.talk(86.0, 87.3)
P.pose(86.0, phone_low_L(P.ch))
P.gaze(88.0, "direttore")
P.face(90.0, "esasperato")
P.gaze(90.0, "camera")

# --- Luca (dipendente): aspetta l'ispettore con la cartellina
LU.hold(0.0, (-0.7, 5.05), 168.0)
LU.hold_prop(0.0, clip_luca, "L", CLIP_SOCK)
LU.pose(0.0, {"hand.L": ((0.18, -0.38, 0.95), (0.4, -0.3, 1.0), (-0.2, 0.9, 0.3)), "elbow.L": (0.55, 0.1, 0.7)})
LU.face(0.0, "neutro")
LU.gaze(0.0, "cartellina_luca")
LU.gaze(12.4, "protagonista")
LU.gaze(13.2, "cartellina_luca")
LU.face(13.2, "confuso")
LU.gaze(14.0, "protagonista")
LU.face(14.3, "sorpreso")
LU.walk(16.6, (-0.7, 5.05), (-1.62, 5.22), "sicuro")
LU.face(16.8, "felice")
LU.gaze(16.8, "protagonista")
LU.pose(19.4, {"chest_rot": (6, 0, 0), "head_rot": (14, 0, 0)})             # guarda in giù il telefono tenuto all'altezza del petto (prima: viso sul telefono)
LU.gaze(19.4, "phone")
LU.pose(20.4, {"hand.R": ((-0.3, -0.42, 1.12), (0.0, -1.0, 0.1), (1.0, 0.0, 0.0)), "elbow.R": (-0.6, 0.1, 0.9), "fingers.R": (95, 100, 105, -10),
               "chest_rot": (0, 0, 0)})                                                         # pollice su
LU.face(20.4, "felice")
LU.gaze(20.4, "protagonista")
LU.pose(22.0, None)
LU.pose(24.2, {"hand.L": ((0.18, -0.38, 0.95), (0.4, -0.3, 1.0), (-0.2, 0.9, 0.3)), "elbow.L": (0.55, 0.1, 0.7)})   # cartellina davanti a sé mentre si gira
LU.walk(24.3, (-1.62, 5.22), (-1.42, 6.1), "normale")
LU.pose(25.6, None)
LU.turn(27.6, (-1.42, 6.1), 72.0, 160.0, 0.45)
LU.pose(27.55, {"hand.R": ((-0.45, -0.25, 1.05), (-0.8, 0.3, 0.2), (0.0, 0.0, 1.0)), "elbow.R": (-0.6, 0.25, 0.8)})  # presenta lo scaffale
LU.face(27.4, "felice")
LU.pose(29.35, {"hand.R": ((-0.12, -0.2, 1.5), (0.2, 0.1, 1.0), (0.0, -1.0, 0.0)), "elbow.R": (-0.55, 0.0, 1.25)})  # «Subito!»: saluto
LU.face(29.3, "felice", mouth="grin")
LU.pose(30.2, None)
LU.walk(30.2, (-1.42, 6.1), (-1.5, 8.6), "sicuro")
LU.face(30.0, "falsa_sicurezza", sweat=0.0)
LU.hold(35.6, (-1.5, 8.6), 90.0)  # fuori scena (sta riordinando la corsia)
# gag B/C e crisi: Luca in fila con il personale
LU.hold(55.0, (1.05, 4.2), 48.6)
LU.pose(55.0, None)
LU.face(55.0, "neutro")
LU.gaze(55.0, "protagonista")
LU.face(57.4, "sorpreso")
# finale: Luca alla porta dell'ufficio
LU.hold(80.0, (-5.65, 10.35), 90.0)
LU.gaze(80.0, "direttore")
LU.face(80.0, "neutro")
LU.pose(89.0, {"hand.R": ((-0.12, -0.2, 1.5), (0.2, 0.1, 1.0), (0.0, -1.0, 0.0)), "elbow.R": (-0.55, 0.0, 1.25)})
LU.face(89.0, "felice", mouth="grin")

# --- Anna (seconda dipendente)
AN.hold(0.0, (5.7, 4.6), -150.0)
AN.face(0.0, "neutro")
AN.gaze(0.0, "protagonista")
AN.walk(43.2, (5.7, 4.6), (5.4, 2.9), "sicuro")
AN.turn(47.2, (5.4, 2.9), -100.0, 180.0, 0.45)
AN.face(43.2, "falsa_sicurezza", sweat=0.0)
AN.hold(55.0, (2.55, 4.3), 135.0)
AN.face(55.0, "neutro")
AN.gaze(55.0, "protagonista")
AN.face(57.6, "sorpreso")

# --- responsabile
RE.hold(0.0, (-3.3, 8.45), -90.0)  # tra i due espositori
RE.face(0.0, "neutro")
RE.gaze(0.0, "protagonista")
RE.pose(36.0, {"hand.L": ((0.45, -0.38, 0.95), (0.6, -0.6, 0.1), (0, 0, 1)), "hand.R": ((-0.45, -0.38, 0.95), (-0.6, -0.6, 0.1), (0, 0, 1)),
               "elbow.L": (0.6, 0.15, 0.7), "elbow.R": (-0.6, 0.15, 0.7), "fingers.L": (8, 8, 10, 4), "fingers.R": (8, 8, 10, 4)})  # presenta i due espositori
RE.face(36.0, "felice")
RE.pose(38.6, {"head_rot": (14, 0, 0)})                                                                    # annuisce: «scelta strategica»
RE.face(38.6, "ironico")
RE.turn(39.2, (-3.3, 8.45), -90.0, 180.0, 0.45)
RE.pose(39.7, {"hand.L": ((0.22, -0.52, 0.8), (0.0, -1.0, 0.0), (0.0, -1.0, 0.0)), "hand.R": ((-0.22, -0.52, 0.8), (0.0, -1.0, 0.0), (0.0, -1.0, 0.0)),
               "elbow.L": (0.6, 0.1, 0.75), "elbow.R": (-0.6, 0.1, 0.75), "chest_rot": (20, 0, 0), "spine_rot": (10, 0, 0)})                                                     # si piega e spinge l'espositore
RE.gaze(39.7, "espositore")
RE.face(39.7, "falsa_sicurezza", sweat=0.0)
PUSH = (40.0, 43.6)
RE.walk(PUSH[0], (-3.3, 8.45), (-4.75, 8.45), "normale", overrides=dict(arm_sw=0.0, arm_out=0.53))
PUSH_SEG = [s for s in RE.loco if s.__class__.__name__ == "WalkSeg"][-1]   # la spinta: l'espositore la segue anche fuori campo
RE.pose(42.6, None)
RE.hold(42.6, (1.25, 4.55), 20.0)
RE.gaze(42.6, "protagonista")
RE.face(42.6, "neutro")
RE.pose(44.8, point_at((4.6, 2.8, 1.3)))                                    # indica la cassa 2 (mano dal lato giusto)
RE.gaze(44.8, "dipendente_b")
RE.face(44.8, "ironico")
RE.pose(46.4, None)
RE.gaze(47.4, "protagonista")
RE.face(47.6, "felice")
RE.turn(51.0, (1.25, 4.55), 20.0, 42.0, 0.4)
RE.hold_prop(49.6, clip_resp, "R", Matrix.Translation(Vector((0.0, 0.09, 0.03))) @ Matrix.Rotation(math.radians(90), 4, "X"))
RE.pose(49.6, {"hand.R": ((-0.2, -0.38, 0.95), (-0.4, -0.3, 1.0), (0.2, 0.9, 0.3)), "elbow.R": (-0.55, 0.1, 0.7)})
RE.pose(52.6, hand_to_world("R", MEET + Vector((0.08, 0, 0.0)), (0, 0, 1), (-1, 0, 0)))
RE.pose(53.6, None)
RE.face(52.4, "felice")
RE.gaze(52.4, "protagonista")
RE.hold(56.6, (0.3, 4.45), 23.0)
_t = RE.walk(56.7, (0.3, 4.45), (0.3, 4.9), "sicuro", overrides=dict(arm_out=0.53))   # busto più largo in basso: braccia più aperte
RE.turn(_t, (0.3, 4.9), 90.0, 6.0, 0.45)
RE.pose(58.8, point_at((-5.65, 10.7, 1.6)))                                  # «il direttore la aspetta»: indica l'ufficio
RE.face(58.0, "falsa_sicurezza", sweat=0.0)
RE.pose(60.2, None)

# --- direttore
DI.hold(0.0, (-6.4, 12.99), -90.0)
DI.face(0.0, "felice")
DI.gaze(0.0, "protagonista")
DI.pose(71.0, {"hand.L": ((0.55, -0.3, 1.25), (0.6, -0.2, 0.8), (0, -1, 0.2)), "hand.R": ((-0.55, -0.3, 1.25), (-0.6, -0.2, 0.8), (0, -1, 0.2)),
               "elbow.L": (0.7, 0.2, 0.95), "elbow.R": (-0.7, 0.2, 0.95), "fingers.L": (5, 5, 5, 5), "fingers.R": (5, 5, 5, 5)})  # benvenuto
DI.face(71.0, "felice", mouth="grin")
DI.pose(74.6, {"hand.R": ((-0.45, -0.45, 1.1), (-0.3, -0.8, 0.2), (0, 0, 1)), "elbow.R": (-0.65, 0.1, 0.85), "fingers.R": (8, 8, 8, 4)})
DI.face(74.6, "felice")
DI.pose(77.0, point_at((-6.95, 13.55, 0.8), "R"))                               # indica la sua poltrona (alla sua destra)
DI.pose(79.0, None)
DI.face(85.8, "neutro")
DI.turn(87.8, (-6.4, 12.99), -90.0, -120.0, 0.4)
DI.gaze(87.8, "dipendente")
DI.pose(88.0, point_at((-5.65, 10.35, 1.4)))
DI.talk(88.0, 89.9)
DI.face(88.0, "felice", mouth="grin")

# --- comparse in fila alla cassa 1
SI.hold(0.0, (3.3, 3.25), -90.0)
SI.face(0.0, "neutro")
SI.gaze(0.0, (3.3, 1.0, 1.2))
FE.hold(0.0, (3.45, 4.15), -90.0)
FE.face(0.0, "esasperato")
FE.gaze(0.0, "cliente_signora")
_t = FE.walk(47.4, (3.45, 4.15), (3.95, 3.45), "normale")
FE.turn(_t, (3.95, 3.45), math.degrees(math.atan2(3.45 - 4.15, 3.95 - 3.45)), -90.0, 0.4)
FE.face(47.4, "felice")

# ====================================================================== gomiti risolti in anticipo
# Per ogni posa della parte alta con le mani: il gomito viene scelto senza compenetrazioni con il busto (busto dritto, a riposo).
ELBOW_LOG = []


def place_world(t):
    mk.set_entrance_open(0.0)
    mk.door_angle(88.0 * ease((t - DOOR_T[0]) / (DOOR_T[1] - DOOR_T[0])) if t >= DOOR_T[0] else 0.0)
    mk.set_cassa_open(1, True)
    mk.set_cassa_open(2, t >= 47.7)
    mk.set_cassa_open(3, False)


def presolve_elbows():
    for a in A.values():
        ch = a.ch
        keep = ch.rig.matrix_world.copy()
        ch.rig.matrix_world = Matrix.Identity(4)
        for i, (tk, pk, kk) in enumerate(a.upper):
            if isinstance(pk, AtPose):
                ch.rig.matrix_world = Matrix.Identity(4)
                pk = pk.fn(a.loco_at(tk)[0])
            fn = None
            if callable(pk) and not isinstance(pk, AtPose):
                fn = pk
                place_world(tk)
                for b in A.values():
                    if b is not a:
                        b.ch.rig.matrix_world = b.loco_at(tk)[0]
                ch.rig.matrix_world = Matrix.Identity(4)
                pk = fn(tk, a.loco_at(tk)[0])
            if pk is None or callable(pk):
                continue
            Pk = dict(pk)
            full = PO.idle(ch)
            full.update(Pk)
            for side in ("L", "R"):
                if f"hand.{side}" in Pk:
                    r = PO.solve_elbow(ch, full, side)
                    Pk[f"elbow.{side}"] = full[f"elbow.{side}"]
                    ELBOW_LOG.append(dict(attore=a.name, t=tk, lato=side, **r))
            if fn is not None:
                el = {k: v for k, v in Pk.items() if k.startswith("elbow.")}
                a.upper[i] = (tk, (lambda fn=fn, el=el: (lambda t, W: {**fn(t, W), **el}))(), kk)
                continue
            a.upper[i] = (tk, Pk, kk)
        ch.rig.matrix_world = keep


t_pre = time.time()
presolve_elbows()
print(f"gomiti risolti in {time.time() - t_pre:.0f} s", flush=True)

# ====================================================================== inquadrature
def fwd(actor_name, dist, up=0.0, side=0.0):
    """Punto davanti al volto di un attore (per i primi piani), calcolato al fotogramma."""
    def f(t):
        a = A[actor_name]
        W = a.ch.rig.matrix_world
        h = head_world(a)
        return h + W.to_3x3() @ Vector((side, -dist, up))
    return f


PASS = [None]


def screen_cam(dist=0.26, up=0.03, margin=0.08):
    """Dettaglio dello schermo: camera sulla normale del vetro. Se la testa (o i capelli, la mano) è troppo vicina a quel punto,
    la camera ruota attorno al telefono, allontanandosi dalla testa, del minimo angolo che la lascia ad almeno `margin` dalla superficie
    (verifica sulla mesh reale del fotogramma: niente camera dentro la testa → niente fotogrammi neri)."""
    cache = {}

    def f(t):
        key = (round(t, 4), PASS[0])
        if key in cache:
            return cache[key]
        R = phone.matrix_world.to_3x3()
        n = (R @ Vector((0, -1, 0))).normalized()
        upv = (R @ Vector((0, 0, 1))).normalized()
        pc = phone.matrix_world.translation.copy()
        trees = [QC.bvh(P.ch.parts[k])[0] for k in ("head", "hair", "tuft") if k in P.ch.parts]
        v = head_world(P) - pc
        axis = v.cross(n)
        axis = axis.normalized() if axis.length > 1e-6 else upv.cross(n).normalized()

        def cam_at(deg):
            Rm = Matrix.Rotation(math.radians(deg), 3, axis)
            return pc + (Rm @ n) * dist + (Rm @ upv) * up

        def free(C):
            return all(not QC.inside(tr, C, 1.0)[0] and tr.find_nearest(C, margin)[0] is None for tr in trees)

        deg = 70.0
        for d in range(0, 72, 4):              # ricerca larga
            if free(cam_at(d)):
                deg = d
                break
        if deg > 0:
            for k in range(1, 9):              # poi fine, a passi di mezzo grado
                if free(cam_at(deg - 4 + k * 0.5)):
                    deg = deg - 4 + k * 0.5
                    break
        cache.clear()
        cache[key] = cam_at(deg)
        return cache[key]
    f.insert = True
    return f


def phone_center(t):
    return phone.matrix_world.translation


def headp(actor_name, dz=0.0):
    return lambda t: head_world(A[actor_name]) + Vector((0, 0, dz))


def cu(name, dist=2.0, side=0.0, up=0.0):
    """Primo piano in formato verticale: la testa (60 cm) deve entrare in larghezza → circa 2 m con lente 34."""
    def f(t):
        a = A[name]
        return head_world(a) + a.ch.rig.matrix_world.to_3x3() @ Vector((side, -dist, up))
    return f


def ots(over, dist=0.8, side=0.45, up=0.22):
    """Ripresa «di spalla»: dietro la testa di un personaggio, spostata di lato."""
    def f(t):
        a = A[over]
        return head_world(a) + a.ch.rig.matrix_world.to_3x3() @ Vector((side, dist, up))
    return f


def headt(name, dz=-0.12):
    return lambda t: head_world(A[name]) + Vector((0, 0, dz))


SHOTS = [  # (nome, t0, t1, cast visibile, [(t, pos, target)], lente, descrizione)
    ("01", 0.0, 2.6, ["protagonista"], [(0.0, screen_cam(0.27), phone_center), (2.6, screen_cam(0.24), phone_center)], 38, "Dettaglio: la lista su Spesora"),
    ("02", 2.6, 6.2, ["protagonista"], [(2.6, (1.05, 5.0, 0.95), headt("protagonista", -0.25)), (6.2, (0.95, 4.75, 1.0), headt("protagonista", -0.25))], 26, "Campo medio dal basso: il supermercato è enorme. «Quattro.»"),
    ("03", 6.2, 10.4, ["protagonista", "dipendente"], [(6.2, (-1.6, 8.9, 1.9), headt("protagonista", -0.5)), (10.4, (-1.65, 8.5, 1.8), headt("protagonista", -0.5))], 26, "Campo largo: spinge il carrello con la lista in mano"),
    ("04", 10.4, 12.0, ["protagonista"], [(10.4, screen_cam(0.3), phone_center), (12.0, screen_cam(0.27), phone_center)], 38, "Dettaglio: controlla di nuovo la lista"),
    ("05", 12.0, 16.6, ["protagonista", "dipendente"], [(12.0, ots("dipendente", 2.0, 1.4, 0.4), headt("protagonista", -0.35)), (16.6, ots("dipendente", 1.9, 1.4, 0.38), headt("protagonista", -0.35))], 26, "Luca nota l'uomo in giacca blu che controlla gli scaffali col telefono"),
    ("06", 16.6, 19.0, ["protagonista", "dipendente"], [(16.6, (-0.55, 4.0, 1.5), (-2.05, 5.3, 1.15)), (19.0, (-0.6, 4.1, 1.5), (-2.05, 5.3, 1.15))], 22, "Luca si avvicina, entusiasta"),
    ("07", 19.0, 21.2, ["protagonista", "dipendente"], [(19.0, (-1.5, 7.95, 1.6), (-2.05, 5.35, 1.15)), (21.2, (-1.55, 7.85, 1.58), (-2.05, 5.35, 1.15))], 24, "Mostra la lista a Luca: lui la scambia per i controlli"),
    ("08", 21.2, 25.0, ["protagonista", "dipendente"], [(21.2, (-1.3, 6.15, 1.5), headt("protagonista", -0.1)), (25.0, (-1.32, 6.1, 1.5), headt("protagonista", -0.1))], 24, "Primo piano: non lo corregge"),
    ("09", 25.0, 29.0, ["protagonista", "dipendente"], [(25.0, (-1.3, 3.6, 1.6), (-1.95, 5.8, 1.05)), (29.0, (-1.35, 3.7, 1.6), (-1.95, 5.8, 1.05))], 22, "Luca chiede un parere sugli scaffali; lui indica verso le cipolle"),
    ("10", 29.0, 31.2, ["protagonista", "dipendente"], [(29.0, (-1.45, 3.9, 1.55), headt("dipendente", -0.4)), (31.2, (-1.5, 4.05, 1.55), headt("dipendente", -0.5))], 24, "«Subito!»: Luca parte per riorganizzare la corsia"),
    ("11", 31.2, 35.6, ["protagonista"], [(31.2, cu("protagonista", 1.55, -0.2), headt("protagonista")), (35.6, cu("protagonista", 1.45, -0.2), headt("protagonista"))], 26, "Primo piano: guarda in camera. «Il problema?»"),
    ("12", 35.6, 42.6, ["protagonista", "responsabile"], [(35.6, (-1.5, 9.9, 1.9), (-3.6, 7.8, 0.95)), (42.6, (-1.6, 9.85, 1.9), (-4.0, 7.9, 0.95))], 20, "Gag A: indica le cipolle, gli spostano l'intero espositore"),
    ("13", 42.6, 49.6, ["protagonista", "responsabile", "dipendente_b", "cliente_felpa", "cliente_signora"], [(42.6, (3.6, 0.9, 1.9), (2.6, 4.3, 1.1)), (49.6, (3.55, 1.0, 1.9), (2.5, 4.3, 1.1))], 22, "Gag B: chiede l'uscita, aprono una nuova cassa"),
    ("14", 49.6, 56.6, ["protagonista", "responsabile"], [(49.6, (3.2, 3.4, 1.65), (1.5, 4.8, 1.15)), (56.6, (3.15, 3.5, 1.63), (1.5, 4.8, 1.15))], 24, "Gag C: riapre la lista, gli consegnano una cartellina"),
    ("15", 56.6, 60.8, ["protagonista", "dipendente", "dipendente_b", "responsabile"], [(56.6, (1.7, 2.9, 2.3), (1.6, 4.75, 1.05)), (60.8, (1.7, 3.0, 2.25), (1.6, 4.75, 1.05))], 22, "Tutto il personale aspetta istruzioni. Il direttore vuole vederlo"),
    ("16", 60.8, 65.0, ["protagonista", "dipendente", "dipendente_b", "responsabile"], [(60.8, (1.95, 3.3, 1.5), headt("protagonista", -0.12)), (65.0, (1.95, 3.42, 1.5), headt("protagonista", -0.12))], 26, "Primo piano: panico. Persone, telefono, porta dell'ufficio"),
    ("17", 65.0, 71.0, ["protagonista"], [(65.0, (-4.2, 8.0, 1.75), (-5.0, 10.2, 1.2)), (71.0, (-4.5, 8.3, 1.75), (-5.6, 10.8, 1.25))], 26, "Va lentamente all'ufficio, apre la porta"),
    ("18", 71.0, 74.0, ["protagonista", "direttore"], [(71.0, (-4.75, 11.15, 1.6), (-6.2, 12.6, 1.2)), (74.0, (-4.8, 11.2, 1.6), (-6.2, 12.6, 1.25))], 24, "Il direttore lo accoglie sorridendo"),
    ("19", 74.0, 79.0, ["protagonista", "direttore"], [(74.0, cu("direttore", 1.75, 0.15, 0.0), headt("direttore", -0.2)), (79.0, cu("direttore", 1.65, 0.15, 0.0), headt("direttore", -0.2))], 28, "Primo piano del direttore: gli offre il suo posto"),
    ("20", 79.0, 84.0, ["protagonista", "direttore"], [(79.0, cu("protagonista", 1.35, -0.3, 0.0), headt("protagonista")), (84.0, cu("protagonista", 1.3, -0.3, 0.0), headt("protagonista"))], 26, "Primo piano: silenzio, bocca aperta"),
    ("21", 84.0, 85.6, ["protagonista"], [(84.0, screen_cam(0.27), phone_center), (85.6, screen_cam(0.25), phone_center)], 38, "Dettaglio: la lista è ancora aperta"),
    ("22", 85.6, 87.8, ["protagonista", "direttore"], [(85.6, cu("protagonista", 1.35, -0.35, 0.0), headt("protagonista")), (87.8, cu("protagonista", 1.3, -0.35, 0.0), headt("protagonista"))], 26, "«Ma… le cipolle?»"),
    ("23", 87.8, 90.0, ["protagonista", "direttore", "dipendente"], [(87.8, (-4.75, 12.5, 1.6), (-6.0, 11.4, 1.3)), (90.0, (-4.8, 12.45, 1.6), (-6.0, 11.4, 1.3))], 20, "«Avete sentito? Controllate subito le cipolle!»"),
    ("24", 90.0, 93.6, ["protagonista"], [(90.0, cu("protagonista", 1.4, -0.3, 0.0), headt("protagonista")), (93.6, cu("protagonista", 1.3, -0.3, 0.0), headt("protagonista"))], 26, "Finale: guarda in camera, esasperato"),
    ("25", 93.6, 95.0, [], [(93.6, (0, -5, 1.5), (0, 0, 1.5)), (95.0, (0, -5, 1.5), (0, 0, 1.5))], 30, "Marchio Spesora (breve, dopo la battuta)"),
]


def shot_at(t):
    for s in SHOTS:
        if s[1] <= t < s[2]:
            return s
    return SHOTS[-1]


cam = S.camera((0, -4, 1.5), (0, 0, 1), 30, clip=(0.05, 40.0))


def val(v, t):
    return Vector(v(t)) if callable(v) else Vector(v)


def place_camera(shot, t):
    keys = shot[4]
    (ta, pa, ga), (tb, pb, gb) = keys[0], keys[-1]
    u = ease((t - ta) / max(1e-6, tb - ta))
    loc, tgt = val(pa, t).lerp(val(pb, t), u), val(ga, t).lerp(val(gb, t), u)
    S.aim(cam, loc, tgt)
    if pa is not None and getattr(pa, "insert", False):
        # dettaglio del telefono: rollio della camera allineato al lato lungo del telefono (la lista resta dritta nel quadro)
        fwd = (tgt - loc).normalized()
        upv = phone.matrix_world.to_3x3() @ Vector((0, 0, 1))
        upv = (upv - fwd * upv.dot(fwd)).normalized()
        right = fwd.cross(upv)
        R = Matrix((right, upv, -fwd)).transposed()
        cam.matrix_world = Matrix.Translation(loc) @ R.to_4x4()
    cam.data.lens = shot[5]


# ====================================================================== stato degli oggetti
NAMED = {"phone": phone, "cartellina_luca": clip_luca, "cartellina_responsabile": clip_resp, "espositore": mk.onion_crate}
for n in CAST:
    NAMED[n] = n


def actor_target(tgt):
    if isinstance(tgt, str) and tgt in ("phone", "cartellina_luca", "cartellina_responsabile", "espositore"):
        return NAMED[tgt].matrix_world.translation + (Vector((0, 0, 0.75)) if tgt == "espositore" else Vector())
    return resolve_target(tgt, A, cam)


def set_visible(name, vis):
    ch = CH[name]
    for ob in ch.parts.values():
        ob.hide_render = not vis


CART_START = None


def apply_actor(a, t, f, faces=True):
    W, Pb = a.loco_at(t)
    a.ch.rig.matrix_world = W
    Pf = Pb
    # pose della parte alta (anche funzioni del tempo e della matrice attuale)
    keys = sorted(a.upper, key=lambda k: k[0])
    resolved = []
    for (tk, pk, kk) in keys:
        resolved.append((tk, (lambda pk=pk: (lambda tt: pk(tt, W)))() if callable(pk) else pk, kk))
    a_upper = a.upper
    a.upper = resolved
    Pf = a.upper_at(t, Pb)
    a.upper = a_upper
    # dita delle prese fisse
    if a is P:
        Pf["fingers.L"] = grip_for(P, phone, "L", SOCK_READ_L, "P_phone_L")
    for (tk, prop, side, sock) in a.props:
        if tk <= t:
            Pf[f"fingers.{side}"] = {"index": (60, 50), "middle": (62, 52), "ring": (64, 54), "thumb": (30, 10)}
    # sguardo e testa
    tgt = actor_target(a.gaze_target(t))
    gaze = (0.0, 0.0)
    a.ch.pose(Pf)
    if tgt is not None:
        Pf, gaze = look(a, Pf, tgt)
        a.ch.pose(Pf)
    a.last = (W, Pf)
    if not faces:
        return
    # volto
    p = a.face_at(t)
    # file diverso a ogni fotogramma: con i dati persistenti Cycles riconosce le texture dal percorso/indirizzo e non
    # ricaricherebbe un'immagine «uguale» (volto rimasto fermo all'espressione precedente)
    img = os.path.join(WD, f"face_{a.name}_{f:05d}.png")
    draw_face(p, gaze=gaze, blink=a.blink_at(t), size=768, talk=a.talk_at(t)).save(img)
    a.ch.set_face(img)
    a.face_files = getattr(a, "face_files", []) + [img]
    while len(a.face_files) > 3:
        old = a.face_files.pop(0)
        if os.path.exists(old) and old != img:
            os.remove(old)
    a.last = (W, Pf)


def place_props(t):
    global CART_START
    # telefono: sempre nella mano sinistra del protagonista
    # nessun capovolgimento del telefono nella mano: lo schermo guarda dalla parte del palmo, quindi nella posa «mostra»
    # (palmo in avanti) è già rivolto a Luca; capovolgerlo metteva le dita davanti allo schermo (controllo F)
    PO.place_prop(P.ch, phone, "L", SOCK_READ_L)
    # carrello: spinto dal protagonista finché lo tiene, poi resta dove l'ha lasciato
    W = P.ch.rig.matrix_world
    if t < 6.2:
        cart.matrix_world = body_matrix((-2.4, 2.9), FAC_IN) @ Matrix.Translation((0, -0.95, 0))
    else:
        Wc = W if t <= CART_PUSH[1] else CART_PARK   # dopo averlo lasciato resta fermo (posizione calcolata, non «ricordata»)
        cart.matrix_world = Matrix.Translation(Vector((Wc.translation.x, Wc.translation.y, 0.0))) @ Matrix.Rotation(Wc.to_euler().z, 4, "Z") @ Matrix.Translation((0, -0.95, 0))
    roll_wheels(cart, (cart.matrix_world.translation - Vector((-2.4, 2.9 + 0.95, 0))).length)
    # cartelline
    hb = LU.ch.rig.pose.bones["hand.L"]
    clip_luca.matrix_world = LU.ch.rig.matrix_world @ hb.matrix @ CLIP_SOCK
    if t < HANDOFF:
        hb = RE.ch.rig.pose.bones["hand.R"]
        clip_resp.matrix_world = RE.ch.rig.matrix_world @ hb.matrix @ CLIP_SOCK if t >= 49.6 else Matrix.Translation((0, 0, -5))
    else:
        hb = P.ch.rig.pose.bones["hand.R"]
        clip_resp.matrix_world = P.ch.rig.matrix_world @ hb.matrix @ HANDOFF_OFFSET
    # espositore delle cipolle spinto da Luca
    if t >= PUSH[0]:
        lx = PUSH_SEG.at(min(t, PUSH_SEG.t1))[0].translation.x
        mk.onion_crate.location = (mk.onion_crate_home.x + (lx - (-3.3)), mk.onion_crate_home.y, 0.0)
    else:
        mk.onion_crate.location = mk.onion_crate_home


# ====================================================================== controlli (ogni 15 fotogrammi)
ENV = [O[n] for n in ("muri", "scaffale_0", "scaffale_1", "scaffale_2", "ortofrutta_tavoli", "casse", "ufficio_arredo", "porta_telaio", "porta_anta")]
QCLOG = []


def qc_frame(f, t, shot):
    vis = [A[n] for n in shot[3]]
    rec = dict(f=f, t=round(t, 2), shot=shot[0])
    for a in vis:
        ch = a.ch
        shw = {s: ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{s}"].head for s in "LR"}
        worst = 0.0
        for s in "LR":
            worst = max(worst, QC.penetration(ch.parts[f"arm.{s}"], ch.parts["torso"], ignore=lambda v, g, s=s: (v - shw[s]).length < QC.ARM_ROOT)["depth_mm"])
            worst = max(worst, QC.penetration(ch.parts[f"hand.{s}"], ch.parts["torso"])["depth_mm"])
        rec[f"{a.name}_braccia_busto_mm"] = worst
        rec[f"{a.name}_piedi_min_z_mm"] = round(min(QC.min_z(ch.parts["foot.L"]), QC.min_z(ch.parts["foot.R"])) * 1000, 1)
        env = 0.0
        for e in ENV:
            env = max(env, QC.penetration(ch.parts["torso"], e)["depth_mm"])
        rec[f"{a.name}_busto_ambiente_mm"] = env
    if P in vis:
        rec["mano_telefono_mm"] = QC.penetration(P.ch.parts["hand.L"], phone)["depth_mm"]
    for i, a in enumerate(vis):
        for b in vis[i + 1:]:
            d = QC.penetration(a.ch.parts["torso"], b.ch.parts["torso"])["depth_mm"]
            if d:
                rec[f"busti_{a.name}_{b.name}_mm"] = d
    cpos = cam.matrix_world.translation
    worst = 9.0
    for a in vis:
        for k in ("head", "hair", "torso", "hand.L", "hand.R"):
            if k in a.ch.parts:
                tr = QC.bvh(a.ch.parts[k])[0]
                ins, dist = QC.inside(tr, cpos, 1.0)
                worst = min(worst, -dist if ins else dist)
    rec["camera_distanza_personaggi_mm"] = round(worst * 1000, 1)  # < 50 mm (piano di taglio) o negativo = problema
    QCLOG.append(rec)


# ====================================================================== render
def frame_time(fi):
    return fi / FPS


def render_frame(fi, path, do_qc=False):
    t = frame_time(fi)
    shot = shot_at(t)
    place_world(t)
    vis = set(shot[3])
    for n in CAST:
        set_visible(n, n in vis)
    # due passaggi: gli sguardi verso telefono, cartelline e camera usano le posizioni di questo stesso fotogramma
    # (non quelle del fotogramma precedente): niente scatti al primo fotogramma dopo uno stacco, rendering a blocchi identico
    for k in range(2):
        PASS[0] = (fi, k)
        for n in CAST:
            if n in vis or (n == "protagonista") or (n == "dipendente") or (n == "responsabile"):
                apply_actor(A[n], t, fi, faces=(k == 1))
        place_props(t)
        if k == 1 or any(A[n].gaze_target(t) == "camera" for n in vis):
            place_camera(shot, t)
        bpy.context.view_layer.update()
    for ob in [phone] + cart_parts(cart) + [c for c in clip_luca.children] + [c for c in clip_resp.children]:
        ob.hide_render = False
    phone.hide_render = "protagonista" not in vis
    for c in clip_luca.children:
        c.hide_render = "dipendente" not in vis
    if do_qc:
        qc_frame(fi, t, shot)
        dg = bpy.context.evaluated_depsgraph_get()
        o = cam.matrix_world.translation
        d = (cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
        hit = sc.ray_cast(dg, o, d)
        QCLOG[-1]["centro_inquadratura"] = hit[4].name if hit[0] else "niente"
        QCLOG[-1]["distanza_centro_m"] = round((hit[1] - o).length, 2) if hit[0] else None
    S.render(path)


# stati calcolati in anticipo (deterministici, anche rendendo a blocchi o fuori ordine)
CART_PARK = P.loco_at(CART_PUSH[1])[0]
apply_actor(P, HANDOFF, 0)
apply_actor(RE, HANDOFF, 0)
_hb = RE.ch.rig.pose.bones["hand.R"]
_clip_at_handoff = RE.ch.rig.matrix_world @ _hb.matrix @ CLIP_SOCK
_pb = P.ch.rig.pose.bones["hand.R"]
HANDOFF_OFFSET = (P.ch.rig.matrix_world @ _pb.matrix).inverted() @ _clip_at_handoff   # nel passaggio la cartellina non salta
QC_HANDOFF = dict(distanza_mani_al_passaggio_mm=round(((RE.ch.rig.matrix_world @ _hb.head) - (P.ch.rig.matrix_world @ _pb.head)).length * 1000, 1),
                  polso_responsabile=tuple(round(v, 3) for v in RE.ch.rig.matrix_world @ _hb.head), polso_protagonista=tuple(round(v, 3) for v in P.ch.rig.matrix_world @ _pb.head),
                  punto_incontro=tuple(round(v, 3) for v in MEET), pos_protagonista=tuple(round(v, 3) for v in P.ch.rig.matrix_world.translation),
                  pos_responsabile=tuple(round(v, 3) for v in RE.ch.rig.matrix_world.translation))

cue = dict(durata=DUR, fps=FPS, narrazione=[dict(id=i, inizio=t0) for i, t0 in NARR],
           battute=[dict(id=i, chi=c, testo=x, inizio=a, fine=b) for i, c, x, a, b in CHAR_LINES],
           inquadrature=[dict(n=s[0], inizio=s[1], fine=s[2], cast=s[3], lente=s[5], descrizione=s[6]) for s in SHOTS])
json.dump(cue, open(os.path.join(OUT, "cue.json"), "w"), ensure_ascii=False, indent=1)

t_start = time.time()
if MODE == "qc":
    # controlli completi dell'animatic, fotogramma per fotogramma, senza render (test A, B, C, D, F del prompt).
    # Va lanciato con una cartella di uscita diversa da quella del render (file dei volti separati).
    S.render = lambda p: None
    STEP = int(os.environ.get("ADS_STEP", "2"))
    f0, f1 = int(RANGE[0] * FPS), min(int(93.6 * FPS), int(RANGE[1] * FPS))
    sw, shh = phone["screen_size"]
    clips = {"cartellina_luca": [c for c in clip_luca.children if c.type == "MESH"], "cartellina_responsabile": [c for c in clip_resp.children if c.type == "MESH"]}
    crate = [c for c in mk.onion_crate.children_recursive if c.type == "MESH"]
    ENV_CART = ENV + [O["ortofrutta_cassette"]] + crate
    ENV_CRATE = [O[n] for n in ("muri", "scaffale_0", "scaffale_1", "scaffale_2", "ortofrutta_tavoli", "ortofrutta_cassette", "casse")]
    prev_feet = {}
    agg = {}   # (prova, voce, inquadratura) -> massimo
    events = []

    def note(test, what, shot, val, t, bad):
        k = (test, what, shot)
        cur = agg.get(k)
        if cur is None or val > cur[0]:
            agg[k] = (val, round(t, 2))
        if bad:
            events.append(dict(test=test, voce=what, inquadratura=shot, t=round(t, 2), valore=val))

    STATIC = {n for n in ("muri", "scaffale_0", "scaffale_1", "scaffale_2", "ortofrutta_tavoli", "ortofrutta_cassette", "casse", "ufficio_arredo", "porta_telaio")}
    static_cache, frame_cache = {}, {}

    def get_bvh(ob):
        cache = static_cache if ob.name in STATIC else frame_cache
        if ob.name not in cache:
            tr, vs, _, gs = QC.bvh(ob)
            lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))) if vs else Vector((9e9,) * 3)
            hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs))) if vs else Vector((-9e9,) * 3)
            cache[ob.name] = (tr, vs, gs, lo, hi)
        return cache[ob.name]

    def pen(a_ob, b_ob, ignore=None, probe=0.06):
        """Come QC.penetration (normale della faccia più vicina + parità dei raggi), con BVH in cache e scarto rapido per riquadri."""
        if a_ob.hide_render or b_ob.hide_render:
            return 0.0
        ta, va, ga, alo, ahi = get_bvh(a_ob)
        tb, vb, gb, blo, bhi = get_bvh(b_ob)
        if any(alo[i] > bhi[i] + probe or blo[i] > ahi[i] + probe for i in range(3)):
            return 0.0
        depth = 0.0
        for i, v in enumerate(va):
            if ignore and ignore(v, ga[i] if ga else ""):
                continue
            if any(v[k] < blo[k] - 1e-4 or v[k] > bhi[k] + 1e-4 for k in range(3)):
                continue
            ins, dist = QC.inside(tb, v, probe)
            if ins and dist > depth:
                depth = dist
        return round(depth * 1000, 2)

    def feet_of(a):
        out = {}
        for s in "LR":
            pb = a.ch.rig.pose.bones[f"foot.{s}"]
            out[s] = (a.ch.rig.matrix_world @ pb.head, QC.min_z(a.ch.parts[f"foot.{s}"]))
        return out

    nfr = 0
    for fi in range(f0, f1):
        if fi % STEP:
            continue
        t = fi / FPS
        shot = shot_at(t)
        render_frame(fi, "", do_qc=False)
        frame_cache.clear()
        nfr += 1
        sid = shot[0]
        vis = shot[3]
        # A: intersezioni (braccia/mani nel busto, busto nell'ambiente, mano nel telefono, personaggi tra loro, camera)
        for an in vis:
            ch = A[an].ch
            for s in "LR":
                shw = ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{s}"].head
                v = max(pen(ch.parts[f"arm.{s}"], ch.parts["torso"], lambda v, g, shw=shw: (v - shw).length < QC.ARM_ROOT), pen(ch.parts[f"hand.{s}"], ch.parts["torso"]))
                note("A", f"{an}_braccia_busto_mm", sid, v, t, v > 0)
            for e in ENV:
                v = pen(ch.parts["torso"], e)
                note("A", f"{an}_busto_ambiente_mm", sid, v, t, v > 0)
        if "protagonista" in vis:
            v = pen(P.ch.parts["hand.L"], phone)
            note("A", "mano_telefono_mm", sid, v, t, v > 0)
        for i, an in enumerate(vis):
            for bn in vis[i + 1:]:
                v = pen(A[an].ch.parts["torso"], A[bn].ch.parts["torso"])
                note("A", f"busti_{an}_{bn}_mm", sid, v, t, v > 0)
        cpos = cam.matrix_world.translation
        worst = 9.0
        for an in vis:
            for k in ("head", "hair", "torso", "hand.L", "hand.R"):
                if k in A[an].ch.parts and not A[an].ch.parts[k].hide_render:
                    ins, dist = QC.inside(get_bvh(A[an].ch.parts[k])[0], cpos, 1.0)
                    worst = min(worst, -dist if ins else dist)
        note("E", "camera_vicina_ai_personaggi_mm", sid, round(-worst * 1000, 1), t, worst < 0.05)  # valore = −distanza: più alto = peggio
        # B: oggetti in movimento
        if "protagonista" in vis:
            for part in ("head", "torso", "hand.R"):
                note("B", f"telefono_dentro_{part}_mm", sid, pen(phone, P.ch.parts[part]), t, pen(phone, P.ch.parts[part]) > 0)
            cov = QC.screen_cover(P.ch.parts["hand.L"], phone, sw, shh, S.PHONE_T) + QC.screen_cover(P.ch.parts["hand.R"], phone, sw, shh, S.PHONE_T)
            note("F", "vertici_mano_davanti_allo_schermo", sid, cov, t, cov > 0)
            if 19.3 <= t <= 20.5:   # «mostra»: lo schermo deve essere rivolto verso Luca
                nrm = (phone.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
                to_l = (head_world(LU) - phone.matrix_world.translation).normalized()
                c = round(nrm.dot(to_l), 3)
                note("F", "schermo_non_rivolto_a_luca_(1-cos)", sid, round(1 - c, 3), t, c < 0.5)
        for cname, obs in clips.items():
            for ob in obs:
                for an in vis:
                    v = pen(ob, A[an].ch.parts["torso"])
                    note("B", f"{cname}_dentro_busto_{an}_mm", sid, v, t, v > 0)
        for cp in cart_parts(cart):
            for e in ENV_CART:
                v = pen(cp, e)
                note("B", "carrello_dentro_ambiente_mm", sid, v, t, v > 0)
            for part in ("torso", "leg.L", "leg.R"):
                v = pen(cp, P.ch.parts[part])
                note("B", f"carrello_dentro_protagonista_{part}_mm", sid, v, t, v > 0)
        for cr in crate:
            for e in ENV_CRATE:
                v = pen(cr, e)
                note("B", "espositore_dentro_ambiente_mm", sid, v, t, v > 0)
            for an in ("responsabile", "protagonista"):
                v = pen(cr, A[an].ch.parts["torso"])
                note("B", f"espositore_dentro_busto_{an}_mm", sid, v, t, v > 0)
        # C: camminate (piede d'appoggio che scivola, piedi sospesi o nel pavimento), per tutti gli attori in scena
        for an in vis:
            a_ = A[an]
            ft = feet_of(a_)
            pv = prev_feet.get(an)
            if pv is not None and pv[0] == fi - STEP and shot_at(pv[0] / FPS)[0] == sid:
                for s in "LR":
                    (p0, z0), (p1, z1) = pv[1][s], ft[s]
                    if z0 < 0.006 and z1 < 0.006:
                        slip = round(math.hypot(p1.x - p0.x, p1.y - p0.y) * 1000, 2)
                        note("C", f"scivolamento_piede_{an}_mm", sid, slip, t, slip > 1.0)
            prev_feet[an] = (fi, ft)
            zs = [ft["L"][1], ft["R"][1]]
            note("C", f"piede_sotto_pavimento_{an}_mm", sid, round(-min(zs) * 1000, 1), t, min(zs) < -0.001)
            note("C", f"entrambi_i_piedi_sollevati_{an}_mm", sid, round(min(zs) * 1000, 1), t, min(zs) > 0.015)
            v = pen(a_.ch.parts["leg.L"], a_.ch.parts["leg.R"])
            note("C", f"gambe_che_si_attraversano_{an}_mm", sid, v, t, v > 0)
        # D: porta dell'ufficio (anta e telaio contro busto, braccia e mani del protagonista)
        if 67.5 <= t <= 72.0 and "protagonista" in vis:
            for part in ("torso", "arm.L", "arm.R", "hand.L", "hand.R", "leg.L", "leg.R"):
                for dn in ("porta_telaio", "porta_anta", "muri"):
                    ig = None
                    if part.startswith("arm"):
                        s = part[-1]
                        shw = P.ch.rig.matrix_world @ P.ch.rig.pose.bones[f"upperarm.{s}"].head
                        ig = lambda v, g, shw=shw: (v - shw).length < QC.ARM_ROOT
                    v = pen(P.ch.parts[part], O[dn], ig)
                    note("D", f"protagonista_{part}_dentro_{dn}_mm", sid, v, t, v > 0)
        if nfr % 20 == 0:
            print(f"controlli: fotogramma {fi + 1} t={t:.1f}s  {time.time() - t_start:.0f}s  problemi finora {len(events)}", flush=True)
    summary = {}
    for (test, what, sid), (v, t) in sorted(agg.items()):
        summary.setdefault(test, {}).setdefault(what, {})[sid] = dict(massimo=v, t=t)
    json.dump(dict(fotogrammi_controllati=nfr, passo=STEP, intervallo_s=[f0 / FPS, f1 / FPS], problemi=events, massimi_per_inquadratura=summary,
                   movimenti_spostati={n: A[n].shifts for n in CAST}, giri_prima_delle_camminate={n: A[n].auto_turns for n in CAST},
                   giri_corretti={n: A[n].turn_fixes for n in CAST}, gomiti=ELBOW_LOG),
              open(os.path.join(OUT, f"qc_completo_{f0}_{f1}.json"), "w"), ensure_ascii=False, indent=1)
    print("ok qc", nfr, "fotogrammi", len(events), "problemi", round(time.time() - t_start), "s")
    sys.exit(0)
if MODE == "audit":
    # campionamento dei canali animati (come le curve del Graph Editor) a 30 fps, senza render né volti:
    # per ogni personaggio in scena: segmento di locomozione, mani nello spazio del corpo, testa (dopo lo sguardo), torace,
    # espressione, bersaglio dello sguardo, palpebra
    f0, f1 = int(RANGE[0] * FPS), min(int(93.6 * FPS), int(RANGE[1] * FPS))
    rows = []
    for fi in range(f0, f1):
        t = frame_time(fi)
        shot = shot_at(t)
        place_world(t)
        for n in CAST:
            set_visible(n, n in shot[3])
        for n in CAST:
            if n in shot[3]:
                apply_actor(A[n], t, fi, faces=False)
        place_props(t)
        bpy.context.view_layer.update()
        for n in shot[3]:
            a_ = A[n]
            W, Pf = a_.last
            seg = None
            for sg in sorted(a_.loco, key=lambda sg: sg.t0):
                if sg.t0 <= t:
                    seg = sg
            Wi = W.inverted()
            hands = {sd: tuple(round(v, 5) for v in (Wi @ (a_.ch.rig.matrix_world @ a_.ch.rig.pose.bones[f"hand.{sd}"].head))) for sd in "LR"}
            fk = None
            for k in sorted(a_.faces, key=lambda k: k[0]):
                if k[0] <= t:
                    fk = k[1]
            rows.append(dict(f=fi, t=round(t, 4), shot=shot[0], n=n, loco=type(seg).__name__ if seg else None,
                             pos=tuple(round(v, 4) for v in W.translation), yaw=round(math.degrees(W.to_euler().z), 3),
                             hand_L=hands["L"], hand_R=hands["R"], head=tuple(round(v, 3) for v in Pf.get("head_rot", (0, 0, 0))),
                             chest=tuple(round(v, 3) for v in Pf.get("chest_rot", (0, 0, 0))), face=fk, gaze=str(a_.gaze_target(t)),
                             blink=round(a_.blink_at(t), 3)))
        if fi % 300 == 0:
            print("audit", fi, flush=True)
    json.dump(rows, open(os.path.join(OUT, f"audit_{f0}_{f1}.json"), "w"))
    print("ok audit", len(rows), round(time.time() - t_start), "s")
    sys.exit(0)
if MODE == "probe":
    # ricerca di una posizione di camera libera: raggi verso una griglia attorno al bersaglio, si scartano i candidati coperti
    dg = None
    for sid in os.environ.get("ADS_PROBE", "").split(","):
        s = next(x for x in SHOTS if x[0] == sid)
        tm = s[1] + (s[2] - s[1]) * 0.6
        fi = int(round(tm * FPS))
        S.render = lambda p: None
        render_frame(fi, "", do_qc=False)
        dg = bpy.context.evaluated_depsgraph_get()
        tgt_name = os.environ.get("ADS_PROBE_TGT", "protagonista")
        H = head_world(A[tgt_name])
        for n in CAST:
            a_ = A[n]
            print(sid, n, "testa", tuple(round(v, 2) for v in head_world(a_)), "visibile", n in s[3], flush=True)
        print(sid, "telefono", tuple(round(v, 2) for v in phone.matrix_world.translation))
        res = []
        for yaw in range(0, 360, 15):
            for dist in (1.0, 1.3, 1.7, 2.2):
                for up in (-0.1, 0.15, 0.4):
                    C = H + Vector((math.cos(math.radians(yaw)) * dist, math.sin(math.radians(yaw)) * dist, up))
                    bad = 0
                    for dx in (-0.25, 0.0, 0.25):
                        for dz in (-0.45, -0.2, 0.0, 0.2):
                            side = Vector((-math.sin(math.radians(yaw)), math.cos(math.radians(yaw)), 0)) * dx
                            Pt = H + side + Vector((0, 0, dz))
                            d = Pt - C
                            hit = sc.ray_cast(dg, C, d.normalized(), distance=d.length - 0.02)
                            if hit[0] and not hit[4].name.startswith(tgt_name):
                                bad += 1
                    # il viso deve guardare verso la camera (davanti, non di nuca)
                    fw = A[tgt_name].ch.rig.matrix_world.to_3x3() @ Vector((0, -1, 0))
                    front = (C - H).normalized().dot(fw)
                    res.append((bad, -front, yaw, dist, up, tuple(round(v, 2) for v in C)))
        res.sort()
        for r in res[:12]:
            print(sid, "candidato coperti", r[0], "frontale", round(-r[1], 2), "yaw", r[2], "dist", r[3], "up", r[4], "C", r[5], flush=True)
    sys.exit(0)
if MODE == "storyboard":
    os.makedirs(os.path.join(OUT, "storyboard"), exist_ok=True)
    times = []
    only = os.environ.get("ADS_SHOTS")
    for s in SHOTS[:-1]:
        if only and s[0] not in only.split(","):
            continue
        tm = s[1] + (s[2] - s[1]) * 0.6
        fi = int(round(tm * FPS))
        t1 = time.time()
        render_frame(fi, os.path.join(OUT, "storyboard", f"shot_{s[0]}.png"), do_qc=True)
        times.append(round(time.time() - t1, 1))
    json.dump(dict(tempi_s=times, passaggio_cartellina=QC_HANDOFF, gomiti=ELBOW_LOG, movimenti_spostati={n: A[n].shifts for n in CAST}, qc=QCLOG),
              open(os.path.join(OUT, "qc_storyboard.json"), "w"), ensure_ascii=False, indent=1)
else:
    f0, f1 = int(RANGE[0] * FPS), min(int(DUR * FPS), int(RANGE[1] * FPS))
    STEP = int(os.environ.get("ADS_STEP", "1"))  # 2 = animatic a 15 fps (ogni immagine tenuta 2 fotogrammi nel montaggio a 30 fps)
    for fi in range(f0, f1):
        if fi >= int(93.6 * FPS):
            break  # il marchio finale si monta a parte
        if fi % STEP:
            continue
        p = os.path.join(OUT, "frames", f"f_{fi + 1:05d}.png")
        if os.path.exists(p):
            continue
        render_frame(fi, p, do_qc=((fi // STEP) % 8 == 0))
        if fi % 30 == 0:
            json.dump(QCLOG, open(os.path.join(OUT, f"qc_{f0}_{f1}.json"), "w"), indent=1)
            print(f"fotogramma {fi + 1} t={fi / FPS:.1f}s  {time.time() - t_start:.0f}s", flush=True)
    json.dump(QCLOG, open(os.path.join(OUT, f"qc_{f0}_{f1}.json"), "w"), indent=1)
print("ok", MODE, round(time.time() - t_start, 1), "s")
