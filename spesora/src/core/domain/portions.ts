import { scaleQty, toMilli } from './quantity';
import type { Appetite, Ingredient, MilliQty, PortionProfile, ProteinSize, Recipe, RecipeIngredient } from './types';

/**
 * Logica porzioni: personalizzazione di abitudine, NON un consiglio nutrizionale.
 *
 * Regole (semplici e spiegabili):
 * 1. Pasta (e simili) quando è l'ingrediente principale (≥ 55 g a persona nella ricetta):
 *    si usa esattamente la porzione abituale indicata (es. 70 g o 110 g a persona).
 *    Se è un ingrediente secondario (es. pastina nel minestrone) si scala in proporzione a 80 g.
 * 2. Riso e cereali in chicco: stessa regola, soglia 50 g, riferimento 70 g.
 * 3. Carne, pesce, tofu, tempeh (e uova nei piatti a base di uova): piccola ×0,8 · media ×1 · abbondante ×1,25.
 * 4. Tutto il resto (verdure, legumi, condimenti quantificati…): mangio poco ×0,9 · normale ×1 · tanto ×1,15.
 * Sesso, stile di vita e obiettivo NON entrano nei calcoli.
 */

export const PASTA_IDS = new Set(['pasta_secca', 'pasta_integrale', 'pasta_senza_glutine', 'pasta_uovo', 'gnocchi_patate', 'noodles_riso']);
export const RICE_IDS = new Set(['riso', 'riso_basmati', 'farro', 'orzo_perlato', 'bulgur', 'couscous', 'quinoa']);
const PROTEIN_IDS = new Set(['tofu', 'tempeh']);

export const PASTA_REFERENCE_G = 80;
export const RICE_REFERENCE_G = 70;
const PASTA_MAIN_THRESHOLD_G = 55;
const RICE_MAIN_THRESHOLD_G = 50;

export const PROTEIN_FACTOR: Record<ProteinSize, number> = { piccola: 0.8, media: 1, abbondante: 1.25 };
export const APPETITE_FACTOR: Record<Appetite, number> = { poco: 0.9, normale: 1, tanto: 1.15 };

export const DEFAULT_PORTIONS: PortionProfile = {
  gender: 'non_indicato',
  appetite: 'normale',
  lifestyle: 'attivo',
  goal: 'equilibrati',
  pastaGrams: 80,
  riceGrams: 70,
  proteinSize: 'media',
};

/** Porzioni suggerite (modificabili) quando l'utente sceglie l'appetito. */
export function suggestedPortions(appetite: Appetite, lifestyle: PortionProfile['lifestyle']): Pick<PortionProfile, 'pastaGrams' | 'riceGrams' | 'proteinSize'> {
  const base = appetite === 'poco' ? { pastaGrams: 70, riceGrams: 60, proteinSize: 'piccola' as const } : appetite === 'tanto' ? { pastaGrams: 100, riceGrams: 90, proteinSize: 'abbondante' as const } : { pastaGrams: 80, riceGrams: 70, proteinSize: 'media' as const };
  if (lifestyle === 'mi_alleno' && base.proteinSize !== 'abbondante') return { ...base, proteinSize: base.proteinSize === 'piccola' ? 'media' : 'abbondante' };
  return base;
}

export type PortionGroup = 'pasta' | 'riso' | 'proteina' | 'altro';

export function portionGroup(ing: Ingredient, recipe: Recipe): PortionGroup {
  if (PASTA_IDS.has(ing.id)) return 'pasta';
  if (RICE_IDS.has(ing.id)) return 'riso';
  if (ing.category === 'carne' || ing.category === 'pesce' || PROTEIN_IDS.has(ing.id)) return 'proteina';
  if (ing.allergens.includes('molluschi') || ing.allergens.includes('crostacei') || ing.allergens.includes('pesce')) return 'proteina';
  if (ing.id === 'uova' && recipe.dishCategory === 'uova') return 'proteina';
  return 'altro';
}

/**
 * Quantità di un ingrediente per un pasto (milli-unità), con le abitudini dell'utente se presenti.
 * Senza `portions` la ricetta resta esattamente come scritta (scalata solo per persone).
 */
export function ingredientNeed(recipe: Recipe, ri: RecipeIngredient, ing: Ingredient, servings: number, portions?: PortionProfile): MilliQty {
  if (ri.qty === undefined || ri.toTaste) return 0;
  const base = scaleQty(toMilli(ri.qty), servings, recipe.baseServings);
  if (!portions) return base;
  const perPerson = ri.qty / recipe.baseServings;
  switch (portionGroup(ing, recipe)) {
    case 'pasta':
      return perPerson >= PASTA_MAIN_THRESHOLD_G ? toMilli(portions.pastaGrams) * servings : Math.round((base * portions.pastaGrams) / PASTA_REFERENCE_G);
    case 'riso':
      return perPerson >= RICE_MAIN_THRESHOLD_G ? toMilli(portions.riceGrams) * servings : Math.round((base * portions.riceGrams) / RICE_REFERENCE_G);
    case 'proteina':
      return Math.round(base * PROTEIN_FACTOR[portions.proteinSize]);
    default:
      return Math.round(base * APPETITE_FACTOR[portions.appetite]);
  }
}

/** True se la quantità differisce dalla ricetta originale per effetto delle abitudini. */
export function isPersonalized(recipe: Recipe, ri: RecipeIngredient, ing: Ingredient, servings: number, portions?: PortionProfile): boolean {
  if (!portions || ri.qty === undefined) return false;
  return ingredientNeed(recipe, ri, ing, servings, portions) !== scaleQty(toMilli(ri.qty), servings, recipe.baseServings);
}
