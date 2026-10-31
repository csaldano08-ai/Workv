/**
 * Abbonamenti Spesora Plus. Prezzi, periodi e prove gratuite vengono SEMPRE letti dallo store:
 * qui non esistono prezzi "attivi" scritti nel codice.
 */
export type PurchaseMode = 'disabled' | 'mock' | 'revenuecat';

export interface PlusPackage {
  id: string;
  period: 'monthly' | 'annual';
  /** Prezzo localizzato fornito dallo store (es. "3,49 €"). */
  priceString: string;
  /** Prova gratuita, solo se lo store la dichiara per questo utente. */
  introOffer: string | null;
}

export type EntitlementStatus =
  | { state: 'none' }
  | { state: 'active'; expiresAt: string | null; willRenew: boolean; inGracePeriod: boolean }
  | { state: 'expired'; expiredAt: string };

export type PurchaseOutcome =
  | { kind: 'success'; entitlement: EntitlementStatus }
  | { kind: 'cancelled' }
  | { kind: 'network_error'; message: string }
  | { kind: 'not_available'; message: string }
  | { kind: 'error'; message: string };

export interface PurchaseService {
  readonly mode: PurchaseMode;
  /** True solo quando lo store è configurato e gli acquisti sono reali. */
  readonly isLive: boolean;
  getPackages(): Promise<PlusPackage[] | { unavailable: string }>;
  getEntitlement(): Promise<EntitlementStatus>;
  purchase(packageId: string): Promise<PurchaseOutcome>;
  restore(): Promise<PurchaseOutcome>;
  /** URL di gestione dell'abbonamento fornito dallo store, se disponibile. */
  managementUrl(): Promise<string | null>;
}

/** Politica di accesso: durante lo sviluppo nessuna funzione è bloccata. */
export type PaywallMode = 'off' | 'soft' | 'hard';
