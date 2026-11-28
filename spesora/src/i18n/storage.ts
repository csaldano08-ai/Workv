import { Storage } from 'expo-sqlite/kv-store';

/**
 * Lingua scelta, salvata sul telefono (archivio chiave-valore di expo-sqlite, lettura sincrona all'avvio).
 * È separata dal profilo: la scelta vale anche prima di completare il questionario e cambiarla non tocca
 * piano, ricette, spesa, dispensa, preferenze o abbonamento.
 */
const KEY = 'mina.language';

export function loadLanguage(): string | null {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

export function saveLanguage(code: string): void {
  try {
    Storage.setItemSync(KEY, code);
  } catch {
    // se l'archivio non è disponibile la lingua vale per questa sessione
  }
}
