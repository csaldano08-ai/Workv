import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toMilli } from '../core/domain/quantity';
import { migrate } from '../core/storage/migrations';
import { SpesoraService } from '../features/app/SpesoraService';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../core/notifications/schedule';
import { openNodeDb } from './nodeDb';
import { catalog, makeService, onboardedService, profile, profileA } from './helpers';

const MONDAY = '2026-11-02';

async function pastaMeal(service: SpesoraService, recipeId = 'pasta_al_tonno') {
  const snap = await service.snapshot(MONDAY);
  const meal = snap.meals.find((m) => m.date === MONDAY && m.mealType === 'pranzo')!;
  await service.replaceRecipe(meal.id, recipeId);
  return meal.id;
}

describe('Test D — dispensa e doppio tap', () => {
  it('500 g − 80 g = 420 g e il secondo tap non sottrae di nuovo', async () => {
    const { service } = await onboardedService(profileA(), MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    const mealId = await pastaMeal(service);
    const [first, second] = await Promise.all([service.markCooked(mealId), service.markCooked(mealId)]);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    const third = await service.markCooked(mealId);
    expect(third).toEqual({ ok: false, reason: 'already_done' });
    const snap = await service.snapshot(MONDAY);
    expect(snap.pantry.get('pasta_secca')?.qty).toBe(toMilli(420));
    expect(snap.pantry.get('pasta_secca')?.estimated).toBe(true);
    expect(snap.history.filter((h) => h.outcome === 'cooked')).toHaveLength(1);
  });

  it('il vincolo del database impedisce un doppio consumo anche aggirando il servizio', async () => {
    const { service, db } = await onboardedService(profileA(), MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    const mealId = await pastaMeal(service);
    await service.markCooked(mealId);
    await expect(
      db.run("INSERT INTO pantry_movements (id, ingredient_id, delta, kind, meal_id, created_at) VALUES ('x', 'pasta_secca', -80000, 'meal_consumption', ?, 'now')", [mealId]),
    ).rejects.toThrow();
  });

  it('la correzione manuale riporta la quantità reale e toglie lo stato stimato', async () => {
    const { service } = await onboardedService(profileA(), MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    await service.markCooked(await pastaMeal(service));
    await service.setPantryQty('pasta_secca', toMilli(300));
    const e = (await service.snapshot(MONDAY)).pantry.get('pasta_secca')!;
    expect(e).toEqual({ ingredientId: 'pasta_secca', qty: toMilli(300), estimated: false });
    await service.removePantry('pasta_secca', toMilli(1000));
    expect((await service.snapshot(MONDAY)).pantry.get('pasta_secca')?.qty).toBe(0);
  });
});

describe('Test E — spesa non confermata', () => {
  it('il tonno in lista non risulta in dispensa finché l’acquisto non è confermato', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    await pastaMeal(service);
    let snap = await service.snapshot(MONDAY);
    const trip = snap.shopping.trips.find((t) => t.lines.some((l) => l.ingredientId === 'tonno_scatola'))!;
    expect(trip).toBeDefined();
    await service.setChecked(trip.date, 'tonno_scatola', true);
    snap = await service.snapshot(MONDAY);
    expect(snap.pantry.get('tonno_scatola')).toBeUndefined();
    expect(snap.checks.get(`${trip.date}|tonno_scatola`)).toBe(true);
    expect(snap.shopping.trips.some((t) => t.lines.some((l) => l.ingredientId === 'tonno_scatola'))).toBe(true);

    const line = trip.lines.find((l) => l.ingredientId === 'tonno_scatola')!;
    await service.confirmShopping(trip.date, [{ ingredientId: 'tonno_scatola', qty: line.suggestedQty, toTaste: false }], true);
    snap = await service.snapshot(MONDAY);
    expect(snap.pantry.get('tonno_scatola')?.qty).toBe(line.suggestedQty);
    expect(snap.shopping.trips.some((t) => t.lines.some((l) => l.ingredientId === 'tonno_scatola' && l.uses.some((u) => u.date === MONDAY)))).toBe(false);
  });
});

describe('Test F — cambio ricetta', () => {
  it('pasta al tonno → pasta al pesto: cambia il fabbisogno, gli acquisti restano', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    const mealId = await pastaMeal(service, 'pasta_al_tonno');
    let snap = await service.snapshot(MONDAY);
    const tripDate = snap.shopping.trips[0].date;
    await service.confirmShopping(tripDate, [{ ingredientId: 'pasta_secca', qty: toMilli(500), toTaste: false }], true);

    await service.replaceRecipe(mealId, 'pasta_al_pesto');
    snap = await service.snapshot(MONDAY);
    const lines = snap.shopping.trips.flatMap((t) => t.lines);
    const usesFor = (id: string) => lines.filter((l) => l.ingredientId === id).flatMap((l) => l.uses).filter((u) => u.mealId === mealId);
    expect(usesFor('tonno_scatola')).toHaveLength(0);
    expect(usesFor('pesto_basilico').length).toBeGreaterThan(0);
    expect(snap.pantry.get('pasta_secca')?.qty).toBe(toMilli(500));
    expect(snap.purchased.get(`${tripDate}|pasta_secca`)).toBe(toMilli(500));
    expect(snap.meals.find((m) => m.id === mealId)?.recipeId).toBe('pasta_al_pesto');
  });

  it('le alternative proposte rispettano i vincoli e preferiscono la dispensa', async () => {
    const p = profile({ excludedAllergens: ['latte'], servings: 1 });
    const { service } = await onboardedService(p, MONDAY, [{ ingredientId: 'ceci_cotti', qty: toMilli(800) }]);
    const snap = await service.snapshot(MONDAY);
    const alts = await service.alternatives(snap.meals[0].id, MONDAY);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(catalog.factsOf(a.recipe).allergens).not.toContain('latte');
  });
});

describe('Test G — pasto saltato', () => {
  it('mangio fuori: nessun ingrediente viene sottratto', async () => {
    const { service } = await onboardedService(profileA(), MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    const mealId = await pastaMeal(service);
    expect(await service.markNotFollowed(mealId, 'ate_out')).toBe(true);
    expect(await service.markNotFollowed(mealId, 'ate_out')).toBe(false);
    expect((await service.markCooked(mealId)).ok).toBe(false);
    const snap = await service.snapshot(MONDAY);
    expect(snap.pantry.get('pasta_secca')?.qty).toBe(toMilli(500));
    expect(snap.history[0]).toMatchObject({ outcome: 'ate_out', recipeId: 'pasta_al_tonno' });
    const next = await service.reproposeLater(mealId);
    expect(next?.recipeId).toBe('pasta_al_tonno');
  });

  it('la rigenerazione conserva pasti completati e acquisti', async () => {
    const { service } = await onboardedService(profileA(), MONDAY, [{ ingredientId: 'pasta_secca', qty: toMilli(500) }]);
    const mealId = await pastaMeal(service);
    await service.markCooked(mealId);
    const before = await service.snapshot(MONDAY);
    await service.regenerate(MONDAY);
    const after = await service.snapshot(MONDAY);
    expect(after.meals.find((m) => m.id === mealId)).toMatchObject({ status: 'cooked', recipeId: 'pasta_al_tonno' });
    expect(after.meals).toHaveLength(before.meals.length);
    expect(after.pantry.get('pasta_secca')?.qty).toBe(toMilli(420));
    expect(after.meals.map((m) => m.recipeId)).not.toEqual(before.meals.map((m) => m.recipeId));
  });

  it('modificare le esclusioni rigenera i pasti futuri incompatibili', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    await pastaMeal(service, 'pasta_al_tonno');
    await service.updateProfile({ ...profileA(), excludedAllergens: ['pesce', 'glutine'] }, MONDAY);
    const snap = await service.snapshot(MONDAY);
    for (const m of snap.meals) {
      const f = catalog.factsOf(catalog.recipe(m.recipeId)!);
      expect(f.allergens).not.toContain('pesce');
      expect(f.allergens).not.toContain('glutine');
    }
  });
});

describe('Test J — persistenza', () => {
  it('chiudendo e riaprendo il database i dati restano', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'spesora-'));
    const file = join(dir, 'spesora.db');
    try {
      let db = openNodeDb(file);
      await migrate(db);
      let service = new SpesoraService(db, catalog);
      await service.completeOnboarding(profileA(), [{ ingredientId: 'pasta_secca', qty: toMilli(500) }, { ingredientId: 'sale', qty: null }], DEFAULT_NOTIFICATION_SETTINGS, MONDAY);
      const mealId = (await service.snapshot(MONDAY)).meals[0].id;
      await service.toggleFavorite('pasta_al_tonno', true);
      await service.markNotFollowed(mealId, 'skipped');
      const before = await service.snapshot(MONDAY);
      db.close();

      db = openNodeDb(file);
      expect(await migrate(db)).toBe(1);
      service = new SpesoraService(db, catalog);
      const after = await service.snapshot(MONDAY);
      expect(after.profile).toEqual(before.profile);
      expect(after.meals).toEqual(before.meals);
      expect(after.pantry).toEqual(before.pantry);
      expect(after.staples.has('sale')).toBe(true);
      expect(after.favorites.has('pasta_al_tonno')).toBe(true);
      expect(after.history).toEqual(before.history);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('salva l’onboarding in modo progressivo e riprende dal passo raggiunto', async () => {
    const db = openNodeDb();
    await migrate(db);
    const service = new SpesoraService(db, catalog);
    await service.saveOnboardingStep({ servings: 3 }, 4);
    const snap = await service.snapshot(MONDAY);
    expect(snap.onboarding).toEqual({ draft: { servings: 3 }, step: 4, completed: false });
    expect(snap.profile).toBeNull();
  });

  it('genera automaticamente un nuovo calendario quando quello attuale è finito', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    expect(await service.ensureCurrentPlan(MONDAY)).toBe(false);
    expect(await service.ensureCurrentPlan('2026-11-09')).toBe(true);
    const snap = await service.snapshot('2026-11-09');
    expect(snap.plan?.startDate).toBe('2026-11-09');
    expect(snap.meals[0].date).toBe('2026-11-09');
  });

  it('un calendario creato nel pomeriggio non segnala il pranzo già passato come problema', async () => {
    const { service } = await makeService();
    await service.completeOnboarding(profileA(), [], DEFAULT_NOTIFICATION_SETTINGS, MONDAY, 16 * 60);
    const snap = await service.snapshot(MONDAY);
    expect(snap.meals.filter((m) => m.date === MONDAY).map((m) => m.mealType)).toEqual(['cena']);
    expect(snap.issues).toEqual([]);
  });

  it('esporta in JSON e cancella tutti i dati', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    const json = JSON.parse(await service.exportJson());
    expect(json.data.planned_meals.length).toBe(14);
    await service.wipe();
    const snap = await service.snapshot(MONDAY);
    expect(snap.onboarding).toBeNull();
    expect(snap.meals).toHaveLength(0);
  });
});

describe('Test L — errori e input non validi', () => {
  it('database vuoto: snapshot coerente senza crash', async () => {
    const db = openNodeDb();
    await migrate(db);
    const snap = await new SpesoraService(db, catalog).snapshot(MONDAY);
    expect(snap.profile).toBeNull();
    expect(snap.shopping.trips).toEqual([]);
  });

  it('rifiuta quantità nulle, negative o non numeriche', async () => {
    const { service } = await onboardedService(profileA(), MONDAY);
    await expect(service.addPantry('pasta_secca', 0)).rejects.toThrow();
    await expect(service.addPantry('pasta_secca', -5)).rejects.toThrow();
    await expect(service.addPantry('pasta_secca', Number.NaN)).rejects.toThrow();
    await expect(service.setPantryQty('pasta_secca', 1.5)).rejects.toThrow();
    await expect(service.setServings((await service.snapshot(MONDAY)).meals[0].id, 0)).rejects.toThrow();
    await expect(service.confirmShopping(MONDAY, [{ ingredientId: 'pasta_secca', qty: 0, toTaste: false }], false)).rejects.toThrow();
    await expect(service.addPantry('ingrediente_inesistente', 1000)).rejects.toThrow();
  });

  it('profilo malformato rifiutato in onboarding; preferenze corrotte non cancellano i dati', async () => {
    const { service, db } = await onboardedService(profileA(), MONDAY);
    await expect(service.updateProfile({ servings: 'tre' }, MONDAY)).rejects.toThrow();
    await db.run("UPDATE user_preferences SET data = '{not json' WHERE id = 1");
    const snap = await service.snapshot(MONDAY);
    expect(snap.profile).toBeNull();
    expect(snap.meals.length).toBe(14);
  });

  it('migrazioni idempotenti e rifiuto di uno schema più recente', async () => {
    const db = openNodeDb();
    expect(await migrate(db)).toBe(1);
    expect(await migrate(db)).toBe(1);
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toThrow(/più recente/);
  });
});
