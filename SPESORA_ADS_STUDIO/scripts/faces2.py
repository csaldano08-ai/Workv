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
BROW = (236, 234, 240, 255)
MOUTH_IN = (190, 60, 70, 255)
TONGUE = (236, 128, 138, 255)
BLUSH = (226, 100, 100, 110)
SS = 2
W = 1024 * SS
EX = 201  # distanza orizzontale degli occhi dal centro
EY = 432
BY = 171
MY = 740

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
        P = [(x * SS, y * SS) for x, y in pts]
        self.d.line(P, fill=color, width=int(width * SS), joint="curve")
        r = width * SS / 2
        for q in (P[0], P[-1]):
            self.d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=color)
        if raised:
            self.hd.line(P, fill=raised, width=int(width * SS), joint="curve")
            for q in (P[0], P[-1]):
                self.hd.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=raised)

    @staticmethod
    def bez(p0, p1, p2, n=40):
        return [(((1 - t) ** 2) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], ((1 - t) ** 2) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

    # -- elementi
    def brow(self, cx, cy, length=330, thick=112, angle=0, arch=24):
        """length = lunghezza TOTALE (con le estremità tonde). angle>0: estremo esterno più basso (lato destro)."""
        a = math.radians(angle)
        path = max(10, length - thick)
        dx, dy = math.cos(a) * path / 2, math.sin(a) * path / 2
        p0, p2 = (cx - dx, cy - dy), (cx + dx, cy + dy)
        mid = ((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 - arch)
        self.stroke(self.bez(p0, mid, p2), thick, BROW, raised=255)

    def eye(self, cx, cy, rx=129, ry=142, look=(0, 0), pr=(74, 98), lid=0.0, hl=True):
        """Occhio con sclera bianca rialzata e pupilla nera. lid 0 = aperto, 1 = chiuso (palpebra calata)."""
        self.ell(cx, cy, rx, ry, WHITE, raised=255)
        px, py = cx + look[0], cy + look[1]
        self.ell(px, py, pr[0], pr[1], INK)
        if hl:
            self.ell(px + pr[0] * 0.28, py - pr[1] * 0.34, pr[0] * 0.26, pr[0] * 0.26, WHITE)
        if lid > 0:
            cut = cy - ry + 2 * ry * lid
            # palpebra: ricopre la parte alta con il colore pelle (trasparente nel decal): ridisegno con tratto scuro
            self.d.rectangle([(cx - rx - 10) * SS, (cy - ry - 10) * SS, (cx + rx + 10) * SS, cut * SS], fill=(0, 0, 0, 0))
            self.hd.rectangle([(cx - rx - 10) * SS, (cy - ry - 10) * SS, (cx + rx + 10) * SS, cut * SS], fill=0)
            self.stroke([(cx - rx - 4, cut), (cx + rx + 4, cut)], 18, INK)

    def eye_arc(self, cx, cy, w=120, up=True):
        """Occhio chiuso: arco (felice ^ oppure sereno ∪)."""
        if up:
            pts = self.bez((cx - w, cy + 26), (cx, cy - 96), (cx + w, cy + 26))
        else:
            pts = self.bez((cx - w, cy - 14), (cx, cy + 64), (cx + w, cy - 14))
        self.stroke(pts, 26, INK)

    def eye_angry(self, cx, cy, side):
        s = 1 if side == "L" else -1
        self.stroke([(cx - s * 95, cy - 78), (cx + s * 78, cy + 6), (cx - s * 95, cy + 78)], 26, INK)

    # bocche
    def mouth_smile(self, w=150, depth=44):
        self.stroke(self.bez((512 - w, MY - 14), (512, MY + depth), (512 + w, MY - 14)), 30, INK)

    def mouth_open(self, w=150, h=190, tongue=True):
        top = MY - 50
        pts = self.bez((512 - w, top), (512, top + 34), (512 + w, top))
        low = self.bez((512 + w, top), (512 + w * 0.8, top + h), (512, top + h))
        low2 = self.bez((512, top + h), (512 - w * 0.8, top + h), (512 - w, top))
        poly = pts + low[1:] + low2[1:]
        self.d.polygon([(x * SS, y * SS) for x, y in poly], fill=MOUTH_IN)
        if tongue:
            self.ell(512, top + h * 0.78, w * 0.55, h * 0.22, TONGUE)
        self.stroke(poly + [poly[0]], 18, INK)

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
    if name == "neutro":
        f.eye(L, EY, look=(8, 4)); f.eye(R, EY, look=(8, 4))
        f.brow(L - 10, BY, angle=-8, arch=26); f.brow(R + 10, BY, angle=8, arch=26)
        f.mouth_smile()
    elif name == "felice":
        f.eye_arc(L, EY + 20); f.eye_arc(R, EY + 20)
        f.brow(L - 10, BY - 20, angle=-10, arch=34); f.brow(R + 10, BY - 20, angle=10, arch=34)
        f.mouth_open(w=170, h=210)
        f.blush()
    elif name == "sorpreso":
        f.eye(L, EY - 4, rx=136, ry=152, look=(14, -22), pr=(46, 60)); f.eye(R, EY - 4, rx=136, ry=152, look=(14, -22), pr=(46, 60))
        f.brow(L - 10, BY - 52, angle=-6, arch=46); f.brow(R + 10, BY - 52, angle=6, arch=46)
        f.mouth_o()
    elif name == "confuso":
        f.eye(L, EY + 6, rx=118, ry=128, look=(-16, 14), pr=(52, 72)); f.eye(R, EY - 8, rx=136, ry=152, look=(-16, 14), pr=(56, 78))
        f.brow(L - 10, BY + 30, angle=16, arch=8); f.brow(R + 10, BY - 50, angle=-14, arch=44)
        f.mouth_wavy(w=120, a=30, dy=10)
    elif name == "stanco":
        f.eye_arc(L, EY + 10, up=False); f.eye_arc(R, EY + 10, up=False)
        f.brow(L - 10, BY + 28, angle=-6, arch=14); f.brow(R + 10, BY + 28, angle=6, arch=14)
        f.mouth_o(rx=42, ry=56, ytop=MY - 10)
    elif name == "frustrato":
        f.eye_angry(L, EY + 12, "L"); f.eye_angry(R, EY + 12, "R")
        f.brow(L - 6, BY + 30, angle=22, arch=0); f.brow(R + 6, BY + 30, angle=-22, arch=0)
        f.mouth_wavy(w=110, a=22, dy=24)
    elif name == "imbarazzato":
        f.eye(L, EY, look=(40, 22), pr=(58, 78)); f.eye(R, EY, look=(40, 22), pr=(58, 78))
        f.brow(L - 10, BY - 14, angle=18, arch=14); f.brow(R + 10, BY - 14, angle=-18, arch=14)
        f.blush(EY + 190)
        f.mouth_wavy(w=96, a=22, dy=6)
    elif name == "ironico":
        f.eye(L, EY + 12, lid=0.5, look=(12, 8)); f.eye(R, EY, look=(12, 6))
        f.brow(L - 10, BY + 24, angle=6, arch=10); f.brow(R + 10, BY - 52, angle=-16, arch=40)
        f.stroke(f.bez((512 - 110, MY + 14), (512 + 20, MY + 40), (512 + 150, MY - 36)), 20, INK)
    elif name == "sguardo_laterale":
        f.eye(L, EY, look=(62, 6)); f.eye(R, EY, look=(62, 6))
        f.brow(L - 10, BY + 4, angle=-2, arch=18); f.brow(R + 10, BY + 4, angle=2, arch=18)
        f.mouth_line(w=70, dy=10, tilt=-8)
    elif name == "guarda_in_camera":
        f.eye(L, EY, look=(0, 0), pr=(72, 98)); f.eye(R, EY, look=(0, 0), pr=(72, 98))
        f.brow(L - 10, BY - 20, angle=-8, arch=30); f.brow(R + 10, BY - 20, angle=8, arch=30)
        f.mouth_smile(w=130, depth=52)
    elif name == "occhi_chiusi":
        f.eye_arc(L, EY + 8, up=False); f.eye_arc(R, EY + 8, up=False)
        f.brow(L - 10, BY + 10, angle=-4, arch=22); f.brow(R + 10, BY + 10, angle=4, arch=22)
        f.mouth_smile(w=100, depth=24)
    elif name == "occhi_semichiusi":
        f.eye(L, EY + 14, lid=0.55, look=(0, 10)); f.eye(R, EY + 14, lid=0.55, look=(0, 10))
        f.brow(L - 10, BY + 22, angle=4, arch=10); f.brow(R + 10, BY + 22, angle=-4, arch=10)
        f.mouth_line(w=80, dy=10)
    elif name == "sbadiglio":
        f.eye_arc(L, EY + 8, up=False); f.eye_arc(R, EY + 8, up=False)
        f.brow(L - 10, BY - 6, angle=-8, arch=30); f.brow(R + 10, BY - 6, angle=8, arch=30)
        f.mouth_o(rx=104, ry=128, ytop=MY - 60)
    else:
        raise ValueError(name)
    return f


def face_images(name: str, size: int = 1024):
    f = make(name)
    color = f.img.resize((size, size), Image.LANCZOS)
    height = f.h.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size * 0.012))
    return color, height


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    for e in EXPRESSIONS:
        c, h = face_images(e, 512)
        bg = Image.new("RGBA", (512, 512), (236, 166, 128, 255))
        bg.alpha_composite(c)
        bg.save(f"{out}/f2_{e}.png")
