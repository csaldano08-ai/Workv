import type { Db, SqlValue } from './db';
import type { MovementKind, PantryMovement } from '../domain/pantry';
import type { HistoryEntry, IsoDate, MealStatus, MealType, PlannedMeal, UserProfile } from '../domain/types';
import { parseNotificationSettings, parseProfile } from '../domain/profile';
import type { NotificationSettings } from '../notifications/schedule';
import type { PriceEntry } from '../domain/prices';

/** Accesso ai dati: solo SQL parametrizzato, nessuna logica di pianificazione. */

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const nowIso = () => new Date().toISOString();

export interface PlanRow {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  seed: number;
}

interface MealRow {
  id: string;
  date: string;
  meal_type: MealType;
  time_minutes: number;
  recipe_id: string;
  servings: number;
  status: MealStatus;
  source: PlannedMeal['source'];
  reasons: string;
}

function toMeal(r: MealRow): PlannedMeal {
  let reasons: string[] = [];
  try {
    const parsed: unknown = JSON.parse(r.reasons);
    if (Array.isArray(parsed)) reasons = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    reasons = [];
  }
  return {
    id: r.id,
    date: r.date,
    mealType: r.meal_type,
    timeMinutes: r.time_minutes,
    recipeId: r.recipe_id,
    servings: r.servings,
    status: r.status,
    source: r.source,
    reasons,
  };
}

export class Repository {
  constructor(readonly db: Db) {}

  /* --- Preferenze ---------------------------------------------------- */

  async getOnboarding(): Promise<{ draft: unknown; step: number; completed: boolean } | null> {
    const row = await this.db.first<{ data: string; onboarding_step: number; onboarding_completed: number }>(
      'SELECT data, onboarding_step, onboarding_completed FROM user_preferences WHERE id = 1',
    );
    if (!row) return null;
    let draft: unknown = null;
    try {
      draft = JSON.parse(row.data);
    } catch {
      draft = null;
    }
    return { draft, step: row.onboarding_step, completed: row.onboarding_completed === 1 };
  }

  async getProfile(): Promise<UserProfile | null> {
    const ob = await this.getOnboarding();
    if (!ob?.completed) return null;
    return parseProfile(ob.draft);
  }

  async saveOnboardingDraft(draft: unknown, step: number, completed: boolean, db: Db = this.db): Promise<void> {
    await db.run(
      `INSERT INTO user_preferences (id, data, onboarding_step, onboarding_completed, updated_at) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, onboarding_step = excluded.onboarding_step,
       onboarding_completed = excluded.onboarding_completed, updated_at = excluded.updated_at`,
      [JSON.stringify(draft), step, completed ? 1 : 0, nowIso()],
    );
  }

  async getNotificationSettings(): Promise<{ settings: NotificationSettings; permissionRequested: boolean }> {
    const row = await this.db.first<{ data: string; permission_requested: number }>(
      'SELECT data, permission_requested FROM notification_settings WHERE id = 1',
    );
    let raw: unknown = null;
    try {
      raw = row ? JSON.parse(row.data) : null;
    } catch {
      raw = null;
    }
    return { settings: parseNotificationSettings(raw), permissionRequested: row?.permission_requested === 1 };
  }

  async saveNotificationSettings(settings: NotificationSettings, permissionRequested: boolean, db: Db = this.db): Promise<void> {
    await db.run(
      `INSERT INTO notification_settings (id, data, permission_requested, updated_at) VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, permission_requested = excluded.permission_requested, updated_at = excluded.updated_at`,
      [JSON.stringify(settings), permissionRequested ? 1 : 0, nowIso()],
    );
  }

  /* --- Piani e pasti -------------------------------------------------- */

  async getPlanCovering(date: IsoDate): Promise<PlanRow | null> {
    const row = await this.db.first<{ id: string; start_date: string; end_date: string; seed: number }>(
      'SELECT id, start_date, end_date, seed FROM weekly_plans WHERE start_date <= ? AND end_date >= ? ORDER BY created_at DESC LIMIT 1',
      [date, date],
    );
    return row ? { id: row.id, startDate: row.start_date, endDate: row.end_date, seed: row.seed } : null;
  }

  async getLatestPlan(): Promise<PlanRow | null> {
    const row = await this.db.first<{ id: string; start_date: string; end_date: string; seed: number }>(
      'SELECT id, start_date, end_date, seed FROM weekly_plans ORDER BY end_date DESC, created_at DESC LIMIT 1',
    );
    return row ? { id: row.id, startDate: row.start_date, endDate: row.end_date, seed: row.seed } : null;
  }

  async insertPlan(plan: PlanRow, db: Db = this.db): Promise<void> {
    await db.run('INSERT INTO weekly_plans (id, start_date, end_date, seed, created_at) VALUES (?, ?, ?, ?, ?)', [
      plan.id,
      plan.startDate,
      plan.endDate,
      plan.seed,
      nowIso(),
    ]);
  }

  async updatePlanSeed(planId: string, seed: number, db: Db = this.db): Promise<void> {
    await db.run('UPDATE weekly_plans SET seed = ? WHERE id = ?', [seed, planId]);
  }

  async getMealsBetween(start: IsoDate, end: IsoDate, db: Db = this.db): Promise<PlannedMeal[]> {
    const rows = await db.all<MealRow>(
      'SELECT id, date, meal_type, time_minutes, recipe_id, servings, status, source, reasons FROM planned_meals WHERE date >= ? AND date <= ? ORDER BY date',
      [start, end],
    );
    return rows.map(toMeal);
  }

  async getMeal(id: string, db: Db = this.db): Promise<PlannedMeal | null> {
    const row = await db.first<MealRow>(
      'SELECT id, date, meal_type, time_minutes, recipe_id, servings, status, source, reasons FROM planned_meals WHERE id = ?',
      [id],
    );
    return row ? toMeal(row) : null;
  }

  async upsertMeal(planId: string, m: PlannedMeal, db: Db = this.db): Promise<void> {
    await db.run(
      `INSERT INTO planned_meals (id, plan_id, date, meal_type, time_minutes, recipe_id, servings, status, source, reasons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET plan_id = excluded.plan_id, time_minutes = excluded.time_minutes,
       recipe_id = excluded.recipe_id, servings = excluded.servings, source = excluded.source, reasons = excluded.reasons
       WHERE planned_meals.status = 'planned'`,
      [m.id, planId, m.date, m.mealType, m.timeMinutes, m.recipeId, m.servings, m.status, m.source, JSON.stringify(m.reasons)],
    );
  }

  /** Elimina solo pasti ancora `planned` (i completati restano nello storico). */
  async deletePlannedMeals(ids: string[], db: Db = this.db): Promise<void> {
    for (const id of ids) await db.run("DELETE FROM planned_meals WHERE id = ? AND status = 'planned'", [id]);
  }

  async updateMealFields(
    id: string,
    fields: Partial<Pick<PlannedMeal, 'recipeId' | 'servings' | 'timeMinutes' | 'source' | 'reasons'>>,
    db: Db = this.db,
  ): Promise<number> {
    const sets: string[] = [];
    const params: SqlValue[] = [];
    const add = (column: string, value: SqlValue) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };
    if (fields.recipeId !== undefined) add('recipe_id', fields.recipeId);
    if (fields.servings !== undefined) add('servings', fields.servings);
    if (fields.timeMinutes !== undefined) add('time_minutes', fields.timeMinutes);
    if (fields.source !== undefined) add('source', fields.source);
    if (fields.reasons !== undefined) add('reasons', JSON.stringify(fields.reasons));
    if (sets.length === 0) return 0;
    params.push(id);
    const res = await db.run(`UPDATE planned_meals SET ${sets.join(', ')} WHERE id = ? AND status = 'planned'`, params);
    return res.changes;
  }

  /** Transizione di stato atomica: riesce solo se il pasto è ancora `planned`. */
  async transitionMeal(id: string, to: Exclude<MealStatus, 'planned'>, db: Db): Promise<boolean> {
    const res = await db.run("UPDATE planned_meals SET status = ?, status_at = ? WHERE id = ? AND status = 'planned'", [to, nowIso(), id]);
    return res.changes === 1;
  }

  async insertHistory(m: PlannedMeal, outcome: HistoryEntry['outcome'], db: Db): Promise<void> {
    await db.run(
      'INSERT INTO meal_history (meal_id, recipe_id, date, meal_type, servings, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.id, m.recipeId, m.date, m.mealType, m.servings, outcome, nowIso()],
    );
  }

  async getHistory(limit = 500): Promise<(HistoryEntry & { mealType: MealType; servings: number })[]> {
    const rows = await this.db.all<{ recipe_id: string; date: string; outcome: HistoryEntry['outcome']; meal_type: MealType; servings: number }>(
      'SELECT recipe_id, date, outcome, meal_type, servings FROM meal_history ORDER BY date DESC, created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((r) => ({ recipeId: r.recipe_id, date: r.date, outcome: r.outcome, mealType: r.meal_type, servings: r.servings }));
  }

  /* --- Dispensa ------------------------------------------------------- */

  async getMovements(db: Db = this.db): Promise<PantryMovement[]> {
    const rows = await db.all<{ id: string; ingredient_id: string; delta: number; kind: MovementKind; meal_id: string | null; created_at: string; note: string | null }>(
      'SELECT id, ingredient_id, delta, kind, meal_id, created_at, note FROM pantry_movements ORDER BY created_at, id',
    );
    return rows.map((r) => ({
      id: r.id,
      ingredientId: r.ingredient_id,
      delta: r.delta,
      kind: r.kind,
      mealId: r.meal_id,
      createdAt: r.created_at,
      note: r.note,
    }));
  }

  async insertMovement(mv: Omit<PantryMovement, 'id' | 'createdAt'>, db: Db = this.db): Promise<void> {
    if (!Number.isInteger(mv.delta)) throw new Error('Quantità non intera');
    await db.run('INSERT INTO pantry_movements (id, ingredient_id, delta, kind, meal_id, created_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      newId('mv'),
      mv.ingredientId,
      mv.delta,
      mv.kind,
      mv.mealId,
      nowIso(),
      mv.note,
    ]);
  }

  async getPantryItems(): Promise<{ ingredientId: string; staplePresent: boolean; expiryDate: IsoDate | null }[]> {
    const rows = await this.db.all<{ ingredient_id: string; staple_present: number; expiry_date: string | null }>(
      'SELECT ingredient_id, staple_present, expiry_date FROM pantry_items',
    );
    return rows.map((r) => ({ ingredientId: r.ingredient_id, staplePresent: r.staple_present === 1, expiryDate: r.expiry_date }));
  }

  async setStaplePresent(ingredientId: string, present: boolean, db: Db = this.db): Promise<void> {
    await db.run(
      `INSERT INTO pantry_items (ingredient_id, staple_present, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(ingredient_id) DO UPDATE SET staple_present = excluded.staple_present, updated_at = excluded.updated_at`,
      [ingredientId, present ? 1 : 0, nowIso()],
    );
  }

  async setExpiry(ingredientId: string, expiry: IsoDate | null, db: Db = this.db): Promise<void> {
    await db.run(
      `INSERT INTO pantry_items (ingredient_id, expiry_date, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(ingredient_id) DO UPDATE SET expiry_date = excluded.expiry_date, updated_at = excluded.updated_at`,
      [ingredientId, expiry, nowIso()],
    );
  }

  /* --- Spesa ---------------------------------------------------------- */

  async getShoppingItems(): Promise<{ tripDate: IsoDate; ingredientId: string; checked: boolean; purchasedQty: number | null }[]> {
    const rows = await this.db.all<{ trip_date: string; ingredient_id: string; checked: number; purchased_qty: number | null }>(
      'SELECT trip_date, ingredient_id, checked, purchased_qty FROM shopping_items',
    );
    return rows.map((r) => ({ tripDate: r.trip_date, ingredientId: r.ingredient_id, checked: r.checked === 1, purchasedQty: r.purchased_qty }));
  }

  async setChecked(tripDate: IsoDate, ingredientId: string, checked: boolean): Promise<void> {
    await this.db.run(
      `INSERT INTO shopping_items (trip_date, ingredient_id, checked) VALUES (?, ?, ?)
       ON CONFLICT(trip_date, ingredient_id) DO UPDATE SET checked = excluded.checked`,
      [tripDate, ingredientId, checked ? 1 : 0],
    );
  }

  async markPurchased(tripDate: IsoDate, ingredientId: string, qty: number, db: Db): Promise<void> {
    await db.run(
      `INSERT INTO shopping_items (trip_date, ingredient_id, checked, purchased_qty, purchased_at) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(trip_date, ingredient_id) DO UPDATE SET checked = 1,
       purchased_qty = COALESCE(shopping_items.purchased_qty, 0) + excluded.purchased_qty, purchased_at = excluded.purchased_at`,
      [tripDate, ingredientId, qty, nowIso()],
    );
  }

  /** Registra la spesa confermata; l'importo reale si somma a eventuali conferme precedenti dello stesso giorno. */
  async upsertTrip(tripDate: IsoDate, partial: boolean, db: Db, actualCents: number | null = null): Promise<void> {
    await db.run(
      `INSERT INTO shopping_trips (trip_date, confirmed_at, partial, actual_cents) VALUES (?, ?, ?, ?)
       ON CONFLICT(trip_date) DO UPDATE SET confirmed_at = excluded.confirmed_at, partial = excluded.partial,
       actual_cents = CASE WHEN excluded.actual_cents IS NULL THEN shopping_trips.actual_cents
                           ELSE COALESCE(shopping_trips.actual_cents, 0) + excluded.actual_cents END`,
      [tripDate, nowIso(), partial ? 1 : 0, actualCents],
    );
  }

  async getTrips(): Promise<{ tripDate: IsoDate; confirmedAt: string; partial: boolean; actualCents: number | null }[]> {
    const rows = await this.db.all<{ trip_date: string; confirmed_at: string; partial: number; actual_cents: number | null }>(
      'SELECT trip_date, confirmed_at, partial, actual_cents FROM shopping_trips ORDER BY trip_date',
    );
    return rows.map((r) => ({ tripDate: r.trip_date, confirmedAt: r.confirmed_at, partial: r.partial === 1, actualCents: r.actual_cents }));
  }

  /* --- Prezzi personali ---------------------------------------------- */

  async getUserPrices(): Promise<PriceEntry[]> {
    const rows = await this.db.all<{ ingredient_id: string; price_cents: number; quantity_milli: number; unit: 'g' | 'ml' | 'pz'; observed_at: string; store_type: string | null }>(
      'SELECT ingredient_id, price_cents, quantity_milli, unit, observed_at, store_type FROM ingredient_prices',
    );
    return rows.map((r) => ({
      ingredientId: r.ingredient_id,
      priceCents: r.price_cents,
      currency: 'EUR',
      quantity: r.quantity_milli / 1000,
      unit: r.unit,
      source: 'utente',
      sourceName: 'Inserito da te',
      observedAt: r.observed_at,
      storeType: (r.store_type ?? undefined) as PriceEntry['storeType'],
      reliability: 'alta',
    }));
  }

  async setUserPrice(ingredientId: string, priceCents: number, quantityMilli: number, unit: 'g' | 'ml' | 'pz', observedAt: IsoDate, storeType: string | null): Promise<void> {
    await this.db.run(
      `INSERT INTO ingredient_prices (ingredient_id, price_cents, quantity_milli, unit, observed_at, store_type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(ingredient_id) DO UPDATE SET price_cents = excluded.price_cents, quantity_milli = excluded.quantity_milli,
       unit = excluded.unit, observed_at = excluded.observed_at, store_type = excluded.store_type, updated_at = excluded.updated_at`,
      [ingredientId, priceCents, quantityMilli, unit, observedAt, storeType, nowIso()],
    );
  }

  async deleteUserPrice(ingredientId: string): Promise<void> {
    await this.db.run('DELETE FROM ingredient_prices WHERE ingredient_id = ?', [ingredientId]);
  }

  /* --- Preferiti ------------------------------------------------------ */

  async getFavorites(): Promise<Set<string>> {
    const rows = await this.db.all<{ recipe_id: string }>('SELECT recipe_id FROM favorite_recipes');
    return new Set(rows.map((r) => r.recipe_id));
  }

  async setFavorite(recipeId: string, favorite: boolean): Promise<void> {
    if (favorite) {
      await this.db.run('INSERT OR IGNORE INTO favorite_recipes (recipe_id, created_at) VALUES (?, ?)', [recipeId, nowIso()]);
    } else {
      await this.db.run('DELETE FROM favorite_recipes WHERE recipe_id = ?', [recipeId]);
    }
  }

  /* --- Esportazione e cancellazione ---------------------------------- */

  async exportAll(): Promise<Record<string, unknown[]>> {
    const tables = [
      'user_preferences',
      'notification_settings',
      'weekly_plans',
      'planned_meals',
      'meal_history',
      'pantry_items',
      'pantry_movements',
      'shopping_trips',
      'shopping_items',
      'favorite_recipes',
      'ingredient_prices',
    ];
    const out: Record<string, unknown[]> = {};
    for (const t of tables) out[t] = await this.db.all(`SELECT * FROM ${t}`);
    return out;
  }

  async wipeAll(): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const t of [
        'planned_meals',
        'weekly_plans',
        'meal_history',
        'pantry_movements',
        'pantry_items',
        'shopping_items',
        'shopping_trips',
        'favorite_recipes',
        'ingredient_prices',
        'notification_settings',
        'user_preferences',
      ]) {
        await tx.run(`DELETE FROM ${t}`);
      }
    });
  }
}
