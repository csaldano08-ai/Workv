// Schermata «Spesa» dell'app VERA (esportazione web in spesora/dist), con il numero di persone scelto nell'onboarding.
//   node capture_spesa.cjs <url> <persone> <out.png>
const { chromium } = require('playwright');
(async () => {
  const [url, persone, out, data] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  p.on('dialog', (d) => d.accept());
  const w = (ms) => p.waitForTimeout(ms);
  if (data) {
    // data simulata: l'orologio della pagina scorre normalmente ma è spostato di un intervallo fisso
    const delta = new Date(data).getTime() - Date.now();
    await p.addInitScript((d) => {
      const R = Date;
      class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + d); else super(...a); } static now() { return R.now() + d; } }
      // eslint-disable-next-line no-global-assign
      Date = D;
    }, delta);
  }
  await p.goto(url);
  await w(9000);
  let scelto = false;
  for (let step = 0; step < 60 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (!scelto && (await p.getByText('Quante persone mangeranno').count())) {
      const chip = p.getByText(persone, { exact: true }).filter({ visible: true }).first();
      if (await chip.count()) { await chip.click(); scelto = true; await w(400); }
    }
    for (const t of ['Inizia', 'Salta', 'Continua', 'Avanti']) {
      const el = p.getByRole('button', { name: new RegExp('^' + t, 'i') }).first();
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) { await el.click(); break; }
    }
    await w(350);
    if (await p.getByText('Preparo la tua settimana').count()) await w(3500);
  }
  console.log('persone scelte:', scelto);
  await w(800);
  await p.getByRole('button', { name: /Inizia la settimana/ }).click();
  await w(2500);
  await p.getByRole('tab', { name: /Spesa/ }).first().click();
  await w(1800);
  await p.screenshot({ path: out });
  for (const cat of ['Frutta e verdura', 'Dispensa', 'Latticini', 'Carne', 'Pesce']) {
    const h = p.getByText(cat, { exact: true }).filter({ visible: true }).first();
    if (await h.count()) { await h.click().catch(() => {}); await w(300); }
  }
  const txt = await p.evaluate(() => document.body.innerText);
  const L = txt.split('\n');
  const hit = [];
  L.forEach((l, i) => { if (/^cipolla|^cipolle/i.test(l.trim())) hit.push(l.trim() + ' ' + (L[i + 1] || '').trim() + ' ' + (L[i + 2] || '').trim()); });
  console.log('CIPOLLE:', hit.join(' | ') || 'nessuna');
  await p.screenshot({ path: out.replace('.png', '_esteso.png'), fullPage: true });
  await b.close();
})();
