/*
 * Giro guidato REALE della demo web di Spesora, registrato con Playwright.
 * Scrive out/raw/*.webm e out/marks.json (inizio di ogni capitolo, in secondi dall'avvio del video).
 *   node tour.cjs <url> <cartella-out>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [url, out] = process.argv.slice(2);
  const raw = path.join(out, 'raw');
  fs.rmSync(raw, { recursive: true, force: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  // screencast nativo di Chromium alla risoluzione reale del dispositivo (2x): fotogrammi JPEG con orario
  fs.mkdirSync(raw, { recursive: true });
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(raw, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, ts: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const t0 = Date.now();
  const tsAtStart = Date.now() / 1000;
  const marks = [];
  const mark = (id) => marks.push({ id, t: (Date.now() - t0) / 1000 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('dialog', (d) => d.accept());
  const w = (ms) => p.waitForTimeout(ms);
  const scroll = async (px, steps = 8) => {
    for (let i = 0; i < steps; i++) {
      await p.mouse.wheel(0, px / steps);
      await w(60);
    }
  };
  const btn = (re) => p.getByRole('button', { name: re }).first();
  const tab = async (re) => {
    await p.getByRole('tab', { name: re }).click();
    await w(900);
  };
  await p.mouse.move(195, 500);

  mark('intro');
  await p.goto(url);
  await w(8300);
  mark('benvenuto');
  await w(2500);
  await btn(/^Inizia/).click();
  await w(900);
  mark('caricamento');
  for (let step = 0; step < 40 && !(await p.getByText('La tua prima settimana').count()); step++) {
    let clicked = false;
    if (await p.getByText('Quali pasti vuoi organizzare?').count()) {
      const col = p.getByRole('checkbox', { name: 'Colazione' });
      if (await col.count()) await col.click();
    }
    for (const t of ['Avanti', 'Salta', 'Continua']) {
      const el = btn(new RegExp('^' + t, 'i'));
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) {
        await w(120);
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
    await w(150);
  }
  await w(4200);
  await btn(/Inizia la settimana/).click();
  await w(2200);
  await tab(/Settimana/);
  await w(900);
  mark('rigenera');
  await btn(/Rigenera/).click();
  await w(4200);
  mark('fine');
  await w(600);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // video a 30 fps costante dai fotogrammi con orario (ogni fotogramma resta fino al successivo)
  const list = frames.map((fr, i) => {
    const next = frames[i + 1] ? frames[i + 1].ts : fr.ts + 0.5;
    return `file '${fr.file}'\nduration ${Math.max(0.001, next - fr.ts).toFixed(4)}`;
  });
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(raw, 'list.txt'), list.join('\n'));
  const video = path.join(out, 'intro_raw.mp4');
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '16', video]);
  // allinea i capitoli all'inizio del video (primo fotogramma)
  const offset = frames[0].ts - tsAtStart;
  for (const m of marks) m.t = Math.max(0, m.t - offset);
  fs.writeFileSync(path.join(out, 'intro_marks.json'), JSON.stringify({ marks, video, errors: errs }, null, 2));
  await b.close();
  console.log(JSON.stringify(marks), errs.length, 'errori');
})();
