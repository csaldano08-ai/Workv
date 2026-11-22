"""
Montaggio finale di EP01 v2 (1080x1920, 30 fps).

    python assemble_v2.py <A|B> <frames_A> [<frames_B>] --quads q.json --ui <uihi> --fx fx.json --fxb <burst> --outro <outro> \
        --cue cue.json --audio mix.wav --out <dir>

- frames_B (solo per B): i fotogrammi renderizzati per B sostituiscono quelli di A negli stessi numeri.
- Inserto nitido dell'interfaccia REALE sullo schermo del telefono (prospettiva calcolata dagli angoli 3D dello schermo).
- Etichette brevi durante la dimostrazione, effetto di uscita di Mina, stacco verso l'outro.
- Sottotitoli provvisori nelle zone sicure di TikTok/Instagram (non in basso, non a destra).
Esporta: <NOME>.mp4 (con sottotitoli provvisori), <NOME>_senza_dialoghi.mp4, <NOME>_anteprima_540x960.mp4
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("version")
ap.add_argument("frames", nargs="+")
for k in ("quads", "ui", "fx", "fxb", "outro", "cue", "audio", "out"):
    ap.add_argument("--" + k, required=True)
a = ap.parse_args()
W, H, FPS = 1080, 1920, 30
NAME = "SPESORA_EP01_NARRATORE" if a.version == "A" else "SPESORA_EP01_DIALOGHI"
FD = "/usr/share/fonts/opentype/inter/"
B = lambda s: ImageFont.truetype(FD + "Inter-Bold.otf", s)
SB = lambda s: ImageFont.truetype(FD + "Inter-SemiBold.otf", s)
R = lambda s: ImageFont.truetype(FD + "Inter-Regular.otf", s)
INK, GREEN, IVORY, PEACH, SAGE = (36, 51, 44), (56, 110, 85), (246, 243, 234), (230, 164, 109), (150, 178, 150)
BG_OUT = (15, 29, 23)
os.makedirs(a.out, exist_ok=True)
tmp = tempfile.mkdtemp(prefix="asm2_")

# ------------------------------------------------------------------ fotogrammi 3D (B sovrascrive A dove ha renderizzato)
src = {}
for d in a.frames:
    for f in os.listdir(d):
        if f.startswith("f_") and f.endswith(".png"):
            src[int(f[2:6])] = os.path.join(d, f)
N3D = max(src)
missing = [i for i in range(1, N3D + 1) if i not in src]
assert not missing, f"mancano fotogrammi: {missing[:10]}"
quads = {int(k): v for k, v in json.load(open(a.quads)).items()}
fx = json.load(open(a.fx))
fxfiles = sorted(os.listdir(a.fxb))
cue = json.load(open(a.cue))


# ------------------------------------------------------------------ inserto dell'interfaccia reale
def ui_image(idx):
    im = Image.open(os.path.join(a.ui, f"ui_{idx:04d}.png")).convert("RGB")
    w, h = im.size
    target = w / 0.4977  # rapporto dello schermo 3D (0.324 x 0.651)
    cut = max(0, int(round(h - target)))
    im = im.crop((0, cut // 2, w, h - (cut - cut // 2)))
    # riflesso leggerissimo del vetro e lieve contrasto: si legge come un display reale, non come un adesivo
    arr = np.asarray(im).astype(np.float32)
    gy, gx = np.mgrid[0:arr.shape[0], 0:arr.shape[1]]
    refl = np.clip(1 - (gx / arr.shape[1] + gy / arr.shape[0]) * 1.2, 0, 1)[..., None] * 10
    arr = np.clip(arr * 0.965 + refl, 0, 255)
    im = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius=int(im.size[0] * 0.07), fill=255)
    im.putalpha(m)
    return im


def persp_coeffs(dst, src_pts):
    A_, b_ = [], []
    for (x, y), (u, v) in zip(dst, src_pts):
        A_.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A_.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        b_ += [u, v]
    return np.linalg.solve(np.array(A_, float), np.array(b_, float)).tolist()


_ui_cache = {}


def insert_ui(frame, q):
    idx = q["ui"]
    if idx not in _ui_cache:
        _ui_cache.clear()
        _ui_cache[idx] = ui_image(idx)
    ui = _ui_cache[idx]
    w, h = ui.size
    dst = [(u * W, v * H) for u, v in q["quad"]]
    co = persp_coeffs(dst, [(0, 0), (w, 0), (w, h), (0, h)])
    warped = ui.transform((W, H), Image.PERSPECTIVE, co, Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    if q["on"] < 0.999:
        warped.putalpha(warped.getchannel("A").point(lambda v: int(v * q["on"])))
    frame.alpha_composite(warped)


# ------------------------------------------------------------------ etichette della dimostrazione (brevi, senza sovraccaricare)
LABELS = [("1", "Il calendario della settimana", 19.55, 22.4), ("2", "La ricetta del giorno", 22.75, 24.75), ("3", "La lista della spesa", 25.0, 26.95)]


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def label_layer(num, text, t, t0, t1):
    k = ease((t - t0) / 0.3) * (1 - ease((t - (t1 - 0.25)) / 0.25))
    if k <= 0:
        return None
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = B(44)
    tw = d.textlength(text, font=f)
    bw, bh = int(tw + 150), 96
    x0 = int((W - bw) / 2 - 40)
    y0 = int(175 - (1 - k) * 30)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=48, fill=IVORY + (int(242 * k),), outline=INK + (int(255 * k),), width=3)
    d.ellipse([x0 + 18, y0 + 18, x0 + 78, y0 + 78], fill=GREEN + (int(255 * k),))
    d.text((x0 + 48, y0 + 48), num, font=B(36), fill=IVORY + (int(255 * k),), anchor="mm")
    d.text((x0 + 98, y0 + bh / 2 + 2), text, font=f, fill=INK + (int(255 * k),), anchor="lm")
    g = ease((t - t0 - 0.2) / 0.5)
    if g > 0:
        d.line([(x0 + 98, y0 + bh + 14), (x0 + 98 + (bw - 130) * g, y0 + bh + 14)], fill=PEACH + (int(255 * k),), width=7)
    return im


# ------------------------------------------------------------------ sottotitoli provvisori (zona sicura social)
SUB_W, SUB_CX, SUB_BOTTOM = 820, 500, 1520
SUB_BOTTOM_DEMO = 1585  # durante la dimostrazione: sotto il telefono, ancora fuori dalla fascia bassa dei social
TAG = {"NARRATORE": ("NARRATORE", PEACH, INK), "MINA": ("MINA", GREEN, IVORY), "PROTAGONISTA": ("LUI", PEACH, INK)}


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


def sub_layer(who, text, k, demo=False):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = B(46 if demo else 52)
    SUB_BOTTOM = SUB_BOTTOM_DEMO if demo else globals()["SUB_BOTTOM"]
    lines = wrap(text, f, SUB_W - 70)
    bh = 40 + len(lines) * 68
    y0 = SUB_BOTTOM - bh
    d.rounded_rectangle([SUB_CX - SUB_W / 2, y0, SUB_CX + SUB_W / 2, SUB_BOTTOM], radius=30, fill=(14, 20, 17, int(205 * k)))
    tag, bg, fg = TAG[who]
    ft = B(26)
    tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([SUB_CX - SUB_W / 2 + 24, y0 - 20, SUB_CX - SUB_W / 2 + 24 + tw + 32, y0 + 22], radius=20, fill=bg + (int(255 * k),))
    d.text((SUB_CX - SUB_W / 2 + 40, y0 + 1), tag, font=ft, fill=fg + (int(255 * k),), anchor="lm")
    d.text((SUB_CX + SUB_W / 2 - 24, y0 + 1), "voce provvisoria", font=R(22), fill=(225, 232, 228, int(220 * k)), anchor="rm")
    for i, ln in enumerate(lines):
        d.text((SUB_CX, y0 + 24 + i * 68 + 34), ln, font=f, fill=(255, 255, 255, int(255 * k)), anchor="mm")
    return im


SUBS = [(l["chi"], l["testo"], l["inizio"], l["fine"]) for l in cue["lines"] if l["inizio"] < 32.0]

# ------------------------------------------------------------------ composizione dei fotogrammi
clean_dir, sub_dir = os.path.join(tmp, "c"), os.path.join(tmp, "s")
os.makedirs(clean_dir)
os.makedirs(sub_dir)
bu, bv = fx["burst_uv"]
burst_first = int(round(fx["t"] * FPS)) + 1 - 2
for f in range(1, N3D + 1):
    t = (f - 1) / FPS
    fr = Image.open(src[f]).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    if f in quads and quads[f]["on"] > 0.01:
        insert_ui(fr, quads[f])
    k = f - burst_first
    if 0 <= k < len(fxfiles):
        e = Image.open(os.path.join(a.fxb, fxfiles[k])).convert("RGBA").resize((W, H), Image.LANCZOS)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.alpha_composite(e, (int(bu * W - W / 2), int(bv * H - H / 2)))
        fr.alpha_composite(layer)
    for num, text, t0, t1 in LABELS:
        if t0 <= t <= t1:
            L = label_layer(num, text, t, t0, t1)
            if L:
                fr.alpha_composite(L)
    # stacco elegante: gli ultimi 4 fotogrammi scendono verso il verde scuro dell'outro
    if f > N3D - 4:
        dk = (f - (N3D - 4)) / 4
        fr = Image.blend(fr, Image.new("RGBA", (W, H), BG_OUT + (255,)), dk * 0.85)
    fr.convert("RGB").save(os.path.join(clean_dir, f"v_{f:04d}.png"))
    sb = fr.copy()
    for who, text, t0, t1 in SUBS:
        if t0 - 0.1 <= t <= t1 + 0.15:
            kk = min(1.0, (t - (t0 - 0.1)) / 0.12, (t1 + 0.15 - t) / 0.12)
            sb.alpha_composite(sub_layer(who, text, max(0.0, kk), demo=18.6 <= t < 27.0))
    sb.convert("RGB").save(os.path.join(sub_dir, f"v_{f:04d}.png"))
outro = sorted(os.listdir(a.outro))
for i, o in enumerate(outro):
    n = N3D + 1 + i
    for d in (clean_dir, sub_dir):
        os.symlink(os.path.join(a.outro, o), os.path.join(d, f"v_{n:04d}.png"))
total = (N3D + len(outro)) / FPS
print(f"fotogrammi: {N3D} 3D + {len(outro)} outro = {total:.2f} s", flush=True)


def encode(d, out, scale=None):
    vf = "format=yuv420p" if not scale else f"scale={scale}:flags=lanczos,format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(d, "v_%04d.png"), "-i", a.audio,
                    "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", out], check=True)


encode(sub_dir, os.path.join(a.out, f"{NAME}.mp4"))
encode(clean_dir, os.path.join(a.out, f"{NAME}_senza_dialoghi.mp4"))
encode(sub_dir, os.path.join(a.out, f"{NAME}_anteprima_540x960.mp4"), "540:960")
shutil.rmtree(tmp, ignore_errors=True)
print("ok", a.out)
