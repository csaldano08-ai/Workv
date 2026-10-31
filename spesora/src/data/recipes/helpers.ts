import type { RecipeIngredient, RecipeStep } from '../../core/domain/types';

/** Ingrediente con quantità (unità canonica, per le porzioni base). */
export function q(ingredientId: string, qty: number, hint?: string): RecipeIngredient {
  return hint ? { ingredientId, qty, hint } : { ingredientId, qty };
}

/** Ingrediente "quanto basta". */
export function qb(ingredientId: string, hint?: string): RecipeIngredient {
  return hint ? { ingredientId, toTaste: true, hint } : { ingredientId, toTaste: true };
}

/** Passaggio della ricetta, con timer facoltativo in minuti. */
export function step(text: string, timerMinutes?: number): RecipeStep {
  return timerMinutes ? { text, timerMinutes } : { text };
}
