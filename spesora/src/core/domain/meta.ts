import type { CatalogIndex } from './catalog';
import type { CookingMethod, Recipe, RecipeMeta, Season } from './types';
import { LEGACY_META } from '../../data/recipeMeta_legacy';

/** Metadati della ricetta: inline (nuove ricette), mappa legacy (prime 156) o derivati prudenti. */
export function metaOf(recipe: Recipe): RecipeMeta {
  return recipe.meta ?? LEGACY_META[recipe.id] ?? derivedMeta(recipe);
}

function derivedMeta(recipe: Recipe): RecipeMeta {
  const method: CookingMethod = recipe.equipment.includes('forno')
    ? 'forno'
    : recipe.equipment.includes('friggitrice_aria')
      ? 'friggitrice_aria'
      : recipe.cookMinutes === 0
        ? 'nessuna_cottura'
        : 'padella';
  return {
    cuisine: 'italiana_quotidiana',
    difficulty: recipe.totalMinutes <= 20 ? 1 : 2,
    taste: recipe.dishCategory === 'colazione_dolce' || recipe.dishCategory === 'frutta' ? 'dolce' : 'salato',
    method,
    review: { status: 'candidate', culinary: 'pending', allergens: 'derived', rights: 'original_text' },
  };
}

/** Ingrediente principale (per quantità a persona, esclusi i "q.b."): usato per alternare i piatti. */
export function mainIngredientOf(recipe: Recipe, catalog: CatalogIndex): string | null {
  let best: { id: string; w: number } | null = null;
  for (const ri of recipe.ingredients) {
    if (ri.toTaste || ri.qty === undefined) continue;
    const ing = catalog.ingredient(ri.ingredientId);
    if (ing.staple || ing.category === 'condimenti_spezie') continue;
    const w = (ri.qty * (ing.unit === 'pz' ? 100 : 1)) / recipe.baseServings;
    if (!best || w > best.w) best = { id: ing.id, w };
  }
  return best?.id ?? null;
}

export function isItalian(recipe: Recipe): boolean {
  return metaOf(recipe).cuisine !== 'internazionale';
}

/** Mese (1–12) → stagione astronomica approssimata, per suggerire piatti di stagione. */
export function seasonOfMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'primavera';
  if (month >= 6 && month <= 8) return 'estate';
  if (month >= 9 && month <= 11) return 'autunno';
  return 'inverno';
}
