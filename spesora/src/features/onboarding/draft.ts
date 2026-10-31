import { z } from 'zod';
import { draftProfile, notificationSettingsSchema, profileSchema } from '../../core/domain/profile';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '../../core/notifications/schedule';
import { toMilli } from '../../core/domain/quantity';
import type { UserProfile } from '../../core/domain/types';
import type { InitialPantryItem } from '../app/SpesoraService';

export interface OnboardingDraft {
  profile: UserProfile;
  shoppingFrequency: number;
  /** Dispensa iniziale: quantità in unità canonica (g, ml, pz); null = presente (q.b.). */
  pantry: Record<string, number | null>;
  notifications: NotificationSettings;
}

export function newDraft(): OnboardingDraft {
  return { profile: draftProfile(), shoppingFrequency: 2, pantry: {}, notifications: { ...DEFAULT_NOTIFICATION_SETTINGS } };
}

const draftSchema = z.object({
  profile: profileSchema,
  shoppingFrequency: z.number().int().min(1).max(7),
  pantry: z.record(z.string(), z.number().nonnegative().nullable()),
  notifications: notificationSettingsSchema,
});

/** Ripristina una bozza salvata; se non valida riparte dai valori predefiniti (senza crash). */
export function restoreDraft(raw: unknown): OnboardingDraft {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return newDraft();
  return parsed.data as OnboardingDraft;
}

export function pantryItems(draft: OnboardingDraft): InitialPantryItem[] {
  return Object.entries(draft.pantry).map(([ingredientId, qty]) => ({ ingredientId, qty: qty === null ? null : toMilli(qty) }));
}

/** Ingredienti comuni proposti per la dispensa iniziale. */
export const QUICK_PANTRY: string[] = [
  'pasta_secca',
  'riso',
  'pomodori_pelati',
  'passata_pomodoro',
  'ceci_cotti',
  'fagioli_cannellini',
  'tonno_scatola',
  'uova',
  'latte',
  'parmigiano',
  'cipolla',
  'patata',
  'carota',
  'fiocchi_avena',
  'fette_biscottate',
  'farina',
  'olio_evo',
  'sale',
  'pepe',
  'aglio',
  'origano',
  'zucchero',
];

/** Ingredienti spesso non graditi, proposti come scorciatoia. */
export const COMMON_DISLIKES: string[] = [
  'cipolla',
  'aglio',
  'peperone',
  'melanzana',
  'funghi_champignon',
  'zucca',
  'cavolfiore',
  'broccolo',
  'finocchio',
  'olive_nere',
  'capperi',
  'tonno_scatola',
  'salmone',
  'tofu',
  'lenticchie_cotte',
  'peperoncino',
];

export const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];
