"""
Elementi 2D animati dell'episodio:
  - cartello finale (3 s): Mina, marchio, «Spesora» e il copy compaiono in movimento
  - effetto illustrato dell'uscita di Mina dal telefono (anello, foglioline, scintille)
    python fx2d.py endcard <mina_png> <out_dir>
    python fx2d.py burst <out_dir> <w> <h>
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

FD = "/usr/share/fonts/opentype/inter/"
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
INK, GREEN, IVORY, PEACH = (36, 51, 44), (56, 110, 85), (246, 243, 234), (230, 164, 109)
W, H, FPS = 1080, 1920, 30


def out_back(x, k=1.9):
    x = max(0.0, min(1.0, x))
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def out_cubic(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def logo_mark(layer, cx, cy, s):
    d = ImageDraw.Draw(layer)
    u = s / 64
    x0, y0 = cx - 32 * u, cy - 32 * u
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 60 * u], radius=14 * u, fill=GREEN + (255,))
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 22 * u], radius=7 * u, fill=(43, 86, 67, 255))
    for xx in (16, 43):
        d.rounded_rectangle([x0 + xx * u, y0 + 3 * u, x0 + (xx + 5) * u, y0 + 15 * u], radius=2.5 * u, fill=PEACH + (255,))
    d.ellipse([x0 + 18 * u, y0 + 26 * u, x0 + 46 * u, y0 + 54 * u], fill=IVORY + (255,))
    d.ellipse([x0 + 23 * u, y0 + 31 * u, x0 + 41 * u, y0 + 49 * u], outline=PEACH + (255,), width=max(2, int(2.5 * u)))
    d.line([(x0 + 29 * u, y0 + 40 * u), (x0 + 31.5 * u, y0 + 42.5 * u), (x0 + 36.5 * u, y0 + 37 * u)], fill=GREEN + (255,), width=max(3, int(2.8 * u)), joint="curve")


def scaled(layer, s, cx, cy, rot=0.0):
    w, h = layer.size
    im = layer.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
    return out


def endcard(mina_png, outdir, secs=3.0):
    os.makedirs(outdir, exist_ok=True)
    mina = Image.open(mina_png).convert("RGBA").resize((600, 600), Image.LANCZOS)
    mark = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    logo_mark(mark, 100, 100, 170)
    word = Image.new("RGBA", (700, 220), (0, 0, 0, 0))
    ImageDraw.Draw(word).text((0, 20), "Spesora", font=B(150), fill=GREEN + (255,))
    l1 = Image.new("RGBA", (900, 120), (0, 0, 0, 0))
    ImageDraw.Draw(l1).text((450, 60), "Meno domande.", font=B(84), fill=INK + (255,), anchor="mm")
    l2 = Image.new("RGBA", (900, 120), (0, 0, 0, 0))
    ImageDraw.Draw(l2).text((450, 60), "Più idee per cena.", font=B(84), fill=INK + (255,), anchor="mm")
    n = int(secs * FPS)
    for i in range(n):
        t = i / FPS
        f = Image.new("RGBA", (W, H), IVORY + (255,))
        # Mina: salta dentro con rimbalzo e poi dondola
        s = out_back((t - 0.05) / 0.55) if t > 0.05 else 0.0
        bob = 12 * math.sin(2 * math.pi * 1.1 * max(0, t - 0.6)) * min(1, max(0, (t - 0.6) / 0.3))
        rot = 3.0 * math.sin(2 * math.pi * 0.8 * max(0, t - 0.6))
        if s > 0:
            f.alpha_composite(scaled(mina, s, W / 2, 520 + bob - (1 - min(1, s)) * 120, rot))
        # marchio: pop
        sm = out_back((t - 0.5) / 0.4, 2.4) if t > 0.5 else 0.0
        if sm > 0:
            f.alpha_composite(scaled(mark, sm * 1.0, 215, 1010))
        # scritta: scorre e appare
        a = out_cubic((t - 0.75) / 0.4)
        if a > 0:
            wl = word.copy()
            wl.putalpha(wl.getchannel("A").point(lambda v: int(v * a)))
            f.alpha_composite(wl, (325 + int((1 - a) * 70) + 100 - 100, 905))
        for ly, lay, t0 in ((1230, l1, 1.25), (1335, l2, 1.7)):
            a = out_cubic((t - t0) / 0.4)
            if a > 0:
                lc = lay.copy()
                lc.putalpha(lc.getchannel("A").point(lambda v: int(v * a)))
                f.alpha_composite(lc, (90, ly - 60 + int((1 - a) * 34)))
        f.convert("RGB").save(os.path.join(outdir, f"card_{i + 1:04d}.png"))
    return n


def burst(outdir, w, h, secs=0.8):
    """Effetto illustrato (piatto, stile gouache) con sfondo trasparente: anello, foglioline e scintille che si aprono dal centro."""
    os.makedirs(outdir, exist_ok=True)
    rnd = random.Random(4)
    leaves = [(rnd.uniform(0, 2 * math.pi), rnd.uniform(0.7, 1.3), rnd.choice([(150, 168, 140), (118, 140, 112), (230, 164, 109)])) for _ in range(12)]
    n = int(secs * FPS)
    ss = 2
    for i in range(n):
        t = i / (n - 1)
        im = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        cx, cy = w * ss / 2, h * ss / 2
        e = out_cubic(t)
        alpha = int(255 * (1 - t) ** 1.3)
        R = (30 + 240 * e) * ss * (w / 540)
        for rr, col in ((R, (150, 168, 140)), (R * 0.72, (230, 164, 109))):
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=col + (alpha,), width=max(2, int(10 * ss * (1 - t) * (w / 540))))
        for ang, sz, col in leaves:
            r = R * (0.55 + 0.7 * sz * 0.5) * 1.0
            x, y = cx + r * math.cos(ang), cy + r * math.sin(ang)
            L, Wd = 26 * ss * sz * (w / 540), 11 * ss * sz * (w / 540)
            pts = []
            for k in range(20):
                a = 2 * math.pi * k / 20
                px, py = L * math.cos(a), Wd * math.sin(a)
                c, s = math.cos(ang), math.sin(ang)
                pts.append((x + px * c - py * s, y + px * s + py * c))
            d.polygon(pts, fill=col + (alpha,))
        for k in range(8):
            ang = k * math.pi / 4 + 0.3
            r = R * 1.18
            x, y = cx + r * math.cos(ang), cy + r * math.sin(ang)
            q = 9 * ss * (1 - t) * (w / 540) + 2
            d.polygon([(x, y - q * 2), (x + q * 0.6, y - q * 0.6), (x + q * 2, y), (x + q * 0.6, y + q * 0.6), (x, y + q * 2), (x - q * 0.6, y + q * 0.6), (x - q * 2, y), (x - q * 0.6, y - q * 0.6)], fill=(255, 241, 196, alpha))
        im.resize((w, h), Image.LANCZOS).save(os.path.join(outdir, f"fx_{i + 1:03d}.png"))
    return n


if __name__ == "__main__":
    if sys.argv[1] == "endcard":
        print(endcard(sys.argv[2], sys.argv[3]), "fotogrammi")
    elif sys.argv[1] == "burst":
        print(burst(sys.argv[2], int(sys.argv[3]), int(sys.argv[4])), "fotogrammi")
