"""
Narrazione EP01 con la voce clonata (Qwen3-TTS Base, modalità ICL: audio di riferimento + sua trascrizione).

    python voice_clone_narration.py <frasi.json> <narrazione_ep01.json> <out_dir> [modello] [prese=3]

1. Il riferimento è fatto SOLO di frasi pulite (senza i versi estranei). Per ogni tono si usa il riferimento più adatto:
   calmo → frasi pacate (F05 + F08), neutro → racconto (F04 + F05), vivace → racconto più mosso (F04 + F06).
2. Per ogni battuta si generano più prese (semi diversi) e si sceglie con misure oggettive (voice_eval):
   testo esatto (WER = 0), nessun verso fuori dalle parole, voce più simile all'originale, enfasi vicina al tono richiesto.
3. Rifinitura coerente: silenzi tagliati, stesso volume per tutte le battute, compressione dolce sulle battute "calme"
   (riduce i picchi delle parole enfatizzate senza cambiare la voce).
"""
import json
import os
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
FRASI, COPIONE, OUT = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
MODEL = sys.argv[4] if len(sys.argv) > 4 else "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
TAKES = int(sys.argv[5]) if len(sys.argv) > 5 else 3
ONLY = os.environ.get("ONLY", "").split(",") if os.environ.get("ONLY") else None
os.makedirs(os.path.join(OUT, "prese"), exist_ok=True)
torch.set_num_threads(4)

fr = {f["id"]: f for f in json.load(open(FRASI))["frasi"]}
cop = json.load(open(COPIONE))
REF_SETS = {"calmo": ["F04", "F08"], "neutro": ["F04", "F05"], "vivace": ["F04", "F06"]}  # il riferimento calmo finisce sulla frase più piatta (F08)
TARGET_EXC = {"calmo": 2.8, "neutro": 3.6, "vivace": 4.3}  # escursione dell'intonazione desiderata (semitoni)

from qwen_tts import Qwen3TTSModel  # noqa: E402

t0 = time.time()
model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu", dtype=torch.float32)
print(f"modello {MODEL} caricato in {time.time() - t0:.0f} s", flush=True)
prompts = {}
for tone, ids in REF_SETS.items():
    parts = []
    for i in ids:
        a, sr = sf.read(fr[i]["file"], dtype="float32")
        parts += [a, np.zeros(int(0.35 * sr), np.float32)]
    prompts[tone] = model.create_voice_clone_prompt(ref_audio=(np.concatenate(parts[:-1]), sr), ref_text=" ".join(fr[i]["testo"] for i in ids))

ref_emb = V.embed(V.load(os.path.join(os.path.dirname(FRASI), "..", "narrazione_originale_pulita.wav")))
SEL = os.path.join(OUT, "selezione_prese.json")
old = {b["id"]: b for b in json.load(open(SEL))["battute"]} if os.path.exists(SEL) else {}
report = []
gen_time, gen_audio = 0.0, 0.0
for line in cop["battute"]:
    if ONLY and line["id"] not in ONLY:
        if line["id"] in old:
            report.append(old[line["id"]])
        continue
    n_takes = TAKES + (2 if line["tono"] == "calmo" else 0) + (2 if len(line["testo"].split()) <= 3 else 0)
    takes = []
    for k in range(n_takes):
        p = os.path.join(OUT, "prese", f"{line['id']}_presa{k + 1}.wav")
        if os.path.exists(p):  # presa già generata: si rivaluta soltanto
            dt = 0.0
        else:
            torch.manual_seed(1000 + k)
            t1 = time.time()
            wavs, sr = model.generate_voice_clone(text=line["testo"], language="Italian", voice_clone_prompt=prompts[line["tono"]])
            dt = time.time() - t1
            gen_time += dt
            gen_audio += len(wavs[0]) / sr
            sf.write(p, wavs[0], sr, subtype="PCM_16")
        ev = V.evaluate(p, line["testo"], ref_emb)
        ok = bool(ev["wer"] == 0 and ev["energia_fuori_parole_db"] < -24)
        score = ev["somiglianza"] * 10 - abs(ev["escursione_st"] - TARGET_EXC[line["tono"]]) * 0.8 - max(0.0, ev["salti_volume"] - 2.4)
        takes.append(dict(presa=k + 1, file=p, valida=ok, punteggio=round(float(score), 3), secondi_calcolo=round(dt, 1), **{kk: (float(vv) if isinstance(vv, (int, float)) or hasattr(vv, "item") else vv) for kk, vv in ev.items()}))
        print(line["id"], f"presa {k + 1}", "OK" if ok else "SCARTATA", {kk: ev[kk] for kk in ("wer", "somiglianza", "escursione_st", "energia_fuori_parole_db")}, f"{dt:.0f}s", flush=True)
    valid = [t for t in takes if t["valida"]] or takes
    best = max(valid, key=lambda t: t["punteggio"])
    report.append(dict(id=line["id"], testo=line["testo"], tono=line["tono"], scelta=best["presa"], tutte_scartate=not any(t["valida"] for t in takes), prese=takes))
    json.dump(dict(modello=MODEL, prese_per_battuta=TAKES, battute=report, rtf=round(gen_time / max(1e-6, gen_audio), 2)),
              open(os.path.join(OUT, "selezione_prese.json"), "w"), ensure_ascii=False, indent=1)
print(f"generazione: {gen_time:.0f} s per {gen_audio:.0f} s di audio (RTF {gen_time / max(1e-6, gen_audio):.1f})", flush=True)
