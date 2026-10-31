/**
 * Elenco delle ricette per chi crea le immagini a mano (es. Google Flow).
 *   npx tsx scripts/images/export-list.ts
 * Scrive docs/RICETTE_IMMAGINI.md e docs/ricette_immagini.csv dal catalogo reale.
 */
import { writeFileSync } from 'node:fs';
import { CatalogIndex } from '../../src/core/domain/catalog';
import { CATALOG } from '../../src/data/catalog';
import { mainIngredients } from './prompts';
import { loadManifest } from './manifest';

const catalog = new CatalogIndex(CATALOG);
const manifest = loadManifest();
const done = (id: string) => ['validated', 'generated'].includes(manifest.recipes[id]?.status ?? '');
const missing: string[] = [];
const GROUPS: [string, (m: string[], c: string) => boolean][] = [
  ['Colazioni', (m) => m.includes('colazione')],
  ['Primi (pasta, riso, cereali, zuppe)', (m, c) => ['pasta', 'riso', 'cereali', 'zuppa'].includes(c)],
  ['Secondi (carne, pesce, uova)', (m, c) => ['carne', 'pesce', 'uova'].includes(c)],
  ['Legumi, verdure e piatti unici', (m, c) => ['legumi', 'verdure', 'pane'].includes(c) && !m.includes('spuntino')],
  ['Spuntini', () => true],
];
const seen = new Set<string>();
const rows: string[] = ['n;titolo;nome_file;ingredienti_principali;tipo;immagine'];
let md = `# Ricette da illustrare (${CATALOG.recipes.length})\n\nGenerato da \`scripts/images/export-list.ts\` dal catalogo reale.\n\n**Come salvare i file:** usa esattamente il *nome file* indicato (es. \`pasta_al_tonno.png\`), formato orizzontale 4:3, nessun testo nell'immagine. Poi metti tutti i file in una cartella e lancia \`npm run images -- import <cartella>\`: l'app li collega da sola alle ricette.\n`;
let n = 0;
for (const [title, test] of GROUPS) {
  const list = CATALOG.recipes.filter((r) => !seen.has(r.id) && test(r.mealTypes, r.dishCategory)).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  if (list.length === 0) continue;
  md += `\n## ${title} (${list.length})\n\n| # | Titolo | Nome file | Ingredienti principali | Immagine |\n| --- | --- | --- | --- | --- |\n`;
  for (const r of list) {
    seen.add(r.id);
    n++;
    const ingr = mainIngredients(r, catalog, 5).map((i) => i.name.toLowerCase()).join(', ');
    md += `| ${n} | ${r.name} | \`${r.id}.png\` | ${ingr} | ${done(r.id) ? 'fatta' : 'da creare'} |\n`;
    if (!done(r.id)) missing.push(`| ${missing.length + 1} | ${r.name} | \`${r.id}.png\` | ${ingr} | ${title} |`);
    rows.push([n, r.name, `${r.id}.png`, ingr, title, done(r.id) ? 'fatta' : 'da creare'].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  }
}
writeFileSync(new URL('../../docs/RICETTE_IMMAGINI.md', import.meta.url), md);
writeFileSync(new URL('../../docs/ricette_immagini.csv', import.meta.url), '﻿' + rows.join('\n') + '\n');
writeFileSync(
  new URL('../../docs/RICETTE_IMMAGINI_DA_CREARE.md', import.meta.url),
  `# Immagini da creare (${missing.length})\n\nRicette del catalogo senza immagine validata, generato da \`npm run catalog:export-images\`. Stesso stile e formato delle illustrazioni già approvate (docs/IMAGE_STYLE_REFERENCE.json), file PNG chiamati esattamente come indicato, nessun testo nell'immagine. Le immagini già validate non vanno rigenerate.\n\n| # | Titolo | Nome file | Ingredienti principali | Tipo |\n| --- | --- | --- | --- | --- |\n${missing.join('\n')}\n`,
);
console.warn(`Elenco: ${n} ricette, immagini da creare: ${missing.length}`);
