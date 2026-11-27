import { describe, expect, it } from 'vitest';
import { canUse, mustSubscribe } from '../core/purchases/features';
import { apiKeyFor, entitlementFromCustomerInfo, outcomeFromError, packagesFromOfferings, RevenueCatPurchaseService } from '../core/purchases/revenuecat';
import { createPurchaseService, DisabledPurchaseService } from '../core/purchases/services';

// Oggetti minimi con la stessa forma di quelli dell'SDK (dati di prova, nessun prezzo reale).
const ent = (over: Record<string, unknown>) => ({ identifier: 'plus', isActive: true, willRenew: true, expirationDate: '2026-12-02T00:00:00Z', billingIssueDetectedAt: null, ...over });
const info = (active: Record<string, unknown>, all: Record<string, unknown> = active) => ({ entitlements: { active, all, verification: 'NOT_REQUESTED' } }) as never;

describe('Abbonamenti RevenueCat', () => {
  it('stato entitlement: attivo, periodo di tolleranza, scaduto, assente', () => {
    expect(entitlementFromCustomerInfo(info({ plus: ent({}) }), 'plus')).toEqual({ state: 'active', expiresAt: '2026-12-02T00:00:00Z', willRenew: true, inGracePeriod: false });
    expect(entitlementFromCustomerInfo(info({ plus: ent({ billingIssueDetectedAt: '2026-11-30T00:00:00Z' }) }), 'plus')).toMatchObject({ state: 'active', inGracePeriod: true });
    expect(entitlementFromCustomerInfo(info({}, { plus: ent({ isActive: false, expirationDate: '2026-10-01T00:00:00Z' }) }), 'plus')).toEqual({ state: 'expired', expiredAt: '2026-10-01T00:00:00Z' });
    expect(entitlementFromCustomerInfo(info({}), 'plus')).toEqual({ state: 'none' });
  });

  it('errori: annullamento, rete, pagamento in attesa, generico', () => {
    expect(outcomeFromError({ code: '1', userCancelled: true })).toEqual({ kind: 'cancelled' });
    expect(outcomeFromError({ code: '10' }).kind).toBe('network_error');
    expect(outcomeFromError({ code: '35' }).kind).toBe('network_error');
    expect(outcomeFromError({ code: '20' }).kind).toBe('error');
    expect(outcomeFromError(new Error('x')).kind).toBe('error');
  });

  it('pacchetti dallo store: solo mensile e annuale, prezzi e prove come forniti dallo store', () => {
    const pkg = (id: string, type: string, price: string, intro: unknown = null) => ({ identifier: id, packageType: type, product: { identifier: `p_${id}`, priceString: price, introPrice: intro } });
    const offerings = { current: { availablePackages: [pkg('m', 'MONTHLY', 'X €'), pkg('y', 'ANNUAL', 'Y €', { priceString: '0 €', periodNumberOfUnits: 7, periodUnit: 'DAY' }), pkg('l', 'LIFETIME', 'Z €')] }, all: {} } as never;
    const list = packagesFromOfferings(offerings);
    expect(list.map((p) => p.period)).toEqual(['monthly', 'annual']);
    expect(list[0]).toEqual({ id: 'm', period: 'monthly', priceString: 'X €', introOffer: null });
    expect(list[1].introOffer).toBe('0 € per 7 day');
    expect(packagesFromOfferings({ current: null, all: {} } as never)).toEqual([]);
  });

  it('senza configurazione reale gli acquisti restano disattivati (mai mock in produzione)', async () => {
    expect(createPurchaseService('revenuecat', false, null)).toBeInstanceOf(DisabledPurchaseService);
    expect(createPurchaseService('mock', false)).toBeInstanceOf(DisabledPurchaseService);
    const s = createPurchaseService('disabled', true);
    expect((await s.purchase('x')).kind).toBe('not_available');
    expect(s.isLive).toBe(false);
  });

  it('chiave dell\'SDK per piattaforma: senza la chiave Android, su Android gli acquisti restano spenti', () => {
    const rc = { iosApiKey: 'appl_prova', entitlementId: 'plus' };
    expect(apiKeyFor('ios', rc)).toBe('appl_prova');
    expect(apiKeyFor('android', rc)).toBeNull();
    expect(apiKeyFor('web', rc)).toBeNull();
    expect(createPurchaseService('revenuecat', false, rc, 'android')).toBeInstanceOf(DisabledPurchaseService);
    expect(createPurchaseService('revenuecat', false, rc, 'web')).toBeInstanceOf(DisabledPurchaseService);
    expect(createPurchaseService('revenuecat', false, rc, 'ios')).toBeInstanceOf(RevenueCatPurchaseService);
    expect(createPurchaseService('revenuecat', false, { ...rc, androidApiKey: 'goog_prova' }, 'android')).toBeInstanceOf(RevenueCatPurchaseService);
  });
});

describe('Abbonamento obbligatorio: si blocca solo con acquisti reali e funzionanti', () => {
  const active = { state: 'active', expiresAt: null, willRenew: true, inGracePeriod: false } as const;
  it('mustSubscribe', () => {
    // modalità richiesta + acquisti reali: senza abbonamento o scaduto si va alla schermata dell'abbonamento
    expect(mustSubscribe('required', true, { state: 'none' })).toBe(true);
    expect(mustSubscribe('required', true, { state: 'expired', expiredAt: '2026-11-01' })).toBe(true);
    expect(mustSubscribe('required', true, active)).toBe(false);
    // stato non leggibile (store irraggiungibile senza dati in memoria): non si blocca
    expect(mustSubscribe('required', true, { state: 'unknown' })).toBe(false);
    // acquisti spenti (oggi): mai bloccati, qualunque sia la modalità
    expect(mustSubscribe('required', false, { state: 'none' })).toBe(false);
    for (const m of ['off', 'soft', 'hard'] as const) expect(mustSubscribe(m, true, { state: 'none' })).toBe(false);
  });
  it('canUse: con acquisti spenti o stato sconosciuto nessuna funzione è bloccata', () => {
    expect(canUse('tastes', 'hard', { state: 'none' }, true)).toBe(false);
    expect(canUse('tastes', 'required', { state: 'none' }, true)).toBe(false);
    expect(canUse('tastes', 'hard', active, true)).toBe(true);
    expect(canUse('tastes', 'hard', { state: 'none' }, false)).toBe(true);
    expect(canUse('tastes', 'hard', { state: 'unknown' }, true)).toBe(true);
    expect(canUse('tastes', 'soft', { state: 'none' }, true)).toBe(true);
  });
});
