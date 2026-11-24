"""
Recitazione cartoon: curve d'animazione con interpolazione scelta chiave per chiave, sovrapposizione delle azioni,
movimento secondario a molla, sguardo che anticipa la testa, volto con parti che cambiano in tempi diversi.

Perché esiste (audit del supermercato, docs/08): nell'episodio ogni posa era un blocco fermo raggiunto con la stessa
transizione di 0,35 s per tutto il corpo (mani, gomiti, testa e busto insieme), la testa scattava sul nuovo bersaglio
in un fotogramma, il volto cambiava tutto insieme in 0,15 s. Qui ogni canale ha le sue chiavi e il suo tipo di curva,
come nel Graph Editor:
- "ease": lenta-veloce-lenta (cubica), per i movimenti normali;
- "out": parte veloce e frena (il gesto «scatta» e si posa), per reazioni e prese di posizione;
- "in": parte lenta e accelera (cadute, appoggi);
- "back": supera di poco la posa e ci torna (overshoot), per gli accenti comici;
- "linear": solo dove serve velocità costante;
- "hold": costante, SOLO dove la pausa è voluta (mai come effetto di chiavi mancanti).
Le pose tenute non sono ferme: «moving hold» (respiro e piccole derive lente), così una pausa resta viva.
"""
import math

import numpy as np


def _ease(u):
    return u * u * (3 - 2 * u) if u < 1 else 1.0


def _cubic_io(u):
    return 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2


EASE = {
    "linear": lambda u: u,
    "ease": _cubic_io,
    "soft": _ease,
    "out": lambda u: 1 - (1 - u) ** 3,
    "out2": lambda u: 1 - (1 - u) ** 2,
    "in": lambda u: u ** 3,
    "in2": lambda u: u ** 2,
    "back": lambda u: 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2,          # supera di ~7% e torna
    "back_small": lambda u: 1 + 1.8 * (u - 1) ** 3 + 0.8 * (u - 1) ** 2,    # supera di ~2%
    "hold": lambda u: 0.0 if u < 1 else 1.0,
}


def lerp(a, b, k):
    if isinstance(a, (int, float)):
        return a + (b - a) * k
    return tuple(x + (y - x) * k for x, y in zip(a, b))


class Curve:
    """Canale animato: chiavi (t, valore, curva d'arrivo). Valori scalari o tuple della stessa lunghezza."""

    def __init__(self, v0, t0=0.0):
        self.keys = [(t0, v0, "hold")]

    def key(self, t, v, interp="ease"):
        assert interp in EASE, interp
        self.keys.append((t, v, interp))
        self.keys.sort(key=lambda k: k[0])
        return self

    def cut(self, t):
        """Interrompe la curva in t (una nuova azione parte prima che la precedente sia finita): chiave sul valore attuale,
        con la stessa curva del tratto in corso; le chiavi successive vengono tolte. Nessun salto di valore."""
        v = self.at(t)
        interp = "ease"
        for (ta, _, _), (tb, _, ib) in zip(self.keys, self.keys[1:]):
            if ta <= t < tb:
                interp = ib
        self.keys = [k for k in self.keys if k[0] < t - 1e-9] + [(t, v, interp)]
        return self

    def hold_until(self, t):
        """Pausa voluta: mantiene il valore attuale fino a t (chiave esplicita, visibile nell'audit)."""
        self.keys.append((t, self.at(t), "hold"))
        self.keys.sort(key=lambda k: k[0])
        return self

    def at(self, t):
        ks = self.keys
        if t <= ks[0][0]:
            return ks[0][1]
        for (ta, va, _), (tb, vb, ib) in zip(ks, ks[1:]):
            if ta <= t < tb:
                u = (t - ta) / (tb - ta)
                return lerp(va, vb, EASE[ib](u))
        return ks[-1][1]

    def last_time(self):
        return self.keys[-1][0]


def spring(xs, dt, f=2.0, z=0.6, r=0.0):
    """Dinamica del secondo ordine su una sequenza (n, d): segue il bersaglio con ritardo, supera e si assesta.
    f: frequenza (Hz, più alta = più rigida), z: smorzamento (<1 rimbalza), r: risposta iniziale (<0 anticipa all'indietro)."""
    xs = np.asarray(xs, dtype=float)
    one = xs.ndim == 1
    if one:
        xs = xs[:, None]
    k1 = z / (math.pi * f)
    k2 = 1 / ((2 * math.pi * f) ** 2)
    k3 = r * z / (2 * math.pi * f)
    y = xs[0].copy()
    yd = np.zeros_like(y)
    xp = xs[0].copy()
    out = np.zeros_like(xs)
    sub = 4
    h = dt / sub
    for i, x in enumerate(xs):
        xd = (x - xp) / dt
        xp = x
        for _ in range(sub):
            k2s = max(k2, h * h / 2 + h * k1 / 2, h * k1)
            y = y + h * yd
            yd = yd + h * (x + k3 * xd - y - k1 * yd) / k2s
        out[i] = y
    return out[:, 0] if one else out


def delay(xs, frames):
    """Ritardo di n fotogrammi (sovrapposizione: la parte che segue arriva dopo quella che guida)."""
    xs = np.asarray(xs, dtype=float)
    if frames <= 0:
        return xs
    return np.concatenate([np.repeat(xs[:1], frames, axis=0), xs[:-frames]], axis=0)


class Life:
    """Moving hold: respiro + derive lente e piccole (somma di sinusoidi lente con fasi casuali, nessun rumore a scatti)."""

    def __init__(self, seed, breath_s=3.6):
        self.seed = seed
        rng = np.random.default_rng(seed)
        self.ph = rng.uniform(0, 2 * math.pi, 12)
        self.fr = rng.uniform(0.11, 0.33, 12)
        self.breath_s = breath_s

    def breath(self, t):
        return math.sin(2 * math.pi * t / self.breath_s)

    def drift(self, t, i, amp):
        if i < 6:   # canali 0-5: identici a prima (il test di recitazione già renderizzato non cambia)
            return amp * (0.6 * math.sin(2 * math.pi * self.fr[i] * t + self.ph[i]) + 0.4 * math.sin(2 * math.pi * self.fr[i + 6] * t * 1.7 + self.ph[i + 6]))
        if not hasattr(self, "ph2"):
            rng = np.random.default_rng(self.seed + 7919)
            self.ph2 = rng.uniform(0, 2 * math.pi, 32)
            self.fr2 = rng.uniform(0.11, 0.33, 32)
        j = (i - 6) % 16
        return amp * (0.6 * math.sin(2 * math.pi * self.fr2[j] * t + self.ph2[j]) + 0.4 * math.sin(2 * math.pi * self.fr2[j + 16] * t * 1.7 + self.ph2[j + 16]))


class Face:
    """Volto: ogni parametro numerico (sopracciglia, occhi, bocca, rossore, sudore) ha la sua curva; i tipi di occhi e
    bocca cambiano in istanti scelti (dentro un battito o quando la bocca è quasi chiusa, così il cambio non si vede).
    Le sopracciglia guidano: si muovono qualche fotogramma prima di occhi e bocca."""

    NUM = ("eye_scale", "pupil", "eye_asym", "brow_lift", "brow_tilt", "brow_curve", "brow_asym", "mouth_w", "mouth_open", "mouth_dx",
           "blush", "tears", "sweat")

    def __init__(self, base):
        self.base = dict(base)
        self.ch = {k: Curve(base[k]) for k in self.NUM}
        self.eyes = [(0.0, base["eyes"])]
        self.mouth = [(0.0, base["mouth"])]

    def to(self, t, params, dur=0.3, interp="out", brow_lead=0.08, mouth_lag=0.06):
        """Porta il volto verso `params` partendo da t: sopracciglia in anticipo, bocca in ritardo."""
        for k, v in params.items():
            if k in self.NUM:
                st = t - (brow_lead if k.startswith("brow") else 0.0) + (mouth_lag if k.startswith("mouth") else 0.0)
                self.ch[k].cut(st).key(st + dur, v, interp)
            elif k == "eyes":
                self.eyes.append((t + dur * 0.3, v))
            elif k == "mouth":
                self.mouth.append((t + mouth_lag + dur * 0.35, v))
        return self

    def at(self, t):
        p = dict(self.base)
        for k in self.NUM:
            p[k] = self.ch[k].at(t)
        p["eyes"] = [v for (tt, v) in self.eyes if tt <= t][-1]
        p["mouth"] = [v for (tt, v) in self.mouth if tt <= t][-1]
        return p


def blink_curve(times, t, dur=0.14):
    """Battito: chiusura veloce, riapertura un po' più lenta."""
    b = 0.0
    for tb in times:
        u = (t - tb) / dur
        if 0 <= u <= 1:
            b = max(b, (u / 0.4) if u < 0.4 else 1 - ((u - 0.4) / 0.6) ** 1.5)
    return min(1.0, b)
