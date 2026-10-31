import type { CatalogIndex } from './catalog';
import type { Recipe } from './types';

/**
 * Indicazioni alimentari: stati espliciti, mai claim impliciti.
 *
 * - "not_assessed": non valutato. NON equivale a un esito negativo e NON autorizza un claim positivo.
 * - "data_incomplete": mancano dati (es. prodotti composti, valori nutrizionali).
 * - "verified": verificato con dati conformi (oggi nessuna ricetta lo è).
 *
 * Riferimenti: Reg. UE 1169/2011 (allergeni), Reg. UE 828/2014 (glutine),
 * Reg. CE 1924/2006 (indicazioni nutrizionali), Reg. UE 2018/848 (biologico).
 */
export type AssessmentStatus = 'not_assessed' | 'data_incomplete' | 'verified';

/** Ingredienti usati per dolcificare: rilevanti per gli "zuccheri aggiunti". */
export const SWEETENING_INGREDIENTS = new Set(['zucchero', 'zucchero_canna', 'miele', 'marmellata', 'sciroppo_acero', 'cioccolato_fondente', 'gocce_cioccolato', 'crema_nocciole']);

/** Prodotti composti che possono contenere zuccheri aggiunti secondo la marca. */
export const MAY_CONTAIN_ADDED_SUGARS = new Set([
  'biscotti_secchi', 'fette_biscottate', 'cereali_colazione', 'muesli', 'yogurt_soia', 'bevanda_soia', 'bevanda_avena', 'bevanda_riso', 'bevanda_mandorla',
  'pane_cassetta', 'crackers', 'piadina', 'tortilla', 'burro_arachidi', 'pesto_basilico', 'pesto_rosso', 'maionese', 'pasta_sfoglia', 'pasta_brisee',
  'besciamella', 'latte_cocco', 'pomodori_secchi', 'prugne_secche', 'albicocche_secche', 'fichi_secchi', 'datteri', 'uvetta', 'hummus', 'fiocchi_mais', 'focaccia', 'grissini', 'taralli', 'pane_arabo',
]);

export interface RecipeFoodInfo {
  /** Formulata senza ingredienti che contengono glutine (NON idoneità per celiaci). */
  formulatedWithoutGluten: { value: boolean; status: AssessmentStatus; note: string };
  /** Nessun ingrediente dolcificante nella preparazione (NON "senza zuccheri"). */
  noAddedSweeteners: { value: boolean; status: AssessmentStatus; note: string };
  /** Claim nutrizionali sulle proteine: sempre non valutati (mancano valori nutrizionali verificati). */
  proteinClaim: { status: AssessmentStatus; note: string };
  organic: { status: AssessmentStatus; note: string };
}

export function foodInfo(recipe: Recipe, catalog: CatalogIndex): RecipeFoodInfo {
  const ids = recipe.ingredients.map((i) => i.ingredientId);
  const ings = ids.map((id) => catalog.ingredient(id));
  const glutenIngredients = ings.filter((i) => i.allergens.includes('glutine'));
  const unverified = ings.filter((i) => i.allergenStatus === 'non_verificato');
  const noGlutenFormula = glutenIngredients.length === 0;
  const sweeteners = ids.filter((id) => SWEETENING_INGREDIENTS.has(id));
  const maybeSugar = ids.filter((id) => MAY_CONTAIN_ADDED_SUGARS.has(id));
  return {
    formulatedWithoutGluten: {
      value: noGlutenFormula,
      status: noGlutenFormula && unverified.length === 0 ? 'not_assessed' : 'data_incomplete',
      note: noGlutenFormula
        ? 'Nessun ingrediente della ricetta contiene glutine per sua natura. Non è un’indicazione “senza glutine”: verifica le etichette dei prodotti acquistati e le possibili contaminazioni.'
        : 'Contiene ingredienti con glutine.',
    },
    noAddedSweeteners: {
      value: sweeteners.length === 0 && maybeSugar.length === 0,
      status: sweeteners.length === 0 && maybeSugar.length > 0 ? 'data_incomplete' : 'not_assessed',
      note:
        sweeteners.length > 0
          ? 'La preparazione usa ingredienti per dolcificare.'
          : maybeSugar.length > 0
            ? 'Alcuni prodotti confezionati potrebbero contenere zuccheri aggiunti: controlla l’etichetta.'
            : 'Nessun ingrediente aggiunto per dolcificare. Gli alimenti possono contenere zuccheri naturalmente presenti.',
    },
    proteinClaim: { status: 'not_assessed', note: 'Valori nutrizionali non disponibili: nessuna indicazione sulle proteine.' },
    organic: { status: 'not_assessed', note: 'Nessuna informazione sulla certificazione biologica degli ingredienti.' },
  };
}
