"""
Progetto audio PROVVISORIO di EP01: effetti sonori, ambiente e musica ORIGINALI (sintetizzati in codice: nessun campione esterno,
nessuna licenza da verificare), voci come tracce silenziose con marcatori. Ogni suono è legato a un'azione visibile.

    python audio_ep01.py <A|B> <cue.json> <out_dir>

Scrive (48 kHz, 16 bit): stems/<TRACCIA>.wav, mix_senza_voci.wav, timeline_audio.csv
"""
import csv
import json
import math
import os
import sys
import wave

import numpy as np
from scipy.signal import lfilter

SR = 48000
DUR = 35.2
N = int(SR * DUR)
rng = np.random.default_rng(7)
VERSION, CUE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
cue = json.load(open(CUE))


def t2i(t):
    return int(t * SR)


def env(n, a=0.005, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    return att * np.exp(-curve * np.maximum(0, t - a) / max(d, 1e-4))


def lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def bp(x, f1, f2):
    return lp(x, f2) - lp(x, f1)


def noise(n):
    return rng.standard_normal(n)


def sine_sweep(f0, f1, dur, shape="exp"):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) if shape == "exp" else f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def pluck(freq, dur, bright=0.5, decay=0.996):
    """Corda pizzicata (Karplus-Strong, come filtro ricorsivo): suono morbido tipo ukulele/chitarra."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    x = np.zeros(n)
    x[:p] = lp(noise(p), 1500 + 6000 * bright) * 0.6
    a = np.zeros(p + 2)
    a[0] = 1.0
    a[p] -= decay * 0.5
    a[p + 1] -= decay * 0.5
    y = lfilter([1.0], a, x)
    return y * env(n, 0.002, dur * 0.6, 2.0)


def add(track, t, sig, gain):
    i = t2i(t)
    if i >= N:
        return
    j = min(N, i + len(sig))
    track[i:j] += sig[: j - i] * gain


# ------------------------------------------------------------------ libreria di effetti originali
def fx_seal():
    n = int(0.09 * SR)
    return lp(noise(n), 1800) * env(n, 0.002, 0.03, 3)


def fx_thump(f=85, d=0.25):
    s = sine_sweep(f * 1.6, f, d)
    return s * env(len(s), 0.003, d * 0.5, 3)


def fx_clink(f):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)
    return s * env(n, 0.001, 0.08, 4)


def fx_step():
    n = int(0.12 * SR)
    return (lp(noise(n), 700) * 0.7 + fx_thump(70, 0.12)[:n] * 0.5) * env(n, 0.004, 0.05, 3)


def fx_rustle(d=0.35):
    n = int(d * SR)
    s = bp(noise(n), 1200, 5000)
    return s * np.sin(np.pi * np.arange(n) / n) ** 1.5


def fx_whoosh(d=0.5, f0=400, f1=3000):
    n = int(d * SR)
    s = noise(n)
    out = np.zeros(n)
    seg = 512
    for k in range(0, n, seg):
        fr = f0 * (f1 / f0) ** (k / n)
        out[k:k + seg] = bp(s[k:k + seg], fr * 0.6, fr * 1.4)
    return out * np.sin(np.pi * np.arange(n) / n) ** 2


def fx_chime(notes=(784.0, 1046.5), gap=0.11):
    out = np.zeros(int(0.9 * SR))
    for k, f in enumerate(notes):
        n = int(0.7 * SR)
        t = np.arange(n) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)) * env(n, 0.004, 0.25, 3)
        i = int(k * gap * SR)
        out[i:i + n] += s[: len(out) - i]
    return out


def fx_buzz(d=0.42):
    n = int(d * SR)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 165 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t))
    return lp(s, 900) * np.sin(np.pi * t / d) ** 0.5


def fx_pop():
    s = sine_sweep(260, 980, 0.16) * env(int(0.16 * SR), 0.002, 0.09, 2.5)
    return np.concatenate([s, np.zeros(int(0.05 * SR))]) + np.concatenate([lp(noise(int(0.04 * SR)), 4000) * 0.3, np.zeros(len(s) + int(0.01 * SR))])[: len(s) + int(0.05 * SR)]


def fx_pages(count=7, d=0.45):
    out = np.zeros(int(d * SR) + 4000)
    for k in range(count):
        n = int(0.045 * SR)
        b = bp(noise(n), 1800, 7000) * env(n, 0.002, 0.02, 3) * (1 - k / (count + 2))
        i = int(d * SR * (k / count) ** 1.3)
        out[i:i + n] += b
    return out


def fx_bounce():
    s = sine_sweep(330, 150, 0.18) * env(int(0.18 * SR), 0.002, 0.08, 3)
    return s + np.concatenate([fx_thump(110, 0.1), np.zeros(len(s))])[: len(s)] * 0.6


def fx_bwip():
    return sine_sweep(420, 900, 0.14) * env(int(0.14 * SR), 0.003, 0.08, 2)


def fx_tap():
    n = int(0.05 * SR)
    return bp(noise(n), 2000, 7000) * env(n, 0.0005, 0.008, 3) + fx_clink(2400)[:n] * 0.15


def fx_tick():
    a = np.concatenate([fx_tap(), np.zeros(int(0.07 * SR))])
    b = fx_clink(1760)[: len(a)]
    return a * 0.8 + b * 0.5


def fx_panel():
    return pluck(659.3, 0.5, 0.6) * 0.8


def fx_arp(notes=(523.3, 659.3, 784.0), gap=0.08):
    out = np.zeros(int(1.0 * SR))
    for k, f in enumerate(notes):
        p = pluck(f, 0.7, 0.7)
        i = int(k * gap * SR)
        out[i:i + len(p)] += p[: len(out) - i]
    return out


def fx_flap():
    n = int(0.22 * SR)
    return bp(noise(n), 300, 2500) * np.sin(np.pi * np.arange(n) / n) ** 3


def fx_sting():
    out = np.zeros(int(2.6 * SR))
    for f in (261.6, 329.6, 392.0, 587.3):
        p = pluck(f, 2.4, 0.45, 0.998)
        out[: len(p)] += p
    return out


# ------------------------------------------------------------------ piazzamento (secondi) legato alle azioni
sfx, log = np.zeros(N), []


def place(t, name, sig, gain, descr):
    add(sfx, t, sig, gain)
    log.append(dict(traccia="SFX", inizio=round(t, 2), durata=round(len(sig) / SR, 2), nome=name, descrizione=descr, origine="sintetizzato in codice (originale)"))


for t in (1.02, 1.32, 1.62, 1.95, 2.3):
    place(t, "passo", fx_step(), 0.35, "passi davanti al frigo")
place(0.9, "frigo_guarnizione", fx_seal(), 0.5, "il frigo si apre: guarnizione")
place(0.95, "frigo_tonfo", fx_thump(), 0.35, "il frigo si apre: sportello")
for k, f in enumerate((2100, 2600, 1900)):
    place(1.05 + 0.05 * k, "bottiglie", fx_clink(f), 0.12, "bottiglie nello sportello")
place(5.35, "sportello_spinto", fx_thump(95, 0.2), 0.35, "spinge lo sportello")
place(5.9, "fruscio", fx_rustle(0.4), 0.18, "si gira verso la camera")
place(7.85, "fruscio_spalle", fx_rustle(0.3), 0.16, "alza le spalle")
place(11.05, "notifica", fx_chime(), 0.33, "notifica del telefono")
place(11.05, "vibrazione", fx_buzz(), 0.25, "il telefono vibra")
for t in (11.45, 11.8, 12.15, 12.5):
    place(t, "passo", fx_step(), 0.25, "si avvicina al piano (fuori campo)")
place(12.6, "mina_pop", fx_pop(), 0.42, "Mina esce dal telefono")
place(12.68, "mina_pagine", fx_pages(), 0.3, "le pagine di Mina")
place(13.28, "atterraggio", fx_bounce(), 0.38, "Mina atterra sul piano")
place(13.48, "sobbalzo", fx_whoosh(0.3, 600, 2500), 0.25, "il protagonista sobbalza")
place(13.5, "sobbalzo_comico", fx_bwip(), 0.25, "reazione comica")
place(13.62, "fruscio", fx_rustle(0.3), 0.18, "vestiti nel salto")
place(13.88, "atterraggio_lui", fx_thump(70, 0.15), 0.3, "torna giù")
place(15.75, "copertina", fx_flap(), 0.3, "Mina muove la copertina")
place(17.3, "mina_indica", fx_flap(), 0.18, "Mina si gira verso il telefono")
place(18.45, "swish", fx_whoosh(0.35, 300, 4000), 0.28, "la camera entra nel telefono")
for t, nm in ((19.5, "tap"), (20.7, "tap"), (21.2, "tap"), (22.0, "tap"), (22.6, "tap"), (24.5, "tap"), (24.9, "tap")):
    place(t, nm, fx_tap(), 0.4, "tocco sull'interfaccia")
for t in (19.55, 22.7, 25.0):
    place(t, "pannello", fx_panel(), 0.18, "compare la sezione dell'app")
for t in (25.7, 26.15):
    place(t, "spunta", fx_tick(), 0.35, "prodotto spuntato nella lista")
place(29.65 if VERSION == "A" else 30.62, "mina_soddisfatta", fx_arp(), 0.3, "Mina soddisfatta")
place(29.72 if VERSION == "A" else 29.75, "copertina", fx_flap(), 0.25, "copertina che si apre")
if VERSION == "B":
    place(30.62, "beat_comico", fx_bwip(), 0.18, "piccolo accento prima dello sguardo in camera")
place(31.85, "uscita", fx_whoosh(0.3, 1500, 300), 0.18, "stacco verso il finale")
place(32.15, "sigla_logo", fx_sting(), 0.32, "logo Spesora")

# ------------------------------------------------------------------ ambiente
t = np.arange(N) / SR
room = lp(lp(noise(N), 400), 200) * 0.9
amb = room * 0.05
hum = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.2 + lp(noise(N), 300) * 0.3)
door_open = np.clip((t - 0.95) / 0.3, 0, 1) * np.clip((11.0 - t) / 0.6, 0, 1)
door_open *= np.where((t > 6.1), 0.7, 1.0)
amb += hum * 0.03 * door_open
amb *= np.clip((32.0 - t) / 0.15, 0, 1)  # silenzio sul fondo scuro dell'outro (resta solo la sigla)

# ------------------------------------------------------------------ musica originale (corde pizzicate, accordi semplici)
mus = np.zeros(N)
BEAT = 60 / 92
NOTE = {"A2": 110.0, "C3": 130.8, "D3": 146.8, "E3": 164.8, "F2": 87.3, "G2": 98.0, "A3": 220.0, "C4": 261.6, "D4": 293.7, "E4": 329.6, "F4": 349.2,
        "G4": 392.0, "A4": 440.0, "B3": 246.9, "C5": 523.3}
CH = {"Am": ("A2", "A3", "C4", "E4"), "F": ("F2", "A3", "C4", "F4"), "Dm": ("D3", "A3", "D4", "F4"), "G": ("G2", "B3", "D4", "G4"), "C": ("C3", "G4", "C4", "E4")}


def bar(t0, chord, pattern, gain):
    b, *up = CH[chord]
    add(mus, t0, pluck(NOTE[b], BEAT * 4, 0.3, 0.997), gain * 0.9)
    for k, (beat, idx) in enumerate(pattern):
        add(mus, t0 + beat * BEAT, pluck(NOTE[up[idx]], BEAT * 2.2, 0.55), gain * 0.55)


sparse = [(0, 0), (2, 1)]
arp = [(0, 0), (0.5, 1), (1, 2), (1.5, 1), (2, 0), (2.5, 1), (3, 2), (3.5, 1)]
tt = 0.2
for ch in ("Am", "F", "Am", "F"):  # 0–11 s: leggera, un po' sospesa
    if tt < 10.9:
        bar(tt, ch, sparse, 0.5)
    tt += BEAT * 4
tt = 11.0
for ch in ("Dm", "G"):  # 11–17: arriva Mina
    bar(tt, ch, [(0, 0), (1, 1), (2, 2), (3, 1)], 0.55)
    tt += BEAT * 4
tt = 17.0
while tt < 31.8:  # 17–32: positiva, accompagna la dimostrazione e la risoluzione
    for ch in ("C", "G", "Am", "F"):
        if tt < 31.8:
            bar(tt, ch, arp, 0.5)
        tt += BEAT * 4
mus *= np.clip((31.9 - t) / 0.25, 0, 1)

# ------------------------------------------------------------------ voci: tracce silenziose con marcatori (nessuna voce sintetica)
VOICE_TRACKS = ["NARRATOR", "MINA"] if VERSION == "A" else ["VOICE_PROTAGONIST", "VOICE_MINA"]
NAMES = {"NARRATORE": "NARRATOR", "MINA": "VOICE_MINA" if VERSION == "B" else "MINA", "PROTAGONISTA": "VOICE_PROTAGONIST"}
for ln in cue["lines"]:
    log.append(dict(traccia=NAMES[ln["chi"]], inizio=ln["inizio"], durata=round(ln["fine"] - ln["inizio"], 2), nome=ln["traccia"],
                    descrizione=f'«{ln["testo"]}» ({ln["emozione"]})', origine="da registrare (traccia vuota)"))


def write(path, x):
    y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype("<i2").tobytes())


def norm(x, peak_db):
    m = np.max(np.abs(x)) or 1.0
    return x / m * 10 ** (peak_db / 20)


sfx_n, amb_n, mus_n = norm(sfx, -6), norm(amb, -26), norm(mus, -18)
write(os.path.join(OUT, "stems", "SFX.wav"), sfx_n)
write(os.path.join(OUT, "stems", "AMBIENCE.wav"), amb_n)
write(os.path.join(OUT, "stems", "MUSIC.wav"), mus_n)
for vt in VOICE_TRACKS:
    write(os.path.join(OUT, "stems", f"{vt}.wav"), np.zeros(N))
mix = sfx_n + amb_n + mus_n
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
write(os.path.join(OUT, "mix_senza_voci.wav"), mix * 0.89)
with open(os.path.join(OUT, "timeline_audio.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["traccia", "inizio", "durata", "nome", "descrizione", "origine"])
    w.writeheader()
    for r in sorted(log, key=lambda r: (r["inizio"], r["traccia"])):
        w.writerow(r)
print("audio", VERSION, "ok:", len(log), "eventi")
