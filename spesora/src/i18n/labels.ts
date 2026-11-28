import { ALLERGENS, DIETS, DISH_CATEGORIES, EQUIPMENT, SHOPPING_CATEGORIES, type Allergen, type Diet, type DishCategory, type Equipment, type MealType, type ShoppingCategory } from '../core/domain/types';
import { currentLanguage, lazyLabels } from './index';

/*
 * Etichette tradotte (namespace `common`). Sono getter: `MEAL_LABELS.cena` restituisce sempre la lingua corrente.
 */


export const MEAL_LABELS: Record<MealType, string> = lazyLabels(['colazione', 'pranzo', 'cena', 'spuntino'] as const, (k) => `meal.${k}`);
export const DIET_LABELS: Record<Diet, string> = lazyLabels(DIETS, (k) => `diet.${k}`);
/** Nomi brevi delle 14 categorie di allergeni del Reg. UE 1169/2011 (all. II), già usate dalla classificazione dei dati. */
export const ALLERGEN_LABELS: Record<Allergen, string> = lazyLabels(ALLERGENS, (k) => `allergen.${k}`);
export const EQUIPMENT_LABELS: Record<Equipment, string> = lazyLabels(EQUIPMENT, (k) => `equipment.${k}`);
export const CATEGORY_LABELS: Record<ShoppingCategory, string> = lazyLabels(SHOPPING_CATEGORIES, (k) => `category.${k}`);
export const DISH_LABELS: Record<DishCategory, string> = lazyLabels(DISH_CATEGORIES, (k) => `dish.${k}`);

/** Nome del pasto dentro una frase: minuscolo, tranne in tedesco (i sostantivi restano maiuscoli). */
export function mealInSentence(meal: MealType): string {
  return currentLanguage() === 'de' ? MEAL_LABELS[meal] : MEAL_LABELS[meal].toLocaleLowerCase();
}
