/**
 * Lingue di Mina.
 *
 * - `SUPPORTED`: lingue attive, con interfaccia tradotta per intero (verificato da `src/test/i18n.test.ts`).
 * - `PLANNED`: lingue previste ma NON attive. Non hanno traduzioni e non compaiono nella scelta della lingua.
 *   Per attivarne una servono: i file in `locales/<codice>/`, la voce in `SUPPORTED` e, per l'arabo (RTL),
 *   un layout adattato e verificato su telefono (`I18nManager.forceRTL`, icone e frecce speculari).
 *
 * La lingua dell'interfaccia è separata dal paese: date e numeri usano la regione del telefono quando la lingua
 * coincide (es. inglese + Stati Uniti → date all'americana), altrimenti la regione predefinita della lingua.
 * Il paese di distribuzione si decide negli store, non qui.
 */

export type LanguageCode = 'it' | 'en' | 'es' | 'de' | 'fr' | 'pt-BR';

export interface LanguageInfo {
  code: LanguageCode;
  /** Nome della lingua nella lingua stessa (così chiunque riconosce la propria). */
  nativeName: string;
  /** Regione predefinita per date e numeri quando quella del telefono non corrisponde. */
  defaultLocale: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED: readonly LanguageInfo[] = [
  { code: 'it', nativeName: 'Italiano', defaultLocale: 'it-IT', dir: 'ltr' },
  { code: 'en', nativeName: 'English', defaultLocale: 'en-GB', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', defaultLocale: 'es-ES', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', defaultLocale: 'de-DE', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', defaultLocale: 'fr-FR', dir: 'ltr' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', defaultLocale: 'pt-BR', dir: 'ltr' },
] as const;

/** Previste, non attive: nessuna traduzione, non selezionabili. */
export const PLANNED = [
  { code: 'ja', dir: 'ltr' },
  { code: 'ko', dir: 'ltr' },
  { code: 'zh-Hans', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'id', dir: 'ltr' },
  { code: 'hi', dir: 'ltr' },
  { code: 'pt-PT', dir: 'ltr' },
] as const;

export const FALLBACK_LANGUAGE: LanguageCode = 'en';
/** Lingua in cui sono scritti i contenuti originali (ricette, ingredienti). */
export const SOURCE_LANGUAGE: LanguageCode = 'it';

export const LANGUAGE_CODES = SUPPORTED.map((l) => l.code);

export function isSupported(code: string): code is LanguageCode {
  return (LANGUAGE_CODES as string[]).includes(code);
}

export function languageInfo(code: LanguageCode): LanguageInfo {
  return SUPPORTED.find((l) => l.code === code) ?? SUPPORTED[0];
}

/** Lingua del telefono, come la fornisce expo-localization (`getLocales()`), in ordine di preferenza. */
export interface DeviceLocale {
  languageCode: string | null;
  regionCode: string | null;
  languageTag: string;
}

/**
 * Lingua iniziale dalle preferenze del telefono: la prima supportata nell'ordine dell'utente, altrimenti l'inglese.
 * Il portoghese vale solo per il Brasile (o senza regione): il portoghese europeo è una lingua futura a sé.
 */
export function detectLanguage(locales: readonly DeviceLocale[]): LanguageCode {
  for (const l of locales) {
    const lang = (l.languageCode ?? l.languageTag.split(/[-_]/)[0] ?? '').toLowerCase();
    const region = (l.regionCode ?? '').toUpperCase();
    if (lang === 'pt') {
      if (region === 'BR' || region === '') return 'pt-BR';
      continue;
    }
    if (isSupported(lang)) return lang;
  }
  return FALLBACK_LANGUAGE;
}

/**
 * Locale per date, orari e numeri: lingua scelta + regione del telefono se la lingua coincide,
 * altrimenti la regione predefinita della lingua (es. app in tedesco su telefono italiano → de-DE).
 */
export function formatLocaleFor(lang: LanguageCode, device: readonly DeviceLocale[]): string {
  const base = lang === 'pt-BR' ? 'pt' : lang;
  const match = device.find((d) => (d.languageCode ?? '').toLowerCase() === base && d.regionCode);
  if (match && !(lang === 'pt-BR' && match.regionCode !== 'BR')) return `${base}-${match.regionCode}`;
  return languageInfo(lang).defaultLocale;
}
