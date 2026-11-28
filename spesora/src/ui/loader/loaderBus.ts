import { t } from '../../i18n';

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

/** Frasi del caricamento nei momenti in cui Mina compone le ricette (getter: lette nella lingua corrente). */
export const LOADER_TEXT = {
  get firstWeek(): LoaderText {
    return { title: t('mascot:loader.firstWeek.title'), subtitle: t('mascot:loader.firstWeek.subtitle'), done: t('mascot:loader.firstWeek.done') };
  },
  get regenerate(): LoaderText {
    return { title: t('mascot:loader.regenerate.title'), subtitle: t('mascot:loader.regenerate.subtitle'), done: t('mascot:loader.regenerate.done') };
  },
  get expiring(): LoaderText {
    return { title: t('mascot:loader.expiring.title'), subtitle: t('mascot:loader.expiring.subtitle'), done: t('mascot:loader.expiring.done') };
  },
};
