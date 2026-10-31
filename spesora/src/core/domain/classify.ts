import type { CatalogIndex } from './catalog';
import type { Like, Recipe, WeekStyle } from './types';

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

export const LIKE_LABELS: Record<Like, string> = {
  pesce: 'Piatti di pesce',
  legumi: 'Legumi',
  vegetali: 'Preparazioni vegetali',
  proteiche: 'Con carne, pesce, uova, legumi o tofu',
  primi: 'Primi piatti',
  secondi: 'Secondi piatti',
  piatti_unici: 'Piatti unici',
  bowl: 'Insalatone e bowl',
  cene_veloci: 'Cene veloci',
  colazioni_salate: 'Colazioni salate',
  colazioni_dolci: 'Colazioni dolci',
};

export const WEEK_STYLE_LABELS: Record<WeekStyle, string> = {
  pratica: 'Molto pratica',
  varia: 'Varia',
  economica: 'Ingredienti economici e riutilizzabili',
  proteica: 'Più carne, pesce, uova o legumi',
  vegetariana: 'Più vegetariana',
  veloce: 'Più veloce',
};
