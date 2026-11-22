/*
 * Cattura dalle schermate REALI della demo web di Spesora (nessuna interfaccia inventata) per le scene del telefono.
 *   node capture_ui.cjs <url> <cartella-output>
 */
const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  p.on('dialog', (d) => d.accept());
  const w = (ms) => p.waitForTimeout(ms);
  const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
  await p.goto(url);
  await w(9000);
  for (let step = 0; step < 40 && !(await p.getByText('La tua prima settimana').count()); step++) {
    for (const t of ['Inizia', 'Salta', 'Continua', 'Avanti']) {
      const el = p.getByRole('button', { name: new RegExp('^' + t, 'i') }).first();
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) { await el.click(); break; }
    }
    await w(350);
    if (await p.getByText('Preparo la tua settimana').count()) await w(3500);
  }
  await w(800);
  await p.getByRole('button', { name: /Inizia la settimana/ }).click();
  await w(2500);
  await shot('ui_oggi');
  await p.getByRole('tab', { name: /Settimana/ }).first().click();
  await w(1400);
  await shot('ui_settimana');
  await p.getByRole('tab', { name: /Oggi/ }).first().click();
  await w(1200);
  await p.getByRole('button', { name: /^Cucina$/ }).first().click();
  await w(1800);
  await shot('ui_ricetta');
  await p.mouse.move(195, 500); await p.mouse.wheel(0, 520); await w(900);
  await shot('ui_ricetta_ingredienti');
  await p.goBack(); await w(900);
  await p.getByRole('tab', { name: /Spesa/ }).first().click();
  await w(1400);
  await shot('ui_spesa');
  await b.close();
})();
