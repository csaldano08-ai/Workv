import { describe, expect, it } from 'vitest';
import { CatalogIndex, validateCatalog } from '../core/domain/catalog';
import { CATALOG } from '../data/catalog';
import type { Catalog } from '../core/domain/types';

describe('Catalogo ricette', () => {
  it('supera la validazione dello schema e dei riferimenti', () => {
    const result = validateCatalog(CATALOG);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('contiene almeno 50 ricette e copre colazione, pranzo e cena', () => {
    expect(CATALOG.recipes.length).toBeGreaterThanOrEqual(50);
    for (const meal of ['colazione', 'pranzo', 'cena', 'spuntino'] as const) {
      expect(CATALOG.recipes.filter((r) => r.mealTypes.includes(meal)).length).toBeGreaterThanOrEqual(meal === 'spuntino' ? 4 : 10);
    }
  });

  it('normalizza gli alias degli ingredienti', () => {
    const idx = new CatalogIndex(CATALOG);
    expect(idx.resolveIngredient('Pomodori')).toBe(idx.resolveIngredient('pomodoro'));
    expect(idx.resolveIngredient('pomodoro')).toBeDefined();
  });

  it('rileva errori introdotti intenzionalmente', () => {
    const broken: Catalog = {
      ingredients: [...CATALOG.ingredients, { ...CATALOG.ingredients[0] }],
      recipes: [
        { ...CATALOG.recipes[0], id: 'Bad ID', totalMinutes: 0 },
        { ...CATALOG.recipes[1], ingredients: [{ ingredientId: 'inesistente', qty: 10 }] },
        { ...CATALOG.recipes[2], ingredients: [{ ingredientId: CATALOG.ingredients[0].id }] },
      ],
    };
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicato'))).toBe(true);
    expect(result.errors.some((e) => e.includes('sconosciuto'))).toBe(true);
    expect(result.errors.some((e) => e.includes('ID non valido'))).toBe(true);
    expect(result.errors.some((e) => e.includes('q.b.'))).toBe(true);
  });
});
