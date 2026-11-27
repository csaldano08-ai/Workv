import Constants from 'expo-constants';
import type { PaywallMode, PurchaseMode } from './purchases/types';

/** Configurazione letta da app.json → expo.extra. Nessun dato inventato: i campi vuoti restano vuoti. */
interface Extra {
  purchasesMode?: PurchaseMode;
  paywallMode?: PaywallMode;
  legal?: { privacyPolicyUrl?: string; termsUrl?: string; supportUrl?: string; supportEmail?: string; publisher?: string };
  revenuecat?: { iosApiKey?: string; androidApiKey?: string; entitlementId?: string; offeringId?: string };
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const appConfig = {
  purchasesMode: (extra.purchasesMode ?? 'disabled') as PurchaseMode,
  paywallMode: (extra.paywallMode ?? 'off') as PaywallMode,
  legal: {
    privacyPolicyUrl: extra.legal?.privacyPolicyUrl ?? '',
    termsUrl: extra.legal?.termsUrl ?? '',
    supportUrl: extra.legal?.supportUrl ?? '',
    supportEmail: extra.legal?.supportEmail ?? '',
    /** Chi pubblica l'app (nome o ragione sociale, indirizzo, contatti): obbligatorio prima della vendita. */
    publisher: extra.legal?.publisher ?? '',
  },
  version: Constants.expoConfig?.version ?? '0.0.0',
  /** Chiavi PUBBLICHE dell'SDK RevenueCat per iOS e Android (non sono segreti, ma non vanno inventate). */
  revenuecat:
    extra.revenuecat?.iosApiKey || extra.revenuecat?.androidApiKey
      ? {
          iosApiKey: extra.revenuecat.iosApiKey ?? '',
          androidApiKey: extra.revenuecat.androidApiKey || undefined,
          entitlementId: extra.revenuecat.entitlementId || 'plus',
          offeringId: extra.revenuecat.offeringId || undefined,
        }
      : null,
};
