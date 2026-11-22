"""
Facce 2D di Mina e illustrazioni della copertina/dorso (decal sulla copertina 3D).

Occhi IDENTICI all'originale (scheda ufficiale spesora/assets/mascot/mina/master/mina_reference_sheet.png, volti in basso):
  - bianco dell'occhio (sclera) ovale, visibile come anello attorno all'iride
  - iride verde scurissimo ovale, circa il 70% della larghezza e il 77% dell'altezza del bianco
  - UN solo grande riflesso rotondo in alto a destra dell'iride
  - palpebra superiore spessa, che si assottiglia verso l'interno, e 3 ciglia sul lato esterno
  Si muove SOLO l'iride (con il suo riflesso) dentro il bianco. Nelle espressioni più interattive l'occhio cambia leggermente
  (palpebra, scala), ma forma e proporzioni restano quelle originali.
Sopracciglia: mezzelune sottili, lontane dagli occhi. Guance: ovali pesca piatte. Nessun naso.

Cover: 660x1000 px (copertina larga 0.66, alta 1.0). Dorso: 340x1000 px.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

SS = 3
CW, CH = 660, 1000
FX = 255  # centro orizzontale della faccia: nella parte della copertina a sinistra dell'elastico
EYE = (30, 52, 46, 255)        # iride verde scurissimo (campionato dall'originale)
SCLERA = (253, 252, 249, 255)
LID = (30, 52, 46, 255)
BROW = (40, 62, 54, 255)
EYE_W = (255, 255, 255, 255)
CHEEK = (245, 186, 150, 255)
MOUTH_IN = (118, 62, 46, 255)
TONGUE = (226, 130, 96, 255)
SAGE = (150, 168, 140, 255)
SAGE_D = (118, 140, 112, 255)
STEM = (140, 156, 128, 255)

# misure dell'occhio originale, nel sistema 660x1000 (bianco largo ~100 px)
SCL_RX, SCL_RY = 50, 58
IRIS_RX, IRIS_RY = 35, 45
EXPRESSIONS = ["neutra", "felice", "sorpresa", "ironica", "soddisfatta", "pensierosa", "delusa", "assonnata", "guarda_camera", "guarda_destra", "guarda_sinistra"]


class C:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def ell(self, cx, cy, rx, ry, fill, rot=0):
        if rot == 0:
            self.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill)
            return
        pts = []
        for i in range(60):
            t = i / 60 * 2 * math.pi
            x, y = rx * math.cos(t), ry * math.sin(t)
            c, s = math.cos(rot), math.sin(rot)
            pts.append(((cx + x * c - y * s) * SS, (cy + x * s + y * c) * SS))
        self.d.polygon(pts, fill=fill)

    def tstroke(self, pts, r_of_t, color):
        """Tratto con spessore variabile: r_of_t(t) = raggio in px per t in [0,1]; cerchi fitti (nessun buco)."""
        P = [(x * SS, y * SS) for x, y in pts]
        seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(P, P[1:])]
        total = sum(seg) or 1.0
        acc = 0.0
        for (x0, y0), (x1, y1), L in zip(P, P[1:], seg):
            n = max(1, int(L / 1.2))
            for i in range(n):
                f = i / n
                t = (acc + L * f) / total
                r = r_of_t(t) * SS
                x, y = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
                self.d.ellipse([x - r, y - r, x + r, y + r], fill=color)
            acc += L
        r = r_of_t(1.0) * SS
        self.d.ellipse([P[-1][0] - r, P[-1][1] - r, P[-1][0] + r, P[-1][1] + r], fill=color)

    def stroke(self, pts, width, color):
        self.tstroke(pts, lambda t: width / 2, color)

    @staticmethod
    def bez(p0, p1, p2, n=40):
        return [(((1 - t) ** 2) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], ((1 - t) ** 2) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

    def out(self):
        return self.img.resize((self.w, self.h), Image.LANCZOS)


def _clamp(v, lim):
    return max(-lim, min(lim, v))


def _lid_arc(cx, cy, rx, ry, side, a_from, a_to, n=60):
    """Punti sull'ellisse (angoli in gradi, y verso il basso) – per l'occhio sinistro (side=-1) l'arco parte da sinistra."""
    pts = []
    for i in range(n + 1):
        a = math.radians(a_from + (a_to - a_from) * i / n)
        pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    return pts


def eye(c, cx, cy, side, look=(0, 0), lid=0.0, scale=1.0, arc=None):
    """
    Occhio originale di Mina. side: -1 occhio sinistro (ciglia a sinistra), +1 destro.
    look: spostamento dell'iride in px (l'unica cosa che si muove normalmente).
    lid: 0 aperto .. 1 chiuso (palpebra calata). scale: leggera variazione dell'occhio nelle espressioni interattive.
    arc: 'happy' (^) o 'sleep' (∪) per occhi chiusi.
    """
    rx, ry = SCL_RX * scale, SCL_RY * scale
    if arc:
        if arc == "happy":
            pts = c.bez((cx - rx * 0.95, cy + 16), (cx, cy - 66), (cx + rx * 0.95, cy + 16))
        else:
            pts = c.bez((cx - rx * 0.95, cy - 8), (cx, cy + 50), (cx + rx * 0.95, cy - 8))
        c.tstroke(pts, lambda t: 3.5 + 3.5 * math.sin(math.pi * t) ** 0.6, LID)
        ox, oy = (pts[0] if side < 0 else pts[-1])
        for k, ang in enumerate((200, 232, 262)):
            a = math.radians(ang if side < 0 else 180 - ang + 0)
            c.tstroke([(ox, oy - 2 * k), (ox + 14 * math.cos(a) * 1.0, oy - 2 * k + 14 * math.sin(a))], lambda t: 3.2 * (1 - 0.6 * t), LID)
        return
    # bianco dell'occhio
    c.ell(cx, cy, rx, ry, SCLERA)
    # iride: si muove SOLO lei (con il riflesso), restando dentro il bianco
    ix = cx + 4 * (1 if True else side) + _clamp(look[0], rx - IRIS_RX * scale + 6)
    iy = cy + 3 + _clamp(look[1], ry - IRIS_RY * scale + 5)
    c.ell(ix, iy, IRIS_RX * scale, IRIS_RY * scale, EYE)
    # un solo grande riflesso rotondo, in alto a destra
    c.ell(ix + 15 * scale, iy - 19 * scale, 8.2 * scale, 8.2 * scale, EYE_W)
    cut = None
    if lid > 0:
        cut = cy - ry + 2 * ry * lid
        c.d.rectangle([(cx - rx - 30) * SS, (cy - ry - 40) * SS, (cx + rx + 30) * SS, cut * SS], fill=(0, 0, 0, 0))
    # palpebra superiore spessa che si assottiglia, come nell'originale
    if cut is None:
        if side < 0:
            arc_pts = _lid_arc(cx, cy, rx * 1.07, ry * 1.07, side, 202, 352)
        else:
            arc_pts = _lid_arc(cx, cy, rx * 1.07, ry * 1.07, side, -22, -172)
        c.tstroke(arc_pts, lambda t: 7.4 - 5.6 * t ** 1.3, LID)
        base = arc_pts[:14]
    else:
        y0 = cut
        arc_pts = [(cx + side * (-rx * 1.06 + (2 * rx * 1.06) * t) * -1 if False else cx + (-rx * 1.06 + 2.12 * rx * t) * (1 if side < 0 else 1), y0 + 1.5 * math.sin(math.pi * t)) for t in [i / 30 for i in range(31)]]
        c.tstroke(arc_pts, lambda t: 6.0 - 3.5 * (t if side < 0 else 1 - t), LID)
        base = arc_pts[:6] if side < 0 else arc_pts[-6:][::-1]
    # tre ciglia sul lato esterno, a ventaglio
    for k, (pi, da, L) in enumerate(((0, 8, 23), (3, 34, 26), (7, 58, 21))):
        ox, oy = base[min(pi, len(base) - 1)]
        rad = math.atan2(oy - cy, ox - cx)  # direzione radiale verso l'esterno
        ang = rad + math.radians(da) * (1 if side < 0 else -1)
        ex, ey2 = ox + L * math.cos(ang), oy + L * math.sin(ang)
        mid = ((ox + ex) / 2 + 3 * math.cos(ang + 1.57), (oy + ey2) / 2 + 3 * math.sin(ang + 1.57))
        c.tstroke(c.bez((ox, oy), mid, (ex, ey2), 14), lambda t: 4.6 * (1 - 0.72 * t), LID)


def brow(c, cx, cy, side, w=60, tilt=0, arch=11, thick=10.5):
    """Mezzaluna sottile (spessore massimo al centro, punte sottili), come nell'originale."""
    a = math.radians(tilt * side)
    dx, dy = math.cos(a) * w / 2, math.sin(a) * w / 2
    p0, p2 = (cx - dx, cy - dy), (cx + dx, cy + dy)
    mid = ((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 - arch)
    c.tstroke(c.bez(p0, mid, p2), lambda t: 1.2 + (thick / 2) * math.sin(math.pi * t) ** 0.7, BROW)


def cheeks(c, ey, dx=42, r=(44, 38)):
    """Ovali pesca piatti (gouache), appena ammorbiditi ai bordi."""
    layer = Image.new("RGBA", c.img.size, (245, 186, 150, 0))
    ld = ImageDraw.Draw(layer)
    for s in (-1, 1):
        cx = FX + s * (124 + dx)
        cy = ey + 90
        ld.ellipse([(cx - r[0]) * SS, (cy - r[1]) * SS, (cx + r[0]) * SS, (cy + r[1]) * SS], fill=CHEEK)
    layer = layer.filter(ImageFilter.GaussianBlur(1.2 * SS))
    c.img.alpha_composite(layer)


def mouth_smile(c, my, w=37, depth=7, thick=9.0):
    """Piccola mezzaluna, come il sorriso neutro originale."""
    pts = c.bez((FX - w, my - 3), (FX, my + depth * 2), (FX + w, my - 3), 30)
    c.tstroke(pts, lambda t: 1.5 + (thick / 2) * math.sin(math.pi * t) ** 0.6, EYE)


def mouth_open(c, my, w=44, h=60):
    """Bocca felice originale: D piccola e tonda, interno marrone, grande lingua arancio che occupa il basso."""
    from PIL import ImageChops
    top = my - 4
    pts = []
    pts += [(FX - w, top + 2), (FX - w * 0.55, top - 1), (FX, top + 3), (FX + w * 0.55, top - 1), (FX + w, top + 2)]
    for i in range(1, 30):
        t = math.pi * i / 30
        pts.append((FX + w * math.cos(t), top + 2 + (h - 2) * math.sin(t) ** 0.8))
    mouth = Image.new("L", c.img.size, 0)
    ImageDraw.Draw(mouth).polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    layer = Image.new("RGBA", c.img.size, MOUTH_IN)
    c.img.paste(layer, (0, 0), mouth)
    tongue = Image.new("L", c.img.size, 0)
    ImageDraw.Draw(tongue).ellipse([(FX - w * 0.78) * SS, (top + h * 0.52) * SS, (FX + w * 0.78) * SS, (top + h * 1.35) * SS], fill=255)
    tl = Image.new("RGBA", c.img.size, TONGUE)
    c.img.paste(tl, (0, 0), ImageChops.multiply(mouth, tongue))


def mouth_o(c, my, rx=20, ry=26):
    c.ell(FX, my + ry * 0.4, rx, ry, MOUTH_IN)
    c.ell(FX, my + ry * 0.95, rx * 0.6, ry * 0.32, TONGUE)


def sprig(c, cx=FX, cy=775, scale=0.95):
    """Rametto botanico salvia, parte bassa della copertina (come nel master)."""
    s = scale
    stem = c.bez((cx - 40 * s, cy + 95 * s), (cx + 10 * s, cy + 30 * s), (cx + 48 * s, cy - 88 * s), 50)
    c.stroke(stem, 7 * s, STEM)
    leaves = [(0.18, -1, 0.7), (0.30, 1, 0.78), (0.46, -1, 0.9), (0.60, 1, 0.95), (0.75, -1, 0.9), (0.88, 1, 0.8), (1.0, 0, 1.0)]
    for t, side, size in leaves:
        i = int(t * (len(stem) - 1))
        x, y = stem[i]
        if side == 0:
            ang = -math.pi / 2 + 0.3
        else:
            ang = -math.pi / 2 + side * 0.85
        L, Wd = 58 * s * size, 24 * s * size
        ox, oy = x + math.cos(ang) * L * 0.5, y + math.sin(ang) * L * 0.5
        c.ell(ox, oy, L * 0.5, Wd * 0.5, SAGE if side >= 0 else SAGE_D, rot=ang)


def cover_image(name: str) -> Image.Image:
    c = C(CW, CH)
    ey = 395
    L, R = FX - 124, FX + 124
    by = ey - 125
    my = ey + 85
    if name == "neutra":
        eye(c, L, ey, -1); eye(c, R, ey, 1)
        brow(c, L - 4, by, -1, tilt=-9); brow(c, R + 4, by, 1, tilt=-9)
        cheeks(c, ey); mouth_smile(c, my)
    elif name == "felice":
        eye(c, L, ey, -1, look=(-12, 5)); eye(c, R, ey, 1, look=(-12, 5))
        brow(c, L - 4, by - 6, -1, tilt=-12, arch=11); brow(c, R + 4, by - 10, 1, tilt=-12, arch=11)
        cheeks(c, ey); mouth_open(c, my)
    elif name == "sorpresa":
        eye(c, L, ey - 4, -1, scale=1.1, look=(0, -5)); eye(c, R, ey - 4, 1, scale=1.1, look=(0, -5))
        brow(c, L - 4, by - 26, -1, tilt=-14, arch=13); brow(c, R + 4, by - 26, 1, tilt=-14, arch=13)
        cheeks(c, ey); mouth_o(c, my + 4)
    elif name == "ironica":
        eye(c, L, ey + 5, -1, lid=0.36, look=(12, 3)); eye(c, R, ey, 1, look=(12, 2))
        brow(c, L - 4, by + 10, -1, tilt=4, arch=6); brow(c, R + 4, by - 22, 1, tilt=-18, arch=14)
        cheeks(c, ey)
        c.tstroke(c.bez((FX - 30, my + 6), (FX + 4, my + 20), (FX + 40, my - 8), 30), lambda t: 1.5 + 3.2 * math.sin(math.pi * t) ** 0.6, EYE)
    elif name == "soddisfatta":
        eye(c, L, ey + 4, -1, arc="happy"); eye(c, R, ey + 4, 1, arc="happy")
        brow(c, L - 4, by - 2, -1, tilt=-9, arch=10); brow(c, R + 4, by - 2, 1, tilt=-9, arch=10)
        cheeks(c, ey); mouth_smile(c, my, w=46, depth=14)
    elif name == "pensierosa":
        eye(c, L, ey, -1, look=(-12, -11)); eye(c, R, ey, 1, look=(-12, -11))
        brow(c, L - 4, by - 8, -1, tilt=6, arch=8); brow(c, R + 4, by - 22, 1, tilt=-16, arch=12)
        cheeks(c, ey)
        c.tstroke([(FX - 16, my + 2), (FX + 22, my - 2)], lambda t: 3.4, EYE)
    elif name == "delusa":
        eye(c, L, ey + 6, -1, lid=0.4, look=(0, 9)); eye(c, R, ey + 6, 1, lid=0.4, look=(0, 9))
        brow(c, L - 4, by + 14, -1, tilt=12, arch=4); brow(c, R + 4, by + 14, 1, tilt=12, arch=4)
        cheeks(c, ey)
        c.tstroke([(FX - 26, my + 8), (FX + 26, my + 8)], lambda t: 3.4, EYE)
    elif name == "assonnata":
        eye(c, L, ey + 6, -1, arc="sleep"); eye(c, R, ey + 6, 1, arc="sleep")
        brow(c, L - 4, by + 6, -1, tilt=-5, arch=7); brow(c, R + 4, by + 6, 1, tilt=-5, arch=7)
        cheeks(c, ey); mouth_o(c, my + 6, rx=12, ry=16)
    elif name == "guarda_camera":
        eye(c, L, ey, -1, look=(0, 0)); eye(c, R, ey, 1, look=(0, 0))
        brow(c, L - 4, by - 6, -1, tilt=-10, arch=10); brow(c, R + 4, by - 6, 1, tilt=-10, arch=10)
        cheeks(c, ey); mouth_smile(c, my, w=40, depth=10)
    elif name == "guarda_destra":
        eye(c, L, ey, -1, look=(15, 2)); eye(c, R, ey, 1, look=(15, 2))
        brow(c, L - 4, by - 2, -1, tilt=-9); brow(c, R + 4, by - 2, 1, tilt=-9)
        cheeks(c, ey); mouth_smile(c, my, w=34, depth=8)
    elif name == "guarda_sinistra":
        eye(c, L, ey, -1, look=(-15, 2)); eye(c, R, ey, 1, look=(-15, 2))
        brow(c, L - 4, by - 8, -1, tilt=-6); brow(c, R + 4, by - 14, 1, tilt=-12)
        cheeks(c, ey); mouth_smile(c, my, w=34, depth=8)
    else:
        raise ValueError(name)
    sprig(c)
    return c.out()


def spine_image() -> Image.Image:
    """Dorso: due rametti chiari con foglie alterne e un puntino, come nel master."""
    c = C(340, 1000)
    pale = (214, 223, 200, 255)
    for cy, sc in ((270, 1.0), (830, 0.9)):
        top, bot = cy - 130 * sc, cy + 120 * sc
        stem = c.bez((170, bot), (166, (top + bot) / 2), (172, top), 40)
        c.stroke(stem, 6, pale)
        for k, t in enumerate((0.25, 0.42, 0.59, 0.76)):
            i = int(t * (len(stem) - 1))
            x, y = stem[i]
            side = -1 if k % 2 == 0 else 1
            ang = -math.pi / 2 + side * 0.62
            L = 70 * sc
            c.ell(x + math.cos(ang) * L * 0.5, y + math.sin(ang) * L * 0.5, L * 0.5, 15 * sc, pale, rot=ang)
        x, y = stem[-1]
        c.ell(x, y - 18 * sc, 12 * sc, 30 * sc, pale)
    c.ell(170, 540, 9, 22, pale)
    return c.out()


if __name__ == "__main__":
    import sys
    out = sys.argv[1]
    for e in EXPRESSIONS:
        im = Image.new("RGBA", (CW, CH), (249, 238, 220, 255))
        im.alpha_composite(cover_image(e))
        im.save(f"{out}/mina_face_{e}.png")
