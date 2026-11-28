/** Versione web (demo): la lingua scelta resta nel browser. Vedi `storage.ts`. */
const KEY = 'mina.language';

export function loadLanguage(): string | null {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveLanguage(code: string): void {
  try {
    globalThis.localStorage?.setItem(KEY, code);
  } catch {
    // archivio del browser non disponibile: la lingua vale per questa sessione
  }
}
