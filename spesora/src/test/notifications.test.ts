import { describe, expect, it } from 'vitest';
import { computeNotifications, diffNotifications, DEFAULT_NOTIFICATION_SETTINGS, isInQuietHours, MAX_PENDING } from '../core/notifications/schedule';
import { parseRouteFromNotification } from '../core/notifications/routing';
import type { PlannedMeal } from '../core/domain/types';
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
