"""Tavola del protagonista ricalcato dal riferimento. Uso: python boards_hero.py <render> <riferimento.webp> <output.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, REF, OUT = sys.argv[1:4]
FD = "/usr/share/fonts/opentype/inter/"
INK, GREEN, BG, PAPER, SOFT = (36, 51, 44), (56, 110, 85), (246, 243, 234), (251, 246, 234), (86, 100, 93)
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
R = lambda s: ImageFont.truetype(FD + "Inter-Regular.otf", s)
NAMES = [("neutro", "Neutro"), ("felice", "Felice"), ("sorpreso", "Sorpreso"), ("confuso", "Confuso"), ("stanco", "Stanco"), ("frustrato", "Frustrato"),
         ("imbarazzato", "Imbarazzato"), ("ironico", "Ironico"), ("sguardo_laterale", "Sguardo laterale"), ("guarda_in_camera", "Guarda in camera"),
         ("occhi_chiusi", "Occhi chiusi"), ("occhi_semichiusi", "Occhi semichiusi"), ("sbadiglio", "Sbadiglio")]
PH = [("1_guarda", "1 · Guarda il telefono (annoiato)"), ("2_sorpresa", "2 · Notifica: si sorprende"), ("3_mostra", "3 · Gira lo schermo verso di noi")]


def load(n, w):
    im = Image.open(f"{SRC}/H_{n}.png").convert("RGB")
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)


def pill(d, x, y, t):
    w = d.textlength(t, font=B(24)) + 34
    d.rounded_rectangle([x, y, x + w, y + 44], radius=18, fill=PAPER, outline=INK, width=2)
    d.text((x + 17, y + 7), t, font=B(24), fill=INK)


W = 1800
im = Image.new("RGB", (W, 6000), BG)
d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 130], fill=GREEN)
d.text((48, 26), "Protagonista · ricalcato dal tuo riferimento", font=B(54), fill=BG)
d.text((48, 94), "Stesse forme del riferimento · maglietta nera · occhi come il riferimento · sopracciglia nere · espressioni 2D", font=R(24), fill=(214, 228, 218))
y = 160
d.text((48, y), "Confronto: riferimento (a sinistra) e modello 3D in Blender (a destra)", font=B(30), fill=GREEN)
y += 50
ref = Image.open(REF).convert("RGB").crop((40, 50, 420, 680))
ref = ref.resize((int(ref.width * 900 / ref.height), 900), Image.LANCZOS)
panel = Image.new("RGB", (900, 900), (236, 232, 233))
panel.paste(ref, ((900 - ref.width) // 2, 0))
im.paste(panel, (0, y))
im.paste(load("turn_fronte", 600).resize((600, 900)), (900, y))
pill(d, 20, y + 14, "Riferimento")
pill(d, 920, y + 14, "Modello 3D")
y += 900 + 30
d.text((48, y), "Primo piano: occhi e sopracciglia (riferimento a sinistra, modello a destra)", font=B(30), fill=GREEN)
y += 46
rf = Image.open(REF).convert("RGB").crop((120, 70, 350, 260)).resize((900, 743), Image.LANCZOS)
mn = Image.open(f"{SRC}/H_expr_neutro.png").convert("RGB").crop((90, 0, 390, 247)).resize((900, 741), Image.LANCZOS)
im.paste(rf, (0, y))
im.paste(mn, (900, y))
pill(d, 14, y + 12, "Riferimento")
pill(d, 914, y + 12, "Modello 3D")
y += 743 + 30
d.text((48, y), "Fronte · 3/4 · Lato", font=B(30), fill=GREEN)
y += 46
for i, v in enumerate(("fronte", "tre_quarti", "lato")):
    im.paste(load(f"turn_{v}", 600), (i * 600, y))
y += 900 + 30
d.text((48, y), "Espressioni 2D sulla faccia (13 stati). Il naso rosso è 3D, sopracciglia e occhi sono rialzati come pongo", font=B(30), fill=GREEN)
y += 46
for i, (k, lab) in enumerate(NAMES):
    x, yy = (i % 5) * 360, y + (i // 5) * 360
    im.paste(load(f"expr_{k}", 360), (x, yy))
    pill(d, x + 12, yy + 12, lab)
y += 3 * 360 + 30
d.text((48, y), "Mini prova: telefono e reazione facciale (braccia grosse, estremità tonde, senza dita)", font=B(30), fill=GREEN)
y += 46
for i, (k, lab) in enumerate(PH):
    im.paste(load(f"phone_{k}", 600), (i * 600, y))
    pill(d, i * 600 + 14, y + 12, lab)
im = im.crop((0, 0, W, y + 900 + 10))
im.save(OUT)
print(OUT, im.size)
