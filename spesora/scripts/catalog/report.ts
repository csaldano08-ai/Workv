/**
 * Rapporto del catalogo: conteggi, stati di revisione, copertura per profili alimentari.
 *   npm run catalog:report   → docs/COVERAGE.md
 */
import { writeFileSync } from 'node:fs';
import { CatalogIndex, claimViolations, validateCatalog } from '../../src/core/domain/catalog';
import { metaOf } from '../../src/core/domain/meta';
import { CATALOG } from '../../src/data/catalog';
import { coverageMatrix, MEALS, MIN_WEEKLY_VARIETY, preferenceCoverage, weakSpots } from '../../src/features/recipes/coverage';
import { matchesCourse } from '../../src/features/recipes/search';

const catalog = new CatalogIndex(CATALOG);
const recipes = CATALOG.recipes;
const validation = validateCatalog(CATALOG);
const editorial = {
  'Colazioni dolci e salate': recipes.filter((r) => r.mealTypes.includes('colazione')).length,
  'Primi, riso, cereali e zuppe': recipes.filter((r) => !r.mealTypes.includes('colazione') && matchesCourse(r, 'primi')).length,
  Secondi: recipes.filter((r) => !r.mealTypes.includes('colazione') && matchesCourse(r, 'secondi')).length,
  'Legumi, verdure e piatti unici': recipes.filter((r) => !r.mealTypes.includes('colazione') && !r.mealTypes.includes('spuntino') && !matchesCourse(r, 'primi') && !matchesCourse(r, 'secondi')).length,
  'Spuntini e merende (solo spuntino)': recipes.filter((r) => r.mealTypes.includes('spuntino') && !r.mealTypes.includes('colazione')).length,
};
const statuses: Record<string, number> = {};
const cuisines: Record<string, number> = {};
for (const r of recipes) {
  const m = metaOf(r);
  statuses[m.review.status] = (statuses[m.review.status] ?? 0) + 1;
  cuisines[m.cuisine] = (cuisines[m.cuisine] ?? 0) + 1;
}
const italian = recipes.filter((r) => metaOf(r).cuisine !== 'internazionale').length;
const timerWarnings = recipes.filter((r) => r.steps.reduce((s, x) => s + (x.timerMinutes ?? 0), 0) > r.totalMinutes).map((r) => `${r.id} (timer ${r.steps.reduce((s, x) => s + (x.timerMinutes ?? 0), 0)}′ / totale ${r.totalMinutes}′)`);
const rows = coverageMatrix(catalog);
const weak = weakSpots(rows);
const pct = (n: number) => `${Math.round((n / recipes.length) * 100)}%`;

let md = `# Copertura del catalogo\n\nGenerato da \`npm run catalog:report\`. Ricette: **${recipes.length}** · ingredienti: **${CATALOG.ingredients.length}** · validazione strutturale: **${validation.ok ? 'superata' : `${validation.errors.length} errori`}** · diciture vietate: **${recipes.filter((r) => claimViolations(r).length).length}**.\n\n`;
md += `## Distribuzione editoriale\n\n| Categoria | Ricette |\n| --- | ---: |\n${Object.entries(editorial).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\nUna ricetta può valere per più pasti. Cucina italiana (tradizionale, regionale, quotidiana): ${italian} (${pct(italian)}). ${Object.entries(cuisines).map(([k, v]) => `${k}: ${v}`).join(' · ')}.\n\n`;
md += `## Stato di revisione\n\n${Object.entries(statuses).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}\n\nNessuna ricetta è \`approved_for_release\`: serve una revisione culinaria umana (vedi docs/REVIEW.md).\n\n`;
md += `## Ricette compatibili per profilo e pasto\n\nStessi vincoli rigidi del motore (dieta, allergeni esclusi, allergeni non verificati). Tutti gli strumenti disponibili. Soglia di varietà settimanale: ${MIN_WEEKLY_VARIETY}.\n\n| Profilo | ${MEALS.join(' | ')} |\n| --- | ${MEALS.map(() => '---:').join(' | ')} |\n`;
md += rows.map((r) => `| ${r.label} | ${MEALS.map((m) => (r.counts[m] < MIN_WEEKLY_VARIETY ? `**${r.counts[m]}**` : String(r.counts[m]))).join(' | ')} |`).join('\n');
md += `\n\n## Preferenze leggere (pranzo/cena)\n\n${Object.entries(preferenceCoverage(catalog)).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n`;
md += `## Combinazioni sotto soglia\n\n${weak.length ? weak.map((w) => `- ${w}`).join('\n') : 'Nessuna.'}\n\nLe combinazioni sotto soglia non vengono risolte ignorando i vincoli: il calendario ripete le ricette compatibili o segnala i pasti senza ricetta. Priorità per le prossime ricette.\n\n`;
md += `## Tempi da verificare\n\nRicette in cui la somma dei timer supera il tempo totale (passaggi in parallelo o tempo sottostimato):\n\n${timerWarnings.length ? timerWarnings.map((w) => `- ${w}`).join('\n') : 'Nessuna.'}\n`;
writeFileSync(new URL('../../docs/COVERAGE.md', import.meta.url), md);
console.warn(`Ricette ${recipes.length}, combinazioni sotto soglia ${weak.length}, tempi da verificare ${timerWarnings.length}`);
