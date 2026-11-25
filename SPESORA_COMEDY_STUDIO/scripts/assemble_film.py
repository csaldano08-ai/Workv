"""
Montaggio finale di EP01 «L'uomo che diventò direttore del supermercato».

    python assemble_film.py <cartella_render (frames/EP01_000001.png…, cue.json, eventi_audio.json)> <cartella_battute_narratore> <out_dir>

Video: i 2808 fotogrammi renderizzati (30 fps veri, nessuno ripetuto o duplicato per coprire buchi: se ne manca anche uno il montaggio si
ferma) + 42 fotogrammi animati di marchio Spesora (1,4 s) dopo la punchline. MP4 H.264 1080×1920 a 30 fps costanti.

Audio, SENZA letto di rumore continuo (quello dell'animatic era rumore filtrato + ronzio a 50 Hz, e suonava come vento/ventilatore).
Ci sono solo suoni motivati da ciò che si vede, sintetizzati nel codice (nessuna licenza di terzi):
  passi sui punti di appoggio dei piedi (dai piani delle impronte, non a intervalli regolari), ruote e tasselli del carrello e
  dell'espositore (solo quando si muovono, in proporzione alla velocità), porta (scatto e cardine), cartellina, cassa che si apre,
  qualche bip lontano di scanner e un gong d'annuncio. Tra un suono e l'altro c'è silenzio.
Stem separati: NARRATOR, DIALOGUE (vuoto: voci dei personaggi da registrare), SFX, MUSIC (vuoto), AMBIENCE.

Uscite: EP01_FINALE.mp4 (con narrazione e sottotitoli), EP01_FINALE_senza_sottotitoli.mp4, EP01_senza_voce_narratore.mp4 (solo SFX, con
sottotitoli: è la versione che può stare nel repository pubblico), stem WAV, EP01.srt, timeline_voci.json.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, lfilter, resample_poly

REN, NB, OUT = (os.path.abspath(p) for p in sys.argv[1:4])
os.makedirs(os.path.join(OUT, "stem"), exist_ok=True)
cue = json.load(open(os.path.join(REN, "cue.json")))
EV = json.load(open(os.path.join(REN, "eventi_audio.json")))
FPS, W, H, SR = 30, 1080, 1920, 48000
NF = 2808                       # 93,6 s di storia
NB_BRAND = 42                   # 1,4 s di marchio
DUR_STORY, DUR = NF / FPS, (NF + NB_BRAND) / FPS
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FS = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
NARR_TXT = {b["id"]: b["testo"] for b in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio", "narrazione_ep01.json")))["battute"]}
rng = np.random.default_rng(2025)


# ------------------------------------------------------------------ narrazione
def narr_lines():
    out = []
    for n in cue["narrazione"]:
        y, sr = sf.read(os.path.join(NB, f"EP01_{n['id']}_narratore.wav"), dtype="float32")
        if y.ndim > 1:
            y = y.mean(1)
        if sr != SR:
            y = resample_poly(y, SR // sr, 1).astype(np.float32) if SR % sr == 0 else resample_poly(y, SR, sr).astype(np.float32)
        out.append(dict(id=n["id"], inizio=n["inizio"], fine=round(n["inizio"] + len(y) / SR, 3), testo=NARR_TXT[n["id"]], y=y))
    return out


NL = narr_lines()
for a, b in zip(NL, NL[1:]):
    assert a["fine"] <= b["inizio"] + 1e-6, f"narrazione sovrapposta: {a['id']} finisce a {a['fine']} ma {b['id']} inizia a {b['inizio']}"
assert NL[-1]["fine"] <= DUR_STORY + 0.05, "l'ultima battuta supera la storia"


# ------------------------------------------------------------------ sottotitoli e marchio
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


def subtitle_at(t):
    sub = None
    for n in NL:
        if n["inizio"] - 0.05 <= t <= n["fine"] + 0.25:
            sub = (None, n["testo"], (250, 250, 245))
    for b in cue["battute"]:
        if b["inizio"] - 0.05 <= t <= b["fine"] + 0.3:
            sub = (b["chi"].capitalize(), b["testo"], (255, 214, 90))
    return sub


def overlay(im, t):
    sub = subtitle_at(t)
    if not sub:
        return im
    d = ImageDraw.Draw(im, "RGBA")
    f = ImageFont.truetype(FB, 46)
    ft = ImageFont.truetype(FS, 26)
    lines = wrap(d, sub[1], f, 900)
    h = 60 * len(lines) + (70 if sub[0] else 40)
    y0 = 1640 - h
    d.rounded_rectangle([60, y0, 1020, 1640], 20, fill=(15, 15, 15, 205))
    if sub[0]:
        d.text((90, y0 + 22), sub[0], font=ft, fill=(190, 190, 190))
    for i, ln in enumerate(lines):
        d.text((540, y0 + (82 if sub[0] else 52) + 60 * i), ln, font=f, fill=sub[2], anchor="mm")
    return im


def brand_card(k):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "SPESORA_ADS_STUDIO", "scripts"))
    from outro import BG, logo_layer
    im = Image.new("RGB", (W, H), BG)
    lg = logo_layer()
    s = 0.36
    lg = lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)
    a = max(0.0, min(1.0, k * 3))
    lg.putalpha(lg.getchannel("A").point(lambda v: int(v * a)))
    im.paste(lg, (W // 2 - lg.width // 2, int(H * 0.46) - lg.height // 2), lg)
    return im


# ------------------------------------------------------------------ sintesi dei suoni
def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def lp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), btype="low")
    return lfilter(b, a, x)


def noise(n):
    return rng.standard_normal(n)


def step_sound(kind, who, gain):
    """Passo su piastrelle: tonfo basso della suola + schiocco del tacco/gomma. Scarpe diverse per personaggio."""
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    hard = {"direttore": 1.0, "responsabile": 0.9, "cliente_signora": 0.7, "protagonista": 0.8}.get(who, 0.45)   # Luca e comparse: suola di gomma
    thump = np.sin(2 * np.pi * (110 + 20 * rng.random()) * t) * np.exp(-t * 55) * 0.5
    click = bp(noise(n), 1200, 4500) * np.exp(-t * (140 + 60 * rng.random())) * (0.25 + 0.45 * hard)
    squeak = 0.0
    y = (thump + click) * (0.8 + 0.4 * rng.random())
    if kind == "turn":
        y = y * 0.55
    return (y * gain).astype(np.float32)


def rolling(v, fps, t0, grit, gain, rattle):
    """Ruote che girano: rumore a banda larga con ampiezza proporzionale alla velocità + tasselli ogni 0,5 m di piastrella.
    Silenzio quando il carrello è fermo."""
    n = len(v)
    t_end = n / fps
    N_ = int(t_end * SR)
    spd = np.interp(np.arange(N_) / SR, np.arange(n) / fps, np.array(v))
    spd = lp(spd, 6, 1)
    amp = np.clip(spd / 1.2, 0, 1.4)
    body = lp(noise(N_), grit) * amp ** 1.3 * 0.5
    body += bp(noise(N_), 2500, 6500) * amp ** 2 * rattle
    dist = np.cumsum(spd) / SR
    tick_at = np.where(np.diff(np.floor(dist / 0.5)) > 0)[0]
    for i in tick_at:
        m = int(0.03 * SR)
        tt = np.arange(m) / SR
        c = bp(noise(m), 400, 2500) * np.exp(-tt * 180) * 0.35 * min(1.0, amp[i] * 1.5)
        body[i:i + m] += c[: max(0, N_ - i)][:m] if i + m <= N_ else c[: N_ - i]
    return (body * gain).astype(np.float32)


def thud(f0, dur, gain):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t) * np.exp(-t * (6 / dur)) * gain + bp(noise(n), 300, 2000) * np.exp(-t * (14 / dur)) * gain * 0.4).astype(np.float32)


def bell(freq, dur, gain, partials=((1, 1.0), (2.01, 0.4), (3.02, 0.2))):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * freq * m * t) for m, a in partials) * np.exp(-t * (4.0 / dur))
    return (y * gain / sum(a for _, a in partials)).astype(np.float32)


def beep(freq=2600, dur=0.09, gain=0.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) * np.minimum(1, t / 0.004) * np.minimum(1, (dur - t) / 0.01) * gain).astype(np.float32)


def rustle(dur, gain, lo=1800, hi=6000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (bp(noise(n), lo, hi) * np.sin(np.pi * t / dur) ** 2 * gain).astype(np.float32)


def make_audio():
    N = int(DUR * SR)
    narr = np.zeros(N, np.float32)
    for n in NL:
        i0 = int(round(n["inizio"] * SR))
        narr[i0:i0 + len(n["y"])] += n["y"][: max(0, N - i0)]
    sfx = np.zeros(N, np.float32)
    amb = np.zeros(N, np.float32)

    def put(buf, t, y, g=1.0):
        i0 = int(round(t * SR))
        if i0 < 0 or i0 >= N:
            return
        buf[i0:i0 + len(y)] += g * y[: max(0, N - i0)]

    shots = cue["inquadrature"]

    def in_cast(t, who):
        for s in shots:
            if s["inizio"] <= t < s["fine"]:
                return who in s["cast"]
        return False

    # passi: un suono per ogni appoggio reale del piede; fuori campo molto più bassi
    for e in EV["passi"]:
        g = 0.07 if in_cast(e["t"], e["a"]) else 0.012
        put(sfx, e["t"], step_sound(e["kind"], e["a"], g))
    sc = EV["scena"]
    # carrello e espositore: solo mentre si muovono
    c = sc["carrello"]
    put(sfx, c["t0"], rolling(c["v"], c["fps"], c["t0"], grit=900, gain=0.13, rattle=0.035))
    put(sfx, c["t0"] + len(c["v"]) / c["fps"], thud(140, 0.12, 0.05))                     # molla la maniglia
    e_ = sc["espositore"]
    put(sfx, e_["t0"], rolling(e_["v"], e_["fps"], e_["t0"], grit=650, gain=0.12, rattle=0.02))
    # porta: scatto della leva e cardine
    t_door = sc["porta"]["click"]
    put(sfx, t_door, (bp(noise(int(0.04 * SR)), 900, 5000) * np.exp(-np.arange(int(0.04 * SR)) / SR * 90) * 0.22).astype(np.float32))
    put(sfx, t_door + 0.07, (bp(noise(int(0.03 * SR)), 1500, 6000) * np.exp(-np.arange(int(0.03 * SR)) / SR * 110) * 0.14).astype(np.float32))
    cr = np.arange(int(0.8 * SR)) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(520 + 160 * np.sin(2 * np.pi * 2.3 * cr) + 90 * cr) / SR)
    creak = (sweep * (0.55 + 0.45 * bp(noise(len(cr)), 40, 140)) * np.minimum(1, cr / 0.08) * np.exp(-cr * 2.6) * 0.045).astype(np.float32)
    put(sfx, t_door + 0.15, creak)
    # cassa 2 che si apre: due note brevi
    put(amb, sc["cassa2_si_accende"], beep(1800, 0.16, 0.11))
    put(amb, sc["cassa2_si_accende"] + 0.2, beep(2250, 0.22, 0.10))
    # cartellina: scossa nei sobbalzi di Luca e passaggio di mano
    for tj in sc["sobbalzi_luca"]:
        put(sfx, tj, rustle(0.14, 0.05, 900, 4200))
        put(sfx, tj + 0.11, thud(900, 0.05, 0.04))
    put(sfx, sc["passaggio_cartellina"], thud(210, 0.09, 0.09))
    # manica nei gesti bruschi (spavento, sorpresa), saluto
    for tr, gr in ((63.38, 0.06), (79.1, 0.05), (89.9, 0.03), (20.5, 0.03)):
        put(sfx, tr, rustle(0.22, gr))
    put(sfx, sc["cenni_saluto"][0] - 0.15, rustle(0.16, 0.035))
    # qualche bip lontano di scanner (irregolari) e il gong dell'annuncio
    for tb in (14.0, 27.5, 39.0, 44.4, 46.2, 50.1, 53.0, 62.5):
        put(amb, tb, beep(2600, 0.085, 0.028))
    g1 = lp(bell(659, 1.1, 0.06), 3200)
    g2 = lp(bell(523, 1.5, 0.06), 3200)
    put(amb, sc["gong_annuncio"], g1.astype(np.float32))
    put(amb, sc["gong_annuncio"] + 0.55, g2.astype(np.float32))
    # nell'ufficio il negozio si sente appena: porta chiusa alle spalle
    k = int(70.9 * SR)
    amb[k:] = lp(amb[k:], 900) * 0.3
    # marchio finale: una nota di vetro discreta
    put(amb, DUR_STORY + 0.05, bell(880, 0.8, 0.05, ((1, 1.0), (1.5, 0.35))))
    # le battute: l'SFX scende di 3 dB sotto la voce (non la copre)
    env = np.zeros(N, np.float32)
    for n in NL:
        env[int(n["inizio"] * SR):int(n["fine"] * SR)] = 1.0
    env = lp(env, 8, 1)
    duck = 1.0 - 0.3 * np.clip(env, 0, 1)
    sfx *= duck
    amb *= duck
    dialogue = np.zeros(N, np.float32)       # voci dei personaggi da registrare
    music = np.zeros(N, np.float32)          # nessuna musica in questo episodio
    stems = dict(NARRATOR=narr, DIALOGUE=dialogue, SFX=sfx, MUSIC=music, AMBIENCE=amb)
    mix = narr + sfx + amb
    mix = np.tanh(mix * 1.0 / 0.95) * 0.95 if np.max(np.abs(mix)) > 0.95 else mix
    for name, y in stems.items():
        sf.write(os.path.join(OUT, "stem", f"EP01_{name}.wav"), y, SR, subtype="PCM_16")
    sf.write(os.path.join(OUT, "stem", "EP01_mix.wav"), mix.astype(np.float32), SR, subtype="PCM_16")
    sf.write(os.path.join(OUT, "stem", "EP01_mix_senza_narratore.wav"), (sfx + amb).astype(np.float32), SR, subtype="PCM_16")
    return stems, mix


# ------------------------------------------------------------------ video
def frame_path(i):
    return os.path.join(REN, "frames", f"EP01_{i + 1:06d}.png")


def check_frames():
    miss = [i for i in range(NF) if not os.path.exists(frame_path(i))]
    if miss:
        sys.exit(f"MONTAGGIO FERMATO: mancano {len(miss)} fotogrammi (primo: {miss[0] + 1}). Nessun buco viene riempito duplicando fotogrammi.")


def encode_video(subtitles, out):
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-framerate", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
                          "-movflags", "+faststart", "-an", out], stdin=subprocess.PIPE)
    for i in range(NF + NB_BRAND):
        if i < NF:
            im = Image.open(frame_path(i)).convert("RGB")
            if im.size != (W, H):
                im = im.resize((W, H), Image.LANCZOS)
        else:
            im = brand_card((i - NF) / NB_BRAND)
        if subtitles:
            im = overlay(im, i / FPS)
        p.stdin.write(im.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit("ffmpeg ha fallito")


def mux(video, wav, out, loud=True):
    af = ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"] if loud else []
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", wav, "-c:v", "copy", *af, "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
                    "-t", f"{DUR:.3f}", "-movflags", "+faststart", out], check=True)


def srt():
    def ts(t):
        return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)):03d}"
    rows = [(n["inizio"], n["fine"], n["testo"]) for n in NL] + [(b["inizio"], b["fine"], f"[{b['chi'].capitalize()}] {b['testo']}") for b in cue["battute"]]
    rows.sort()
    return "\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{x}\n" for i, (a, b, x) in enumerate(rows))


if __name__ == "__main__":
    check_frames()
    stems, mix = make_audio()
    open(os.path.join(OUT, "EP01.srt"), "w", encoding="utf-8").write(srt())
    json.dump(dict(durata_s=DUR, fps=FPS, fotogrammi=NF + NB_BRAND, narrazione=[{k: v for k, v in n.items() if k != "y"} for n in NL],
                   dialoghi_da_registrare=cue["battute"], stem=list(stems)), open(os.path.join(OUT, "timeline_voci.json"), "w"), ensure_ascii=False, indent=1)
    sub = os.path.join(OUT, "_video_sottotitoli.mp4")
    clean = os.path.join(OUT, "_video_pulito.mp4")
    encode_video(True, sub)
    encode_video(False, clean)
    mux(sub, os.path.join(OUT, "stem", "EP01_mix.wav"), os.path.join(OUT, "EP01_FINALE.mp4"))
    mux(clean, os.path.join(OUT, "stem", "EP01_mix.wav"), os.path.join(OUT, "EP01_FINALE_senza_sottotitoli.mp4"))
    mux(sub, os.path.join(OUT, "stem", "EP01_mix_senza_narratore.wav"), os.path.join(OUT, "EP01_senza_voce_narratore.mp4"), loud=False)
    os.remove(sub)
    os.remove(clean)
    print("ok", OUT)
