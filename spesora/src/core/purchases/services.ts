import { apiKeyFor, RevenueCatPurchaseService, type RevenueCatConfig } from './revenuecat';
import { t } from '../../i18n';
import { formatLocale } from '../domain/locale';
import type { EntitlementStatus, PlusPackage, PurchaseMode, PurchaseOutcome, PurchaseService } from './types';

/** Modalità predefinita: acquisti non configurati. Nessun prezzo e nessuna attivazione simulata. */
export class DisabledPurchaseService implements PurchaseService {
  readonly mode = 'disabled' as const;
  readonly isLive = false;
  async getPackages() {
    return { unavailable: t('paywall:disabled.packages') };
  }
  async getEntitlement(): Promise<EntitlementStatus> {
    return { state: 'none' };
  }
  async purchase(): Promise<PurchaseOutcome> {
    return { kind: 'not_available', message: t('paywall:disabled.purchase') };
  }
  async restore(): Promise<PurchaseOutcome> {
    return { kind: 'not_available', message: t('paywall:disabled.restore') };
  }
  async managementUrl() {
    return null;
  }
}

/**
 * SOLO SVILUPPO: simula gli esiti per provare l'interfaccia (successo, annullamento, errore di rete,
 * scadenza). Lo stato vive in memoria e non viene mai salvato nel database.
 * I prezzi mostrati sono etichettati come esempio e non sono prezzi dello store.
 */
export class MockPurchaseService implements PurchaseService {
  readonly mode = 'mock' as const;
  readonly isLive = false;
  private entitlement: EntitlementStatus = { state: 'none' };
  nextOutcome: 'success' | 'cancelled' | 'network_error' | 'expired' = 'success';

  constructor() {
    if (!__DEV__) throw new Error('MockPurchaseService non è consentito nelle build di produzione');
  }

  async getPackages(): Promise<PlusPackage[]> {
    const eur = (n: number) => n.toLocaleString(formatLocale(), { style: 'currency', currency: 'EUR' });
    return [
      { id: 'mock_monthly', period: 'monthly', priceString: t('paywall:mock.price', { price: eur(3.49) }), introOffer: null },
      { id: 'mock_annual', period: 'annual', priceString: t('paywall:mock.price', { price: eur(27.99) }), introOffer: t('paywall:mock.introOffer', { days: 7 }) },
    ];
  }
  async getEntitlement() {
    return this.entitlement;
  }
  async purchase(packageId: string): Promise<PurchaseOutcome> {
    switch (this.nextOutcome) {
      case 'cancelled':
        return { kind: 'cancelled' };
      case 'network_error':
        return { kind: 'network_error', message: t('paywall:mock.network') };
      case 'expired':
        this.entitlement = { state: 'expired', expiredAt: new Date().toISOString() };
        return { kind: 'success', entitlement: this.entitlement };
      default: {
        const days = packageId.includes('annual') ? 365 : 30;
        this.entitlement = { state: 'active', expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(), willRenew: true, inGracePeriod: false };
        return { kind: 'success', entitlement: this.entitlement };
      }
    }
  }
  async restore(): Promise<PurchaseOutcome> {
    return { kind: 'success', entitlement: this.entitlement };
  }
  async managementUrl() {
    return null;
  }
}

/**
 * Crea il servizio acquisti. RevenueCat (`react-native-purchases`) richiede una build nativa
 * (non funziona in Expo Go) e chiavi API: finché non sono configurate si usa la modalità disabilitata.
 * Vedi docs/RELEASE_CHECKLIST.md.
 */
export function createPurchaseService(mode: PurchaseMode, isDev: boolean, revenuecat?: RevenueCatConfig | null, platform = 'unknown'): PurchaseService {
  if (mode === 'mock' && isDev) return new MockPurchaseService();
  // `platform` = Platform.OS passato dall'interfaccia (qui niente react-native: il modulo resta testabile)
  if (mode === 'revenuecat' && revenuecat && apiKeyFor(platform, revenuecat)) return new RevenueCatPurchaseService(revenuecat, platform);
  // Configurazione mancante: nessun prezzo e nessuna attivazione simulata.
  return new DisabledPurchaseService();
}
