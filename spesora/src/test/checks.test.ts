import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkConfig, checkSources, checkStrings } from '../../scripts/checks.mjs';
import { it as dictionary } from '../i18n/it';

const ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string): { path: string; content: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'test' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [{ path: relative(ROOT, full), content: readFileSync(full, 'utf8') }] : [];
  });
}

const files = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))];
const appJson = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

describe('Controlli di qualità', () => {
  it('le stringhe usate esistono nel dizionario italiano', () => {
    expect(checkStrings(files, dictionary).errors).toEqual([]);
  });

  it('il codice non contiene log, segnaposto o mock fuori posto', () => {
    expect(checkSources(files).errors).toEqual([]);
  });

  it('la configurazione di sviluppo è valida (gli avvisi di produzione non bloccano)', () => {
    const res = checkConfig(appJson, pkg, { release: false });
    expect(res.errors).toEqual([]);
  });

  it('rileva errori introdotti intenzionalmente', () => {
    expect(checkStrings([{ path: 'x.tsx', content: "t('chiave.inesistente')" }], dictionary).errors).toHaveLength(1);
    const src = checkSources([
      { path: 'app/x.tsx', content: "console.log(profile)\n// TODO sistemare\nconst u = 'https://example.com'\nnew MockPurchaseService()" },
    ]).errors;
    expect(src).toHaveLength(4);
    const prod = checkConfig({ expo: { ...appJson.expo, extra: { ...appJson.expo.extra, purchasesMode: 'mock' } } }, { dependencies: { firebase: '1' } }, { release: true });
    expect(prod.errors.some((e) => e.includes('mock'))).toBe(true);
    expect(prod.errors.some((e) => e.includes('firebase'))).toBe(true);
    expect(prod.errors.some((e) => e.includes('privacyPolicyUrl'))).toBe(true);
    const fakeUrl = checkConfig({ expo: { ...appJson.expo, extra: { legal: { privacyPolicyUrl: 'https://example.com/p' } } } }, pkg, { release: false });
    expect(fakeUrl.errors.some((e) => e.includes('non è un URL https reale'))).toBe(true);
    expect(checkConfig({ expo: { name: 'Spesora', plugins: [] } }, pkg, { release: false }).errors.length).toBeGreaterThan(0);
  });
});
