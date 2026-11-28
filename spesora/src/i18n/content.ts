import type { Recipe } from '../core/domain/types';
import { currentLanguage } from './index';
import type { LanguageCode } from './languages';
import deIng from './content/de/ingredients.json';
import deRec from './content/de/recipes.json';
import enIng from './content/en/ingredients.json';
import enRec from './content/en/recipes.json';
import esIng from './content/es/ingredients.json';
import esRec from './content/es/recipes.json';
import frIng from './content/fr/ingredients.json';
import frRec from './content/fr/recipes.json';
import ptIng from './content/pt-BR/ingredients.json';
import ptRec from './content/pt-BR/recipes.json';

/**
 * Contenuti localizzati (ingredienti e ricette), separati dai testi dell'interfaccia.
 *
 * I contenuti originali sono in italiano (`src/data`). Ogni lingua ha due file:
 * - `content/<lingua>/ingredients.json`: { "<id ingrediente>": "nome" }
 * - `content/<lingua>/recipes.json`: { "<id ricetta>": { "name": "…", "steps"?: ["…"] } }
 *
 * Regola di ritorno (fallback), dichiarata all'utente: se un contenuto manca nella lingua scelta si mostra
 * l'ORIGINALE ITALIANO, mai una traduzione automatica. Una ricetta è «tradotta» solo se nome E tutti i passaggi
 * sono tradotti: altrimenti l'interfaccia lo segnala (`recipeLanguageNote`).
 * Gli avvisi sugli allergeni non vengono da qui: i nomi delle 14 categorie sono nei testi dell'interfaccia
 * (namespace `common`, chiavi `allergen.*`) e la classificazione resta quella dei dati verificati.
 */
type RecipeText = { name?: string; steps?: string[] };

const INGREDIENTS: Partial<Record<LanguageCode, Record<string, string>>> = { en: enIng, es: esIng, de: deIng, fr: frIng, 'pt-BR': ptIng };
const RECIPES: Partial<Record<LanguageCode, Record<string, RecipeText>>> = { en: enRec, es: esRec, de: deRec, fr: frRec, 'pt-BR': ptRec };

/** Nome dell'ingrediente nella lingua corrente; in mancanza, il nome italiano originale. */
export function ingredientName(id: string, italianName: string): string {
  const lang = currentLanguage();
  if (lang === 'it') return italianName;
  return INGREDIENTS[lang]?.[id] ?? italianName;
}

/** Nome della ricetta nella lingua corrente; in mancanza, il nome italiano originale. */
export function recipeName(recipe: Pick<Recipe, 'id' | 'name'>): string {
  const lang = currentLanguage();
  if (lang === 'it') return recipe.name;
  return RECIPES[lang]?.[recipe.id]?.name ?? recipe.name;
}

/** Testo del passaggio `index` nella lingua corrente, se la ricetta è tradotta per intero; altrimenti l'originale. */
export function recipeStep(recipe: Recipe, index: number): string {
  const lang = currentLanguage();
  const tr = lang === 'it' ? undefined : RECIPES[lang]?.[recipe.id];
  return tr?.steps && tr.steps.length === recipe.steps.length ? tr.steps[index] : recipe.steps[index].text;
}

export type RecipeLanguageStatus = 'original' | 'translated' | 'name-only' | 'not-translated';

/** Stato della traduzione di una ricetta nella lingua corrente. */
export function recipeLanguageStatus(recipe: Recipe): RecipeLanguageStatus {
  const lang = currentLanguage();
  if (lang === 'it') return 'original';
  const tr = RECIPES[lang]?.[recipe.id];
  if (tr?.name && tr.steps && tr.steps.length === recipe.steps.length) return 'translated';
  return tr?.name ? 'name-only' : 'not-translated';
}

/** Quante ricette e ingredienti sono tradotti per lingua (per il report di copertura). */
export function contentCoverage(lang: LanguageCode, recipeIds: readonly string[], ingredientIds: readonly string[]) {
  const ing = INGREDIENTS[lang] ?? {};
  const rec = RECIPES[lang] ?? {};
  return {
    ingredients: ingredientIds.filter((id) => ing[id]).length,
    recipeNames: recipeIds.filter((id) => rec[id]?.name).length,
    recipeSteps: recipeIds.filter((id) => rec[id]?.steps?.length).length,
  };
}
