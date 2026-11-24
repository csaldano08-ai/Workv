"""
Confronto affiancato: a sinistra la stessa azione nell'episodio rifiutato (Luca nota il protagonista, la lista mostrata,
il primo piano: 12,0–23,6 s), a destra il test di recitazione. Stessa durata, stessa scala, audio del test.
    python compare_test.py <animatic_senza_etichette.mp4> <test.mp4> <out.mp4> [t0=12.0]
(Il confronto richiesto con il video del matrimonio non è possibile finché il video non viene caricato.)
"""
import json
import subprocess
import sys

old, new, out = sys.argv[1], sys.argv[2], sys.argv[3]
t0 = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
dur = float(json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", new]))["format"]["duration"])
F = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
lab = "drawbox=x=0:y=0:w=iw:h=70:color=black@0.75:t=fill,drawtext=fontfile={f}:text='{t}':fontcolor=white:fontsize=26:x=(w-tw)/2:y=22"
flt = (f"[0:v]trim=start={t0}:duration={dur},setpts=PTS-STARTPTS,scale=540:960,{lab.format(f=F, t='PRIMA · episodio (15 img/s)')}[a];"
       f"[1:v]scale=540:960,{lab.format(f=F, t='DOPO · test (30 img/s)')}[b];[a][b]hstack=inputs=2[v]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", old, "-i", new, "-filter_complex", flt, "-map", "[v]", "-map", "1:a?",
                "-c:v", "libx264", "-crf", "21", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], check=True)
print("ok", out)
