import { describe, expect, it } from 'vitest';
import { CATALOG } from '../data/catalog';
import { INGREDIENT_SYMBOLS } from '../data/ingredientSymbols';

describe('Simboli degli ingredienti', () => {
  const ids = new Set(CATALOG.ingredients.map((i) => i.id));

  it('usa solo id di ingredienti del catalogo', () => {
    const unknown = Object.keys(INGREDIENT_SYMBOLS).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it('associa a ogni ingrediente un solo simbolo, non vuoto', () => {
    const segmenter = new Intl.Segmenter('it', { granularity: 'grapheme' });
    for (const [id, symbol] of Object.entries(INGREDIENT_SYMBOLS)) {
      expect(typeof symbol, id).toBe('string');
      expect(symbol.trim(), id).not.toBe('');
      expect([...segmenter.segment(symbol)].length, `${id}: ${symbol}`).toBe(1);
    }
  });
});
