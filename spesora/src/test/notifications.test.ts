import { describe, expect, it } from 'vitest';
import { computeNotifications, diffNotifications, DEFAULT_NOTIFICATION_SETTINGS, isInQuietHours, MAX_PENDING } from '../core/notifications/schedule';
import { parseRouteFromNotification } from '../core/notifications/routing';
import type { PlannedMeal } from '../core/domain/types';
import { prepAheadOf, prepAheadShort } from '../core/domain/prepAhead';
import { catalog } from './helpers';

const meal: PlannedMeal = {
  id: 'm_2026-11-03_pranzo',
  date: '2026-11-03',
  mealType: 'pranzo',
  timeMinutes: 13 * 60,
  recipeId: 'pasta_al_tonno',
  servings: 2,
  status: 'planned',
  source: 'auto',
  reasons: [],
};
const now = new Date(2026, 10, 2, 9, 0); // 2 novembre 2026, 9:00 locali

function compute(meals: PlannedMeal[], extra: Partial<Parameters<typeof computeNotifications>[0]> = {}) {
  return computeNotifications({ meals, catalog, shoppingTripDates: [], planEnd: null, settings: DEFAULT_NOTIFICATION_SETTINGS, now, ...extra });
}

describe('Test I — notifiche', () => {
  it('calcola orario = pasto − durata ricetta − anticipo, con destinazione valida', () => {
    const [n] = compute([meal]);
    const recipe = catalog.recipe('pasta_al_tonno')!;
    const expected = new Date(2026, 10, 3, 13, 0 - recipe.totalMinutes - DEFAULT_NOTIFICATION_SETTINGS.leadMinutes);
    expect(n.fireAt.getTime()).toBe(expected.getTime());
    expect(n.url).toBe('/ricetta/pasta_al_tonno?mealId=m_2026-11-03_pranzo');
    expect(n.body).toContain('pasta al tonno');
    expect(parseRouteFromNotification({ url: n.url })).toBe(n.url);
  });

  it('cambiando orario del pasto la vecchia notifica viene annullata', () => {
    const [old] = compute([meal]);
    const updated = compute([{ ...meal, timeMinutes: 14 * 60 }]);
    const diff = diffNotifications(updated, [old.id, 'altra-app:123']);
    expect(diff.toCancel).toEqual([old.id]);
    expect(diff.toSchedule).toHaveLength(1);
    expect(diff.toSchedule[0].id).not.toBe(old.id);
    expect(diff.toSchedule[0].url).toBe(old.url);
    // Nessun duplicato se nulla cambia; notifiche di altre app ignorate
    expect(diffNotifications(updated, [updated[0].id])).toEqual({ toCancel: [], toSchedule: [] });
  });

  it('pasto cucinato o cancellato: nessuna notifica', () => {
    expect(compute([{ ...meal, status: 'cooked' }])).toEqual([]);
    const [old] = compute([meal]);
    expect(diffNotifications(compute([]), [old.id]).toCancel).toEqual([old.id]);
  });

  it('non programma nel passato né nelle fasce di silenzio', () => {
    expect(compute([{ ...meal, date: '2026-11-01' }])).toEqual([]);
    expect(compute([{ ...meal, mealType: 'colazione', timeMinutes: 7 * 60 }], { settings: { ...DEFAULT_NOTIFICATION_SETTINGS, mealTypes: ['colazione'] } })).toEqual([]);
    expect(isInQuietHours(23 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(isInQuietHours(6 * 60 + 59, 22 * 60, 7 * 60)).toBe(true);
    expect(isInQuietHours(7 * 60, 22 * 60, 7 * 60)).toBe(false);
  });

  it('promemoria della spesa apre la lista corretta e rispetta le preferenze', () => {
    const list = compute([], { shoppingTripDates: ['2026-11-03', '2026-11-03'] });
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe('/spesa?trip=2026-11-03');
    expect(list[0].fireAt.getHours()).toBe(9);
    expect(compute([], { shoppingTripDates: ['2026-11-03'], settings: { ...DEFAULT_NOTIFICATION_SETTINGS, shoppingReminders: false } })).toEqual([]);
  });

  it('rispetta il limite di notifiche in attesa di iOS', () => {
    const many: PlannedMeal[] = Array.from({ length: 100 }, (_, i) => ({ ...meal, id: `m${i}`, date: `2026-12-${String((i % 28) + 1).padStart(2, '0')}`, timeMinutes: 600 + i }));
    expect(compute(many).length).toBe(MAX_PENDING);
  });

  it('rifiuta destinazioni non riconosciute', () => {
    expect(parseRouteFromNotification({ url: 'https://example.com' })).toBeNull();
    expect(parseRouteFromNotification({ url: '/ricetta/../../x' })).toBeNull();
    expect(parseRouteFromNotification({})).toBeNull();
    expect(parseRouteFromNotification({ url: '/spesa?trip=2026-11-03' })).toBe('/spesa?trip=2026-11-03');
  });
});

describe('Tono dell’assistente', () => {
  it('le frasi sono brevi, citano la ricetta e non colpevolizzano', async () => {
    const { greeting, cookSoon, mealReminderBody, shoppingDay, swapSuggestion, EMPTY, TIPS, FORBIDDEN_TONE } = await import('../i18n/assistant');
    const samples = [
      ...[0, 8, 14, 21].map((h) => greeting(h, 'k' + h)),
      ...['a', 'b', 'c', 'd'].map((k) => cookSoon('Pasta al tonno', 20, k)),
      cookSoon('Pasta al tonno', 15, 'x'),
      mealReminderBody('Pasta al tonno', 20, 2, 'm'),
      shoppingDay(3, 'd').body,
      swapSuggestion('s'),
      ...Object.values(EMPTY),
      ...TIPS,
    ];
    for (const s of samples) {
      expect(s.length).toBeLessThan(200);
      for (const bad of FORBIDDEN_TONE) expect(s.toLowerCase()).not.toContain(bad);
    }
    expect(cookSoon('Pasta al tonno', 20, 'a')).toContain('pasta al tonno');
    expect(cookSoon('Pasta al tonno', 15, 'a')).toMatch(/15 minuti/);
    expect(greeting(9, 'x')).toBe(greeting(9, 'x'));
  });
});

describe('Preparazioni della sera prima', () => {
  const overnight = catalog.catalog.recipes.find((r) => prepAheadOf(r)?.kind === 'riposo' && r.mealTypes.includes('colazione'))!;

  it('riconosce in modo deterministico riposo notturno e scongelamento, senza falsi positivi', () => {
    expect(overnight).toBeDefined();
    const all = catalog.catalog.recipes.filter((r) => prepAheadOf(r));
    expect(all.some((r) => prepAheadOf(r)!.kind === 'scongelamento')).toBe(true);
    // "Non serve metterli in ammollo" o un ammollo di 20 minuti non sono preparazioni del giorno prima.
    expect(prepAheadOf(catalog.recipe('pasta_al_tonno')!)).toBeNull();
    for (const r of all) expect(prepAheadShort(prepAheadOf(r)!).length).toBeLessThanOrEqual(140);
  });

  it('programma il promemoria alle 20 del giorno prima, anche per la colazione', () => {
    const m: PlannedMeal = { ...meal, id: 'm_2026-11-04_colazione', date: '2026-11-04', mealType: 'colazione', timeMinutes: 8 * 60, recipeId: overnight.id };
    const prep = compute([m]).filter((n) => n.kind === 'prep');
    expect(prep).toHaveLength(1);
    expect(prep[0].fireAt.getTime()).toBe(new Date(2026, 10, 3, 20, 0).getTime());
    expect(prep[0].title).toBe('Per la colazione di domani');
    expect(prep[0].body).toContain(overnight.name);
    expect(parseRouteFromNotification({ url: prep[0].url })).toBe(prep[0].url);
  });

  it('non programma promemoria passati, per pasti già cucinati o con i promemoria spenti', () => {
    const m: PlannedMeal = { ...meal, id: 'm_2026-11-02_colazione', date: '2026-11-02', mealType: 'colazione', recipeId: overnight.id };
    expect(compute([m]).filter((n) => n.kind === 'prep')).toHaveLength(0);
    const later: PlannedMeal = { ...m, id: 'm_2026-11-05_colazione', date: '2026-11-05' };
    expect(compute([{ ...later, status: 'cooked' }]).filter((n) => n.kind === 'prep')).toHaveLength(0);
    expect(compute([later], { settings: { ...DEFAULT_NOTIFICATION_SETTINGS, mealReminders: false } }).filter((n) => n.kind === 'prep')).toHaveLength(0);
  });
});

describe('Festeggiamenti di Mina', () => {
  it('consegna l’evento a chi è in ascolto e smette dopo l’annullamento', async () => {
    const { celebrate, onCelebrate } = await import('../ui/celebration');
    const seen: string[] = [];
    const off = onCelebrate((c) => seen.push(c.title));
    celebrate({ title: 'Pasto completato', text: 'ok' });
    off();
    celebrate({ title: 'Ignorato', text: 'ok' });
    expect(seen).toEqual(['Pasto completato']);
  });
});
