import type { CatalogIndex } from './catalog';
import { ingredientNeed } from './portions';
import type { IngredientPriceEngine } from './prices';
import type { ShoppingPlan, ShoppingTripPlan } from './shopping';
import type { MilliQty, PantryStock, PortionProfile, Recipe } from './types';

/**
 * RecipeCostEngine — costo indicativo delle ricette e della spesa.
 * Due misure distinte:
 *  A. costo della ricetta = valore degli ingredienti consumati (quantità × prezzo unitario);
 *  B. costo della spesa  = quanto si paga alla cassa per le confezioni intere da comprare.
 * Le stime sono "complete" solo se tutti gli ingredienti quantificati hanno un prezzo noto.
 */

export type Completeness = 'completa' | 'parziale' | 'assente';

export function completenessOf(known: number, total: number): Completeness {
  if (total === 0 || known === total) return total === 0 ? 'assente' : 'completa';
  return known === 0 ? 'assente' : 'parziale';
}

export interface RecipeCostLine {
  ingredientId: string;
  need: MilliQty;
  /** Quantità coperta dalla dispensa confermata. */
  fromPantry: MilliQty;
  /** Costo della quantità consumata, null se prezzo sconosciuto. */
  cents: number | null;
  /** Costo della sola parte da acquistare (quantità, non confezioni). */
  toBuyCents: number | null;
}

export interface RecipeCost {
  /** Somma dei costi noti (centesimi). */
  knownCents: number;
  perServingCents: number | null;
  /** Valore stimato degli ingredienti da acquistare (quantità, non confezioni). */
  toBuyKnownCents: number;
  knownCount: number;
  totalCount: number;
  completeness: Completeness;
  lines: RecipeCostLine[];
}

export function recipeCost(
  recipe: Recipe,
  catalog: CatalogIndex,
  prices: IngredientPriceEngine,
  servings: number,
  portions?: PortionProfile,
  stock?: PantryStock,
): RecipeCost {
  const lines: RecipeCostLine[] = [];
  let knownCents = 0;
  let toBuyKnownCents = 0;
  let knownCount = 0;
  for (const ri of recipe.ingredients) {
    if (ri.toTaste || ri.qty === undefined) continue;
    const ing = catalog.ingredient(ri.ingredientId);
    if (ing.staple) continue;
    const need = ingredientNeed(recipe, ri, ing, servings, portions);
    const fromPantry = Math.min(stock?.get(ing.id) ?? 0, need);
    const cents = prices.costForQty(ing.id, need);
    const toBuyCents = prices.costForQty(ing.id, need - fromPantry);
    if (cents !== null) {
      knownCents += cents;
      knownCount++;
    }
    if (toBuyCents !== null) toBuyKnownCents += toBuyCents;
    lines.push({ ingredientId: ing.id, need, fromPantry, cents, toBuyCents });
  }
  const completeness = completenessOf(knownCount, lines.length);
  return {
    knownCents,
    perServingCents: completeness === 'completa' ? Math.round(knownCents / servings) : null,
    toBuyKnownCents,
    knownCount,
    totalCount: lines.length,
    completeness,
    lines,
  };
}

export interface TripCost {
  date: string;
  isInitial: boolean;
  knownCents: number;
  knownCount: number;
  totalCount: number;
  completeness: Completeness;
}

/** Costo alla cassa di un'uscita: confezioni intere quando il formato è noto. */
export function tripCost(trip: ShoppingTripPlan, catalog: CatalogIndex, prices: IngredientPriceEngine): TripCost {
  let knownCents = 0;
  let knownCount = 0;
  let total = 0;
  for (const line of trip.lines) {
    if (line.toTaste) continue;
    total++;
    const ing = catalog.ingredient(line.ingredientId);
    const c = prices.cartCost(ing.id, line.qty, ing.commonPackSizes);
    if (c) {
      knownCents += c.cents;
      knownCount++;
    }
  }
  return { date: trip.date, isInitial: trip.isInitial, knownCents, knownCount, totalCount: total, completeness: completenessOf(knownCount, total) };
}

export interface ShoppingCost {
  trips: TripCost[];
  knownCents: number;
  completeness: Completeness;
  knownCount: number;
  totalCount: number;
}

export function shoppingCost(plan: ShoppingPlan, catalog: CatalogIndex, prices: IngredientPriceEngine): ShoppingCost {
  const trips = plan.trips.map((t) => tripCost(t, catalog, prices));
  const knownCount = trips.reduce((s, t) => s + t.knownCount, 0);
  const totalCount = trips.reduce((s, t) => s + t.totalCount, 0);
  return { trips, knownCents: trips.reduce((s, t) => s + t.knownCents, 0), completeness: completenessOf(knownCount, totalCount), knownCount, totalCount };
}

/** Numero di prodotti distinti da acquistare: misura usata quando i prezzi non bastano. */
export function distinctPurchases(plan: ShoppingPlan): number {
  const ids = new Set<string>();
  for (const t of plan.trips) for (const l of t.lines) if (!l.toTaste) ids.add(l.ingredientId);
  return ids.size;
}
