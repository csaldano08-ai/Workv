import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import type { EntitlementStatus, PlusPackage, PurchaseOutcome, PurchaseService } from './types';

/**
 * Implementazione reale con RevenueCat (react-native-purchases). Attiva SOLO se
 * `extra.purchasesMode = "revenuecat"` e c'è la chiave pubblica iOS; richiede una build nativa
 * (development/TestFlight), non Expo Go. Prezzi, periodi e prove gratuite arrivano dallo store.
 * Lo stato dell'abbonamento non viene mai salvato nel database locale.
 */

export interface RevenueCatConfig {
  iosApiKey: string;
  entitlementId: string;
  offeringId?: string;
}

/** Mappa pura (testata): stato dell'entitlement da CustomerInfo. */
export function entitlementFromCustomerInfo(info: Pick<CustomerInfo, 'entitlements'>, entitlementId: string): EntitlementStatus {
  const active = info.entitlements.active[entitlementId];
  if (active?.isActive) {
    return {
      state: 'active',
      expiresAt: active.expirationDate,
      willRenew: active.willRenew,
      // Problema di pagamento rilevato ma accesso ancora attivo: periodo di tolleranza dello store.
      inGracePeriod: !!active.billingIssueDetectedAt,
    };
  }
  const past = info.entitlements.all[entitlementId];
  if (past?.expirationDate) return { state: 'expired', expiredAt: past.expirationDate };
  return { state: 'none' };
}

/** Mappa pura (testata): esito di un errore dell'SDK. */
export function outcomeFromError(e: unknown): PurchaseOutcome {
  const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
  if (err?.userCancelled || err?.code === '1') return { kind: 'cancelled' };
  if (err?.code === '10' || err?.code === '35') return { kind: 'network_error', message: 'Connessione non disponibile. Riprova quando sei online.' };
  if (err?.code === '20') return { kind: 'error', message: 'Pagamento in attesa di approvazione dallo store.' };
  return { kind: 'error', message: err?.message ? `Acquisto non completato: ${err.message}` : 'Acquisto non completato.' };
}

export function packagesFromOfferings(offerings: Pick<PurchasesOfferings, 'current' | 'all'>, offeringId?: string): PlusPackage[] {
  const offering = (offeringId && offerings.all[offeringId]) || offerings.current;
  if (!offering) return [];
  return offering.availablePackages
    .filter((p) => p.packageType === 'MONTHLY' || p.packageType === 'ANNUAL')
    .map((p) => ({
      id: p.identifier,
      period: p.packageType === 'MONTHLY' ? 'monthly' : 'annual',
      priceString: p.product.priceString,
      // L'offerta introduttiva viene mostrata solo se lo store la dichiara; l'idoneità si verifica a parte.
      introOffer: p.product.introPrice ? `${p.product.introPrice.priceString} per ${p.product.introPrice.periodNumberOfUnits} ${p.product.introPrice.periodUnit.toLowerCase()}` : null,
    }));
}

type PurchasesModule = typeof import('react-native-purchases').default;

export class RevenueCatPurchaseService implements PurchaseService {
  readonly mode = 'revenuecat' as const;
  readonly isLive = true;
  private sdk: PurchasesModule | null = null;
  private packages = new Map<string, PurchasesPackage>();

  constructor(private readonly config: RevenueCatConfig) {}

  private async ready(): Promise<PurchasesModule> {
    if (this.sdk) return this.sdk;
    // Caricamento pigro: il modulo nativo non viene toccato se gli acquisti sono disattivati.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases').default as PurchasesModule;
    if (!(await mod.isConfigured())) mod.configure({ apiKey: this.config.iosApiKey });
    this.sdk = mod;
    return mod;
  }

  async getPackages(): Promise<PlusPackage[] | { unavailable: string }> {
    try {
      const sdk = await this.ready();
      const offerings = await sdk.getOfferings();
      const offering = (this.config.offeringId && offerings.all[this.config.offeringId]) || offerings.current;
      this.packages = new Map((offering?.availablePackages ?? []).map((p) => [p.identifier, p]));
      const list = packagesFromOfferings(offerings, this.config.offeringId);
      if (list.length === 0) return { unavailable: 'Nessun abbonamento disponibile al momento nello store.' };
      // Prova gratuita: mostrata solo agli utenti idonei secondo lo store.
      const eligibility = await sdk.checkTrialOrIntroductoryPriceEligibility([...this.packages.values()].map((p) => p.product.identifier));
      return list.map((p) => {
        const pkg = this.packages.get(p.id);
        const status = pkg ? eligibility[pkg.product.identifier]?.status : undefined;
        return { ...p, introOffer: status === 2 ? p.introOffer : null };
      });
    } catch (e) {
      const o = outcomeFromError(e);
      return { unavailable: o.kind === 'network_error' ? o.message : 'Impossibile leggere gli abbonamenti dallo store.' };
    }
  }

  async getEntitlement(): Promise<EntitlementStatus> {
    try {
      const sdk = await this.ready();
      return entitlementFromCustomerInfo(await sdk.getCustomerInfo(), this.config.entitlementId);
    } catch {
      return { state: 'none' };
    }
  }

  async purchase(packageId: string): Promise<PurchaseOutcome> {
    try {
      const sdk = await this.ready();
      const pkg = this.packages.get(packageId);
      if (!pkg) return { kind: 'error', message: 'Abbonamento non trovato: ricarica la pagina.' };
      const { customerInfo } = await sdk.purchasePackage(pkg);
      return { kind: 'success', entitlement: entitlementFromCustomerInfo(customerInfo, this.config.entitlementId) };
    } catch (e) {
      return outcomeFromError(e);
    }
  }

  async restore(): Promise<PurchaseOutcome> {
    try {
      const sdk = await this.ready();
      return { kind: 'success', entitlement: entitlementFromCustomerInfo(await sdk.restorePurchases(), this.config.entitlementId) };
    } catch (e) {
      return outcomeFromError(e);
    }
  }

  async managementUrl(): Promise<string | null> {
    try {
      const sdk = await this.ready();
      return (await sdk.getCustomerInfo()).managementURL;
    } catch {
      return null;
    }
  }
}
