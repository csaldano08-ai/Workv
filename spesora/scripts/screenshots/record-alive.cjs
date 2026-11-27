/*
 * Video dimostrativo «Mina Alive» (demo web REALE, non un montaggio): avvio con l'intro (logo, Mina che
 * saluta, frase), onboarding con le reazioni, Home con il saluto e l'occhiata al pasto, Settimana,
 * Spesa con le spunte seguite dallo sguardo e la festa a lista completata, Dispensa con la reazione
 * «potrebbe non bastare» e la risoluzione, Ricette con l'ingresso di Mina Chef, apertura di una ricetta,
 * avvio della preparazione e conferma finale.
 *   node scripts/screenshots/record-alive.cjs <url-base> <out.mp4>
 * Le transizioni native tra pagine (scorrimento iOS) non esistono sul web: si vedono solo su telefono.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alive-video-'));
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
  let segment = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    if (rec) {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp, segment });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const on = () => {
    segment += 1;
    rec = true;
  };

  // 1-2 · avvio: l'intro parte da sola al primo avvio (logo, Mina che saluta, frase)
  on();
  await p.goto(root + '/');
  await w(6500);
  // 3 · onboarding: benvenuto e primi passi, con le reazioni di Mina alle scelte
  await btn(/^Inizia/).click();
  await w(1600);
  await p.getByRole('button', { name: /^4$/ }).first().click().catch(() => {});
  await w(1400);
  await next();
  await w(1500);
  await p.getByText('Colazione', { exact: true }).first().click().catch(() => {});
  await w(1300);
  await next();
  await w(1400);
  rec = false;
  for (let step = 0; step < 50 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (!(await next())) break;
    await w(350);
    if (await p.getByText(/Preparo la tua settimana/).count()) await w(3500);
  }
  await w(1200);
  on();
  await w(900);
  await btn(/Inizia la settimana/).click();
  await w(1200);
  // 4 · Home: saluto di Mina, poi l'occhiata al pasto di oggi; un tocco su di lei
  await w(4200);
  await p.getByLabel('Mina, la tua borsetta della spesa').first().click().catch(() => {});
  await w(2600);
  // 5 · Settimana: cambio giorno nelle due direzioni, Mina dà un'occhiata
  await tab(/Settimana/).click();
  await w(2000);
  await tab(/martedì 24/).click().catch(() => {});
  await w(1500);
  await tab(/lunedì 23/).click().catch(() => {});
  await w(1500);
  // 6-7 · Spesa: le spunte (riga sul nome, saltello, sguardo di Mina), poi lista completata e conferma
  await tab(/Spesa/).click();
  await w(1800);
  const boxes = p.getByRole('checkbox');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const bx = boxes.nth(i);
    await bx.scrollIntoViewIfNeeded().catch(() => {});
    await bx.click().catch(() => {});
    await w(i < 3 ? 900 : 300);
  }
  await p.mouse.wheel(0, -4000);
  await w(1600);
  await btn(/^Conferma acquisti/).click().catch(() => {});
  await w(4200);
  // 8-9 · Dispensa: Mina vede «Potrebbe non bastare», si preoccupa e lo indica; correggiamo la quantità
  await tab(/Dispensa/).click();
  await w(3400);
  await p.getByRole('button', { name: /^Fagioli cannellini/ }).first().click();
  await w(1600);
  await p.getByLabel(/^Quantità in/).first().fill('1500');
  await w(600);
  await btn(/^Correggi la quantità/).click(); // salva e torna da sola alla Dispensa
  await w(3600);
  // 10-11 · Ricette: Mina Chef entra, solleva il cucchiaio e strizza l'occhio
  await tab(/Ricette/).click();
  await w(3000);
  // 12 · apertura di una ricetta (la foto si appoggia sulla pagina)
  await p.getByRole('button', { name: /minuti$/ }).filter({ visible: true }).first().click().catch(() => {});
  await w(2400);
  await p.goBack();
  await w(1000);
  // 13 · avvio della preparazione dal pasto di oggi: Mina Chef incoraggia
  await tab(/Oggi/).click();
  await w(1500);
  await btn(/^Cucina( ora)?$/).click();
  await w(2200);
  await p.mouse.move(195, 420);
  await p.mouse.wheel(0, 1500);
  await w(2400);
  // 14 · conferma finale: «Ho cucinato» e la festa di Mina
  await btn(/^Ho cucinato/).click();
  await w(4200);
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
