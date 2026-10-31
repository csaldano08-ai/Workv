import { describe, expect, it } from 'vitest';
import { formatQty, parseUserQty, roundUpForShopping, scaleQty, suggestPacks, toMilli } from '../core/domain/quantity';

describe('Quantità', () => {
  it('scala per porzioni senza float persistiti', () => {
    expect(scaleQty(toMilli(160), 1, 2)).toBe(80000);
    expect(scaleQty(toMilli(1), 1, 3)).toBe(333);
    expect(Number.isInteger(scaleQty(toMilli(0.5), 3, 2))).toBe(true);
    expect(() => scaleQty(toMilli(10), 0, 2)).toThrow();
    expect(() => toMilli(-1)).toThrow();
    expect(() => toMilli(Number.NaN)).toThrow();
  });

  it('formatta e arrotonda in modo leggibile', () => {
    expect(formatQty(toMilli(1500), 'g')).toBe('1,5 kg');
    expect(formatQty(toMilli(250), 'ml')).toBe('250 ml');
    expect(formatQty(toMilli(0.5), 'pz')).toBe('½');
    expect(roundUpForShopping(toMilli(83), 'g')).toBe(toMilli(90));
    expect(roundUpForShopping(toMilli(1.2), 'pz')).toBe(toMilli(1.5));
  });

  it('suggerisce confezioni generiche senza inventarle', () => {
    expect(suggestPacks(toMilli(150), [500, 1000])).toEqual({ packSize: 500, count: 1, total: toMilli(500) });
    expect(suggestPacks(toMilli(2100), [500, 1000])).toEqual({ packSize: 1000, count: 3, total: toMilli(3000) });
    expect(suggestPacks(toMilli(150), undefined)).toBeNull();
  });

  it('interpreta input utente con virgola e rifiuta valori malformati', () => {
    expect(parseUserQty('1,5')).toBe(1.5);
    expect(parseUserQty(' 200 ')).toBe(200);
    expect(parseUserQty('-3')).toBeNull();
    expect(parseUserQty('abc')).toBeNull();
    expect(parseUserQty('')).toBeNull();
  });
});
