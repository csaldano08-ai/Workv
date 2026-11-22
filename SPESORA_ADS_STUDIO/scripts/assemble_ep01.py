"""
Montaggio della bozza animata di EP01 (1080x1920, 30 fps): fotogrammi 3D + effetto illustrato di Mina + cartello finale animato.
Produce due file: versione pulita e versione con sottotitoli provvisori e indicazioni di effetti sonori/musica.

    python assemble_ep01.py <cartella-frames-3D> <cartella-cartello> <cartella-fx> <fx.json> <cartella-output>
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

FR, CARD, FXB, FXJ, OUT = [os.path.abspath(a) for a in sys.argv[1:6]]
W, H, FPS = 1080, 1920, 30
FD = "/usr/share/fonts/opentype/inter/"
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
R = lambda s: ImageFont.truetype(FD + "Inter-Regular.otf", s)
INK, GREEN, PEACH = (36, 51, 44), (56, 110, 85), (230, 164, 109)
os.makedirs(OUT, exist_ok=True)
tmp = tempfile.mkdtemp(prefix="asm_")

frames = sorted(f for f in os.listdir(FR) if f.startswith("f_") and f.endswith(".png"))
N = len(frames)
print("fotogrammi 3D:", N)

# 1) copia (symlink) con l'effetto di uscita di Mina composto sui fotogrammi giusti
work = os.path.join(tmp, "f")
os.makedirs(work)
fx = json.load(open(FXJ))
u, v = fx["burst_uv"]
first = int(round(fx["t"] * FPS)) + 1 - 3
fxfiles = sorted(os.listdir(FXB))
for i, f in enumerate(frames):
    dst = os.path.join(work, f"f_{i + 1:04d}.png")
    k = i + 1 - first
    if 0 <= k < len(fxfiles):
        base = Image.open(os.path.join(FR, f)).convert("RGBA")
        e = Image.open(os.path.join(FXB, fxfiles[k])).convert("RGBA")
        bw, bh = base.size
        e = e.resize((bw, bh))
        # sposta l'effetto sul punto da cui esce Mina
        shifted = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        shifted.alpha_composite(e, (int(u * bw - bw / 2), int(v * bh - bh / 2)))
        base.alpha_composite(shifted)
        base.convert("RGB").save(dst)
    else:
        os.symlink(os.path.join(FR, f), dst)

a_mp4, b_mp4, clean = os.path.join(tmp, "a.mp4"), os.path.join(tmp, "b.mp4"), os.path.join(OUT, "spesora_ep01_animazione_bozza.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(work, "f_%04d.png"), "-vf", f"scale={W}:{H}:flags=lanczos", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", a_mp4], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(CARD, "card_%04d.png"), "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", b_mp4], check=True)
lst = os.path.join(tmp, "l.txt")
open(lst, "w").write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", clean], check=True)
total = (N + len(os.listdir(CARD))) / FPS
print("pulita:", clean, f"{total:.1f} s")

# 2) versione con sottotitoli provvisori e indicazioni
SUBS = [("PROTAGONISTA", "Sono le otto e non so ancora cosa cucinare.", 2.0, 4.9), ("PROTAGONISTA", "Non ditemi che succede solo a me.", 6.4, 8.6),
        ("MINA", "Se ti organizzassi prima, non saremmo qui ogni sera.", 12.9, 16.4), ("PROTAGONISTA", "Quindi domani so già cosa cucinare?", 27.1, 29.2), ("MINA", "Anche dopodomani.", 29.4, 30.6)]
CUES = [("SFX · apertura frigo: clic guarnizione + ronzio", 0.7, 2.2), ("SFX · passi sul pavimento", 1.4, 2.6), ("SFX · sportello spinto", 5.2, 6.4), ("SFX · notifica + vibrazione", 11.0, 12.4),
        ("SFX · uscita di Mina (pop + pagine)", 12.6, 14.0), ("SFX · salto e atterraggio", 14.6, 15.3), ("SFX · sobbalzo, fruscio vestiti", 15.3, 16.4), ("SFX · swish verso lo schermo", 17.3, 18.8),
        ("SFX · UI: tocchi leggeri", 19.3, 20.2), ("SFX · UI: tocco", 22.1, 22.8), ("SFX · UI: spunta lista", 24.6, 25.4), ("SFX · piccolo suono di Mina soddisfatta", 29.5, 30.6), ("SFX · chiusura logo", 32.0, 33.8)]
MUSIC = [("MUSICA · leggera, un po' frustrata", 0.0, 11.0), ("MUSICA · cambia con Mina", 11.0, 17.0), ("MUSICA · positiva, accompagna l'app", 17.0, 32.0), ("MUSICA · sigla breve", 32.0, 35.0)]


def chip(text, font, fill, color, pad=(22, 12), radius=22):
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(d.textlength(text, font=font)) + pad[0] * 2
    h = font.size + pad[1] * 2 + 6
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    dd.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=fill)
    dd.text((pad[0], pad[1] - 2), text, font=font, fill=color)
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


def sub_png(sp, text):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = B(58)
    lines = wrap("«" + text + "»", f, 880)
    bh = 60 + len(lines) * 76 + 30
    y0 = 1640 - bh
    d.rounded_rectangle([60, y0, W - 60, y0 + bh], radius=34, fill=(14, 20, 17, 215))
    c = chip(sp, B(30), (GREEN if sp == "MINA" else PEACH) + (255,), (246, 243, 234, 255) if sp == "MINA" else INK + (255,))
    im.alpha_composite(c, (90, y0 - 26))
    d.text((W - 90, y0 - 12), "voce provvisoria", font=R(26), fill=(210, 225, 215, 255), anchor="ra")
    for k, ln in enumerate(lines):
        d.text((W // 2, y0 + 48 + k * 76 + 38), ln, font=f, fill=(255, 255, 255, 255), anchor="mm")
    return im


def cue_png(text, y, sfx):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    im.alpha_composite(chip(text, B(28), (255, 236, 160, 255) if sfx else (190, 220, 205, 255), (40, 30, 10, 255), pad=(20, 10), radius=18), (34, y))
    return im


ovs = []
hud = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dh = ImageDraw.Draw(hud)
dh.rectangle([0, 0, W, 118], fill=(18, 26, 22, 215))
dh.text((34, 30), "SPESORA · EP01 · BOZZA ANIMATA", font=B(36), fill=(246, 243, 234, 255))
dh.text((W - 34, 40), "voci e suoni provvisori", font=R(30), fill=(200, 216, 206, 255), anchor="ra")
dh.rectangle([0, H - 112, W, H], fill=(18, 26, 22, 215))
dh.text((W - 34, H - 82), "bozza a bassa risoluzione", font=R(28), fill=(200, 216, 206, 255), anchor="ra")
p = os.path.join(tmp, "hud.png"); hud.save(p); ovs.append((p, 0, total))
for i, (sp, tx, a, b) in enumerate(SUBS):
    p = os.path.join(tmp, f"s{i}.png"); sub_png(sp, tx).save(p); ovs.append((p, a, b))
for i, (tx, a, b) in enumerate(CUES):
    p = os.path.join(tmp, f"c{i}.png"); cue_png(tx, 1760, True).save(p); ovs.append((p, a, b))
for i, (tx, a, b) in enumerate(MUSIC):
    p = os.path.join(tmp, f"m{i}.png"); cue_png(tx, 1830, False).save(p); ovs.append((p, a, b))
inputs = ["-i", clean]
for f, _, _ in ovs:
    inputs += ["-i", f]
chain, last = [], "0:v"
for k, (f, a, b) in enumerate(ovs, start=1):
    chain.append(f"[{last}][{k}:v]overlay=0:0:enable='between(t,{a},{b})'[v{k}]")
    last = f"v{k}"
chain.append(f"[{last}]drawtext=fontfile={FD}Inter-Bold.otf:text='%{{pts\\:hms}}':x=w-tw-34:y=148:fontsize=40:fontcolor=white:box=1:boxcolor=0x12201a@0.7:boxborderw=10[vout]")
annot = os.path.join(OUT, "spesora_ep01_animazione_bozza_con_sottotitoli.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chain), "-map", "[vout]", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", annot], check=True)
print("con sottotitoli:", annot)
shutil.rmtree(tmp, ignore_errors=True)
