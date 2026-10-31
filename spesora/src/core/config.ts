import Constants from 'expo-constants';
import type { PaywallMode, PurchaseMode } from './purchases/types';

/** Configurazione letta da app.json → expo.extra. Nessun dato inventato: i campi vuoti restano vuoti. */
interface Extra {
  purchasesMode?: PurchaseMode;
  paywallMode?: PaywallMode;
  legal?: { privacyPolicyUrl?: string; termsUrl?: string; supportUrl?: string; supportEmail?: string };
  revenuecat?: { iosApiKey?: string; entitlementId?: string; offeringId?: string };
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
  },
  version: Constants.expoConfig?.version ?? '0.0.0',
  /** Chiave PUBBLICA dell'SDK RevenueCat (non è un segreto, ma non va inventata). */
  revenuecat: extra.revenuecat?.iosApiKey
    ? { iosApiKey: extra.revenuecat.iosApiKey, entitlementId: extra.revenuecat.entitlementId || 'plus', offeringId: extra.revenuecat.offeringId || undefined }
    : null,
};
