import { describe, expect, it } from 'vitest';
import { isFishDish, isProteinDish } from '../core/domain/classify';
import { generatePlan } from '../core/domain/planner';
import { DEFAULT_PORTIONS, ingredientNeed, suggestedPortions } from '../core/domain/portions';
import { parseProfile } from '../core/domain/profile';
import { toMilli } from '../core/domain/quantity';
import { planShopping } from '../core/domain/shopping';
import type { PlannedMeal, PortionProfile, UserProfile } from '../core/domain/types';
import { catalog, onboardedService, profile, profileA } from './helpers';

const MONDAY = '2026-11-02';
const portions = (p: Partial<PortionProfile>): PortionProfile => ({ ...DEFAULT_PORTIONS, ...p });

function need(recipeId: string, ingredientId: string, servings: number, p?: PortionProfile) {
  const r = catalog.recipe(recipeId)!;
  const ri = r.ingredients.find((i) => i.ingredientId === ingredientId)!;
  return ingredientNeed(r, ri, catalog.ingredient(ingredientId), servings, p);
}

describe('Logica porzioni', () => {
  it('la pasta principale usa la porzione abituale (70 g e 110 g)', () => {
    expect(need('pasta_al_tonno', 'pasta_secca', 1, portions({ pastaGrams: 70 }))).toBe(toMilli(70));
    expect(need('pasta_al_tonno', 'pasta_secca', 3, portions({ pastaGrams: 110 }))).toBe(toMilli(330));
    // Senza profilo porzioni la ricetta resta com'è scritta
    expect(need('pasta_al_tonno', 'pasta_secca', 1)).toBe(toMilli(80));
  });

  it('la pasta secondaria (minestrone) si scala in proporzione', () => {
    const base = need('minestrone_pastina', 'pasta_secca', 2);
    expect(need('minestrone_pastina', 'pasta_secca', 2, portions({ pastaGrams: 120 }))).toBe(Math.round((base * 120) / 80));
  });

  it('riso, proteine e appetito seguono regole semplici', () => {
    const risotto = catalog.catalog.recipes.find((r) => r.ingredients.some((i) => i.ingredientId === 'riso' && (i.qty ?? 0) / r.baseServings >= 50))!;
    expect(need(risotto.id, 'riso', 2, portions({ riceGrams: 90 }))).toBe(toMilli(180));
    const base = need('pollo_al_limone', 'petto_pollo', 2);
    expect(need('pollo_al_limone', 'petto_pollo', 2, portions({ proteinSize: 'abbondante' }))).toBe(Math.round(base * 1.25));
    expect(need('pollo_al_limone', 'petto_pollo', 2, portions({ proteinSize: 'piccola' }))).toBe(Math.round(base * 0.8));
    const tomato = need('pasta_al_tonno', 'pomodori_pelati', 2);
    expect(need('pasta_al_tonno', 'pomodori_pelati', 2, portions({ appetite: 'tanto' }))).toBe(Math.round(tomato * 1.15));
    expect(need('pasta_al_tonno', 'pomodori_pelati', 2, portions({ appetite: 'normale' }))).toBe(tomato);
  });

  it('i suggerimenti sono modificabili e non dipendono dal sesso', () => {
    expect(suggestedPortions('poco', 'sedentario')).toEqual({ pastaGrams: 70, riceGrams: 60, proteinSize: 'piccola' });
    expect(suggestedPortions('normale', 'mi_alleno').proteinSize).toBe('abbondante');
    const r = catalog.recipe('pasta_al_tonno')!;
    const ri = r.ingredients[0];
    const ing = catalog.ingredient(ri.ingredientId);
    expect(ingredientNeed(r, ri, ing, 2, portions({ gender: 'donna' }))).toBe(ingredientNeed(r, ri, ing, 2, portions({ gender: 'uomo' })));
  });

  it('la lista della spesa usa le porzioni personalizzate', () => {
    const meal: PlannedMeal = { id: 'a', date: MONDAY, mealType: 'pranzo', timeMinutes: 780, recipeId: 'pasta_al_tonno', servings: 2, status: 'planned', source: 'auto', reasons: [] };
    const shop = (p?: PortionProfile) =>
      planShopping({ meals: [meal], catalog, pantry: new Map(), presentStaples: new Set(), shoppingDays: [0], today: MONDAY, horizonEnd: MONDAY, portions: p }).trips[0].lines.find((l) => l.ingredientId === 'pasta_secca')!.qty;
    expect(shop(portions({ pastaGrams: 70 }))).toBe(toMilli(140));
    expect(shop(portions({ pastaGrams: 110 }))).toBe(toMilli(220));
  });

  it('la dispensa sottrae la porzione personalizzata, una sola volta', async () => {
    const p: UserProfile = { ...profileA(), portions: portions({ pastaGrams: 110 }) };
    const { service } = await onboardedService(p, MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    const meal = (await service.snapshot(MONDAY)).meals.find((m) => m.mealType === 'pranzo')!;
    await service.replaceRecipe(meal.id, 'pasta_al_tonno');
    await service.markCooked(meal.id);
    await service.markCooked(meal.id);
    expect((await service.snapshot(MONDAY)).pantry.get('pasta_secca')?.qty).toBe(toMilli(390));
  });
});

describe('Gusti e stile della settimana', () => {
  const count = (p: UserProfile, pred: (id: string) => boolean) => generatePlan({ profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 11 }).meals.filter((m) => pred(m.recipeId)).length;

  it('preferire il pesce aumenta i piatti di pesce senza violare i vincoli', () => {
    const fish = (id: string) => isFishDish(catalog.recipe(id)!, catalog);
    const base = count(profile(), fish);
    const liked = count(profile({ tastes: { likes: ['pesce'], weekStyles: [] } }), fish);
    expect(liked).toBeGreaterThan(base);
    // Un vegetariano che "preferisce il pesce" non riceve pesce: i vincoli vincono sempre
    expect(count(profile({ diet: 'vegetariano', tastes: { likes: ['pesce'], weekStyles: [] } }), fish)).toBe(0);
  });

  it('settimana proteica e più vegetariana spostano le scelte', () => {
    const prot = (id: string) => isProteinDish(catalog.recipe(id)!);
    expect(count(profile({ tastes: { likes: [], weekStyles: ['proteica'] } }), prot)).toBeGreaterThanOrEqual(count(profile(), prot));
    const veg = (id: string) => catalog.factsOf(catalog.recipe(id)!).vegetarian;
    expect(count(profile({ tastes: { likes: [], weekStyles: ['vegetariana'] } }), veg)).toBeGreaterThan(count(profile(), veg));
  });

  it('settimana veloce riduce il tempo medio', () => {
    const avg = (p: UserProfile) => {
      const meals = generatePlan({ profile: p, catalog, startDate: MONDAY, days: 7, pantry: new Map(), history: [], favorites: new Set(), seed: 11 }).meals;
      return meals.reduce((s, m) => s + catalog.recipe(m.recipeId)!.totalMinutes, 0) / meals.length;
    };
    expect(avg(profile({ tastes: { likes: [], weekStyles: ['veloce'] } }))).toBeLessThan(avg(profile()));
  });
});

describe('Compatibilità dei profili salvati', () => {
  it('un profilo della prima versione (senza porzioni e gusti) riceve i valori predefiniti', () => {
    const old: Record<string, unknown> = { ...profile() };
    delete old.portions;
    delete old.tastes;
    const parsed = parseProfile(old);
    expect(parsed.portions).toEqual(DEFAULT_PORTIONS);
    expect(parsed.tastes).toEqual({ likes: [], weekStyles: [] });
  });

  it('il nuovo formulario salva porzioni e gusti', async () => {
    const p = profile({ portions: portions({ appetite: 'tanto', pastaGrams: 120, goal: 'proteici' }), tastes: { likes: ['primi', 'cene_veloci'], weekStyles: ['varia'] } });
    const { service } = await onboardedService(p, MONDAY);
    const snap = await service.snapshot(MONDAY);
    expect(snap.profile?.portions.pastaGrams).toBe(120);
    expect(snap.profile?.tastes.likes).toEqual(['primi', 'cene_veloci']);
    await expect(service.updateProfile({ ...p, portions: { ...p.portions, pastaGrams: 10 } }, MONDAY)).rejects.toThrow();
  });
});

describe('Struttura premium', () => {
  it('con paywall off o soft nessuna funzione è bloccata; con hard serve un abbonamento attivo', async () => {
    const { canUse, PLUS_FEATURES } = await import('../core/purchases/features');
    for (const f of Object.keys(PLUS_FEATURES) as (keyof typeof PLUS_FEATURES)[]) {
      expect(canUse(f, 'off', { state: 'none' })).toBe(true);
      expect(canUse(f, 'soft', { state: 'none' })).toBe(true);
      expect(canUse(f, 'hard', { state: 'none' })).toBe(false);
      expect(canUse(f, 'hard', { state: 'expired', expiredAt: 'x' })).toBe(false);
      expect(canUse(f, 'hard', { state: 'active', expiresAt: null, willRenew: true, inGracePeriod: true })).toBe(true);
    }
  });
});
