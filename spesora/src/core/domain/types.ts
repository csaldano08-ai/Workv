/**
 * Tipi di dominio di Spesora.
 *
 * Convenzioni importanti:
 * - Le date di calendario sono stringhe ISO locali `YYYY-MM-DD` (nessun fuso orario).
 * - Gli orari dei pasti sono minuti dalla mezzanotte (es. 13:00 → 780).
 * - Le quantità sono INTERI in milli-unità dell'unità canonica dell'ingrediente
 *   (1 g = 1000, 1 ml = 1000, 1 pezzo = 1000). Così 0,5 cipolle = 500 senza float.
 */

export type IsoDate = string; // YYYY-MM-DD
export type MilliQty = number; // intero, 1/1000 dell'unità canonica

export type Unit = 'g' | 'ml' | 'pz';

export const MEAL_TYPES = ['colazione', 'pranzo', 'cena', 'spuntino'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const DIETS = ['onnivoro', 'pescetariano', 'vegetariano', 'vegano'] as const;
export type Diet = (typeof DIETS)[number];

/** I 14 allergeni del Reg. UE 1169/2011, con nomi brevi italiani. */
export const ALLERGENS = [
  'glutine',
  'crostacei',
  'uova',
  'pesce',
  'arachidi',
  'soia',
  'latte',
  'frutta_guscio',
  'sedano',
  'senape',
  'sesamo',
  'solfiti',
  'lupini',
  'molluschi',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const EQUIPMENT = [
  'fornelli',
  'forno',
  'microonde',
  'friggitrice_aria',
  'mixer',
  'tostapane',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // 0 = lunedì … 6 = domenica
export type Weekday = (typeof WEEKDAYS)[number];

export const SHOPPING_CATEGORIES = [
  'frutta_verdura',
  'pane_forno',
  'pasta_riso_cereali',
  'legumi',
  'carne',
  'pesce',
  'latticini_uova',
  'dispensa',
  'condimenti_spezie',
  'surgelati',
  'bevande',
] as const;
export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

/**
 * Conservazione indicativa: numero massimo di giorni tra acquisto e utilizzo
 * che il pianificatore considera ragionevole. Non è una data di scadenza.
 */
export const PERISHABILITY = ['fresco_1', 'fresco_3', 'fresco_5', 'settimana', 'dispensa'] as const;
export type Perishability = (typeof PERISHABILITY)[number];

export const PERISHABILITY_MAX_DAYS: Record<Perishability, number> = {
  fresco_1: 1,
  fresco_3: 3,
  fresco_5: 5,
  settimana: 7,
  dispensa: 60,
};

export const DISH_CATEGORIES = [
  'pasta',
  'riso',
  'cereali',
  'legumi',
  'carne',
  'pesce',
  'uova',
  'verdure',
  'zuppa',
  'pane',
  'colazione_dolce',
  'colazione_salata',
  'frutta',
] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];

export interface Ingredient {
  /** ID persistente, snake_case, mai riutilizzato. */
  id: string;
  /** Nome singolare usato in lista. */
  name: string;
  /** Varianti testuali che identificano lo stesso ingrediente (plurali, sinonimi). */
  aliases: string[];
  unit: Unit;
  category: ShoppingCategory;
  /**
   * Allergeni noti per questo ingrediente generico.
   * Se `allergenStatus` è 'non_verificato' la lista può essere incompleta
   * (es. prodotti composti come pesto, dado, pane confezionato).
   */
  allergens: Allergen[];
  allergenStatus: 'verificato' | 'non_verificato';
  /** Compatibilità diete. */
  vegan: boolean;
  vegetarian: boolean;
  /** Ammesso in dieta pescetariana (vegetariano oppure pesce/molluschi/crostacei). */
  pescatarian: boolean;
  perishability: Perishability;
  /** Formati di vendita comuni e generici (unità canonica, NON milli). Facoltativo. */
  commonPackSizes?: number[];
  /** True per sale, olio, pepe ecc.: si usano "q.b." e non si quantificano. */
  staple?: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  /** Base del peso indicato: crudo (predefinito), cotto o sgocciolato. */
  basis?: 'crudo' | 'cotto' | 'sgocciolato';
  /** Quantità per le porzioni base, in unità canonica (NON milli). Omessa se `toTaste`. */
  qty?: number;
  /** Quanto basta: si richiede solo la presenza in dispensa. */
  toTaste?: boolean;
  /** Indicazione leggibile facoltativa, es. "1 cucchiaio". */
  hint?: string;
}

export interface RecipeStep {
  text: string;
  /** Timer suggerito in minuti per questo passaggio. */
  timerMinutes?: number;
  /** Riferimento futuro a illustrazione/sequenza visiva del passaggio. */
  mediaRef?: string;
}

export interface RecipeSubstitution {
  ingredientId: string;
  substituteId: string;
  note: string;
}

/* ---------------------------------------------------------------------- */
/* Metadati editoriali delle ricette (separati dai fatti derivabili)         */
/* ---------------------------------------------------------------------- */

export const CUISINES = ['italiana_tradizionale', 'italiana_regionale', 'italiana_quotidiana', 'internazionale'] as const;
export type Cuisine = (typeof CUISINES)[number];
export const SEASONS = ['primavera', 'estate', 'autunno', 'inverno'] as const;
export type Season = (typeof SEASONS)[number];
export const COOKING_METHODS = ['nessuna_cottura', 'padella', 'bollitura', 'forno', 'friggitrice_aria', 'vapore', 'stufato', 'microonde', 'griglia', 'tostatura'] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];
/** Stato editoriale: nessuna ricetta è "approvata" senza una revisione umana. */
export const REVIEW_STATUSES = ['candidate', 'structurally_validated', 'needs_culinary_review', 'needs_allergen_review', 'approved_for_release'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface RecipeMeta {
  cuisine: Cuisine;
  /** Regione di riferimento per i piatti regionali (es. "Sicilia"). */
  region?: string;
  difficulty: 1 | 2 | 3;
  taste: 'dolce' | 'salato';
  /** Tecnica di cottura principale: usata per alternare le preparazioni. */
  method: CookingMethod;
  /** Gruppo di varianti molto simili (es. "pasta_pomodoro"): il motore evita di ripeterle vicine. */
  family?: string;
  /** Stagioni ideali; assente = tutto l'anno. */
  seasons?: Season[];
  makeAhead?: boolean;
  batchFriendly?: boolean;
  /** Indicazione di conservazione generale, prudente. */
  storage?: string;
  /** Fonti consultate per la verifica editoriale (uso interno, non ripubblicate). */
  references?: string[];
  review: {
    status: ReviewStatus;
    culinary: 'pending' | 'checked';
    allergens: 'derived' | 'checked';
    rights: 'original_text';
  };
}

export interface Recipe {
  /** ID persistente, mai riutilizzato. */
  id: string;
  name: string;
  description: string;
  mealTypes: MealType[];
  dishCategory: DishCategory;
  baseServings: number;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  ingredients: RecipeIngredient[];
  equipment: Equipment[];
  steps: RecipeStep[];
  substitutions?: RecipeSubstitution[];
  /** Immagine locale con diritti verificati; null = illustrazione originale di fallback. */
  image?: null;
  /** Riferimento futuro a video o sequenze visive. */
  videoRef?: string | null;
  /** Metadati editoriali (facoltativi per compatibilità con le prime 156 ricette). */
  meta?: RecipeMeta;
}

/** Informazioni derivate (mai scritte a mano) per evitare incoerenze. */
export interface RecipeFacts {
  allergens: Allergen[];
  /** True se almeno un ingrediente ha allergeni non verificati. */
  allergenInfoIncomplete: boolean;
  vegan: boolean;
  vegetarian: boolean;
  pescatarian: boolean;
}

export interface Catalog {
  ingredients: Ingredient[];
  recipes: Recipe[];
}

/* ---------------------------------------------------------------------- */
/* Profilo utente                                                          */
/* ---------------------------------------------------------------------- */

export interface DaySchedule {
  /** Minuti massimi disponibili per cucinare quel giorno. */
  maxMinutes: number;
  /** Orari indicativi dei pasti (minuti dalla mezzanotte). */
  mealTimes: Record<MealType, number>;
}

/* ---------------------------------------------------------------------- */
/* Porzioni e gusti (personalizzazione di comfort, non indicazioni mediche) */
/* ---------------------------------------------------------------------- */

export const APPETITES = ['poco', 'normale', 'tanto'] as const;
export type Appetite = (typeof APPETITES)[number];
export const LIFESTYLES = ['sedentario', 'attivo', 'mi_alleno'] as const;
export type Lifestyle = (typeof LIFESTYLES)[number];
export const MEAL_GOALS = ['leggeri', 'equilibrati', 'sostanziosi', 'proteici'] as const;
export type MealGoal = (typeof MEAL_GOALS)[number];
export const PROTEIN_SIZES = ['piccola', 'media', 'abbondante'] as const;
export type ProteinSize = (typeof PROTEIN_SIZES)[number];
export const GENDERS = ['non_indicato', 'donna', 'uomo', 'altro'] as const;
export type Gender = (typeof GENDERS)[number];

export interface PortionProfile {
  /** Facoltativo e solo informativo: non entra in nessun calcolo. */
  gender: Gender;
  appetite: Appetite;
  lifestyle: Lifestyle;
  goal: MealGoal;
  /** Pasta a persona quando è l'ingrediente principale (g). */
  pastaGrams: number;
  /** Riso e cereali in chicco a persona quando sono l'ingrediente principale (g). */
  riceGrams: number;
  /** Carne, pesce, tofu e uova nei secondi. */
  proteinSize: ProteinSize;
}

export const LIKES = ['pesce', 'legumi', 'vegetali', 'proteiche', 'primi', 'secondi', 'piatti_unici', 'bowl', 'cene_veloci', 'colazioni_salate', 'colazioni_dolci'] as const;
export type Like = (typeof LIKES)[number];
export const WEEK_STYLES = ['pratica', 'varia', 'economica', 'proteica', 'vegetariana', 'veloce'] as const;
export type WeekStyle = (typeof WEEK_STYLES)[number];

export const BUDGET_MODES = ['off', 'minimo', 'equilibrato', 'limite'] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export interface BudgetProfile {
  /** off = solo gusti; minimo = spendere il meno possibile; equilibrato; limite = importo preciso. */
  mode: BudgetMode;
  /** Importo indicato dall'utente in centesimi (per il periodo scelto). */
  amountCents: number | null;
  period: 'settimana' | 'mese';
  /** Se il budget copre tutti i pasti pianificati in Spesora o solo una parte della spesa. */
  scope: 'pasti_spesora' | 'parte_spesa';
  store: 'discount' | 'supermercato' | 'mercato' | 'ovunque' | 'non_indicato';
}

export interface TastePreferences {
  likes: Like[];
  weekStyles: WeekStyle[];
}

export interface UserProfile {
  servings: number;
  mealTypes: MealType[];
  diet: Diet;
  excludedAllergens: Allergen[];
  /** Ingredienti esclusi esplicitamente (vincolo rigido). */
  excludedIngredientIds: string[];
  /** Ingredienti non graditi (anch'essi esclusi, ma senza implicazioni sanitarie). */
  dislikedIngredientIds: string[];
  /** Indice 0 = lunedì. */
  days: DaySchedule[];
  shoppingDays: Weekday[];
  /** Budget settimanale facoltativo in centesimi. */
  weeklyBudgetCents: number | null;
  equipment: Equipment[];
  portions: PortionProfile;
  tastes: TastePreferences;
  budget: BudgetProfile;
}

/* ---------------------------------------------------------------------- */
/* Piano                                                                   */
/* ---------------------------------------------------------------------- */

export type MealStatus = 'planned' | 'cooked' | 'skipped' | 'ate_out' | 'other';

export interface PlannedMeal {
  id: string;
  date: IsoDate;
  mealType: MealType;
  timeMinutes: number;
  recipeId: string;
  servings: number;
  status: MealStatus;
  source: 'auto' | 'manual' | 'repeat';
  /** Motivazioni leggibili della scelta. */
  reasons: string[];
}

export interface HistoryEntry {
  recipeId: string;
  date: IsoDate;
  outcome: Exclude<MealStatus, 'planned'>;
}

export interface PlanIssue {
  date: IsoDate;
  mealType: MealType;
  code: 'no_compatible_recipes' | 'no_recipes_in_time';
  message: string;
}

export type PantryStock = Map<string, MilliQty>;
