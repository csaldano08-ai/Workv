import { CatalogIndex } from './catalog';
import { scaleQty, toMilli } from './quantity';
import type { IsoDate, MilliQty, PantryStock, PlannedMeal } from './types';

/**
 * PantryEngine — la dispensa è un registro di movimenti (ledger).
 * La quantità disponibile è la somma dei movimenti, mai negativa.
 * I pasti soltanto programmati NON generano movimenti: si sottrae solo a pasto confermato.
 */

export type MovementKind = 'initial' | 'purchase' | 'meal_consumption' | 'manual_add' | 'manual_remove' | 'correction';

export interface PantryMovement {
  id: string;
  ingredientId: string;
  /** Variazione in milli-unità (positiva o negativa). */
  delta: MilliQty;
  kind: MovementKind;
  mealId: string | null;
  createdAt: string; // ISO datetime
  note: string | null;
}

export interface PantryEntry {
  ingredientId: string;
  qty: MilliQty;
  /** True se la quantità deriva da consumi stimati dalle ricette dopo l'ultimo controllo manuale. */
  estimated: boolean;
}

export function stockFromMovements(movements: PantryMovement[]): Map<string, PantryEntry> {
  const sorted = [...movements].sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1));
  const out = new Map<string, PantryEntry>();
  for (const mv of sorted) {
    const entry = out.get(mv.ingredientId) ?? { ingredientId: mv.ingredientId, qty: 0, estimated: false };
    entry.qty = Math.max(0, entry.qty + mv.delta);
    if (mv.kind === 'meal_consumption') entry.estimated = true;
    if (mv.kind === 'correction' || mv.kind === 'initial') entry.estimated = false;
    out.set(mv.ingredientId, entry);
  }
  return out;
}

export function toStock(entries: Map<string, PantryEntry>): PantryStock {
  const stock: PantryStock = new Map();
  for (const [id, e] of entries) stock.set(id, e.qty);
  return stock;
}

export interface ConsumptionResult {
  movements: Omit<PantryMovement, 'id' | 'createdAt'>[];
  /** Ingredienti per cui la dispensa registrata non bastava. */
  shortfalls: { ingredientId: string; missing: MilliQty }[];
}

/**
 * Calcola i movimenti di consumo per un pasto cucinato. Non sottrae mai più
 * di quanto registrato (la quantità non può diventare negativa).
 */
export function computeMealConsumption(meal: PlannedMeal, catalog: CatalogIndex, stock: PantryStock): ConsumptionResult {
  const recipe = catalog.recipe(meal.recipeId);
  if (!recipe) throw new Error(`Ricetta sconosciuta: ${meal.recipeId}`);
  const movements: ConsumptionResult['movements'] = [];
  const shortfalls: ConsumptionResult['shortfalls'] = [];
  for (const ri of recipe.ingredients) {
    if (ri.toTaste || ri.qty === undefined) continue;
    const need = scaleQty(toMilli(ri.qty), meal.servings, recipe.baseServings);
    const available = stock.get(ri.ingredientId) ?? 0;
    const take = Math.min(available, need);
    if (take > 0) {
      movements.push({ ingredientId: ri.ingredientId, delta: -take, kind: 'meal_consumption', mealId: meal.id, note: null });
    }
    if (need > take) shortfalls.push({ ingredientId: ri.ingredientId, missing: need - take });
  }
  return { movements, shortfalls };
}

/** Movimento di correzione che porta la quantità al valore indicato dall'utente. */
export function correctionMovement(ingredientId: string, current: MilliQty, target: MilliQty): Omit<PantryMovement, 'id' | 'createdAt'> | null {
  if (!Number.isInteger(target) || target < 0) throw new Error('Quantità non valida');
  if (target === current) return null;
  return { ingredientId, delta: target - current, kind: 'correction', mealId: null, note: null };
}

export interface PantryOutlookItem {
  ingredientId: string;
  available: MilliQty;
  estimated: boolean;
  /** Quantità prevista dai prossimi pasti pianificati (non ancora sottratta). */
  reserved: MilliQty;
  /** True se la dispensa non basta per i pasti previsti. */
  insufficient: boolean;
  expiryDate: IsoDate | null;
}

export function pantryOutlook(
  entries: Map<string, PantryEntry>,
  needs: Map<string, MilliQty>,
  expiries: Map<string, IsoDate | null>,
): PantryOutlookItem[] {
  const ids = new Set([...entries.keys()].filter((id) => (entries.get(id)?.qty ?? 0) > 0));
  for (const id of expiries.keys()) ids.add(id);
  return [...ids].map((id) => {
    const e = entries.get(id);
    const available = e?.qty ?? 0;
    const reserved = needs.get(id) ?? 0;
    return {
      ingredientId: id,
      available,
      estimated: e?.estimated ?? false,
      reserved,
      insufficient: reserved > available,
      expiryDate: expiries.get(id) ?? null,
    };
  });
}

export type IngredientAvailability = 'in_dispensa' | 'parziale' | 'da_comprare' | 'qb_presente' | 'qb_mancante';

/** Stato stimato degli ingredienti di un pasto rispetto alla dispensa confermata. */
export function mealIngredientStatus(
  meal: PlannedMeal,
  catalog: CatalogIndex,
  stock: PantryStock,
  presentStaples: Set<string>,
): { ingredientId: string; need: MilliQty; status: IngredientAvailability }[] {
  const recipe = catalog.recipe(meal.recipeId);
  if (!recipe) return [];
  return recipe.ingredients.map((ri) => {
    if (ri.toTaste || ri.qty === undefined) {
      const present = presentStaples.has(ri.ingredientId) || (stock.get(ri.ingredientId) ?? 0) > 0;
      return { ingredientId: ri.ingredientId, need: 0, status: present ? 'qb_presente' : 'qb_mancante' };
    }
    const need = scaleQty(toMilli(ri.qty), meal.servings, recipe.baseServings);
    const have = stock.get(ri.ingredientId) ?? 0;
    const status: IngredientAvailability = have >= need ? 'in_dispensa' : have > 0 ? 'parziale' : 'da_comprare';
    return { ingredientId: ri.ingredientId, need, status };
  });
}
