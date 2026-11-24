"""
Narrazione EP01 con una voce di riferimento fornita dall'utente, SENZA toccarne il tono (Qwen3-TTS 1.7B Base, modalità ICL).

    VOCE_AUTORIZZATA=1 python voice_narration_ref.py <riferimento.wav> <testo_del_riferimento.txt> <narrazione_ep01.json> <out_dir> [prese=3]

Regole (richiesta dell'utente, 24/11: «usa questa voce come base senza comprimere le emozioni o lo stile di parlata»):
- il riferimento è la registrazione intera, così com'è: niente tagli di respiri, niente filtri, niente scelta di frasi «calme»;
- nessuna elaborazione dell'intonazione o della dinamica sulle prese (niente PSOLA, niente compressione): solo taglio dei silenzi
  agli estremi e lo stesso guadagno per tutte le battute;
- nessun ritocco del testo (il copione resta identico, nessuna pausa aggiunta);
- si generano paragrafi interi, poi si tagliano nelle pause tra le frasi;
- scelta delle prese con misure (non posso ascoltare): testo esatto, nessun verso fuori dal parlato, timbro più vicino al
  riferimento, intonazione e velocità più VICINE a quelle del riferimento (né più piatte né più enfatiche).
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

# BLOCCO: nessuna voce si genera senza autorizzazione esplicita di chi possiede la voce di riferimento.
if os.environ.get("VOCE_AUTORIZZATA") != "1":
    sys.exit("Generazione della voce bloccata: serve l'autorizzazione esplicita del proprietario della voce (VOCE_AUTORIZZATA=1).")
REF_WAV, REF_TXT, COPIONE, OUT = sys.argv[1], sys.argv[2], sys.argv[3], os.path.abspath(sys.argv[4])
TAKES = int(sys.argv[5]) if len(sys.argv) > 5 else 3
MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
os.makedirs(os.path.join(OUT, "prese"), exist_ok=True)
os.makedirs(os.path.join(OUT, "battute"), exist_ok=True)
torch.set_num_threads(4)

lines = {b["id"]: b for b in json.load(open(COPIONE))["battute"]}
PARAS = [["N01", "N02", "N03", "N04"], ["N05", "N06"], ["N07", "N08"], ["N09", "N10", "N11"], ["N12", "N13"], ["N14", "N15"], ["N16"]]
ref_text = open(REF_TXT).read().strip()
ref16 = V.load(REF_WAV)
ref_pro = V.prosody(ref16)
ref_rate = len(re.findall(r"[aeiouàèéìòù]", ref_text.lower())) / (len(ref16) / 16000)
ref_emb = V.embed(ref16)
print("riferimento:", round(len(ref16) / 16000, 1), "s", ref_pro, "sillabe/s", round(ref_rate, 2), flush=True)

from qwen_tts import Qwen3TTSModel  # noqa: E402

t0 = time.time()
model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu", dtype=torch.float32)
print(f"modello caricato in {time.time() - t0:.0f} s", flush=True)
ra, rsr = sf.read(REF_WAV, dtype="float32")
prompt = model.create_voice_clone_prompt(ref_audio=(ra, rsr), ref_text=ref_text)


def stray_outside(y):
    """Energia fuori dal parlato in dB rispetto al parlato (code naturali escluse: Whisper chiude le parole in anticipo)."""
    _, words = V.transcribe(y)
    if not words:
        return 0.0
    a, b = int(max(0, words[0].start - 0.15) * 16000), int((words[-1].end + 0.35) * 16000)
    out = np.concatenate([y[:a], y[b:]])
    if len(out) < 1600:
        return -60.0
    win = 800
    e = [np.sqrt(np.mean(out[i:i + win] ** 2)) for i in range(0, len(out) - win, win // 2)]
    ref = np.sqrt(np.mean(y[a:b] ** 2)) + 1e-9
    return round(float(20 * np.log10(max(e) / ref + 1e-9)), 1) if e else -60.0


def split_by_words(y, sr, words, ids):
    counts = [len(V.norm(lines[i]["testo"])) for i in ids]
    toks = [w for w in words for _ in V.norm(w.word)]
    cuts, k = [0.0], 0
    for c in counts[:-1]:
        k += c
        if k >= len(toks):
            return None
        cuts.append((toks[k - 1].end + toks[k].start) / 2)
    cuts.append(len(y) / sr)
    out = []
    for j, i in enumerate(ids):
        seg = y[int(cuts[j] * sr):int(cuts[j + 1] * sr)].copy()
        f = int(0.012 * sr)
        if len(seg) > 2 * f:
            seg[:f] *= np.linspace(0, 1, f)
            seg[-f:] *= np.linspace(1, 0, f)
        out.append((i, seg))
    return out


def trim(seg, sr, thr_db=-42, pad=0.08):
    e = np.abs(seg)
    idx = np.where(e > np.max(e) * 10 ** (thr_db / 20))[0]
    if not len(idx):
        return seg
    return seg[max(0, idx[0] - int(pad * sr)):min(len(seg), idx[-1] + int(pad * sr))]


report, gen_t, gen_a = [], 0.0, 0.0
for ids in PARAS:
    text = " ".join(lines[i]["testo"] for i in ids)
    pid = "_".join(ids)
    takes = []
    for k in range(TAKES + (1 if len(ids) == 1 else 0)):
        p = os.path.join(OUT, "prese", f"{pid}_presa{k + 1}.wav")
        dt = 0.0
        if not os.path.exists(p):
            torch.manual_seed(3000 + k)
            t1 = time.time()
            wavs, sr = model.generate_voice_clone(text=text, language="Italian", voice_clone_prompt=prompt)
            dt = time.time() - t1
            gen_t += dt
            gen_a += len(wavs[0]) / sr
            sf.write(p, wavs[0], sr, subtype="PCM_16")
        y16 = V.load(p)
        hyp, words = V.transcribe(y16)
        pr = V.prosody(y16)
        syl = len(re.findall(r"[aeiouàèéìòù]", text.lower()))
        dur = (words[-1].end - words[0].start) if words else len(y16) / 16000
        ev = dict(testo_riconosciuto=hyp, wer=round(V.wer(text, hyp), 3), somiglianza=round(float(torch.dot(V.embed(y16), ref_emb)), 3),
                  energia_fuori_parlato_db=stray_outside(y16), sillabe_al_s=round(syl / max(0.3, dur), 2), **pr)
        ok = bool(ev["wer"] == 0 and ev["energia_fuori_parlato_db"] < -24)
        # vicinanza al modo di parlare del riferimento (né più piatta né più enfatica, né più lenta né più veloce)
        score = ev["somiglianza"] * 10 - abs(ev["escursione_st"] - ref_pro["escursione_st"]) * 0.8 - abs(ev["sillabe_al_s"] - ref_rate) * 0.6
        takes.append(dict(presa=k + 1, file=os.path.basename(p), valida=ok, punteggio=round(float(score), 3), secondi_calcolo=round(dt, 1),
                          **{kk: (float(vv) if hasattr(vv, "item") or isinstance(vv, (int, float)) else vv) for kk, vv in ev.items()}))
        print(pid, f"presa {k + 1}", "OK" if ok else "SCARTATA", {kk: ev[kk] for kk in ("wer", "somiglianza", "escursione_st", "sillabe_al_s", "energia_fuori_parlato_db")}, f"{dt:.0f}s", flush=True)
    valid = [t for t in takes if t["valida"]] or [t for t in takes if t["wer"] == 0] or takes
    best = max(valid, key=lambda t: t["punteggio"])
    y, sr = sf.read(os.path.join(OUT, "prese", best["file"]), dtype="float32")
    _, words = V.transcribe(V.load(os.path.join(OUT, "prese", best["file"])))
    pieces = split_by_words(y, sr, words, ids) if len(ids) > 1 else [(ids[0], y)]
    for (i, seg) in (pieces or []):
        sf.write(os.path.join(OUT, "battute", f"EP01_{i}_narratore.wav"), trim(seg, sr), sr, subtype="PCM_16")
    report.append(dict(paragrafo=ids, scelta=best["presa"], tutte_scartate=not any(t["valida"] for t in takes), diviso=pieces is not None, prese=takes))
    json.dump(dict(modello=MODEL, riferimento=os.path.basename(REF_WAV), riferimento_prosodia=ref_pro, riferimento_sillabe_al_s=round(ref_rate, 2),
                   elaborazioni="nessuna su intonazione e dinamica; solo taglio dei silenzi agli estremi e guadagno unico",
                   paragrafi=report, rtf=round(gen_t / max(1e-6, gen_a), 2)),
              open(os.path.join(OUT, "selezione_prese.json"), "w"), ensure_ascii=False, indent=1)
print(f"generazione: {gen_t:.0f} s per {gen_a:.0f} s di audio (RTF {gen_t / max(1e-6, gen_a):.1f})", flush=True)

# un solo guadagno per tutte le battute (stessa dinamica relativa del parlato generato), traccia continua di ascolto e marcatori
files = sorted(os.listdir(os.path.join(OUT, "battute")))
audio = {f: sf.read(os.path.join(OUT, "battute", f), dtype="float32") for f in files}
peak = max(np.max(np.abs(a)) for a, _ in audio.values())
g = 0.89 / peak
track, marks, t = [], [], 0.4
PAUSE = {"N01": 0.5, "N02": 0.4, "N03": 0.25, "N04": 0.6, "N05": 0.45, "N06": 0.6, "N07": 0.5, "N08": 0.8, "N09": 0.35, "N10": 0.35,
         "N11": 0.7, "N12": 0.45, "N13": 0.7, "N14": 0.45, "N15": 0.8}
for f in files:
    a, sr = audio[f]
    a = a * g
    sf.write(os.path.join(OUT, "battute", f), a, sr, subtype="PCM_16")
    i = f.split("_")[1]
    if not track:
        track.append(np.zeros(int(0.4 * sr), np.float32))
    marks.append(dict(id=i, inizio=round(t, 3), fine=round(t + len(a) / sr, 3), durata=round(len(a) / sr, 3), testo=lines[i]["testo"]))
    track += [a, np.zeros(int(PAUSE.get(i, 0.6) * sr), np.float32)]
    t += len(a) / sr + PAUSE.get(i, 0.6)
sf.write(os.path.join(OUT, "EP01_narrazione_completa.wav"), np.concatenate(track), sr, subtype="PCM_16")
json.dump(dict(nota="tempi della traccia continua di ascolto; nel montaggio le battute si collocano sui marcatori delle inquadrature", marcatori=marks),
          open(os.path.join(OUT, "marcatori.json"), "w"), ensure_ascii=False, indent=1)
print("ok", len(files), "battute", round(t, 1), "s")
