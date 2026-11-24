"""
Montaggio del test di recitazione: fotogrammi a 30 fps (uno per fotogramma, nessuno ripetuto) → MP4 1080×1920.
    python assemble_test.py <dir_test (frames/ + marcatori.json)> <out.mp4> [--etichette] [--narrazione <dir battute v2>]
Audio: ambiente del supermercato e passi sincronizzati agli appoggi reali dei piedi (dal piano delle impronte), più
pochi rumori di scena (telefono, sobbalzo, saluto). Senza --narrazione non c'è nessuna voce (fase senza doppiaggio):
i marcatori delle battute N04/N05 compaiono solo con --etichette.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

REN, OUT = sys.argv[1], sys.argv[2]
LABELS = "--etichette" in sys.argv
NARR = sys.argv[sys.argv.index("--narrazione") + 1] if "--narrazione" in sys.argv else None
mk = json.load(open(os.path.join(REN, "marcatori.json")))
FPS, DUR = mk["fps"], mk["durata_s"]
N = int(round(DUR * FPS))
W, H, SR = 1080, 1920, 48000
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
rng = np.random.default_rng(5)


def lp(x, a):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = a * acc + (1 - a) * v
        y[i] = acc
    return y


n = int(DUR * SR)
mix = lp(rng.standard_normal(n), 0.995) * 0.5 + lp(rng.standard_normal(n), 0.9) * 0.012      # brusio del negozio
hum = 0.004 * np.sin(2 * np.pi * 100 * np.arange(n) / SR)                                       # frigoriferi lontani
mix = mix * 0.5 + hum


def add(t, snd, g=1.0):
    a = int(t * SR)
    b = min(n, a + len(snd))
    if a < n:
        mix[a:b] += snd[: b - a] * g


def step_sound(k):
    m = int(0.09 * SR)
    e = np.exp(-np.arange(m) / SR * 45)
    thump = lp(rng.standard_normal(m), 0.85) * e * 0.5
    click = lp(rng.standard_normal(m), 0.2) * np.exp(-np.arange(m) / SR * 160) * 0.12
    return (thump + click) * (0.85 + 0.3 * rng.random())


for k, tp in enumerate(mk["passi"]):
    add(tp, step_sound(k), 0.9 if k < len(mk["passi"]) - 1 else 0.6)
ev = mk["eventi"]
m = int(0.25 * SR)
add(ev["telefono_su"], lp(rng.standard_normal(m), 0.6) * np.sin(np.linspace(0, np.pi, m)) * 0.05)         # fruscio della manica
add(ev["telefono_porto"], lp(rng.standard_normal(m), 0.6) * np.sin(np.linspace(0, np.pi, m)) * 0.05)
add(ev["sobbalzo_luca"], lp(rng.standard_normal(int(0.18 * SR)), 0.5) * np.exp(-np.arange(int(0.18 * SR)) / SR * 18) * 0.08)
add(ev["saluto"] + 0.28, lp(rng.standard_normal(int(0.05 * SR)), 0.3) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90) * 0.18)  # tacchi uniti
if NARR:
    import soundfile as sf
    for m_ in mk["marcatori_narrazione"]:
        p = os.path.join(NARR, f"EP01_{m_['id']}_narratore.wav")
        if os.path.exists(p):
            y, sr = sf.read(p, dtype="float32")
            if sr != SR:
                import librosa
                y = librosa.resample(y, orig_sr=sr, target_sr=SR)
            add(m_["inizio"], y * 0.9)
mix = mix / max(1.0, np.max(np.abs(mix)) / 0.95)
wav = os.path.splitext(OUT)[0] + "_audio.wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())

shots = mk["inquadrature"]
p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                      "-i", wav, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                      "-af", "loudnorm=I=-18:TP=-1.5:LRA=11", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
font = ImageFont.truetype(FB, 30)
missing = 0
for i in range(N):
    f = os.path.join(REN, "frames", f"f_{i + 1:05d}.png")
    if not os.path.exists(f):
        missing += 1
        continue
    im = Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)
    if LABELS:
        d = ImageDraw.Draw(im)
        t = i / FPS
        sh = next((x["n"] for x in shots if x["inizio"] <= t < x["fine"]), shots[-1]["n"])
        d.rounded_rectangle((24, 24, 520, 76), 12, fill=(0, 0, 0))
        d.text((40, 34), f"TEST RECITAZIONE · INQ. {sh} · {t:05.2f} s", font=font, fill=(255, 255, 255))
        for m_ in mk["marcatori_narrazione"]:
            if m_["inizio"] <= t < m_["inizio"] + 3.2 and not NARR:
                d.rounded_rectangle((40, 1700, 1040, 1800), 14, fill=(0, 0, 0))
                d.text((64, 1716), f"[{m_['id']} · narratore, voce da aggiungere]", font=font, fill=(255, 210, 90))
    p.stdin.write(im.tobytes())
p.stdin.close()
p.wait()
os.remove(wav)
print("ok", OUT, "fotogrammi mancanti", missing)
