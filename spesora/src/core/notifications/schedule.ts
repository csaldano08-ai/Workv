import { CatalogIndex } from '../domain/catalog';
import { addDays, localInstant, minutesToHHMM } from '../domain/dates';
import { hashString } from '../domain/random';
import type { IsoDate, MealType, PlannedMeal } from '../domain/types';
import { mealReminderBody, mealReminderTitle, SHOPPING_REMINDER_BODY, shoppingDay } from '../../i18n/assistant';

/**
 * Calcolo puro degli avvisi locali desiderati (NotificationScheduler, parte deterministica).
 * L'adattatore Expo confronta questo elenco con quanto già programmato sul dispositivo.
 */

export const NOTIFICATION_PREFIX = 'spesora:';
/** iOS mantiene al massimo 64 notifiche locali in attesa: restiamo sotto il limite. */
export const MAX_PENDING = 60;

export interface NotificationSettings {
  mealReminders: boolean;
  mealTypes: MealType[];
  /** Anticipo aggiuntivo rispetto all'inizio della preparazione. */
  leadMinutes: number;
  shoppingReminders: boolean;
  shoppingTimeMinutes: number;
  planEndReminder: boolean;
  quietStartMinutes: number;
  quietEndMinutes: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  mealReminders: true,
  mealTypes: ['pranzo', 'cena'],
  leadMinutes: 10,
  shoppingReminders: true,
  shoppingTimeMinutes: 9 * 60,
  planEndReminder: true,
  quietStartMinutes: 22 * 60,
  quietEndMinutes: 7 * 60,
};

export type NotificationKind = 'meal' | 'shopping' | 'plan_end';

export interface DesiredNotification {
  id: string;
  kind: NotificationKind;
  fireAt: Date;
  title: string;
  body: string;
  /** Destinazione interna (percorso Expo Router). */
  url: string;
}

export interface ScheduleInput {
  meals: PlannedMeal[];
  catalog: CatalogIndex;
  /** Date dei giorni di spesa con almeno un prodotto da acquistare. */
  shoppingTripDates: IsoDate[];
  planEnd: IsoDate | null;
  settings: NotificationSettings;
  now: Date;
}

export function isInQuietHours(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function makeId(kind: NotificationKind, key: string, content: string): string {
  return `${NOTIFICATION_PREFIX}${kind}:${key}:${hashString(content).toString(36)}`;
}

export function computeNotifications(input: ScheduleInput): DesiredNotification[] {
  const { settings, now, catalog } = input;
  const out: DesiredNotification[] = [];
  const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

  if (settings.mealReminders) {
    for (const meal of input.meals) {
      if (meal.status !== 'planned' || !settings.mealTypes.includes(meal.mealType)) continue;
      const recipe = catalog.recipe(meal.recipeId);
      if (!recipe) continue;
      const startMinutes = meal.timeMinutes - recipe.totalMinutes - settings.leadMinutes;
      const fireAt = localInstant(meal.date, startMinutes);
      if (fireAt.getTime() <= now.getTime()) continue;
      if (isInQuietHours(minuteOf(fireAt), settings.quietStartMinutes, settings.quietEndMinutes)) continue;
      const title = mealReminderTitle(meal.mealType, meal.id);
      const body = mealReminderBody(recipe.name, recipe.totalMinutes, meal.servings, meal.id);
      const url = `/ricetta/${recipe.id}?mealId=${encodeURIComponent(meal.id)}`;
      out.push({ id: makeId('meal', meal.id, `${fireAt.getTime()}|${body}|${url}`), kind: 'meal', fireAt, title, body, url });
    }
  }

  if (settings.shoppingReminders) {
    for (const date of new Set(input.shoppingTripDates)) {
      let minutes = settings.shoppingTimeMinutes;
      if (isInQuietHours(minutes, settings.quietStartMinutes, settings.quietEndMinutes)) minutes = settings.quietEndMinutes;
      const fireAt = localInstant(date, minutes);
      if (fireAt.getTime() <= now.getTime()) continue;
      const { title } = shoppingDay(0, date);
      const body = SHOPPING_REMINDER_BODY;
      const url = `/spesa?trip=${date}`;
      out.push({ id: makeId('shopping', date, `${fireAt.getTime()}|${url}`), kind: 'shopping', fireAt, title, body, url });
    }
  }

  if (settings.planEndReminder && input.planEnd) {
    let minutes = 18 * 60;
    if (isInQuietHours(minutes, settings.quietStartMinutes, settings.quietEndMinutes)) minutes = settings.quietEndMinutes;
    const fireAt = localInstant(input.planEnd, minutes);
    if (fireAt.getTime() > now.getTime()) {
      out.push({
        id: makeId('plan_end', input.planEnd, `${fireAt.getTime()}`),
        kind: 'plan_end',
        fireAt,
        title: 'La settimana è quasi finita',
        body: `Apri Spesora quando vuoi: preparo io il menù da ${addDays(input.planEnd, 1)} in poi.`,
        url: '/',
      });
    }
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id)).slice(0, MAX_PENDING);
}

export interface NotificationDiff {
  toCancel: string[];
  toSchedule: DesiredNotification[];
}

/** Confronta gli avvisi desiderati con quelli già programmati (solo quelli di Spesora). */
export function diffNotifications(desired: DesiredNotification[], scheduledIds: string[]): NotificationDiff {
  const desiredIds = new Set(desired.map((d) => d.id));
  const ours = scheduledIds.filter((id) => id.startsWith(NOTIFICATION_PREFIX));
  const existing = new Set(ours);
  return {
    toCancel: ours.filter((id) => !desiredIds.has(id)),
    toSchedule: desired.filter((d) => !existing.has(d.id)),
  };
}

export function describeFireTime(n: DesiredNotification): string {
  return `${n.fireAt.toDateString()} ${minutesToHHMM(n.fireAt.getHours() * 60 + n.fireAt.getMinutes())}`;
}
