"""
Volto 2D a inchiostro per i personaggi a testa bianca (linguaggio del video di riferimento: tratti neri sottili,
occhi a punto o a cerchio con pupilla, sopracciglia ad arco, bocca a "D" con lingua, denti a griglia, lacrime, rossore).

La texture rappresenta la proiezione ortografica frontale della testa: x, y in [-1, 1] (unità = raggio della testa).
Ogni fotogramma si disegna da parametri (espressione + sguardo + battito), così occhi, pupille e bocca sono sempre coerenti.

    from cs_face import draw_face, EXPRESSIONS
    img = draw_face(EXPRESSIONS["sorpreso"], gaze=(0.3, 0.0), blink=0.0, size=1024)
"""
import math

from PIL import Image, ImageDraw

INK = (22, 18, 18, 255)
MOUTH_IN = (70, 22, 26, 255)
TONGUE = (236, 120, 120, 255)
TEETH = (250, 250, 246, 255)
TEAR = (120, 185, 235, 235)
BLUSH = (240, 140, 140, 110)
SWEAT = (150, 205, 240, 240)

# parametri di base delle espressioni (tutte originali, nello stesso linguaggio grafico del riferimento)
# eyes: dot | round | closed | happy | squint | half
# mouth: line | smile | smirk | grin | open | o | frown | wobble | teeth | teeth_smile | scream
BASE = dict(eyes="dot", eye_scale=1.0, pupil=1.0, eye_asym=0.0,
            brow_lift=0.0, brow_tilt=0.0, brow_curve=0.25, brow_asym=0.0,
            mouth="line", mouth_w=1.0, mouth_open=0.5, mouth_dx=0.0,
            blush=0.0, tears=0.0, sweat=0.0, lashes=False, glasses=False, mustache=False)

EXPRESSIONS = {
    "neutro": dict(),
    "felice": dict(mouth="grin", mouth_w=1.05, mouth_open=0.55, brow_lift=0.05),
    "confuso": dict(eye_asym=0.25, brow_asym=0.6, brow_tilt=0.0, mouth="wobble", mouth_w=0.6, mouth_dx=0.08),
    "sorpreso": dict(eyes="round", eye_scale=1.0, pupil=0.9, brow_lift=0.28, brow_curve=0.5, mouth="o", mouth_open=0.7),
    "preoccupato": dict(brow_tilt=0.55, brow_lift=0.06, mouth="frown", mouth_w=0.7, sweat=0.0),
    "imbarazzato": dict(brow_tilt=0.4, brow_lift=0.02, mouth="wobble", mouth_w=0.75, blush=1.0, sweat=1.0),
    "spaventato": dict(eyes="round", eye_scale=0.95, pupil=0.6, brow_tilt=0.6, brow_lift=0.25, mouth="teeth", mouth_w=0.9, sweat=1.0),
    "frustrato": dict(eyes="half", brow_tilt=-0.6, brow_lift=-0.06, mouth="frown", mouth_w=0.9, mouth_open=0.2),
    "ironico": dict(eyes="half", brow_asym=0.7, brow_tilt=-0.1, mouth="smirk", mouth_w=0.8),
    "falsa_sicurezza": dict(brow_tilt=-0.15, brow_lift=0.04, mouth="teeth_smile", mouth_w=1.1, sweat=1.0),
    "panico": dict(eyes="round", eye_scale=1.1, pupil=0.45, brow_tilt=0.85, brow_lift=0.3, mouth="scream", mouth_open=1.0, sweat=1.0),
    "sollievo": dict(eyes="closed", brow_tilt=0.2, brow_lift=0.08, mouth="smile", mouth_w=0.9),
    # extra utili alla serie
    "esasperato": dict(eyes="half", eye_scale=1.0, brow_tilt=0.35, brow_lift=-0.02, mouth="line", mouth_w=1.1),
    "piange": dict(eyes="squint", brow_tilt=0.7, mouth="teeth", mouth_w=0.9, tears=1.0, blush=0.8),
}


def expr(name, **over):
    p = dict(BASE)
    p.update(EXPRESSIONS[name])
    p.update(over)
    return p


def mix(a, b, k):
    """Miscela due set di parametri (per le transizioni); i campi non numerici scattano a metà."""
    out = {}
    for key in a:
        va, vb = a[key], b.get(key, a[key])
        if isinstance(va, (int, float)) and not isinstance(va, bool):
            out[key] = va + (vb - va) * k
        else:
            out[key] = vb if k >= 0.5 else va
    return out


class _Pen:
    def __init__(self, size, ss=3):
        self.S = size * ss
        self.ss = ss
        self.size = size
        self.im = Image.new("RGBA", (self.S, self.S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def P(self, x, y):
        return ((x + 1) / 2 * self.S, (1 - (y + 1) / 2) * self.S)

    def u(self, v):
        return v / 2 * self.S

    def line(self, pts, w, col=INK):
        q = [self.P(*p) for p in pts]
        ww = max(1, int(self.u(w)))
        self.d.line(q, fill=col, width=ww, joint="curve")
        r = ww / 2
        for p in (q[0], q[-1]):
            self.d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=col)

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, w=0.0):
        a, b = self.P(cx - rx, cy + ry), self.P(cx + rx, cy - ry)
        self.d.ellipse([a, b], fill=fill, outline=outline, width=max(1, int(self.u(w))) if outline else 0)

    def poly(self, pts, fill):
        self.d.polygon([self.P(*p) for p in pts], fill=fill)

    def done(self):
        return self.im.resize((self.size, self.size), Image.LANCZOS)


def _arc(cx, cy, w, curve, n=24, tilt=0.0, dx=0.0):
    """Punti di un arco orizzontale: curve>0 curva verso l'alto al centro; tilt alza l'estremità destra."""
    pts = []
    for i in range(n + 1):
        t = i / n * 2 - 1
        pts.append((cx + dx + t * w / 2, cy + curve * (1 - t * t) + tilt * t * w / 2))
    return pts


LW = 0.026        # spessore del tratto (unità di raggio)
EYE_X, EYE_Y = 0.27, 0.06
BROW_Y = 0.33
MOUTH_Y = -0.36


def draw_face(p, gaze=(0.0, 0.0), blink=0.0, size=1024, talk=None):
    """p: parametri (vedi expr). gaze: direzione dello sguardo (-1..1). blink 0..1. talk: viseme opzionale (A,E,I,O,U,M,F)."""
    pen = _Pen(size)
    gx, gy = max(-1, min(1, gaze[0])), max(-1, min(1, gaze[1]))
    # spostamento leggero di tutti i tratti con lo sguardo (il volto "guarda" senza ruotare la testa)
    fx, fy = gx * 0.035, gy * 0.025
    es = p["eye_scale"]
    closed = blink >= 0.6
    for side in (-1, 1):
        ex, ey = side * EYE_X + fx, EYE_Y + fy
        asym = 1 + p["eye_asym"] * (0.5 if side > 0 else -0.5)
        kind = "closed" if (closed and p["eyes"] not in ("happy", "squint", "closed")) else p["eyes"]
        open_k = 1.0 if closed else max(0.15, 1 - blink * 1.4)
        if kind == "dot":
            rx, ry = 0.058 * es * asym, 0.078 * es * asym * open_k
            pen.ellipse(ex + gx * 0.05, ey + gy * 0.05, rx, ry, fill=INK)
        elif kind == "half":
            rx, ry = 0.062 * es, 0.07 * es * open_k
            cx_, cy_ = ex + gx * 0.04, ey - 0.012 + gy * 0.03
            # occhio a mezza palpebra: metà inferiore del punto + palpebra dritta
            pts = []
            for i in range(25):
                a = math.pi + math.pi * i / 24
                pts.append((cx_ + rx * math.cos(a), cy_ + ry * math.sin(a)))
            pen.poly(pts, INK)
            pen.line([(ex - 0.1 * es, ey + 0.012), (ex + 0.1 * es, ey + 0.012 - 0.01 * side)], LW)
        elif kind == "round":
            r = 0.15 * es * asym
            ry = r * open_k
            ox = side * -0.03  # i cerchi si avvicinano un po' al centro, come nel riferimento
            pen.ellipse(ex + ox, ey + 0.02, r, ry, fill=(255, 255, 255, 255), outline=INK, w=LW)
            pr = 0.045 * p["pupil"] * (0.6 + 0.4 * es)
            pen.ellipse(ex + ox + gx * (r - pr) * 0.55, ey + 0.02 + gy * (ry - pr) * 0.5, pr, min(pr, ry * 0.8), fill=INK)
        elif kind == "closed":
            pen.line(_arc(ex, ey - 0.01, 0.15 * es, -0.035), LW)
        elif kind == "happy":
            pen.line(_arc(ex, ey - 0.02, 0.15 * es, 0.05), LW)
        elif kind == "squint":
            # occhi a ">" "<" (stretti dal dolore o dal pianto)
            w, h = 0.11 * es, 0.06
            tip = ex - side * w / 2 * 0.2
            pen.line([(ex + side * w / 2, ey + h), (tip - side * w / 2, ey), (ex + side * w / 2, ey - h)], LW)
        if p["lashes"] and kind in ("dot", "half", "round"):
            top = ey + (0.17 if kind == "round" else 0.08) * es
            for k in (-1, 0, 1):
                bx = ex + side * (0.04 + 0.025 * k) + gx * 0.04
                pen.line([(bx, top), (bx + side * 0.035, top + 0.035)], LW * 0.7)
        # sopracciglia
        lift = p["brow_lift"] + (p["brow_asym"] * 0.12 if side > 0 else -p["brow_asym"] * 0.04)
        by = BROW_Y + lift + fy + (0.05 if p["eyes"] == "round" else 0.0)
        tilt = p["brow_tilt"] * 0.09  # >0 interno alzato (preoccupato), <0 interno abbassato (arrabbiato)
        bw = 0.2
        pts = _arc(side * 0.27 + fx, by, bw, 0.02 + 0.03 * p["brow_curve"], n=16)
        pts = [(x, y + tilt * ((-side) * (x - side * 0.27 - fx) / (bw / 2))) for x, y in pts]
        pen.line(pts, LW * 0.9)
    # guance, lacrime, sudore
    if p["blush"] > 0:
        a = int(110 * p["blush"])
        for side in (-1, 1):
            pen.ellipse(side * 0.46 + fx, -0.12 + fy, 0.1, 0.05, fill=BLUSH[:3] + (a,))
            for k in (-1, 0, 1):
                x0 = side * 0.46 + k * 0.035 + fx
                pen.line([(x0 + 0.012, -0.095 + fy), (x0 - 0.012, -0.145 + fy)], LW * 0.5, (225, 110, 110, a + 60))
    if p["tears"] > 0:
        for side in (-1, 1):
            x0 = side * (EYE_X + 0.02) + fx
            pts = [(x0 + side * 0.01 * math.sin(i * 0.9), EYE_Y - 0.07 - i * 0.045) for i in range(7)]
            pen.line(pts, 0.05 * p["tears"], TEAR)
    if p["sweat"] > 0:
        sx, sy = 0.6, 0.35
        s = 0.06 * p["sweat"]
        pts = [(sx, sy + s * 1.6)]
        for i in range(17):
            a = math.pi * i / 16
            pts.append((sx + s * math.cos(a + math.pi), sy - s * math.sin(a)))
        pen.poly(pts, SWEAT)
        pen.line(pts + [pts[0]], LW * 0.45, (70, 140, 200, 255))
    # bocca
    _mouth(pen, p, fx, fy, talk)
    if p.get("mustache"):
        # baffi a inchiostro sopra la bocca (2D, nello stile del volto)
        mx, my = p["mouth_dx"] + fx, MOUTH_Y + fy + 0.1
        pts = []
        for i in range(41):
            t = i / 40 * 2 - 1
            pts.append((mx + t * 0.24, my + 0.035 - 0.05 * abs(t) ** 1.5))
        for i in range(41):
            t = 1 - i / 40 * 2
            pts.append((mx + t * 0.24, my - 0.03 - 0.02 * (1 - t * t) + 0.04 * abs(t) ** 2))
        pen.poly(pts, (60, 55, 55, 255))
    if p.get("glasses"):
        for side in (-1, 1):
            pen.ellipse(side * EYE_X + fx, EYE_Y + fy, 0.15, 0.13, outline=INK, w=LW * 0.85)
        pen.line([(-EYE_X + 0.15 + fx, EYE_Y + 0.02 + fy), (EYE_X - 0.15 + fx, EYE_Y + 0.02 + fy)], LW * 0.8)
    return pen.done()


def _mouth(pen, p, fx, fy, talk):
    mx, my = p["mouth_dx"] + fx, MOUTH_Y + fy
    w = 0.36 * p["mouth_w"]
    kind = p["mouth"]
    if talk:
        kind = {"A": "open", "E": "grin", "I": "teeth_smile", "O": "o", "U": "o", "M": "line", "F": "line"}.get(talk, kind)
    if kind == "line":
        pen.line(_arc(mx, my, w * 0.8, 0.0), LW)
    elif kind == "smile":
        pen.line(_arc(mx, my + 0.02, w, -0.06), LW)
    elif kind == "smirk":
        pts = _arc(mx + 0.03, my, w * 0.8, -0.015, tilt=0.12)
        pen.line(pts, LW)
    elif kind == "frown":
        pen.line(_arc(mx, my - 0.02, w * 0.8, 0.045), LW)
    elif kind == "wobble":
        pts = [(mx - w / 2 + w * i / 30, my + 0.016 * math.sin(i / 30 * math.pi * 4)) for i in range(31)]
        pen.line(pts, LW)
    elif kind in ("grin", "open", "scream", "o"):
        if kind == "o":
            rx, ry = 0.075 * (0.7 + 0.5 * p["mouth_open"]), 0.095 * (0.7 + 0.6 * p["mouth_open"])
            pen.ellipse(mx, my - 0.01, rx, ry, fill=MOUTH_IN, outline=INK, w=LW)
            return
        top = my + 0.02
        depth = (0.17 if kind == "grin" else 0.2) * (0.5 + p["mouth_open"])
        if kind == "scream":
            depth = 0.3 * (0.6 + 0.5 * p["mouth_open"])
            w = w * 0.8
        # bocca a "D": bordo superiore quasi dritto, sotto una curva piena
        pts = []
        for i in range(33):
            t = i / 32 * 2 - 1
            pts.append((mx + t * w / 2, top + (0.012 if kind == "grin" else 0.0) * (1 - t * t)))
        for i in range(33):
            t = 1 - i / 32 * 2
            pts.append((mx + t * w / 2 * math.sqrt(max(0.0, 1 - 0.15 * t * t)), top - depth * math.sqrt(max(0.0, 1 - t * t))))
        pen.poly(pts, MOUTH_IN)
        # lingua
        tw, th = w * 0.32, depth * 0.38
        tpts = []
        for i in range(33):
            a = math.pi * i / 32
            tpts.append((mx + tw * math.cos(a) * 1.0, top - depth + th * 0.2 + th * math.sin(a)))
        lo = [(x, max(y, top - depth * 0.98)) for x, y in tpts]
        pen.poly(lo, TONGUE)
        pen.line(pts + [pts[0]], LW)
    elif kind in ("teeth", "teeth_smile"):
        h = 0.12 if kind == "teeth" else 0.095
        curve = 0.0 if kind == "teeth" else -0.04
        n = 24
        top = [(mx - w / 2 + w * i / n, my + h / 2 + curve * (1 - ((i / n) * 2 - 1) ** 2) * -1) for i in range(n + 1)]
        bot = [(x, y - h) for x, y in top]
        pen.poly(top + bot[::-1], TEETH)
        pen.line(top + bot[::-1] + [top[0]], LW)
        mid = [(x, y - h / 2) for x, y in top]
        pen.line(mid, LW * 0.6)
        for k in range(1, 6):
            i = int(n * k / 6)
            pen.line([top[i], bot[i]], LW * 0.6)


def expression_names():
    return list(EXPRESSIONS.keys())


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "faces_test.png"
    names = expression_names()
    S = 300
    sheet = Image.new("RGBA", (S * 7, S * 2), (235, 235, 232, 255))
    for i, n in enumerate(names):
        f = draw_face(expr(n), size=S)
        bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(bg).ellipse([6, 6, S - 6, S - 6], fill=(245, 245, 242, 255), outline=(20, 20, 20, 255), width=3)
        bg.alpha_composite(f)
        sheet.alpha_composite(bg, ((i % 7) * S, (i // 7) * S))
    sheet.save(out)
