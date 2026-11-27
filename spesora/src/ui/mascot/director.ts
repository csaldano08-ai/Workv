import { useSyncExternalStore } from 'react';

/**
 * Regia di Mina: un solo posto decide quale reazione recita la mascotte di ogni pagina, a partire da azioni vere
 * dell'utente e dai dati (spunte, quantità, timer, pasti cucinati). Regole:
 *  - priorità: una reazione importante in corso (es. lista completata) non viene interrotta da una minore;
 *    una reazione nuova di pari o maggiore priorità la sostituisce (interruzione pulita: Mina rifà il gesto da capo);
 *  - eventi ripetuti: lo stesso evento (stessa pagina, tipo e chiave) entro `repeatMs` viene ignorato,
 *    così tornando avanti e indietro tra le schede Mina non ripete sempre la stessa scena;
 *  - navigazione e background: lasciando la pagina la sua reazione si azzera (nessuna scena «vecchia» al ritorno);
 *  - nessun timer e nessun ciclo: la reazione resta l'ultima finché non ne arriva un'altra o si lascia la pagina.
 * La logica (`decide`) è pura e testata; lo stato vive in un piccolo store esterno a React.
 */
export type MinaScope = 'home' | 'week' | 'shopping' | 'pantry' | 'recipes' | 'cooking';

export type MinaEventKind =
  | 'missingIngredients' // Home: al pasto di oggi manca qualcosa
  | 'mealPlanned' // Settimana: un pasto è stato programmato, cambiato o spostato
  | 'listCompleted' // Spesa: tutte le voci spuntate
  | 'shortage' // Dispensa: «potrebbe non bastare»
  | 'shortageResolved' // Dispensa: l'avviso è sparito
  | 'timerStarted' // Preparazione: parte il timer di un passaggio
  | 'timerDone' // Preparazione: tempo scaduto
  | 'cooked'; // Preparazione: «Ho cucinato»

interface Rule {
  /** 1 bassa · 2 media · 3 alta (festeggiamenti e soluzioni). */
  priority: number;
  /** Per quanto la reazione «occupa» la scena (ms): durante questo tempo le reazioni minori non la interrompono. */
  holdMs: number;
  /** Entro quanto lo stesso evento viene considerato una ripetizione e ignorato (ms). */
  repeatMs: number;
}

export const MINA_RULES: Record<MinaEventKind, Rule> = {
  missingIngredients: { priority: 2, holdMs: 2600, repeatMs: 10 * 60_000 },
  mealPlanned: { priority: 2, holdMs: 1900, repeatMs: 1200 },
  listCompleted: { priority: 3, holdMs: 3600, repeatMs: 30_000 },
  shortage: { priority: 2, holdMs: 3200, repeatMs: 5 * 60_000 },
  shortageResolved: { priority: 3, holdMs: 2600, repeatMs: 3000 },
  timerStarted: { priority: 1, holdMs: 2600, repeatMs: 800 },
  timerDone: { priority: 3, holdMs: 2800, repeatMs: 2000 },
  cooked: { priority: 3, holdMs: 3000, repeatMs: 5000 },
};

export interface MinaEvent {
  scope: MinaScope;
  kind: MinaEventKind;
  /** Distingue eventi dello stesso tipo (es. l'ingrediente, il passaggio, il pasto). */
  key?: string;
}

export interface MinaReaction extends MinaEvent {
  /** Cresce a ogni reazione: usarlo come `event`/`replayKey` fa ripartire il gesto. */
  id: number;
  at: number;
  until: number;
  priority: number;
}

export interface DirectorState {
  current: Partial<Record<MinaScope, MinaReaction>>;
  /** Ultima volta (ms) in cui è arrivato ogni evento: pagina|tipo|chiave. */
  seen: Record<string, number>;
  nextId: number;
}

export const EMPTY_DIRECTOR: DirectorState = { current: {}, seen: {}, nextId: 1 };

/** Decide se un evento diventa una reazione di Mina. Pura: stessi ingressi, stessa uscita. */
export function decide(state: DirectorState, ev: MinaEvent, now: number): { state: DirectorState; reaction: MinaReaction | null } {
  const rule = MINA_RULES[ev.kind];
  const sig = `${ev.scope}|${ev.kind}|${ev.key ?? ''}`;
  const last = state.seen[sig];
  if (last !== undefined && now - last < rule.repeatMs) return { state, reaction: null };
  const seen = { ...state.seen, [sig]: now };
  const cur = state.current[ev.scope];
  if (cur && now < cur.until && cur.priority > rule.priority) return { state: { ...state, seen }, reaction: null };
  const reaction: MinaReaction = { ...ev, id: state.nextId, at: now, until: now + rule.holdMs, priority: rule.priority };
  return { state: { current: { ...state.current, [ev.scope]: reaction }, seen, nextId: state.nextId + 1 }, reaction };
}

/** Toglie la reazione di una pagina (lasciata) o di tutte (app in background). Le ripetizioni restano ricordate. */
export function clearScope(state: DirectorState, scope?: MinaScope): DirectorState {
  if (!scope) return Object.keys(state.current).length ? { ...state, current: {} } : state;
  if (!state.current[scope]) return state;
  const current = { ...state.current };
  delete current[scope];
  return { ...state, current };
}

// ───────────── store ─────────────

let director: DirectorState = EMPTY_DIRECTOR;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Segnala un evento a Mina. Restituisce la reazione nata (o null se ignorato: ripetuto o meno importante). */
export function emitMina(ev: MinaEvent, now = Date.now()): MinaReaction | null {
  const r = decide(director, ev, now);
  director = r.state;
  if (r.reaction) notify();
  return r.reaction;
}

export function resetMina(scope?: MinaScope): void {
  const next = clearScope(director, scope);
  if (next === director) return;
  director = next;
  notify();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** L'ultima reazione di Mina in una pagina (o undefined). */
export function useMinaReaction(scope: MinaScope): MinaReaction | undefined {
  const get = () => director.current[scope];
  return useSyncExternalStore(subscribe, get, get);
}

// ───────────── momenti unici della sessione ─────────────

const once = new Set<string>();
/** Vero solo la prima volta in questa sessione (es. la trasformazione in Mina Chef entrando nelle ricette). */
export function firstTimeThisSession(key: string): boolean {
  return !once.has(key);
}
export function markSeenThisSession(key: string): void {
  once.add(key);
}

/** Solo per i test. */
export function __resetDirectorForTests(): void {
  director = EMPTY_DIRECTOR;
  once.clear();
}
