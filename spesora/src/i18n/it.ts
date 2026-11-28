/**
 * Compatibilità: i testi non stanno più qui ma in `locales/<lingua>/<namespace>.json` (vedi `src/i18n/index.ts`).
 * `t('tabs.today')` continua a funzionare e legge il namespace `common` nella lingua corrente.
 */
export { t } from './index';
export type StringKey = string;
