import { CatalogIndex, normalizeText } from '../../core/domain/catalog';
import { isPiattoUnico } from '../../core/domain/classify';
import { metaOf, seasonOfMonth } from '../../core/domain/meta';
import { checkHardConstraints } from '../../core/domain/planner';
import type { Diet, MealType, PantryStock, Recipe, UserProfile } from '../../core/domain/types';

/**
 * Ricerca e filtri del ricettario. Indice testuale calcolato una sola volta per catalogo:
 * con 1.500 ricette una ricerca resta nell'ordine dei millisecondi.
 */

const indexCache = new WeakMap<CatalogIndex, Map<string, string>>();

export function searchIndex(catalog: CatalogIndex): Map<string, string> {
  let idx = indexCache.get(catalog);
  if (idx) return idx;
  idx = new Map();
  for (const r of catalog.catalog.recipes) {
    const parts = [r.name, r.description, ...r.ingredients.flatMap((i) => {
      const ing = catalog.ingredient(i.ingredientId);
      return [ing.name, ...ing.aliases];
    })];
    const meta = metaOf(r);
    if (meta.region) parts.push(meta.region);
    idx.set(r.id, normalizeText(parts.join(' ')));
  }
  indexCache.set(catalog, idx);
  return idx;
}

export type CourseFilter = 'primi' | 'secondi' | 'piatti_unici' | 'colazioni_dolci' | 'colazioni_salate' | 'spuntini';

export interface RecipeFilter {
  query?: string;
  meal?: MealType | null;
  diet?: Exclude<Diet, 'onnivoro'> | null;
  maxMinutes?: number | null;
  course?: CourseFilter | null;
  onlyFavorites?: boolean;
  /** Applica le esclusioni e la dieta del profilo (vincoli rigidi). */
  onlyCompatible?: boolean;
  /** Ingredienti da escludere scelti al momento nel ricettario. */
  excludeIngredients?: string[];
}

export interface FilterContext {
  catalog: CatalogIndex;
  profile: UserProfile | null;
  favorites: Set<string>;
}

export function matchesCourse(r: Recipe, course: CourseFilter): boolean {
  switch (course) {
    case 'primi':
      return ['pasta', 'riso', 'zuppa'].includes(r.dishCategory) || (r.dishCategory === 'cereali' && !isPiattoUnico(r));
    case 'secondi':
      return ['carne', 'pesce', 'uova'].includes(r.dishCategory);
    case 'piatti_unici':
      return isPiattoUnico(r);
    case 'colazioni_dolci':
      return r.mealTypes.includes('colazione') && metaOf(r).taste === 'dolce';
    case 'colazioni_salate':
      return r.mealTypes.includes('colazione') && metaOf(r).taste === 'salato';
    case 'spuntini':
      return r.mealTypes.includes('spuntino');
  }
}

export function filterRecipes(f: RecipeFilter, ctx: FilterContext): Recipe[] {
  const idx = searchIndex(ctx.catalog);
  const words = normalizeText(f.query ?? '').split(' ').filter((w) => w.length >= 2);
  const list = ctx.catalog.catalog.recipes.filter((r) => {
    if (f.meal && !r.mealTypes.includes(f.meal)) return false;
    if (f.maxMinutes && r.totalMinutes > f.maxMinutes) return false;
    if (f.course && !matchesCourse(r, f.course)) return false;
    if (f.onlyFavorites && !ctx.favorites.has(r.id)) return false;
    if (f.diet) {
      const facts = ctx.catalog.factsOf(r);
      if (f.diet === 'vegano' && !facts.vegan) return false;
      if (f.diet === 'vegetariano' && !facts.vegetarian) return false;
      if (f.diet === 'pescetariano' && !facts.pescatarian) return false;
    }
    if (f.excludeIngredients?.length && r.ingredients.some((i) => f.excludeIngredients!.includes(i.ingredientId))) return false;
    if (f.onlyCompatible && ctx.profile && checkHardConstraints(r, ctx.profile, ctx.catalog).length > 0) return false;
    if (words.length > 0) {
      const hay = idx.get(r.id) ?? '';
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  // Preferite in alto, poi titoli che contengono la ricerca, poi ordine alfabetico.
  const q = words.join(' ');
  return list.sort((a, b) => {
    const fa = ctx.favorites.has(a.id) ? 0 : 1;
    const fb = ctx.favorites.has(b.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (q) {
      const ta = normalizeText(a.name).includes(q) ? 0 : 1;
      const tb = normalizeText(b.name).includes(q) ? 0 : 1;
      if (ta !== tb) return ta - tb;
    }
    return a.name.localeCompare(b.name, 'it');
  });
}

export function quantifiedIngredients(r: Recipe): number {
  return r.ingredients.filter((i) => !i.toTaste).length;
}

export interface RecipeSection {
  id: string;
  title: string;
  recipes: Recipe[];
  filter: RecipeFilter;
}

/** Sezioni del ricettario, già filtrate sui vincoli del profilo. Massimo 12 ricette ciascuna. */
export function recipeSections(ctx: FilterContext & { pantry: PantryStock; plannedIds: Set<string>; today: string }): RecipeSection[] {
  const base: RecipeFilter = { onlyCompatible: true };
  const all = filterRecipes(base, ctx);
  const season = seasonOfMonth(Number(ctx.today.slice(5, 7)));
  const take = (list: Recipe[]) => list.slice(0, 12);
  const pantryScore = (r: Recipe) => r.ingredients.filter((i) => !i.toTaste && (ctx.pantry.get(i.ingredientId) ?? 0) > 0).length;
  const sections: RecipeSection[] = [
    {
      id: 'settimana',
      title: 'Idee per questa settimana',
      recipes: take(all.filter((r) => !ctx.plannedIds.has(r.id) && (metaOf(r).seasons?.includes(season) || ctx.favorites.has(r.id)))),
      filter: base,
    },
    {
      id: 'dispensa',
      title: 'Con ciò che hai in dispensa',
      recipes: take([...all].filter((r) => pantryScore(r) >= 2).sort((a, b) => pantryScore(b) - pantryScore(a))),
      filter: base,
    },
    { id: 'veloci', title: 'Pronto in 15 minuti', recipes: take(all.filter((r) => r.totalMinutes <= 15)), filter: { ...base, maxMinutes: 15 } },
    { id: 'pochi', title: 'Pochi ingredienti', recipes: take(all.filter((r) => quantifiedIngredients(r) <= 4)), filter: base },
    { id: 'italiani', title: 'Piatti italiani', recipes: take(all.filter((r) => metaOf(r).cuisine === 'italiana_tradizionale' || metaOf(r).cuisine === 'italiana_regionale')), filter: base },
    { id: 'unici', title: 'Piatti unici', recipes: take(all.filter((r) => isPiattoUnico(r))), filter: { ...base, course: 'piatti_unici' } },
    { id: 'colazioni_salate', title: 'Colazioni salate', recipes: take(all.filter((r) => matchesCourse(r, 'colazioni_salate'))), filter: { ...base, course: 'colazioni_salate' } },
  ];
  return sections.filter((s) => s.recipes.length > 0);
}
