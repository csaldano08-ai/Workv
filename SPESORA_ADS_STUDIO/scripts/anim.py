"""
Motore di animazione: curve morbide (PCHIP, nessun overshoot indesiderato), inerzia con rimbalzo (molla), respiro, ammiccamenti,
parlato provvisorio e ciclo di camminata automatico ricavato dallo spostamento.

Tutto è funzione del tempo: i controlli dei rig vengono campionati a 30 fps e poi "cotti" in keyframe su ogni fotogramma.
"""
import bisect
import math
import random

FPS = 30


class Track:
    """Curva morbida attraverso le chiavi (t, v). Velocità zero agli estremi; PCHIP tra le chiavi (monotona, senza sovraelongazioni)."""

    def __init__(self, keys, kind="smooth"):
        ks = sorted(keys, key=lambda k: k[0])
        fixed = []
        for t, v in ks:
            if fixed and t <= fixed[-1][0]:
                t = fixed[-1][0] + 1e-4
            fixed.append((t, v))
        self.t = [k[0] for k in fixed]
        self.v = [float(k[1]) for k in fixed]
        self.kind = kind
        n = len(self.t)
        self.m = [0.0] * n
        if kind == "smooth" and n > 1:
            d = [(self.v[i + 1] - self.v[i]) / (self.t[i + 1] - self.t[i]) for i in range(n - 1)]
            for i in range(1, n - 1):
                if d[i - 1] * d[i] <= 0:
                    self.m[i] = 0.0
                else:
                    h0, h1 = self.t[i] - self.t[i - 1], self.t[i + 1] - self.t[i]
                    w1, w2 = 2 * h1 + h0, h1 + 2 * h0
                    self.m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
            self.m[0] = 0.0
            self.m[-1] = 0.0

    def __call__(self, t):
        T, V = self.t, self.v
        if t <= T[0]:
            return V[0]
        if t >= T[-1]:
            return V[-1]
        i = bisect.bisect_right(T, t) - 1
        if self.kind == "step":
            return V[i]
        h = T[i + 1] - T[i]
        s = (t - T[i]) / h
        if self.kind == "linear":
            return V[i] + (V[i + 1] - V[i]) * s
        h00 = 2 * s ** 3 - 3 * s ** 2 + 1
        h10 = s ** 3 - 2 * s ** 2 + s
        h01 = -2 * s ** 3 + 3 * s ** 2
        h11 = s ** 3 - s ** 2
        return h00 * V[i] + h10 * h * self.m[i] + h01 * V[i + 1] + h11 * h * self.m[i + 1]


def K(*tv, kind="smooth"):
    """K(0,0, 1,5, 2,5) -> Track con chiavi (0,0),(1,5),(2,5)."""
    return Track(list(zip(tv[0::2], tv[1::2])), kind)


def Step(events, default=None):
    """Valore discreto che cambia ai tempi indicati: Step([(0,'a'),(2.0,'b')])."""
    ev = sorted(events, key=lambda e: e[0])
    ts = [e[0] for e in ev]

    def f(t):
        i = bisect.bisect_right(ts, t) - 1
        return ev[i][1] if i >= 0 else default

    return f


def smoothstep(a, b, x):
    if b == a:
        return 1.0 if x >= b else 0.0
    s = max(0.0, min(1.0, (x - a) / (b - a)))
    return s * s * (3 - 2 * s)


def lerp(a, b, s):
    return a + (b - a) * s


def spring_series(values, fps=FPS, freq=2.2, zeta=0.45, sub=6):
    """Fa seguire a un bersaglio (serie per fotogramma) una molla smorzata: inerzia, rimbalzo e assestamento."""
    w = 2 * math.pi * freq
    x, v = values[0], 0.0
    out = []
    dt = 1.0 / (fps * sub)
    for tgt in values:
        for _ in range(sub):
            a = w * w * (tgt - x) - 2 * zeta * w * v
            v += a * dt
            x += v * dt
        out.append(x)
    return out


# ------------------------------------------------------------------ strati procedurali
def blink_curve(t, times, close=0.06, hold=0.03, open_=0.11):
    """0..1 (chiusura della palpebra) per una lista di istanti di ammiccamento."""
    best = 0.0
    for b in times:
        dt = t - b
        if -close <= dt < 0:
            best = max(best, 1 - (-dt) / close)
        elif 0 <= dt < hold:
            best = max(best, 1.0)
        elif hold <= dt < hold + open_:
            best = max(best, 1 - (dt - hold) / open_)
    return best


def auto_blinks(t0, t1, seed=3, every=(2.4, 4.2), avoid=()):
    rnd = random.Random(seed)
    out, t = [], t0 + rnd.uniform(*every) * 0.5
    while t < t1:
        if not any(a <= t <= b for a, b in avoid):
            out.append(t)
        t += rnd.uniform(*every)
    return out


def talk_events(segments, rest="m_smile", seed=5, shapes=("m_t2", "m_t1", "m_t3", "m_t2", "m_t1", "m_line", "m_t3"), rate=8.0):
    """Eventi (t, forma_bocca) per i tratti parlati: ~rate cambi al secondo, a ritmo irregolare. Fuori dal parlato: forma a riposo."""
    rnd = random.Random(seed)
    ev = [(-1.0, rest)]
    for a, b, *opt in segments:
        r = opt[0] if opt else rest
        t, last = a, None
        while t < b - 0.12:
            s = rnd.choice([x for x in shapes if x != last])
            ev.append((t, s))
            last = s
            t += rnd.uniform(0.8, 1.5) / rate
        ev.append((b - 0.1, "m_line" if "m_line" in shapes else rest))
        ev.append((b, r))
    return sorted(ev, key=lambda e: e[0])


def talk_energy(t, segments, ramp=0.15):
    e = 0.0
    for a, b, *_ in segments:
        e = max(e, smoothstep(a, a + ramp, t) * (1 - smoothstep(b - ramp, b, t)))
    return e


class Walk:
    """Ricava il ciclo di passi dallo spostamento della radice (x,y) e dalla rotazione (yaw)."""

    def __init__(self, tx, ty, tyaw, t_end, fps=FPS, stride=0.95, amp=26.0):
        n = int(t_end * fps) + 2
        self.fps = fps
        self.legL, self.legR, self.bob, self.twist, self.roll, self.lean = [], [], [], [], [], []
        phase = 0.0
        px, py, pyaw = tx(0), ty(0), tyaw(0)
        sp_s, yw_s = 0.0, 0.0
        for i in range(n):
            t = i / fps
            x, y, yaw = tx(t), ty(t), tyaw(t)
            speed = math.hypot(x - px, y - py) * fps
            yawv = abs(yaw - pyaw) * fps
            px, py, pyaw = x, y, yaw
            sp_s += (speed - sp_s) * 0.35
            yw_s += (yawv - yw_s) * 0.35
            phase += sp_s / fps * (math.pi / stride) + yw_s / fps * 0.012
            k = min(1.0, sp_s / 0.9)
            ky = min(1.0, yw_s / 160.0) * (1 - k)
            a = amp * k + 9.0 * ky
            self.legL.append(a * math.sin(phase))
            self.legR.append(-a * math.sin(phase))
            self.bob.append(0.07 * k * abs(math.sin(phase)) + 0.012 * ky)
            self.twist.append(5.0 * k * math.sin(phase))
            self.roll.append(3.0 * k * math.cos(phase))
            self.lean.append(7.0 * k)

    def at(self, t):
        i = max(0, min(len(self.legL) - 1, int(round(t * self.fps))))
        return dict(legL=self.legL[i], legR=self.legR[i], bob=self.bob[i], twist=self.twist[i], roll=self.roll[i], lean=self.lean[i])


def breathe(t, rate=0.32, amp=0.012, phase=0.0):
    return amp * math.sin(2 * math.pi * rate * t + phase)
