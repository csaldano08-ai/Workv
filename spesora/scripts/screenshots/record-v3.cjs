/*
 * Video «Mina 2D quality fix» dalla demo web REALE (non un montaggio): intro a goccia al primo avvio,
 * onboarding, Home (saluto e reazione agli ingredienti mancanti), Settimana (cambio giorno, pasto cambiato →
 * soddisfazione), Spesa (spunte, lista completata con la festa, conferma), Dispensa (avviso e correzione),
 * Ricette (trasformazione in Mina Chef), una ricetta, Preparazione (timer: Mina Chef mescola, poi «Tempo!»)
 * e «Ho cucinato» (festa di Mina Chef).
 *   node scripts/screenshots/record-v3.cjs <url-base> <out.mp4> [cartella-fotogrammi]
 * Rispetto alla V2: Dispensa con la spiegazione chiesta a Mina, scheda ricetta riordinata, Modalità Cucina
 * (un passaggio alla volta, ingredienti del passaggio, «Chiedi a Mina», timer, fine, «Ho cucinato»).
 * Per mostrare la fine del timer senza aspettare i minuti veri, l'orologio della pagina viene spostato in avanti.
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
  const [base, out, shotsDir] = process.argv.slice(2);
  const root = base.replace(/\/$/, '');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v2-video-'));
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const delta = new Date(DATA).getTime() - Date.now();
  await p.addInitScript((d) => {
    const R = Date;
    window.__shift = 0;
    class D extends R {
      constructor(...a) {
        if (a.length === 0) super(R.now() + d + window.__shift);
        else super(...a);
      }
      static now() {
        return R.now() + d + window.__shift;
      }
    }
    Date = D;
  }, delta);
  const w = (ms) => p.waitForTimeout(ms);
  const btn = (re) => p.getByRole('button', { name: re }).filter({ visible: true }).first();
  const tab = (re) => p.getByRole('tab', { name: re }).filter({ visible: true }).first();
  const shot = async (name) => {
    if (shotsDir) await p.screenshot({ path: path.join(shotsDir, `${name}.png`) });
  };
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
  const marks = [];
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
  const mark = (label) => marks.push({ label, frame: frames.length });

  // 1 · primo avvio: l'intro a goccia parte da sola e finisce nel Benvenuto
  on();
  mark('intro');
  await p.goto(root + '/');
  await w(5200);
  await shot('01_benvenuto_dopo_intro');
  // 2 · onboarding
  mark('onboarding');
  await btn(/^Inizia/).click();
  await w(1500);
  await p.getByRole('button', { name: /^4$/ }).first().click().catch(() => {});
  await w(1200);
  await next();
  await w(1300);
  await p.getByText('Colazione', { exact: true }).first().click().catch(() => {});
  await w(1100);
  await next();
  await w(1200);
  rec = false;
  for (let step = 0; step < 50 && !(await p.getByText('La tua prima settimana').count()); step++) {
    if (!(await next())) break;
    await w(350);
    if (await p.getByText(/Preparo la tua settimana/).count()) await w(3500);
  }
  await w(1200);
  on();
  await w(700);
  await btn(/Inizia la settimana/).click();
  // 3 · Home: saluto, poi la reazione al pasto di oggi (ingredienti mancanti: guarda la card e la indica)
  mark('home');
  await w(6200);
  await shot('03_home_reazione');
  await p.getByLabel(/^Mina/).first().click().catch(() => {});
  await w(2400);
  // 4 · Settimana: l'evidenziazione scivola sul giorno; un pasto cambiato → Mina soddisfatta
  mark('settimana');
  await tab(/Settimana/).click();
  await w(1800);
  await tab(/martedì 24/).click().catch(() => {});
  await w(1100);
  await tab(/mercoledì 25/).click().catch(() => {});
  await w(1100);
  await tab(/lunedì 23/).click().catch(() => {});
  await w(1300);
  rec = false;
  await btn(/^Azioni per /).click().catch(() => {});
  await w(700);
  await btn(/^Cambia ricetta/).click().catch(() => {});
  await w(1600);
  await btn(/^Scegli /).click().catch(() => {});
  on();
  await w(3200);
  await shot('04_settimana_soddisfatta');
  // 5 · Spesa: spunte (piccolo riscontro), lista completata (festa con foglioline e scintille), conferma
  mark('spesa');
  await tab(/Spesa/).click();
  await w(1700);
  // apre i gruppi chiusi (categorie lunghe senza prodotti urgenti), così tutte le voci si possono spuntare;
  // sul web lo stato «aperto» non è esposto, quindi si prova: se un tocco chiude un gruppo, lo si riapre
  // (questo passaggio non viene registrato)
  rec = false;
  const heads = p.getByRole('button', { name: /prodotti, \d+ nel carrello$/ });
  const hn = await heads.count();
  for (let k = 0; k < hn; k++) {
    const before = await p.getByRole('checkbox').count();
    await heads.nth(k).scrollIntoViewIfNeeded().catch(() => {});
    await heads.nth(k).click().catch(() => {});
    await w(200);
    if ((await p.getByRole('checkbox').count()) < before) {
      await heads.nth(k).click().catch(() => {});
      await w(200);
    }
  }
  await p.mouse.wheel(0, -5000);
  await w(300);
  on();
  // prima il resto della lista, poi (tornati in cima) le tessere prioritarie: l'ultima spunta completa la lista
  // sotto gli occhi, con la festa di Mina in cima alla pagina
  const boxes = p.getByRole('checkbox');
  const n = await boxes.count();
  const firstTiles = Math.min(3, n);
  for (let i = firstTiles; i < n; i++) {
    const bx = boxes.nth(i);
    await bx.scrollIntoViewIfNeeded().catch(() => {});
    await bx.click().catch(() => {});
    await w(i < firstTiles + 2 ? 700 : 240);
  }
  await p.mouse.wheel(0, -5000);
  await w(700);
  for (let i = 0; i < firstTiles; i++) {
    await boxes.nth(i).click().catch(() => {});
    await w(i < firstTiles - 1 ? 700 : 380);
  }
  await shot('05_spesa_completata');
  await w(3000);
  await btn(/^Conferma acquisti/).click().catch(() => {});
  await w(4000);
  await shot('06_spesa_confermata');
  // 6 · Dispensa: Mina vede «potrebbe non bastare» (reazione visiva); la spiegazione solo se la chiedi; correzione
  mark('dispensa');
  await tab(/Dispensa/).click();
  await w(3300);
  await p.getByRole('button', { name: /potrebbero? non bastare/ }).first().click().catch(() => {});
  await w(1600);
  await shot('07_dispensa_avviso');
  await p.getByRole('button', { name: /^Fagioli cannellini/ }).first().click().catch(() => {});
  await w(1500);
  await p.getByLabel(/^Quantità in/).first().fill('1500').catch(() => {});
  await w(500);
  await btn(/^Correggi la quantità/).click().catch(() => {});
  await w(3400);
  await shot('08_dispensa_risolta');
  // 7 · Ricette: la prima volta Mina diventa Mina Chef; poi una scheda ricetta (foto, titolo, durata, porzioni, azione)
  mark('ricette');
  await tab(/Ricette/).click();
  await w(3600);
  await shot('09_ricette_mina_chef');
  await p.getByRole('button', { name: /minuti$/ }).filter({ visible: true }).first().click().catch(() => {});
  await w(1800);
  await shot('09b_scheda_ricetta');
  await p.mouse.move(195, 420);
  await p.mouse.wheel(0, 700);
  await w(1400);
  await p.goBack();
  await w(900);
  // 8 · Modalità Cucina dal pasto di oggi: un passaggio alla volta
  mark('modalita cucina');
  await tab(/Oggi/).click();
  await w(1400);
  await btn(/^Cucina( ora)?$/).click();
  await w(1800);
  await shot('10_cucina_passaggio')
  await p.getByRole('button', { name: /Ingredienti (di questo passaggio|della ricetta)/ }).filter({ visible: true }).first().click().catch(() => {});
  await w(1300);
  await btn(/^Chiedi a Mina/).click().catch(() => {});
  await w(1600);
  await shot('11_cucina_aiuto');
  // avanti fino al primo passaggio con il timer
  for (let k = 0; k < 12 && !(await btn(/^Avvia \d+ min/).count()); k++) {
    const nextBtn = btn(/^Fatto, avanti/);
    if (!(await nextBtn.count())) break;
    await nextBtn.click();
    await w(1100);
  }
  const start = btn(/^Avvia \d+ min/);
  if (await start.count()) {
    await start.click();
    await w(2600);
    await shot('12_cucina_timer');
    await p.evaluate(() => {
      window.__shift += 90 * 60 * 1000;
    });
    await w(2600);
  }
  // fino alla fine: «Fatto, finito», Mina Chef festeggia, «Ho cucinato»
  for (let k = 0; k < 12; k++) {
    const fin = btn(/^Fatto, finito/);
    if (await fin.count()) {
      await fin.click();
      break;
    }
    const nextBtn = btn(/^Fatto, avanti/);
    if (!(await nextBtn.count())) break;
    await nextBtn.click();
    await w(900);
  }
  await w(2600);
  await shot('13_cucina_fine');
  mark('ho cucinato');
  await btn(/^Ho cucinato/).click();
  await w(1300);
  await shot('14_ho_cucinato');
  await w(3000);
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
  // tempi dei capitoli nel video montato
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
