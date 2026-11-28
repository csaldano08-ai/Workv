/*
 * Video di navigazione MINA dalla demo web REALE (non un montaggio): intro al primo avvio, benvenuto a 3 pagine,
 * le prime domande del questionario, caricamento con Mina Chef, anteprima del piano, abbonamento (acquisti spenti
 * dichiarati), Oggi, Settimana, Spesa (spunte e «Acquistati»), Dispensa, Ricette (trasformazione in Mina Chef,
 * tessere), una ricetta con le sue schede, la Modalità Cucina e il Profilo.
 *   node scripts/screenshots/record-mina.cjs <url-base> <out.mp4>
 * Le parti ripetitive (le altre domande del questionario) non vengono registrate: il video le salta.
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mina-video-'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'it-IT' });
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

  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let rec = false;
  let segment = 0;
  const marks = [];
  cdp.on('Page.screencastFrame', async (f) => {
    if (rec) {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp, segment });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const on = () => {
    segment += 1;
    rec = true;
  };
  const mark = (label) => marks.push({ label, frame: frames.length });

  // 1 · primo avvio: intro, poi il benvenuto a tre pagine
  on();
  mark('intro e benvenuto');
  await p.goto(root + '/');
  await w(6200);
  await btn(/^Inizia/).click();
  await w(1800);
  await btn(/^Continua/).click();
  await w(1800);
  // 2 · questionario: le prime due domande
  mark('scelta della lingua');
  await btn(/^Continua/).click();
  await w(1600);
  // la lingua rilevata (italiano); si prova l'inglese (la pagina cambia subito) e si torna all'italiano
  await p.getByRole('radio', { name: 'English' }).click();
  await w(1800);
  await p.getByRole('radio', { name: 'Italiano' }).click();
  await w(1400);
  await btn(/^Avanti/).click();
  await w(1500);
  mark('questionario');
  await p.getByRole('radio', { name: /^2 persone/ }).first().click();
  await w(1200);
  await btn(/^Avanti/).click();
  await w(1500);
  await p.getByRole('checkbox', { name: /^Colazione/ }).first().click().catch(() => {});
  await w(1200);
  await btn(/^Avanti/).click();
  await w(900);
  // le altre domande con le risposte predefinite, senza registrare
  rec = false;
  for (let i = 0; i < 40; i++) {
    if (await p.getByText(/Preparo la tua settimana/).count()) break;
    if (await p.getByText('Cosa hai già in casa?').count()) {
      const chips = p.getByRole('checkbox').filter({ visible: true });
      for (let k = 0; k < Math.min(5, await chips.count()); k++) await chips.nth(k).click().catch(() => {});
    }
    const next = btn(/^(Avanti|Salta|Continua)/);
    if (!(await next.count())) break;
    await next.click();
    await w(250);
  }
  // 3 · caricamento con Mina Chef, anteprima, abbonamento
  on();
  mark('caricamento, anteprima, abbonamento');
  await w(4600);
  await w(1800);
  await btn(/^Procedi/).click();
  await w(3000);
  await btn(/^Continua/).click();
  // 4 · Oggi
  mark('oggi');
  await w(5200);
  // 5 · Settimana
  mark('settimana');
  await tab(/Settimana/).click();
  await w(2400);
  await p.mouse.wheel(0, 500);
  await w(1400);
  // 6 · Spesa: due spunte, poi «Acquistati»
  mark('spesa');
  await tab(/Spesa/).click();
  await w(2200);
  const boxes = p.getByRole('checkbox').filter({ visible: true });
  for (let k = 0; k < 2 && k < (await boxes.count()); k++) {
    await boxes.first().click().catch(() => {});
    await w(900);
  }
  await tab(/^Acquistati/).click().catch(() => {});
  await w(1600);
  await tab(/^Da acquistare/).click().catch(() => {});
  await w(900);
  // 7 · Dispensa
  mark('dispensa');
  await tab(/Dispensa/).click();
  await w(2800);
  // 8 · Ricette: trasformazione in Mina Chef, una tessera, una ricetta con le sue schede
  mark('ricette');
  await tab(/Ricette/).click();
  await w(4600);
  await tab(/^Primi/).click().catch(() => {});
  await w(1600);
  await p.getByRole('button', { name: /minuti/ }).filter({ visible: true }).first().click();
  await w(2400);
  await tab(/^Preparazione/).click().catch(() => {});
  await w(1500);
  await tab(/^Consigli/).click().catch(() => {});
  await w(1400);
  mark('modalità cucina');
  await btn(/Inizia a cucinare/).click().catch(() => {});
  await w(3200);
  // 9 · Profilo
  mark('profilo');
  await p.goto(root + '/');
  await w(2200);
  await btn(/^Profilo/).click().catch(() => {});
  await w(2400);
  await btn(/^Privacy e condizioni/).click().catch(() => {});
  await w(1800);
  // 10 · Profilo → Lingua: si passa al tedesco; piano, spesa e dispensa restano quelli di prima
  mark('cambio lingua');
  await btn(/^Lingua/).click().catch(() => {});
  await w(1800);
  await p.getByRole('radio', { name: 'Deutsch' }).click().catch(() => {});
  await w(2200);
  await p.goto(root + '/');
  await w(3000);
  await tab(/^Einkauf/).click().catch(() => {});
  await w(2600);
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
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '22', '-movflags', '+faststart', out]);
  let t = 0;
  const times = [];
  for (let i = 0, m = 0; i < frames.length; i++) {
    while (m < marks.length && marks[m].frame === i) times.push(`${marks[m++].label} ${t.toFixed(1)} s`);
    const nx = frames[i + 1];
    t += nx && nx.segment === frames[i].segment ? Math.min(nx.ts - frames[i].ts, 2) : 1 / 30;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write(`${frames.length} fotogrammi → ${out}\n${times.join('\n')}\n`);
})();
