"""
Facce 2D del protagonista "ricalcato" dalla scheda di riferimento approvata dal cliente.

Stile: sopracciglia bianche spesse (rialzate come pongo), occhi con sclera bianca rialzata e pupille nere grandi,
bocca con contorno scuro. Il NASO ROSSO è un oggetto 3D separato (non è nel decal).

Ogni espressione produce due immagini 1024x1024:
  - colore (RGBA): quello che si vede
  - altezza (L): solo gli elementi "rialzati" (sopracciglia, sclere), sfocati -> diventa bump nel materiale
Coordinate: 1024 px = 0.90 unità di testa (la testa è larga 1.0). Centro (512,512) = centro della testa.
Occhi a x = ±201, y = 432; sopracciglia a y = 171; bocca a y = 740.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

INK = (40, 28, 28, 255)
WHITE = (252, 250, 247, 255)
BROW = (26, 22, 22, 255)  # sopracciglia NERE (richiesta del cliente)
PUPIL = (6, 6, 8, 255)
MOUTH_IN = (190, 60, 70, 255)
TONGUE = (236, 128, 138, 255)
BLUSH = (226, 100, 100, 110)
SS = 2
W = 1024 * SS
EX = 172  # distanza orizzontale degli occhi dal centro (misurata sul riferimento)
EY = 440
BY = 235
MY = 715

EXPRESSIONS = [
    "neutro", "felice", "sorpreso", "confuso", "stanco", "frustrato", "imbarazzato", "ironico",
    "sguardo_laterale", "guarda_in_camera", "occhi_chiusi", "occhi_semichiusi", "sbadiglio",
]


class Face:
    def __init__(self):
        self.img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.h = Image.new("L", (W, W), 0)
        self.hd = ImageDraw.Draw(self.h)

    # -- primitive
    def ell(self, cx, cy, rx, ry, color, raised=0, outline=None, ow=0):
        b = [(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS]
        self.d.ellipse(b, fill=color, outline=outline, width=int(ow * SS))
        if raised:
            self.hd.ellipse(b, fill=raised)

    def stroke(self, pts, width, color, raised=0):
        """Tratto con estremità tonde, disegnato come sequenza fitta di cerchi
        (le linee larghe di PIL con joint="curve" lasciano piccoli buchi)."""
        P = [(x * SS, y * SS) for x, y in pts]
        r = width * SS / 2
        step = max(1.0, r / 6)
        dense = []
        for (x0, y0), (x1, y1) in zip(P, P[1:]):
            n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
            dense += [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n)]
        dense.append(P[-1])
        for q in dense:
            box = [q[0] - r, q[1] - r, q[0] + r, q[1] + r]
            self.d.ellipse(box, fill=color)
            if raised:
                self.hd.ellipse(box, fill=raised)

    @staticmethod
    def bez(p0, p1, p2, n=40):
        return [(((1 - t) ** 2) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], ((1 - t) ** 2) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

    # -- elementi
    def brow(self, cx, cy, length=275, thick=100, angle=0, arch=14):
        """length = lunghezza TOTALE (con le estremità tonde). angle>0: estremo esterno più basso (lato destro)."""
        a = math.radians(angle)
        path = max(10, length - thick)
        dx, dy = math.cos(a) * path / 2, math.sin(a) * path / 2
        p0, p2 = (cx - dx, cy - dy), (cx + dx, cy + dy)
        mid = ((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 - arch)
        self.stroke(self.bez(p0, mid, p2), thick, BROW, raised=255)

    def eye(self, cx, cy, rx=106, ry=120, look=(0, 0), pr=(53, 80), lid=0.0, hl=False, inward=0):
        """Occhio come nel riferimento: sclera bianca rialzata, pupilla nera ovale grande.
        inward: sposta la pupilla verso il naso (nel riferimento gli occhi guardano leggermente verso il centro).
        lid 0 = aperto, 1 = chiuso."""
        self.ell(cx, cy, rx, ry, WHITE, raised=255)
        toward = (512 - cx) / abs(512 - cx) if cx != 512 else 0
        px, py = cx + look[0] + toward * inward, cy + look[1]
        self.ell(px, py, pr[0], pr[1], PUPIL)
        if hl:
            self.ell(px + pr[0] * 0.28, py - pr[1] * 0.34, pr[0] * 0.2, pr[0] * 0.2, WHITE)
        if lid > 0:
            cut = cy - ry + 2 * ry * lid
            self.d.rectangle([(cx - rx - 10) * SS, (cy - ry - 10) * SS, (cx + rx + 10) * SS, cut * SS], fill=(0, 0, 0, 0))
            self.hd.rectangle([(cx - rx - 10) * SS, (cy - ry - 10) * SS, (cx + rx + 10) * SS, cut * SS], fill=0)
            self.stroke([(cx - rx - 4, cut), (cx + rx + 4, cut)], 18, INK)

    def eye_arc(self, cx, cy, w=100, up=True):
        """Occhio chiuso: arco (felice ^ oppure sereno ∪)."""
        if up:
            pts = self.bez((cx - w, cy + 22), (cx, cy - 80), (cx + w, cy + 22))
        else:
            pts = self.bez((cx - w, cy - 12), (cx, cy + 56), (cx + w, cy - 12))
        self.stroke(pts, 24, INK)

    def eye_angry(self, cx, cy, side):
        s = 1 if side == "L" else -1
        self.stroke([(cx - s * 82, cy - 66), (cx + s * 66, cy + 4), (cx - s * 82, cy + 66)], 24, INK)

    # bocche
    def mouth_smile(self, w=100, depth=54):
        self.stroke(self.bez((512 - w, MY - 14), (512, MY + depth), (512 + w, MY - 14)), 30, INK)

    def mouth_open(self, w=125, h=175, tongue=True):
        top = MY - 50
        pts = self.bez((512 - w, top), (512, top + 34), (512 + w, top))
        low = self.bez((512 + w, top), (512 + w * 0.8, top + h), (512, top + h))
        low2 = self.bez((512, top + h), (512 - w * 0.8, top + h), (512 - w, top))
        poly = pts + low[1:] + low2[1:]
        self.d.polygon([(x * SS, y * SS) for x, y in poly], fill=MOUTH_IN)
        if tongue:
            self.ell(512, top + h * 0.78, w * 0.55, h * 0.22, TONGUE)
        self.stroke(poly + [poly[0]], 26, INK)

    def mouth_o(self, rx=62, ry=84, ytop=MY - 40):
        self.ell(512, ytop + ry, rx, ry, MOUTH_IN, outline=INK, ow=16)
        self.ell(512, ytop + ry * 1.4, rx * 0.5, ry * 0.3, TONGUE)

    def mouth_wavy(self, w=140, a=26, dy=0):
        pts = []
        for i in range(61):
            t = i / 60
            x = 512 - w + 2 * w * t
            pts.append((x, MY + dy + a * math.sin(t * math.pi * 3.0)))
        self.stroke(pts, 26, INK)

    def mouth_line(self, w=100, dy=0, tilt=0):
        self.stroke([(512 - w, MY + dy - tilt), (512 + w, MY + dy + tilt)], 26, INK)

    def blush(self, y=EY + 215):
        self.ell(512 - 290, y, 100, 56, BLUSH)
        self.ell(512 + 290, y, 100, 56, BLUSH)


def make(name: str):
    f = Face()
    L, R = 512 - EX, 512 + EX
    BL, BR = L - 18, R + 18  # le sopracciglia stanno un po' più fuori degli occhi
    if name == "neutro":
        f.eye(L, EY, inward=44, look=(0, 14)); f.eye(R, EY, inward=44, look=(0, 14))
        f.brow(BL, BY, angle=-17); f.brow(BR, BY, angle=17)
        f.mouth_smile()
    elif name == "felice":
        f.eye_arc(L, EY + 14); f.eye_arc(R, EY + 14)
        f.brow(BL, BY - 24, angle=-14, arch=20); f.brow(BR, BY - 24, angle=14, arch=20)
        f.mouth_open(w=130, h=185)
    elif name == "sorpreso":
        f.eye(L, EY - 4, rx=112, ry=128, pr=(36, 50), look=(0, -26), inward=30); f.eye(R, EY - 4, rx=112, ry=128, pr=(36, 50), look=(0, -26), inward=30)
        f.brow(BL, BY - 56, angle=-12, arch=26); f.brow(BR, BY - 56, angle=12, arch=26)
        f.mouth_o(rx=50, ry=70)
    elif name == "confuso":
        f.eye(L, EY + 6, rx=98, ry=106, pr=(40, 62), look=(0, 12), inward=28); f.eye(R, EY - 6, rx=112, ry=128, pr=(44, 68), look=(0, 12), inward=28)
        f.brow(BL, BY + 26, angle=14, arch=6); f.brow(BR, BY - 50, angle=-6, arch=30)
        f.mouth_wavy(w=110, a=26, dy=10)
    elif name == "stanco":
        f.eye_arc(L, EY + 10, up=False); f.eye_arc(R, EY + 10, up=False)
        f.brow(BL, BY + 20, angle=-12, arch=10); f.brow(BR, BY + 20, angle=12, arch=10)
        f.mouth_o(rx=36, ry=50, ytop=MY - 14)
    elif name == "frustrato":
        f.eye_angry(L, EY + 8, "L"); f.eye_angry(R, EY + 8, "R")
        f.brow(BL + 6, BY + 34, angle=22, arch=0); f.brow(BR - 6, BY + 34, angle=-22, arch=0)
        f.mouth_wavy(w=96, a=20, dy=18)
    elif name == "imbarazzato":
        f.eye(L, EY, look=(34, 18), inward=0); f.eye(R, EY, look=(34, 18), inward=0)
        f.brow(BL, BY - 10, angle=14, arch=10); f.brow(BR, BY - 10, angle=-14, arch=10)
        f.blush(EY + 175)
        f.mouth_wavy(w=84, a=20, dy=4)
    elif name == "ironico":
        f.eye(L, EY + 10, lid=0.5, inward=40, look=(0, 6)); f.eye(R, EY, inward=40, look=(0, 8))
        f.brow(BL, BY + 20, angle=-4, arch=6); f.brow(BR, BY - 50, angle=-14, arch=28)
        f.stroke(f.bez((512 - 96, MY + 12), (512 + 20, MY + 40), (512 + 130, MY - 32)), 26, INK)
    elif name == "sguardo_laterale":
        f.eye(L, EY, look=(46, 6)); f.eye(R, EY, look=(46, 6))
        f.brow(BL, BY + 4, angle=-12, arch=14); f.brow(BR, BY + 4, angle=12, arch=14)
        f.mouth_line(w=62, dy=10, tilt=-8)
    elif name == "sguardo_sinistra":
        f.eye(L, EY, look=(-46, 6)); f.eye(R, EY, look=(-46, 6))
        f.brow(BL, BY + 4, angle=-12, arch=14); f.brow(BR, BY + 4, angle=12, arch=14)
        f.mouth_line(w=62, dy=10, tilt=8)
    elif name == "guarda_in_camera":
        f.eye(L, EY, pr=(60, 90), inward=30); f.eye(R, EY, pr=(60, 90), inward=30)
        f.brow(BL, BY - 16, angle=-14, arch=18); f.brow(BR, BY - 16, angle=14, arch=18)
        f.mouth_smile(w=96, depth=58)
    elif name == "occhi_chiusi":
        f.eye_arc(L, EY + 8, up=False); f.eye_arc(R, EY + 8, up=False)
        f.brow(BL, BY + 8, angle=-8, arch=14); f.brow(BR, BY + 8, angle=8, arch=14)
        f.mouth_smile(w=84, depth=30)
    elif name == "occhi_semichiusi":
        f.eye(L, EY + 12, lid=0.55, inward=36, look=(0, 8)); f.eye(R, EY + 12, lid=0.55, inward=36, look=(0, 8))
        f.brow(BL, BY + 18, angle=-6, arch=8); f.brow(BR, BY + 18, angle=6, arch=8)
        f.mouth_line(w=68, dy=8)
    elif name == "sbadiglio":
        f.eye_arc(L, EY + 8, up=False); f.eye_arc(R, EY + 8, up=False)
        f.brow(BL, BY - 4, angle=-14, arch=20); f.brow(BR, BY - 4, angle=14, arch=20)
        f.mouth_o(rx=88, ry=108, ytop=MY - 50)
    else:
        raise ValueError(name)
    return f


def face_images(name: str, size: int = 1024):
    f = make(name)
    color = f.img.resize((size, size), Image.LANCZOS)
    # mappa di altezza a 16 bit (niente "scalini" da 8 bit che creano striature nel bump)
    import numpy as np
    arr = np.asarray(f.h.resize((size, size), Image.LANCZOS), dtype=np.float32) / 255.0
    sigma = size * 0.012
    r = int(sigma * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(arr, r, mode="edge")
    tmp = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 1, pad)
    arr = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 0, tmp)
    height = Image.fromarray((np.clip(arr, 0, 1) * 65535).astype(np.uint16))
    return color, height


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    for e in EXPRESSIONS:
        c, h = face_images(e, 512)
        bg = Image.new("RGBA", (512, 512), (236, 166, 128, 255))
        bg.alpha_composite(c)
        bg.save(f"{out}/f2_{e}.png")
