"""
Genera src/i18n/resources.ts dalle cartelle src/i18n/locales/<lingua>/<namespace>.json.
  python3 scripts/i18n/gen-resources.py
Per aggiungere una lingua: crea la cartella con TUTTI i namespace tradotti, aggiungila a SUPPORTED in
src/i18n/languages.ts, rigenera questo file e lancia `npx vitest run src/test/i18n.test.ts`.
I namespace sono quelli della lingua di origine (italiano).
"""
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'i18n')
LOC = os.path.join(ROOT, 'locales')
ORDER = ['it', 'en', 'es', 'de', 'fr', 'pt-BR']

langs = [l for l in ORDER if os.path.isdir(os.path.join(LOC, l))] + sorted(l for l in os.listdir(LOC) if l not in ORDER and os.path.isdir(os.path.join(LOC, l)))
ns = sorted(f[:-5] for f in os.listdir(os.path.join(LOC, 'it')) if f.endswith('.json'))
ns = ['common'] + [n for n in ns if n != 'common']
ident = lambda l: l.replace('-', '')

lines = ['/* File generato da scripts/i18n/gen-resources.py: non modificarlo a mano. */', '']
for l in langs:
    for n in ns:
        lines.append(f"import {ident(l)}_{n} from './locales/{l}/{n}.json';")
lines += ['', f'export const NAMESPACES = {json.dumps(ns)} as const;', 'export type Namespace = (typeof NAMESPACES)[number];', '', 'export const resources = {']
for l in langs:
    lines.append(f"  '{l}': {{ " + ', '.join(f'{n}: {ident(l)}_{n}' for n in ns) + ' },')
lines += ['} as const;', '']
with open(os.path.join(ROOT, 'resources.ts'), 'w') as f:
    f.write('\n'.join(lines))
print(f'{len(langs)} lingue, {len(ns)} namespace')
