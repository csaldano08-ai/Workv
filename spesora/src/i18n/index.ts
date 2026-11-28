import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { useEffect, useState } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';
import { setFormatLocale } from '../core/domain/locale';
import { setUnitLabeler } from '../core/domain/quantity';
import { detectLanguage, formatLocaleFor, isSupported, SOURCE_LANGUAGE, type DeviceLocale, type LanguageCode } from './languages';
import { NAMESPACES, resources } from './resources';
import { loadLanguage, saveLanguage } from './storage';

/**
 * Localizzazione di Mina (i18next + react-i18next + expo-localization).
 *
 * - Testi: `src/i18n/locales/<lingua>/<namespace>.json`, chiavi piatte con il punto ("home.greeting").
 *   Variabili tra graffe singole: "Ciao {name}". Plurali con i suffissi di i18next ("_one", "_other").
 * - Nei componenti: `const { t } = useT();` e `t("home:hero.cook")`. Il namespace è prima dei due punti;
 *   senza namespace vale `common`. Il componente si ridisegna quando la lingua cambia.
 * - Fuori dai componenti (servizi, notifiche): `t(...)` importato da qui, letto nella lingua corrente.
 * - Contenuti (ricette, ingredienti): `src/i18n/content.ts`, con ritorno all'italiano dichiarato.
 */

function deviceLocales(): DeviceLocale[] {
  try {
    return getLocales().map((l) => ({ languageCode: l.languageCode, regionCode: l.regionCode, languageTag: l.languageTag }));
  } catch {
    return [];
  }
}

/** Istanza dell'app (registrata in react-i18next da `initReactI18next`). */
const i18next = createInstance();

const stored = loadLanguage();
const initial: LanguageCode = stored && isSupported(stored) ? stored : detectLanguage(deviceLocales());

void i18next.use(initReactI18next).init({
  resources: resources as never,
  lng: initial,
  // chiave mancante in una lingua: inglese, poi italiano (il test impedisce che succeda)
  fallbackLng: ['en', SOURCE_LANGUAGE],
  ns: [...NAMESPACES],
  defaultNS: 'common',
  keySeparator: false,
  nsSeparator: ':',
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  returnNull: false,
  initAsync: false,
  react: { useSuspense: false },
});
setFormatLocale(formatLocaleFor(initial, deviceLocales()));
setUnitLabeler((unit, count) => i18next.t(`unit.${unit}`, { count }) as string);

export const i18n = i18next;

/** Traduce nella lingua corrente. Nei componenti preferire `useT()`, che ridisegna al cambio di lingua. */
export function t(key: string, vars?: Record<string, string | number>): string {
  return i18next.t(key, vars as never) as unknown as string;
}

export function useT() {
  const { t: tt, i18n: inst } = useTranslation();
  return { t: tt as unknown as (key: string, vars?: Record<string, string | number>) => string, language: inst.language as LanguageCode };
}

export function currentLanguage(): LanguageCode {
  const l = i18next.language;
  return isSupported(l) ? l : SOURCE_LANGUAGE;
}

/** Lingua scelta esplicitamente dall'utente (salvata) o null se si sta usando quella rilevata. */
export function storedLanguage(): LanguageCode | null {
  const s = loadLanguage();
  return s && isSupported(s) ? s : null;
}

const listeners = new Set<(l: LanguageCode) => void>();

/** Cambia lingua, la salva sul telefono e aggiorna i formati regionali. Non tocca nessun altro dato. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  saveLanguage(code);
  setFormatLocale(formatLocaleFor(code, deviceLocales()));
  await i18next.changeLanguage(code);
  for (const fn of listeners) fn(code);
}

export function onLanguageChange(fn: (l: LanguageCode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Lingua corrente come stato React (ridisegna al cambio). */
export function useLanguage(): LanguageCode {
  const [lang, setLang] = useState<LanguageCode>(currentLanguage());
  useEffect(() => onLanguageChange(setLang), []);
  return lang;
}

/** Dove una stringa è un'etichetta definita a livello di modulo: getter valutato al momento dell'uso. */
export function lazyLabels<K extends string>(keys: readonly K[], keyOf: (k: K) => string): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of keys) Object.defineProperty(out, k, { enumerable: true, get: () => t(keyOf(k)) });
  return out;
}
