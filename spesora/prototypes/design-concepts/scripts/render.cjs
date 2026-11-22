/* Rende le 12 anteprime (out/previews/concept-X_home|week|shop.png, 780×1688) dalle pagine dei concept. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = path.resolve(__dirname, '../out/previews');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1900, height: 940 }, deviceScaleFactor: 2 });
  for (const k of (process.argv[2] || 'ABCDE').split('')) {
    await p.goto('file://' + path.resolve(__dirname, `../src/concept-${k}.html`));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    for (const s of ['home', 'week', 'weekgrid', 'shop']) if (await p.locator('#' + s).count()) await p.locator('#' + s).screenshot({ path: path.join(out, `concept-${k}_${s}.png`) });
  }
  await b.close();
})();
