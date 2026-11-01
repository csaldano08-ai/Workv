// Esporta le pose di Mina in PNG 1024×1024 con vera trasparenza (canale alfa), a partire dalla
// stessa sorgente vettoriale usata dall'app. Richiede Node ≥ 22.18 e Playwright.
//   node scripts/mascot/export-mascot.mjs
// Output: assets/mascot/mina/vector/mina_<posa>.png, mina_badge.png e docs/MINA_CONTACT_SHEET.png
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MINA_VECTOR_POSES as MINA_POSES, minaBadgeSvg, minaSvg } from '../../src/ui/mascot/minaSvg.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = `${root}assets/mascot/mina/vector/`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
async function render(svg, size, file, scaleToFit = true) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const sized = svg.replace('<svg ', `<svg style="max-width:${size}px;max-height:${size}px;width:${scaleToFit ? size : 'auto'}px;height:${size}px" `);
  await page.setContent(`<html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${sized}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
}
for (const pose of MINA_POSES) await render(minaSvg(pose), 1024, `${out}mina_${pose}.png`);
await render(minaBadgeSvg(), 512, `${out}mina_badge.png`);

// Contact sheet: tutte le pose affiancate, per valutare la coerenza.
const cells = MINA_POSES.map((p) => `<div class="c">${minaSvg(p)}<span>${p}</span></div>`).join('');
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.setContent(`<html><body style="margin:0;background:#F6F3EA;font:13px sans-serif;color:#24332C"><style>.c{display:inline-block;width:240px;text-align:center;margin:8px}.c svg{width:210px;height:235px}</style><div style="width:1000px">${cells}</div></body></html>`);
await page.screenshot({ path: `${root}docs/MINA_CONTACT_SHEET.png`, fullPage: true });
await browser.close();
console.warn(`Esportate ${MINA_POSES.length} pose + badge in assets/mascot/mina/vector/ e la contact sheet in docs/`);
