"""
Montaggio dell'animatic EP01: fotogrammi → 1080×1920, etichette d'inquadratura, sottotitoli, marchio finale, audio.
    python assemble_ep01.py <dir_render> <dir_narrazione_battute> <out_dir>
Audio: narrazione clonata (battute N01–N16) ai tempi del copione; ambiente del supermercato ed effetti
sintetizzati in codice (originali, nessuna licenza di terzi). Le battute dei personaggi restano mute (da registrare).
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REN, NB, OUT = (os.path.abspath(p) for p in sys.argv[1:4])
os.makedirs(OUT, exist_ok=True)
cue = json.load(open(os.path.join(REN, "cue.json")))
FPS, DUR = cue["fps"], cue["durata"]
W, H = 1080, 1920
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
NARR_TXT = {b["id"]: b["testo"] for b in json.load(open(os.path.join(os.path.dirname(__file__), "..", "audio", "narrazione_ep01.json")))["battute"]}
SR = 48000


def narr_lines():
    out = []
    for n in cue["narrazione"]:
        p = os.path.join(NB, f"EP01_{n['id']}_narratore.wav")
        y, sr = sf.read(p, dtype="float32")
        out.append(dict(id=n["id"], inizio=n["inizio"], fine=n["inizio"] + len(y) / sr, testo=NARR_TXT[n["id"]], file=p))
    return out


NL = narr_lines()


# ------------------------------------------------------------------ immagini
def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if d.textlength(cur + " " + w, font=font) > maxw and cur:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    lines.append(cur)
    return lines


def overlay(im, t, shot, labels=True):
    d = ImageDraw.Draw(im)
    if labels:
        f = ImageFont.truetype(FS, 30)
        tag = f"ANIMATIC EP01 · INQ. {shot['n']} · {t:05.1f} s"
        d.rounded_rectangle([30, 34, 40 + d.textlength(tag, font=f) + 20, 84], 12, fill=(20, 20, 20))
        d.text((50, 59), tag, font=f, fill=(250, 250, 245), anchor="lm")
    sub = None
    for n in NL:
        if n["inizio"] - 0.05 <= t <= n["fine"] + 0.2:
            sub = ("NARRATORE", n["testo"], (250, 250, 245))
    for b in cue["battute"]:
        if b["inizio"] - 0.05 <= t <= b["fine"] + 0.3:
            sub = (b["chi"] + " · voce da registrare", b["testo"], (255, 214, 90))
    if sub:
        f = ImageFont.truetype(FB, 46)
        ft = ImageFont.truetype(FS, 26)
        lines = wrap(d, sub[1], f, 900)
        h = 60 * len(lines) + 70
        y0 = 1600 - h
        d.rounded_rectangle([60, y0, 1020, 1600], 20, fill=(15, 15, 15, 200))
        d.text((90, y0 + 22), sub[0], font=ft, fill=(190, 190, 190))
        for i, ln in enumerate(lines):
            d.text((540, y0 + 82 + 60 * i), ln, font=f, fill=sub[2], anchor="mm")
    return im


def brand_card(k):
    """Marchio Spesora breve e discreto dopo la battuta finale (fondo verde scuro, marchio piccolo)."""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "SPESORA_ADS_STUDIO", "scripts"))
    from outro import BG, logo_layer
    im = Image.new("RGB", (W, H), BG)
    lg = logo_layer()
    s = 0.36
    lg = lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)
    a = max(0.0, min(1.0, k * 3))
    lg.putalpha(lg.getchannel("A").point(lambda v: int(v * a)))
    im.paste(lg, (W // 2 - lg.width // 2, int(H * 0.46) - lg.height // 2), lg)
    return im


def shot_at(t):
    for s in cue["inquadrature"]:
        if s["inizio"] <= t < s["fine"]:
            return s
    return cue["inquadrature"][-1]


def frame_image(fi, labels, cache):
    """Fotogramma fi (30 fps) a 1080×1920. Animatic a 15 fps: se manca il render di fi si tiene l'ultimo disponibile."""
    t = fi / FPS
    if t >= 93.6:
        return brand_card((t - 93.6) / 1.4)
    src = os.path.join(REN, "frames", f"f_{fi + 1:05d}.png")
    if os.path.exists(src):
        cache["last"] = src
    src = cache.get("last")
    if src is None:
        return Image.new("RGB", (W, H))
    if cache.get("src") != src:
        cache["src"], cache["img"] = src, Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS)
    return overlay(cache["img"].copy(), t, shot_at(t), labels)


def render_video(labels, audio, out):
    """I fotogrammi passano direttamente a ffmpeg (niente PNG intermedi a 1080×1920: ~14 GB risparmiati)."""
    n = int(round(DUR * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-i", audio, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                          "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",  # volume da telefono (-16 LUFS); gli stem WAV restano non normalizzati
                          "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    cache = {}
    for fi in range(n):
        p.stdin.write(frame_image(fi, labels, cache).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg non è riuscito a codificare " + out)
    return n


# ------------------------------------------------------------------ audio
def env_lp(x, a):
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)


def make_audio():
    N = int(DUR * SR)
    rng = np.random.default_rng(7)
    narr = np.zeros(N, np.float32)
    for n in NL:
        y, sr = sf.read(n["file"], dtype="float32")
        if sr != SR:
            import librosa
            y = librosa.resample(y, orig_sr=sr, target_sr=SR)
        i0 = int(n["inizio"] * SR)
        narr[i0:i0 + len(y)] += y[: max(0, N - i0)]
    # ambiente: brusio basso del negozio + frigoriferi lontani + rari bip di cassa
    amb = env_lp(rng.standard_normal(N), 0.995) * 0.6 + env_lp(rng.standard_normal(N), 0.9) * 0.015
    hum = 0.004 * np.sin(2 * np.pi * 50 * np.arange(N) / SR)
    amb = (amb / np.max(np.abs(amb)) * 0.05 + hum).astype(np.float32)
    for tb in (14.0, 27.5, 39.0, 53.0, 62.5):
        i0 = int(tb * SR)
        tt = np.arange(int(0.09 * SR)) / SR
        amb[i0:i0 + len(tt)] += 0.012 * np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 30)
    amb[int(71.0 * SR):] *= 0.35  # dentro l'ufficio il negozio si sente meno
    sfx = np.zeros(N, np.float32)

    def put(t, y, g=1.0):
        i0 = int(t * SR)
        sfx[i0:i0 + len(y)] += g * y[: max(0, N - i0)]

    # carrello: tintinnio delle ruote (rumore filtrato modulato dal passo)
    seg = np.arange(int(4.0 * SR)) / SR
    rattle = env_lp(rng.standard_normal(len(seg)), 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * seg) ** 2) * 0.08
    rattle *= np.minimum(1, seg / 0.3) * np.minimum(1, (4.0 - seg) / 0.4)
    put(6.6, rattle.astype(np.float32))
    # «Quattro.»: piccolo pop della mano
    tt = np.arange(int(0.12 * SR)) / SR
    put(5.85, (np.sin(2 * np.pi * (500 + 900 * tt) * tt) * np.exp(-tt * 40) * 0.12).astype(np.float32))
    # pollice su di Luca, saluto, cassa che si accende, porta, sigla
    put(20.4, (np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 35) * 0.08).astype(np.float32))
    beep = np.arange(int(0.18 * SR)) / SR
    put(47.7, (np.sin(2 * np.pi * 1800 * beep) * np.exp(-beep * 12) * 0.12).astype(np.float32))
    put(47.95, (np.sin(2 * np.pi * 2250 * beep) * np.exp(-beep * 12) * 0.1).astype(np.float32))
    click = env_lp(rng.standard_normal(int(0.05 * SR)), 0.3) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80) * 0.25
    put(69.15, click.astype(np.float32))
    cr = np.arange(int(0.9 * SR)) / SR
    creak = np.sin(2 * np.pi * (180 + 60 * np.sin(2 * np.pi * 3 * cr)) * cr) * env_lp(rng.standard_normal(len(cr)), 0.95) * 4
    creak *= np.minimum(1, cr / 0.1) * np.exp(-cr * 2.2) * 0.05
    put(69.3, creak.astype(np.float32))
    wh = np.arange(int(0.5 * SR)) / SR
    whoosh = env_lp(rng.standard_normal(len(wh)), 0.8) * np.sin(np.pi * wh / 0.5) * 0.06
    put(93.5, whoosh.astype(np.float32))
    mix = narr * 1.0 + amb + sfx
    mix = mix / max(1.0, np.max(np.abs(mix)) / 0.95)
    os.makedirs(os.path.join(OUT, "audio"), exist_ok=True)
    for name, y in (("NARRATORE", narr), ("AMBIENTE", amb), ("SFX", sfx), ("mix", mix)):
        sf.write(os.path.join(OUT, "audio", f"EP01_animatic_{name}.wav"), y.astype(np.float32), SR, subtype="PCM_16")
    return os.path.join(OUT, "audio", "EP01_animatic_mix.wav")


if __name__ == "__main__":
    audio = make_audio()
    render_video(True, audio, os.path.join(OUT, "EP01_animatic.mp4"))
    render_video(False, audio, os.path.join(OUT, "EP01_animatic_senza_etichette.mp4"))
    json.dump(dict(narrazione=NL, battute=cue["battute"]), open(os.path.join(OUT, "timeline_voci.json"), "w"), ensure_ascii=False, indent=1)
    print("ok", OUT)
