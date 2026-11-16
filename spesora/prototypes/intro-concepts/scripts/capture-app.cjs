// Cattura la Home e la Settimana REALI della demo web di Spesora a 1080×1920 (viewport 360×640 @3x).
// Uso: node capture-app.cjs <url-della-demo> <cartella-di-uscita>
const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  p.on('dialog', (d) => d.accept());
  await p.goto(url); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/benvenuto.png` });
  for (let step = 0; step < 40 && !(await p.getByText('OGGI', { exact: true }).count()); step++) {
    for (const t of ['Inizia', 'Salta', 'Continua', 'Avanti', 'Crea', 'Fine', 'Conferma']) {
      const el = p.getByRole('button', { name: new RegExp('^' + t, 'i') }).first();
      if (await el.count() && await el.isEnabled().catch(() => false)) { await el.click(); break; }
    }
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${out}/home.png` });
  await p.getByRole('tab', { name: /Settimana/ }).click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/settimana.png` });
  await b.close();
})();
