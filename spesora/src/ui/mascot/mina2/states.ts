import type { MinaPose } from './poses';

/** Stati di recitazione di Mina, indipendenti dai nomi interni delle pose. */
export type MinaState = 'idle' | 'hello' | 'happy' | 'thinking' | 'concerned' | 'pointing' | 'cooking' | 'success' | 'celebrate' | 'goodbye';
export type MinaVariant = 'standard' | 'chef';

/**
 * Da stato a posa, per variante. Mina Chef recita con i suoi oggetti del foglio (cucchiaio, ciotola, cloche):
 * per gli stati che non hanno una posa da chef usa la posa del foglio più vicina.
 */
export const MINA_STATE_POSE: Record<MinaVariant, Record<MinaState, MinaPose>> = {
  standard: {
    idle: 'neutral',
    hello: 'welcome',
    happy: 'happy',
    thinking: 'thinking',
    concerned: 'concerned',
    pointing: 'pointing',
    cooking: 'cooking',
    success: 'success',
    celebrate: 'success',
    goodbye: 'goodbye',
  },
  chef: {
    idle: 'recipe',
    hello: 'cooking',
    happy: 'cooking',
    thinking: 'recipe',
    concerned: 'recipe',
    pointing: 'serving',
    cooking: 'cooking',
    success: 'mixing',
    celebrate: 'serving',
    goodbye: 'cooking',
  },
};

