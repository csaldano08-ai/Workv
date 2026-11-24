"""
Attore: linea temporale di un personaggio (riutilizzabile negli episodi).

- Locomozione: soste, camminate a impronte (cs_walk) e rotazioni sul posto a piedi bloccati (un piede alla volta).
- Parte alta: pose sovrapposte alla locomozione (mani, gomiti, dita, testa, torace) con transizioni morbide.
- Volto: espressioni con transizioni, sguardo verso bersagli reali (punti, altri attori, camera), battiti irregolari, labiale.
- Oggetti in mano: socket nella mano, posizione ricalcolata a ogni fotogramma dalla posa (nessun salto).
"""
import math
import random

from mathutils import Matrix, Vector

import cs_pose as PO
from cs_acting import EASE, Life
from cs_face import draw_face, mix
from cs_walk import ease, walk_between

# Modalità «recitazione» (audit 25/11): transizioni sfalsate per parti del corpo con anticipazione e superamento, pause vive,
# volto a parti, sguardo con gli occhi che guidano la testa. Spenta per default (gli script vecchi restano identici).
ACTING = {"on": False}


def body_matrix(pos, facing_deg):
    """Matrice del personaggio: in pos (x, y), rivolto verso facing_deg (angolo nel mondo, 0 = +x, 90 = +y)."""
    return Matrix.Translation(Vector((pos[0], pos[1], 0.0))) @ Matrix.Rotation(math.radians(facing_deg) + math.pi / 2, 4, "Z")


def lerp(a, b, k):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a + (b - a) * k
    if isinstance(a, (tuple, list)) and isinstance(b, (tuple, list)) and len(a) == len(b):
        return tuple(lerp(x, y, k) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return {key: lerp(a[key], b.get(key, a[key]), k) for key in a}
    return b if k >= 0.5 else a


def blend_pose(A, B, k, keys=None):
    out = dict(A)
    for key, vb in B.items():
        if keys and key not in keys:
            continue
        va = A.get(key)
        if va is None:
            out[key] = vb
        else:
            if isinstance(va, dict) != isinstance(vb, dict):  # dita espresse in modi diversi: si convertono
                conv = lambda v: v if isinstance(v, dict) else {f: (v[i] * 0.9, v[i] * 1.1) for i, f in enumerate(("index", "middle", "ring", "thumb"))}
                va, vb = conv(va), conv(vb)
            out[key] = lerp(va, vb, k)
    return out


UPPER = ("hand.L", "hand.R", "elbow.L", "elbow.R", "fingers.L", "fingers.R", "spread.L", "spread.R", "shrug.L", "shrug.R",
         "head_rot", "chest_rot", "spine_rot")


class Hold:
    def __init__(self, ch, t0, pos, facing):
        self.ch, self.t0, self.pos, self.facing = ch, t0, pos, facing
        self.t1 = t0

    def at(self, t):
        P = PO.idle(self.ch)
        b = math.sin(2 * math.pi * (t - self.t0) / 3.4)  # respiro
        P["chest_rot"] = (0.8 * b, 0, 0)
        P["pelvis_loc"] = (0, 0, -0.004 + 0.002 * b)
        return body_matrix(self.pos, self.facing), P


class Turn:
    """Rotazione sul posto a piedi bloccati: il piede destro si sposta nella prima metà, il sinistro nella seconda."""
    def __init__(self, ch, t0, pos, f0, f1, dur=0.55):
        self.ch, self.t0, self.t1, self.pos, self.f0, self.f1 = ch, t0, t0 + dur, pos, f0, f1
        d = (f1 - f0 + 180) % 360 - 180
        self.f1 = f0 + d

    def foot_world(self, side, facing):
        M = body_matrix(self.pos, facing)
        return M @ Vector((0.115 if side == "L" else -0.115, 0.0, 0.05))

    def at(self, t):
        u = max(0.0, min(1.0, (t - self.t0) / (self.t1 - self.t0)))
        fb = self.f0 + (self.f1 - self.f0) * ease(u)
        W = body_matrix(self.pos, fb)
        P = PO.idle(self.ch)
        Wi = W.inverted()
        for side, (a, b) in (("R", (0.0, 0.5)), ("L", (0.5, 1.0))):
            k = max(0.0, min(1.0, (u - a) / (b - a)))
            p0, p1 = self.foot_world(side, self.f0), self.foot_world(side, self.f1)
            p = p0.lerp(p1, ease(k))
            p.z += 0.05 * math.sin(math.pi * k)
            yaw_w = self.f0 + (self.f1 - self.f0) * ease(k)
            P[f"foot.{side}"] = (tuple(Wi @ p), (5 if side == "L" else -5) + (yaw_w - fb), 0)
        P["pelvis_loc"] = (0, 0, -0.012 * math.sin(math.pi * u))
        return W, P


class WalkSeg:
    def __init__(self, ch, t0, a, b, style="normale", anticip=0.3, overrides=None):
        self.w = walk_between(ch, a, b, t0, style, anticip, overrides)
        self.t0, self.t1 = t0, self.w.t_end
        self.end = b
        self.facing = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

    def at(self, t):
        return self.w.pose_at(t)


class Actor:
    def __init__(self, ch, name, seed=1):
        self.ch, self.name = ch, name
        self.loco = []
        self.upper = []          # (t, P | None)
        self.faces = []          # (t, nome, override)
        self.gazes = []          # (t, bersaglio)
        self.talks = []          # (t0, t1)
        self.props = []          # (t, oggetto, mano, socket | None)
        self.blinks = []
        rng = random.Random(seed)
        t = rng.uniform(0.4, 1.6)
        while t < 200:
            self.blinks.append(t)
            t += rng.uniform(2.2, 4.6)
        self.visible = True
        self.last = None  # ultimo stato (per i controlli)
        self.busy_until = -1.0
        self.shifts = []  # movimenti spostati perché il precedente non era finito
        self.auto_turns = []  # giri inseriti prima delle camminate
        self.turn_fixes = []  # giri il cui angolo di partenza scritto non coincideva con quello reale

    # ---------------- costruzione della linea temporale
    def hold(self, t0, pos, facing):
        """Sosta (anche un «salto» di posizione a un taglio di montaggio): interrompe ciò che è ancora in corso,
        comprese le soste automatiche di fine movimento previste dopo t0 (altrimenti il personaggio tornerebbe indietro)."""
        self.busy_until = t0
        self.loco = [s for s in self.loco if s.t0 < t0 - 1e-9]
        self.loco.append(Hold(self.ch, t0, pos, facing))
        return t0

    def facing_at(self, t):
        """Direzione del corpo (gradi) al tempo t, dalla linea temporale della locomozione."""
        seg = None
        for s in sorted(self.loco, key=lambda s: s.t0):
            if s.t0 <= t:
                seg = s
        if seg is None:
            return None
        if isinstance(seg, Hold):
            return seg.facing
        if isinstance(seg, Turn):
            u = max(0.0, min(1.0, (t - seg.t0) / (seg.t1 - seg.t0)))
            return seg.f0 + (seg.f1 - seg.f0) * ease(u)
        return seg.facing

    def _start(self, t0, what):
        if t0 < self.busy_until - 1e-6:
            self.shifts.append(dict(cosa=what, richiesto=round(t0, 2), effettivo=round(self.busy_until, 2)))
            return self.busy_until
        return t0

    def turn(self, t0, pos, f0, f1, dur=0.55):
        t0 = self._start(t0, f"giro a {f1:.0f}°")
        cur = self.facing_at(t0)   # il giro parte sempre dalla direzione reale del corpo (altrimenti i piedi «saltano»)
        if cur is not None and abs((cur - f0 + 180) % 360 - 180) > 0.5:
            self.turn_fixes.append(dict(t=round(t0, 2), scritto=round(f0, 1), reale=round(cur, 1)))
            f0 = cur
        self.busy_until = t0 + dur
        self.loco.append(Turn(self.ch, t0, pos, f0, f1, dur))
        self.loco.append(Hold(self.ch, t0 + dur, pos, f0 + ((f1 - f0 + 180) % 360 - 180)))
        return t0 + dur

    def walk(self, t0, a, b, style="normale", anticip=0.3, overrides=None):
        t0 = self._start(t0, f"camminata verso {b}")
        # prima di partire si gira verso la meta a piedi bloccati (niente piedi che «saltano» nella nuova direzione)
        cur = self.facing_at(t0)
        goal = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
        if cur is not None:
            d = (goal - cur + 180) % 360 - 180
            if abs(d) > 8.0:
                dur = 0.3 + 0.3 * abs(d) / 180.0
                self.turn(t0, a, cur, cur + d, dur)
                self.auto_turns.append(dict(t=round(t0, 2), gradi=round(d, 1), durata=round(dur, 2)))
                t0 += dur
        w = WalkSeg(self.ch, t0, a, b, style, anticip, overrides)
        self.busy_until = w.t1
        self.loco.append(w)
        self.loco.append(Hold(self.ch, w.t1, b, w.facing))
        return w.t1

    def pose(self, t, P, keys=UPPER):
        """Posa della parte alta che vale da t (transizione di 0,35 s prima). P=None: torna alla locomozione."""
        self.upper.append((t, P, keys))

    def gaze_state(self, t):
        """(bersaglio precedente, bersaglio attuale, istante del cambio)."""
        prev, cur, ts = None, None, -99.0
        for k in sorted(self.gazes, key=lambda k: k[0]):
            if k[0] <= t:
                prev, cur, ts = cur, k[1], k[0]
        return prev, cur, ts

    def finalize_blinks(self):
        """Battiti anche sui cambi di sguardo (come nelle persone), senza raddoppi ravvicinati."""
        for tg, _ in self.gazes:
            if tg > 0.2 and all(abs(tg - b) > 0.9 for b in self.blinks):
                self.blinks.append(tg + 0.02)
        self.blinks.sort()

    def alive(self, t, P):
        """Pausa viva: respiro e derive lente su bacino, torace, testa e mani (solo da fermo; in camminata muove già il passo)."""
        seg = None
        for sg in sorted(self.loco, key=lambda sg: sg.t0):
            if sg.t0 <= t:
                seg = sg
        if not isinstance(seg, Hold) or self.in_plain(t):
            return P
        if not hasattr(self, "_life"):
            self._life = Life(abs(hash(self.name)) % 1000, breath_s=3.2 + (abs(hash(self.name)) % 7) * 0.12)
        L = self._life
        k = min(1.0, max(0.0, (t - seg.t0) / 0.5))   # entra piano dopo la fine di un movimento
        b = L.breath(t)
        P = dict(P)
        pl = P.get("pelvis_loc", (0, 0, 0))
        P["pelvis_loc"] = (pl[0] + k * L.drift(t, 0, 0.004), pl[1], pl[2] + k * 0.002 * b)
        cr = P.get("chest_rot", (0, 0, 0))
        P["chest_rot"] = (cr[0] + k * 1.1 * b, cr[1] + k * L.drift(t, 1, 1.2), cr[2] + k * L.drift(t, 2, 0.8))
        hr = P.get("head_rot", (0, 0, 0))
        P["head_rot"] = (hr[0] + k * L.drift(t, 3, 1.2), hr[1] + k * L.drift(t, 4, 1.4), hr[2] + k * L.drift(t, 5, 0.8))
        cur_key = None
        for kk in sorted(self.upper, key=lambda kk: kk[0]):
            if kk[0] <= t + 0.38:
                cur_key = kk
        in_contact = cur_key is not None and callable(cur_key[1])
        for i, sd in enumerate("LR"):
            h = P.get(f"hand.{sd}")
            if h and not in_contact:
                # derive piccole e solo verso l'esterno (mai verso il busto: il controllo trovava braccia a 2 mm nel busto)
                out = 1.0 if sd == "L" else -1.0
                d = (out * k * abs(L.drift(t, 6 + i, 0.0018)), k * abs(L.drift(t, 8 + i, 0.0015)) * -1.0, k * L.drift(t, 10 - i, 0.0015))
                P[f"hand.{sd}"] = (tuple(a + b_ for a, b_ in zip(h[0], d)),) + tuple(h[1:])
        return P

    def face(self, t, name, **over):
        self.faces.append((t, name, over))

    def gaze(self, t, target):
        self.gazes.append((t, target))

    def talk(self, t0, t1):
        self.talks.append((t0, t1))

    def hold_prop(self, t, prop, side, socket):
        self.props.append((t, prop, side, socket))

    # ---------------- valutazione al tempo t
    def loco_at(self, t):
        seg = None
        for s in sorted(self.loco, key=lambda s: s.t0):
            if s.t0 <= t:
                seg = s
        seg = seg or sorted(self.loco, key=lambda s: s.t0)[0]
        return seg.at(t)

    def upper_at(self, t, P, trans=0.35):
        if ACTING["on"]:
            return self.upper_at_acting(t, P, trans)
        keys = sorted(self.upper, key=lambda k: k[0])
        cur, prev = None, None
        for k in keys:
            if k[0] <= t + trans:
                prev, cur = cur, k
        if cur is None:
            return P
        u = (t - (cur[0] - trans)) / trans if t < cur[0] else 1.0
        target = P if cur[1] is None else blend_pose(P, cur[1](t) if callable(cur[1]) else cur[1], 1.0, cur[2])
        base = P
        if prev is not None and u < 1.0:
            base = P if prev[1] is None else blend_pose(P, prev[1](t) if callable(prev[1]) else prev[1], 1.0, prev[2])
        return blend_pose(base, target, ease(max(0.0, min(1.0, u))))

    # gruppi della parte alta: il torace guida, le mani seguono (con anticipazione e superamento), la testa arriva per ultima
    GROUPS = (("torso", ("chest_rot", "spine_rot"), -0.06, "ease"),
              ("hands", ("hand.L", "hand.R", "elbow.L", "elbow.R", "fingers.L", "fingers.R", "spread.L", "spread.R", "shrug.L", "shrug.R"), 0.0, "back_small"),
              ("head", ("head_rot",), 0.07, "out"))

    def in_plain(self, t):
        """Finestre in cui si usa l'animazione semplice già verificata (es. la porta: contatti al millimetro)."""
        return any(a <= t <= b for a, b in getattr(self, "plain_windows", []))

    def upper_at_acting(self, t, P, trans=0.38):
        if self.in_plain(t):
            ACTING["on"] = False
            try:
                return self.upper_at(t, P)
            finally:
                ACTING["on"] = True
        keys = sorted(self.upper, key=lambda k: k[0])
        cur, prev = None, None
        for k in keys:
            if k[0] <= t + trans - 0.07:
                prev, cur = cur, k
        if cur is None:
            return P

        def resolve(k):
            if k is None or k[1] is None:
                return P
            return blend_pose(P, k[1](t) if callable(k[1]) else k[1], 1.0, k[2])

        target = resolve(cur)
        base = resolve(prev) if prev is not None else P
        out = dict(base)
        contact = callable(cur[1]) or (prev is not None and callable(prev[1]))     # pose di contatto (maniglia, passaggio della cartellina, telefono verso Luca): nessun superamento né anticipazione
        for gname, gkeys, off, interp in self.GROUPS:
            u = max(0.0, min(1.0, (t - (cur[0] - trans + off)) / trans))
            k = EASE["ease" if (contact and gname == "hands") else interp](u)
            for key in gkeys:
                if key not in target and key not in base:
                    continue
                va, vb = base.get(key, target.get(key)), target.get(key, base.get(key))
                if key.startswith("hand.") and va is not None and vb is not None:
                    pa, pb = Vector(va[0]), Vector(vb[0])
                    d = pb - pa
                    # superamento solo se la mano si allontana dal corpo; verso il corpo si posa senza superare (niente mani nel busto)
                    kh = k if pb.xy.length >= pa.xy.length else EASE["ease"](u)
                    pos = pa.lerp(pb, kh)
                    if d.length > 0.12 and u < 0.3 and not contact:   # anticipazione: 2,5 cm all'indietro prima del gesto grande
                        pos -= d.normalized() * 0.025 * math.sin(math.pi * u / 0.3)
                    out[key] = (tuple(pos),) + tuple(lerp(a, b, min(1.0, k)) for a, b in zip(va[1:], vb[1:]))
                elif va is not None and vb is not None:
                    if isinstance(va, dict) != isinstance(vb, dict):
                        conv = lambda v: v if isinstance(v, dict) else {f: (v[i] * 0.9, v[i] * 1.1) for i, f in enumerate(("index", "middle", "ring", "thumb"))}
                        va, vb = conv(va), conv(vb)
                    out[key] = lerp(va, vb, k)
        return out

    def face_at(self, t):
        if ACTING["on"]:
            return self.face_at_acting(t)
        keys = sorted(self.faces, key=lambda k: k[0])
        cur, prev = keys[0], None
        for k in keys:
            if k[0] <= t:
                prev, cur = cur, k
        a = self.ch.face_expr(cur[1], **cur[2])
        if prev is not None and t - cur[0] < 0.15:
            b = self.ch.face_expr(prev[1], **prev[2])
            return mix(b, a, (t - cur[0]) / 0.15)
        return a

    def face_at_acting(self, t, dur=0.28):
        """Volto a parti: sopracciglia 0,08 s prima, occhi e guance al tempo, bocca 0,06 s dopo; forme (occhi, bocca) a metà."""
        keys = sorted(self.faces, key=lambda k: k[0])
        cur, prev = keys[0], None
        for k in keys:
            if k[0] <= t + 0.08:
                prev, cur = cur, k
        a = self.ch.face_expr(cur[1], **cur[2])
        if prev is None or t - cur[0] > dur + 0.1:
            return a
        b = self.ch.face_expr(prev[1], **prev[2])
        out = {}
        for key in a:
            off = -0.08 if key.startswith("brow") else (0.06 if key.startswith("mouth") else 0.0)
            u = max(0.0, min(1.0, (t - (cur[0] + off)) / dur))
            va, vb = b.get(key, a[key]), a[key]
            if isinstance(vb, (int, float)) and not isinstance(vb, bool):
                out[key] = va + (vb - va) * EASE["out"](u)
            else:
                out[key] = vb if u >= (0.35 if key == "mouth" else 0.4) else va
        return out

    def blink_at(self, t):
        b = 0.0
        for tb in self.blinks:
            u = (t - tb) / 0.16
            if 0 <= u <= 1:
                b = max(b, math.sin(math.pi * u))
        return b

    def talk_at(self, t):
        for t0, t1 in self.talks:
            if t0 <= t <= t1:
                ph = (t - t0) * 9.0
                return "AEOAIUEO"[int(ph) % 8] if math.sin(ph * math.pi) > -0.3 else "M"
        return None

    def gaze_target(self, t):
        cur = None
        for k in sorted(self.gazes, key=lambda k: k[0]):
            if k[0] <= t:
                cur = k
        return cur[1] if cur else None


def head_world(actor):
    ch = actor.ch
    return ch.rig.matrix_world @ ch.rig.pose.bones["head"].head + ch.rig.matrix_world.to_3x3() @ Vector((0, 0, ch.spec["head_r"] * 0.8))


def resolve_target(tgt, actors, cam):
    if tgt is None:
        return None
    if isinstance(tgt, str):
        if tgt == "camera":
            return cam.matrix_world.translation.copy()
        if tgt in actors:
            return head_world(actors[tgt])
    if isinstance(tgt, (tuple, list)) and len(tgt) == 3:
        return Vector(tgt)
    if hasattr(tgt, "matrix_world"):
        return tgt.matrix_world.translation.copy()
    return None


def look_acting(actor, P, prev_w, cur_w, t_switch, t, amount=0.55):
    """Sguardo: gli occhi arrivano al nuovo bersaglio in 2 fotogrammi, la testa parte dopo 0,07 s e ci arriva in 0,32 s
    con un piccolo superamento; nel frattempo gli occhi compensano. Calcolato dal tempo (niente stato tra fotogrammi)."""
    ch = actor.ch
    hw = ch.rig.matrix_world @ Vector((0, 0, ch.head_c.z))
    Ri = ch.rig.matrix_world.inverted().to_3x3()

    def ang(w):
        d = Ri @ (w - hw)
        if d.length < 1e-4:
            return 0.0, 0.0
        return math.degrees(math.atan2(d.x, -d.y)), math.degrees(math.atan2(-d.z, math.hypot(d.x, d.y)))
    y1, p1 = ang(cur_w)
    y0, p0 = ang(prev_w) if prev_w is not None else (y1, p1)
    ue = max(0.0, min(1.0, (t - t_switch) / 0.07))
    ue = 1 - (1 - ue) ** 2
    uh = EASE["back_small"](max(0.0, min(1.0, (t - t_switch - 0.07) / 0.32)))
    ey, ep = y0 + (y1 - y0) * ue, p0 + (p1 - p0) * ue
    hy = max(-40, min(40, (y0 + (y1 - y0) * uh) * amount))
    hp = max(-25, min(30, (p0 + (p1 - p0) * uh) * amount))
    hr = P.get("head_rot", (0, 0, 0))
    P = dict(P)
    P["head_rot"] = (hr[0] + hp, hr[1] + hy, hr[2])
    gx = max(-1.0, min(1.0, (ey - hy) / 30.0))
    gy = max(-1.0, min(1.0, -(ep - hp) / 25.0))
    return P, (gx, gy)


def look(actor, P, target_w, amount=0.55):
    """Testa verso il bersaglio (in parte) e valori di sguardo per gli occhi 2D."""
    ch = actor.ch
    hw = ch.rig.matrix_world @ Vector((0, 0, ch.head_c.z))
    d = ch.rig.matrix_world.inverted().to_3x3() @ (target_w - hw)
    if d.length < 1e-4:
        return P, (0.0, 0.0)
    yaw = math.degrees(math.atan2(d.x, -d.y))
    pitch = math.degrees(math.atan2(-d.z, math.hypot(d.x, d.y)))
    hr = P.get("head_rot", (0, 0, 0))
    hy = max(-40, min(40, yaw * amount))
    hp = max(-25, min(30, pitch * amount))
    P = dict(P)
    P["head_rot"] = (hr[0] + hp, hr[1] + hy, hr[2])
    gx = max(-1.0, min(1.0, (yaw - hy) / 30.0))
    gy = max(-1.0, min(1.0, -(pitch - hp) / 25.0))
    return P, (gx, gy)
