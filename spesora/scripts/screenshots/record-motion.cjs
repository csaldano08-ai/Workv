/*
 * Video del movimento dell'app (demo web reale): passi del questionario che scivolano, comparse a cascata,
 * cambio di scheda con l'icona che saltella, cambio di giorno nella direzione giusta, Giorno ⇄ Settimana,
 * carosello delle ricette, foto della ricetta che si appoggia, spunte della spesa (riga che si disegna,
 * tessera che saltella), foglio delle azioni, festeggiamento di Mina che entra ed esce.
 *   node scripts/screenshots/record-motion.cjs <url-base> <out.mp4>
 * Sul web le transizioni native tra pagine (scorrimento iOS) non esistono: si vedono solo su iPhone e Android.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-video-'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
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
  const tab = (re) => p.getByRole('tab', { name: re }).filter({ visible: true }).first();
  const next = async () => {
    for (const t of ['Avanti', 'Salta', 'Continua']) {
      const el = btn(new RegExp('^' + t, 'i'));
      if ((await el.count()) && (await el.isEnabled().catch(() => false))) {
        await el.click();
        return true;
      }
    }
    return false;
  };

  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let rec = false;
  let segment = 0; // ogni parte registrata è un segmento: tra due segmenti non resta nessuna pausa
  cdp.on('Page.screencastFrame', async (f) => {
    if (rec) {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp, segment });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });

  // 1. questionario: i passi scivolano avanti e indietro
  await p.goto(root + '/');
  await w(9000);
  await btn(/^Inizia/).click();
  await w(900);
  segment += 1;
  rec = true;
  await w(900);
  for (let i = 0; i < 3; i++) {
    await next();
    await w(1300);
  }
  await btn(/^Indietro/).click().catch(() => {});
  await w(1300);
  await next();
  await w(1200);
  rec = false;
  for (let step = 0; step < 50 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (!(await next())) break;
    await w(350);
    if (await p.getByText(/Preparo la tua settimana/).count()) await w(3500);
  }
  await w(1200);
  await btn(/Inizia la settimana/).click();
  await w(3000);

  // 2. Oggi, poi le schede: comparse a cascata e icona che saltella
  await p.goto(root + '/');
  await w(500);
  segment += 1;
  rec = true;
  await w(3000);
  await tab(/Settimana/).click();
  await w(1800);
  // 3. cambio di giorno: avanti due volte, poi indietro
  await tab(/martedì 24/).click().catch(() => {});
  await w(1100);
  await tab(/giovedì 26/).click().catch(() => {});
  await w(1100);
  await tab(/lunedì 23/).click().catch(() => {});
  await w(1300);
  // 4. Giorno ⇄ Settimana
  // linguetta Giorno/Settimana della pagina (non la scheda in basso, che ha lo stesso nome)
  const paper = p.getByRole('tablist').filter({ has: p.getByRole('tab', { name: /^Giorno$/ }) }).first();
  await paper.getByRole('tab', { name: /^Settimana$/ }).click().catch(() => {});
  await w(1400);
  await paper.getByRole('tab', { name: /^Giorno$/ }).click().catch(() => {});
  await w(1300);
  // 5. Ricettario e una ricetta (la foto si appoggia)
  await tab(/Ricette/).click();
  await w(2000);
  await p.getByRole('button', { name: /minuti$/ }).filter({ visible: true }).first().click().catch(() => {});
  await w(2000);
  await p.goBack();
  await w(900);
  // 6. Spesa: spunte con la riga che si disegna e le tessere che saltellano
  await tab(/Spesa/).click();
  await w(1600);
  const boxes = p.getByRole('checkbox').filter({ visible: true });
  const n = Math.min(await boxes.count(), 5);
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).click().catch(() => {});
    await w(650);
  }
  await w(800);
  // 7. festeggiamento di Mina: entra con un rimbalzo, poi esce scivolando
  await btn(/^Conferma acquisti/).click().catch(() => {});
  await w(4400);
  // 8. foglio delle azioni dalla Home
  await tab(/Oggi/).click();
  await w(1400);
  await btn(/^Altre azioni/).click().catch(() => {});
  await w(1500);
  await btn(/^Chiudi menu/).click().catch(() => {});
  await w(900);
  // 9. Dispensa
  await tab(/Dispensa/).click();
  await w(2000);
  rec = false;
  await cdp.send('Page.stopScreencast');
  await b.close();

  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const nx = frames[i + 1];
    // le pause vere restano (massimo 2 s); il tempo non registrato tra due segmenti si chiude
    const d = nx && nx.segment === frames[i].segment ? Math.min(nx.ts - frames[i].ts, 2) : 1 / 30;
    list.push(`file '${frames[i].file}'\nduration ${Math.max(0.001, d).toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write(`${frames.length} fotogrammi → ${out}\n`);
})();
