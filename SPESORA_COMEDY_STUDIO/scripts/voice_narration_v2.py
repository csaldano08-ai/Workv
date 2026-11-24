"""
Narrazione EP01, versione 2 (PROPOSTA, non definitiva): voce fornita dall'utente, Qwen3-TTS 1.7B Base (ICL).

    python voice_narration_v2.py <dir_frasi_pulite> <narrazione_ep01.json> <out_dir> [prese=3]

Differenze rispetto alla versione 1 (rifiutata: piatta, «senza effetto»), misurate nei suoi file:
- v1 usava il modello 0.6B; qui 1.7B.
- v1 prendeva come riferimento la frase più piatta dell'originale (F08) per le battute calme; qui il riferimento
  è il racconto naturale (F01 + F06 + F04), con le sue salite e discese.
- v1 comprimeva l'intonazione con PSOLA (2,2-2,8 semitoni di deviazione): era questo a renderla monotona.
  Qui l'intonazione NON viene toccata.
- v1 generava ogni battuta da sola (16 frasi staccate, ognuna con il suo attacco e la sua chiusa); qui si generano
  paragrafi interi, così le frasi si legano come in un racconto, e poi si tagliano nelle pause tra le frasi.
- Piccoli tocchi di testo, senza forzare: una pausa prima delle battute comiche («Il problema?», «nemmeno una cipolla»).
Scelta delle prese con misure (non posso ascoltare): testo esatto, nessun verso, voce simile all'originale,
intonazione NON più piatta dell'originale, velocità vicina all'originale.
"""
import json
import os
import re
import sys
import time

import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice_eval as V  # noqa: E402

# BLOCCO (audit 25/11): nessuna voce si genera senza autorizzazione esplicita di chi possiede la voce di riferimento.
# Le voci prodotte sono PROPOSTE, non definitive: la voce definitiva la sceglie l'utente.
if os.environ.get("VOCE_AUTORIZZATA") != "1":
    sys.exit("Generazione della voce bloccata: serve l'autorizzazione esplicita del proprietario della voce (VOCE_AUTORIZZATA=1).")
FR_DIR, COPIONE, OUT = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
TAKES = int(sys.argv[4]) if len(sys.argv) > 4 else 3
MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
os.makedirs(os.path.join(OUT, "prese"), exist_ok=True)
os.makedirs(os.path.join(OUT, "battute"), exist_ok=True)
torch.set_num_threads(4)

fr = {f["id"]: dict(f, file=os.path.join(FR_DIR, f["id"] + ".wav")) for f in json.load(open(os.path.join(FR_DIR, "frasi.json")))["frasi"]}
lines = {b["id"]: b for b in json.load(open(COPIONE))["battute"]}
# paragrafi: frasi che nel racconto si legano tra loro
PARAS = [["N01", "N02", "N03", "N04"], ["N05", "N06"], ["N07", "N08"], ["N09", "N10", "N11"], ["N12", "N13"], ["N14", "N15"], ["N16"]]
# tocchi di testo (solo punteggiatura: il copione resta identico)
TOUCH = {"N16": "Alla fine… non comprò nemmeno una cipolla.", "N08": "Non aveva ancora trovato… le cipolle."}
REF = ["F01", "F06", "F04"]

# misure dell'originale: l'intonazione della nuova voce non deve essere più piatta di questa
orig = {i: V.prosody(V.load(fr[i]["file"])) for i in fr}
orig_exc = [o["escursione_st"] for o in orig.values()]
EXC_MIN = float(np.percentile(orig_exc, 25))
orig_rate = []
for i in fr:
    y = V.load(fr[i]["file"])
    syl = len(re.findall(r"[aeiouàèéìòù]", fr[i]["testo"].lower()))
    orig_rate.append(syl / (len(y) / 16000))
RATE = float(np.median(orig_rate))
print("originale: deviazione intonazione", [round(x, 2) for x in orig_exc], "minimo accettato", round(EXC_MIN, 2), "sillabe/s", round(RATE, 2), flush=True)

from qwen_tts import Qwen3TTSModel  # noqa: E402

t0 = time.time()
model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu", dtype=torch.float32)
print(f"modello caricato in {time.time() - t0:.0f} s", flush=True)
parts, sr0 = [], None
for i in REF:
    a, sr0 = sf.read(fr[i]["file"], dtype="float32")
    parts += [a, np.zeros(int(0.45 * sr0), np.float32)]
prompt = model.create_voice_clone_prompt(ref_audio=(np.concatenate(parts[:-1]), sr0), ref_text=" ".join(fr[i]["testo"] for i in REF))
ref_emb = V.embed(V.load(os.path.join(FR_DIR, "..", "narrazione_originale_pulita.wav")))


def split_by_words(y, sr, words, ids):
    """Taglia il paragrafo nelle pause tra le frasi, usando i tempi delle parole riconosciute."""
    counts = [len(V.norm(lines[i]["testo"])) for i in ids]
    toks = []
    for w in words:
        for _ in V.norm(w.word):
            toks.append(w)
    bounds, k = [], 0
    for c in counts[:-1]:
        k += c
        if k >= len(toks):
            return None
        prev_end, next_start = toks[k - 1].end, toks[k].start
        bounds.append((prev_end, next_start))
    cuts = [0.0] + [(a + b) / 2 for a, b in bounds] + [len(y) / sr]
    out = []
    for j, i in enumerate(ids):
        a, b = int(cuts[j] * sr), int(cuts[j + 1] * sr)
        seg = y[a:b].copy()
        f = int(0.012 * sr)
        if len(seg) > 2 * f:
            seg[:f] *= np.linspace(0, 1, f)
            seg[-f:] *= np.linspace(1, 0, f)
        out.append((i, seg, (bounds[j - 1][1] - cuts[j]) if j > 0 else None))
    return out


def trim(seg, sr, thr_db=-42, pad=0.06):
    e = np.abs(seg)
    lvl = np.max(e) * 10 ** (thr_db / 20)
    idx = np.where(e > lvl)[0]
    if not len(idx):
        return seg
    a, b = max(0, idx[0] - int(pad * sr)), min(len(seg), idx[-1] + int(pad * sr))
    return seg[a:b]


def stray_outside(path):
    """Energia fuori dal parlato (versi, rumori) in dB rispetto al parlato. Whisper chiude l'ultima parola ~0,2 s prima della
    fine reale del suono: si esclude una coda di 0,3 s dopo l'ultima parola e 0,15 s prima della prima (code naturali della voce)."""
    y = V.load(path)
    _, words = V.transcribe(y)
    if not words:
        return 0.0
    a, b = int(max(0, words[0].start - 0.15) * 16000), int((words[-1].end + 0.3) * 16000)
    out = np.concatenate([y[:a], y[b:]])
    if len(out) < 1600:
        return -60.0
    win = 800
    e = [np.sqrt(np.mean(out[i:i + win] ** 2)) for i in range(0, len(out) - win, win // 2)]
    ref = np.sqrt(np.mean(y[a:b] ** 2)) + 1e-9
    return round(float(20 * np.log10(max(e) / ref + 1e-9)), 1) if e else -60.0


report = []
gen_t, gen_a = 0.0, 0.0
for ids in PARAS:
    text = " ".join(TOUCH.get(i, lines[i]["testo"]) for i in ids)
    pid = "_".join(ids)
    takes = []
    for k in range(TAKES + (1 if len(ids) == 1 else 0)):
        p = os.path.join(OUT, "prese", f"{pid}_presa{k + 1}.wav")
        dt = 0.0
        if not os.path.exists(p):
            torch.manual_seed(2000 + k)
            t1 = time.time()
            wavs, sr = model.generate_voice_clone(text=text, language="Italian", voice_clone_prompt=prompt, temperature=0.85)
            dt = time.time() - t1
            gen_t += dt
            gen_a += len(wavs[0]) / sr
            sf.write(p, wavs[0], sr, subtype="PCM_16")
        ev = V.evaluate(p, " ".join(lines[i]["testo"] for i in ids), ref_emb)
        ev["energia_fuori_parlato_db"] = stray_outside(p)
        ok = bool(ev["wer"] == 0 and ev["energia_fuori_parlato_db"] < -24)
        flat = max(0.0, EXC_MIN - ev["escursione_st"])
        score = ev["somiglianza"] * 10 - flat * 1.5 - abs(ev["sillabe_al_s"] - RATE) * 0.6
        takes.append(dict(presa=k + 1, file=p, valida=ok, punteggio=round(float(score), 3), secondi_calcolo=round(dt, 1),
                          **{kk: (float(vv) if hasattr(vv, "item") or isinstance(vv, (int, float)) else vv) for kk, vv in ev.items()}))
        print(pid, f"presa {k + 1}", "OK" if ok else "SCARTATA", {kk: ev[kk] for kk in ("wer", "somiglianza", "escursione_st", "sillabe_al_s", "energia_fuori_parlato_db")}, f"{dt:.0f}s", flush=True)
    valid = [t for t in takes if t["valida"]] or [t for t in takes if t["wer"] == 0] or takes   # mai una presa col testo sbagliato se ce n'è una giusta
    best = max(valid, key=lambda t: t["punteggio"])
    y, sr = sf.read(best["file"], dtype="float32")
    _, words = V.transcribe(V.load(best["file"]))
    pieces = split_by_words(y, sr, words, ids)
    if pieces is None:
        pieces = [(ids[0], y, None)] if len(ids) == 1 else None
    for (i, seg, gap) in (pieces or []):
        seg = trim(seg, sr)
        sf.write(os.path.join(OUT, "battute", f"EP01_{i}_narratore.wav"), seg, sr, subtype="PCM_16")
    report.append(dict(paragrafo=ids, testo=text, scelta=best["presa"], tutte_scartate=not any(t["valida"] for t in takes),
                       diviso=pieces is not None, prese=takes))
    json.dump(dict(modello=MODEL, riferimento=REF, deviazione_minima_st=round(EXC_MIN, 2), sillabe_al_s_originale=round(RATE, 2),
                   paragrafi=report, rtf=round(gen_t / max(1e-6, gen_a), 2)),
              open(os.path.join(OUT, "selezione_prese_v2.json"), "w"), ensure_ascii=False, indent=1)
print(f"generazione: {gen_t:.0f} s per {gen_a:.0f} s di audio (RTF {gen_t / max(1e-6, gen_a):.1f})", flush=True)

# livello uniforme (RMS del parlato) e traccia continua con le pause del racconto; marcatori per il montaggio
files = sorted(os.listdir(os.path.join(OUT, "battute")))
lv = []
for f in files:
    a, sr = sf.read(os.path.join(OUT, "battute", f), dtype="float32")
    act = a[np.abs(a) > 0.02]
    lv.append(np.sqrt(np.mean(act ** 2)) if len(act) else 1.0)
target = float(np.median(lv))
track, marks, t = [], [], 0.4
PAUSE = {"N01": 0.55, "N02": 0.45, "N03": 0.2, "N04": 0.7, "N05": 0.5, "N06": 0.7, "N07": 0.6, "N08": 0.9, "N09": 0.35, "N10": 0.35,
         "N11": 0.8, "N12": 0.5, "N13": 0.8, "N14": 0.5, "N15": 0.9}
for f, l in zip(files, lv):
    a, sr = sf.read(os.path.join(OUT, "battute", f), dtype="float32")
    a = np.clip(a * min(4.0, target / l), -0.97, 0.97)
    sf.write(os.path.join(OUT, "battute", f), a, sr, subtype="PCM_16")
    i = f.split("_")[1]
    marks.append(dict(id=i, inizio=round(t, 3), fine=round(t + len(a) / sr, 3), testo=lines[i]["testo"]))
    if not track:
        track.append(np.zeros(int(0.4 * sr), np.float32))
    track += [a, np.zeros(int(PAUSE.get(i, 0.6) * sr), np.float32)]
    t += len(a) / sr + PAUSE.get(i, 0.6)
sf.write(os.path.join(OUT, "EP01_narrazione_v2_PROPOSTA.wav"), np.concatenate(track), sr, subtype="PCM_16")
json.dump(dict(nota="proposta, non definitiva: tempi della traccia continua; nel montaggio le battute si ricollocano sui marcatori delle inquadrature",
               marcatori=marks), open(os.path.join(OUT, "marcatori_narrazione_v2.json"), "w"), ensure_ascii=False, indent=1)
print("ok", len(files), "battute", round(t, 1), "s")
