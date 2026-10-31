import type { CatalogIndex } from './catalog';
import { distinctPurchases, shoppingCost, type Completeness } from './cost';
import { maxMinutesFor, MEAL_ORDER, suggestAlternatives, type PlannerInput } from './planner';
import type { IngredientPriceEngine } from './prices';
import { weeklyBudgetCents } from './profile';
import { planShopping } from './shopping';
import type { IsoDate, PantryStock, PlannedMeal, UserProfile } from './types';

/**
 * BudgetMealPlanner — valutazione e miglioramento economico del calendario.
 * Regole: i vincoli alimentari restano rigidi (le alternative arrivano già filtrate);
 * non si riducono pasti né porzioni; nessun risparmio dichiarato senza prezzi completi.
 */

export interface PlanEconomics {
  /** Somma dei costi noti alla cassa (centesimi). */
  knownCents: number;
  completeness: Completeness;
  /** Prodotti distinti da comprare: misura disponibile anche senza prezzi. */
  purchases: number;
}

export interface BudgetEvaluation extends PlanEconomics {
  weeklyLimitCents: number | null;
  /** true/false solo se la stima è completa; null = non determinabile con i dati disponibili. */
  withinBudget: boolean | null;
  /** Il budget riguarda solo i pasti pianificati in Spesora (o una parte della spesa). */
  scopeNote: string;
}

export interface EconomicsContext {
  catalog: CatalogIndex;
  prices: IngredientPriceEngine;
  pantry: PantryStock;
  presentStaples: Set<string>;
  profile: UserProfile;
  today: IsoDate;
  horizonEnd: IsoDate;
}

export function planEconomics(meals: PlannedMeal[], ctx: EconomicsContext): PlanEconomics {
  const plan = planShopping({
    meals,
    catalog: ctx.catalog,
    pantry: ctx.pantry,
    presentStaples: ctx.presentStaples,
    shoppingDays: ctx.profile.shoppingDays,
    today: ctx.today,
    horizonEnd: ctx.horizonEnd,
    portions: ctx.profile.portions,
  });
  const cost = shoppingCost(plan, ctx.catalog, ctx.prices);
  return { knownCents: cost.knownCents, completeness: cost.completeness, purchases: distinctPurchases(plan) };
}

export function scopeNote(profile: UserProfile): string {
  const meals = profile.mealTypes.length;
  if (profile.budget.scope === 'parte_spesa') return 'Il budget riguarda solo una parte della tua spesa alimentare.';
  return meals < 4 ? 'Stima riferita solo ai pasti che organizzi in Spesora, non alla spesa alimentare totale.' : 'Stima riferita ai pasti organizzati in Spesora.';
}

export function evaluateBudget(meals: PlannedMeal[], ctx: EconomicsContext): BudgetEvaluation {
  const eco = planEconomics(meals, ctx);
  const limit = weeklyBudgetCents(ctx.profile.budget);
  const withinBudget = limit === null || eco.completeness !== 'completa' ? null : eco.knownCents <= limit;
  return { ...eco, weeklyLimitCents: limit, withinBudget, scopeNote: scopeNote(ctx.profile) };
}

export interface MealChange {
  mealId: string;
  fromRecipeId: string;
  toRecipeId: string;
}

export interface CheaperWeekProposal {
  changes: MealChange[];
  meals: PlannedMeal[];
  before: PlanEconomics;
  after: PlanEconomics;
  /** Differenza in centesimi, solo se prima e dopo hanno stime complete. */
  savingCents: number | null;
  /** Se c'è un limite: raggiunto, non raggiunto o non determinabile. */
  limitReached: boolean | null;
}

/** Metrica di confronto: euro se la stima è completa, altrimenti numero di acquisti. */
function metric(e: PlanEconomics): number {
  return e.completeness === 'completa' ? e.knownCents : e.knownCents + e.purchases * 1000;
}

/**
 * Sostituisce progressivamente i pasti futuri (non cucinati, non scelti a mano) con alternative
 * compatibili che abbassano la spesa o il numero di acquisti, mantenendo varietà e porzioni.
 */
export function proposeCheaperWeek(
  meals: PlannedMeal[],
  plannerInput: PlannerInput,
  ctx: EconomicsContext,
  options: { maxSwaps?: number; limitCents?: number | null } = {},
): CheaperWeekProposal {
  const maxSwaps = options.maxSwaps ?? 10;
  const limit = options.limitCents ?? null;
  const input: PlannerInput = { ...plannerInput, profile: { ...plannerInput.profile, budget: { ...plannerInput.profile.budget, mode: 'minimo' } } };
  let current = [...meals];
  const before = planEconomics(current, ctx);
  let best = before;
  const changes: MealChange[] = [];
  const touched = new Set<string>();

  for (let i = 0; i < maxSwaps; i++) {
    if (limit !== null && best.completeness === 'completa' && best.knownCents <= limit) break;
    let bestMove: { meals: PlannedMeal[]; eco: PlanEconomics; change: MealChange } | null = null;
    const candidates = current
      .filter((m) => m.status === 'planned' && m.source === 'auto' && m.date >= ctx.today && !touched.has(m.id))
      .sort((a, b) => (a.date === b.date ? MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType] : a.date < b.date ? -1 : 1));
    const planned = new Set(current.map((m) => m.recipeId));
    for (const meal of candidates) {
      for (const alt of suggestAlternatives(input, current, meal, 5)) {
        if (planned.has(alt.recipe.id)) continue; // niente ripetizioni per risparmiare
        if (alt.recipe.totalMinutes > maxMinutesFor(input.profile, meal.date)) continue; // rispetta il tempo disponibile
        const trial = current.map((m) => (m.id === meal.id ? { ...m, recipeId: alt.recipe.id, reasons: ['Scelta per contenere la spesa'] } : m));
        const eco = planEconomics(trial, ctx);
        if (metric(eco) < metric(bestMove?.eco ?? best)) bestMove = { meals: trial, eco, change: { mealId: meal.id, fromRecipeId: meal.recipeId, toRecipeId: alt.recipe.id } };
      }
    }
    if (!bestMove) break;
    current = bestMove.meals;
    best = bestMove.eco;
    changes.push(bestMove.change);
    touched.add(bestMove.change.mealId);
  }
  const comparable = before.completeness === 'completa' && best.completeness === 'completa';
  return {
    changes,
    meals: current,
    before,
    after: best,
    savingCents: comparable ? before.knownCents - best.knownCents : null,
    limitReached: limit === null ? null : best.completeness === 'completa' ? best.knownCents <= limit : null,
  };
}
