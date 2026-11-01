/** Piccolo bus di eventi per i festeggiamenti di Mina (nessuno stato globale in React). */
export interface Celebration {
  title: string;
  text: string;
}
type Listener = (c: Celebration) => void;
const listeners = new Set<Listener>();

export function celebrate(c: Celebration): void {
  for (const l of listeners) l(c);
}

export function onCelebrate(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
