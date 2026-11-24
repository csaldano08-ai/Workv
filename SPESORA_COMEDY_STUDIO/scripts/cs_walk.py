"""
Camminata procedurale con foot locking.

Si pianificano prima le IMPRONTE (posizioni fisse nel mondo). Durante l'appoggio la caviglia resta esattamente ferma
(lo scivolamento è zero per costruzione e viene comunque misurato). Il corpo passa sopra il piede d'appoggio:
- molleggio del bacino (basso al contatto, alto al passaggio), spostamento laterale verso il piede d'appoggio,
- rotazione del bacino verso la gamba avanzata e contro-rotazione del torace,
- braccia che oscillano in opposizione alle gambe, testa che compensa,
- anticipazione prima del primo passo, ultimo passo corto e assestamento finale.
Varianti di carattere: "normale", "imbarazzato" (passi corti, spalle basse, sguardi intorno), "sicuro" (passi lunghi, petto in fuori,
braccia esagerate).
"""
import math

from mathutils import Matrix, Vector

STYLES = {
    "normale": dict(step=0.28, t_step=0.44, swing=0.32, lift=0.065, bob=0.022, sway=0.022, pel_yaw=6, chest_yaw=8, lean=4,
                    arm_sw=0.13, arm_out=0.45, shrug=0, head_nod=2, crouch=0.05),
    "imbarazzato": dict(step=0.19, t_step=0.36, swing=0.26, lift=0.04, bob=0.012, sway=0.015, pel_yaw=4, chest_yaw=4, lean=9,
                        arm_sw=0.05, arm_out=0.43, shrug=10, head_nod=6, crouch=0.06),
    "sicuro": dict(step=0.34, t_step=0.5, swing=0.36, lift=0.08, bob=0.03, sway=0.03, pel_yaw=9, chest_yaw=12, lean=-5,
                   arm_sw=0.2, arm_out=0.47, shrug=-4, head_nod=1, crouch=0.07),
}


def ease(u):
    u = max(0.0, min(1.0, u))
    return 0.5 - 0.5 * math.cos(math.pi * u)


def pchip(xs, ys):
    """Interpolazione monotona a tratti (nessun rimbalzo oltre i valori chiave)."""
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x)
        t = (x - xs[i]) / h[i]
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    return f


class Walk:
    def __init__(self, ch, start, direction_deg, n_steps, t0=0.0, style="normale", anticip=0.35, first="R", step=None, overrides=None):
        self.ch = ch
        self.st = dict(STYLES[style])
        if step:
            self.st["step"] = step
        if overrides:
            self.st.update(overrides)
        self.start = Vector((start[0], start[1], 0.0))
        self.yaw = math.radians(direction_deg)
        self.d = Vector((math.cos(self.yaw), math.sin(self.yaw), 0.0))
        self.side = Vector((self.d.y, -self.d.x, 0.0))  # destra del personaggio rispetto alla direzione di marcia
        hx = ch.hip_x
        L = self.st["step"]
        T = self.st["t_step"]
        sw = self.st["swing"]
        # piede destro = -X del corpo = lato "side" positivo
        self.lat = {"R": hx, "L": -hx}
        self.plants = {"R": [(t0 - 99, 0.0)], "L": [(t0 - 99, 0.0)]}  # (tempo di appoggio, s lungo la direzione)
        self.swings = []  # (piede, t_stacco, t_appoggio, s_da, s_a)
        t = t0 + anticip
        foot = first
        s_pos = {"R": 0.0, "L": 0.0}
        for k in range(1, n_steps + 2):
            last = k == n_steps + 1
            target = (n_steps * L) if last else k * L
            if k == 1:
                target = L * 0.6  # primo passo un po' più corto (partenza)
            elif not last and k == 2:
                target = L * 1.6
            elif not last:
                target = L * 0.6 + (k - 1) * L
            if last:
                target = s_pos["R" if foot == "L" else "L"]  # piedi uniti alla fine
            self.swings.append((foot, t, t + sw, s_pos[foot], target))
            s_pos[foot] = target
            self.plants[foot].append((t + sw, target))
            t += T if not last else T * 0.9
            foot = "L" if foot == "R" else "R"
        self.t_end = self.swings[-1][2] + 0.35
        self.distance = max(s_pos.values())
        # traiettoria del corpo lungo la direzione: chiavi al contatto (a metà tra i piedi) e al passaggio (sopra il piede d'appoggio)
        keys_t, keys_s = [t0, t0 + anticip * 0.6], [0.0, -0.025]
        cur = {"R": 0.0, "L": 0.0}
        for foot, ta, tb, sa, sb in self.swings:
            stance = "L" if foot == "R" else "R"
            keys_t.append((ta + tb) / 2)
            keys_s.append(cur[stance] + 0.03)
            cur[foot] = sb
            keys_t.append(tb + 0.02)
            keys_s.append((cur["R"] + cur["L"]) / 2 + 0.02)
        keys_t.append(self.t_end)
        keys_s.append((cur["R"] + cur["L"]) / 2)
        # monotona: il corpo non torna mai indietro
        for i in range(1, len(keys_s)):
            if i > 2:
                keys_s[i] = max(keys_s[i], keys_s[i - 1] + 1e-4)
        self.body_s = pchip(keys_t, keys_s)
        self.t0 = t0
        self.anticip = anticip

    # -------------------------------------------------- stato al tempo t
    def foot_state(self, foot, t):
        """Posizione (s, quota, beccheggio) del piede al tempo t."""
        for f, ta, tb, sa, sb in self.swings:
            if f == foot and ta <= t <= tb:
                u = (t - ta) / (tb - ta)
                s = sa + (sb - sa) * ease(u)
                z = self.st["lift"] * math.sin(math.pi * u) ** 1.2
                pitch = 18 * math.sin(math.pi * min(1.0, u * 1.6)) * (1 - u) - 12 * max(0.0, (u - 0.65) / 0.35) * (1 - max(0.0, (u - 0.92) / 0.08))
                return s, z, pitch, True
        s = 0.0
        for tp, sp in self.plants[foot]:
            if tp <= t:
                s = sp
        return s, 0.0, 0.0, False

    def phase_amount(self, t):
        """Quanto il passo in corso spinge: >0 piede destro in volo, <0 sinistro (per braccia e rotazioni)."""
        for f, ta, tb, sa, sb in self.swings:
            if ta - 0.08 <= t <= tb + 0.08:
                u = (t - ta) / (tb - ta)
                k = math.sin(math.pi * max(0.0, min(1.0, u)))
                step = (sb - sa) / max(1e-6, self.st["step"])
                return (k if f == "R" else -k) * min(1.0, abs(step) / 1.0)
        return 0.0

    def pose_at(self, t, extra=None):
        """Ritorna (matrice mondo del personaggio, dizionario di posa nello spazio del corpo)."""
        st = self.st
        ch = self.ch
        s = self.body_s(t)
        moving = self.swings[0][1] - 0.1 <= t <= self.swings[-1][2] + 0.1
        # molleggio: basso subito dopo ogni contatto, alto a metà del volo
        bob = 0.0
        for f, ta, tb, sa, sb in self.swings:
            if ta <= t <= tb + 0.12:
                u = (t - ta) / (tb - ta)
                bob = st["bob"] * (math.sin(math.pi * min(1.0, u)) * 0.8 - 1.0 * math.exp(-((t - tb) / 0.07) ** 2))
        if t < self.t0 + self.anticip:  # anticipazione: si abbassa un poco e si carica all'indietro
            a = math.sin(math.pi * (t - self.t0) / self.anticip)
            bob -= 0.02 * a
        # ginocchia piegate durante la marcia (camminata da cartone, dà portata alle gambe)
        k_move = min(1.0, max(0.0, (t - (self.swings[0][1] - 0.2)) / 0.25)) * min(1.0, max(0.0, (self.swings[-1][2] + 0.25 - t) / 0.3))
        bob -= st["crouch"] * k_move
        ph = self.phase_amount(t)
        # spostamento laterale verso il piede d'appoggio
        sway = -st["sway"] * ph  # ph>0: destro in volo → appoggio sinistro
        root = self.start + self.d * s
        W = Matrix.Translation(root) @ Matrix.Rotation(self.yaw + math.pi / 2, 4, "Z")
        Winv = W.inverted()
        P = {}
        P["pelvis_loc"] = (sway, 0.0, bob)
        lean = st["lean"] * (1.0 if moving else 0.4) + (-4 * math.sin(math.pi * min(1.0, max(0.0, (t - self.t0) / self.anticip))) if t < self.t0 + self.anticip else 0)
        P["pelvis_rot"] = (0, -st["pel_yaw"] * ph, sway * 60)
        P["spine_rot"] = (lean * 0.5, st["chest_yaw"] * ph * 0.5, -sway * 40)
        P["chest_rot"] = (lean * 0.5, st["chest_yaw"] * ph * 0.5, -sway * 30)
        P["head_rot"] = (-lean * 0.6 + st["head_nod"] * abs(ph) * 0.5, -st["chest_yaw"] * ph * 0.6, sway * 20)
        for side in ("L", "R"):
            P[f"shrug.{side}"] = st["shrug"]
        # risolutore di portata: se una gamba non arriva al suo piede, il bacino scende quanto basta (mai piedi trascinati)
        leg = (ch.z_hip - ch.z_ankle) * 0.985
        for foot in ("L", "R"):
            fs, fz, pitch, air = self.foot_state(foot, t)
            pr = math.radians(pitch)
            fz += 0.105 * math.sin(max(0.0, pr)) + 0.04 * math.sin(max(0.0, -pr))
            ankle = self.start + self.d * fs + self.side * self.lat[foot] + Vector((0, 0, ch.z_ankle + fz))
            hip = root + self.side * (self.lat[foot] + sway * (1 if foot == "R" else 1)) + Vector((0, 0, ch.z_hip + bob))
            dh = (ankle - hip).xy.length
            if dh < leg:
                need = math.sqrt(leg * leg - dh * dh)
                dz = hip.z - ankle.z
                if dz > need:
                    bob -= dz - need
        P["pelvis_loc"] = (sway, 0.0, bob)
        # piedi (mondo → corpo)
        for foot in ("L", "R"):
            fs, fz, pitch, air = self.foot_state(foot, t)
            pr = math.radians(pitch)
            # punta giù: si ruota sulla punta (la caviglia sale); punta su: si ruota sul tallone
            fz += 0.105 * math.sin(max(0.0, pr)) + 0.04 * math.sin(max(0.0, -pr))
            p = self.start + self.d * fs + self.side * self.lat[foot] + Vector((0, 0, ch.z_ankle + fz))
            pb = Winv @ p
            toe_out = 5 if foot == "L" else -5
            P[f"foot.{foot}"] = (tuple(pb), toe_out, pitch)
        # braccia: in opposizione alle gambe (destro in volo → braccio sinistro avanti); seguono la rotazione del torace
        chest_yaw = math.radians((-st["pel_yaw"] + st["chest_yaw"]) * ph)
        Rc = Matrix.Rotation(chest_yaw, 3, "Z")
        for side, sg in (("L", 1), ("R", -1)):
            swing = st["arm_sw"] * ph * (1 if side == "L" else -1)
            hx = sg * st["arm_out"]
            hy = -0.02 - swing
            hz = 0.6 + 0.08 * max(0.0, swing / max(1e-6, st["arm_sw"])) * st["arm_sw"] / 0.13 + (st["shrug"] * 0.002)
            P[f"hand.{side}"] = (tuple(Rc @ Vector((hx + sg * 0.03 * abs(swing), hy, hz))), tuple(Rc @ Vector((sg * 0.15, -0.25, -1.0))), tuple(Rc @ Vector((-sg * 1.0, 0.0, 0.0))))
            P[f"elbow.{side}"] = tuple(Rc @ Vector((sg * 0.5, 0.35, 0.85)))
            P[f"fingers.{side}"] = (28, 32, 36, 12)
        if extra:
            P.update(extra(t, P) or {})
        return W, P


def walk_between(ch, a, b, t0, style="normale", anticip=0.3, overrides=None):
    """Camminata da a a b (x, y): numero di passi e lunghezza scelti per arrivare esattamente in b."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    dist = math.hypot(dx, dy)
    L0 = STYLES[style]["step"]
    n = max(2, int(round(dist / L0 + 0.4)))
    L = dist / (n - 0.4)
    return Walk(ch, start=a, direction_deg=math.degrees(math.atan2(dy, dx)), n_steps=n, t0=t0, style=style, anticip=anticip, step=L, overrides=overrides)
