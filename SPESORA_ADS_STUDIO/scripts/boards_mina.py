"""Tavola dei concept di Mina in 3D. Uso: python boards_mina.py <render> <scheda-ufficiale.png> <output.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, REF, OUT = sys.argv[1:4]
FD = "/usr/share/fonts/opentype/inter/"
INK, GREEN, BG, PAPER, SOFT = (36, 51, 44), (56, 110, 85), (246, 243, 234), (251, 246, 234), (86, 100, 93)
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
R = lambda s: ImageFont.truetype(FD + "Inter-Regular.otf", s)
EXPR = [("neutra", "Neutra"), ("felice", "Felice"), ("sorpresa", "Sorpresa"), ("ironica", "Ironica"), ("soddisfatta", "Soddisfatta"),
        ("pensierosa", "Pensierosa"), ("delusa", "Delusa (scuote la testa)"), ("assonnata", "Assonnata"), ("guarda_camera", "Guarda lo spettatore"),
        ("guarda_destra", "Guarda a destra"), ("guarda_sinistra", "Guarda a sinistra")]
POSES = [("pose_saluta", "Saluta"), ("pose_indica", "Indica"), ("pose_apre", "Apre la copertina"), ("pose_telefono", "Sbuca dal telefono")]


def load(n, w):
    im = Image.open(f"{SRC}/M_{n}.png").convert("RGB")
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)


def pill(d, x, y, t):
    w = d.textlength(t, font=B(22)) + 30
    d.rounded_rectangle([x, y, x + w, y + 40], radius=16, fill=PAPER, outline=INK, width=2)
    d.text((x + 15, y + 6), t, font=B(22), fill=INK)


W = 1800
im = Image.new("RGB", (W, 7000), BG)
d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 130], fill=GREEN)
d.text((48, 26), "Mina · concept 3D fedele al design approvato", font=B(54), fill=BG)
d.text((48, 94), "Faccia e illustrazioni della copertina in 2D su un libro 3D · dorso, pagine, elastico, linguette, segnalibro, braccia a muffola", font=R(24), fill=(214, 228, 218))
y = 160
d.text((48, y), "Design ufficiale (scheda di riferimento) e modello 3D: fronte · 3/4 · lato", font=B(30), fill=GREEN)
y += 46
ref = Image.open(REF).convert("RGB").crop((30, 80, 1170, 560))
ref = ref.resize((W, int(ref.height * W / ref.width)), Image.LANCZOS)
im.paste(ref, (0, y))
pill(d, 16, y + 14, "Design ufficiale")
y += ref.height + 14
for i, v in enumerate(("fronte", "tre_quarti", "lato")):
    t = load(f"turn_{v}", 600)
    im.paste(t, (i * 600, y))
pill(d, 16, y + 14, "Modello 3D")
y += load("turn_fronte", 600).height + 30
d.text((48, y), "Espressioni 2D sulla copertina (nessun naso, ciglia esterne, guance pesca)", font=B(30), fill=GREEN)
y += 46
for i, (k, lab) in enumerate(EXPR):
    x, yy = (i % 5) * 360, y + (i // 5) * 360
    im.paste(load(f"expr_{k}", 360), (x, yy))
    pill(d, x + 10, yy + 10, lab)
y += 3 * 360 + 30
d.text((48, y), "Pose di prova (movimento cartoon, copertina apribile grazie alla cerniera sul dorso)", font=B(30), fill=GREEN)
y += 46
hmax = 0
for i, (k, lab) in enumerate(POSES):
    t = load(k, 450)
    im.paste(t, (i * 450, y))
    pill(d, i * 450 + 10, y + 10, lab)
    hmax = max(hmax, t.height)
y += hmax + 30
d.text((48, y), "Mina accanto al protagonista: scala relativa e stile coerente", font=B(30), fill=GREEN)
y += 46
t = load("scena_con_protagonista", W)
im.paste(t, (0, y))
y += t.height
im = im.crop((0, 0, W, y))
im.save(OUT)
print(OUT, im.size)
