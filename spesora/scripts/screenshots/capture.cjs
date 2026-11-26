/*
 * Fotografa le schermate principali della demo web REALE di Spesora (esportazione `npx expo export -p web`).
 * Stesso percorso per il «prima» e il «dopo» del restyling, con data fissa: le schermate sono confrontabili.
 *   node scripts/screenshots/capture.cjs <url> <cartella-out> [larghezza] [altezza]
 * Scrive <cartella-out>/NN_nome.png e <cartella-out>/errori.json (errori JavaScript della pagina).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA = '2026-11-23T09:00:00'; // lunedì mattina

(async () => {
  const [url, out, W = '390', H = '844'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('dialog', (d) => d.accept());
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
  const w = (ms) => p.waitForTimeout(ms);
  let n = 0;
  const shot = async (name, full = false) => {
    n += 1;
    await p.screenshot({ path: path.join(out, `${String(n).padStart(2, '0')}_${name}.png`), fullPage: full });
  };
  const btn = (re) => p.getByRole('button', { name: re }).filter({ visible: true }).first();
  const tab = async (re) => {
    await p.getByRole('tab', { name: re }).first().click();
    await w(1600);
  };

  await p.goto(url);
  await w(2600);
  await shot('intro');
  await w(6000);
  await shot('benvenuto');
  await btn(/^Inizia/).click();
  await w(1200);
  await shot('questionario_1');
  let shotMid = false;
  for (let step = 0; step < 50 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (!shotMid && step === 3) {
      await shot('questionario_scelta');
      shotMid = true;
    }
    let clicked = false;
    for (const t of ['Avanti', 'Salta', 'Continua']) {
      const el = btn(new RegExp('^' + t, 'i'));
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) {
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
    await w(450);
    if (await p.getByText(/Preparo la tua settimana/).count()) {
      await w(900);
      await shot('caricamento');
      await w(3200);
    }
  }
  await w(1500);
  await shot('fine_questionario');
  await btn(/Inizia la settimana/).click();
  await w(3000);
  await shot('home');
  await shot('home_intera', true);
  await btn(/^Cucina$/).click();
  await w(2200);
  await shot('ricetta');
  await shot('ricetta_intera', true);
  await p.goBack();
  await w(1200);
  await tab(/Settimana/);
  await shot('settimana');
  await tab(/Ricette/);
  await shot('ricette');
  await tab(/Spesa/);
  await shot('spesa');
  const boxes = p.getByRole('checkbox');
  const k = await boxes.count();
  for (let i = 0; i < k; i++) {
    const bx = boxes.nth(i);
    await bx.scrollIntoViewIfNeeded().catch(() => {});
    await bx.click().catch(() => {});
    await w(120);
  }
  await w(1600);
  await p.mouse.wheel(0, -4000);
  await w(600);
  await shot('spesa_completata');
  await tab(/Dispensa/);
  await shot('dispensa');
  await p.goto(url.replace(/\/$/, '') + '/impostazioni');
  await w(3500);
  await shot('impostazioni');
  await p.goto(url.replace(/\/$/, '') + '/notifiche');
  await w(2500);
  await shot('notifiche');
  fs.writeFileSync(path.join(out, 'errori.json'), JSON.stringify(errs, null, 2));
  await b.close();
  process.stdout.write(`${n} schermate, ${errs.length} errori JS\n`);
})();
