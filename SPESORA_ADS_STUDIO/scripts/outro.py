"""
Outro di Spesora (struttura minimale: stacco netto, fondo scuro, logo, slogan, un solo segno grafico, pausa finale).
Originale: marchio Spesora (calendario con piatto e spunta) e un rametto botanico che si disegna sotto lo slogan.

    python outro.py <out_dir> [secondi=3.2]
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SS = 1080, 1920, 30, 2
FD = "/usr/share/fonts/opentype/inter/"
BG = (15, 29, 23)            # verde antracite quasi nero
IVORY = (246, 243, 234)
GREEN, GREEN_D, PEACH = (56, 110, 85), (43, 86, 67), (230, 164, 109)
SAGE = (150, 178, 150)
SLOGAN = "Cosa cucini? Già deciso."


def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def logo_mark(d, cx, cy, s):
    u = s / 64
    x0, y0 = cx - 32 * u, cy - 32 * u
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 60 * u], radius=14 * u, fill=GREEN)
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 22 * u], radius=7 * u, fill=GREEN_D)
    for xx in (16, 43):
        d.rounded_rectangle([x0 + xx * u, y0 + 3 * u, x0 + (xx + 5) * u, y0 + 15 * u], radius=2.5 * u, fill=PEACH)
    d.ellipse([x0 + 18 * u, y0 + 26 * u, x0 + 46 * u, y0 + 54 * u], fill=IVORY)
    d.ellipse([x0 + 23 * u, y0 + 31 * u, x0 + 41 * u, y0 + 49 * u], outline=PEACH, width=max(2, int(2.5 * u)))
    d.line([(x0 + 29 * u, y0 + 40 * u), (x0 + 31.5 * u, y0 + 42.5 * u), (x0 + 36.5 * u, y0 + 37 * u)], fill=GREEN, width=max(3, int(2.8 * u)), joint="curve")


def logo_layer():
    """Marchio + "Spesora" in avorio, centrati. Ritorna immagine RGBA (supersampled)."""
    f = ImageFont.truetype(FD + "Inter-Bold.otf", 150 * SS)
    tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    tw = tmp.textlength("Spesora", font=f)
    ms = 168 * SS
    gap = 26 * SS
    w = int(ms + gap + tw + 40 * SS)
    h = int(220 * SS)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    logo_mark(d, 20 * SS + ms / 2, h / 2, ms)
    d.text((20 * SS + ms + gap, h / 2 + 6 * SS), "Spesora", font=f, fill=IVORY, anchor="lm")
    return im


def slogan_layer():
    f = ImageFont.truetype(FD + "Inter-SemiBold.otf", 66 * SS)
    tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    tw = int(tmp.textlength(SLOGAN, font=f)) + 20 * SS
    im = Image.new("RGBA", (tw, 110 * SS), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((tw / 2, 55 * SS), SLOGAN, font=f, fill=IVORY + (235,), anchor="mm")
    return im


def sprig(d, cx, y, prog, alpha):
    """Rametto orizzontale che si disegna da sinistra a destra (prog 0..1); foglie che spuntano lungo il gambo."""
    L = 380 * SS
    x0 = cx - L / 2
    n = 120
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((x0 + L * t, y + 10 * SS * math.sin(math.pi * t * 1.2)))
    k = int(n * ease_io(prog))
    if k >= 1:
        d.line(pts[: k + 1], fill=SAGE + (alpha,), width=5 * SS, joint="curve")
    for j, tl in enumerate((0.18, 0.34, 0.5, 0.66, 0.82)):
        g = ease_out((prog - tl) / 0.18)
        if g <= 0:
            continue
        px, py = pts[int(n * tl)]
        ang = math.radians(-125 if j % 2 == 0 else -55)  # foglie alternate, verso l'alto
        Lf, Wf = 50 * SS * g, 19 * SS * g
        cx_, cy_ = px + math.cos(ang) * Lf / 2, py + math.sin(ang) * Lf / 2
        pl = []
        for q in range(32):
            th = 2 * math.pi * q / 32
            lx, ly = Lf / 2 * math.cos(th), Wf / 2 * math.sin(th) * (1 - 0.35 * math.cos(th))
            pl.append((cx_ + lx * math.cos(ang) - ly * math.sin(ang), cy_ + lx * math.sin(ang) + ly * math.cos(ang)))
        d.polygon(pl, fill=SAGE + (alpha,))
    if prog >= 0.98:
        ex, ey = pts[-1]
        d.ellipse([ex - 7 * SS, ey - 7 * SS, ex + 7 * SS, ey + 7 * SS], fill=PEACH + (alpha,))


def render(outdir, secs=3.2):
    os.makedirs(outdir, exist_ok=True)
    logo = logo_layer()
    slog = slogan_layer()
    n = int(round(secs * FPS))
    for i in range(n):
        t = i / FPS
        im = Image.new("RGBA", (W * SS, H * SS), BG + (255,))
        # vignettatura leggerissima per profondità
        a = ease_out((t - 0.12) / 0.45)
        if a > 0:
            s = 0.94 + 0.06 * a
            lg = logo.resize((int(logo.width * s), int(logo.height * s)), Image.LANCZOS)
            lg.putalpha(lg.getchannel("A").point(lambda v: int(v * a)))
            im.alpha_composite(lg, (int(W * SS / 2 - lg.width / 2), int(H * SS * 0.44 - lg.height / 2)))
        b = ease_out((t - 0.7) / 0.4)
        if b > 0:
            sl = slog.copy()
            sl.putalpha(sl.getchannel("A").point(lambda v: int(v * b)))
            im.alpha_composite(sl, (int(W * SS / 2 - sl.width / 2), int(H * SS * 0.535 - sl.height / 2 + (1 - b) * 18 * SS)))
        prog = (t - 1.1) / 0.9
        if prog > 0:
            d = ImageDraw.Draw(im)
            sprig(d, W * SS / 2, H * SS * 0.595, min(1.0, prog), 255)
        im.convert("RGB").resize((W, H), Image.LANCZOS).save(os.path.join(outdir, f"outro_{i + 1:04d}.png"))
    return n


if __name__ == "__main__":
    print(render(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 3.2), "fotogrammi")
