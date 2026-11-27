/**
 * Caricamento illustrato (concept C): gli ingredienti ballano mentre Mina lavora, poi si riuniscono.
 * `withLoader` mostra l'animazione, esegue il lavoro e restituisce il suo risultato.
 * Senza un LoaderHost montato (test, script) il lavoro viene eseguito direttamente.
 */
export interface LoaderText {
  title: string;
  subtitle?: string;
  /** Frase mostrata quando gli ingredienti si riuniscono. */
  done?: string;
}
type Handler = <T>(text: LoaderText, task: () => Promise<T>) => Promise<T>;
let handler: Handler | null = null;

export function setLoaderHandler(h: Handler | null): void {
  handler = h;
}

export function withLoader<T>(text: LoaderText, task: () => Promise<T>): Promise<T> {
  return handler ? handler(text, task) : task();
}

/** Durata minima perché l'animazione si legga (ms); più breve con "Riduci movimento". */
export function minLoaderMs(reducedMotion: boolean): number {
  return reducedMotion ? 700 : 1700;
}

/** Frasi del caricamento nei momenti in cui Mina compone le ricette. */
export const LOADER_TEXT = {
  firstWeek: { title: 'Preparo la tua settimana', subtitle: 'Scelgo le ricette, i giorni e la spesa.', done: 'Ecco le tue ricette!' },
  regenerate: { title: 'Rifaccio il menù', subtitle: 'Nuove ricette per i pasti ancora da cucinare.', done: 'Menù pronto!' },
  expiring: { title: 'Riorganizzo i prossimi pasti', subtitle: 'Prima gli ingredienti che scadono presto.', done: 'Fatto!' },
} satisfies Record<string, LoaderText>;
