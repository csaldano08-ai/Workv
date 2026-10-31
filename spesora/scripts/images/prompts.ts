import { createHash } from 'node:crypto';
import type { CatalogIndex } from '../../src/core/domain/catalog';
import type { DishCategory, Recipe } from '../../src/core/domain/types';
import { STYLE } from './config';

/** Costruzione dei prompt a partire dagli ingredienti reali della ricetta. */

const DISH_SHAPE: Record<DishCategory, string> = {
  pasta: 'a pasta dish served in a shallow ivory ceramic pasta bowl',
  riso: 'a rice dish (risotto or rice plate) served in a shallow ivory bowl',
  cereali: 'a grain-based dish served in a wide ceramic bowl',
  legumi: 'a legume dish served in a ceramic bowl',
  carne: 'a meat main course served on a flat ivory plate',
  pesce: 'a fish or seafood main course served on a flat ivory plate',
  uova: 'an egg dish served on a flat plate or in a small pan',
  verdure: 'a vegetable dish served on a ceramic plate',
  zuppa: 'a soup or velouté served in a deep ceramic soup bowl with a spoon beside it',
  pane: 'a bread-based dish (toast, bruschetta, wrap or flatbread) on a small board or plate',
  colazione_dolce: 'a sweet Italian breakfast served on a small plate or in a bowl, with a cup nearby',
  colazione_salata: 'a savory breakfast served on a small plate',
  frutta: 'a fruit-based snack served in a small bowl or plate',
};

export interface MainIngredient {
  id: string;
  name: string;
  grams: number;
}

/** Ingredienti principali (non "q.b."), ordinati per quantità a persona. */
export function mainIngredients(recipe: Recipe, catalog: CatalogIndex, limit = 6): MainIngredient[] {
  return recipe.ingredients
    .filter((ri) => !ri.toTaste && ri.qty !== undefined)
    .map((ri) => {
      const ing = catalog.ingredient(ri.ingredientId);
      // per confrontare g, ml e pezzi in modo approssimativo: 1 pezzo ≈ 100 g
      const grams = ((ri.qty ?? 0) * (ing.unit === 'pz' ? 100 : 1)) / recipe.baseServings;
      return { id: ing.id, name: ing.name, grams };
    })
    .sort((a, b) => b.grams - a.grams)
    .slice(0, limit);
}

export function buildRecipePrompt(recipe: Recipe, catalog: CatalogIndex, hasReference: boolean): string {
  const ingredients = mainIngredients(recipe, catalog)
    .map((i) => i.name.toLowerCase())
    .join(', ');
  const lines = [
    `Illustrate the Italian home-cooked dish "${recipe.name}" — ${DISH_SHAPE[recipe.dishCategory]}.`,
    `Recipe description (Italian): "${recipe.description}".`,
    `The dish must visibly contain these actual ingredients (Italian names): ${ingredients}. Do not add main ingredients that are not listed.`,
    'Show the finished, ready-to-eat dish exactly as a person would serve it at home.',
    STYLE.description,
    hasReference
      ? 'Match the illustration style, palette, lighting, texture and framing of the attached reference image, but depict this recipe, not the dish in the reference.'
      : '',
    STYLE.avoid,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildStylePrompt(): string {
  return [
    'Create the master style reference for a library of recipe illustrations.',
    'Subject: a simple Italian dish of spaghetti with cherry tomatoes and basil in an ivory ceramic pasta bowl, a linen napkin and two cherry tomatoes at the edge.',
    STYLE.description,
    STYLE.avoid,
  ].join('\n');
}

export function promptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}
