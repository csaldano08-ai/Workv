/*
 * Rendering dei prototipi: serve spesora/ in locale, disegna ogni fotogramma nel canvas (Chromium headless)
 * e lo passa a ffmpeg (H.264, yuv420p, 1080×1920). Nessun pacchetto da installare: usa Playwright e ffmpeg
 * già presenti nell'ambiente.
 *
 *   node scripts/render.cjs A [fps]          → out/spesora_intro_A_mina.mp4
 *   node scripts/render.cjs A --frames 0,1.5 → solo fotogrammi PNG di controllo in out/frames/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..'); // spesora/
const OUT = path.resolve(__dirname, '../out');
const NAMES = { A: 'spesora_intro_A_mina', B: 'spesora_intro_B_splash', C: 'spesora_intro_C_ingredients', D: 'spesora_intro_D_calendar' };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        rsp.writeHead(404);
        return rsp.end();
      }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, () => res(srv));
  });
}

(async () => {
  const [concept = 'A', ...rest] = process.argv.slice(2);
  const fi = rest.indexOf('--frames');
  const frames = fi >= 0 ? rest[fi + 1].split(',').map(Number) : null;
  const fps = Number(rest.find((r) => /^\d+$/.test(r)) || 60);
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('ERRORE PAGINA', e.message));
  await page.goto(`http://localhost:${port}/prototypes/intro-concepts/src/stage.html?c=${concept}`);
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.duration);
  const canvas = page.locator('#c');

  if (frames) {
    fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
    for (const t of frames) {
      await page.evaluate((x) => window.renderFrame(x), t);
      await canvas.screenshot({ path: path.join(OUT, 'frames', `${concept}_${t.toFixed(2)}.png`) });
    }
  } else {
    const file = path.join(OUT, `${NAMES[concept]}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(duration * fps);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate((x) => window.renderFrame(x), i / fps);
      const buf = await canvas.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log(`${file}: ${n} fotogrammi a ${fps} fps in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close();
  srv.close();
})();
