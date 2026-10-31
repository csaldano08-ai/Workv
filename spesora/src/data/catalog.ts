import type { Catalog } from '../core/domain/types';
import { INGREDIENTS } from './ingredients';
import { COLAZIONI } from './recipes/colazioni';
import { PRANZI_CENE } from './recipes/pranzi_cene';
import { SECONDI } from './recipes/secondi';
import { SPUNTINI } from './recipes/spuntini';

/** Catalogo incluso nell'app: ingredienti canonici e ricette originali. */
export const CATALOG: Catalog = {
  ingredients: INGREDIENTS,
  recipes: [...PRANZI_CENE, ...SECONDI, ...COLAZIONI, ...SPUNTINI],
};
