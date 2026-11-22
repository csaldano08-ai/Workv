"""
Animatic di EP01 — "Il frigorifero delle 21:00" (circa 35 s, 1080x1920, 30 fps).

Monta i fotogrammi chiave renderizzati in Blender (render semplificato) con tempi, movimenti di camera, sottotitoli PROVVISORI,
indicazioni di effetti sonori/musica e le schermate REALI dell'app. Nessuna voce e nessun suono: solo video muto di lavoro.

    python animatic_ep01.py <cartella-render-ep01> <cartella-props-ui> <cartella-mina-2d> <output.mp4>
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

RENDERS, UI, MINA2D, OUT = [os.path.abspath(a) for a in sys.argv[1:5]]
W, H, FPS = 1080, 1920, 30
FD = "/usr/share/fonts/opentype/inter/"
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
R = lambda s: ImageFont.truetype(FD + "Inter-Regular.otf", s)
INK, GREEN, IVORY, PEACH = (36, 51, 44), (56, 110, 85), (246, 243, 234), (230, 164, 109)
tmp = tempfile.mkdtemp(prefix="animatic_")


def p(name):
    return os.path.join(tmp, name)


# ---------------------------------------------------------------- schermate fisse (UI e cartello finale)
def phone_screen_still(ui_file, bg_render, label_png=None):
    """Schermo reale dell'app dentro una cornice da telefono, su sfondo di cucina sfocato."""
    bg = Image.open(os.path.join(RENDERS, f"EP01_{bg_render}.png")).convert("RGB").resize((W, H), Image.LANCZOS)
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(22))).enhance(0.45)
    shot = Image.open(os.path.join(UI, ui_file)).convert("RGB")
    sw = 700
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    fx, fy = (W - sw) // 2, 190
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([fx - 24, fy - 24, fx + sw + 24, fy + sh + 24], radius=74, fill=(118, 102, 204, 255))
    d.rounded_rectangle([fx - 10, fy - 10, fx + sw + 10, fy + sh + 10], radius=62, fill=(20, 20, 24, 255))
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw, sh], radius=52, fill=255)
    out = bg.convert("RGBA")
    out.alpha_composite(frame)
    out.paste(shot, (fx, fy), mask)
    if label_png:
        m = Image.open(os.path.join(MINA2D, label_png)).convert("RGBA")
        m = m.resize((460, 460), Image.LANCZOS)
        out.alpha_composite(m, (W - 460 - 20, H - 460 - 120))
    return out.convert("RGB")


def logo_mark(d, cx, cy, s):
    """Marchio Spesora (calendario con piatto e spunta), disegnato a vettori."""
    u = s / 64
    x0, y0 = cx - 32 * u, cy - 32 * u
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 60 * u], radius=14 * u, fill=GREEN)
    d.rounded_rectangle([x0 + 4 * u, y0 + 8 * u, x0 + 60 * u, y0 + 22 * u], radius=7 * u, fill=(43, 86, 67))
    for xx in (16, 43):
        d.rounded_rectangle([x0 + xx * u, y0 + 3 * u, x0 + (xx + 5) * u, y0 + 15 * u], radius=2.5 * u, fill=PEACH)
    d.ellipse([x0 + 18 * u, y0 + 26 * u, x0 + 46 * u, y0 + 54 * u], fill=IVORY)
    d.ellipse([x0 + 23 * u, y0 + 31 * u, x0 + 41 * u, y0 + 49 * u], outline=PEACH, width=max(2, int(2.5 * u)))
    d.line([(x0 + 29 * u, y0 + 40 * u), (x0 + 31.5 * u, y0 + 42.5 * u), (x0 + 36.5 * u, y0 + 37 * u)], fill=GREEN, width=max(3, int(2.8 * u)), joint="curve")


def end_card():
    im = Image.new("RGB", (W, H), IVORY)
    d = ImageDraw.Draw(im)
    m = Image.open(os.path.join(MINA2D, "mina_welcome.png")).convert("RGBA").resize((560, 560), Image.LANCZOS)
    im.paste(m, ((W - 560) // 2, 250), m)
    logo_mark(d, 215, 1010, 170)
    d.text((325, 925), "Spesora", font=B(150), fill=GREEN)
    d.text((W // 2, 1230), "Meno domande.", font=B(84), fill=INK, anchor="mm")
    d.text((W // 2, 1330), "Più idee per cena.", font=B(84), fill=INK, anchor="mm")
    return im


phone_screen_still("ui_settimana.png", "S4a_mina_indica", "mina_calendar.png").save(p("ui_cal.png"))
phone_screen_still("ui_ricetta_ingredienti.png", "S4a_mina_indica", "mina_recipe.png").save(p("ui_ric.png"))
phone_screen_still("ui_spesa.png", "S4a_mina_indica", "mina_shopping.png").save(p("ui_spesa.png"))
end_card().save(p("endcard.png"))


# ---------------------------------------------------------------- piano delle inquadrature
def R_(n):
    return os.path.join(RENDERS, f"EP01_{n}.png")


# (id, titolo, t0, t1, immagine, zoom_fine, fx, fy)  — fx, fy = punto verso cui spinge lo zoom (0..1)
SHOTS = [
    ("S1a", "Il problema · frigo", 0.0, 2.6, R_("S1a_frigo_largo"), 1.10, 0.55, 0.55),
    ("S1b", "Il problema · viso", 2.6, 5.0, R_("S1b_viso_frigo"), 1.07, 0.5, 0.45),
    ("S2a1", "Quarta parete · si gira", 5.0, 6.4, R_("S2a1_si_gira"), 1.05, 0.55, 0.5),
    ("S2a2", "Quarta parete · guarda noi", 6.4, 8.0, R_("S2a2_guarda_camera"), 1.10, 0.55, 0.45),
    ("S2b1", "Pausa comica · sguardo", 8.0, 9.6, R_("S2b1_pausa_sguardo"), 1.04, 0.5, 0.5),
    ("S2b2", "Pausa comica · resa", 9.6, 11.0, R_("S2b2_pausa_stanco"), 1.06, 0.5, 0.5),
    ("S3a", "Arriva Mina · notifica", 11.0, 12.6, R_("S3a_telefono_notifica"), 1.14, 0.5, 0.55),
    ("S3b", "Arriva Mina · sbuca", 12.6, 15.2, R_("S3b1_mina_sbuca"), 1.12, 0.5, 0.35),
    ("S3c", "Arriva Mina · spavento", 15.2, 17.0, R_("S3c_spavento"), 1.08, 0.6, 0.5),
    ("S4a", "Spesora · Mina indica", 17.0, 19.0, R_("S4a_mina_indica"), 1.12, 0.35, 0.4),
    ("S4b", "Spesora · 1 Calendario", 19.0, 21.7, p("ui_cal.png"), 1.28, 0.5, 0.2),
    ("S4c", "Spesora · 2 Ricetta", 21.7, 24.4, p("ui_ric.png"), 1.28, 0.5, 0.55),
    ("S4d", "Spesora · 3 Lista della spesa", 24.4, 27.0, p("ui_spesa.png"), 1.28, 0.5, 0.35),
    ("S5a", "La soluzione", 27.0, 30.6, R_("S5a_soluzione"), 1.07, 0.5, 0.5),
    ("S5b", "La soluzione · sguardo al pubblico", 30.6, 32.0, R_("S5b_sguardo_pubblico"), 1.06, 0.5, 0.5),
    ("S6", "Chiusura · logo", 32.0, 35.0, p("endcard.png"), 1.05, 0.5, 0.5),
]
SUBS = [  # (speaker, testo, t0, t1)
    ("PROTAGONISTA", "Sono le otto e non so ancora cosa cucinare.", 0.5, 4.6),
    ("PROTAGONISTA", "Non ditemi che succede solo a me.", 5.5, 8.0),
    ("MINA", "Se ti organizzassi prima, non saremmo qui ogni sera.", 12.9, 16.4),
    ("PROTAGONISTA", "Quindi domani so già cosa cucinare?", 27.1, 29.2),
    ("MINA", "Anche dopodomani.", 29.4, 30.6),
]
CUES = [  # (testo, t0, t1)
    ("SFX · frigo che si apre, ronzio leggero", 0.0, 2.2),
    ("SFX · sportello che si richiude a metà", 5.0, 6.6),
    ("SFX · notifica morbida del telefono", 11.0, 12.5),
    ("SFX · ingresso di Mina (pop + pagine)", 12.6, 14.2),
    ("SFX · sobbalzo, fruscio vestiti", 15.2, 16.4),
    ("SFX · zoom nello schermo (swish leggero)", 17.0, 18.6),
    ("SFX · UI: tocco e transizione leggera", 19.0, 20.6),
    ("SFX · UI: comparsa ricetta", 21.7, 23.0),
    ("SFX · UI: spunta lista", 24.4, 25.8),
    ("SFX · sospiro rilassato", 27.0, 28.2),
    ("SFX · piccolo suono soddisfatto di Mina", 29.6, 30.8),
    ("SFX · chiusura logo", 32.0, 33.6),
]
MUSIC = [("MUSICA · leggero, un po' frustrato", 0.0, 11.0), ("MUSICA · cambia con Mina", 11.0, 17.0), ("MUSICA · positiva, accompagna l'app", 17.0, 32.0), ("MUSICA · sigla breve", 32.0, 35.0)]


# ---------------------------------------------------------------- clip da fermo immagine con zoom
def clip(i, shot):
    sid, _, t0, t1, img, z1, fx, fy = shot
    dur = t1 - t0
    n = int(round(dur * FPS))
    src = Image.open(img).convert("RGB")
    if src.size != (2160, 3840):
        src = src.resize((2160, 3840), Image.LANCZOS)
    big = p(f"big_{i}.png")
    src.save(big)
    out = p(f"clip_{i}.mp4")
    zexpr = f"1+({z1}-1)*on/{n}"
    vf = f"zoompan=z='{zexpr}':x='(iw-iw/zoom)*{fx}':y='(ih-ih/zoom)*{fy}':d={n}:s={W}x{H}:fps={FPS},format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", big, "-vf", vf, "-frames:v", str(n), "-c:v", "libx264", "-crf", "14", "-preset", "medium", out], check=True)
    return out


clips = [clip(i, s) for i, s in enumerate(SHOTS)]
lst = p("list.txt")
with open(lst, "w") as f:
    for c in clips:
        f.write(f"file '{c}'\n")
base = p("base.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", base], check=True)


# ---------------------------------------------------------------- sovrimpressioni
def chip(text, font, fill, color, pad=(22, 12), radius=22):
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(d.textlength(text, font=font)) + pad[0] * 2
    h = font.size + pad[1] * 2 + 6
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    dd.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=fill)
    dd.text((pad[0], pad[1] - 2), text, font=font, fill=color)
    return im


def overlay_hud():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 118], fill=(18, 26, 22, 215))
    d.text((34, 30), "SPESORA · EP01 · ANIMATIC", font=B(36), fill=(246, 243, 234, 255))
    d.text((W - 34, 40), "voci e suoni provvisori", font=R(30), fill=(200, 216, 206, 255), anchor="ra")
    d.rectangle([0, H - 112, W, H], fill=(18, 26, 22, 215))
    d.text((W - 34, H - 82), "non finale: rendering semplificato", font=R(28), fill=(200, 216, 206, 255), anchor="ra")
    return im


def overlay_shot(sid, title):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c = chip(f"{sid} · {title}", B(34), PEACH + (255,), INK + (255,))
    im.alpha_composite(c, (34, 140))
    return im


def wrap(text, font, maxw):
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines, cur = [], ""
    for wd in text.split():
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=font) > maxw:
            lines.append(cur)
            cur = wd
        else:
            cur = t
    lines.append(cur)
    return lines


def overlay_sub(speaker, text):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = B(58)
    lines = wrap("«" + text + "»", f, 880)
    bh = 60 + len(lines) * 76 + 30
    y0 = 1640 - bh
    d.rounded_rectangle([60, y0, W - 60, y0 + bh], radius=34, fill=(14, 20, 17, 215))
    sp = chip(speaker, B(30), (GREEN if speaker == "MINA" else PEACH) + (255,), (246, 243, 234, 255) if speaker == "MINA" else INK + (255,))
    im.alpha_composite(sp, (90, y0 - 26))
    d.text((W - 90, y0 - 12), "voce provvisoria", font=R(26), fill=(210, 225, 215, 255), anchor="ra")
    for k, ln in enumerate(lines):
        d.text((W // 2, y0 + 48 + k * 76 + 38), ln, font=f, fill=(255, 255, 255, 255), anchor="mm")
    return im


def overlay_cue(text, y, kind):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fill = (255, 236, 160, 255) if kind == "sfx" else (190, 220, 205, 255)
    c = chip(text, B(28), fill, (40, 30, 10, 255), pad=(20, 10), radius=18)
    im.alpha_composite(c, (34, y))
    return im


ovs = []  # (png, t0, t1)
hud = p("hud.png"); overlay_hud().save(hud); ovs.append((hud, 0.0, 35.0))
for i, s in enumerate(SHOTS):
    f = p(f"shot_{i}.png"); overlay_shot(s[0], s[1]).save(f); ovs.append((f, s[2], s[3]))
for i, (sp, tx, a, b) in enumerate(SUBS):
    f = p(f"sub_{i}.png"); overlay_sub(sp, tx).save(f); ovs.append((f, a, b))
for i, (tx, a, b) in enumerate(CUES):
    f = p(f"cue_{i}.png"); overlay_cue(tx, 1760, "sfx").save(f); ovs.append((f, a, b))
for i, (tx, a, b) in enumerate(MUSIC):
    f = p(f"mus_{i}.png"); overlay_cue(tx, 1830, "mus").save(f); ovs.append((f, a, b))

inputs = ["-i", base]
for f, _, _ in ovs:
    inputs += ["-i", f]
chain, last = [], "0:v"
for k, (f, a, b) in enumerate(ovs, start=1):
    nxt = f"v{k}"
    chain.append(f"[{last}][{k}:v]overlay=0:0:enable='between(t,{a},{b})'[{nxt}]")
    last = nxt
chain.append(f"[{last}]drawtext=fontfile={FD}Inter-Bold.otf:text='%{{pts\\:hms}}':x=w-tw-34:y=148:fontsize=40:fontcolor=white:box=1:boxcolor=0x12201a@0.7:boxborderw=10[vout]")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chain), "-map", "[vout]", "-r", str(FPS),
                "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], check=True)
print("Animatic:", OUT)
