"""
Facce ANIMABILI: ogni elemento del viso è un'immagine separata (con trasparenza) che il rig sposta, ruota, scala o accende/spegne.
Si riusano esattamente i disegni già approvati (faces2.py per il protagonista, faces_mina.py per Mina): qui vengono solo
ritagliati in parti, così le pupille possono scorrere dentro il bianco, le sopracciglia muoversi, le palpebre abbassarsi,
e la bocca cambiare forma senza rifare il volto intero.

hero_parts(outdir)  -> dict nome -> {color, height, size(unità), center(unità, rispetto al centro della faccia)}
mina_parts(outdir)  -> idem, con centro rispetto al centro della copertina
Unità del protagonista: testa larga 1.0 (la tela da 1024 px copre 0.90). Unità di Mina: copertina larga 0.66, alta 1.0.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import faces2 as F2
import faces_mina as FM

HS = 1024 / 0.90  # px per unità nella tela del protagonista


def _crop(img_big, ss, canvas_center_px, px_per_unit, height_big=None, pad=3):
    """Ritaglia la parte (bbox dell'alpha) e restituisce (img, height16 o None, size_units, center_units)."""
    a = img_big.getchannel("A")
    bb = a.getbbox()
    if bb is None:
        raise ValueError("parte vuota")
    x0, y0, x1, y1 = bb
    x0, y0, x1, y1 = x0 - pad * ss, y0 - pad * ss, x1 + pad * ss, y1 + pad * ss
    color = img_big.crop((x0, y0, x1, y1))
    h = None
    if height_big is not None:
        arr = np.asarray(height_big.crop((x0, y0, x1, y1)), dtype=np.float32) / 255.0
        # sfocatura gaussiana separabile: rilievo morbido, salvato a 16 bit (niente scalini)
        sigma = 0.012 * 1024
        r = int(sigma * 3)
        k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
        k /= k.sum()
        pad_a = np.pad(arr, r, mode="edge")
        tmp = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 1, pad_a)
        arr = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 0, tmp)
        h = Image.fromarray((np.clip(arr, 0, 1) * 65535).astype(np.uint16))
    w_px, h_px = (x1 - x0) / ss, (y1 - y0) / ss
    cx_px, cy_px = (x0 + x1) / 2 / ss, (y0 + y1) / 2 / ss
    size = (w_px / px_per_unit, h_px / px_per_unit)
    center = ((cx_px - canvas_center_px[0]) / px_per_unit, (canvas_center_px[1] - cy_px) / px_per_unit)
    return color, h, size, center


def _save(outdir, name, color, h):
    cp = os.path.join(outdir, f"{name}_c.png")
    color.save(cp)
    hp = None
    if h is not None:
        hp = os.path.join(outdir, f"{name}_h.png")
        h.save(hp)
    return cp, hp


# ============================================================================ protagonista
def hero_parts(outdir):
    os.makedirs(outdir, exist_ok=True)
    SS, parts = F2.SS, {}
    L = 512 - F2.EX

    def add(name, draw, raised=False, side=None):
        f = F2.Face()
        draw(f)
        color, h, size, center = _crop(f.img, SS, (512, 512), HS, f.h if raised else None)
        cp, hp = _save(outdir, "hero_" + name, color, h)
        parts[name] = dict(color=cp, height=hp, size=size, center=center)

    # elementi dell'occhio (disegnati al centro della tela: il rig li colloca sull'occhio)
    add("sclera", lambda f: f.ell(512, 512, 106, 120, F2.WHITE, raised=255), raised=True)
    add("pupil", lambda f: f.ell(512, 512, 53, 80, F2.PUPIL))
    add("brow", lambda f: f.brow(512, 512, length=275, angle=0, arch=14), raised=True)
    # bocche: nella posizione naturale (il centro del ritaglio dà la posizione sul volto)
    add("m_smile", lambda f: f.mouth_smile())
    add("m_open", lambda f: f.mouth_open(w=130, h=185))
    add("m_o", lambda f: f.mouth_o(rx=50, ry=70))
    add("m_osmall", lambda f: f.mouth_o(rx=36, ry=50, ytop=F2.MY - 14))
    add("m_yawn", lambda f: f.mouth_o(rx=88, ry=108, ytop=F2.MY - 50))
    add("m_wavy", lambda f: f.mouth_wavy(w=96, a=20, dy=18))
    add("m_line", lambda f: f.mouth_line(w=68, dy=8))
    add("m_smirk", lambda f: f.stroke(f.bez((512 - 96, F2.MY + 12), (512 + 20, F2.MY + 40), (512 + 130, F2.MY - 32)), 26, F2.INK))
    add("m_t1", lambda f: f.mouth_o(rx=40, ry=30, ytop=F2.MY - 10))
    add("m_t2", lambda f: f.mouth_o(rx=52, ry=52, ytop=F2.MY - 20))
    add("m_t3", lambda f: f.mouth_open(w=96, h=104))
    # visemi per il parlato italiano: A, E, I, O, U, M/B/P (labbra chiuse), F/V
    add("m_vA", lambda f: f.mouth_open(w=104, h=148))
    add("m_vE", lambda f: f.mouth_open(w=124, h=84, tongue=False))
    add("m_vI", lambda f: f.mouth_open(w=118, h=50, tongue=False))
    add("m_vO", lambda f: f.mouth_o(rx=50, ry=66))
    add("m_vU", lambda f: f.mouth_o(rx=30, ry=40, ytop=F2.MY - 6))
    add("m_vM", lambda f: f.mouth_line(w=58, dy=6))
    add("m_vF", lambda f: f.mouth_line(w=74, dy=10))
    # occhi chiusi / arrabbiati (sostituiscono l'occhio aperto)
    add("arc_happy", lambda f: f.eye_arc(L, F2.EY + 14))
    add("arc_sleep", lambda f: f.eye_arc(L, F2.EY + 10, up=False))
    add("angry_L", lambda f: f.eye_angry(L, F2.EY + 8, "L"))
    add("angry_R", lambda f: f.eye_angry(512 + F2.EX, F2.EY + 8, "R"))
    # guance
    add("blush", lambda f: f.ell(512, 512, 60, 32, F2.BLUSH))
    return parts


# ============================================================================ Mina
def mina_parts(outdir):
    os.makedirs(outdir, exist_ok=True)
    SS, parts = FM.SS, {}
    CWd, CHt = FM.CW, FM.CH
    cc = (CWd / 2, CHt / 2)
    PU = 1000.0  # px per unità
    ECX, ECY = 330, 500  # centro dell'occhio quando si disegna da solo
    FX, EYc = FM.FX, 395

    def add(name, draw):
        c = FM.C(CWd, CHt)
        draw(c)
        color, h, size, center = _crop(c.img, SS, cc, PU)
        cp, hp = _save(outdir, "mina_" + name, color, h)
        parts[name] = dict(color=cp, height=None, size=size, center=center)

    def sclera(c):
        c.ell(ECX, ECY, FM.SCL_RX, FM.SCL_RY, FM.SCLERA)

    def iris(c):
        c.ell(ECX, ECY, FM.IRIS_RX, FM.IRIS_RY, FM.EYE)
        c.ell(ECX + 15, ECY - 19, 8.2, 8.2, FM.EYE_W)

    def lid(side):
        def draw(c):
            rx, ry = FM.SCL_RX, FM.SCL_RY
            arc_pts = FM._lid_arc(ECX, ECY, rx * 1.07, ry * 1.07, side, 202, 352) if side < 0 else FM._lid_arc(ECX, ECY, rx * 1.07, ry * 1.07, side, -22, -172)
            c.tstroke(arc_pts, lambda t: 7.4 - 5.6 * t ** 1.3, FM.LID)
            base = arc_pts[:14]
            for k, (pi, da, Ln) in enumerate(((0, 8, 23), (3, 34, 26), (7, 58, 21))):
                ox, oy = base[min(pi, len(base) - 1)]
                rad = math.atan2(oy - ECY, ox - ECX)
                ang = rad + math.radians(da) * (1 if side < 0 else -1)
                ex, ey2 = ox + Ln * math.cos(ang), oy + Ln * math.sin(ang)
                mid = ((ox + ex) / 2 + 3 * math.cos(ang + 1.57), (oy + ey2) / 2 + 3 * math.sin(ang + 1.57))
                c.tstroke(c.bez((ox, oy), mid, (ex, ey2), 14), lambda t: 4.6 * (1 - 0.72 * t), FM.LID)
        return draw

    def arc(kind, side):
        return lambda c: FM.eye(c, ECX, ECY, side, arc=kind)

    add("sclera", sclera)
    add("iris", iris)
    add("lid_L", lid(-1))
    add("lid_R", lid(1))
    add("arc_happy_L", arc("happy", -1))
    add("arc_happy_R", arc("happy", 1))
    add("arc_sleep_L", arc("sleep", -1))
    add("arc_sleep_R", arc("sleep", 1))
    add("brow", lambda c: FM.brow(c, ECX, ECY, -1, tilt=0))
    my = EYc + 85
    add("m_smile", lambda c: FM.mouth_smile(c, my))
    add("m_open", lambda c: FM.mouth_open(c, my))
    add("m_o", lambda c: FM.mouth_o(c, my + 4))
    add("m_osmall", lambda c: FM.mouth_o(c, my + 6, rx=12, ry=16))
    add("m_line", lambda c: c.tstroke([(FX - 26, my + 8), (FX + 26, my + 8)], lambda t: 3.4, FM.EYE))
    add("m_smirk", lambda c: c.tstroke(c.bez((FX - 30, my + 6), (FX + 4, my + 20), (FX + 40, my - 8), 30), lambda t: 1.5 + 3.2 * math.sin(math.pi * t) ** 0.6, FM.EYE))
    add("m_t1", lambda c: FM.mouth_o(c, my + 2, rx=16, ry=14))
    add("m_t2", lambda c: FM.mouth_o(c, my + 2, rx=20, ry=24))
    add("m_t3", lambda c: FM.mouth_open(c, my, w=36, h=48))
    add("m_vA", lambda c: FM.mouth_open(c, my, w=40, h=52))
    add("m_vE", lambda c: FM.mouth_open(c, my + 2, w=42, h=30))
    add("m_vI", lambda c: FM.mouth_open(c, my + 4, w=38, h=18))
    add("m_vO", lambda c: FM.mouth_o(c, my + 2, rx=19, ry=25))
    add("m_vU", lambda c: FM.mouth_o(c, my + 6, rx=12, ry=16))
    add("m_vM", lambda c: c.tstroke([(FX - 22, my + 8), (FX + 22, my + 8)], lambda t: 3.4, FM.EYE))
    add("m_vF", lambda c: c.tstroke([(FX - 28, my + 9), (FX + 28, my + 9)], lambda t: 3.0, FM.EYE))

    def cheek(side):
        def draw(c):
            layer = Image.new("RGBA", c.img.size, (245, 186, 150, 0))
            ImageDraw.Draw(layer).ellipse([(FX + side * 166 - 44) * SS, (EYc + 90 - 38) * SS, (FX + side * 166 + 44) * SS, (EYc + 90 + 38) * SS], fill=FM.CHEEK)
            c.img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1.2 * SS)))
        return draw

    add("cheek_L", cheek(-1))
    add("cheek_R", cheek(1))
    add("sprig", lambda c: FM.sprig(c))
    return parts


# posizioni naturali degli occhi, ecc. (unità, rispetto al centro della faccia)
HERO_EYE = ((F2.EX and (512 - F2.EX - 512) / HS), (512 - F2.EY) / HS)  # sinistro
HERO_BROW_Y = (512 - F2.BY) / HS
