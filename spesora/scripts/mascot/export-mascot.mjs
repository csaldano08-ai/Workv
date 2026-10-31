// Esporta le pose di Timo in PNG con vera trasparenza (canale alfa), a partire dalla
// stessa sorgente vettoriale usata dall'app. Richiede Node ≥ 22.18 e Playwright.
//   node scripts/mascot/export-mascot.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TIMO_POSES, timoBadgeSvg, timoSvg } from '../../src/ui/mascot/timoSvg.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = fileURLToPath(new URL('../../assets/mascot/', import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
async function render(svg, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`);
  await page.screenshot({ path: out + file, omitBackground: true });
  await page.close();
}
for (const pose of TIMO_POSES) await render(timoSvg(pose), 480, 560, `timo-${pose}.png`);
await render(timoBadgeSvg(), 256, 256, 'timo-badge.png');
await render(timoBadgeSvg(), 96, 96, 'timo-badge-small.png');
await browser.close();
console.warn(`Esportate ${TIMO_POSES.length} pose + 2 badge in assets/mascot/`);
