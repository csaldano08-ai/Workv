"""
TEST DI RECITAZIONE (supermercato, ~11 s) — prova che deve dimostrare la qualità del movimento PRIMA di rifare l'episodio.

    TR_MODE=render  TR_RES=540x960 TR_SAMPLES=8 TR_RANGE=0-12  python test_recitazione.py <out>   # fotogrammi (30 fps veri)
    TR_MODE=qc      TR_STEP=1 python test_recitazione.py <out>                                     # controlli A, B, C, E, F per fotogramma
    TR_MODE=curves  python test_recitazione.py <out>                                               # canali campionati (Graph Editor) + scatti

Azione (tutta animata, nessuna posa ferma con stacchi):
 1. il protagonista cammina (impronte bloccate) guardando il telefono e gli scaffali;
 2. nota Luca e si ferma davanti a lui (assestamento del peso);
 3. solleva il telefono (anticipazione: abbassa la mano e indietreggia col busto, poi sale veloce e si posa con un piccolo superamento);
 4. legge, poi gira il telefono verso Luca per mostrargli la lista (prima lo ritira verso di sé, poi lo porge);
 5. Luca guarda il telefono (prima gli occhi, poi la testa), si sporge e legge, poi reagisce: anticipazione (si contrae),
    sobbalzo (si allunga, occhi tondi, sopracciglia oltre la posa), assestamento, capisce e fa il saluto «sissignore»;
 6. il protagonista passa da speranzoso a confuso a imbarazzato (spalle su, rossore, sudore, telefono ritirato al petto),
    distoglie lo sguardo e poi guarda in camera (occhi prima, testa dopo, con assestamento).
Regole: 30 fps veri; ogni canale ha le sue chiavi e il suo tipo di curva (cs_acting); parti che seguono in ritardo;
molle sulle mani e sulla testa; pause volute vive (respiro e derive lente); niente doppiaggio (marcatori nel file `marcatori.json`).
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

import cs_pose as PO  # noqa: E402
import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_acting import Curve, Face, Life, blink_curve, delay, spring  # noqa: E402
from cs_actor import body_matrix  # noqa: E402
from cs_char import Character  # noqa: E402
from cs_face import draw_face  # noqa: E402
from cs_market import Market  # noqa: E402
from cs_props import build_cart, build_clipboard, note_texture  # noqa: E402
from cs_walk import walk_between  # noqa: E402

OUT = os.path.abspath(sys.argv[1])
MODE = os.environ.get("TR_MODE", "render")
RES = tuple(int(v) for v in os.environ.get("TR_RES", "540x960").split("x"))
SAMPLES = int(os.environ.get("TR_SAMPLES", "8"))
RANGE = tuple(float(v) for v in os.environ.get("TR_RANGE", "0-99").split("-"))
STEP = int(os.environ.get("TR_STEP", "1"))
FPS = 30
DT = 1.0 / FPS
WD = os.path.join(OUT, "_wd")
os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
os.makedirs(WD, exist_ok=True)
t_start = time.time()

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
PC = Character("protagonista", os.path.join(WD, "protagonista"))
LC = Character("dipendente", os.path.join(WD, "dipendente"))
phone = S.build_phone(name="telefono")
note = note_texture(os.path.join(WD, "nota.png"), [("OGGI:", (180, 30, 50)), ("ISPETTORE", (30, 30, 30)), ("della direzione", (30, 30, 30)),
                                                   ("giacca blu,", (40, 60, 120)), ("controlla tutto", (30, 30, 30)), ("col telefono!", (30, 30, 30))])
clip = build_clipboard("cartellina_luca", note=note)
cam = S.camera((0, -4, 1.5), (0, 0, 1), 24, clip=(0.05, 40.0))
sc.camera = cam
ENV = [O[n] for n in ("muri", "scaffale_0", "scaffale_1", "scaffale_2", "ortofrutta_tavoli", "casse", "ufficio_arredo", "porta_telaio", "porta_anta")]


def mirror_socket(M):
    F = Matrix.Diagonal((-1, 1, 1, 1))
    return F @ M @ F


SOCK_READ_L = mirror_socket(PO.phone_socket(PC, "read"))
CLIP_SOCK = Matrix.Translation(Vector((0.0, 0.09, 0.03))) @ Matrix.Rotation(math.radians(90), 4, "X")
_SCREEN_N = SOCK_READ_L.to_3x3() @ Vector((0, -1, 0))
_SCREEN_UP = SOCK_READ_L.to_3x3() @ Vector((0, 0, 1))


def solve_phone_grip():
    keep = PC.rig.matrix_world.copy()
    PC.rig.matrix_world = Matrix.Identity(4)
    Pp = PO.idle(PC)
    Pp["hand.L"] = ((0.15, -0.45, 1.0), (0.0, -0.3, 1.0), (0.0, 1.0, 0.2))
    Pp["fingers.L"] = (0, 0, 0, 0)
    PC.pose(Pp)
    PO.place_prop(PC, phone, "L", SOCK_READ_L)
    sw, shh = phone["screen_size"]
    res = PO.solve_grip(PC, phone, "L", screen=(sw, shh, S.PHONE_T))
    PC.rig.matrix_world = keep
    return PO.grip_pose(res)


GRIP_L = solve_phone_grip()

# ====================================================================== geografia (linea d'azione protagonista → Luca)
TH = 70.0
U = Vector((math.cos(math.radians(TH)), math.sin(math.radians(TH)), 0.0))
NL = Vector((-U.y, U.x, 0.0))                       # lato sinistro della linea: tutte le camere stanno qui (regola dei 180°)
LU0 = Vector((-1.75, 6.35, 0.0))
PE = LU0 - U * 0.95                                  # dove si ferma il protagonista
PS = PE - U * 1.45                                   # da dove parte
T_WALK = 0.35
wk = walk_between(PC, (PS.x, PS.y), (PE.x, PE.y), T_WALK, "normale", anticip=0.3)
s = wk.t_end                                         # fine della camminata (assestamento compreso): tutti i tempi dopo sono relativi
END = round(s + 7.6, 2)
NF = int(round(END * FPS))
W_LU = body_matrix((LU0.x, LU0.y), TH + 180.0)
W_PE = body_matrix((PE.x, PE.y), TH)
SHOTS = [("1", 0.0, s + 0.1), ("2", s + 0.1, s + 4.12), ("3", s + 4.12, END + 1)]   # campo largo · sopra la spalla del protagonista · primo piano del protagonista


def shot_at(t):
    return next(x for x in SHOTS if x[1] <= t < x[2])


def hand_basis(fd, pm):
    y = Vector(fd).normalized()
    z = Vector(pm)
    z = (z - y * z.dot(y)).normalized()
    return Matrix((y.cross(z), y, z)).transposed()


def q_of(fd, pm):
    return tuple(hand_basis(fd, pm).to_quaternion())


def fdpm_of(q):
    R = Quaternion(q).normalized().to_matrix()
    return tuple(R.col[1]), tuple(R.col[2])


def head_center_body(ch):
    return Vector((0.0, 0.0, ch.head_c.z))


# ====================================================================== pose chiave del protagonista (spazio del corpo)
LOW = ((0.17, -0.40, 0.86), (-1.0, -0.1, 0.25), (0.1, 0.4, 0.9))
READ = ((0.12, -0.4, 1.0), (-1.0, 0.05, 0.18), (0.08, 0.5, 0.86))
CHEST = ((0.12, -0.31, 0.93), None, None)
q_low, q_read = q_of(*LOW[1:]), q_of(*READ[1:])
# «mostra»: la mano ruota (dalla presa di lettura) finché lo schermo punta alla testa di Luca
lu_head_P = W_PE.inverted() @ (W_LU @ head_center_body(LC))
SHOW_POS = Vector((0.2, -0.36, 1.05))
R_read = hand_basis(*READ[1:])
n_r, u_r = R_read @ _SCREEN_N, R_read @ _SCREEN_UP


def basis2(n, u):
    n = n.normalized()
    u = (u - n * u.dot(n)).normalized()
    return Matrix((n, u, n.cross(u))).transposed()


Q_show = basis2(lu_head_P - SHOW_POS, Vector((0, 0, 1))) @ basis2(n_r, u_r).transposed()
q_show = tuple((Q_show @ R_read).to_quaternion())
qa, qb = Quaternion(q_read), Quaternion(q_low)
q_chest = tuple(qa.slerp(qb, 0.5))


def fix_hemi(q, ref):
    return tuple(-c for c in q) if sum(a * b for a, b in zip(q, ref)) < 0 else q


q_low, q_chest, q_show = fix_hemi(q_low, q_read), fix_hemi(q_chest, q_read), fix_hemi(q_show, q_read)

# ====================================================================== curve del protagonista
P_hL = Curve(LOW[0])                       # posizione del polso sinistro (telefono)
P_qL = Curve(q_low)                        # orientamento della mano sinistra
P_eL = Curve((0.6, 0.2, 0.7))
P_hL.key(s - 0.05, LOW[0], "hold")
P_hL.key(s + 0.12, (0.17, -0.31, 0.80), "ease")            # anticipazione: la mano scende e si avvicina
P_hL.key(s + 0.5, READ[0], "out").key(s + 0.62, (0.12, -0.41, 1.006), "soft").key(s + 0.78, READ[0], "ease")   # sale veloce, supera di poco, si posa
P_qL.key(s + 0.12, q_low, "hold").key(s + 0.55, q_read, "out")
P_eL.key(s + 0.12, (0.6, 0.2, 0.7), "hold").key(s + 0.55, (0.55, 0.1, 0.7), "out")
P_hL.key(s + 1.4, (0.12, -0.405, 1.012), "ease")           # lettura: piccola deriva
P_hL.key(s + 1.56, (0.11, -0.34, 1.0), "ease")             # ritira il telefono verso di sé (anticipazione del porgere)
P_hL.key(s + 2.0, tuple(SHOW_POS), "back")                 # lo porge a Luca
P_qL.key(s + 1.5, q_read, "hold").key(s + 1.98, q_show, "out")
P_eL.key(s + 1.5, (0.55, 0.1, 0.7), "hold").key(s + 1.98, (0.7, 0.05, 0.85), "out")
P_hL.key(s + 3.6, (0.205, -0.37, 1.055), "ease")           # tiene il telefono verso Luca (tenuta viva)
P_hL.key(s + 4.2, (0.19, -0.35, 1.04), "ease")             # confuso: il braccio cede appena
P_hL.key(s + 4.5, (0.19, -0.35, 1.04), "hold")
P_hL.key(s + 5.2, CHEST[0], "ease")                        # imbarazzo: ritira il telefono al petto
P_qL.key(s + 4.5, q_show, "hold").key(s + 5.2, q_chest, "ease")
P_eL.key(s + 4.5, (0.7, 0.05, 0.85), "hold").key(s + 5.2, (0.6, 0.18, 0.72), "ease")
P_hL.key(s + 7.9, (0.125, -0.315, 0.935), "ease")

WREST = wk.pose_at(s)[1]                 # mano destra a fine camminata: le curve partono da lì (nessun salto)
P_hR = Curve(WREST["hand.R"][0])
P_qR = Curve(q_of(WREST["hand.R"][1], WREST["hand.R"][2]))
P_eR = Curve(WREST["elbow.R"])
P_fR = Curve(WREST["fingers.R"])
q_open = q_of((-0.45, -0.85, 0.25), (0.05, -0.1, 1.0))      # palmo in su: «ecco»
q_open = fix_hemi(q_open, P_qR.at(0))
P_hR.key(s + 1.62, WREST["hand.R"][0], "hold").key(s + 2.05, (-0.36, -0.3, 0.96), "back").key(s + 2.9, (-0.35, -0.28, 0.95), "ease")
P_qR.key(s + 1.62, P_qR.at(0), "hold").key(s + 2.05, q_open, "out")
P_eR.key(s + 1.62, WREST["elbow.R"], "hold").key(s + 2.05, (-0.68, 0.12, 0.8), "out")
P_fR.key(s + 1.62, WREST["fingers.R"], "hold").key(s + 2.0, (6, 6, 8, 12), "out")
P_hR.key(s + 4.1, (-0.34, -0.12, 0.86), "ease")            # confuso: la mano ricade
P_qR.key(s + 3.7, q_open, "hold").key(s + 4.15, P_qR.at(0), "ease")
P_fR.key(s + 3.7, (6, 6, 8, 12), "hold").key(s + 4.15, (30, 34, 38, 14), "ease")
P_hR.key(s + 4.55, (-0.34, -0.12, 0.86), "hold").key(s + 5.0, (-0.3, -0.1, 0.86), "out")    # si chiude un po' su se stesso
P_hR.key(s + 7.9, (-0.305, -0.1, 0.858), "ease")

P_pel = Curve((0.0, 0.0, 0.0))           # spostamento del bacino (peso) aggiunto alla camminata
P_pel.key(s, (0, 0, 0), "hold").key(s + 0.12, (0.0, 0.012, -0.006), "ease")           # anticipazione del telefono: indietro
P_pel.key(s + 0.55, (-0.006, -0.008, 0.004), "out").key(s + 1.0, (-0.012, -0.004, 0.0), "ease")   # peso sulla gamba destra
P_pel.key(s + 1.56, (-0.012, 0.006, -0.003), "ease").key(s + 2.0, (-0.006, -0.018, 0.0), "back")    # porge: peso avanti
P_pel.key(s + 4.5, (-0.006, -0.018, 0.0), "ease").key(s + 4.9, (0.004, 0.022, -0.014), "out")      # imbarazzo: indietro e giù
P_pel.key(s + 5.7, (0.008, 0.02, -0.012), "ease").key(s + 7.9, (0.01, 0.018, -0.011), "ease")
P_chest = Curve((0.0, 0.0, 0.0))
P_chest.key(s, (0, 0, 0), "hold").key(s + 0.12, (-3.0, 2.0, 0.0), "ease").key(s + 0.55, (3.0, -1.0, 0.0), "out").key(s + 0.9, (2.0, 0.0, 0.0), "ease")
P_chest.key(s + 1.56, (-1.5, 3.0, 0.0), "ease").key(s + 2.0, (5.0, -4.0, 0.0), "back").key(s + 3.6, (4.0, -3.0, 0.0), "ease")
P_chest.key(s + 4.2, (2.0, -2.0, 1.5), "ease")
P_chest.key(s + 4.5, (2.0, -2.0, 1.5), "hold").key(s + 4.85, (-3.0, 0.0, 0.0), "out").key(s + 5.3, (7.0, 1.0, 0.0), "ease")   # si irrigidisce, poi si incurva
P_chest.key(s + 7.9, (6.5, 1.5, 0.5), "ease")
P_head = Curve((0.0, 0.0, 0.0))         # testa (oltre allo sguardo): inclinazioni d'espressione
P_head.key(s + 3.9, (0, 0, 0), "hold").key(s + 4.2, (0.0, 0.0, 9.0), "out").key(s + 4.5, (0.0, 0.0, 7.0), "ease")   # confuso: testa inclinata
P_head.key(s + 4.85, (3.0, 0.0, -2.0), "out").key(s + 5.6, (6.0, 0.0, -3.0), "ease")
P_head.key(s + 6.2, (4.0, 0.0, 5.0), "ease").key(s + 6.9, (4.0, 0.0, 5.0), "ease").key(s + 7.05, (1.5, 0.0, 6.0), "out").key(s + 7.5, (4.0, 0.0, 5.0), "ease")
P_shr = Curve(0.0)
P_shr.key(s + 4.5, 0.0, "hold").key(s + 4.8, 16.0, "out").key(s + 5.3, 11.0, "ease").key(s + 6.9, 10.0, "ease").key(s + 7.05, 14.0, "out").key(s + 7.5, 10.0, "ease")

# ====================================================================== curve di Luca
CLIP_H = ((0.18, -0.38, 0.95), (0.4, -0.3, 1.0), (-0.2, 0.9, 0.3))
L_hL = Curve(CLIP_H[0])
L_hL.key(s - 1.2, CLIP_H[0], "hold").key(s - 0.8, (0.2, -0.33, 0.9), "ease")            # abbassa la cartellina vedendolo arrivare
L_hL.key(s + 2.6, (0.2, -0.33, 0.9), "hold").key(s + 2.72, (0.2, -0.31, 0.88), "ease")   # anticipazione
L_hL.key(s + 2.9, (0.21, -0.38, 0.98), "back").key(s + 3.2, (0.2, -0.35, 0.93), "ease")  # sobbalzo: la cartellina salta su
L_IDLE_R = PO.idle(LC)["hand.R"]          # riposo vero del rig (la mano a -0,33 che usavo prima toccava il busto)
L_hR = Curve(L_IDLE_R[0])
L_qR = Curve(q_of(L_IDLE_R[1], L_IDLE_R[2]))   # orientamento di riposo del rig (palmo verso il corpo)
L_eR = Curve((-0.7, 0.18, 0.85))
L_fR = Curve((22, 26, 30, 10))
# saluto: il polso resta 12 cm fuori dalla testa (centro (0, 0, 1,352), raggio 0,29) e le dita puntano al sopracciglio destro.
# Nell'episodio la mano del saluto era a 27,6 cm dal centro, cioè DENTRO la testa (il controllo guardava solo il busto).
SALUTE = ((-0.30, -0.26, 1.47), (0.84, 0.52, 0.19), (0.0, -0.4, -0.9))
q_sal = fix_hemi(q_of(*SALUTE[1:]), L_qR.at(0))
L_hR.key(s + 3.45, L_IDLE_R[0], "hold").key(s + 3.53, tuple(Vector(L_IDLE_R[0]) + Vector((-0.01, 0.015, -0.03))), "ease")    # anticipazione del saluto
L_hR.key(s + 3.67, (-0.52, -0.27, 1.1), "in2")                                           # arco: la mano passa di lato, lontana dal petto
L_hR.key(s + 3.85, SALUTE[0], "back").key(s + 5.4, (-0.3, -0.265, 1.465), "ease")
L_hR.key(s + 5.9, L_IDLE_R[0], "ease")
L_qR.key(s + 3.66, L_qR.at(0), "hold").key(s + 3.86, q_sal, "out").key(s + 5.4, q_sal, "hold").key(s + 5.9, L_qR.at(0), "ease")   # la mano si gira solo sopra il petto
L_eR.key(s + 3.53, (-0.7, 0.18, 0.85), "hold").key(s + 3.67, (-0.72, 0.0, 1.05), "in2").key(s + 3.8, (-0.62, -0.1, 1.25), "out").key(s + 5.4, (-0.62, -0.1, 1.25), "hold").key(s + 5.9, (-0.7, 0.18, 0.85), "ease")
L_fR.key(s + 3.53, (22, 26, 30, 10), "hold").key(s + 3.8, (2, 2, 4, 8), "out").key(s + 5.4, (2, 2, 4, 8), "hold").key(s + 5.9, (22, 26, 30, 10), "ease")
L_chest = Curve((0.0, 0.0, 0.0))
L_chest.key(s - 1.3, (0, 0, 0), "hold").key(s - 0.7, (-2.5, 0, 0), "ease")                 # si raddrizza vedendolo arrivare
L_chest.key(s + 1.7, (-2.5, 0, 0), "hold").key(s + 2.2, (7.0, 0, 0), "ease")               # si sporge a leggere
L_chest.key(s + 2.6, (7.5, 0, 0), "ease").key(s + 2.75, (10.0, 0, 0), "ease")              # anticipazione: si contrae
L_chest.key(s + 2.95, (-8.0, 0, -2.0), "back").key(s + 3.3, (-4.0, 0, -1.0), "ease")       # sobbalzo e assestamento
L_chest.key(s + 3.53, (-4.0, 0, 0), "hold").key(s + 3.85, (-6.0, 0, 0), "back").key(s + 7.3, (-5.5, 0, 0), "ease")   # sull'attenti
L_head = Curve((0.0, 0.0, 0.0))
L_head.key(s + 1.7, (0, 0, 0), "hold").key(s + 2.2, (6.0, 0, 0), "ease").key(s + 2.6, (6.5, 0, 0), "ease").key(s + 2.75, (9.0, 0, 0), "ease")
L_head.key(s + 2.95, (-12.0, 0, 3.0), "back").key(s + 3.3, (-4.0, 0, 6.0), "ease")
L_head.key(s + 3.53, (-4.0, 0, 2.0), "ease").key(s + 3.85, (-5.0, 0, 0.0), "back")
for tn in (s + 3.98, s + 4.32):                                                               # due cenni: «sissignore»
    L_head.key(tn, (-5.0, 0, 0), "hold").key(tn + 0.11, (1.0, 0, 0), "out").key(tn + 0.3, (-5.0, 0, 0), "ease")
L_head.key(s + 7.3, (-4.5, 0, 0), "ease")
L_pel = Curve((0.0, 0.0, 0.0))
L_pel.key(s + 1.7, (0, 0, 0), "hold").key(s + 2.2, (0.0, 0.012, 0.0), "ease")             # sporgendosi, il bacino compensa indietro
L_pel.key(s + 2.6, (0.0, 0.012, 0.0), "hold").key(s + 2.75, (0.0, 0.01, -0.012), "ease")   # schiacciamento
L_pel.key(s + 2.95, (0.0, 0.0, 0.012), "back").key(s + 3.3, (0.0, 0.004, 0.0), "ease")     # allungamento, poi assestamento
L_pel.key(s + 3.85, (0.0, 0.0, 0.006), "back").key(s + 7.3, (0.0, 0.0, 0.005), "ease")
L_shr = Curve(0.0)
L_shr.key(s + 2.6, 0.0, "hold").key(s + 2.75, 9.0, "ease").key(s + 2.95, -3.0, "back").key(s + 3.3, 0.0, "ease")

# ====================================================================== volti (sopracciglia in anticipo, bocca in ritardo)
PF = Face(PC.face_expr("neutro"))
PF.to(0.2, dict(brow_tilt=0.12, brow_lift=-0.02, mouth_w=0.85), 0.4, "ease")                       # concentrato sul telefono
PF.to(s - 0.85, dict(brow_lift=0.1, brow_tilt=0.0, eye_scale=1.06), 0.25, "out")                  # nota Luca
PF.to(s - 0.4, dict(mouth="smile", mouth_w=0.9, brow_lift=0.06), 0.35, "ease")
PF.to(s + 0.6, dict(brow_tilt=0.15, brow_lift=0.0, eye_scale=1.0, mouth="line", mouth_w=0.8), 0.3, "ease")   # legge
PF.to(s + 1.55, dict(brow_lift=0.16, brow_tilt=-0.05, mouth="grin", mouth_w=1.0, mouth_open=0.5, eye_scale=1.06), 0.3, "out")   # «ecco!»
PF.to(s + 3.92, dict(brow_asym=0.65, brow_lift=0.06, eye_asym=0.22, mouth="wobble", mouth_w=0.6, mouth_dx=0.07), 0.3, "out")    # confuso
PF.to(s + 4.5, dict(brow_asym=0.0, eye_asym=0.0, brow_tilt=0.45, brow_lift=0.03, mouth_w=0.72, mouth_dx=0.0, blush=1.0), 0.8, "ease")  # imbarazzo
PF.to(s + 4.95, dict(sweat=1.0), 0.35, "out")
PF.to(s + 5.65, dict(eyes="half", brow_tilt=0.33, brow_lift=-0.02, mouth="line", mouth_w=1.05, blush=0.85), 0.3, "ease")      # in camera
PF.to(s + 6.9, dict(brow_lift=0.07), 0.15, "out")
PF.to(s + 7.1, dict(brow_lift=-0.02), 0.4, "ease")
LF = Face(LC.face_expr("neutro"))
LF.to(0.0, dict(brow_tilt=-0.1, mouth_w=0.8), 0.1, "ease")
LF.to(s - 1.25, dict(brow_lift=0.1, brow_tilt=0.0, eye_scale=1.05), 0.25, "out")
LF.to(s - 0.7, dict(mouth="smile", mouth_w=0.95), 0.35, "ease")
LF.to(s + 1.75, dict(eyes="half", brow_tilt=-0.22, brow_lift=-0.03, eye_scale=1.0, mouth="line", mouth_w=0.65, mouth_dx=0.05), 0.35, "ease")   # legge
LF.to(s + 2.6, dict(brow_tilt=-0.38, mouth_w=0.55), 0.15, "ease")                                 # anticipazione
LF.to(s + 2.75, dict(eyes="round", eye_scale=1.22, pupil=0.55, brow_tilt=0.0, brow_lift=0.34, brow_curve=0.5, mouth="o", mouth_open=0.85, mouth_dx=0.0), 0.2, "back", brow_lead=0.03, mouth_lag=0.03)
LF.to(s + 3.0, dict(eye_scale=1.08, pupil=0.8, brow_lift=0.26), 0.3, "ease")                    # assestamento
LF.to(s + 3.15, dict(eyes="dot", eye_scale=1.0, pupil=1.0, mouth="grin", mouth_w=1.12, mouth_open=0.6, brow_lift=0.16), 0.3, "out")   # capisce: «l'ispettore!»
LF.to(s + 3.6, dict(eyes="happy", mouth="teeth_smile", mouth_w=1.1, brow_lift=0.1), 0.25, "out")   # sull'attenti

# ====================================================================== sguardi: gli occhi arrivano in 2 fotogrammi, la testa segue dopo con una molla
P_GAZE = [(0.0, "phone"), (1.35, "produce"), (2.15, "phone"), (s - 0.9, "luca"), (s + 0.3, "phone"), (s + 1.52, "luca"),
          (s + 5.05, "down"), (s + 5.65, "camera")]
L_GAZE = [(0.0, "clip"), (s - 1.3, "p_head"), (s + 0.35, "phone"), (s + 1.1, "p_head"), (s + 1.62, "phone"), (s + 3.05, "p_head")]
P_BLINKS = [0.9, 3.0, s - 0.88, s + 1.5, s + 4.4, s + 5.62, s + 6.75]
L_BLINKS = [0.6, 2.6, s - 1.28, s + 1.6, s + 3.5, s + 5.2, s + 6.6]
P_LIFE, L_LIFE = Life(11), Life(23, breath_s=3.2)


# ====================================================================== camera
def cam_at(t, p_chest_w, p_head_w, l_head_w, phone_w):
    """Tre inquadrature, tutte dal lato sinistro della linea protagonista → Luca (NL): campo largo 3/4 davanti al protagonista,
    sopra la sua spalla sinistra (schermo del telefono e viso di Luca), controcampo sopra la spalla destra di Luca (viso del protagonista)."""
    sh = shot_at(t)[0]
    if sh == "1":
        C = PE + U * 1.6 + NL * 1.7
        C.z = 1.42
        k = max(0.0, min(1.0, (t - (s - 1.3)) / 1.3))
        k = k * k * (3 - 2 * k)
        two = (p_head_w + l_head_w) * 0.5 - Vector((0, 0, 0.45))
        return C, p_chest_w.lerp(two, k), 22.0
    if sh == "2":
        # sopra la spalla sinistra del protagonista, abbastanza di lato perché la sua testa resti sul bordo e Luca si veda intero
        k = max(0.0, min(1.0, (t - (s + 0.1)) / 4.0))
        k = k * k * (3 - 2 * k)
        Ca = PE - U * 1.1 + NL * 1.2
        Ca.z = 1.85
        Cb = PE - U * 1.0 + NL * 1.1
        Cb.z = 1.82
        return Ca.lerp(Cb, k), phone_w.lerp(l_head_w, 0.55), 27.0
    # primo piano pulito del protagonista, 3/4 dal suo lato sinistro (nessun primo piano davanti al viso); lenta spinta in avanti
    k = max(0.0, min(1.0, (t - (s + 4.12)) / 3.5))
    k = k * k * (3 - 2 * k)
    Ca = PE + U * 1.0 + NL * 0.85
    Ca.z = 1.5
    Cb = PE + U * 0.9 + NL * 0.78
    Cb.z = 1.48
    return Ca.lerp(Cb, k), p_head_w - Vector((0, 0, 0.22)), 24.0


# ====================================================================== precalcolo di tutti i fotogrammi
def angles_to(W, ch, target_w):
    hw = W @ head_center_body(ch)
    d = W.inverted().to_3x3() @ (target_w - hw)
    yaw = math.degrees(math.atan2(d.x, -d.y))
    pitch = math.degrees(math.atan2(-d.z, math.hypot(d.x, d.y)))
    return yaw, pitch


def gaze_name(lst, t):
    cur, tc = lst[0][1], lst[0][0]
    prev = cur
    for tk, nm in lst:
        if tk <= t:
            prev, cur, tc = cur, nm, tk
    return prev, cur, tc


frames = []
for i in range(NF):
    t = i * DT
    # protagonista: camminata (piedi bloccati) + strati di recitazione
    W_P, Pd = wk.pose_at(min(t, s))
    Pd = dict(Pd)
    walking = 1.0 if T_WALK < t < s - 0.2 else 0.0
    W0, Prest = wk.pose_at(s)
    swingL = Vector(Pd["hand.L"][0]) - Vector(Prest["hand.L"][0]) if t < s else Vector()
    hl = Vector(P_hL.at(t)) + swingL * 0.2
    fdL, pmL = fdpm_of(P_qL.at(t))
    # «vita» delle pause: piena da fermo, nulla mentre cammina (lì muovono già passo, molleggio e braccia)
    k_in = min(1.0, max(0.0, (t - T_WALK) / 0.3))
    k_out = min(1.0, max(0.0, (t - (s - 0.3)) / 0.5))
    stand = 1.0 - k_in + k_out
    b = P_LIFE.breath(t)
    pel = Vector(Pd.get("pelvis_loc", (0, 0, 0))) + Vector(P_pel.at(t)) + Vector((P_LIFE.drift(t, 0, 0.004), 0, 0.0025 * b)) * stand
    ch_rot = Vector(Pd.get("chest_rot", (0, 0, 0))) + Vector(P_chest.at(t)) + Vector((1.1 * b, P_LIFE.drift(t, 1, 1.2), P_LIFE.drift(t, 2, 0.8))) * stand
    hd = Vector(Pd.get("head_rot", (0, 0, 0))) + Vector(P_head.at(t)) + Vector((P_LIFE.drift(t, 3, 1.4), P_LIFE.drift(t, 4, 1.6), P_LIFE.drift(t, 5, 1.0))) * stand
    if t < s:
        hr = Vector(Pd["hand.R"][0])
        k_r = 1.0 - max(0.0, min(1.0, (t - (s - 0.25)) / 0.25))
        hr = hr.lerp(Vector(P_hR.at(t)), 1.0 - k_r)
        fdR, pmR = Pd["hand.R"][1], Pd["hand.R"][2]
        eR = Pd.get("elbow.R", P_eR.at(t))
    else:
        hr = Vector(P_hR.at(t))
        fdR, pmR = fdpm_of(P_qR.at(t))
        eR = P_eR.at(t)
    Pd.update({"hand.L": (tuple(hl), fdL, pmL), "elbow.L": P_eL.at(t), "fingers.L": GRIP_L, "hand.R": (tuple(hr), fdR, pmR), "elbow.R": eR,
               "fingers.R": P_fR.at(t), "pelvis_loc": tuple(pel), "chest_rot": tuple(ch_rot), "head_rot": tuple(hd),
               "shrug.L": P_shr.at(t), "shrug.R": P_shr.at(t) * 0.9})
    # Luca: in piedi, peso che si sposta, cartellina in mano
    Ld = PO.idle(LC)
    bl = L_LIFE.breath(t)
    Ld.update({"hand.L": (L_hL.at(t), CLIP_H[1], CLIP_H[2]), "elbow.L": (0.55, 0.1, 0.7),
               "fingers.L": {"index": (60, 50), "middle": (62, 52), "ring": (64, 54), "thumb": (30, 10)},
               "hand.R": (L_hR.at(t),) + fdpm_of(L_qR.at(t)), "elbow.R": L_eR.at(t), "fingers.R": L_fR.at(t),
               "pelvis_loc": tuple(Vector(L_pel.at(t)) + Vector((L_LIFE.drift(t, 0, 0.006), L_LIFE.drift(t, 1, 0.003), 0.002 * bl))),
               "chest_rot": tuple(Vector(L_chest.at(t)) + Vector((1.0 * bl, L_LIFE.drift(t, 2, 1.5), L_LIFE.drift(t, 3, 1.0)))),
               "head_rot": tuple(Vector(L_head.at(t)) + Vector((L_LIFE.drift(t, 4, 1.2), L_LIFE.drift(t, 5, 1.5), 0.0))),
               "shrug.L": L_shr.at(t), "shrug.R": L_shr.at(t)})
    frames.append(dict(t=t, W_P=W_P.copy(), P=Pd, W_L=W_LU.copy(), L=Ld))

# molle: le mani seguono il corpo con ritardo e si assestano (sovrapposizione); il ritardo è nello spazio del corpo
for key, f, z in (("hand.L", 4.5, 0.62), ("hand.R", 3.2, 0.55)):
    arr = np.array([fr_["P"][key][0] for fr_ in frames])
    sm = spring(arr, DT, f=f, z=z)
    for fr_, v in zip(frames, sm):
        fr_["P"][key] = (tuple(v),) + tuple(fr_["P"][key][1:])
for key, f, z in (("hand.L", 4.0, 0.6), ("hand.R", 3.8, 0.68)):
    arr = np.array([fr_["L"][key][0] for fr_ in frames])
    sm = spring(arr, DT, f=f, z=z)
    for fr_, v in zip(frames, sm):
        fr_["L"][key] = (tuple(v),) + tuple(fr_["L"][key][1:])


# posizioni dei bersagli dello sguardo (approssimate dal precalcolo: errori di pochi cm → meno di 3°)
def p_head_w(fr_):
    return fr_["W_P"] @ (head_center_body(PC) + Vector(fr_["P"]["pelvis_loc"]))


def l_head_w(fr_):
    return fr_["W_L"] @ (head_center_body(LC) + Vector(fr_["L"]["pelvis_loc"]))


def phone_w(fr_):
    h = fr_["P"]["hand.L"]
    return fr_["W_P"] @ (Vector(h[0]) + Vector(h[1]).normalized() * 0.07)


def clip_w(fr_):
    return fr_["W_L"] @ (Vector(fr_["L"]["hand.L"][0]) + Vector((0.0, -0.05, 0.08)))


for fr_ in frames:
    t = fr_["t"]
    c, tg, lens = cam_at(t, fr_["W_P"] @ Vector((0, 0, 1.15)), p_head_w(fr_), l_head_w(fr_), phone_w(fr_))
    fr_["cam"] = (c, tg, lens)
# camera della ripresa 1: l'operatore segue con un po' di ritardo (molla sul punto guardato)
idx1 = [i for i, fr_ in enumerate(frames) if shot_at(fr_["t"])[0] == "1"]
sm = spring(np.array([tuple(frames[i]["cam"][1]) for i in idx1]), DT, f=1.1, z=0.95)
for i, v in zip(idx1, sm):
    frames[i]["cam"] = (frames[i]["cam"][0], Vector(v), frames[i]["cam"][2])
idx2 = [i for i, fr_ in enumerate(frames) if shot_at(fr_["t"])[0] == "2"]
sm = spring(np.array([tuple(frames[i]["cam"][1]) for i in idx2]), DT, f=1.6, z=0.95)
for i, v in zip(idx2, sm):
    frames[i]["cam"] = (frames[i]["cam"][0], Vector(v), frames[i]["cam"][2])


def target_w(name, fr_, who):
    if name == "phone":
        return phone_w(fr_)
    if name == "luca" or name == "p_head":
        return l_head_w(fr_) if who == "P" else p_head_w(fr_)
    if name == "produce":
        return Vector((-3.75, 5.35, 0.95))     # cassette di verdura alla sua sinistra (dal lato della camera: il viso resta visibile)
    if name == "clip":
        return clip_w(fr_)
    if name == "down":
        return fr_["W_P"] @ Vector((0.6, -0.95, 0.95))
    if name == "camera":
        return fr_["cam"][0]
    raise KeyError(name)


for who, lst, ch, Wk, Dk, amt in (("P", P_GAZE, PC, "W_P", "P", 0.62), ("L", L_GAZE, LC, "W_L", "L", 0.6)):
    eyes = []
    for fr_ in frames:
        t = fr_["t"]
        prev, cur, tc = gaze_name(lst, t)
        a1 = angles_to(fr_[Wk], ch, target_w(cur, fr_, who))
        a0 = angles_to(fr_[Wk], ch, target_w(prev, fr_, who))
        u = min(1.0, max(0.0, (t - tc) / 0.07))              # saccade: 2 fotogrammi
        u = 1 - (1 - u) ** 2
        eyes.append((a0[0] + (a1[0] - a0[0]) * u, a0[1] + (a1[1] - a0[1]) * u))
    eyes = np.array(eyes)
    head_des = np.stack([np.clip(eyes[:, 0] * amt, -48, 48), np.clip(eyes[:, 1] * amt, -28, 34)], 1)
    head = spring(delay(head_des, 2), DT, f=2.3, z=0.58)      # la testa parte 2 fotogrammi dopo gli occhi e si assesta
    for fr_, e, h in zip(frames, eyes, head):
        d = fr_[Dk]
        hr = d["head_rot"]
        d["head_rot"] = (hr[0] + h[1], hr[1] + h[0], hr[2])
        gx = max(-1.0, min(1.0, (e[0] - h[0]) / 30.0))
        gy = max(-1.0, min(1.0, -(e[1] - h[1]) / 25.0))
        fr_["gaze_" + who] = (gx, gy)
        fr_["gname_" + who] = gaze_name(lst, fr_["t"])[1]

# ====================================================================== gomiti: nessun braccio nel busto
# Il risolutore del rig (PO.solve_elbow) prova le direzioni del gomito attorno all'asse spalla-polso e sceglie la più vicina a
# quella voluta senza compenetrazioni. Si risolve ogni 3 fotogrammi solo dove il braccio tocca il busto, poi si interpola
# e si ammorbidisce (nessun gomito che salta). Risultati in cache: la stessa animazione non si ricalcola.
import hashlib  # noqa: E402


def arm_pen(ch, side):
    """Braccio e mano dentro busto O testa (la testa tonda è grande: il gesto vicino al viso la può attraversare)."""
    shw = ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{side}"].head
    a = QC.penetration(ch.parts[f"arm.{side}"], ch.parts["torso"], ignore=lambda v, g: (v - shw).length < QC.ARM_ROOT)["depth_mm"]
    a += QC.penetration(ch.parts[f"arm.{side}"], ch.parts["head"])["depth_mm"]
    a += QC.penetration(ch.parts[f"hand.{side}"], ch.parts["head"])["depth_mm"]
    return a + QC.penetration(ch.parts[f"hand.{side}"], ch.parts["torso"])["depth_mm"]


def solve_elbow_body(ch, P, side, steps=16, radius=0.45):
    """Come PO.solve_elbow, ma il costo comprende anche la testa: direzione del gomito più vicina a quella voluta senza contatti."""
    ch.pose(P)
    sh = ch.rig.pose.bones[f"upperarm.{side}"].head.copy()
    wr = Vector(P[f"hand.{side}"][0])
    ax = (wr - sh).normalized()
    mid = (sh + wr) / 2
    pd = Vector(P[f"elbow.{side}"]) - mid
    u = (pd - ax * pd.dot(ax)).normalized()
    w = ax.cross(u).normalized()
    best = None
    for k in range(steps):
        a = 2 * math.pi * k / steps
        Q = dict(P)
        Q[f"elbow.{side}"] = tuple(mid + (u * math.cos(a) + w * math.sin(a)) * radius)
        ch.pose(Q)
        cost = arm_pen(ch, side) * 1000 + math.degrees(min(a, 2 * math.pi - a))
        if best is None or cost < best[0]:
            best = (cost, Q[f"elbow.{side}"])
    P[f"elbow.{side}"] = best[1]
    ch.pose(P)


CACHE = os.environ.get("TR_CACHE", os.path.join(OUT, "_cache"))
os.makedirs(CACHE, exist_ok=True)
for who, ch, Wk, Dk in (("P", PC, "W_P", "P"), ("L", LC, "W_L", "L")):
    sig = hashlib.md5(json.dumps([[fr_[Dk].get(k) for k in ("hand.L", "hand.R", "elbow.L", "elbow.R", "chest_rot", "spine_rot", "shrug.L", "shrug.R", "pelvis_loc")]
                                  for fr_ in frames], default=str).encode()).hexdigest()[:16]
    cf = os.path.join(CACHE, f"gomiti_{who}_{sig}.json")
    if os.path.exists(cf):
        sol = {tuple(json.loads(k)): v for k, v in json.load(open(cf)).items()}
    else:
        t1 = time.time()
        samples = sorted(set(list(range(0, NF, 3)) + [NF - 1]))
        sol, nsolved = {}, 0
        for i in samples:
            fr_ = frames[i]
            ch.rig.matrix_world = fr_[Wk]
            Pq = dict(fr_[Dk])
            ch.pose(Pq)
            for side in "LR":
                if arm_pen(ch, side) > 0:
                    solve_elbow_body(ch, Pq, side)
                    nsolved += 1
                sol[(i, side)] = tuple(Pq[f"elbow.{side}"])
        json.dump({json.dumps(list(k)): v for k, v in sol.items()}, open(cf, "w"))
        print(f"gomiti {who}: {nsolved} pose risolte in {time.time() - t1:.0f} s", flush=True)
    for side in "LR":
        keys = sorted(i for (i, sd) in sol if sd == side)
        arr = []
        for i in range(NF):
            a_ = max(k for k in keys if k <= i)
            b_ = min((k for k in keys if k >= i), default=a_)
            u = 0.0 if b_ == a_ else (i - a_) / (b_ - a_)
            arr.append(tuple(Vector(sol[(a_, side)]).lerp(Vector(sol[(b_, side)]), u)))
        arr = spring(np.array(arr), DT, f=5.0, z=1.0)
        for fr_, v in zip(frames, arr):
            fr_[Dk][f"elbow.{side}"] = tuple(v)

# ====================================================================== applicazione di un fotogramma
face_files = {"P": [], "L": []}


def apply(i, faces=True):
    fr_ = frames[i]
    t = fr_["t"]
    PC.rig.matrix_world = fr_["W_P"]
    PC.pose(fr_["P"])
    LC.rig.matrix_world = fr_["W_L"]
    LC.pose(fr_["L"])
    PO.place_prop(PC, phone, "L", SOCK_READ_L)
    hb = LC.rig.pose.bones["hand.L"]
    clip.matrix_world = LC.rig.matrix_world @ hb.matrix @ CLIP_SOCK
    c, tg, lens = fr_["cam"]
    S.aim(cam, c, tg)
    cam.data.lens = lens
    if faces:
        for who, ch, F, bl in (("P", PC, PF, P_BLINKS), ("L", LC, LF, L_BLINKS)):
            img = os.path.join(WD, f"face_{who}_{i:05d}.png")
            dur = 0.3 if (who == "P" and abs(t - (s + 6.75)) < 0.4) else 0.14     # un battito lento, voluto, mentre guarda in camera
            draw_face(F.at(t), gaze=fr_["gaze_" + who], blink=blink_curve(bl, t, dur), size=768).save(img)
            ch.set_face(img)
            face_files[who].append(img)
            while len(face_files[who]) > 3:
                old = face_files[who].pop(0)
                if os.path.exists(old):
                    os.remove(old)
    bpy.context.view_layer.update()


json.dump(dict(durata_s=END, fps=FPS, fine_camminata_s=round(s, 3),
               inquadrature=[dict(n=n, inizio=round(a, 3), fine=round(min(b, END), 3)) for n, a, b in SHOTS],
               marcatori_narrazione=[dict(id="N04", inizio=round(s + 1.6, 2), testo="ma un dipendente, vedendolo controllare gli scaffali, lo scambiò per un ispettore della direzione."),
                                     dict(id="N05", inizio=round(s + 5.0, 2), testo="E lui non ebbe il coraggio di correggerlo.")],
               passi=[round(tb, 3) for (_, ta, tb, sa, sb) in wk.swings],
               eventi=dict(telefono_su=round(s + 0.2, 2), telefono_porto=round(s + 1.6, 2), sobbalzo_luca=round(s + 2.75, 2), saluto=round(s + 3.55, 2),
                           confuso=round(s + 3.92, 2), imbarazzo=round(s + 4.5, 2), sguardo_in_camera=round(s + 5.65, 2)),
               nota="nessun doppiaggio in questa fase: i marcatori indicano dove andranno le battute"),
          open(os.path.join(OUT, "marcatori.json"), "w"), ensure_ascii=False, indent=1)
print(f"preparazione {time.time() - t_start:.0f} s · fine camminata {s:.2f} s · durata {END:.2f} s · {NF} fotogrammi", flush=True)

f0, f1 = int(RANGE[0] * FPS), min(NF, int(RANGE[1] * FPS))
if MODE == "render":
    for i in range(f0, f1, STEP):
        p = os.path.join(OUT, "frames", f"f_{i + 1:05d}.png")
        if os.path.exists(p):
            continue
        apply(i)
        S.render(p)
    print("ok render", round(time.time() - t_start), "s", flush=True)
elif MODE == "curves":
    rows = []
    for i in range(f0, f1):
        apply(i, faces=False)
        fr_ = frames[i]
        for n, ch, Wk, Dk, F, gk in (("protagonista", PC, "W_P", "P", PF, "P"), ("dipendente", LC, "W_L", "L", LF, "L")):
            W = fr_[Wk]
            Wi = W.inverted()
            hands = {sd: tuple(round(v, 5) for v in (Wi @ (ch.rig.matrix_world @ ch.rig.pose.bones[f"hand.{sd}"].head))) for sd in "LR"}
            fp = F.at(fr_["t"])
            rows.append(dict(f=i, t=round(fr_["t"], 4), shot=shot_at(fr_["t"])[0], n=n, loco="Walk" if (n == "protagonista" and fr_["t"] < s) else "Hold",
                             pos=tuple(round(v, 4) for v in W.translation), yaw=round(math.degrees(W.to_euler().z), 3), hand_L=hands["L"], hand_R=hands["R"],
                             head=tuple(round(v, 3) for v in fr_[Dk]["head_rot"]), chest=tuple(round(v, 3) for v in fr_[Dk]["chest_rot"]),
                             pelvis=tuple(round(v, 4) for v in fr_[Dk]["pelvis_loc"]), face=None, gaze=fr_["gname_" + gk],
                             brow_lift=round(fp["brow_lift"], 3), eye_scale=round(fp["eye_scale"], 3), mouth_open=round(fp["mouth_open"], 3),
                             blush=round(fp["blush"], 3), blink=round(blink_curve(P_BLINKS if gk == "P" else L_BLINKS, fr_["t"]), 3)))
    json.dump(rows, open(os.path.join(OUT, "curves.json"), "w"))
    print("ok curves", len(rows), flush=True)
elif MODE == "qc":
    log, events = [], []
    sw, shh = phone["screen_size"]
    prev_feet = None
    for i in range(f0, f1, STEP):
        apply(i, faces=False)
        t = frames[i]["t"]
        rec = dict(f=i, t=round(t, 3), shot=shot_at(t)[0])
        for nm, ch in (("protagonista", PC), ("dipendente", LC)):
            shw = {sd: ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{sd}"].head for sd in "LR"}
            for sd in "LR":
                rec[f"A_{nm}_braccio{sd}_busto_mm"] = QC.penetration(ch.parts[f"arm.{sd}"], ch.parts["torso"], ignore=lambda v, g, sd=sd: (v - shw[sd]).length < QC.ARM_ROOT)["depth_mm"]
                rec[f"A_{nm}_mano{sd}_busto_mm"] = QC.penetration(ch.parts[f"hand.{sd}"], ch.parts["torso"])["depth_mm"]
                rec[f"A_{nm}_mano{sd}_testa_mm"] = QC.penetration(ch.parts[f"hand.{sd}"], ch.parts["head"])["depth_mm"]
                rec[f"A_{nm}_braccio{sd}_testa_mm"] = QC.penetration(ch.parts[f"arm.{sd}"], ch.parts["head"])["depth_mm"]
            rec[f"A_{nm}_busto_ambiente_mm"] = max(QC.penetration(ch.parts["torso"], e)["depth_mm"] for e in ENV)
            rec[f"C_{nm}_piedi_min_z_mm"] = round(min(QC.min_z(ch.parts["foot.L"]), QC.min_z(ch.parts["foot.R"])) * 1000, 2)
        rec["A_busti_mm"] = QC.penetration(PC.parts["torso"], LC.parts["torso"])["depth_mm"]
        rec["A_teste_mm"] = QC.penetration(PC.parts["head"], LC.parts["head"])["depth_mm"]
        rec["A_mano_telefono_mm"] = QC.penetration(PC.parts["hand.L"], phone)["depth_mm"]
        for nm_, x in (("busto_protagonista", PC.parts["torso"]), ("testa_protagonista", PC.parts["head"]), ("busto_luca", LC.parts["torso"]), ("testa_luca", LC.parts["head"]), ("mano_destra_protagonista", PC.parts["hand.R"])):
            rec[f"B_telefono_in_{nm_}_mm"] = QC.penetration(phone, x)["depth_mm"]
        rec["B_cartellina_nei_corpi_mm"] = max(QC.penetration(c, x)["depth_mm"] for c in clip.children for x in (PC.parts["torso"], LC.parts["torso"], LC.parts["head"], PC.parts["hand.L"]))
        rec["B_mano_braccio_luca_nel_protagonista_mm"] = max(QC.penetration(LC.parts[k], x)["depth_mm"] for k in ("hand.R", "hand.L", "arm.L", "arm.R") for x in (PC.parts["torso"], PC.parts["head"]))
        rec["F_vertici_mano_davanti_schermo"] = QC.screen_cover(PC.parts["hand.L"], phone, sw, shh, S.PHONE_T)
        # piedi in appoggio: la suola più bassa non deve scivolare tra due fotogrammi della stessa inquadratura
        feet = {}
        for nm, ch in (("P", PC), ("L", LC)):
            for sd in "LR":
                vs, _, _ = QC.world_mesh(ch.parts[f"foot.{sd}"])
                zmin = min(v.z for v in vs)
                low = [v for v in vs if v.z < zmin + 0.004]
                cx = sum((v for v in low), Vector()) / len(low)
                feet[nm + sd] = (zmin, cx)
        if prev_feet and STEP == 1:
            slip = 0.0
            for k, (z, c) in feet.items():
                z0, c0 = prev_feet[k]
                if z < 0.004 and z0 < 0.004:
                    slip = max(slip, (Vector((c.x, c.y, 0)) - Vector((c0.x, c0.y, 0))).length * 1000)
            rec["C_scivolamento_piede_appoggio_mm"] = round(slip, 2)
        prev_feet = feet
        cpos = cam.matrix_world.translation
        worst = 9.0
        for ch in (PC, LC):
            for k in ("head", "hair", "torso", "hand.L", "hand.R"):
                if k in ch.parts:
                    ins, dist = QC.inside(QC.bvh(ch.parts[k])[0], cpos, 1.0)
                    worst = min(worst, -dist if ins else dist)
        rec["E_camera_distanza_personaggi_mm"] = round(worst * 1000, 1)
        log.append(rec)
        for k, v in rec.items():
            bad = (k.startswith(("A_", "B_")) and v > 0) or (k == "F_vertici_mano_davanti_schermo" and v > 0) or \
                  (k == "C_scivolamento_piede_appoggio_mm" and v > 1.0) or (k.endswith("min_z_mm") and v < 0) or (k.startswith("E_") and v < 50)
            if bad:
                events.append(dict(t=round(t, 3), voce=k, valore=v))
        if i % 30 == 0:
            print("qc", i, len(events), flush=True)
    mx = {}
    for r in log:
        for k, v in r.items():
            if k in ("f", "t", "shot"):
                continue
            mx[k] = (min if k.startswith("E_") or k.endswith("min_z_mm") else max)(mx.get(k, v), v)
    json.dump(dict(fotogrammi=len(log), passo=STEP, problemi=events, massimi=mx), open(os.path.join(OUT, "qc_test.json"), "w"), ensure_ascii=False, indent=1)
    print("ok qc", len(log), "fotogrammi", len(events), "problemi", round(time.time() - t_start), "s", flush=True)
