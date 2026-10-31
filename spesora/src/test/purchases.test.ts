import { describe, expect, it } from 'vitest';
import { entitlementFromCustomerInfo, outcomeFromError, packagesFromOfferings } from '../core/purchases/revenuecat';
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
});
