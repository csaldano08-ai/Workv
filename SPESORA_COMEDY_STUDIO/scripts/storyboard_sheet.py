"""
Tavola dello storyboard EP01: una vignetta per inquadratura con numero, tempi, descrizione e narrazione corrispondente.
    python storyboard_sheet.py <dir_render (con cue.json e storyboard/)> <out.jpg> [colonne]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

REN, OUT = sys.argv[1], sys.argv[2]
COLS = int(sys.argv[3]) if len(sys.argv) > 3 else 4
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FR = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
cue = json.load(open(os.path.join(REN, "cue.json")))
NARR = {b["id"]: b["testo"] for b in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio", "narrazione_ep01.json")))["battute"]}
narr_t = [(n["inizio"], n["id"]) for n in cue["narrazione"]]


def narr_in(t0, t1):
    out = []
    for i, (ts, nid) in enumerate(narr_t):
        te = narr_t[i + 1][0] if i + 1 < len(narr_t) else 999
        if ts < t1 and te > t0:
            out.append(nid)
    return out


def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if d.textlength((cur + " " + w).strip(), font=font) > maxw and cur:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


TW, TH = 300, 533
CAP = 250
shots = [s for s in cue["inquadrature"] if os.path.exists(os.path.join(REN, "storyboard", f"shot_{s['n']}.png"))]
rows = (len(shots) + COLS - 1) // COLS
M = 40
W = COLS * (TW + 24) + 2 * M - 24
H = rows * (TH + CAP + 24) + 2 * M + 70
im = Image.new("RGB", (W, H), (248, 246, 240))
d = ImageDraw.Draw(im)
fb, fr, fs, ft = ImageFont.truetype(FB, 22), ImageFont.truetype(FR, 15), ImageFont.truetype(FB, 15), ImageFont.truetype(FB, 30)
d.text((M, 22), "EP01 · L'uomo che diventò direttore del supermercato · storyboard (fotogrammi dal blockout 3D)", font=ft, fill=(20, 20, 20))
for i, s in enumerate(shots):
    r, c = divmod(i, COLS)
    x, y = M + c * (TW + 24), M + 60 + r * (TH + CAP + 24)
    th = Image.open(os.path.join(REN, "storyboard", f"shot_{s['n']}.png")).convert("RGB").resize((TW, TH), Image.LANCZOS)
    im.paste(th, (x, y))
    d.rectangle([x - 1, y - 1, x + TW, y + TH], outline=(40, 40, 40), width=2)
    d.rounded_rectangle([x + 8, y + 8, x + 78, y + 40], 8, fill=(20, 20, 20))
    d.text((x + 43, y + 24), s["n"], font=fb, fill=(255, 255, 255), anchor="mm")
    cy = y + TH + 10
    d.text((x, cy), f"{s['inizio']:.1f}–{s['fine']:.1f} s · {s['fine'] - s['inizio']:.1f} s · lente {s['lente']} mm", font=fs, fill=(90, 90, 90))
    cy += 24
    for ln in wrap(d, s["descrizione"], fs, TW)[:3]:
        d.text((x, cy), ln, font=fs, fill=(20, 20, 20))
        cy += 20
    ids = narr_in(s["inizio"], s["fine"])
    txt = " ".join(f"[{n}] {NARR[n]}" for n in ids)
    for b in cue["battute"]:
        if b["inizio"] < s["fine"] and b["fine"] > s["inizio"]:
            txt += f" {b['chi']}: «{b['testo']}» (voce da registrare)"
    lines = wrap(d, txt, fr, TW)
    for ln in lines[:7]:
        d.text((x, cy + 4), ln, font=fr, fill=(70, 70, 120))
        cy += 19
    if len(lines) > 7:
        d.text((x, cy + 4), "…", font=fr, fill=(70, 70, 120))
im.save(OUT, quality=88)
print(OUT, im.size)
