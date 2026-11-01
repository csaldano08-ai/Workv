import { CatalogIndex } from './catalog';
import { diffDays, rangeDays, weekdayOf } from './dates';
import { MEAL_ORDER } from './planner';
import { ingredientNeed } from './portions';
import { roundUpForShopping, suggestPacks, type PackSuggestion } from './quantity';
import { PERISHABILITY_MAX_DAYS, type IsoDate, type MealType, type MilliQty, type PantryStock, type PlannedMeal, type PortionProfile, type Weekday } from './types';

/**
 * ShoppingPlannerEngine — distribuisce gli acquisti mancanti sui giorni di spesa scelti.
 *
 * Regole:
 * - Si considerano solo i pasti `planned` da oggi in poi (le ricette passate non confermate
 *   non consumano la dispensa prevista).
 * - La dispensa confermata copre per prima il fabbisogno, in ordine cronologico.
 * - Un ingrediente mancante va alla spesa più vicina che precede il suo utilizzo
 *   (stesso giorno ammesso, tranne per la colazione) e mai a una spesa successiva.
 * - Se nessuna spesa programmata precede l'utilizzo, viene proposta una spesa iniziale oggi.
 * - Le eccedenze delle confezioni comuni vengono riutilizzate nei pasti successivi
 *   finché l'ingrediente resta conservabile.
 */

export interface MealUse {
  mealId: string;
  recipeId: string;
  date: IsoDate;
  mealType: MealType;
  qty: MilliQty;
}

export interface ShoppingLine {
  ingredientId: string;
  /** Fabbisogno netto in milli-unità (0 per ingredienti q.b.). */
  qty: MilliQty;
  /** Quantità consigliata arrotondata verso l'alto (o totale confezioni). */
  suggestedQty: MilliQty;
  packs: PackSuggestion | null;
  toTaste: boolean;
  uses: MealUse[];
  warnings: string[];
}

export interface ShoppingTripPlan {
  date: IsoDate;
  /** Spesa iniziale proposta perché serve qualcosa prima della prima spesa programmata. */
  isInitial: boolean;
  lines: ShoppingLine[];
}

export interface CoveredItem {
  ingredientId: string;
  qty: MilliQty;
  uses: MealUse[];
}

export interface ShoppingPlan {
  trips: ShoppingTripPlan[];
  /** Fabbisogno già coperto dalla dispensa confermata. */
  covered: CoveredItem[];
}

export interface ShoppingInput {
  meals: PlannedMeal[];
  catalog: CatalogIndex;
  pantry: PantryStock;
  /** Ingredienti q.b. presenti in casa (sale, olio...). */
  presentStaples: Set<string>;
  shoppingDays: Weekday[];
  today: IsoDate;
  horizonEnd: IsoDate;
  /** Porzioni abituali dell'utente (assenti = ricette come scritte). */
  portions?: PortionProfile;
}

export function planShopping(input: ShoppingInput): ShoppingPlan {
  const { catalog, today } = input;
  const meals = input.meals
    .filter((m) => m.status === 'planned' && diffDays(today, m.date) >= 0)
    .sort((a, b) => (a.date === b.date ? MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType] : a.date < b.date ? -1 : 1));

  const horizonDays = Math.max(1, diffDays(today, input.horizonEnd) + 1);
  const regularTrips = rangeDays(today, horizonDays).filter((d) => input.shoppingDays.includes(weekdayOf(d)));
  const trips = new Map<string, ShoppingTripPlan>();
  const tripKey = (date: IsoDate, initial: boolean) => (initial ? `init_${date}` : date);
  const ensureTrip = (date: IsoDate, initial: boolean) => {
    const key = tripKey(date, initial);
    let trip = trips.get(key);
    if (!trip) {
      trip = { date, isInitial: initial, lines: [] };
      trips.set(key, trip);
    }
    return trip;
  };

  const pantryLeft = new Map(input.pantry);
  const covered = new Map<string, CoveredItem>();
  const stapleAssigned = new Set<string>();

  for (const meal of meals) {
    const recipe = catalog.recipe(meal.recipeId);
    if (!recipe) continue;
    const eligible = regularTrips.filter((d) => d < meal.date || (d === meal.date && meal.mealType !== 'colazione'));
    const latestTrip = eligible.length > 0 ? eligible[eligible.length - 1] : null;

    for (const ri of recipe.ingredients) {
      const ing = catalog.ingredient(ri.ingredientId);
      const makeUse = (qty: MilliQty): MealUse => ({ mealId: meal.id, recipeId: recipe.id, date: meal.date, mealType: meal.mealType, qty });

      if (ri.toTaste || ing.staple || ri.qty === undefined) {
        const present = input.presentStaples.has(ing.id) || (pantryLeft.get(ing.id) ?? 0) > 0;
        if (present || stapleAssigned.has(ing.id)) continue;
        stapleAssigned.add(ing.id);
        const trip = latestTrip ? ensureTrip(latestTrip, false) : ensureTrip(today, true);
        // Una sola riga per ingrediente in ogni spesa: se è già prevista con quantità, il q.b. si aggiunge ai suoi usi.
        const same = trip.lines.find((l) => l.ingredientId === ing.id);
        if (same) same.uses.push(makeUse(0));
        else trip.lines.push({ ingredientId: ing.id, qty: 0, suggestedQty: 0, packs: null, toTaste: true, uses: [makeUse(0)], warnings: [] });
        continue;
      }

      let need = ingredientNeed(recipe, ri, ing, meal.servings, input.portions);
      if (need <= 0) continue;

      // 1) dispensa confermata
      const inPantry = pantryLeft.get(ing.id) ?? 0;
      const fromPantry = Math.min(inPantry, need);
      if (fromPantry > 0) {
        pantryLeft.set(ing.id, inPantry - fromPantry);
        need -= fromPantry;
        const item = covered.get(ing.id) ?? { ingredientId: ing.id, qty: 0, uses: [] };
        item.qty += fromPantry;
        item.uses.push(makeUse(fromPantry));
        covered.set(ing.id, item);
      }
      if (need === 0) continue;

      const maxDays = PERISHABILITY_MAX_DAYS[ing.perishability];
      // 2) eccedenze di confezioni già previste in una spesa precedente, ancora conservabili:
      //    il fabbisogno netto della voce cresce, le confezioni restano le stesse.
      for (const t of trips.values()) {
        if (need === 0) break;
        const usable = t.date < meal.date || (t.date === meal.date && meal.mealType !== 'colazione');
        if (!usable || diffDays(t.date, meal.date) > maxDays) continue;
        const line = t.lines.find((l) => l.ingredientId === ing.id && !l.toTaste);
        if (!line) continue;
        const spare = line.suggestedQty - line.qty;
        if (spare <= 0) continue;
        const take = Math.min(spare, need);
        line.qty += take;
        line.uses.push(makeUse(take));
        need -= take;
      }
      if (need === 0) continue;

      // 3) nuova voce di spesa: riuso di una spesa precedente che già lo contiene se conservabile,
      //    altrimenti la spesa più vicina prima dell'uso, altrimenti spesa iniziale.
      let trip: ShoppingTripPlan;
      const existing = eligible.find((d) => {
        const t = trips.get(d);
        return t?.lines.some((l) => l.ingredientId === ing.id && !l.toTaste) && diffDays(d, meal.date) <= maxDays;
      });
      if (existing) trip = ensureTrip(existing, false);
      else if (latestTrip) trip = ensureTrip(latestTrip, false);
      else trip = ensureTrip(today, true);

      // Se nella stessa spesa l'ingrediente è già presente come "q.b.", la riga diventa quantificata (mai due righe).
      let line = trip.lines.find((l) => l.ingredientId === ing.id);
      if (line?.toTaste) line.toTaste = false;
      if (!line) {
        line = { ingredientId: ing.id, qty: 0, suggestedQty: 0, packs: null, toTaste: false, uses: [], warnings: [] };
        trip.lines.push(line);
      }
      line.qty += need;
      line.uses.push(makeUse(need));
      line.packs = suggestPacks(line.qty, ing.commonPackSizes);
      line.suggestedQty = line.packs ? line.packs.total : roundUpForShopping(line.qty, ing.unit);

      if (trip.isInitial && regularTrips.length > 0) {
        if (!line.warnings.includes(WARN_BEFORE_FIRST)) line.warnings.push(WARN_BEFORE_FIRST);
      }
      if (diffDays(trip.date, meal.date) > maxDays) {
        const w = `Potrebbe non conservarsi fino a ${meal.date}: valuta di acquistarlo più vicino al giorno d'uso.`;
        if (!line.warnings.includes(w)) line.warnings.push(w);
      }
    }
  }

  const orderedTrips = [...trips.values()]
    .filter((t) => t.lines.length > 0)
    .sort((a, b) => (a.date === b.date ? (a.isInitial ? -1 : 1) : a.date < b.date ? -1 : 1));
  for (const t of orderedTrips) t.lines.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
  return { trips: orderedTrips, covered: [...covered.values()] };
}

export const WARN_BEFORE_FIRST = 'Serve prima della prossima spesa programmata.';

/** Fabbisogno lordo per ingrediente (milli) dei pasti pianificati futuri: utile per la dispensa. */
export function futureNeeds(meals: PlannedMeal[], catalog: CatalogIndex, today: IsoDate, portions?: PortionProfile): Map<string, MilliQty> {
  const needs = new Map<string, MilliQty>();
  for (const m of meals) {
    if (m.status !== 'planned' || diffDays(today, m.date) < 0) continue;
    const r = catalog.recipe(m.recipeId);
    if (!r) continue;
    for (const ri of r.ingredients) {
      if (ri.toTaste || ri.qty === undefined) continue;
      const q = ingredientNeed(r, ri, catalog.ingredient(ri.ingredientId), m.servings, portions);
      needs.set(ri.ingredientId, (needs.get(ri.ingredientId) ?? 0) + q);
    }
  }
  return needs;
}
