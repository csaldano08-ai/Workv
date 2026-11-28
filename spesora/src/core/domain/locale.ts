/**
 * Locale corrente per date, orari e numeri (es. "it-IT", "en-US", "de-DE").
 * Il dominio non conosce i18next: lo imposta `src/i18n` quando la lingua cambia. Predefinito italiano,
 * così i test del dominio restano indipendenti dall'interfaccia.
 */
let current = 'it-IT';

export function setFormatLocale(locale: string): void {
  current = locale;
}

export function formatLocale(): string {
  return current;
}
