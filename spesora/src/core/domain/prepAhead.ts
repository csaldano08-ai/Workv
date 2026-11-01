import type { Recipe } from './types';

/**
 * Preparazioni da fare il giorno prima (riposo notturno in frigo, scongelamento lento).
 * Dedotte in modo deterministico dai passaggi della ricetta: nessuna stima, nessuna AI.
 */
export interface PrepAhead {
  kind: 'scongelamento' | 'riposo';
  /** Il passaggio della ricetta che lo richiede, così com'è scritto. */
  step: string;
  /** Vero se il passaggio è condizionale ("se è surgelato…"). */
  conditional: boolean;
}

const EVENING_BEFORE = /\b(dalla|la) sera prima\b|\btutta la notte\b|\bin frigo per 24 ore\b|\bil giorno prima\b/i;
const cache = new WeakMap<Recipe, PrepAhead | null>();

export function prepAheadOf(recipe: Recipe): PrepAhead | null {
  const hit = cache.get(recipe);
  if (hit !== undefined) return hit;
  let out: PrepAhead | null = null;
  for (const s of recipe.steps) {
    if (!EVENING_BEFORE.test(s.text)) continue;
    out = { kind: /scongel/i.test(s.text) ? 'scongelamento' : 'riposo', step: s.text, conditional: /^\s*se\b/i.test(s.text) };
    break;
  }
  cache.set(recipe, out);
  return out;
}

/** Prima frase del passaggio, adatta a una notifica. */
export function prepAheadShort(p: PrepAhead, max = 140): string {
  const first = p.step.split(/(?<=[.;:])\s/)[0].replace(/[.;:]$/, '');
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** Ora del promemoria serale (minuti dalla mezzanotte). */
export const PREP_AHEAD_MINUTES = 20 * 60;
