/*
 * Schermate MINA dalla demo web REALE: primo avvio (intro), benvenuto (3 pagine), questionario completo con le
 * risposte predefinite, caricamento, anteprima, abbonamento, poi tutte le schede, una ricetta, la Modalità Cucina,
 * il Profilo, i preferiti, la privacy.
 *   node scripts/screenshots/capture-mina.cjs <url-base> <cartella> [larghezza] [altezza]
 * Con RIDUCI=1 la pagina simula «Riduci movimento» (prefers-reduced-motion).
 * Data fissa (lunedì 23 novembre 2026, ore 9) per avere sempre lo stesso piano.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA = '2026-11-23T09:00:00';

(async () => {
  const [base, outDir, w = '390', h = '844'] = process.argv.slice(2);
  const root = base.replace(/\/$/, '');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2, reducedMotion: process.env.RIDUCI ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const delta = new Date(DATA).getTime() - Date.now();
  await p.addInitScript((d) => {
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
  }, delta);
  const wait = (ms) => p.waitForTimeout(ms);
  const btn = (re) => p.getByRole('button', { name: re }).filter({ visible: true }).first();
  const tab = (re) => p.getByRole('tab', { name: re }).filter({ visible: true }).first();
  // Controllo dei riferimenti url(#id) nel documento: ogni id deve esistere UNA volta sola e in una parte visibile.
  // Un id ripetuto (più Mina o più loghi nella stessa pagina, schede precaricate) fa puntare tutti i riempimenti al
  // primo elemento del documento: se è nascosto il riempimento sparisce e la figura resta trasparente.
  const auditIds = (name) =>
    p.evaluate(() => {
      const ids = new Map();
      for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) ?? []).concat(el));
      const problems = [];
      const visible = (svg) => {
        const r = svg?.getBoundingClientRect();
        return !!r && r.width > 0 && r.height > 0;
      };
      // per ogni id: i riferimenti url(#id) e se almeno uno sta in un <svg> visibile
      const refs = new Map();
      for (const el of document.querySelectorAll('svg *')) {
        for (const a of ['fill', 'stroke', 'clip-path', 'mask', 'filter']) {
          const m = /url\(#([^)]+)\)/.exec(el.getAttribute(a) ?? '');
          if (m) refs.set(m[1], (refs.get(m[1]) ?? false) || visible(el.ownerSVGElement));
        }
      }
      for (const [id, usedVisible] of refs) {
        const els = ids.get(id) ?? [];
        if (els.length === 0) problems.push(`#${id}: nessun elemento`);
        else if (els.length > 1) problems.push(`#${id}: id ripetuto ${els.length} volte`);
        else if (usedVisible && !visible(els[0].ownerSVGElement)) problems.push(`#${id}: usato da una figura visibile ma definito in una parte nascosta`);
      }
      return problems;
    }).then((problems) => {
      for (const q of problems) errors.push(`[${name}] ${q}`);
    });
  const shot = async (name, full = false) => {
    await auditIds(name);
    await p.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: full });
    process.stdout.write(`${name}\n`);
  };

  // primo avvio: intro, poi il benvenuto
  await p.goto(root + '/');
  await wait(5800);
  await shot('01_benvenuto');
  await btn(/^Inizia/).click();
  await wait(1500);
  await shot('02_benvenuto_chef');
  await btn(/^Continua/).click();
  await wait(1500);
  await shot('02b_benvenuto_spesa');
  await btn(/^Continua/).click();
  await wait(1600);
  // domanda 1: persone (cerchi numerati)
  await p.getByRole('radio', { name: /^2 persone/ }).first().click();
  await wait(1500);
  await shot('04_persone');
  await btn(/^Avanti/).click();
  await wait(1700);
  await shot('03_pasti');
  // tutte le altre domande con le risposte predefinite
  for (let i = 0; i < 40; i++) {
    if (await p.getByText('Ecco un’anteprima del tuo piano.').count()) break;
    // passo «Cosa hai già in casa?»: qualche prodotto in dispensa, così la Dispensa non è vuota
    if (await p.getByText('Cosa hai già in casa?').count()) {
      const chips = p.getByRole('checkbox').filter({ visible: true });
      for (let k = 0; k < Math.min(5, await chips.count()); k++) await chips.nth(k).click().catch(() => {});
      await wait(400);
    }
    const next = btn(/^(Avanti|Salta|Continua)/);
    if (!(await next.count())) break;
    await next.click();
    await wait(450);
    if (await p.getByText(/Preparo la tua settimana/).count()) {
      await wait(700);
      await shot('04b_caricamento');
      await wait(3200);
    }
  }
  await wait(1800);
  await shot('05_anteprima');
  await btn(/^Procedi/).click();
  await wait(2600);
  await shot('06_abbonamento');
  await btn(/^Continua/).click();
  await wait(4200);
  await shot('07_oggi');
  await shot('07_oggi_intera', true);
  await tab(/Settimana/).click();
  await wait(2600);
  await shot('08_settimana');
  await shot('08_settimana_intera', true);
  await tab(/Spesa/).click();
  await wait(2600);
  await shot('09_spesa');
  await shot('09_spesa_intera', true);
  await tab(/Dispensa/).click();
  await wait(2600);
  await shot('10_dispensa');
  await tab(/Ricette/).click();
  await wait(4200);
  await shot('11_ricette');
  // una ricetta dalla griglia
  const card = p.getByRole('button', { name: /minuti/ }).filter({ visible: true }).first();
  await card.click();
  await wait(2600);
  await shot('12_ricetta');
  await shot('12_ricetta_intera', true);
  await btn(/Inizia a cucinare/).click().catch(() => {});
  await wait(2600);
  await shot('12b_cucina');
  // profilo: dall'ingranaggio in Oggi
  await p.goto(root + '/');
  await wait(3000);
  await btn(/^Profilo/).click().catch(() => {});
  await wait(2200);
  await shot('13_profilo');
  await shot('13_profilo_intera', true);
  fs.writeFileSync(path.join(outDir, 'errori.txt'), errors.join('\n'));
  await b.close();
})();
