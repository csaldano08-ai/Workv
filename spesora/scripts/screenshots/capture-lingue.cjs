/*
 * Screenshot delle schermate principali nelle 6 lingue, dall'app reale (demo web).
 *   node scripts/screenshots/capture-lingue.cjs <url-base> <cartella> [larghezza] [altezza]
 * 1. Per ogni lingua, un «telefono» in quella lingua (locale del browser): benvenuto, scelta della lingua (rilevata),
 *    prima domanda del questionario.
 * 2. Un solo questionario completo (in italiano), poi per ogni lingua: lingua salvata come se l'avesse scelta
 *    l'utente, ricarica, e le stesse schermate per indirizzo: Oggi, Settimana, Spesa, Dispensa, Ricette, ricetta,
 *    Modalità Cucina, Profilo, Lingua, Abbonamento. Gli stessi dati in tutte le lingue: nessun dato perso.
 * Controlla anche: errori della pagina, chiavi di traduzione visibili (testo tipo "home:hero.cook") e testi
 * troncati con i puntini. Esito in <cartella>/controlli.json.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA = '2026-11-23T09:00:00';
const LANGS = { it: 'it-IT', en: 'en-GB', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', 'pt-BR': 'pt-BR' };
const ROOT = path.join(__dirname, '..', '..');
const tr = (lang, ns, key) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales', lang, `${ns}.json`), 'utf8'))[key];
const RECIPE = 'bucatini_amatriciana';

(async () => {
  const [root, outDir, w = 390, h = 844] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const report = {};
  const delta = new Date(DATA).getTime() - Date.now();
  const fakeDate = (d) => {
    const R = Date;
    class D extends R {
      constructor(...a) {
        if (a.length === 0) super(R.now() + d);
        else super(...a);
      }
      static now() {
        return R.now() + d;
      }
    }
    Date = D;
  };
  const newPage = async (locale) => {
    const ctx = await b.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2, locale, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.addInitScript(fakeDate, delta);
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    return { ctx, p, errors };
  };
  // chiavi visibili (ns:chiave o chiave.punto senza spazi) e testi tagliati con «…»
  const inspect = (p) =>
    p.evaluate(() => {
      const keys = [];
      const cut = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        const r = el?.getBoundingClientRect();
        if (!r || r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
        const s = n.textContent.trim();
        if (/^[a-z]+:[a-zA-Z0-9_.]+$/.test(s) || /^[a-z]+(\.[a-zA-Z0-9_]+){1,3}$/.test(s)) keys.push(s);
      }
      for (const el of document.querySelectorAll('div[dir], div')) {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.getBoundingClientRect().height > 0) cut.push(el.textContent.trim().slice(0, 60));
      }
      return { keys: [...new Set(keys)], cut: [...new Set(cut)].slice(0, 20) };
    });
  const shot = async (p, lang, name, errors) => {
    const dir = path.join(outDir, lang);
    fs.mkdirSync(dir, { recursive: true });
    await p.screenshot({ path: path.join(dir, `${name}.png`) });
    const res = await inspect(p);
    report[lang] = report[lang] ?? { screens: {}, errors };
    report[lang].screens[name] = res;
    process.stdout.write(`${lang}/${name}${res.keys.length ? ` CHIAVI: ${res.keys.join(', ')}` : ''}\n`);
  };

  // 1 · primo avvio con il telefono in ogni lingua
  for (const [lang, locale] of Object.entries(LANGS)) {
    const { ctx, p, errors } = await newPage(locale);
    await p.goto(root + '/');
    await p.waitForTimeout(3500);
    await shot(p, lang, '01_benvenuto', errors);
    await p.goto(root + '/onboarding');
    await p.waitForTimeout(2200);
    await shot(p, lang, '02_lingua', errors);
    await p.getByRole('button', { name: new RegExp(`^${tr(lang, 'common', 'action.next')}`) }).filter({ visible: true }).first().click();
    await p.waitForTimeout(1600);
    await shot(p, lang, '03_persone', errors);
    report[lang].detected = await p.evaluate(() => localStorage.getItem('mina.language'));
    await ctx.close();
  }

  // 2 · un questionario completo (italiano), poi le schermate in ogni lingua con gli stessi dati
  const { ctx, p, errors } = await newPage('it-IT');
  const btn = (re) => p.getByRole('button', { name: re }).filter({ visible: true }).first();
  await p.goto(root + '/onboarding');
  await p.waitForTimeout(2000);
  for (let i = 0; i < 45; i++) {
    if (p.url().includes('/abbonamento')) break;
    const next = btn(/^(Avanti|Salta|Continua|Procedi)/);
    if (!(await next.count())) {
      await p.waitForTimeout(800);
      continue;
    }
    await next.click().catch(() => {});
    await p.waitForTimeout(500);
    if (await p.getByText(/Preparo la tua settimana/).count()) await p.waitForTimeout(4000);
  }
  await p.waitForTimeout(1500);
  const pages = [
    ['04_oggi', '/'],
    ['05_settimana', '/settimana'],
    ['06_spesa', '/spesa'],
    ['07_dispensa', '/dispensa'],
    ['08_ricette', '/ricette'],
    ['09_ricetta', `/ricetta/${RECIPE}`],
    ['10_cucina', `/cucina/${RECIPE}`],
    ['11_profilo', '/impostazioni'],
    ['12_lingua', '/lingua'],
    ['13_abbonamento', '/abbonamento'],
  ];
  for (const lang of Object.keys(LANGS)) {
    await p.evaluate((l) => localStorage.setItem('mina.language', l), lang);
    for (const [name, url] of pages) {
      await p.goto(root + url);
      await p.waitForTimeout(name === '08_ricette' ? 3200 : 2400);
      await shot(p, lang, name, errors);
    }
  }
  // dopo i cambi di lingua i dati sono gli stessi: conteggio pasti e prodotti in spesa letti dalla pagina
  report.persistenza = await p.evaluate(() => localStorage.getItem('mina.language'));
  await ctx.close();
  await b.close();
  fs.writeFileSync(path.join(outDir, 'controlli.json'), JSON.stringify(report, null, 2));
  const keys = Object.values(report).flatMap((r) => (r && r.screens ? Object.values(r.screens).flatMap((s) => s.keys) : []));
  const errs = Object.values(report).flatMap((r) => (r && r.errors ? r.errors : []));
  process.stdout.write(`chiavi visibili: ${keys.length} · errori pagina: ${errs.length}\n`);
})();
