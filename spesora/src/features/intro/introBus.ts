import { useSyncExternalStore } from 'react';

/** Richiesta di rivedere l'animazione iniziale (dalle Impostazioni). */
type Listener = () => void;
const listeners = new Set<Listener>();
export function replayIntro(): void {
  for (const l of listeners) l();
}
export function onReplayIntro(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// ───────────── stato dell'intro (per la schermata sotto, che non deve ripetere i gesti già visti) ─────────────

/** `none`: nessuna intro in questa sessione · `playing`: in corso · `done`: appena vista. */
export type IntroState = 'none' | 'playing' | 'done';
let state: IntroState = 'none';
const stateListeners = new Set<Listener>();
export function setIntroState(s: IntroState): void {
  if (state === s) return;
  state = s;
  for (const l of stateListeners) l();
}
export function getIntroState(): IntroState {
  return state;
}
function subscribe(l: Listener) {
  stateListeners.add(l);
  return () => {
    stateListeners.delete(l);
  };
}
export function useIntroState(): IntroState {
  return useSyncExternalStore(subscribe, getIntroState, getIntroState);
}

// ───────────── punti d'arrivo: dove si trovano logo e Mina nella schermata di Benvenuto ─────────────

export interface IntroRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type IntroAnchor = 'logo' | 'mina';
type Measure = () => Promise<IntroRect | null>;
const anchors = new Map<IntroAnchor, Measure>();

/**
 * La schermata di Benvenuto registra come misurare il suo logo e la sua Mina: alla fine dell'intro la
 * composizione vola esattamente lì e poi si dissolve, così il passaggio è continuo (nessun taglio).
 */
export function registerIntroAnchor(name: IntroAnchor, measure: Measure): () => void {
  anchors.set(name, measure);
  return () => {
    if (anchors.get(name) === measure) anchors.delete(name);
  };
}

/** Posizione attuale (coordinate della finestra) di un punto d'arrivo, o `null` se non c'è o non è misurabile. */
export async function measureIntroAnchor(name: IntroAnchor): Promise<IntroRect | null> {
  const m = anchors.get(name);
  if (!m) return null;
  try {
    const r = await Promise.race([m(), new Promise<null>((res) => setTimeout(() => res(null), 120))]);
    return r && r.w > 0 && r.h > 0 ? r : null;
  } catch {
    return null;
  }
}
