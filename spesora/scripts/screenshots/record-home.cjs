/*
 * Video breve della Home reale (demo web): apertura con il saluto di Mina e le card che entrano,
 * preferito, scorrimento fino alla settimana, accesso al calendario e alla spesa, tocco su Mina.
 *   node scripts/screenshots/record-home.cjs <url-base> <out.mp4>
 * Esegue prima il questionario (come capture.cjs), poi registra solo la Home.
 */
const { Buffer } = require('buffer');
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA = '2026-11-23T09:00:00';

(async () => {
  const [base, out] = process.argv.slice(2);
  const root = base.replace(/\/$/, '');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'home-video-'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const delta = new Date(DATA).getTime() - Date.now();
  await p.addInitScript((d) => {
    const R = Date;
    class D extends R {
      constructor(...a) {
        if (a.length === 0) super(R.now() + d);
        else super(...a);
      }
      static now() {
        return R.now() + d;
      }
    }
    Date = D;
  }, delta);
  const w = (ms) => p.waitForTimeout(ms);
  const btn = (re) => p.getByRole('button', { name: re }).filter({ visible: true }).first();
  await p.goto(root + '/');
  await w(9000);
  await btn(/^Inizia/).click();
  await w(800);
  for (let step = 0; step < 50 && !(await p.getByText('La tua prima settimana').count()); step++) {
    let clicked = false;
    for (const t of ['Avanti', 'Salta', 'Continua']) {
      const el = btn(new RegExp('^' + t, 'i'));
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) {
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
    await w(350);
    if (await p.getByText(/Preparo la tua settimana/).count()) await w(3500);
  }
  await w(1200);
  await btn(/Inizia la settimana/).click();
  await w(3000);
  // da qui si registra: si riapre la Home da zero per vedere l'ingresso
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let rec = false;
  cdp.on('Page.screencastFrame', async (f) => {
    if (rec) {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await p.goto(root + '/');
  await w(600);
  rec = true;
  await w(3600);
  await btn(/Aggiungi .* ai preferiti/).click().catch(() => {});
  await w(1400);
  await p.mouse.move(195, 500);
  for (let i = 0; i < 10; i++) {
    await p.mouse.wheel(0, 60);
    await w(45);
  }
  await w(1500);
  await btn(/Vedi il calendario/).click().catch(() => {});
  await w(2200);
  await p.getByRole('tab', { name: /Oggi/ }).first().click();
  await w(1400);
  await btn(/^Lista della spesa/).click().catch(() => {});
  await w(2200);
  await p.getByRole('tab', { name: /Oggi/ }).first().click();
  await w(1200);
  await p.mouse.wheel(0, -1200);
  await w(800);
  await btn(/Mina, la tua borsetta/).click().catch(() => {});
  await w(2600);
  rec = false;
  await cdp.send('Page.stopScreencast');
  await b.close();
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const d = next ? Math.min(next.ts - frames[i].ts, 3) : 1 / 30; // le pause restano pause (massimo 3 s)
    list.push(`file '${frames[i].file}'\nduration ${Math.max(0.001, d).toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write(`${frames.length} fotogrammi → ${out}\n`);
})();
