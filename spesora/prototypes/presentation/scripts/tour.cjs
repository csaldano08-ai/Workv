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
  await w(8200);

  mark('benvenuto');
  await w(1800);
  await scroll(300);
  await w(900);
  await btn(/^Inizia/).click();
  await w(900);

  mark('questionario');
  for (let step = 0; step < 40 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (await p.getByText('Come mangi?').count()) {
      await w(500);
    }
    if (await p.getByText('Quali pasti vuoi organizzare?').count()) {
      const col = p.getByRole('checkbox', { name: 'Colazione' });
      if (await col.count()) {
        await col.click();
        await w(500);
      }
    }
    let clicked = false;
    for (const t of ['Avanti', 'Salta', 'Continua']) {
      const el = btn(new RegExp('^' + t, 'i'));
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) {
        await w(step < 4 ? 900 : 420);
        if (await p.getByText(/^PASSO 1[56] DI/).count()) mark('caricamento');
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
    await w(400);
  }
  await w(3600);

  mark('anteprima');
  await w(1200);
  await scroll(900, 12);
  await w(900);
  await btn(/Inizia la settimana/).click();
  await w(2200);

  mark('oggi');
  await w(1800);
  await scroll(500);
  await w(1200);

  mark('ricetta');
  await btn(/^Cucina$/).click();
  await w(1600);
  await scroll(700, 10);
  await w(1200);
  await scroll(900, 10);
  await w(1200);
  await p.goBack();
  await w(1000);

  mark('settimana');
  await tab(/Settimana/);
  await w(1000);
  await scroll(800, 12);
  await w(800);
  await scroll(-800, 6);

  mark('griglia');
  await p.getByRole('tab', { name: 'Settimana', exact: true }).last().click().catch(() => {});
  await w(1400);
  await scroll(600, 10);
  await w(1000);
  await p.getByRole('tab', { name: 'Giorno', exact: true }).last().click().catch(() => {});
  await w(900);

  mark('rigenera');
  await btn(/Rigenera/).click();
  await w(3600);

  mark('spesa');
  await tab(/Spesa/);
  await w(1000);
  const boxes = p.getByRole('checkbox');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const bx = boxes.nth(i);
    await bx.scrollIntoViewIfNeeded().catch(() => {});
    await bx.click().catch(() => {});
    await w(260);
  }
  await w(600);
  mark('conferma');
  await btn(/Conferma acquisti/).click();
  await w(3400);

  mark('dispensa');
  await tab(/Dispensa/);
  await w(1500);
  await scroll(500);
  await w(1000);

  mark('cucinato');
  await tab(/Oggi/);
  await w(900);
  await btn(/^Cucina$/).click();
  await w(1200);
  const cooked = btn(/Ho cucinato|Cucinato/);
  if (await cooked.count()) await cooked.click();
  await w(3300);
  await p.goBack();
  await w(800);

  mark('ricettario');
  await tab(/Ricette/);
  await w(1400);
  await scroll(900, 12);
  await w(900);
  await scroll(-900, 6);
  await p.getByPlaceholder(/Cerca/).click();
  await p.keyboard.type('zucca', { delay: 110 });
  await w(1800);

  mark('fine');
  await w(1500);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // video a 30 fps costante dai fotogrammi con orario (ogni fotogramma resta fino al successivo)
  const list = frames.map((fr, i) => {
    const next = frames[i + 1] ? frames[i + 1].ts : fr.ts + 0.5;
    return `file '${fr.file}'\nduration ${Math.max(0.001, next - fr.ts).toFixed(4)}`;
  });
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(raw, 'list.txt'), list.join('\n'));
  const video = path.join(out, 'tour_raw.mp4');
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '16', video]);
  // allinea i capitoli all'inizio del video (primo fotogramma)
  const offset = frames[0].ts - tsAtStart;
  for (const m of marks) m.t = Math.max(0, m.t - offset);
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify({ marks, video, errors: errs }, null, 2));
  await b.close();
  console.log(JSON.stringify(marks), errs.length, 'errori');
})();
