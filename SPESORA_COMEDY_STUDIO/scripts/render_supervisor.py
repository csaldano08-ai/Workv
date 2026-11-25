"""
Supervisore del rendering di EP01: render a fotogrammi singoli, ripristinabile dopo un riavvio del container.

    python render_supervisor.py <cartella_di_lavoro> <config.json>

La cartella di lavoro contiene:
  frames/EP01_000001.png … EP01_002808.png   un file per fotogramma, scritto in modo atomico (prima .part.png, poi rinomina)
  manifest.json                               stato: previsti, completati, mancanti, chunk, tempi, preset
  heartbeat.txt                               ultimo istante in cui il supervisore era vivo (per il controllo periodico)
  timing.jsonl                                setup e render di ogni fotogramma (scritti dallo script di Blender)

All'avvio (anche dopo un riavvio del container):
  1. elimina i .part.png e i fotogrammi non decodificabili o di dimensione sbagliata (gli altri non si toccano);
  2. calcola i buchi e lancia UN processo di Blender con l'elenco dei fotogrammi mancanti (il setup della scena costa ~2,5 min:
     un processo per chunk lo pagherebbe 30 volte). Ogni fotogramma si salva appena completo;
  3. ogni 30 s riscrive manifest e heartbeat; se Blender termina con buchi ancora aperti, lo rilancia (max 20 volte).
I chunk (60-120 fotogrammi, qui config["chunk"]) servono alla contabilità e ai controlli del manifest.
"""
import json
import os
import subprocess
import sys
import time

from PIL import Image

WD = os.path.abspath(sys.argv[1])
CFG = json.load(open(sys.argv[2]))
N = CFG["fotogrammi"]                      # 2808
W, H = CFG["risoluzione"]
CH = CFG.get("chunk", 90)
FR = os.path.join(WD, "frames")
os.makedirs(FR, exist_ok=True)


def path(i):
    return os.path.join(FR, f"EP01_{i + 1:06d}.png")


def valid(i):
    p = path(i)
    if not os.path.exists(p):
        return False
    try:
        with Image.open(p) as im:
            if im.size != (W, H):
                return False
            im.load()
        return True
    except Exception:
        return False


VERIFIED = set()   # fotogrammi già decodificati con successo: non si ricontrollano a ogni giro (costerebbe CPU al rendering)


def scan(clean):
    ok, bad = [], []
    for i in range(N):
        if i in VERIFIED:
            ok.append(i)
        elif os.path.exists(path(i)):
            if valid(i):
                VERIFIED.add(i)
                ok.append(i)
            else:
                bad.append(i)
    if clean:
        for i in bad:
            os.remove(path(i))
        for f in os.listdir(FR):
            if f.endswith(".part.png"):
                os.remove(os.path.join(FR, f))
    done = set(ok)
    return done, bad


def write_manifest(done, state, extra=None):
    chunks = []
    for c0 in range(0, N, CH):
        c1 = min(N, c0 + CH)
        n = sum(1 for i in range(c0, c1) if i in done)
        chunks.append(dict(chunk=len(chunks) + 1, da=c0 + 1, a=c1, completati=n, totale=c1 - c0, ok=(n == c1 - c0)))
    tm = []
    tf = os.path.join(WD, "timing.jsonl")
    if os.path.exists(tf):
        for line in open(tf):
            try:
                tm.append(json.loads(line))
            except Exception:
                pass
    tail = tm[-60:]
    per = (sum(r["setup_s"] + r["render_s"] for r in tail) / len(tail)) if tail else None
    missing = N - len(done)
    m = dict(film="EP01 · L'uomo che diventò direttore del supermercato", fotogrammi_previsti=N, completati=len(done), mancanti=missing,
             risoluzione=[W, H], fps=30, stato=state, preset=CFG["preset"], chunk=chunks,
             secondi_per_fotogramma_ultimi_60=round(per, 2) if per else None,
             eta_ore=round(missing * per / 3600, 2) if per else None, aggiornato=time.strftime("%Y-%m-%d %H:%M:%S"))
    if extra:
        m.update(extra)
    tmp = os.path.join(WD, "manifest.json.tmp")
    json.dump(m, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, os.path.join(WD, "manifest.json"))
    open(os.path.join(WD, "heartbeat.txt"), "w").write(str(int(time.time())))


restarts = 0
while True:
    done, bad = scan(clean=True)
    write_manifest(done, "scansione", dict(scartati_all_avvio=len(bad)))
    if len(done) == N:
        write_manifest(done, "COMPLETO")
        print("COMPLETO", N, "fotogrammi validi", flush=True)
        break
    if restarts > 20:
        write_manifest(done, "FALLITO: troppi riavvii di Blender")
        sys.exit(2)
    missing = [i for i in range(N) if i not in done]
    env = dict(os.environ, **{k: str(v) for k, v in CFG["env"].items()})
    env["ADS_FRAMES"] = ",".join(str(i) for i in missing)
    env["ADS_NAMING"] = "ep"
    log = open(os.path.join(WD, "blender_log.txt"), "a")
    log.write(f"\n=== avvio {time.strftime('%F %T')} mancanti {len(missing)}\n")
    log.flush()
    proc = subprocess.Popen(CFG["comando"] + [WD], env=env, stdout=log, stderr=subprocess.STDOUT)
    while proc.poll() is None:
        time.sleep(30)
        done, _ = scan(clean=False)
        write_manifest(done, "rendering")
    restarts += 1
    print("Blender terminato con codice", proc.returncode, "— riscansione", flush=True)
