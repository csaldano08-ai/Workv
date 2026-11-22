"""
Facce 2D di Mina e illustrazioni della copertina/dorso (decal sulla copertina 3D).

Fedeli al design approvato (spesora/assets/mascot/mina): occhi ovali verde scuro con piccoli riflessi chiari e ciglia superiori
esterne, sopracciglia piccole, guance pesca, bocca semplice, NESSUN NASO. Rametto botanico salvia nella parte bassa.

Cover: 660x1000 px (copertina larga 0.66, alta 1.0). Dorso: 340x1000 px.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

SS = 2
CW, CH = 660, 1000
FX = 255  # centro orizzontale della faccia: nella parte della copertina a sinistra dell'elastico
EYE = (50, 71, 63, 255)       # verde scurissimo (antracite verde)
EYE_W = (252, 250, 244, 255)
LASH = (50, 71, 63, 255)
BROW = (70, 74, 62, 255)
CHEEK = (240, 170, 130, 205)
MOUTH_IN = (122, 62, 46, 255)
TONGUE = (226, 124, 96, 255)
SAGE = (150, 168, 140, 255)
SAGE_D = (118, 140, 112, 255)
STEM = (140, 156, 128, 255)

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
        # ellisse ruotata: poligono
        pts = []
        for i in range(48):
            t = i / 48 * 2 * math.pi
            x, y = rx * math.cos(t), ry * math.sin(t)
            c, s = math.cos(rot), math.sin(rot)
            pts.append(((cx + x * c - y * s) * SS, (cy + x * s + y * c) * SS))
        self.d.polygon(pts, fill=fill)

    def stroke(self, pts, width, color):
        r = width * SS / 2
        P = [(x * SS, y * SS) for x, y in pts]
        step = max(1.0, r / 5)
        dense = []
        for (x0, y0), (x1, y1) in zip(P, P[1:]):
            n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
            dense += [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n)]
        dense.append(P[-1])
        for q in dense:
            self.d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=color)

    @staticmethod
    def bez(p0, p1, p2, n=40):
        return [(((1 - t) ** 2) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], ((1 - t) ** 2) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

    def out(self):
        return self.img.resize((self.w, self.h), Image.LANCZOS)


def eye(c, cx, cy, side, rx=55, ry=64, look=(0, 0), lid=0.0, wide=False, arc=None):
    """side: -1 sinistro, +1 destro (ciglia sul lato esterno). arc: 'happy' (^) oppure 'sleep' (∪) per occhi chiusi."""
    if arc:
        if arc == "happy":
            pts = c.bez((cx - rx, cy + 14), (cx, cy - 62), (cx + rx, cy + 14))
        else:
            pts = c.bez((cx - rx, cy - 6), (cx, cy + 52), (cx + rx, cy - 6))
        c.stroke(pts, 11, EYE)
        ex = cx + side * rx
        c.stroke([(ex, pts[-1][1] if side > 0 else pts[0][1]), (ex + side * 18, (pts[-1][1] if side > 0 else pts[0][1]) - 14)], 7, LASH)
        return
    if wide:
        rx, ry = rx * 1.12, ry * 1.12
    # bianco appena percettibile intorno all'iride (come nel master)
    c.ell(cx, cy, rx * 1.06, ry * 1.04, (250, 246, 238, 255))
    px, py = cx + look[0], cy + look[1]
    c.ell(px, py, rx * 0.92, ry * 0.96, EYE)
    # riflessi
    c.ell(px + rx * 0.2, py - ry * 0.3, rx * 0.26, rx * 0.26, EYE_W)
    c.ell(px - rx * 0.28, py + ry * 0.34, rx * 0.12, rx * 0.12, EYE_W)
    if lid > 0:
        cut = cy - ry + 2 * ry * lid
        c.d.rectangle([(cx - rx - 12) * SS, (cy - ry - 14) * SS, (cx + rx + 12) * SS, cut * SS], fill=(0, 0, 0, 0))
        c.stroke([(cx - rx - 2, cut), (cx + rx + 2, cut)], 10, EYE)
    # ciglia superiori sul lato esterno (2-3 trattini)
    ox = cx + side * rx * 0.95
    top = cy - ry * 0.55 if lid == 0 else cy - ry + 2 * ry * lid
    for k, (dx, dy) in enumerate([(20, -8), (17, -22), (8, -30)]):
        c.stroke([(ox, top + 6 - k * 6), (ox + side * dx, top + 6 - k * 6 + dy)], 9, LASH)


def brow(c, cx, cy, side, w=70, tilt=0, arch=14, width=11):
    a = math.radians(tilt * side)
    dx, dy = math.cos(a) * w / 2, math.sin(a) * w / 2
    p0, p2 = (cx - dx, cy - dy), (cx + dx, cy + dy)
    mid = ((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 - arch)
    c.stroke(c.bez(p0, mid, p2), width, BROW)


def cheeks(c, y=520, dx=175, r=(58, 52)):
    # sfondo trasparente MA già del colore delle guance: la sfocatura non crea aloni scuri
    layer = Image.new("RGBA", c.img.size, (240, 170, 130, 0))
    ld = ImageDraw.Draw(layer)
    for s in (-1, 1):
        cx = FX + s * dx
        ld.ellipse([(cx - r[0]) * SS, (y - r[1]) * SS, (cx + r[0]) * SS, (y + r[1]) * SS], fill=CHEEK)
    layer = layer.filter(ImageFilter.GaussianBlur(3 * SS))
    c.img.alpha_composite(layer)


def mouth_smile(c, cy=500, w=44, depth=16):
    c.stroke(c.bez((FX - w, cy - 2), (FX, cy + depth * 2), (FX + w, cy - 2)), 8, EYE)


def mouth_open(c, cy=486, w=46, h=58):
    cx = FX
    top = cy - 8
    upper = c.bez((cx - w, top), (cx, top + 16), (cx + w, top))
    lower = c.bez((cx + w, top), (cx + w * 0.7, top + h * 1.15), (cx, top + h)) + c.bez((cx, top + h), (cx - w * 0.7, top + h * 1.15), (cx - w, top))[1:]
    poly = upper + lower[1:]
    c.d.polygon([(x * SS, y * SS) for x, y in poly], fill=MOUTH_IN)
    c.ell(cx, top + h * 0.72, w * 0.55, h * 0.26, TONGUE)
    c.stroke(poly + [poly[0]], 6, (95, 48, 36, 255))


def mouth_o(c, cy=496, rx=22, ry=30):
    cx = FX
    c.ell(cx, cy + ry * 0.5, rx, ry, MOUTH_IN)
    c.ell(cx, cy + ry * 1.0, rx * 0.55, ry * 0.3, TONGUE)


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
    L, R = FX - 130, FX + 130
    ey, by = 400, 292
    if name == "neutra":
        eye(c, L, ey, -1); eye(c, R, ey, 1)
        brow(c, L, by, -1, tilt=-6); brow(c, R, by, 1, tilt=-6)
        cheeks(c); mouth_smile(c)
    elif name == "felice":
        eye(c, L, ey, -1, look=(4, 2)); eye(c, R, ey, 1, look=(4, 2))
        brow(c, L, by - 4, -1, tilt=-10, arch=18); brow(c, R, by - 4, 1, tilt=-10, arch=18)
        cheeks(c); mouth_open(c)
    elif name == "sorpresa":
        eye(c, L, ey - 4, -1, wide=True, look=(0, -4)); eye(c, R, ey - 4, 1, wide=True, look=(0, -4))
        brow(c, L, by - 28, -1, tilt=-14, arch=20); brow(c, R, by - 28, 1, tilt=-14, arch=20)
        cheeks(c); mouth_o(c)
    elif name == "ironica":
        eye(c, L, ey + 6, -1, lid=0.42, look=(10, 6)); eye(c, R, ey, 1, look=(10, 2))
        brow(c, L, by + 14, -1, tilt=4, arch=8); brow(c, R, by - 26, 1, tilt=-18, arch=22)
        cheeks(c)
        c.stroke(c.bez((FX - 40, 506), (FX + 6, 522), (FX + 56, 484)), 8, EYE)
    elif name == "soddisfatta":
        eye(c, L, ey + 8, -1, arc="happy"); eye(c, R, ey + 8, 1, arc="happy")
        brow(c, L, by - 6, -1, tilt=-8, arch=16); brow(c, R, by - 6, 1, tilt=-8, arch=16)
        cheeks(c); mouth_smile(c, cy=498, w=54, depth=22)
    elif name == "pensierosa":
        eye(c, L, ey, -1, look=(-14, -16)); eye(c, R, ey, 1, look=(-14, -16))
        brow(c, L, by - 14, -1, tilt=6, arch=10); brow(c, R, by - 24, 1, tilt=-16, arch=18)
        cheeks(c)
        c.stroke([(FX - 22, 506), (FX + 28, 500)], 8, EYE)
    elif name == "delusa":
        eye(c, L, ey + 10, -1, lid=0.5, look=(0, 8)); eye(c, R, ey + 10, 1, lid=0.5, look=(0, 8))
        brow(c, L, by + 20, -1, tilt=14, arch=4); brow(c, R, by + 20, 1, tilt=14, arch=4)
        cheeks(c)
        c.stroke([(FX - 34, 512), (FX + 34, 512)], 8, EYE)
    elif name == "assonnata":
        eye(c, L, ey + 10, -1, arc="sleep"); eye(c, R, ey + 10, 1, arc="sleep")
        brow(c, L, by + 8, -1, tilt=-4, arch=12); brow(c, R, by + 8, 1, tilt=-4, arch=12)
        cheeks(c); mouth_o(c, cy=498, rx=16, ry=22)
    elif name == "guarda_camera":
        eye(c, L, ey, -1, look=(0, 0)); eye(c, R, ey, 1, look=(0, 0))
        brow(c, L, by - 10, -1, tilt=-8, arch=16); brow(c, R, by - 10, 1, tilt=-8, arch=16)
        cheeks(c); mouth_smile(c, w=48, depth=20)
    elif name == "guarda_destra":
        eye(c, L, ey, -1, look=(22, 2)); eye(c, R, ey, 1, look=(22, 2))
        brow(c, L, by - 6, -1, tilt=-8, arch=14); brow(c, R, by - 6, 1, tilt=-8, arch=14)
        cheeks(c); mouth_smile(c, w=40, depth=14)
    elif name == "guarda_sinistra":
        eye(c, L, ey, -1, look=(-22, 2)); eye(c, R, ey, 1, look=(-22, 2))
        brow(c, L, by - 14, -1, tilt=-6, arch=14); brow(c, R, by - 22, 1, tilt=-14, arch=18)
        cheeks(c); mouth_smile(c, w=44, depth=18)
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
