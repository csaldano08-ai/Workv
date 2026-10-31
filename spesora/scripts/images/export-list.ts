/**
 * Elenco delle ricette per chi crea le immagini a mano (es. Google Flow).
 *   npx tsx scripts/images/export-list.ts
 * Scrive docs/RICETTE_IMMAGINI.md e docs/ricette_immagini.csv dal catalogo reale.
 */
import { writeFileSync } from 'node:fs';
import { CatalogIndex } from '../../src/core/domain/catalog';
import { CATALOG } from '../../src/data/catalog';
import { mainIngredients } from './prompts';

const catalog = new CatalogIndex(CATALOG);
const GROUPS: [string, (m: string[], c: string) => boolean][] = [
  ['Colazioni', (m) => m.includes('colazione')],
  ['Primi (pasta, riso, cereali, zuppe)', (m, c) => ['pasta', 'riso', 'cereali', 'zuppa'].includes(c)],
  ['Secondi (carne, pesce, uova)', (m, c) => ['carne', 'pesce', 'uova'].includes(c)],
  ['Legumi, verdure e piatti unici', (m, c) => ['legumi', 'verdure', 'pane'].includes(c) && !m.includes('spuntino')],
  ['Spuntini', () => true],
];
const done = new Set<string>();
const rows: string[] = ['n;titolo;nome_file;ingredienti_principali;tipo'];
let md = `# Ricette da illustrare (${CATALOG.recipes.length})\n\nGenerato da \`scripts/images/export-list.ts\` dal catalogo reale.\n\n**Come salvare i file:** usa esattamente il *nome file* indicato (es. \`pasta_al_tonno.png\`), formato orizzontale 4:3, nessun testo nell'immagine. Poi metti tutti i file in una cartella e lancia \`npm run images -- import <cartella>\`: l'app li collega da sola alle ricette.\n`;
let n = 0;
for (const [title, test] of GROUPS) {
  const list = CATALOG.recipes.filter((r) => !done.has(r.id) && test(r.mealTypes, r.dishCategory)).sort((a, b) => a.name.localeCompare(b.name, 'it'));
  if (list.length === 0) continue;
  md += `\n## ${title} (${list.length})\n\n| # | Titolo | Nome file | Ingredienti principali |\n| --- | --- | --- | --- |\n`;
  for (const r of list) {
    done.add(r.id);
    n++;
    const ingr = mainIngredients(r, catalog, 5).map((i) => i.name.toLowerCase()).join(', ');
    md += `| ${n} | ${r.name} | \`${r.id}.png\` | ${ingr} |\n`;
    rows.push([n, r.name, `${r.id}.png`, ingr, title].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  }
}
writeFileSync(new URL('../../docs/RICETTE_IMMAGINI.md', import.meta.url), md);
writeFileSync(new URL('../../docs/ricette_immagini.csv', import.meta.url), '﻿' + rows.join('\n') + '\n');
console.warn(`Elenco: ${n} ricette`);
