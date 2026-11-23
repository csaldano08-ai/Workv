"""
Valutazione oggettiva delle prese vocali (chi lavora non può ascoltarle: servono misure).

- somiglianza della voce con il riferimento: embedding del parlante (microsoft/wavlm-base-plus-sv), coseno 0..1;
- correttezza del testo: trascrizione con Whisper (large-v3-turbo) confrontata con il testo atteso (WER);
- versi estranei: energia prima della prima parola e dopo l'ultima;
- enfasi: escursione dell'intonazione (deviazione standard di F0 in semitoni), salti di volume (picco/RMS),
  velocità (sillabe al secondo, stimate dalle vocali).
"""
import re
import unicodedata

import librosa
import numpy as np
import soundfile as sf
import torch

_SV = None
_ASR = None


def load(path, sr=16000):
    y, s = sf.read(path, dtype="float32")
    if y.ndim > 1:
        y = y.mean(1)
    return librosa.resample(y, orig_sr=s, target_sr=sr) if s != sr else y


def sv_model():
    global _SV
    if _SV is None:
        from transformers import AutoFeatureExtractor, WavLMForXVector
        fe = AutoFeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
        m = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv").eval()
        _SV = (fe, m)
    return _SV


def embed(y16):
    fe, m = sv_model()
    with torch.no_grad():
        inp = fe(y16, sampling_rate=16000, return_tensors="pt", padding=True)
        e = m(**inp).embeddings[0]
    return torch.nn.functional.normalize(e, dim=-1)


def similarity(y16, ref_emb):
    return float(torch.dot(embed(y16), ref_emb))


def asr():
    global _ASR
    if _ASR is None:
        from faster_whisper import WhisperModel
        _ASR = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=4)
    return _ASR


def norm(t):
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.replace("'", " ")
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    nums = {"4": "quattro", "1": "uno", "2": "due", "3": "tre"}
    return [nums.get(w, w) for w in t.split()]


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), int)
    d[:, 0] = range(len(r) + 1)
    d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / max(1, len(r))


def transcribe(y16):
    segs, _ = asr().transcribe(y16, language="it", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
    segs = list(segs)
    words = [w for s in segs for w in s.words]
    return " ".join(s.text.strip() for s in segs), words


def prosody(y16):
    f0, vflag, _ = librosa.pyin(y16, fmin=65, fmax=400, sr=16000, frame_length=1024, hop_length=160)
    f = f0[~np.isnan(f0)]
    st = 12 * np.log2(f / np.median(f)) if len(f) else np.array([0.0])
    rms = librosa.feature.rms(y=y16, frame_length=640, hop_length=160)[0]
    voiced = rms[rms > 0.02]
    peak_ratio = float(np.percentile(voiced, 98) / (np.median(voiced) + 1e-9)) if len(voiced) else 0.0
    return dict(f0_mediana_hz=round(float(np.median(f)) if len(f) else 0.0, 1), escursione_st=round(float(np.std(st)), 2),
                salti_volume=round(peak_ratio, 2))


def stray_energy(y16, words):
    """Energia fuori dalle parole (versi, respiri strani, rumori) in dB rispetto al parlato."""
    if not words:
        return 0.0
    a, b = int(max(0, words[0].start - 0.05) * 16000), int((words[-1].end + 0.08) * 16000)
    speech = y16[a:b]
    outside = np.concatenate([y16[:max(0, a)], y16[min(len(y16), b):]])
    if len(outside) < 1600:
        return -60.0
    win = 800
    e = [np.sqrt(np.mean(outside[i:i + win] ** 2)) for i in range(0, len(outside) - win, win // 2)]
    ref = np.sqrt(np.mean(speech ** 2)) + 1e-9
    return round(float(20 * np.log10(max(e) / ref + 1e-9)), 1) if e else -60.0


def evaluate(path, text, ref_emb):
    y = load(path)
    hyp, words = transcribe(y)
    syl = len(re.findall(r"[aeiouàèéìòù]", text.lower()))
    dur = (words[-1].end - words[0].start) if words else len(y) / 16000
    r = dict(testo_riconosciuto=hyp, wer=round(wer(text, hyp), 3), somiglianza=round(similarity(y, ref_emb), 3),
             energia_fuori_parole_db=stray_energy(y, words), sillabe_al_s=round(syl / max(0.3, dur), 2), durata_s=round(len(y) / 16000, 2))
    r.update(prosody(y))
    return r
