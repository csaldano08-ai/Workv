import type { CatalogIndex } from '../../core/domain/catalog';
import { isFishDish, isLegumeDish, isPiattoUnico } from '../../core/domain/classify';
import { checkHardConstraints } from '../../core/domain/planner';
import { draftProfile } from '../../core/domain/profile';
import type { Allergen, Diet, MealType, UserProfile } from '../../core/domain/types';
import { matchesCourse } from './search';

/**
 * Copertura del catalogo per profili alimentari: quante ricette sono REALMENTE compatibili
 * con una combinazione di dieta, esclusioni, pasto e tempo. Usa gli stessi vincoli rigidi del motore.
 */

export interface CoverageProfile {
  label: string;
  diet: Diet;
  excludedAllergens?: Allergen[];
  maxMinutes?: number;
}

export const MEALS: MealType[] = ['colazione', 'pranzo', 'cena', 'spuntino'];

export function compatibleCount(catalog: CatalogIndex, p: CoverageProfile, meal: MealType, extra?: (r: Parameters<typeof isPiattoUnico>[0]) => boolean): number {
  const profile: UserProfile = {
    ...draftProfile(),
    diet: p.diet,
    excludedAllergens: p.excludedAllergens ?? [],
    equipment: ['fornelli', 'forno', 'microonde', 'friggitrice_aria', 'mixer', 'tostapane'],
  };
  return catalog.catalog.recipes.filter(
    (r) =>
      r.mealTypes.includes(meal) &&
      (p.maxMinutes === undefined || r.totalMinutes <= p.maxMinutes) &&
      checkHardConstraints(r, profile, catalog).length === 0 &&
      (!extra || extra(r)),
  ).length;
}

export const COVERAGE_PROFILES: CoverageProfile[] = [
  { label: 'Onnivoro', diet: 'onnivoro' },
  { label: 'Pescetariano', diet: 'pescetariano' },
  { label: 'Vegetariano', diet: 'vegetariano' },
  { label: 'Vegano', diet: 'vegano' },
  { label: 'Onnivoro · 15 min', diet: 'onnivoro', maxMinutes: 15 },
  { label: 'Onnivoro · 30 min', diet: 'onnivoro', maxMinutes: 30 },
  { label: 'Onnivoro · 60 min', diet: 'onnivoro', maxMinutes: 60 },
  { label: 'Vegetariano · 20 min', diet: 'vegetariano', maxMinutes: 20 },
  { label: 'Vegano · 20 min', diet: 'vegano', maxMinutes: 20 },
  { label: 'Senza glutine (ingredienti)', diet: 'onnivoro', excludedAllergens: ['glutine'] },
  { label: 'Senza latte', diet: 'onnivoro', excludedAllergens: ['latte'] },
  { label: 'Senza uova', diet: 'onnivoro', excludedAllergens: ['uova'] },
  { label: 'Senza frutta a guscio', diet: 'onnivoro', excludedAllergens: ['frutta_guscio'] },
  { label: 'Senza pesce, crostacei, molluschi', diet: 'onnivoro', excludedAllergens: ['pesce', 'crostacei', 'molluschi'] },
  { label: 'Senza soia', diet: 'onnivoro', excludedAllergens: ['soia'] },
  { label: 'Senza sesamo, sedano, senape', diet: 'onnivoro', excludedAllergens: ['sesamo', 'sedano', 'senape'] },
  { label: 'Senza latte, uova, frutta a guscio', diet: 'onnivoro', excludedAllergens: ['latte', 'uova', 'frutta_guscio'] },
  { label: 'Vegano · senza soia · 20 min', diet: 'vegano', excludedAllergens: ['soia'], maxMinutes: 20 },
  { label: 'Vegetariano · senza glutine', diet: 'vegetariano', excludedAllergens: ['glutine'] },
  { label: 'Pescetariano · senza latte · 30 min', diet: 'pescetariano', excludedAllergens: ['latte'], maxMinutes: 30 },
];

export interface CoverageRow {
  label: string;
  counts: Record<MealType, number>;
}

export function coverageMatrix(catalog: CatalogIndex, profiles = COVERAGE_PROFILES): CoverageRow[] {
  return profiles.map((p) => ({ label: p.label, counts: Object.fromEntries(MEALS.map((m) => [m, compatibleCount(catalog, p, m)])) as Record<MealType, number> }));
}

/** Preferenze leggere: quante ricette per pranzo/cena le soddisfano (profilo onnivoro). */
export function preferenceCoverage(catalog: CatalogIndex): Record<string, number> {
  const main = catalog.catalog.recipes.filter((r) => r.mealTypes.includes('pranzo') || r.mealTypes.includes('cena'));
  return {
    'Piatti vegetali (vegani)': main.filter((r) => catalog.factsOf(r).vegan).length,
    Primi: main.filter((r) => matchesCourse(r, 'primi')).length,
    Secondi: main.filter((r) => matchesCourse(r, 'secondi')).length,
    'Piatti unici': main.filter((r) => isPiattoUnico(r)).length,
    Pesce: main.filter((r) => isFishDish(r, catalog)).length,
    Legumi: main.filter((r) => isLegumeDish(r)).length,
    'Colazioni salate': catalog.catalog.recipes.filter((r) => matchesCourse(r, 'colazioni_salate')).length,
    'Colazioni dolci': catalog.catalog.recipes.filter((r) => matchesCourse(r, 'colazioni_dolci')).length,
  };
}

/**
 * Soglia minima per un calendario vario: almeno 7 ricette diverse per pasto (una settimana senza ripetizioni).
 * Le combinazioni sotto soglia vanno segnalate, non risolte ignorando i vincoli.
 */
export const MIN_WEEKLY_VARIETY = 7;

export function weakSpots(rows: CoverageRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) for (const m of MEALS) if (r.counts[m] < MIN_WEEKLY_VARIETY) out.push(`${r.label} · ${m}: ${r.counts[m]}`);
  return out;
}
