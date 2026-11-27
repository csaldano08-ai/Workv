import type { EntitlementStatus, PaywallMode } from './types';

/**
 * Registro unico delle funzioni Mina Plus. Serve a preparare la monetizzazione senza
 * spargere controlli nel codice. Con paywallMode 'off' (oggi) tutto è disponibile.
 */
export const PLUS_FEATURES = {
  portion_profile: { label: 'Porzioni sulle tue abitudini', description: 'Pasta, riso e secondi calcolati sulle quantità che usi davvero.' },
  tastes: { label: 'Gusti e stile della settimana', description: 'Più pesce, più primi, settimane veloci o più vegetariane.' },
  multi_shopping_days: { label: 'Spesa su più giorni', description: 'Liste divise tra i tuoi giorni di spesa, con i freschi al momento giusto.' },
  advanced_pantry: { label: 'Dispensa avanzata', description: 'Scadenze, stime e avvisi “potrebbe non bastare”.' },
  smart_regeneration: { label: 'Rigenerazione e sostituzioni', description: 'Alternative che usano ciò che hai già in casa.' },
  extended_history: { label: 'Storico esteso', description: 'Tutto lo storico dei pasti, senza limiti di tempo.' },
  advanced_reminders: { label: 'Promemoria avanzati', description: 'Anticipi, fasce di silenzio e promemoria della spesa.' },
  catalog_updates: { label: 'Nuove ricette', description: 'Aggiornamenti continui del ricettario.' },
} as const;

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
