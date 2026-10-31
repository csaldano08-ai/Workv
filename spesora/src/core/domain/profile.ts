import { z } from 'zod';
import {
  ALLERGENS,
  APPETITES,
  BUDGET_MODES,
  DIETS,
  EQUIPMENT,
  GENDERS,
  LIFESTYLES,
  LIKES,
  MEAL_GOALS,
  MEAL_TYPES,
  PROTEIN_SIZES,
  WEEK_STYLES,
  type DaySchedule,
  type UserProfile,
  type Weekday,
} from './types';
import { DEFAULT_PORTIONS } from './portions';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '../notifications/schedule';

const minutes = z.number().int().min(0).max(1439);

export const dayScheduleSchema = z.object({
  maxMinutes: z.number().int().min(5).max(240),
  mealTimes: z.object({ colazione: minutes, pranzo: minutes, cena: minutes, spuntino: minutes }),
});

export const profileSchema = z.object({
  servings: z.number().int().min(1).max(30),
  mealTypes: z.array(z.enum(MEAL_TYPES)).min(1),
  diet: z.enum(DIETS),
  excludedAllergens: z.array(z.enum(ALLERGENS)),
  excludedIngredientIds: z.array(z.string()),
  dislikedIngredientIds: z.array(z.string()),
  days: z.array(dayScheduleSchema).length(7),
  shoppingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  weeklyBudgetCents: z.number().int().min(0).max(10_000_000).nullable(),
  equipment: z.array(z.enum(EQUIPMENT)),
  // Campi aggiunti dopo la prima versione: i profili salvati prima ricevono i valori predefiniti.
  portions: z
    .object({
      gender: z.enum(GENDERS).default('non_indicato'),
      appetite: z.enum(APPETITES).default('normale'),
      lifestyle: z.enum(LIFESTYLES).default('attivo'),
      goal: z.enum(MEAL_GOALS).default('equilibrati'),
      pastaGrams: z.number().int().min(40).max(200).default(80),
      riceGrams: z.number().int().min(40).max(200).default(70),
      proteinSize: z.enum(PROTEIN_SIZES).default('media'),
    })
    .default({ ...DEFAULT_PORTIONS }),
  tastes: z
    .object({
      likes: z.array(z.enum(LIKES)).default([]),
      weekStyles: z.array(z.enum(WEEK_STYLES)).default([]),
    })
    .default({ likes: [], weekStyles: [] }),
  budget: z
    .object({
      mode: z.enum(BUDGET_MODES).default('off'),
      amountCents: z.number().int().min(100).max(10_000_000).nullable().default(null),
      period: z.enum(['settimana', 'mese']).default('settimana'),
      scope: z.enum(['pasti_spesora', 'parte_spesa']).default('pasti_spesora'),
      store: z.enum(['discount', 'supermercato', 'mercato', 'ovunque', 'non_indicato']).default('non_indicato'),
    })
    .optional(),
});

export const notificationSettingsSchema = z.object({
  mealReminders: z.boolean(),
  mealTypes: z.array(z.enum(MEAL_TYPES)),
  leadMinutes: z.number().int().min(0).max(180),
  shoppingReminders: z.boolean(),
  shoppingTimeMinutes: minutes,
  planEndReminder: z.boolean(),
  quietStartMinutes: minutes,
  quietEndMinutes: minutes,
});

export const DEFAULT_MEAL_TIMES: DaySchedule['mealTimes'] = {
  colazione: 7 * 60 + 30,
  pranzo: 13 * 60,
  cena: 20 * 60,
  spuntino: 16 * 60 + 30,
};

export function defaultDays(weekdayMinutes = 30, weekendMinutes = 45): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    maxMinutes: i >= 5 ? weekendMinutes : weekdayMinutes,
    mealTimes: { ...DEFAULT_MEAL_TIMES },
  }));
}

/** Bozza iniziale dell'onboarding: valori neutri, modificabili a ogni passo. */
export function draftProfile(): UserProfile {
  return {
    servings: 2,
    mealTypes: ['pranzo', 'cena'],
    diet: 'onnivoro',
    excludedAllergens: [],
    excludedIngredientIds: [],
    dislikedIngredientIds: [],
    days: defaultDays(),
    shoppingDays: [1, 5] as Weekday[],
    weeklyBudgetCents: null,
    equipment: ['fornelli', 'forno', 'microonde'],
    portions: { ...DEFAULT_PORTIONS },
    tastes: { likes: [], weekStyles: [] },
    budget: { ...DEFAULT_BUDGET },
  };
}

export const DEFAULT_BUDGET: UserProfile['budget'] = { mode: 'off', amountCents: null, period: 'settimana', scope: 'pasti_spesora', store: 'non_indicato' };

/** Budget settimanale di riferimento (centesimi): un budget mensile vale 12/52 per settimana. */
export function weeklyBudgetCents(budget: UserProfile['budget']): number | null {
  if (budget.mode === 'off' || budget.amountCents === null) return null;
  return budget.period === 'mese' ? Math.round((budget.amountCents * 12) / 52) : budget.amountCents;
}

export function parseProfile(raw: unknown): UserProfile {
  const p = profileSchema.parse(raw);
  // Profili precedenti: il vecchio budget "promemoria" diventa un limite settimanale esplicito.
  const budget = p.budget ?? (p.weeklyBudgetCents !== null ? { ...DEFAULT_BUDGET, mode: 'limite' as const, amountCents: p.weeklyBudgetCents } : { ...DEFAULT_BUDGET });
  const profile = { ...p, budget, shoppingDays: [...new Set(p.shoppingDays)].sort() as Weekday[] };
  return { ...profile, weeklyBudgetCents: weeklyBudgetCents(budget) };
}

export function parseNotificationSettings(raw: unknown): NotificationSettings {
  const parsed = notificationSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_NOTIFICATION_SETTINGS };
}

/** Distribuzione suggerita dei giorni di spesa per una frequenza (da confermare). */
export function suggestShoppingDays(timesPerWeek: number): Weekday[] {
  const table: Record<number, Weekday[]> = {
    1: [5],
    2: [1, 5],
    3: [1, 3, 5],
    4: [0, 2, 4, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return table[Math.min(7, Math.max(1, Math.round(timesPerWeek)))];
}
