import type { Allergen, Diet, DishCategory, Equipment, MealType, ShoppingCategory } from '../core/domain/types';

export const MEAL_LABELS: Record<MealType, string> = { colazione: 'Colazione', pranzo: 'Pranzo', cena: 'Cena', spuntino: 'Spuntino' };

export const DIET_LABELS: Record<Diet, string> = {
  onnivoro: 'Onnivoro',
  pescetariano: 'Pescetariano',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  glutine: 'Glutine',
  crostacei: 'Crostacei',
  uova: 'Uova',
  pesce: 'Pesce',
  arachidi: 'Arachidi',
  soia: 'Soia',
  latte: 'Latte e derivati',
  frutta_guscio: 'Frutta a guscio',
  sedano: 'Sedano',
  senape: 'Senape',
  sesamo: 'Sesamo',
  solfiti: 'Solfiti',
  lupini: 'Lupini',
  molluschi: 'Molluschi',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  fornelli: 'Fornelli',
  forno: 'Forno',
  microonde: 'Microonde',
  friggitrice_aria: 'Friggitrice ad aria',
  mixer: 'Mixer / frullatore',
  tostapane: 'Tostapane',
};

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  frutta_verdura: 'Frutta e verdura',
  pane_forno: 'Pane e forno',
  pasta_riso_cereali: 'Pasta, riso e cereali',
  legumi: 'Legumi',
  carne: 'Carne',
  pesce: 'Pesce',
  latticini_uova: 'Latticini e uova',
  dispensa: 'Dispensa',
  condimenti_spezie: 'Condimenti e spezie',
  surgelati: 'Surgelati',
  bevande: 'Bevande',
};

export const DISH_LABELS: Record<DishCategory, string> = {
  pasta: 'Pasta',
  riso: 'Riso',
  cereali: 'Cereali',
  legumi: 'Legumi',
  carne: 'Carne',
  pesce: 'Pesce',
  uova: 'Uova',
  verdure: 'Verdure',
  zuppa: 'Zuppe',
  pane: 'Pane e piadine',
  colazione_dolce: 'Colazione dolce',
  colazione_salata: 'Colazione salata',
  frutta: 'Frutta',
};
