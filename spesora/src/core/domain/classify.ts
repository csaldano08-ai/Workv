import type { CatalogIndex } from './catalog';
import { lazyLabels } from '../../i18n';
import { LIKES, WEEK_STYLES, type Like, type Recipe, type WeekStyle } from './types';

/** Classificazione delle ricette per i gusti dell'utente (derivata da categoria e ingredienti). */

const PRIMI = new Set(['pasta', 'riso', 'zuppa']);
const SECONDI = new Set(['carne', 'pesce', 'uova']);
const PROTEIN_CATEGORIES = new Set(['carne', 'pesce', 'uova', 'legumi']);
const PROTEIN_INGREDIENTS = new Set(['tofu', 'tempeh', 'edamame']);

export function isFishDish(recipe: Recipe, catalog: CatalogIndex): boolean {
  return recipe.dishCategory === 'pesce' || catalog.factsOf(recipe).allergens.some((a) => a === 'pesce' || a === 'crostacei' || a === 'molluschi');
}

/**
 * Segnale interno di preferenza: la ricetta contiene ingredienti comunemente usati come fonti
 * proteiche (carne, pesce, uova, legumi, tofu…). NON è una verifica nutrizionale e non autorizza
 * diciture come "fonte di proteine" (Reg. CE 1924/2006): vedi nutrition.ts.
 */
export function isProteinDish(recipe: Recipe): boolean {
  return PROTEIN_CATEGORIES.has(recipe.dishCategory) || recipe.ingredients.some((i) => PROTEIN_INGREDIENTS.has(i.ingredientId));
}

const LEGUME_INGREDIENTS = /^(ceci|fagioli|lenticchie|piselli|fave|lupini|edamame|hummus|farina_ceci)/;

export function isLegumeDish(recipe: Recipe): boolean {
  return recipe.dishCategory === 'legumi' || recipe.ingredients.some((i) => !i.toTaste && LEGUME_INGREDIENTS.test(i.ingredientId) && (i.qty ?? 0) / recipe.baseServings >= 40);
}

export function isBowl(recipe: Recipe): boolean {
  return /insalat|bowl/i.test(recipe.name);
}

export function isPiattoUnico(recipe: Recipe): boolean {
  return recipe.dishCategory === 'legumi' || recipe.dishCategory === 'cereali' || isBowl(recipe) || /piatto unico/i.test(recipe.description);
}

export function matchesLike(like: Like, recipe: Recipe, catalog: CatalogIndex, mealType: string): boolean {
  switch (like) {
    case 'pesce':
      return isFishDish(recipe, catalog);
    case 'legumi':
      return isLegumeDish(recipe);
    case 'vegetali':
      return catalog.factsOf(recipe).vegan;
    case 'proteiche':
      return isProteinDish(recipe);
    case 'primi':
      return PRIMI.has(recipe.dishCategory) || (recipe.dishCategory === 'cereali' && !isBowl(recipe));
    case 'secondi':
      return SECONDI.has(recipe.dishCategory);
    case 'piatti_unici':
      return isPiattoUnico(recipe);
    case 'bowl':
      return isBowl(recipe);
    case 'cene_veloci':
      return mealType === 'cena' && recipe.totalMinutes <= 20;
    case 'colazioni_salate':
      return mealType === 'colazione' && recipe.dishCategory === 'colazione_salata';
    case 'colazioni_dolci':
      return mealType === 'colazione' && recipe.dishCategory === 'colazione_dolce';
  }
}

/** Etichette tradotte (namespace `onboarding`): getter, sempre nella lingua corrente. */
export const LIKE_LABELS: Record<Like, string> = lazyLabels(LIKES, (k) => `onboarding:like.${k}`);

export const WEEK_STYLE_LABELS: Record<WeekStyle, string> = lazyLabels(WEEK_STYLES, (k) => `onboarding:weekStyle.${k}`);
