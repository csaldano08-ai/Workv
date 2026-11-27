"""
Confronti affiancati riferimento ↔ app reale (stessa larghezza, 390 pt).
  python3 scripts/screenshots/compare-mina.py <cartella-screenshot> <cartella-uscita>
Per ogni schermata: a sinistra il telefono del riferimento approvato, a destra lo screenshot dell'app vera.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

PAIRS = [
    ('01_benvenuto', '01_benvenuto'), ('02_intro_chef', '02_benvenuto_chef'), ('03_pasti', '03_pasti'),
    ('04_persone', '04_persone'), ('05_anteprima', '05_anteprima'), ('06_paywall', '06_abbonamento'),
    ('07_home', '07_oggi'), ('08_settimana', '08_settimana'), ('09_spesa', '09_spesa'), ('10_dispensa', '10_dispensa'),
    ('11_ricette', '11_ricette'), ('12_ricetta', '12_ricetta'), ('13_profilo', '13_profilo'),
]

def main():
    shots, out = sys.argv[1], sys.argv[2]
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    except OSError:
        font = ImageFont.load_default()
    tiles = []
    for ref, app in PAIRS:
        r = Image.open(f'docs/mina/riferimenti/{ref}.png').convert('RGB')
        r = r.resize((390, round(r.height * 390 / r.width)))
        a = Image.open(f'{shots}/{app}.png').convert('RGB')
        a = a.resize((390, round(a.height * 390 / a.width)))
        h = max(r.height, a.height) + 30
        t = Image.new('RGB', (390 * 2 + 12, h), 'white')
        d = ImageDraw.Draw(t)
        d.text((6, 6), f'Riferimento · {ref}', fill=(29, 74, 50), font=font)
        d.text((402, 6), 'App reale', fill=(29, 74, 50), font=font)
        t.paste(r, (0, 30))
        t.paste(a, (402, 30))
        t.save(f'{out}/{ref}.png')
        tiles.append(t)
    print(len(tiles), 'confronti')

main()
