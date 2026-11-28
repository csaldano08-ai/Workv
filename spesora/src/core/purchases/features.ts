import { t } from '../../i18n';
import type { EntitlementStatus, PaywallMode } from './types';

/**
 * Registro unico delle funzioni Mina Plus. Serve a preparare la monetizzazione senza
 * spargere controlli nel codice. Con paywallMode 'off' (oggi) tutto è disponibile.
 */
export const PLUS_FEATURES = {
  portion_profile: feature('portion_profile'),
  tastes: feature('tastes'),
  multi_shopping_days: feature('multi_shopping_days'),
  advanced_pantry: feature('advanced_pantry'),
  smart_regeneration: feature('smart_regeneration'),
  extended_history: feature('extended_history'),
  advanced_reminders: feature('advanced_reminders'),
  catalog_updates: feature('catalog_updates'),
} as const;

/** Nome e descrizione tradotti (namespace `paywall`), letti nella lingua corrente al momento dell'uso. */
function feature(id: string): { readonly label: string; readonly description: string } {
  return {
    get label() {
      return t(`paywall:feature.${id}.label`);
    },
    get description() {
      return t(`paywall:feature.${id}.description`);
    },
  };
}

export type PlusFeature = keyof typeof PLUS_FEATURES;

/**
 * Decide se una funzione è utilizzabile. 'soft' mostra l'invito ma non blocca; 'hard' e 'required' bloccano.
 * Senza acquisti reali e funzionanti (`isLive` falso) non si blocca mai nulla: nessuno resta chiuso fuori da una
 * funzione che non potrebbe comprare. Uno stato «unknown» (store non raggiungibile) non blocca.
 */
export function canUse(feature: PlusFeature, paywall: PaywallMode, entitlement: EntitlementStatus, isLive = true): boolean {
  void feature;
  if (paywall !== 'hard' && paywall !== 'required') return true;
  if (!isLive || entitlement.state === 'unknown') return true;
  return entitlement.state === 'active';
}

/**
 * Abbonamento obbligatorio: vero quando l'app deve mostrare la schermata dell'abbonamento al posto delle altre.
 * Solo con `paywallMode = 'required'`, acquisti reali attivi e uno stato letto dallo store che non sia attivo.
 */
export function mustSubscribe(paywall: PaywallMode, isLive: boolean, entitlement: EntitlementStatus): boolean {
  if (paywall !== 'required' || !isLive) return false;
  return entitlement.state === 'none' || entitlement.state === 'expired';
}
