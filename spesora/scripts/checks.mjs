// @ts-check
/**
 * Controlli di qualità usati da `npm run verify` e `npm run check:release`.
 * Funzioni pure: ricevono contenuti, restituiscono errori e avvisi (testate in src/test/checks.test.ts).
 */

const FORBIDDEN_DEPENDENCIES = [
  'firebase',
  '@react-native-firebase/app',
  '@supabase/supabase-js',
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  'react-native-google-mobile-ads',
  '@segment/analytics-react-native',
  'mixpanel-react-native',
  '@amplitude/analytics-react-native',
];

/**
 * @param {any} appJson contenuto di app.json
 * @param {any} packageJson contenuto di package.json
 * @param {{ release: boolean }} options
 */
export function checkConfig(appJson, packageJson, { release }) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  const releaseIssue = (/** @type {string} */ msg) => (release ? errors : warnings).push(msg);
  const expo = appJson?.expo;
  if (!expo) return { errors: ['app.json: manca la chiave "expo"'], warnings };

  if (expo.name !== 'Spesora') warnings.push('app.json: nome app diverso da "Spesora"');
  if (!expo.scheme) errors.push('app.json: manca "scheme" (necessario per i link interni delle notifiche)');
  const plugins = (expo.plugins ?? []).map((/** @type {any} */ p) => (Array.isArray(p) ? p[0] : p));
  for (const required of ['expo-router', 'expo-sqlite', 'expo-notifications']) {
    if (!plugins.includes(required)) errors.push(`app.json: plugin mancante ${required}`);
  }
  const extra = expo.extra ?? {};
  if (extra.purchasesMode === 'mock') releaseIssue('Acquisti in modalità "mock": non consentita in produzione');
  if (!['disabled', 'mock', 'revenuecat'].includes(extra.purchasesMode ?? 'disabled')) errors.push(`purchasesMode non valido: ${extra.purchasesMode}`);
  if (extra.purchasesMode === 'revenuecat' && !packageJson?.dependencies?.['react-native-purchases']) {
    errors.push('purchasesMode "revenuecat" senza dipendenza react-native-purchases');
  }
  const legal = extra.legal ?? {};
  for (const key of ['privacyPolicyUrl', 'termsUrl', 'supportUrl']) {
    const value = legal[key];
    if (!value) releaseIssue(`Configurazione mancante: extra.legal.${key} (URL reale da pubblicare)`);
    else if (!/^https:\/\//.test(value) || /example\.(com|org)|localhost/.test(value)) errors.push(`extra.legal.${key} non è un URL https reale: ${value}`);
  }
  if (!legal.supportEmail) releaseIssue('Configurazione mancante: extra.legal.supportEmail');
  if (!expo.ios?.bundleIdentifier) releaseIssue('Configurazione mancante: ios.bundleIdentifier (da registrare su App Store Connect)');
  if (!expo.extra?.eas?.projectId) releaseIssue('Configurazione mancante: extra.eas.projectId (eseguire "eas init")');

  const deps = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
  for (const dep of FORBIDDEN_DEPENDENCIES) {
    if (deps[dep]) errors.push(`Dipendenza non ammessa nella prima versione (cloud/AI/analytics/pubblicità): ${dep}`);
  }
  return { errors, warnings };
}

const SOURCE_RULES = [
  { re: /\bconsole\.log\(/, msg: 'console.log nel codice dell’app (rischio di dati utente nei log)' },
  { re: /lorem ipsum/i, msg: 'testo segnaposto "lorem ipsum"' },
  { re: /\b(TODO|FIXME|XXX)\b/, msg: 'TODO/FIXME non risolto' },
  { re: /example\.(com|org)/, msg: 'URL o email di esempio' },
  { re: /placeholder_|PLACEHOLDER/, msg: 'valore segnaposto' },
  { re: /new MockPurchaseService\(/, msg: 'MockPurchaseService istanziato fuori dalla factory', allow: /src\/core\/purchases\/services\.ts$/ },
  { re: /\b(openai|anthropic|gemini)\b/i, msg: 'riferimento a servizi di AI generativa', allow: /\.test\.ts$/ },
];

/**
 * @param {{ path: string, content: string }[]} files
 */
export function checkSources(files) {
  /** @type {string[]} */ const errors = [];
  for (const f of files) {
    const lines = f.content.split('\n');
    lines.forEach((line, i) => {
      for (const rule of SOURCE_RULES) {
        if (rule.allow && rule.allow.test(f.path.replace(/\\/g, '/'))) continue;
        if (rule.re.test(line)) errors.push(`${f.path}:${i + 1} ${rule.msg}`);
      }
    });
  }
  return { errors };
}

/**
 * Verifica che ogni chiave usata con t('...') esista nel dizionario italiano e non sia vuota.
 * @param {{ path: string, content: string }[]} files
 * @param {Record<string, string>} dictionary
 */
export function checkStrings(files, dictionary) {
  /** @type {string[]} */ const errors = [];
  const re = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
  for (const f of files) {
    for (const m of f.content.matchAll(re)) {
      if (!(m[1] in dictionary)) errors.push(`${f.path}: chiave di traduzione mancante "${m[1]}"`);
    }
  }
  for (const [k, v] of Object.entries(dictionary)) if (!v || !String(v).trim()) errors.push(`Stringa vuota: ${k}`);
  return { errors };
}
