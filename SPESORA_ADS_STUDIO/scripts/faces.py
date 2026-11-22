"""
Sistema delle facce 2D del protagonista (applicate come "decal" sulla testa 3D).

Ogni espressione è disegnata in codice (PIL), con supersampling, su una tela 1024x1024 trasparente.
Coordinate: occhi a y~470, sopracciglia a y~360, bocca a y~660. Nessun naso, nessun dente realistico.

Uso:  face_image("felice") -> PIL.Image RGBA
"""
import math
from PIL import Image, ImageDraw

INK = (43, 33, 28, 255)
BROW = (58, 42, 34, 255)
MOUTH_IN = (122, 46, 46, 255)
TONGUE = (226, 128, 128, 255)
WHITE = (255, 253, 248, 255)
BLUSH = (235, 140, 96, 150)
SS = 2  # supersampling
W = 1024 * SS

EXPRESSIONS = [
    "neutro", "felice", "sorpreso", "confuso", "stanco", "frustrato", "imbarazzato", "ironico",
    "sguardo_laterale", "guarda_in_camera", "occhi_chiusi", "occhi_semichiusi", "sbadiglio",
]


def _p(x, y):
    return (x * SS, y * SS)


def _bez(p0, p1, p2, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def _stroke(d, pts, width, color):
    pts = [_p(*q) for q in pts]
    d.line(pts, fill=color, width=int(width * SS), joint="curve")
    r = width * SS / 2
    for q in (pts[0], pts[-1]):
        d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=color)


def _ell(d, cx, cy, rx, ry, color, outline=None, ow=0):
    d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=color, outline=outline, width=int(ow * SS))


def _brow(d, cx, cy, length, angle_deg, arch, width=30):
    """Sopracciglio: segmento centrato in (cx,cy), ruotato di angle_deg (positivo = estremo esterno più basso), con arco."""
    a = math.radians(angle_deg)
    dx, dy = math.cos(a) * length / 2, math.sin(a) * length / 2
    p0, p2 = (cx - dx, cy - dy), (cx + dx, cy + dy)
    mid = ((p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 - arch)
    _stroke(d, _bez(p0, mid, p2), width, BROW)


def _eye_open(d, cx, cy, rx=46, ry=70, look=(0, 0), hl=True):
    _ell(d, cx + look[0], cy + look[1], rx, ry, INK)
    if hl:
        _ell(d, cx + look[0] - rx * 0.3, cy + look[1] - ry * 0.38, rx * 0.28, rx * 0.28, WHITE)


def _eye_white(d, cx, cy, rx=62, ry=84, look=(0, 0), pr=22):
    _ell(d, cx, cy, rx, ry, WHITE, outline=INK, ow=9)
    _ell(d, cx + look[0], cy + look[1], pr, pr * 1.15, INK)
    _ell(d, cx + look[0] - pr * 0.3, cy + look[1] - pr * 0.4, pr * 0.3, pr * 0.3, WHITE)


def _eye_arc_happy(d, cx, cy, w=70):
    _stroke(d, _bez((cx - w, cy + 18), (cx, cy - 62), (cx + w, cy + 18)), 22, INK)


def _eye_closed(d, cx, cy, w=64):
    _stroke(d, _bez((cx - w, cy - 6), (cx, cy + 34), (cx + w, cy - 6)), 20, INK)


def _eye_lid(d, cx, cy, rx=50, ry=70, lid=0.5, look=(0, 0)):
    """Occhio con palpebra superiore calata (lid 0 = aperto, 1 = chiuso)."""
    _eye_open(d, cx, cy, rx, ry, look, hl=False)
    cut = cy - ry + 2 * ry * lid
    d.rectangle([(cx - rx - 20) * SS, (cy - ry - 30) * SS, (cx + rx + 20) * SS, cut * SS], fill=(0, 0, 0, 0))
    # il taglio cancella: ridisegna la linea della palpebra
    _stroke(d, [(cx - rx - 4, cut), (cx + rx + 4, cut)], 14, INK)


def _clear_above(img, y_cut, x0, x1):
    pass


def face_image(name: str, size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ex = 150  # distanza orizzontale degli occhi dal centro
    cx, cy_eye, cy_brow, cy_mouth = 512, 470, 360, 665
    L, R = cx - ex, cx + ex

    if name == "neutro":
        _eye_open(d, L, cy_eye)
        _eye_open(d, R, cy_eye)
        _brow(d, L, cy_brow, 120, -4, 10)
        _brow(d, R, cy_brow, 120, 4, 10)
        _stroke(d, _bez((cx - 55, cy_mouth), (cx, cy_mouth + 22), (cx + 55, cy_mouth)), 18, INK)

    elif name == "felice":
        _eye_arc_happy(d, L, cy_eye)
        _eye_arc_happy(d, R, cy_eye)
        _brow(d, L, cy_brow - 18, 120, -10, 22)
        _brow(d, R, cy_brow - 18, 120, 10, 22)
        # bocca aperta a D con lingua
        pts = _bez((cx - 110, cy_mouth - 25), (cx, cy_mouth + 40), (cx + 110, cy_mouth - 25))
        poly = pts + [(cx + 110, cy_mouth - 25)]
        mouth = [(x, y) for x, y in pts] + _bez((cx + 110, cy_mouth - 25), (cx, cy_mouth - 40), (cx - 110, cy_mouth - 25))
        d.polygon([_p(*q) for q in [(cx - 110, cy_mouth - 25), (cx + 110, cy_mouth - 25), (cx + 70, cy_mouth + 70), (cx, cy_mouth + 105), (cx - 70, cy_mouth + 70)]], fill=MOUTH_IN)
        _ell(d, cx, cy_mouth + 70, 52, 30, TONGUE)
        _stroke(d, [(cx - 110, cy_mouth - 25), (cx + 110, cy_mouth - 25)], 16, INK)
        _ell(d, L - 20, cy_eye + 105, 48, 26, BLUSH)
        _ell(d, R + 20, cy_eye + 105, 48, 26, BLUSH)

    elif name == "sorpreso":
        _eye_white(d, L, cy_eye - 6, 66, 90, (0, 4), 22)
        _eye_white(d, R, cy_eye - 6, 66, 90, (0, 4), 22)
        _brow(d, L, cy_brow - 55, 120, -6, 34)
        _brow(d, R, cy_brow - 55, 120, 6, 34)
        _ell(d, cx, cy_mouth + 40, 50, 72, MOUTH_IN, outline=INK, ow=14)
        _ell(d, cx, cy_mouth + 78, 30, 20, TONGUE)

    elif name == "confuso":
        _eye_white(d, L, cy_eye, 52, 70, (-14, 10), 20)
        _eye_white(d, R, cy_eye - 10, 62, 86, (-14, 10), 22)
        _brow(d, L, cy_brow + 20, 112, 14, 4)
        _brow(d, R, cy_brow - 48, 120, -14, 26)
        _stroke(d, _bez((cx - 80, cy_mouth + 10), (cx - 36, cy_mouth - 30), (cx + 8, cy_mouth + 12)) + _bez((cx + 8, cy_mouth + 12), (cx + 52, cy_mouth + 54), (cx + 100, cy_mouth - 6))[1:], 18, INK)

    elif name == "stanco":
        _eye_lid(d, L, cy_eye + 16, 52, 66, 0.55, (0, 8))
        _eye_lid(d, R, cy_eye + 16, 52, 66, 0.55, (0, 8))
        _stroke(d, _bez((L - 50, cy_eye + 98), (L, cy_eye + 112), (L + 50, cy_eye + 98)), 9, (110, 80, 70, 200))
        _stroke(d, _bez((R - 50, cy_eye + 98), (R, cy_eye + 112), (R + 50, cy_eye + 98)), 9, (110, 80, 70, 200))
        _brow(d, L, cy_brow + 28, 120, 8, 4)
        _brow(d, R, cy_brow + 28, 120, -8, 4)
        _stroke(d, _bez((cx - 50, cy_mouth + 28), (cx, cy_mouth - 6), (cx + 50, cy_mouth + 28)), 18, INK)

    elif name == "frustrato":
        _eye_open(d, L, cy_eye + 8, 40, 52)
        _eye_open(d, R, cy_eye + 8, 40, 52)
        _brow(d, L, cy_brow + 22, 140, 26, 0, 34)
        _brow(d, R, cy_brow + 22, 140, -26, 0, 34)
        d.polygon([_p(*q) for q in [(cx - 90, cy_mouth + 55), (cx - 50, cy_mouth - 5), (cx + 50, cy_mouth - 5), (cx + 90, cy_mouth + 55), (cx + 40, cy_mouth + 40), (cx - 40, cy_mouth + 40)]], fill=MOUTH_IN)
        _stroke(d, [(cx - 90, cy_mouth + 55), (cx - 50, cy_mouth - 5), (cx + 50, cy_mouth - 5), (cx + 90, cy_mouth + 55)], 15, INK)

    elif name == "imbarazzato":
        _eye_open(d, L, cy_eye, 44, 62, (22, 10))
        _eye_open(d, R, cy_eye, 44, 62, (22, 10))
        _brow(d, L, cy_brow - 6, 112, 16, 6)
        _brow(d, R, cy_brow - 6, 112, -16, 6)
        _ell(d, L - 10, cy_eye + 110, 60, 32, BLUSH)
        _ell(d, R + 10, cy_eye + 110, 60, 32, BLUSH)
        _stroke(d, _bez((cx - 60, cy_mouth + 10), (cx - 30, cy_mouth - 16), (cx, cy_mouth + 8)) + _bez((cx, cy_mouth + 8), (cx + 30, cy_mouth + 32), (cx + 60, cy_mouth + 4))[1:], 17, INK)

    elif name == "ironico":
        _eye_lid(d, L, cy_eye + 8, 52, 64, 0.5)
        _eye_open(d, R, cy_eye, 46, 68, hl=True)
        _brow(d, L, cy_brow + 20, 122, 4, 4)
        _brow(d, R, cy_brow - 42, 124, -16, 26)
        _stroke(d, _bez((cx - 60, cy_mouth + 18), (cx + 10, cy_mouth + 30), (cx + 92, cy_mouth - 22)), 18, INK)

    elif name == "sguardo_laterale":
        _eye_white(d, L, cy_eye, 56, 72, (34, 4), 24)
        _eye_white(d, R, cy_eye, 56, 72, (34, 4), 24)
        _brow(d, L, cy_brow + 6, 120, 2, 8)
        _brow(d, R, cy_brow + 6, 120, -2, 8)
        _stroke(d, _bez((cx - 40, cy_mouth + 8), (cx + 4, cy_mouth + 14), (cx + 52, cy_mouth - 8)), 17, INK)

    elif name == "guarda_in_camera":
        _eye_white(d, L, cy_eye, 56, 74, (0, 0), 28)
        _eye_white(d, R, cy_eye, 56, 74, (0, 0), 28)
        _brow(d, L, cy_brow - 20, 120, -8, 18)
        _brow(d, R, cy_brow - 20, 120, 8, 18)
        _stroke(d, _bez((cx - 62, cy_mouth - 2), (cx, cy_mouth + 40), (cx + 62, cy_mouth - 2)), 18, INK)

    elif name == "occhi_chiusi":
        _eye_closed(d, L, cy_eye + 10)
        _eye_closed(d, R, cy_eye + 10)
        _brow(d, L, cy_brow + 6, 116, -2, 12)
        _brow(d, R, cy_brow + 6, 116, 2, 12)
        _stroke(d, _bez((cx - 50, cy_mouth), (cx, cy_mouth + 18), (cx + 50, cy_mouth)), 17, INK)

    elif name == "occhi_semichiusi":
        _eye_lid(d, L, cy_eye + 12, 52, 66, 0.62, (0, 6))
        _eye_lid(d, R, cy_eye + 12, 52, 66, 0.62, (0, 6))
        _brow(d, L, cy_brow + 22, 120, 4, 6)
        _brow(d, R, cy_brow + 22, 120, -4, 6)
        _stroke(d, [(cx - 44, cy_mouth + 6), (cx + 44, cy_mouth + 6)], 17, INK)

    elif name == "sbadiglio":
        _eye_closed(d, L, cy_eye + 6, 58)
        _eye_closed(d, R, cy_eye + 6, 58)
        _brow(d, L, cy_brow - 10, 120, -8, 16)
        _brow(d, R, cy_brow - 10, 120, 8, 16)
        _ell(d, cx, cy_mouth + 46, 76, 96, MOUTH_IN, outline=INK, ow=14)
        _ell(d, cx, cy_mouth + 92, 44, 28, TONGUE)
    else:
        raise ValueError(name)

    # zoom: le espressioni occupano più testa (la faccia è l'elemento più importante)
    z = 1.38
    c = W / 2
    half = W / (2 * z)
    out = img.crop((int(c - half), int(c - half + 0.02 * W), int(c + half), int(c + half + 0.02 * W))).resize((size, size), Image.LANCZOS)
    return out


def leaf_image(size: int = 512) -> Image.Image:
    """Foglia del marchio Spesora, per la maglietta (bianco avorio)."""
    img = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size * 2
    pts = _bez((s * 0.5, s * 0.1), (s * 0.95, s * 0.35), (s * 0.5, s * 0.9), 60) + _bez((s * 0.5, s * 0.9), (s * 0.05, s * 0.35), (s * 0.5, s * 0.1), 60)
    d.polygon(pts, fill=(246, 243, 234, 255))
    d.line([(s * 0.5, s * 0.82), (s * 0.5, s * 0.3)], fill=(143, 164, 135, 255), width=int(s * 0.03))
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    for e in EXPRESSIONS:
        face_image(e, 512).save(f"{out}/face_{e}.png")
