import { CatalogIndex } from './catalog';
import { addDays, diffDays, rangeDays, weekdayOf } from './dates';
import { scaleQty, toMilli } from './quantity';
import { createRng } from './random';
import {
  PERISHABILITY_MAX_DAYS,
  type HistoryEntry,
  type IsoDate,
  type MealType,
  type PantryStock,
  type PlanIssue,
  type PlannedMeal,
  type Recipe,
  type UserProfile,
} from './types';

/**
 * MealPlannerEngine — pianificazione deterministica basata su vincoli e punteggi.
 * Nessuna AI: stessa entrata + stesso seed ⇒ stesso piano.
 */

export const MEAL_ORDER: Record<MealType, number> = { colazione: 0, pranzo: 1, spuntino: 2, cena: 3 };

export interface PlannerInput {
  profile: UserProfile;
  catalog: CatalogIndex;
  startDate: IsoDate;
  days: number;
  /** Dispensa confermata (milli-unità). */
  pantry: PantryStock;
  history: HistoryEntry[];
  favorites: Set<string>;
  seed: number;
  /** Pasti già fissati nel periodo (cucinati, saltati, scelti a mano): non vengono rigenerati. */
  keep?: PlannedMeal[];
}

export interface PlannerOutput {
  meals: PlannedMeal[];
  issues: PlanIssue[];
}

export type RejectionReason = 'allergeni' | 'allergeni_non_verificati' | 'escluso' | 'non_gradito' | 'dieta' | 'attrezzatura';

/** Vincoli rigidi: mai rilassati per completare il calendario. */
export function checkHardConstraints(recipe: Recipe, profile: UserProfile, catalog: CatalogIndex): RejectionReason[] {
  const reasons: RejectionReason[] = [];
  const facts = catalog.factsOf(recipe);
  if (profile.excludedAllergens.length > 0) {
    if (facts.allergens.some((a) => profile.excludedAllergens.includes(a))) reasons.push('allergeni');
    else if (facts.allergenInfoIncomplete) reasons.push('allergeni_non_verificati');
  }
  const ids = recipe.ingredients.map((i) => i.ingredientId);
  if (ids.some((id) => profile.excludedIngredientIds.includes(id))) reasons.push('escluso');
  if (ids.some((id) => profile.dislikedIngredientIds.includes(id))) reasons.push('non_gradito');
  const dietOk =
    profile.diet === 'onnivoro' ||
    (profile.diet === 'vegano' && facts.vegan) ||
    (profile.diet === 'vegetariano' && facts.vegetarian) ||
    (profile.diet === 'pescetariano' && facts.pescatarian);
  if (!dietOk) reasons.push('dieta');
  if (!recipe.equipment.every((e) => profile.equipment.includes(e))) reasons.push('attrezzatura');
  return reasons;
}

export function compatibleRecipes(profile: UserProfile, catalog: CatalogIndex): Recipe[] {
  return catalog.catalog.recipes
    .filter((r) => checkHardConstraints(r, profile, catalog).length === 0)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function mealId(date: IsoDate, mealType: MealType): string {
  return `m_${date}_${mealType}`;
}

export function maxMinutesFor(profile: UserProfile, date: IsoDate): number {
  return profile.days[weekdayOf(date)].maxMinutes;
}

export function mealTimeFor(profile: UserProfile, date: IsoDate, mealType: MealType): number {
  return profile.days[weekdayOf(date)].mealTimes[mealType];
}

/** Spiega perché uno slot non ha ricette, senza mai suggerire di ignorare le esclusioni. */
export function explainNoCandidates(
  profile: UserProfile,
  catalog: CatalogIndex,
  mealType: MealType,
  maxMinutes: number,
): { code: PlanIssue['code']; message: string } {
  const forMeal = catalog.catalog.recipes.filter((r) => r.mealTypes.includes(mealType));
  const compatible = forMeal.filter((r) => checkHardConstraints(r, profile, catalog).length === 0);
  if (compatible.length > 0) {
    const fastest = Math.min(...compatible.map((r) => r.totalMinutes));
    return {
      code: 'no_recipes_in_time',
      message: `Nessuna ricetta compatibile si prepara in ${maxMinutes} minuti (la più rapida ne richiede ${fastest}). Puoi aumentare il tempo disponibile per questo giorno.`,
    };
  }
  const counts = new Map<RejectionReason, number>();
  for (const r of forMeal) {
    for (const reason of checkHardConstraints(r, profile, catalog)) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const labels: Record<RejectionReason, string> = {
    allergeni: 'ingredienti esclusi per allergeni',
    allergeni_non_verificati: 'informazioni sugli allergeni non verificate',
    escluso: 'ingredienti esclusi',
    non_gradito: 'ingredienti non graditi',
    dieta: 'preferenza alimentare',
    attrezzatura: 'strumenti di cucina non disponibili',
  };
  const detail = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${labels[k]} (${n})`)
    .join(', ');
  return {
    code: 'no_compatible_recipes',
    message: `Il catalogo non contiene ricette compatibili per questo pasto. Motivi principali: ${detail || 'nessuna ricetta per questo tipo di pasto'}. Puoi rivedere preferenze o strumenti: le esclusioni alimentari non vengono mai ignorate.`,
  };
}

interface SlotContext {
  date: IsoDate;
  mealType: MealType;
}

interface PlanState {
  usedThisPlan: Map<string, number>;
  categoryCount: Map<string, number>;
  neededIngredients: Set<string>;
  projectedPantry: PantryStock;
  lastCategoryByDate: Map<IsoDate, string[]>;
}

export interface ScoredCandidate {
  recipe: Recipe;
  score: number;
  reasons: string[];
}

function lastShopDate(date: IsoDate, mealType: MealType, profile: UserProfile, startDate: IsoDate): IsoDate {
  for (let d = date; diffDays(startDate, d) >= 0; d = addDays(d, -1)) {
    const sameDayOk = d !== date || mealType !== 'colazione';
    if (sameDayOk && profile.shoppingDays.includes(weekdayOf(d))) return d;
  }
  return startDate; // spesa iniziale
}

function scoreCandidate(
  recipe: Recipe,
  slot: SlotContext,
  input: PlannerInput,
  state: PlanState,
  historyLastDate: Map<string, IsoDate>,
  jitter: number,
): ScoredCandidate {
  const { catalog, profile, favorites, startDate } = input;
  const reasons: string[] = [];
  let score = 100;
  const isBreakfastLike = slot.mealType === 'colazione' || slot.mealType === 'spuntino';
  const repetitionWeight = isBreakfastLike ? 0.4 : 1;

  const used = state.usedThisPlan.get(recipe.id) ?? 0;
  score -= used * 80 * repetitionWeight;

  const last = historyLastDate.get(recipe.id);
  if (last) {
    const ago = diffDays(last, slot.date);
    if (ago <= 3) score -= 50 * repetitionWeight;
    else if (ago <= 7) score -= 30 * repetitionWeight;
    else if (ago <= 14) score -= 12 * repetitionWeight;
  }

  if (favorites.has(recipe.id)) {
    score += 12;
    if (!last || diffDays(last, slot.date) >= 10) score += 10;
    reasons.push('Tra le tue ricette preferite');
  }

  if (!isBreakfastLike) {
    const catCount = state.categoryCount.get(recipe.dishCategory) ?? 0;
    score -= catCount * 10;
    const recent = [
      ...(state.lastCategoryByDate.get(slot.date) ?? []),
      ...(state.lastCategoryByDate.get(addDays(slot.date, -1)) ?? []),
    ];
    if (recent.includes(recipe.dishCategory)) score -= 20;
    else if (catCount === 0) reasons.push('Aggiunge varietà alla settimana');
  }

  let shared = 0;
  let fromPantry: string[] = [];
  let perishablePenalty = 0;
  const shop = lastShopDate(slot.date, slot.mealType, profile, startDate);
  const heldDays = diffDays(shop, slot.date);
  for (const ri of recipe.ingredients) {
    const ing = catalog.ingredient(ri.ingredientId);
    if (ing.staple || ri.toTaste) continue;
    const need = scaleQty(toMilli(ri.qty ?? 0), profile.servings, recipe.baseServings);
    const available = state.projectedPantry.get(ing.id) ?? 0;
    if (available >= need && need > 0) {
      fromPantry.push(ing.name);
      continue;
    }
    if (state.neededIngredients.has(ing.id)) shared++;
    if (heldDays > PERISHABILITY_MAX_DAYS[ing.perishability]) perishablePenalty += 25;
  }
  fromPantry = fromPantry.slice(0, 3);
  score += Math.min(fromPantry.length * 6, 18);
  score += Math.min(shared * 4, 12);
  score -= Math.min(perishablePenalty, 60);
  if (fromPantry.length > 0) reasons.push(`Usa ingredienti già in dispensa: ${fromPantry.join(', ')}`);
  if (shared > 0) reasons.push('Condivide ingredienti con altri pasti della settimana');
  if (perishablePenalty > 0) reasons.push('Contiene ingredienti freschi lontani dal giorno di spesa');

  const maxMinutes = maxMinutesFor(profile, slot.date);
  reasons.unshift(`Pronta in ${recipe.totalMinutes} min (ne hai ${maxMinutes})`);
  score += jitter * 8;
  return { recipe, score, reasons };
}

function emptyState(pantry: PantryStock): PlanState {
  return {
    usedThisPlan: new Map(),
    categoryCount: new Map(),
    neededIngredients: new Set(),
    projectedPantry: new Map(pantry),
    lastCategoryByDate: new Map(),
  };
}

function applyToState(state: PlanState, recipe: Recipe, meal: { date: IsoDate; servings: number; mealType: MealType }, catalog: CatalogIndex) {
  state.usedThisPlan.set(recipe.id, (state.usedThisPlan.get(recipe.id) ?? 0) + 1);
  if (meal.mealType === 'pranzo' || meal.mealType === 'cena') {
    state.categoryCount.set(recipe.dishCategory, (state.categoryCount.get(recipe.dishCategory) ?? 0) + 1);
    const list = state.lastCategoryByDate.get(meal.date) ?? [];
    list.push(recipe.dishCategory);
    state.lastCategoryByDate.set(meal.date, list);
  }
  for (const ri of recipe.ingredients) {
    const ing = catalog.ingredient(ri.ingredientId);
    if (ing.staple || ri.toTaste) continue;
    state.neededIngredients.add(ing.id);
    const need = scaleQty(toMilli(ri.qty ?? 0), meal.servings, recipe.baseServings);
    const left = (state.projectedPantry.get(ing.id) ?? 0) - need;
    state.projectedPantry.set(ing.id, Math.max(0, left));
  }
}

function historyIndex(history: HistoryEntry[]): Map<string, IsoDate> {
  const map = new Map<string, IsoDate>();
  for (const h of history) {
    if (h.outcome !== 'cooked') continue;
    const prev = map.get(h.recipeId);
    if (!prev || prev < h.date) map.set(h.recipeId, h.date);
  }
  return map;
}

function slotsFor(input: PlannerInput): SlotContext[] {
  const types = [...input.profile.mealTypes].sort((a, b) => MEAL_ORDER[a] - MEAL_ORDER[b]);
  return rangeDays(input.startDate, input.days).flatMap((date) => types.map((mealType) => ({ date, mealType })));
}

export function generatePlan(input: PlannerInput): PlannerOutput {
  const { profile, catalog } = input;
  if (!(profile.servings >= 1)) throw new Error('Numero di persone non valido');
  const compatible = compatibleRecipes(profile, catalog);
  const rng = createRng(input.seed);
  const history = historyIndex(input.history);
  const keepBySlot = new Map((input.keep ?? []).map((m) => [`${m.date}|${m.mealType}`, m]));
  const state = emptyState(input.pantry);
  const meals: PlannedMeal[] = [];
  const issues: PlanIssue[] = [];

  for (const slot of slotsFor(input)) {
    const kept = keepBySlot.get(`${slot.date}|${slot.mealType}`);
    if (kept) {
      meals.push(kept);
      const r = catalog.recipe(kept.recipeId);
      if (r && kept.status === 'planned') applyToState(state, r, kept, catalog);
      else if (r) state.usedThisPlan.set(r.id, (state.usedThisPlan.get(r.id) ?? 0) + 1);
      continue;
    }
    const maxMinutes = maxMinutesFor(profile, slot.date);
    const candidates = compatible.filter((r) => r.mealTypes.includes(slot.mealType) && r.totalMinutes <= maxMinutes);
    if (candidates.length === 0) {
      const { code, message } = explainNoCandidates(profile, catalog, slot.mealType, maxMinutes);
      issues.push({ date: slot.date, mealType: slot.mealType, code, message });
      continue;
    }
    // Un valore casuale per candidato, estratto in ordine di ID: riproducibile.
    let best: ScoredCandidate | null = null;
    for (const recipe of candidates) {
      const scored = scoreCandidate(recipe, slot, input, state, history, rng());
      if (!best || scored.score > best.score) best = scored;
    }
    const chosen = best!;
    const meal: PlannedMeal = {
      id: mealId(slot.date, slot.mealType),
      date: slot.date,
      mealType: slot.mealType,
      timeMinutes: mealTimeFor(profile, slot.date, slot.mealType),
      recipeId: chosen.recipe.id,
      servings: profile.servings,
      status: 'planned',
      source: 'auto',
      reasons: chosen.reasons,
    };
    meals.push(meal);
    applyToState(state, chosen.recipe, meal, catalog);
  }
  return { meals, issues };
}

/**
 * Alternative per uno slot, ordinate per punteggio, considerando il resto del piano.
 * Favorisce ricette che usano ingredienti già in dispensa.
 */
export function suggestAlternatives(
  input: PlannerInput,
  plan: PlannedMeal[],
  target: PlannedMeal,
  limit = 8,
): ScoredCandidate[] {
  const { profile, catalog } = input;
  const state = emptyState(input.pantry);
  const sorted = [...plan].sort((a, b) => (a.date === b.date ? MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType] : a.date < b.date ? -1 : 1));
  for (const m of sorted) {
    if (m.id === target.id) continue;
    const r = catalog.recipe(m.recipeId);
    if (r && m.status === 'planned') applyToState(state, r, m, catalog);
  }
  const maxMinutes = maxMinutesFor(profile, target.date);
  const history = historyIndex(input.history);
  return compatibleRecipes(profile, catalog)
    .filter((r) => r.mealTypes.includes(target.mealType) && r.id !== target.recipeId)
    .map((r) => {
      const scored = scoreCandidate(r, target, input, state, history, 0);
      if (r.totalMinutes > maxMinutes) {
        scored.score -= 40;
        scored.reasons[0] = `Richiede ${r.totalMinutes} min: più del tempo previsto (${maxMinutes})`;
      }
      return scored;
    })
    .sort((a, b) => b.score - a.score || (a.recipe.id < b.recipe.id ? -1 : 1))
    .slice(0, limit);
}
