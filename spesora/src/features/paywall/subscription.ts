import { router, usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { appConfig } from '../../core/config';
import { mustSubscribe } from '../../core/purchases/features';
import { createPurchaseService } from '../../core/purchases/services';
import type { EntitlementStatus, PurchaseService } from '../../core/purchases/types';
import { useApp } from '../app/AppProvider';

/*
 * Stato dell'abbonamento condiviso da tutta l'app. Nessun account: l'abbonamento appartiene all'account dello store
 * (Apple/Google) e viene riletto dall'SDK a ogni apertura e a ogni ritorno in primo piano. Non viene mai salvato nel
 * database locale. Con gli acquisti spenti (oggi) lo stato è sempre «nessun abbonamento» e nulla viene bloccato.
 */

let service: PurchaseService | null = null;
/** Servizio acquisti unico (disattivato, simulato solo in sviluppo, o RevenueCat con chiavi reali). */
export function purchaseService(): PurchaseService {
  if (!service) service = createPurchaseService(appConfig.purchasesMode, __DEV__, appConfig.revenuecat, Platform.OS);
  return service;
}

let current: EntitlementStatus | null = null; // null = non ancora letto
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setEntitlement(e: EntitlementStatus): void {
  current = e;
  listeners.forEach((l) => l());
}

export async function refreshEntitlement(): Promise<EntitlementStatus> {
  const e = await purchaseService().getEntitlement();
  setEntitlement(e);
  return e;
}

/** Stato corrente dell'abbonamento (null finché non è stato letto). */
export function useEntitlement(): EntitlementStatus | null {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** Pagine sempre raggiungibili anche quando l'abbonamento è obbligatorio (testi legali, l'abbonamento stesso). */
const ALWAYS_OPEN = ['/abbonamento', '/privacy', '/termini'];

/**
 * Abbonamento obbligatorio dopo il questionario (`paywallMode = "required"`): porta alla schermata dell'abbonamento
 * chi non ne ha uno attivo. Non fa nulla finché gli acquisti non sono reali e funzionanti (`isLive`), né quando lo
 * stato non è leggibile (offline senza dati in memoria): nessuno resta chiuso fuori per un errore dello store.
 */
export function SubscriptionGate() {
  const { snapshot } = useApp();
  const pathname = usePathname();
  const entitlement = useEntitlement();
  useEffect(() => {
    void refreshEntitlement();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshEntitlement();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!snapshot?.profile || !entitlement) return;
    if (!mustSubscribe(appConfig.paywallMode, purchaseService().isLive, entitlement)) return;
    if (!ALWAYS_OPEN.some((p) => pathname.startsWith(p))) router.replace('/abbonamento');
  }, [snapshot, entitlement, pathname]);
  return null;
}
