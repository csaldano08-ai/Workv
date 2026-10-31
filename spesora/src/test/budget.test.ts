import { describe, expect, it } from 'vitest';
import { evaluateBudget, proposeCheaperWeek, scopeNote, type EconomicsContext } from '../core/domain/budget';
import { recipeCost, shoppingCost, tripCost } from '../core/domain/cost';
import { generatePlan, type PlannerInput } from '../core/domain/planner';
import { DEFAULT_PORTIONS } from '../core/domain/portions';
import { freshness, IngredientPriceEngine, normalizedCents, type PriceEntry } from '../core/domain/prices';
import { parseProfile, weeklyBudgetCents } from '../core/domain/profile';
import { toMilli } from '../core/domain/quantity';
import { planShopping } from '../core/domain/shopping';
import type { PlannedMeal, UserProfile } from '../core/domain/types';
import { catalog, onboardedService, profile } from './helpers';

const MONDAY = '2026-11-02';

/** Prezzo di PROVA (dati sintetici per i test, non prezzi reali). */
function price(ingredientId: string, priceCents: number, quantity: number, observedAt = MONDAY): PriceEntry {
  const unit = catalog.ingredient(ingredientId).unit;
  return { ingredientId, priceCents, currency: 'EUR', quantity, unit, source: 'utente', sourceName: 'test', observedAt, reliability: 'alta' };
}

/** Listino sintetico che copre tutti gli ingredienti: serve solo a rendere le stime "complete" nei test. */
function fullTestPriceList(): PriceEntry[] {
  return catalog.catalog.ingredients.map((i) => price(i.id, i.unit === 'pz' ? 50 : 150, i.unit === 'pz' ? 1 : 500));
}

const meal = (id: string, recipeId: string, servings = 2, date = MONDAY, mealType: PlannedMeal['mealType'] = 'pranzo'): PlannedMeal => ({
  id,
  date,
  mealType,
  timeMinutes: 780,
  recipeId,
  servings,
  status: 'planned',
  source: 'auto',
  reasons: [],
});

describe('IngredientPriceEngine', () => {
  const engine = new IngredientPriceEngine([], [price('pasta_secca', 120, 500), price('latte', 129, 1000), price('uova', 240, 6)], MONDAY);

  it('normalizza a kg, litro e pezzo', () => {
    expect(normalizedCents(price('pasta_secca', 120, 500))).toBe(240); // 2,40 €/kg
    expect(normalizedCents(price('latte', 129, 1000))).toBe(129); // 1,29 €/l
    expect(normalizedCents(price('uova', 240, 6))).toBe(40); // 0,40 €/pz
  });

  it('calcola il costo per quantità in centesimi interi', () => {
    expect(engine.costForQty('pasta_secca', toMilli(100))).toBe(24);
    expect(engine.costForQty('latte', toMilli(250))).toBe(32); // 32,25 → 32
    expect(engine.costForQty('pasta_secca', toMilli(1))).toBe(0); // 0,24 cent → 0
    expect(Number.isInteger(engine.costForQty('uova', toMilli(1.5))!)).toBe(true);
  });

  it('distingue costo consumato e costo alla cassa (confezione intera)', () => {
    expect(engine.costForQty('pasta_secca', toMilli(420))).toBe(101);
    expect(engine.cartCost('pasta_secca', toMilli(420), [500, 1000])).toEqual({ cents: 120, purchasedQty: toMilli(500) });
    expect(engine.cartCost('pasta_secca', toMilli(900), [500, 1000])).toEqual({ cents: 240, purchasedQty: toMilli(1000) });
  });

  it('prezzi mancanti restano sconosciuti; quelli vecchi sono segnalati come obsoleti', () => {
    expect(engine.costForQty('tonno_scatola', toMilli(100))).toBeNull();
    expect(engine.cartCost('tonno_scatola', toMilli(100), undefined)).toBeNull();
    expect(freshness(price('pasta_secca', 120, 500, '2026-01-01'), MONDAY)).toBe('obsoleto');
    expect(freshness(price('pasta_secca', 120, 500, '2026-10-01'), MONDAY)).toBe('aggiornato');
  });

  it('il prezzo personale prevale sul riferimento', () => {
    const ref = { ...price('pasta_secca', 200, 500), source: 'riferimento' as const };
    const e = new IngredientPriceEngine([ref], [price('pasta_secca', 90, 500)], MONDAY);
    expect(e.quote('pasta_secca')?.entry.priceCents).toBe(90);
  });
});

describe('RecipeCostEngine', () => {
  const recipe = catalog.recipe('pasta_al_tonno')!;
  const partial = new IngredientPriceEngine([], [price('pasta_secca', 120, 500)], MONDAY);
  const full = new IngredientPriceEngine([], fullTestPriceList(), MONDAY);

  it('stima parziale: nessun costo per porzione senza tutti i prezzi', () => {
    const c = recipeCost(recipe, catalog, partial, 2);
    expect(c.completeness).toBe('parziale');
    expect(c.perServingCents).toBeNull();
    expect(c.knownCents).toBe(38); // 160 g di pasta = 38,4 → 38
    expect(recipeCost(recipe, catalog, new IngredientPriceEngine([], [], MONDAY), 2).completeness).toBe('assente');
  });

  it('segue porzioni, numero di persone e dispensa', () => {
    const base = recipeCost(recipe, catalog, full, 2);
    expect(base.completeness).toBe('completa');
    const four = recipeCost(recipe, catalog, full, 4);
    expect(Math.abs(four.knownCents - base.knownCents * 2)).toBeLessThanOrEqual(2);
    const big = recipeCost(recipe, catalog, full, 2, { ...DEFAULT_PORTIONS, pastaGrams: 110 });
    expect(big.knownCents).toBeGreaterThan(base.knownCents);
    const withPantry = recipeCost(recipe, catalog, full, 2, undefined, new Map([['pasta_secca', toMilli(500)]]));
    expect(withPantry.toBuyKnownCents).toBeLessThan(withPantry.knownCents);
  });
});

describe('Costo della spesa', () => {
  const full = new IngredientPriceEngine([], fullTestPriceList(), MONDAY);
  const shopping = (meals: PlannedMeal[], pantry = new Map<string, number>()) =>
    planShopping({ meals, catalog, pantry, presentStaples: new Set(), shoppingDays: [0, 3], today: MONDAY, horizonEnd: '2026-11-08' });

  it('aggrega e non conta due volte una confezione condivisa da più ricette', () => {
    const plan = shopping([meal('a', 'pasta_al_tonno', 1), meal('b', 'pasta_al_pesto', 1, '2026-11-02', 'cena')]);
    const pastaLines = plan.trips.flatMap((t) => t.lines).filter((l) => l.ingredientId === 'pasta_secca');
    expect(pastaLines).toHaveLength(1);
    const cost = shoppingCost(plan, catalog, full);
    // una sola confezione da 500 g a 1,50 € per la pasta
    expect(full.cartCost('pasta_secca', pastaLines[0].qty, [500, 1000])?.cents).toBe(150);
    expect(cost.completeness).toBe('completa');
  });

  it('distribuisce la spesa per giorno senza dividere il budget in parti uguali', () => {
    const plan = shopping([meal('a', 'pasta_al_tonno', 2), meal('b', 'salmone_padella_zucchine', 2, '2026-11-05', 'cena')]);
    const trips = plan.trips.map((t) => tripCost(t, catalog, full));
    expect(trips.length).toBe(2);
    expect(trips[0].knownCents).not.toBe(trips[1].knownCents);
    expect(shoppingCost(plan, catalog, full).knownCents).toBe(trips[0].knownCents + trips[1].knownCents);
  });

  it('ciò che è già in dispensa non si ricompra', () => {
    const without = shoppingCost(shopping([meal('a', 'pasta_al_tonno', 2)]), catalog, full).knownCents;
    const withPasta = shoppingCost(shopping([meal('a', 'pasta_al_tonno', 2)], new Map([['pasta_secca', toMilli(500)]])), catalog, full).knownCents;
    expect(withPasta).toBe(without - 150);
  });
});

describe('Budget nel profilo', () => {
  it('converte un budget mensile in settimanale', () => {
    expect(weeklyBudgetCents({ mode: 'limite', amountCents: 26000, period: 'mese', scope: 'pasti_spesora', store: 'non_indicato' })).toBe(6000);
    expect(weeklyBudgetCents({ mode: 'off', amountCents: 26000, period: 'mese', scope: 'pasti_spesora', store: 'non_indicato' })).toBeNull();
  });

  it('migra i profili esistenti senza perdere il vecchio budget', () => {
    const old: Record<string, unknown> = { ...profile(), weeklyBudgetCents: 5000 };
    delete old.budget;
    expect(parseProfile(old).budget).toMatchObject({ mode: 'limite', amountCents: 5000, period: 'settimana' });
    const none: Record<string, unknown> = { ...profile() };
    delete none.budget;
    expect(parseProfile(none).budget.mode).toBe('off');
  });

  it('chiarisce quando la stima riguarda solo una parte dei pasti', () => {
    expect(scopeNote(profile({ mealTypes: ['cena'] }))).toMatch(/solo ai pasti/);
    expect(scopeNote(profile({ budget: { mode: 'limite', amountCents: 5000, period: 'settimana', scope: 'parte_spesa', store: 'discount' } }))).toMatch(/parte/);
  });
});

describe('BudgetMealPlanner', () => {
  const plannerInput = (p: UserProfile, prices?: IngredientPriceEngine): PlannerInput => ({
    profile: p,
    catalog,
    startDate: MONDAY,
    days: 7,
    pantry: new Map(),
    history: [],
    favorites: new Set(),
    seed: 5,
    prices,
  });
  const ctx = (p: UserProfile, prices: IngredientPriceEngine): EconomicsContext => ({ catalog, prices, pantry: new Map(), presentStaples: new Set(), profile: p, today: MONDAY, horizonEnd: '2026-11-08' });

  it('con il budget attivo servono meno prodotti diversi, mantenendo varietà e pasti', () => {
    const off = profile();
    const minimo = profile({ budget: { mode: 'minimo', amountCents: null, period: 'settimana', scope: 'pasti_spesora', store: 'non_indicato' } });
    const prices = new IngredientPriceEngine([], [], MONDAY);
    const a = generatePlan(plannerInput(off)).meals;
    const b = generatePlan(plannerInput(minimo)).meals;
    expect(b).toHaveLength(a.length);
    expect(evaluateBudget(b, ctx(minimo, prices)).purchases).toBeLessThan(evaluateBudget(a, ctx(off, prices)).purchases);
    expect(new Set(b.map((m) => m.recipeId)).size).toBeGreaterThanOrEqual(b.length - 1);
  });

  it('non supera mai le esclusioni per risparmiare', () => {
    const p = profile({ excludedAllergens: ['glutine', 'latte'], budget: { mode: 'minimo', amountCents: 1000, period: 'settimana', scope: 'pasti_spesora', store: 'discount' } });
    const prices = new IngredientPriceEngine([], fullTestPriceList(), MONDAY);
    const meals = generatePlan(plannerInput(p, prices)).meals;
    const proposal = proposeCheaperWeek(meals, plannerInput(p, prices), ctx(p, prices), { limitCents: 1000 });
    for (const m of proposal.meals) {
      const f = catalog.factsOf(catalog.recipe(m.recipeId)!);
      expect(f.allergens).not.toContain('glutine');
      expect(f.allergens).not.toContain('latte');
    }
  });

  it('budget impossibile: nessun pasto eliminato, porzioni invariate, esito dichiarato', () => {
    const p = profile({ budget: { mode: 'limite', amountCents: 100, period: 'settimana', scope: 'pasti_spesora', store: 'non_indicato' } });
    const prices = new IngredientPriceEngine([], fullTestPriceList(), MONDAY);
    const meals = generatePlan(plannerInput(p, prices)).meals;
    const proposal = proposeCheaperWeek(meals, plannerInput(p, prices), ctx(p, prices), { limitCents: 100 });
    expect(proposal.meals).toHaveLength(meals.length);
    expect(proposal.meals.every((m) => m.servings === p.servings)).toBe(true);
    expect(proposal.limitReached).toBe(false);
    expect(proposal.after.knownCents).toBeLessThanOrEqual(proposal.before.knownCents);
    expect(proposal.savingCents).toBe(proposal.before.knownCents - proposal.after.knownCents);
  });

  it('senza prezzi completi non dichiara risparmi in euro', () => {
    const p = profile({ budget: { mode: 'minimo', amountCents: null, period: 'settimana', scope: 'pasti_spesora', store: 'non_indicato' } });
    const prices = new IngredientPriceEngine([], [price('pasta_secca', 120, 500)], MONDAY);
    const meals = generatePlan(plannerInput(profile(), prices)).meals;
    const proposal = proposeCheaperWeek(meals, plannerInput(p, prices), ctx(p, prices));
    expect(proposal.savingCents).toBeNull();
    expect(proposal.limitReached).toBeNull();
    expect(proposal.after.purchases).toBeLessThanOrEqual(proposal.before.purchases);
  });
});

describe('Integrazione con servizio, spesa e dispensa', () => {
  it('prezzi personali, stima della settimana e spesa reale restano distinte', async () => {
    const p = profile({ servings: 1, mealTypes: ['pranzo', 'cena'], budget: { mode: 'equilibrato', amountCents: 4000, period: 'settimana', scope: 'pasti_spesora', store: 'supermercato' } });
    const { service } = await onboardedService(p, MONDAY);
    await service.setUserPrice('pasta_secca', 120, 500, MONDAY);
    await expect(service.setUserPrice('pasta_secca', 0, 500, MONDAY)).rejects.toThrow();
    await expect(service.setUserPrice('pasta_secca', 100, -1, MONDAY)).rejects.toThrow();
    let snap = await service.snapshot(MONDAY);
    expect(snap.userPrices).toHaveLength(1);
    expect(snap.economics?.budget.weeklyLimitCents).toBe(4000);
    expect(snap.economics?.budget.withinBudget).toBeNull(); // prezzi incompleti → non determinabile
    const trip = snap.shopping.trips[0];
    const line = trip.lines.find((l) => !l.toTaste)!;
    const totalFor = (sn: typeof snap) => sn.shopping.trips.flatMap((t) => t.lines).filter((l) => l.ingredientId === line.ingredientId).reduce((s, l) => s + l.qty, 0);
    const before = totalFor(snap);
    await service.confirmShopping(trip.date, [{ ingredientId: line.ingredientId, qty: line.suggestedQty, toTaste: false }], true, 1250);
    snap = await service.snapshot(MONDAY);
    expect(snap.confirmedTrips[0].actualCents).toBe(1250);
    // il prodotto acquistato copre il fabbisogno di quella spesa: non si ricompra
    expect(totalFor(snap)).toBeLessThanOrEqual(before - line.qty);
    expect(snap.pantry.get(line.ingredientId)?.qty).toBe(line.suggestedQty);
    await service.deleteUserPrice('pasta_secca');
    expect((await service.snapshot(MONDAY)).userPrices).toHaveLength(0);
  });

  it('la proposta di settimana più economica si applica solo su conferma', async () => {
    const p = profile({ budget: { mode: 'minimo', amountCents: null, period: 'settimana', scope: 'pasti_spesora', store: 'non_indicato' } });
    const { service } = await onboardedService(p, MONDAY);
    const before = (await service.snapshot(MONDAY)).meals.map((m) => m.recipeId);
    const proposal = (await service.previewCheaperWeek(MONDAY))!;
    expect((await service.snapshot(MONDAY)).meals.map((m) => m.recipeId)).toEqual(before);
    const applied = await service.applyMealChanges(proposal.changes);
    expect(applied).toBe(proposal.changes.length);
    const after = await service.snapshot(MONDAY);
    expect(after.meals).toHaveLength(before.length);
  });
});
