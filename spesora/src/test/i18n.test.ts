import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectLanguage, formatLocaleFor, LANGUAGE_CODES, PLANNED, SUPPORTED } from '../i18n/languages';

const ROOT = join(__dirname, '..', '..');
const LOC = join(ROOT, 'src', 'i18n', 'locales');
const read = (lang: string, ns: string): Record<string, string> => JSON.parse(readFileSync(join(LOC, lang, `${ns}.json`), 'utf8'));
const namespaces = readdirSync(join(LOC, 'it')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
/** chiave senza suffisso di plurale: le lingue hanno forme plurali diverse (it/en: one, other; fr/es/pt: anche many) */
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

describe('Localizzazione: sei lingue complete', () => {
  it('ogni lingua attiva ha tutti i namespace e solo le lingue attive hanno file', () => {
    expect(readdirSync(LOC).sort()).toEqual([...LANGUAGE_CODES].sort());
    for (const l of LANGUAGE_CODES) expect(readdirSync(join(LOC, l)).filter((f) => f.endsWith('.json')).sort(), l).toEqual(namespaces.map((n) => `${n}.json`).sort());
    // le lingue future non sono attive né hanno traduzioni parziali
    for (const p of PLANNED) expect(LANGUAGE_CODES as readonly string[]).not.toContain(p.code);
  });

  it('stesse chiavi in tutte le lingue, nessuna stringa vuota, stesse variabili', () => {
    const problems: string[] = [];
    for (const ns of namespaces) {
      const it = read('it', ns);
      const itBase = new Set(Object.keys(it).map(base));
      for (const l of LANGUAGE_CODES) {
        const d = read(l, ns);
        const dBase = new Set(Object.keys(d).map(base));
        for (const k of itBase) if (!dBase.has(k)) problems.push(`${l}/${ns}: manca "${k}"`);
        for (const k of dBase) if (!itBase.has(k)) problems.push(`${l}/${ns}: chiave in più "${k}"`);
        for (const [k, v] of Object.entries(d)) {
          if (typeof v !== 'string' || !v.trim()) problems.push(`${l}/${ns}: "${k}" vuota`);
          const ref = it[k] ?? it[`${base(k)}_other`] ?? it[base(k)];
          if (ref !== undefined && vars(ref) !== vars(v) && !(vars(v) === '' && /_one$/.test(k))) problems.push(`${l}/${ns}: "${k}" variabili {${vars(v)}} invece di {${vars(ref)}}`);
          if (/\{\{|\}\}/.test(v)) problems.push(`${l}/${ns}: "${k}" usa graffe doppie`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('le traduzioni non sono copie dell’italiano (salvo nomi propri e simboli)', () => {
    const it = Object.assign({}, ...namespaces.map((ns) => Object.fromEntries(Object.entries(read('it', ns)).map(([k, v]) => [`${ns}:${k}`, v]))));
    for (const l of LANGUAGE_CODES.filter((c) => c !== 'it')) {
      const d = Object.assign({}, ...namespaces.map((ns) => Object.fromEntries(Object.entries(read(l, ns)).map(([k, v]) => [`${ns}:${k}`, v]))));
      const long = Object.keys(it).filter((k) => it[k].split(' ').length >= 4 && k in d);
      const same = long.filter((k) => d[k] === it[k]);
      // frasi di almeno 4 parole identiche all'italiano = non tradotte
      expect(same, l).toEqual([]);
    }
  });

  it('nessun testo italiano scritto direttamente nei componenti delle schermate tradotte', () => {
    // frasi italiane tra > e < (testo JSX) nei file già convertiti: devono passare da t()
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? n !== 'test' && walk(join(d, n)) : /\.tsx$/.test(n) && files.push(join(d, n))));
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'src'));
    const bad: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/>\s*([A-ZÀ-Úa-zà-ú][^<>{}\n]*\b(il|la|le|di|che|per|non|una|del|della|con|sono|tuo|tua|ricette|spesa|oggi)\b[^<>{}\n]*)</g)) bad.push(`${relative(ROOT, f)}: "${m[1].trim().slice(0, 60)}"`);
    }
    expect(bad).toEqual([]);
  });
});

describe('Scelta iniziale della lingua', () => {
  const loc = (languageTag: string) => {
    const [lang, region] = languageTag.split('-');
    return { languageCode: lang, regionCode: region ?? null, languageTag };
  };
  it('usa la prima lingua supportata del telefono, altrimenti l’inglese', () => {
    expect(detectLanguage([loc('de-AT')])).toBe('de');
    expect(detectLanguage([loc('fr-CA')])).toBe('fr');
    expect(detectLanguage([loc('ja-JP'), loc('es-MX')])).toBe('es');
    expect(detectLanguage([loc('ja-JP')])).toBe('en');
    expect(detectLanguage([])).toBe('en');
    expect(detectLanguage([loc('it-CH')])).toBe('it');
  });
  it('il portoghese vale solo per il Brasile: il portoghese europeo è una lingua futura', () => {
    expect(detectLanguage([loc('pt-BR')])).toBe('pt-BR');
    expect(detectLanguage([loc('pt-PT')])).toBe('en');
    expect(detectLanguage([loc('pt-PT'), loc('fr-FR')])).toBe('fr');
  });
  it('lingua e paese restano separati: formati della regione del telefono solo se la lingua coincide', () => {
    expect(formatLocaleFor('en', [loc('en-US')])).toBe('en-US');
    expect(formatLocaleFor('en', [loc('it-IT')])).toBe('en-GB');
    expect(formatLocaleFor('de', [loc('de-CH')])).toBe('de-CH');
    expect(formatLocaleFor('pt-BR', [loc('pt-PT')])).toBe('pt-BR');
    expect(SUPPORTED.every((l) => l.dir === 'ltr')).toBe(true);
  });
});
