import { describe, expect, it } from 'vitest';
import { CatalogIndex, claimViolations, validateCatalog } from '../core/domain/catalog';
import { metaOf } from '../core/domain/meta';
import { foodInfo } from '../core/domain/nutrition';
import { generatePlan } from '../core/domain/planner';
import type { Catalog, Recipe } from '../core/domain/types';
import { CATALOG } from '../data/catalog';
import { LEGACY_META } from '../data/recipeMeta_legacy';
import { COVERAGE_PROFILES, coverageMatrix, MIN_WEEKLY_VARIETY, weakSpots } from '../features/recipes/coverage';
import { filterRecipes, recipeSections } from '../features/recipes/search';
import { catalog, profile } from './helpers';

const MONDAY = '2026-11-02';

describe('Catalogo ampliato — struttura e revisione', () => {
  it('contiene almeno 500 ricette con ID unici', () => {
    expect(CATALOG.recipes.length).toBeGreaterThanOrEqual(500);
    expect(new Set(CATALOG.recipes.map((r) => r.id)).size).toBe(CATALOG.recipes.length);
  });

  it('ogni ricetta ha metadati (inline o legacy) e nessuna è dichiarata approvata senza revisione umana', () => {
    for (const r of CATALOG.recipes) {
      const meta = r.meta ?? LEGACY_META[r.id];
      expect(meta, r.id).toBeDefined();
      expect(meta!.review.status).not.toBe('approved_for_release');
      expect(meta!.review.culinary).toBe('pending');
    }
    for (const id of Object.keys(LEGACY_META)) expect(catalog.recipes.has(id), id).toBe(true);
  });

  it('nessun timer di un passaggio supera il tempo totale dichiarato', () => {
    const bad = CATALOG.recipes.flatMap((r) => r.steps.filter((s) => (s.timerMinutes ?? 0) > r.totalMinutes).map(() => r.id));
    expect(bad).toEqual([]);
  });

  it('nessuna dicitura nutrizionale o salutistica non verificata nei testi', () => {
    expect(CATALOG.recipes.filter((r) => claimViolations(r).length > 0).map((r) => r.id)).toEqual([]);
  });

  it('le informazioni alimentari restano "non valutate" o "incomplete", mai verificate senza dati', () => {
    for (const r of CATALOG.recipes) {
      const info = foodInfo(r, catalog);
      expect(info.proteinClaim.status).toBe('not_assessed');
      expect(info.organic.status).toBe('not_assessed');
      expect(info.formulatedWithoutGluten.status).not.toBe('verified');
      expect(info.noAddedSweeteners.status).not.toBe('verified');
    }
    // una ricetta con frutta non è "senza zuccheri": al massimo "nessun ingrediente aggiunto per dolcificare"
    const fruit = CATALOG.recipes.find((r) => r.dishCategory === 'frutta' && foodInfo(r, catalog).noAddedSweeteners.value)!;
    expect(foodInfo(fruit, catalog).noAddedSweeteners.note).toMatch(/naturalmente presenti/);
  });

  it('compatibilità pescetariana: nessuna carne, pesce ammesso', () => {
    const p = profile({ diet: 'pescetariano' });
    const meals = generatePlan({ profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 3 }).meals;
    for (const m of meals) expect(catalog.factsOf(catalog.recipe(m.recipeId)!).pescatarian).toBe(true);
  });
});

describe('Copertura dei profili alimentari', () => {
  it('ogni profilo principale ha varietà sufficiente per una settimana a ogni pasto', () => {
    const rows = coverageMatrix(catalog);
    expect(rows).toHaveLength(COVERAGE_PROFILES.length);
    expect(weakSpots(rows)).toEqual([]);
    const vegan = rows.find((r) => r.label === 'Vegano')!;
    expect(vegan.counts.cena).toBeGreaterThanOrEqual(MIN_WEEKLY_VARIETY * 4);
  });

  it('un calendario vegetariano a 20 minuti non ripete legumi nella stessa forma', () => {
    const p = profile({ diet: 'vegetariano', days: profile().days.map((d) => ({ ...d, maxMinutes: 20 })), tastes: { likes: ['legumi', 'piatti_unici'], weekStyles: [] } });
    const meals = generatePlan({ profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 9 }).meals;
    expect(meals).toHaveLength(14);
    const families = meals.map((m) => metaOf(catalog.recipe(m.recipeId)!).family).filter(Boolean);
    expect(new Set(families).size).toBe(families.length);
    expect(new Set(meals.map((m) => m.recipeId)).size).toBe(14);
  });

  it('settimane successive cambiano grazie allo storico', () => {
    const p = profile();
    const w1 = generatePlan({ profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 1 }).meals;
    const history = w1.map((m) => ({ recipeId: m.recipeId, date: m.date, outcome: 'cooked' as const }));
    const w2 = generatePlan({ profile: p, catalog, startDate: '2026-11-09', days: 7, pantry: new Map(), history, favorites: new Set(), seed: 2 }).meals;
    const repeated = w2.filter((m) => w1.some((x) => x.recipeId === m.recipeId)).length;
    expect(repeated).toBeLessThanOrEqual(2);
  });
});

describe('Ricerca e filtri', () => {
  const ctx = { catalog, profile: profile(), favorites: new Set(['pasta_al_tonno']) };

  it('cerca per titolo, ingrediente e regione', () => {
    expect(filterRecipes({ query: 'carbonara' }, ctx).map((r) => r.id)).toContain('pasta_carbonara');
    expect(filterRecipes({ query: 'tonno' }, ctx).length).toBeGreaterThan(5);
    expect(filterRecipes({ query: 'sicilia' }, ctx).length).toBeGreaterThan(2);
    expect(filterRecipes({ query: 'zzzz inesistente' }, ctx)).toEqual([]);
  });

  it('filtra per dieta, tempo, portata ed esclusioni; le preferite vengono prima', () => {
    const vegan15 = filterRecipes({ diet: 'vegano', maxMinutes: 15 }, ctx);
    expect(vegan15.length).toBeGreaterThan(5);
    for (const r of vegan15) {
      expect(catalog.factsOf(r).vegan).toBe(true);
      expect(r.totalMinutes).toBeLessThanOrEqual(15);
    }
    expect(filterRecipes({ excludeIngredients: ['pasta_secca'], course: 'primi' }, ctx).every((r) => !r.ingredients.some((i) => i.ingredientId === 'pasta_secca'))).toBe(true);
    expect(filterRecipes({ query: 'pasta' }, ctx)[0].id).toBe('pasta_al_tonno');
    const noMilk = filterRecipes({ onlyCompatible: true }, { ...ctx, profile: profile({ excludedAllergens: ['latte'] }) });
    expect(noMilk.every((r) => !catalog.factsOf(r).allergens.includes('latte'))).toBe(true);
  });

  it('le sezioni del ricettario sono popolate e rispettano i vincoli', () => {
    const p = profile({ excludedAllergens: ['glutine'] });
    const sections = recipeSections({ catalog, profile: p, favorites: new Set(), pantry: new Map([['ceci_cotti', 400000], ['pomodori_pelati', 400000]]), plannedIds: new Set(), today: MONDAY });
    expect(sections.map((s) => s.id)).toEqual(expect.arrayContaining(['veloci', 'pochi', 'italiani', 'unici', 'colazioni_salate', 'dispensa']));
    for (const s of sections) for (const r of s.recipes) expect(catalog.factsOf(r).allergens).not.toContain('glutine');
  });
});

/** Catalogo sintetico: replica le ricette reali con ID e titoli nuovi per simulare 1.000–1.500 ricette. */
function scaled(n: number): Catalog {
  const out: Recipe[] = [];
  for (let i = 0; out.length < n; i++) {
    for (const r of CATALOG.recipes) {
      if (out.length >= n) break;
      out.push(i === 0 ? r : { ...r, id: `${r.id}_v${i}`, name: `${r.name} (variante ${i})`, meta: r.meta ? { ...r.meta, family: undefined } : undefined, dishCategory: r.dishCategory });
    }
  }
  return { ingredients: CATALOG.ingredients, recipes: out };
}

describe('Prestazioni con 500, 1.000 e 1.500 ricette', () => {
  for (const n of [500, 1000, 1500]) {
    it(`${n} ricette: indice, calendario e ricerca restano rapidi`, () => {
      const c = scaled(n);
      let t = performance.now();
      const idx = new CatalogIndex(c);
      const plan = generatePlan({ profile: profile({ mealTypes: ['colazione', 'pranzo', 'cena', 'spuntino'] }), catalog: idx, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 4 });
      const planMs = performance.now() - t;
      expect(plan.meals).toHaveLength(28);
      t = performance.now();
      const ctx = { catalog: idx, profile: profile(), favorites: new Set<string>() };
      filterRecipes({ query: 'pomodoro' }, ctx); // costruisce l'indice
      const t2 = performance.now();
      for (let i = 0; i < 20; i++) filterRecipes({ query: 'pomodoro zucchine', diet: 'vegetariano', maxMinutes: 30 }, ctx);
      const searchMs = (performance.now() - t2) / 20;
      // Soglie prudenti per macchine lente/CI: su iPhone 13 i tempi sono dello stesso ordine.
      expect(planMs).toBeLessThan(3000);
      expect(searchMs).toBeLessThan(150);
      if (n === 1500) expect(validateCatalog(c).errors.filter((e) => !e.includes('duplicato sostanziale'))).toEqual([]);
    });
  }
});
