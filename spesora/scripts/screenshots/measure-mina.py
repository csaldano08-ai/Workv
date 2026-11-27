"""
Confronto MISURATO riferimento ↔ app reale, schermata per schermata.
  python3 scripts/screenshots/measure-mina.py <cartella-screenshot> <cartella-uscita> [nomi...]
Il telefono del riferimento viene ritagliato sotto la barra di stato e dentro la cornice, poi portato a 390 pt di
larghezza (la stessa dell'app). Per ogni schermata: riferimento · app · sovrapposizione al 50%, con linee guida
orizzontali ogni 50 pt numerate: si leggono direttamente gli scarti di posizione degli elementi.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

# riferimento → screenshot dell'app
PAIRS = {
    '01_benvenuto': '01_benvenuto', '02_intro_chef': '02_benvenuto_chef', '03_pasti': '03_pasti', '04_persone': '04_persone',
    '05_anteprima': '05_anteprima', '06_paywall': '06_abbonamento', '07_home': '07_oggi', '08_settimana': '08_settimana',
    '09_spesa': '09_spesa', '10_dispensa': '10_dispensa', '11_ricette': '11_ricette', '12_ricetta': '12_ricetta', '13_profilo': '13_profilo',
}
W = 390


def ref_screen(name):
    im = Image.open(f'docs/mina/riferimenti/{name}.png').convert('RGB')
    w, h = im.size
    # dentro la cornice del telefono e sotto la barra di stato (≈ 5,3% dell'altezza nei ritagli del riferimento)
    box = (round(w * 0.025), round(h * 0.053), round(w * 0.975), h)
    im = im.crop(box)
    return im.resize((W, round(im.height * W / im.width)))


def main():
    shots, out = sys.argv[1], sys.argv[2]
    names = sys.argv[3:] or list(PAIRS)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
        bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
    except OSError:
        font = bold = ImageFont.load_default()
    for ref in names:
        r = ref_screen(ref)
        a = Image.open(f'{shots}/{PAIRS[ref]}.png').convert('RGB')
        a = a.resize((W, round(a.height * W / a.width)))
        H = min(max(r.height, a.height), 860)
        canvas = Image.new('RGB', (W * 3 + 24, H + 24), 'white')
        r2 = Image.new('RGB', (W, H), 'white'); r2.paste(r, (0, 0))
        a2 = Image.new('RGB', (W, H), 'white'); a2.paste(a, (0, 0))
        over = Image.blend(r2, a2, 0.5)
        for i, im in enumerate([r2, a2, over]):
            canvas.paste(im, (i * (W + 12), 24))
        d = ImageDraw.Draw(canvas)
        for i, t in enumerate(['Riferimento', 'App reale', 'Sovrapposizione 50%']):
            d.text((i * (W + 12) + 4, 4), f'{t} · {ref}', fill=(29, 74, 50), font=bold)
        for y in range(0, H, 50):
            for i in range(3):
                x0 = i * (W + 12)
                d.line([(x0, y + 24), (x0 + W, y + 24)], fill=(230, 80, 60), width=1)
                d.text((x0 + 2, y + 25), str(y), fill=(230, 80, 60), font=font)
        canvas.save(f'{out}/{ref}.png')
    print(len(names), 'confronti misurati')


main()
