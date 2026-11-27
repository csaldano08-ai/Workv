/*
 * Fotogrammi di Mina dalla demo web REALE, ritagliati esattamente sul suo riquadro (per i confronti a pari scala).
 *   node scripts/screenshots/capture-mina-frames.cjs <url> <prefisso-out> <ms1> [ms2 ...]
 * Apre prima la radice e salta l'intro, poi l'URL; salva <prefisso>_<ms>.png ai tempi indicati (ms dal caricamento).
 */
const { chromium } = require('playwright');

(async () => {
  const [url, prefix, ...times] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
  const root = new URL(url).origin;
  await p.goto(root + '/');
  await p.waitForTimeout(1500);
  await p.mouse.click(195, 380);
  await p.waitForTimeout(800);
  await p.goto(url);
  const t0 = Date.now();
  const mina = p.getByRole('img', { name: /^Mina:/ }).first();
  await mina.waitFor();
  for (const ms of times.map(Number).sort((a, c) => a - c)) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    const box = await mina.boundingBox();
    await p.screenshot({ path: `${prefix}_${ms}.png`, clip: box });
    process.stdout.write(`${prefix}_${ms}.png\n`);
  }
  await b.close();
})();
