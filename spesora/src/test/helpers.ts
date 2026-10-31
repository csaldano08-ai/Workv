import { CatalogIndex } from '../core/domain/catalog';
import { defaultDays, draftProfile } from '../core/domain/profile';
import type { UserProfile } from '../core/domain/types';
import { migrate } from '../core/storage/migrations';
import { CATALOG } from '../data/catalog';
import { SpesoraService } from '../features/app/SpesoraService';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../core/notifications/schedule';
import { openNodeDb } from './nodeDb';

export const catalog = new CatalogIndex(CATALOG);

export function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...draftProfile(), ...overrides };
}

/** Profilo del Test A: 1 persona, pranzo e cena, 20 minuti, spesa due volte a settimana. */
export function profileA(): UserProfile {
  return profile({ servings: 1, mealTypes: ['pranzo', 'cena'], days: defaultDays(20, 20), shoppingDays: [1, 4], equipment: ['fornelli'] });
}

export async function makeService(path = ':memory:') {
  const db = openNodeDb(path);
  await migrate(db);
  return { db, service: new SpesoraService(db, catalog) };
}

export async function onboardedService(p: UserProfile, today: string, pantry: { ingredientId: string; qty: number | null }[] = []) {
  const { db, service } = await makeService();
  await service.completeOnboarding(p, pantry, DEFAULT_NOTIFICATION_SETTINGS, today);
  return { db, service };
}
