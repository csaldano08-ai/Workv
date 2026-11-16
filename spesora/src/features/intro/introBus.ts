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
