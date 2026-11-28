import { hashString } from '../core/domain/random';
import type { MealType } from '../core/domain/types';
import { currentLanguage, t } from './index';

/**
 * Micro-copy dell'assistente (Mina). Tono: amichevole, utile, breve, mai colpevolizzante.
 * Le varianti sono scelte in modo deterministico (stessa chiave → stessa frase) per evitare
 * testi che cambiano a ogni apertura. Testi nel namespace `mascot` (chiavi "<gruppo>.<n>"):
 * ogni lingua ha lo stesso numero di varianti, quindi la scelta non dipende dalla lingua.
 */

/** Variante `<prefix>.<n>` scelta dal seme `key` tra `count` varianti, tradotta nella lingua corrente. */
function pick(prefix: string, count: number, key: string, vars?: Record<string, string | number>): string {
  return t(`mascot:${prefix}.${hashString(key) % count}`, vars);
}

/** Nome della ricetta dentro una frase: minuscolo, tranne in tedesco (i sostantivi restano maiuscoli). */
function inSentence(name: string): string {
  return currentLanguage() === 'de' ? name : name.toLowerCase();
}

export function greeting(hour: number, key: string): string {
  if (hour < 5) return pick('greeting.night', 2, key);
  if (hour < 12) return pick('greeting.morning', 3, key);
  if (hour < 18) return pick('greeting.afternoon', 3, key);
  return pick('greeting.evening', 3, key);
}

/** `recipeName` già nella lingua corrente (vedi `recipeName` in src/i18n/content.ts). */
export function cookSoon(recipeName: string, minutes: number, key: string): string {
  const name = inSentence(recipeName);
  if (minutes <= 15) return pick('cookSoon.quick', 2, key, { name, minutes });
  return pick('cookSoon.normal', 3, key, { name, minutes });
}

export function mealReminderTitle(mealType: MealType, key: string): string {
  return pick(`mealReminder.title.${mealType}`, 3, key);
}

export function mealReminderBody(recipeName: string, minutes: number, servings: number, key: string): string {
  return t('mascot:mealReminder.body', { intro: cookSoon(recipeName, minutes, key), minutes, count: servings });
}

export function shoppingDay(items: number, key: string): { title: string; body: string } {
  return {
    title: pick('shoppingDay.title', 3, key),
    body: pick('shoppingDay.body', 2, key, { count: items }),
  };
}

/** Testo del promemoria della spesa (letto nella lingua corrente a ogni chiamata). */
export function shoppingReminderBody(): string {
  return t('mascot:shoppingReminder.body');
}

export function swapSuggestion(key: string): string {
  return pick('swap', 2, key);
}

export function missingIngredients(count: number): string {
  return t('mascot:missingIngredients', { count });
}

export function recipeCompleted(key: string): string {
  return pick('completed', 3, key);
}

/** Frasi degli stati vuoti: getter, quindi sempre nella lingua corrente. */
export const EMPTY = {
  get noMeal() {
    return t('mascot:empty.noMeal');
  },
  get noRecipes() {
    return t('mascot:empty.noRecipes');
  },
  get noShopping() {
    return t('mascot:empty.noShopping');
  },
  get noPantry() {
    return t('mascot:empty.noPantry');
  },
  get noHistory() {
    return t('mascot:empty.noHistory');
  },
  get dayDone() {
    return t('mascot:empty.dayDone');
  },
};

const TIP_COUNT = 5;

/** Consigli: un elenco i cui elementi sono letti nella lingua corrente al momento dell'uso. */
export const TIPS: readonly string[] = (() => {
  const list: string[] = [];
  for (let i = 0; i < TIP_COUNT; i++) Object.defineProperty(list, i, { enumerable: true, get: () => t(`mascot:tips.${i}`) });
  return list;
})();

export function tipOfTheDay(key: string): string {
  return pick('tips', TIP_COUNT, key);
}

/** Parole da evitare (controllo sui testi italiani): il tono non deve mai colpevolizzare. */
export const FORBIDDEN_TONE = ['dovresti', 'hai dimenticato', 'ancora una volta', 'sbagliato', 'colpa', 'pigro'];
