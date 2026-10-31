import { describe, expect, it } from 'vitest';
import { addDays, diffDays, localInstant, rangeDays, weekdayOf } from '../core/domain/dates';
import { checkHardConstraints, generatePlan } from '../core/domain/planner';
import { planShopping } from '../core/domain/shopping';
import { toMilli } from '../core/domain/quantity';
import type { PlannerInput } from '../core/domain/planner';
import type { UserProfile } from '../core/domain/types';
import { catalog, profile, profileA } from './helpers';

const MONDAY = '2026-11-02';

function input(p: UserProfile, overrides: Partial<PlannerInput> = {}): PlannerInput {
  return { profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 42, ...overrides };
}

describe('Test A — pianificazione ordinaria', () => {
  it('assegna tutti i pasti richiesti con tempi compatibili', () => {
    const p = profileA();
    const { meals, issues } = generatePlan(input(p));
    expect(issues).toEqual([]);
    expect(meals).toHaveLength(14);
    for (const date of rangeDays(MONDAY, 7)) {
      expect(meals.filter((m) => m.date === date).map((m) => m.mealType).sort()).toEqual(['cena', 'pranzo']);
    }
    for (const m of meals) {
      const r = catalog.recipe(m.recipeId)!;
      expect(r.totalMinutes).toBeLessThanOrEqual(20);
      expect(r.mealTypes).toContain(m.mealType);
      expect(r.equipment.every((e) => p.equipment.includes(e))).toBe(true);
      expect(m.servings).toBe(1);
    }
  });

  it('è riproducibile con lo stesso seed e varia con seed diversi', () => {
    const a = generatePlan(input(profileA())).meals.map((m) => m.recipeId);
    const b = generatePlan(input(profileA())).meals.map((m) => m.recipeId);
    const c = generatePlan(input(profileA(), { seed: 7 })).meals.map((m) => m.recipeId);
    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
  });

  it('evita ripetizioni eccessive nella settimana', () => {
    const { meals } = generatePlan(input(profile({ mealTypes: ['pranzo', 'cena'] })));
    const counts = new Map<string, number>();
    meals.forEach((m) => counts.set(m.recipeId, (counts.get(m.recipeId) ?? 0) + 1));
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(1);
  });

  it('tiene conto dello storico recente', () => {
    const first = generatePlan(input(profile())).meals;
    const history = first.map((m) => ({ recipeId: m.recipeId, date: addDays(m.date, -7), outcome: 'cooked' as const }));
    const second = generatePlan(input(profile(), { startDate: MONDAY, history })).meals;
    const overlap = second.filter((m) => first.some((f) => f.recipeId === m.recipeId)).length;
    expect(overlap).toBeLessThan(second.length / 2);
  });
});

describe('Primo giorno', () => {
  it('non pianifica i pasti già passati nel giorno di creazione', () => {
    const { meals, issues } = generatePlan(input(profileA(), { skipFirstDayBefore: 15 * 60 }));
    expect(meals.filter((m) => m.date === MONDAY).map((m) => m.mealType)).toEqual(['cena']);
    expect(meals).toHaveLength(13);
    expect(issues).toEqual([]);
  });
});

describe('Test B — ingredienti esclusi', () => {
  it('non seleziona ricette con latte, uova, frutta a guscio o allergeni non verificati', () => {
    const p = profile({ excludedAllergens: ['latte', 'uova', 'frutta_guscio'], mealTypes: ['colazione', 'pranzo', 'cena'] });
    const { meals } = generatePlan(input(p));
    expect(meals.length).toBeGreaterThan(0);
    for (const m of meals) {
      const facts = catalog.factsOf(catalog.recipe(m.recipeId)!);
      expect(facts.allergens).not.toContain('latte');
      expect(facts.allergens).not.toContain('uova');
      expect(facts.allergens).not.toContain('frutta_guscio');
      expect(facts.allergenInfoIncomplete).toBe(false);
    }
  });

  it('non rilassa mai i vincoli: se non ci sono ricette segnala il problema', () => {
    const allIngredients = catalog.catalog.ingredients.map((i) => i.id);
    const p = profile({ excludedIngredientIds: allIngredients });
    const { meals, issues } = generatePlan(input(p));
    expect(meals).toHaveLength(0);
    expect(issues.length).toBe(14);
    expect(issues[0].code).toBe('no_compatible_recipes');
    expect(issues[0].message).toMatch(/non vengono mai ignorate/);
  });

  it('rispetta le diete vegana e vegetariana', () => {
    for (const diet of ['vegano', 'vegetariano'] as const) {
      const { meals } = generatePlan(input(profile({ diet })));
      for (const m of meals) {
        const f = catalog.factsOf(catalog.recipe(m.recipeId)!);
        expect(diet === 'vegano' ? f.vegan : f.vegetarian).toBe(true);
      }
    }
  });

  it('esclude gli ingredienti non graditi e le attrezzature mancanti', () => {
    const p = profile({ dislikedIngredientIds: ['cipolla'], equipment: ['fornelli'] });
    for (const r of catalog.catalog.recipes) {
      const rejected = checkHardConstraints(r, p, catalog).length > 0;
      const hasOnion = r.ingredients.some((i) => i.ingredientId === 'cipolla');
      const needsOven = r.equipment.some((e) => e !== 'fornelli');
      expect(rejected).toBe(hasOnion || needsOven);
    }
  });
});

describe('Test C — tre giorni di spesa', () => {
  it('assegna ogni acquisto a una spesa compatibile con il giorno di utilizzo', () => {
    // martedì, giovedì, sabato
    const p = profile({ shoppingDays: [1, 3, 5], mealTypes: ['colazione', 'pranzo', 'cena'] });
    const { meals } = generatePlan(input(p));
    const plan = planShopping({
      meals,
      catalog,
      pantry: new Map(),
      presentStaples: new Set(),
      shoppingDays: p.shoppingDays,
      today: MONDAY,
      horizonEnd: addDays(MONDAY, 6),
    });
    const regular = plan.trips.filter((t) => !t.isInitial);
    for (const t of regular) expect([1, 3, 5]).toContain(weekdayOf(t.date));
    for (const trip of plan.trips) {
      for (const line of trip.lines) {
        for (const use of line.uses) {
          expect(trip.date <= use.date).toBe(true);
          if (use.date === trip.date && !trip.isInitial) expect(use.mealType).not.toBe('colazione');
        }
      }
    }
    // Lunedì precede il primo giorno di spesa: serve una spesa iniziale.
    expect(plan.trips[0].isInitial).toBe(true);
    expect(plan.trips[0].lines.every((l) => l.uses.some((u) => u.date === MONDAY || (u.date === '2026-11-03' && u.mealType === 'colazione')))).toBe(true);
  });

  it('aggrega le quantità e sottrae la dispensa confermata', () => {
    const base = { timeMinutes: 780, status: 'planned' as const, source: 'auto' as const, reasons: [] };
    // pasta al tonno per 1 = 80 g; pasta al pesto per 3 = 240 g (80 g a porzione)
    const meals = [
      { ...base, id: 'a', date: MONDAY, mealType: 'pranzo' as const, recipeId: 'pasta_al_tonno', servings: 1 },
      { ...base, id: 'b', date: MONDAY, mealType: 'cena' as const, recipeId: 'pasta_al_pesto', servings: 3 },
    ];
    const plan = planShopping({
      meals,
      catalog,
      pantry: new Map([['pasta_secca', toMilli(50)]]),
      presentStaples: new Set(),
      shoppingDays: [0],
      today: MONDAY,
      horizonEnd: MONDAY,
    });
    const pasta = plan.trips.flatMap((t) => t.lines).find((l) => l.ingredientId === 'pasta_secca')!;
    // 80 g + 240 g richiesti, 50 g confermati in dispensa → 270 g netti
    expect(pasta.qty).toBe(toMilli(270));
    expect(pasta.uses.map((u) => u.mealId)).toEqual(['a', 'b']);
    expect(plan.covered.find((c) => c.ingredientId === 'pasta_secca')?.qty).toBe(toMilli(50));
    expect(pasta.packs).toEqual({ packSize: 500, count: 1, total: toMilli(500) });
  });

  it("riusa l'eccedenza di una confezione per i pasti successivi conservabili", () => {
    const base = { timeMinutes: 780, status: 'planned' as const, source: 'auto' as const, reasons: [], mealType: 'pranzo' as const, servings: 1 };
    const meals = [
      { ...base, id: 'a', date: '2026-11-03', recipeId: 'pasta_al_tonno' },
      { ...base, id: 'b', date: '2026-11-06', recipeId: 'pasta_al_pesto' },
    ];
    const plan = planShopping({ meals, catalog, pantry: new Map(), presentStaples: new Set(), shoppingDays: [1, 3], today: MONDAY, horizonEnd: addDays(MONDAY, 6) });
    const pastaLines = plan.trips.flatMap((t) => t.lines.filter((l) => l.ingredientId === 'pasta_secca').map((l) => ({ date: t.date, l })));
    expect(pastaLines).toHaveLength(1);
    expect(pastaLines[0].date).toBe('2026-11-03');
    // fabbisogno netto 160 g coperto da un'unica confezione da 500 g
    expect(pastaLines[0].l.qty).toBe(toMilli(160));
    expect(pastaLines[0].l.suggestedQty).toBe(toMilli(500));
    expect(pastaLines[0].l.uses.map((u) => u.mealId)).toEqual(['a', 'b']);
  });
});

describe('Test H — calendario', () => {
  it('gestisce cambio mese e cambio anno', () => {
    expect(addDays('2026-10-29', 7)).toBe('2026-11-05');
    expect(rangeDays('2026-12-28', 7)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(weekdayOf('2027-01-01')).toBe(4); // venerdì
  });

  it("gestisce l'ora legale italiana (marzo e ottobre)", () => {
    // 29 marzo 2026: alle 02:00 si passa alle 03:00
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(rangeDays('2026-03-27', 4)).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30']);
    const noon = localInstant('2026-03-29', 12 * 60);
    expect(noon.getHours()).toBe(12);
    expect(noon.getTimezoneOffset()).toBe(-120);
    const before = localInstant('2026-03-28', 12 * 60);
    expect(before.getTimezoneOffset()).toBe(-60);
    expect(noon.getTime() - before.getTime()).toBe(23 * 3600_000);
    // 25 ottobre 2026: si torna all'ora solare, giornata di 25 ore
    const a = localInstant('2026-10-25', 0);
    const b = localInstant('2026-10-26', 0);
    expect(b.getTime() - a.getTime()).toBe(25 * 3600_000);
    expect(localInstant('2026-10-25', 20 * 60).getHours()).toBe(20);
  });

  it('genera un piano valido attraverso il cambio anno', () => {
    const { meals } = generatePlan(input(profile(), { startDate: '2026-12-29' }));
    expect(new Set(meals.map((m) => m.date))).toEqual(new Set(rangeDays('2026-12-29', 7)));
  });
});
