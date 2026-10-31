import { CatalogIndex } from '../../core/domain/catalog';
import { addDays, diffDays, rangeDays } from '../../core/domain/dates';
import {
  computeMealConsumption,
  correctionMovement,
  pantryOutlook,
  stockFromMovements,
  toStock,
  type PantryEntry,
  type PantryOutlookItem,
} from '../../core/domain/pantry';
import {
  compatibleRecipes,
  explainNoCandidates,
  generatePlan,
  maxMinutesFor,
  MEAL_ORDER,
  suggestAlternatives,
  type PlannerInput,
  type ScoredCandidate,
} from '../../core/domain/planner';
import { parseProfile, weeklyBudgetCents } from '../../core/domain/profile';
import { hashString } from '../../core/domain/random';
import { futureNeeds, planShopping, type ShoppingPlan } from '../../core/domain/shopping';
import { IngredientPriceEngine, REFERENCE_PRICES, type PriceEntry } from '../../core/domain/prices';
import { shoppingCost, type ShoppingCost } from '../../core/domain/cost';
import { evaluateBudget, proposeCheaperWeek, type BudgetEvaluation, type CheaperWeekProposal, type MealChange } from '../../core/domain/budget';
import type { HistoryEntry, IsoDate, MealStatus, MilliQty, PlanIssue, PlannedMeal, UserProfile } from '../../core/domain/types';
import type { NotificationSettings } from '../../core/notifications/schedule';
import type { Db } from '../../core/storage/db';
import { newId, Repository, type PlanRow } from '../../core/storage/repository';

export const PLAN_DAYS = 7;

export interface InitialPantryItem {
  ingredientId: string;
  /** Milli-unità; null per ingredienti q.b. (solo presenza). */
  qty: MilliQty | null;
}

export interface AppSnapshot {
  today: IsoDate;
  onboarding: { draft: unknown; step: number; completed: boolean } | null;
  profile: UserProfile | null;
  notificationSettings: NotificationSettings;
  notificationPermissionRequested: boolean;
  plan: PlanRow | null;
  meals: PlannedMeal[];
  issues: PlanIssue[];
  pantry: Map<string, PantryEntry>;
  staples: Set<string>;
  expiries: Map<string, IsoDate | null>;
  outlook: PantryOutlookItem[];
  favorites: Set<string>;
  history: (HistoryEntry & { mealType: PlannedMeal['mealType']; servings: number })[];
  shopping: ShoppingPlan;
  checks: Map<string, boolean>;
  purchased: Map<string, number>;
  confirmedTrips: { tripDate: IsoDate; confirmedAt: string; partial: boolean; actualCents: number | null }[];
  /** Prezzi disponibili (riferimento + personali) e stime economiche. */
  prices: IngredientPriceEngine;
  userPrices: PriceEntry[];
  economics: { shopping: ShoppingCost; budget: BudgetEvaluation } | null;
}

export const checkKey = (tripDate: IsoDate, ingredientId: string) => `${tripDate}|${ingredientId}`;

export type CookResult =
  | { ok: true; shortfalls: { ingredientId: string; missing: MilliQty }[] }
  | { ok: false; reason: 'already_done' | 'not_found' };

export class SpesoraService {
  readonly repo: Repository;

  constructor(
    readonly db: Db,
    readonly catalog: CatalogIndex,
  ) {
    this.repo = new Repository(db);
  }

  /* ------------------------------------------------------------------ */
  /* Lettura                                                             */
  /* ------------------------------------------------------------------ */

  async snapshot(today: IsoDate): Promise<AppSnapshot> {
    const onboarding = await this.repo.getOnboarding();
    let profile: UserProfile | null = null;
    if (onboarding?.completed) {
      try {
        profile = parseProfile(onboarding.draft);
      } catch {
        profile = null; // preferenze corrotte: si torna all'onboarding senza cancellare nulla
      }
    }
    const { settings, permissionRequested } = await this.repo.getNotificationSettings();
    const plan = (await this.repo.getPlanCovering(today)) ?? (await this.repo.getLatestPlan());
    const meals = plan ? await this.repo.getMealsBetween(plan.startDate, plan.endDate) : [];
    const pantry = stockFromMovements(await this.repo.getMovements());
    const items = await this.repo.getPantryItems();
    const staples = new Set(items.filter((i) => i.staplePresent).map((i) => i.ingredientId));
    const expiries = new Map(items.filter((i) => i.expiryDate).map((i) => [i.ingredientId, i.expiryDate] as const));
    const stock = toStock(pantry);
    const userPrices = await this.repo.getUserPrices();
    const prices = new IngredientPriceEngine(REFERENCE_PRICES, userPrices, today);
    const shopping =
      profile && plan
        ? planShopping({
            meals,
            catalog: this.catalog,
            pantry: stock,
            presentStaples: staples,
            shoppingDays: profile.shoppingDays,
            today,
            horizonEnd: plan.endDate,
            portions: profile.portions,
          })
        : { trips: [], covered: [] };
    const shoppingItems = await this.repo.getShoppingItems();
    const checks = new Map(shoppingItems.map((s) => [checkKey(s.tripDate, s.ingredientId), s.checked]));
    const purchased = new Map(
      shoppingItems.filter((s) => s.purchasedQty !== null).map((s) => [checkKey(s.tripDate, s.ingredientId), s.purchasedQty ?? 0]),
    );
    const issues = profile && plan ? this.computeIssues(profile, plan, meals) : [];
    return {
      today,
      onboarding,
      profile,
      notificationSettings: settings,
      notificationPermissionRequested: permissionRequested,
      plan,
      meals: meals.sort(compareMeals),
      issues,
      pantry,
      staples,
      expiries,
      outlook: pantryOutlook(pantry, futureNeeds(meals, this.catalog, today, profile?.portions), expiries),
      favorites: await this.repo.getFavorites(),
      history: await this.repo.getHistory(),
      shopping,
      checks,
      purchased,
      confirmedTrips: await this.repo.getTrips(),
      prices,
      userPrices,
      economics:
        profile && plan
          ? {
              shopping: shoppingCost(shopping, this.catalog, prices),
              budget: evaluateBudget(meals, { catalog: this.catalog, prices, pantry: stock, presentStaples: staples, profile, today, horizonEnd: plan.endDate }),
            }
          : null,
    };
  }

  private computeIssues(profile: UserProfile, plan: PlanRow, meals: PlannedMeal[]): PlanIssue[] {
    const have = new Set(meals.map((m) => `${m.date}|${m.mealType}`));
    const issues: PlanIssue[] = [];
    for (const date of rangeDays(plan.startDate, diffDays(plan.startDate, plan.endDate) + 1)) {
      for (const mealType of profile.mealTypes) {
        if (have.has(`${date}|${mealType}`)) continue;
        const { code, message } = explainNoCandidates(profile, this.catalog, mealType, maxMinutesFor(profile, date));
        if (code === 'no_recipes_in_time' && hasCandidates(profile, this.catalog, mealType, maxMinutesFor(profile, date))) continue; // slot saltato perché già passato
        issues.push({ date, mealType, code, message });
      }
    }
    return issues;
  }

  private async plannerInput(profile: UserProfile, startDate: IsoDate, days: number, seed: number): Promise<PlannerInput> {
    const pantry = toStock(stockFromMovements(await this.repo.getMovements()));
    return {
      profile,
      catalog: this.catalog,
      startDate,
      days,
      pantry,
      history: await this.repo.getHistory(),
      favorites: await this.repo.getFavorites(),
      seed,
      prices: new IngredientPriceEngine(REFERENCE_PRICES, await this.repo.getUserPrices(), startDate),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Onboarding e piano                                                  */
  /* ------------------------------------------------------------------ */

  async saveOnboardingStep(draft: unknown, step: number): Promise<void> {
    await this.repo.saveOnboardingDraft(draft, step, false);
  }

  async completeOnboarding(
    profileRaw: unknown,
    initialPantry: InitialPantryItem[],
    notificationSettings: NotificationSettings,
    today: IsoDate,
    nowMinutes?: number,
  ): Promise<void> {
    const profile = parseProfile(profileRaw);
    await this.db.transaction(async (tx) => {
      await this.repo.saveOnboardingDraft(profile, 99, true, tx);
      await this.repo.saveNotificationSettings(notificationSettings, false, tx);
      for (const item of initialPantry) {
        this.catalog.ingredient(item.ingredientId);
        if (item.qty === null) await this.repo.setStaplePresent(item.ingredientId, true, tx);
        else if (item.qty > 0) {
          await this.repo.insertMovement({ ingredientId: item.ingredientId, delta: item.qty, kind: 'initial', mealId: null, note: null }, tx);
        }
      }
    });
    await this.createPlan(profile, today, undefined, nowMinutes);
  }

  /** Crea un nuovo calendario di 7 giorni a partire da `start`. */
  async createPlan(profile: UserProfile, start: IsoDate, seed = hashString(`spesora|${start}`), nowMinutes?: number): Promise<PlanRow> {
    const input = await this.plannerInput(profile, start, PLAN_DAYS, seed);
    input.skipFirstDayBefore = nowMinutes;
    // Pasti già esistenti nel periodo (es. piano precedente sovrapposto) vengono conservati se non più `planned`.
    const existing = await this.repo.getMealsBetween(start, addDays(start, PLAN_DAYS - 1));
    input.keep = existing.filter((m) => m.status !== 'planned');
    const { meals } = generatePlan(input);
    const plan: PlanRow = { id: newId('plan'), startDate: start, endDate: addDays(start, PLAN_DAYS - 1), seed };
    await this.db.transaction(async (tx) => {
      await this.repo.insertPlan(plan, tx);
      await this.repo.deletePlannedMeals(existing.filter((m) => m.status === 'planned').map((m) => m.id), tx);
      for (const m of meals) {
        if (m.status === 'planned') await this.repo.upsertMeal(plan.id, m, tx);
        else await tx.run('UPDATE planned_meals SET plan_id = ? WHERE id = ?', [plan.id, m.id]);
      }
    });
    return plan;
  }

  /** All'apertura: se nessun calendario copre oggi, ne genera uno nuovo automaticamente. */
  async ensureCurrentPlan(today: IsoDate, nowMinutes?: number): Promise<boolean> {
    const profile = await this.repo.getProfile();
    if (!profile) return false;
    if (await this.repo.getPlanCovering(today)) return false;
    await this.createPlan(profile, today, undefined, nowMinutes);
    return true;
  }

  /**
   * Rigenera i pasti futuri ancora da cucinare. Conserva pasti completati, saltati,
   * quelli passati, le scelte manuali (se richiesto) e tutti gli acquisti/consumi effettivi.
   */
  async regenerate(today: IsoDate, options: { keepManual?: boolean } = {}): Promise<void> {
    const profile = await this.repo.getProfile();
    if (!profile) throw new Error('Profilo non configurato');
    const plan = await this.repo.getPlanCovering(today);
    if (!plan) {
      await this.createPlan(profile, today);
      return;
    }
    const keepManual = options.keepManual ?? true;
    const seed = (plan.seed + 7919) >>> 0;
    const days = diffDays(today, plan.endDate) + 1;
    const input = await this.plannerInput(profile, today, days, seed);
    const existing = await this.repo.getMealsBetween(today, plan.endDate);
    input.keep = existing.filter((m) => m.status !== 'planned' || (keepManual && m.source !== 'auto'));
    const keptIds = new Set(input.keep.map((m) => m.id));
    const { meals } = generatePlan(input);
    await this.db.transaction(async (tx) => {
      await this.repo.updatePlanSeed(plan.id, seed, tx);
      await this.repo.deletePlannedMeals(existing.filter((m) => !keptIds.has(m.id)).map((m) => m.id), tx);
      for (const m of meals) if (!keptIds.has(m.id)) await this.repo.upsertMeal(plan.id, m, tx);
    });
  }

  async updateProfile(profileRaw: unknown, today: IsoDate): Promise<void> {
    const profile = parseProfile(profileRaw);
    await this.repo.saveOnboardingDraft(profile, 99, true);
    // I vincoli possono essere cambiati: si rigenerano i pasti futuri non ancora cucinati.
    await this.regenerate(today, { keepManual: false });
  }

  async updateNotificationSettings(settings: NotificationSettings, permissionRequested: boolean): Promise<void> {
    await this.repo.saveNotificationSettings(settings, permissionRequested);
  }

  /* ------------------------------------------------------------------ */
  /* Pasti                                                               */
  /* ------------------------------------------------------------------ */

  async alternatives(mealId: string, today: IsoDate, limit = 8): Promise<ScoredCandidate[]> {
    const profile = await this.repo.getProfile();
    const meal = await this.repo.getMeal(mealId);
    if (!profile || !meal) return [];
    const plan = await this.repo.getPlanCovering(meal.date);
    const meals = plan ? await this.repo.getMealsBetween(plan.startDate, plan.endDate) : [meal];
    const input = await this.plannerInput(profile, today, PLAN_DAYS, 0);
    return suggestAlternatives(input, meals, meal, limit);
  }

  async replaceRecipe(mealId: string, recipeId: string, source: PlannedMeal['source'] = 'manual'): Promise<boolean> {
    if (!this.catalog.recipe(recipeId)) throw new Error('Ricetta sconosciuta');
    const changes = await this.repo.updateMealFields(mealId, { recipeId, source, reasons: ['Scelta da te'] });
    return changes === 1;
  }

  async setServings(mealId: string, servings: number): Promise<boolean> {
    if (!Number.isInteger(servings) || servings < 1 || servings > 30) throw new Error('Numero di porzioni non valido');
    return (await this.repo.updateMealFields(mealId, { servings })) === 1;
  }

  async setMealTime(mealId: string, timeMinutes: number): Promise<boolean> {
    if (!Number.isInteger(timeMinutes) || timeMinutes < 0 || timeMinutes > 1439) throw new Error('Orario non valido');
    return (await this.repo.updateMealFields(mealId, { timeMinutes })) === 1;
  }

  /** Scambia le ricette di due pasti ancora da cucinare (sposta un pasto in un altro giorno). */
  async swapMeals(aId: string, bId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const a = await this.repo.getMeal(aId, tx);
      const b = await this.repo.getMeal(bId, tx);
      if (!a || !b || a.status !== 'planned' || b.status !== 'planned') return false;
      await this.repo.updateMealFields(a.id, { recipeId: b.recipeId, servings: b.servings, source: 'manual', reasons: ['Spostata da te'] }, tx);
      await this.repo.updateMealFields(b.id, { recipeId: a.recipeId, servings: a.servings, source: 'manual', reasons: ['Spostata da te'] }, tx);
      return true;
    });
  }

  /** "Ho cucinato": sottrae gli ingredienti una sola volta, in modo atomico. */
  async markCooked(mealId: string): Promise<CookResult> {
    // Profilo letto fuori dalla transazione: le porzioni abituali determinano le quantità consumate.
    const portions = (await this.repo.getProfile().catch(() => null))?.portions;
    return this.db.transaction(async (tx): Promise<CookResult> => {
      const meal = await this.repo.getMeal(mealId, tx);
      if (!meal) return { ok: false, reason: 'not_found' };
      const moved = await this.repo.transitionMeal(mealId, 'cooked', tx);
      if (!moved) return { ok: false, reason: 'already_done' };
      const stock = toStock(stockFromMovements(await this.repo.getMovements(tx)));
      const { movements, shortfalls } = computeMealConsumption(meal, this.catalog, stock, portions);
      for (const mv of movements) await this.repo.insertMovement(mv, tx);
      await this.repo.insertHistory(meal, 'cooked', tx);
      return { ok: true, shortfalls };
    });
  }

  /** "Non ho cucinato", "Mangio fuori", "Ho cucinato altro": nessun consumo. */
  async markNotFollowed(mealId: string, outcome: Exclude<MealStatus, 'planned' | 'cooked'>): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const meal = await this.repo.getMeal(mealId, tx);
      if (!meal) return false;
      if (!(await this.repo.transitionMeal(mealId, outcome, tx))) return false;
      await this.repo.insertHistory(meal, outcome, tx);
      return true;
    });
  }

  /** Ripropone la ricetta di un pasto non seguito nel prossimo pasto dello stesso tipo. */
  async reproposeLater(mealId: string): Promise<PlannedMeal | null> {
    const meal = await this.repo.getMeal(mealId);
    if (!meal) return null;
    const plan = await this.repo.getPlanCovering(meal.date);
    if (!plan) return null;
    const next = (await this.repo.getMealsBetween(addDays(meal.date, 1), plan.endDate)).find(
      (m) => m.mealType === meal.mealType && m.status === 'planned' && m.recipeId !== meal.recipeId,
    );
    if (!next) return null;
    await this.repo.updateMealFields(next.id, { recipeId: meal.recipeId, source: 'repeat', reasons: ['Riproposta dopo un pasto saltato'] });
    return { ...next, recipeId: meal.recipeId };
  }

  /* ------------------------------------------------------------------ */
  /* Spesa                                                               */
  /* ------------------------------------------------------------------ */

  async setChecked(tripDate: IsoDate, ingredientId: string, checked: boolean): Promise<void> {
    await this.repo.setChecked(tripDate, ingredientId, checked);
  }

  /**
   * Conferma gli acquisti effettivi (anche parziali). Solo qui i prodotti entrano in dispensa:
   * una voce soltanto spuntata o in lista NON è considerata acquistata.
   */
  async confirmShopping(
    tripDate: IsoDate,
    purchases: { ingredientId: string; qty: MilliQty; toTaste: boolean }[],
    partial: boolean,
    actualCents: number | null = null,
  ): Promise<void> {
    if (actualCents !== null && (!Number.isInteger(actualCents) || actualCents < 0 || actualCents > 10_000_000)) throw new Error('Importo speso non valido');
    for (const p of purchases) {
      this.catalog.ingredient(p.ingredientId);
      if (!p.toTaste && (!Number.isInteger(p.qty) || p.qty <= 0)) throw new Error('Quantità acquistata non valida');
    }
    await this.db.transaction(async (tx) => {
      for (const p of purchases) {
        if (p.toTaste) await this.repo.setStaplePresent(p.ingredientId, true, tx);
        else await this.repo.insertMovement({ ingredientId: p.ingredientId, delta: p.qty, kind: 'purchase', mealId: null, note: `spesa ${tripDate}` }, tx);
        await this.repo.markPurchased(tripDate, p.ingredientId, p.toTaste ? 0 : p.qty, tx);
      }
      await this.repo.upsertTrip(tripDate, partial, tx, actualCents);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Budget e prezzi                                                     */
  /* ------------------------------------------------------------------ */

  /** Proposta "Rendi questa settimana più economica": nulla viene salvato finché non si conferma. */
  async previewCheaperWeek(today: IsoDate): Promise<CheaperWeekProposal | null> {
    const profile = await this.repo.getProfile();
    const plan = await this.repo.getPlanCovering(today);
    if (!profile || !plan) return null;
    const meals = await this.repo.getMealsBetween(plan.startDate, plan.endDate);
    const input = await this.plannerInput(profile, today, diffDays(today, plan.endDate) + 1, plan.seed);
    const items = await this.repo.getPantryItems();
    const ctx = {
      catalog: this.catalog,
      prices: input.prices!,
      pantry: input.pantry,
      presentStaples: new Set(items.filter((i) => i.staplePresent).map((i) => i.ingredientId)),
      profile,
      today,
      horizonEnd: plan.endDate,
    };
    return proposeCheaperWeek(meals, input, ctx, { limitCents: weeklyBudgetCents(profile.budget) });
  }

  /** Applica le sostituzioni approvate. I pasti cucinati e gli acquisti confermati non cambiano. */
  async applyMealChanges(changes: MealChange[]): Promise<number> {
    let applied = 0;
    await this.db.transaction(async (tx) => {
      for (const c of changes) {
        if (!this.catalog.recipe(c.toRecipeId)) continue;
        applied += await this.repo.updateMealFields(c.mealId, { recipeId: c.toRecipeId, source: 'auto', reasons: ['Scelta per contenere la spesa'] }, tx);
      }
    });
    return applied;
  }

  /** Prezzo personale: importo pagato (centesimi) per una quantità (unità canonica dell'ingrediente). */
  async setUserPrice(ingredientId: string, priceCents: number, quantity: number, today: IsoDate, storeType: string | null = null): Promise<void> {
    const ing = this.catalog.ingredient(ingredientId);
    if (!Number.isInteger(priceCents) || priceCents <= 0 || priceCents > 100_000) throw new Error('Prezzo non valido');
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) throw new Error('Quantità non valida');
    await this.repo.setUserPrice(ingredientId, priceCents, Math.round(quantity * 1000), ing.unit, today, storeType);
  }

  async deleteUserPrice(ingredientId: string): Promise<void> {
    await this.repo.deleteUserPrice(ingredientId);
  }

  /* ------------------------------------------------------------------ */
  /* Dispensa                                                            */
  /* ------------------------------------------------------------------ */

  /** Correzione manuale: porta la quantità al valore reale indicato dall'utente. */
  async setPantryQty(ingredientId: string, target: MilliQty): Promise<void> {
    this.catalog.ingredient(ingredientId);
    await this.db.transaction(async (tx) => {
      const current = stockFromMovements(await this.repo.getMovements(tx)).get(ingredientId)?.qty ?? 0;
      const mv = correctionMovement(ingredientId, current, target);
      if (mv) await this.repo.insertMovement(mv, tx);
      else if (target === current) {
        // Conferma senza variazione: registra comunque un controllo per togliere lo stato "stimato".
        await this.repo.insertMovement({ ingredientId, delta: 0, kind: 'correction', mealId: null, note: 'verificato' }, tx);
      }
    });
  }

  async addPantry(ingredientId: string, qty: MilliQty): Promise<void> {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantità non valida');
    this.catalog.ingredient(ingredientId);
    await this.repo.insertMovement({ ingredientId, delta: qty, kind: 'manual_add', mealId: null, note: null });
  }

  /** Consumo fuori dall'app: sottrae al massimo quanto presente. */
  async removePantry(ingredientId: string, qty: MilliQty): Promise<void> {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantità non valida');
    await this.db.transaction(async (tx) => {
      const current = stockFromMovements(await this.repo.getMovements(tx)).get(ingredientId)?.qty ?? 0;
      const take = Math.min(current, qty);
      if (take > 0) await this.repo.insertMovement({ ingredientId, delta: -take, kind: 'manual_remove', mealId: null, note: null }, tx);
    });
  }

  async setStaplePresent(ingredientId: string, present: boolean): Promise<void> {
    await this.repo.setStaplePresent(ingredientId, present);
  }

  async setExpiry(ingredientId: string, expiry: IsoDate | null): Promise<void> {
    await this.repo.setExpiry(ingredientId, expiry);
  }

  async toggleFavorite(recipeId: string, favorite: boolean): Promise<void> {
    await this.repo.setFavorite(recipeId, favorite);
  }

  /* ------------------------------------------------------------------ */
  /* Dati                                                                */
  /* ------------------------------------------------------------------ */

  async exportJson(): Promise<string> {
    const data = await this.repo.exportAll();
    return JSON.stringify({ app: 'Spesora', format: 1, exportedAt: new Date().toISOString(), quantityUnit: 'milli-unità (1 g = 1000)', data }, null, 2);
  }

  async wipe(): Promise<void> {
    await this.repo.wipeAll();
  }
}

export function compareMeals(a: PlannedMeal, b: PlannedMeal): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType];
}

function hasCandidates(profile: UserProfile, catalog: CatalogIndex, mealType: PlannedMeal['mealType'], maxMinutes: number): boolean {
  return compatibleRecipes(profile, catalog).some((r) => r.mealTypes.includes(mealType) && r.totalMinutes <= maxMinutes);
}
