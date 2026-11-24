"""
Pianta del set di EP01 (dalla stessa LAYOUT che genera il 3D): zone, corsie, casse, ufficio con arco della porta,
percorso del protagonista per scena, posizioni delle camere.
    python cs_plan.py <out.png>
"""
import math
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import bpy  # noqa: E402,F401  (serve per importare cs_market)
from cs_market import LAYOUT, STORE_NAME  # noqa: E402

FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FR = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
SC = 95  # pixel per metro
x0, x1, y0, y1 = LAYOUT["store"]
M = 120
W, H = int((x1 - x0) * SC + 2 * M), int((y1 - y0 + 0.8) * SC + 2 * M + 130)


def P(x, y):
    return (M + (x - x0) * SC, M + (y1 - y) * SC)


def rect(d, cx, cy, w, h, fill, outline=(60, 60, 60), width=2):
    a, b = P(cx - w / 2, cy + h / 2), P(cx + w / 2, cy - h / 2)
    d.rectangle([a, b], fill=fill, outline=outline, width=width)


PATH = [  # percorso del protagonista: (scena, punti)
    ("1", [(0.3, 2.3)]),
    ("2-4", [(-2.4, 2.9), (-2.4, 5.4)]),
    ("5-11", [(-2.4, 5.4)]),
    ("12", [(-3.3, 6.5), (-3.3, 7.25)]),
    ("13-16", [(2.0, 5.5), (1.8, 5.05)]),
    ("17-24", [(-3.6, 8.95), (-5.65, 10.28), (-5.65, 11.45)]),
]
CAMS = [("02", (0.95, 4.7), (0.3, 2.3)), ("03", (-1.9, 8.6), (-2.4, 4.0)), ("05", (0.05, 4.2), (-2.4, 5.4)),
        ("06", (-0.6, 4.1), (-2.05, 5.3)), ("07", (-1.5, 7.9), (-2.05, 5.35)), ("08", (-1.3, 6.1), (-2.4, 5.4)), ("09", (-1.3, 3.65), (-1.95, 5.8)),
        ("10", (-1.45, 3.95), (-1.0, 5.6)), ("12", (-2.9, 5.2), (-3.6, 8.5)), ("13", (0.4, 6.9), (3.0, 3.5)), ("14", (3.2, 3.45), (1.5, 4.8)),
        ("15", (1.7, 2.95), (1.6, 4.75)), ("16", (1.95, 3.35), (1.8, 5.05)), ("17", (-4.2, 8.0), (-5.0, 10.2)),
        ("18", (-4.75, 11.15), (-6.2, 12.6)), ("19", (-6.25, 11.85), (-6.4, 12.95)), ("20", (-5.5, 12.35), (-5.65, 11.45)), ("23", (-6.95, 11.55), (-6.0, 11.6))]
# le inquadrature non elencate (dettagli del telefono, primi piani che seguono la testa) hanno la camera calcolata sul personaggio


def main(out):
    im = Image.new("RGB", (W, H), (250, 248, 242))
    d = ImageDraw.Draw(im)
    fb, fr, fs = ImageFont.truetype(FB, 26), ImageFont.truetype(FR, 19), ImageFont.truetype(FB, 17)
    # pavimento e muri
    d.rectangle([P(x0, y1), P(x1, y0)], fill=(236, 232, 222), outline=(40, 40, 40), width=8)
    e = LAYOUT["entrance"]
    d.line([P(e["x0"], y0), P(e["x1"], y0)], fill=(236, 232, 222), width=10)
    d.text(P(0, -0.35), "INGRESSO (porte scorrevoli, vano 2,6 m)", font=fs, fill=(40, 40, 40), anchor="mm")
    o = LAYOUT["office"]
    d.rectangle([P(o["x0"], o["y1"]), P(o["x1"], o["y0"])], fill=(228, 222, 210), outline=(40, 40, 40), width=6)
    d.line([P(o["door_x0"], o["y0"]), P(o["door_x1"], o["y0"])], fill=(228, 222, 210), width=8)
    hx, hy = P(o["door_x0"] + 0.06, o["y0"])
    r = (o["door_x1"] - o["door_x0"] - 0.06) * SC
    d.arc([hx - r, hy - r, hx + r, hy + r], 270, 360, fill=(120, 80, 50), width=3)
    d.line([(hx, hy), (hx, hy - r)], fill=(120, 80, 50), width=4)
    d.text(P((o["x0"] + o["x1"]) / 2, o["y1"] - 0.5), "UFFICIO DEL DIRETTORE", font=fs, fill=(40, 40, 40), anchor="mm")
    rect(d, -6.4, 12.4, 1.5, 0.75, (190, 150, 110))
    d.text(P(-6.4, 12.4), "scrivania", font=fs, fill=(30, 30, 30), anchor="mm")
    # zone
    ca = LAYOUT["cart_area"]
    for i in range(ca["n"]):
        rect(d, ca["x"] + i * 0.62, ca["y"], 0.5, 0.9, (200, 205, 210))
    d.text(P(ca["x"] + 0.9, ca["y"] - 0.75), "carrelli", font=fs, fill=(40, 40, 40), anchor="mm")
    for t in LAYOUT["produce_tables"]:
        rect(d, t["x"], t["y"], 1.4, 1.0, (120, 175, 130))
    d.text(P(-5.6, 3.7), "FRUTTA E VERDURA", font=fs, fill=(30, 90, 50), anchor="mm")
    for dsp in LAYOUT["displays"]:
        rect(d, dsp["x"], dsp["y"], 0.9, 0.7, (230, 190, 90) if dsp["kind"] == "cipolle" else (200, 170, 120), width=4 if dsp["kind"] == "cipolle" else 2)
        d.text(P(dsp["x"], dsp["y"]), dsp["label"], font=fs, fill=(40, 40, 40), anchor="mm")
    for g in LAYOUT["gondolas"]:
        rect(d, g["x"], (g["y0"] + g["y1"]) / 2, 0.92, g["y1"] - g["y0"], (210, 215, 220))
        d.text(P(g["x"], g["y0"] - 0.45), g["name"], font=fs, fill=(30, 30, 30), anchor="mm")
    ws = LAYOUT["wall_shelf"]
    rect(d, (ws["x0"] + ws["x1"]) / 2, ws["y"] - 0.2, ws["x1"] - ws["x0"], 0.45, (210, 215, 220))
    d.text(P(2.3, y1 - 0.15), STORE_NAME, font=fs, fill=(200, 40, 80), anchor="mm")
    for ck in LAYOUT["checkouts"]:
        rect(d, ck["x"], ck["y"], 0.6, 2.0, (160, 170, 175))
        d.text(P(ck["x"], ck["y"] - 1.25), f"cassa {ck['n']}", font=fs, fill=(30, 30, 30), anchor="mm")
    # corsie (quote)
    xs = sorted(g["x"] for g in LAYOUT["gondolas"])
    for a, b in zip(xs, xs[1:]):
        d.text(P((a + b) / 2, 8.5), f"{b - a - 0.92:.2f} m", font=fs, fill=(90, 90, 90), anchor="mm")
    # percorso del protagonista
    prev = None
    for sc, pts in PATH:
        col = (40, 70, 160)
        if len(pts) > 1:
            d.line([P(*p) for p in pts], fill=col, width=5)
        for p in pts:
            cx, cy = P(*p)
            d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=col)
        cx, cy = P(*pts[0])
        d.text((cx + 12, cy - 22), f"sc. {sc}", font=fs, fill=col)
        if prev:
            d.line([P(*prev), P(*pts[0])], fill=(140, 160, 210), width=2)  # stacco (taglio di montaggio)
        prev = pts[-1]
    # camere
    for n, c, tgt in CAMS:
        cx, cy = P(*c)
        tx, ty = P(*tgt)
        ang = math.atan2(ty - cy, tx - cx)
        ex, ey = cx + math.cos(ang) * 44, cy + math.sin(ang) * 44
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(200, 60, 60))           # posizione della camera
        d.line([(cx, cy), (ex, ey)], fill=(200, 60, 60), width=3)                 # direzione di ripresa
        d.polygon([(ex + math.cos(ang) * 10, ey + math.sin(ang) * 10), (ex + math.cos(ang + 2.4) * 10, ey + math.sin(ang + 2.4) * 10),
                   (ex + math.cos(ang - 2.4) * 10, ey + math.sin(ang - 2.4) * 10)], fill=(200, 60, 60))
        d.text((cx - math.cos(ang) * 18, cy - math.sin(ang) * 18), n, font=fs, fill=(200, 60, 60), anchor="mm")
    # legenda e titolo
    d.text((M, 30), "EP01 · Pianta del set (1 quadretto = 1 m)", font=fb, fill=(20, 20, 20))
    yL = H - 120
    d.text((M, yL), "Blu: percorso del protagonista per scena (linee chiare = stacchi di montaggio). Rosso: camere (punto) e direzione di ripresa (freccia) con il numero d'inquadratura.", font=fr, fill=(30, 30, 30))
    d.text((M, yL + 32), "Porta dell'ufficio: vano 0,78 m, anta a battente verso l'interno (arco), apertura massima 88°. Ingresso: vano 2,6 m, ante scorrevoli.", font=fr, fill=(30, 30, 30))
    d.text((M, yL + 64), "Espositori: CIPOLLE (su ruote, spostato nella gag A) e PATATE. Corsie larghe 1,68 m. Soffitto a 3,6 m.", font=fr, fill=(30, 30, 30))
    # griglia
    for gx in range(int(x0), int(x1) + 1):
        d.line([P(gx, y0), P(gx, y0 - 0.12)], fill=(120, 120, 120), width=1)
    im.save(out)


if __name__ == "__main__":
    main(sys.argv[1])
