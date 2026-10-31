import type { Catalog } from '../core/domain/types';
import { INGREDIENTS } from './ingredients';
import { INGREDIENTS_2 } from './ingredients_2';
import { INGREDIENTS_3 } from './ingredients_3';
import { COLAZIONI } from './recipes/colazioni';
import { PRANZI_CENE } from './recipes/pranzi_cene';
import { SECONDI } from './recipes/secondi';
import { SPUNTINI } from './recipes/spuntini';
import { COLAZIONI_SPUNTINI_2 } from './recipes/colazioni_spuntini_2';
import { PRIMI_2 } from './recipes/primi_2';
import { SECONDI_2 } from './recipes/secondi_2';
import { VEGETALI_2 } from './recipes/vegetali_2';
import { COLAZIONI_DOLCI_3 } from './recipes/b3_colazioni_dolci';
import { COLAZIONI_SALATE_3 } from './recipes/b3_colazioni_salate';
import { SPUNTINI_3 } from './recipes/b3_spuntini';

/** Catalogo incluso nell'app: ingredienti canonici e ricette originali. */
export const CATALOG: Catalog = {
  ingredients: [...INGREDIENTS, ...INGREDIENTS_2, ...INGREDIENTS_3],
  recipes: [...PRANZI_CENE, ...SECONDI, ...COLAZIONI, ...SPUNTINI, ...PRIMI_2, ...SECONDI_2, ...VEGETALI_2, ...COLAZIONI_SPUNTINI_2,
    ...COLAZIONI_DOLCI_3, ...COLAZIONI_SALATE_3, ...SPUNTINI_3,
  ],
};
