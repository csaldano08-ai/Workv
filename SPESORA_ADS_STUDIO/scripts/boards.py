"""Compone le tavole di presentazione dei concept (PIL). Uso: python boards.py <cartella-render> <cartella-output>"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FD = "/usr/share/fonts/opentype/inter/"
HAND = "/home/user/Workv/spesora/assets/fonts/Caveat-Bold.ttf"
INK, GREEN, BG, PAPER, SOFT = (36, 51, 44), (56, 110, 85), (246, 243, 234), (251, 246, 234), (86, 100, 93)


def font(name, size):
    return ImageFont.truetype(name, size)


def f_bold(s):
    return font(FD + "Inter-Bold.otf", s)


def f_reg(s):
    return font(FD + "Inter-Regular.otf", s)


def f_hand(s):
    return font(HAND, s)


VAR = {
    "A": ("A · Goccia", "Testa allungata a goccia con piccolo ciuffo di pongo, busto piccolo, arti molto lunghi. È la direzione più vicina alla scheda di riferimento."),
    "B": ("B · Testone", "Testa grande e tonda, leggermente irregolare, corpo piccolo da stickman spesso, gambe corte. Molto leggibile anche in piccolo, vicino ai video di riferimento."),
    "C": ("C · Pillola", "Testa a capsula verticale, corpo a pera, braccia più spesse con grandi estremità a paletta. Il più morbido e il più buffo nei movimenti."),
}
EXPR = [("neutro", "Neutro"), ("felice", "Felice"), ("sorpreso", "Sorpreso"), ("confuso", "Confuso"), ("stanco", "Stanco"), ("frustrato", "Frustrato"), ("imbarazzato", "Imbarazzato"), ("ironico", "Ironico")]
PH = [("1_guarda", "1 · Guarda il telefono (annoiato)"), ("2_sorpresa", "2 · Notifica: si sorprende"), ("3_mostra", "3 · Gira lo schermo verso di noi")]


def load(v, name, w=None):
    im = Image.open(os.path.join(SRC, f"{v}_{name}.png")).convert("RGB")
    if w:
        im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    return im


def label(d, xy, text, size=34, fill=INK, bold=True):
    d.text(xy, text, font=(f_bold(size) if bold else f_reg(size)), fill=fill)


def variant_board(v):
    name, desc = VAR[v]
    W = 1800
    H = 4000
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 130], fill=GREEN)
    d.text((48, 28), "Protagonista · " + name, font=f_bold(56), fill=BG)
    d.text((48, 96), "Concept per approvazione, render 3D Blender (Cycles) con faccia 2D animabile", font=f_reg(24), fill=(214, 228, 218))
    y = 150
    line = ""
    for wd in desc.split():
        if d.textlength(line + " " + wd, font=f_reg(26)) > W - 96:
            d.text((48, y), line.strip(), font=f_reg(26), fill=SOFT)
            y += 34
            line = wd
        else:
            line += " " + wd
    d.text((48, y), line.strip(), font=f_reg(26), fill=SOFT)
    y += 60
    label(d, (48, y - 4), "Fronte · 3/4 · Lato", 30, GREEN)
    y += 40
    for i, view in enumerate(("fronte", "tre_quarti", "lato")):
        t = load(v, f"turn_{view}", 600)
        im.paste(t, (i * 600, y))
    y += 900 + 20
    label(d, (48, y), "Espressioni della faccia 2D (13 stati disponibili, qui 8)", 30, GREEN)
    y += 46
    for i, (k, lab) in enumerate(EXPR):
        t = load(v, f"expr_{k}", 450)
        x, yy = (i % 4) * 450, y + (i // 4) * 450
        im.paste(t, (x, yy))
        d.rounded_rectangle([x + 18, yy + 16, x + 18 + 14 * len(lab) + 30, yy + 58], radius=18, fill=PAPER, outline=INK, width=2)
        d.text((x + 33, yy + 22), lab, font=f_bold(24), fill=INK)
    y += 900 + 30
    label(d, (48, y), "Mini prova: telefono e reazione facciale (braccia senza mani, presa con paletta morbida)", 30, GREEN)
    y += 46
    for i, (k, lab) in enumerate(PH):
        t = load(v, f"phone_{k}", 600)
        im.paste(t, (i * 600, y))
        d.rounded_rectangle([i * 600 + 18, y + 16, i * 600 + 18 + 13 * len(lab) + 30, y + 58], radius=18, fill=PAPER, outline=INK, width=2)
        d.text((i * 600 + 33, y + 22), lab, font=f_bold(24), fill=INK)
    im = im.crop((0, 0, W, y + 900 + 20))
    path = os.path.join(OUT, f"concept_{v}_{VAR[v][0].split(' · ')[1].lower()}.png")
    im.save(path)
    return path


def overview():
    W = 1800
    H = 1270
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 130], fill=GREEN)
    d.text((48, 28), "Protagonista Spesora · tre varianti a confronto", font=f_bold(54), fill=BG)
    d.text((48, 96), "Da scegliere (o da mescolare) prima di costruire rig, cucina e animazione", font=f_reg(24), fill=(214, 228, 218))
    for i, v in enumerate("ABC"):
        t = load(v, "turn_fronte", 600)
        x = i * 600
        im.paste(t, (x, 150))
        name, desc = VAR[v]
        d.rounded_rectangle([x + 150, 1030, x + 450, 1088], radius=26, fill=PAPER, outline=INK, width=3)
        d.text((x + 300, 1059), name, font=f_bold(30), fill=INK, anchor="mm")
        # descrizione a capo
        words, line, yy = desc.split(), "", 1110
        for wd in words:
            if d.textlength(line + " " + wd, font=f_reg(23)) > 540:
                d.text((x + 30, yy), line.strip(), font=f_reg(23), fill=SOFT)
                yy += 32
                line = wd
            else:
                line += " " + wd
        d.text((x + 30, yy), line.strip(), font=f_reg(23), fill=SOFT)
    path = os.path.join(OUT, "00_confronto_varianti.png")
    im.save(path)
    return path


if __name__ == "__main__":
    print(overview())
    for v in "ABC":
        print(variant_board(v))
