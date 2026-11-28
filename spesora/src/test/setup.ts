import { vi } from 'vitest';

// Tutti i test girano nel fuso orario italiano per verificare l'ora legale.
process.env.TZ = 'Europe/Rome';

// Localizzazione nei test: telefono in italiano, nessuna lingua salvata (moduli nativi sostituiti).
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'it', regionCode: 'IT', languageTag: 'it-IT' }] }));
vi.mock('expo-sqlite/kv-store', () => ({ Storage: { getItemSync: () => null, setItemSync: () => undefined } }));
