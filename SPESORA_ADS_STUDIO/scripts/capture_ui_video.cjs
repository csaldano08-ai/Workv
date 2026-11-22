/*
 * Registra dalla demo web REALE di Spesora un filmato di navigazione (7.8 s a 30 fps) per lo schermo del telefono in 3D:
 * calendario (Settimana) -> ricetta -> lista della spesa. Nessuna interfaccia inventata.
 *   node capture_ui_video.cjs <url> <cartella-output>     (scrive ui_0001.png ... in <cartella-output>)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const [url, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const raw = path.join(out, '_raw');
  fs.rmSync(raw, { recursive: true, force: true });
  fs.mkdirSync(raw, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const w = (ms) => p.waitForTimeout(ms);
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

  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(raw, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, ts: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const t0 = Date.now();
  const at = async (sec) => { const ms = sec * 1000 - (Date.now() - t0); if (ms > 0) await w(ms); };
  await p.mouse.move(195, 500);
  // A: calendario
  await at(0.3); await p.getByRole('tab', { name: /Settimana/ }).first().click();
  await at(1.5); await p.getByRole('tab', { name: /mar/ }).first().click().catch(() => {});
  await at(2.0); await p.getByRole('tab', { name: 'Settimana', exact: true }).last().click().catch(() => {});
  // B: ricetta
  await at(2.8); await p.getByRole('tab', { name: /Oggi/ }).first().click();
  await at(3.4); await p.getByRole('button', { name: /^Cucina$/ }).first().click();
  await at(4.0); for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 55); await w(70); }
  // C: lista della spesa
  await at(5.3); await p.goBack().catch(() => {});
  await at(5.7); await p.getByRole('tab', { name: /Spesa/ }).first().click();
  await at(6.5); const boxes = p.getByRole('checkbox'); for (let i = 0; i < 2; i++) { await boxes.nth(i).click().catch(() => {}); await w(450); }
  await at(7.9);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  await b.close();
  const list = frames.map((fr, i) => `file '${fr.file}'\nduration ${Math.max(0.001, (frames[i + 1] ? frames[i + 1].ts : fr.ts + 0.2) - fr.ts).toFixed(4)}`);
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(raw, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf', 'fps=30,scale=520:1126', '-frames:v', '234', path.join(out, 'ui_%04d.png')]);
  console.log('frames registrati:', frames.length, '-> PNG:', fs.readdirSync(out).filter((f) => f.endsWith('.png')).length);
})();
