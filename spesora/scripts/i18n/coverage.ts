/**
 * Copertura reale delle traduzioni, per lingua: testi dell'interfaccia (chiavi per namespace) e contenuti
 * (nomi degli ingredienti, nomi delle ricette, passaggi delle ricette). Scrive docs/i18n/COPERTURA.md.
 *   npx tsx scripts/i18n/coverage.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from '../../src/data/catalog';

const ROOT = join(__dirname, '..', '..');
const LOC = join(ROOT, 'src', 'i18n', 'locales');
const CONTENT = join(ROOT, 'src', 'i18n', 'content');
const LANGS = ['it', 'en', 'es', 'de', 'fr', 'pt-BR'];
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;

const namespaces = readdirSync(join(LOC, 'it'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .sort();
const itKeys = Object.fromEntries(namespaces.map((ns) => [ns, new Set(Object.keys(json(join(LOC, 'it', `${ns}.json`))).map(base))]));
const total = namespaces.reduce((s, ns) => s + itKeys[ns].size, 0);

const lines: string[] = [
  '# Mina — copertura delle traduzioni',
  '',
  'Generato da `npx tsx scripts/i18n/coverage.ts`. Conta solo testi realmente presenti nei file: nessuna stima.',
  '',
  '## Interfaccia',
  '',
  `Chiavi (senza le forme plurali) nella lingua di origine, l'italiano: **${total}**, in ${namespaces.length} namespace.`,
  '',
  `| Namespace | ${LANGS.join(' | ')} |`,
  `| --- | ${LANGS.map(() => '---').join(' | ')} |`,
];
const perLang: Record<string, number> = {};
for (const ns of namespaces) {
  const cells = LANGS.map((l) => {
    const keys = new Set(Object.keys(json(join(LOC, l, `${ns}.json`))).map(base));
    const n = [...itKeys[ns]].filter((k) => keys.has(k)).length;
    perLang[l] = (perLang[l] ?? 0) + n;
    return n === itKeys[ns].size ? `${n} ✅` : `${n}/${itKeys[ns].size}`;
  });
  lines.push(`| \`${ns}\` | ${cells.join(' | ')} |`);
}
lines.push(`| **Totale** | ${LANGS.map((l) => `**${perLang[l]}/${total}**`).join(' | ')} |`, '');

const recipeIds = CATALOG.recipes.map((r) => r.id);
const ingIds = CATALOG.ingredients.map((i) => i.id);
lines.push(
  '## Contenuti',
  '',
  `Catalogo in italiano: ${ingIds.length} ingredienti, ${recipeIds.length} ricette. Dove manca la traduzione si mostra l'italiano originale e, per il procedimento, l'app lo dichiara («disponibile solo in italiano»).`,
  '',
  '| Lingua | Nomi degli ingredienti | Nomi delle ricette | Procedimenti delle ricette |',
  '| --- | --- | --- | --- |',
  `| it | ${ingIds.length}/${ingIds.length} (originale) | ${recipeIds.length}/${recipeIds.length} (originale) | ${recipeIds.length}/${recipeIds.length} (originale) |`,
);
for (const l of LANGS.filter((x) => x !== 'it')) {
  const ing = json(join(CONTENT, l, 'ingredients.json')) as Record<string, string>;
  const rec = json(join(CONTENT, l, 'recipes.json')) as Record<string, { name?: string; steps?: string[] }>;
  const ni = ingIds.filter((id) => ing[id]).length;
  const nr = recipeIds.filter((id) => rec[id]?.name).length;
  const ns = recipeIds.filter((id) => (rec[id]?.steps?.length ?? 0) > 0).length;
  lines.push(`| ${l} | ${ni}/${ingIds.length} | ${nr}/${recipeIds.length} | ${ns}/${recipeIds.length} |`);
}
lines.push(
  '',
  '## Da far rivedere prima della pubblicazione',
  '',
  '- Pagine legali, condizioni commerciali e abbonamento: revisione legale per ogni mercato (la versione italiana prevale).',
  '- Nomi e avvisi sugli allergeni: revisione di una persona qualificata per ogni mercato.',
  '- Tutte le traduzioni: rilettura di un madrelingua (scritte con cura, non da traduzione automatica, ma non ancora riviste).',
  '',
);
writeFileSync(join(ROOT, 'docs', 'i18n', 'COPERTURA.md'), lines.join('\n'));
process.stdout.write(lines.join('\n'));
