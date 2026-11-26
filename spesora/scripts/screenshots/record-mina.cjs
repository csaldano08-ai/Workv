/*
 * Video delle animazioni di Mina 2.0, registrato dalla demo web REALE (pagina /mina, solo web).
 *   node scripts/screenshots/record-mina.cjs <url-base> <out.mp4>
 * Ogni gesto viene mostrato in grande, uno dopo l'altro; alla fine un tocco su Mina (saltello).
 * I fotogrammi vengono dallo screencast di Chromium e sono montati a 30 fps costanti con ffmpeg.
 */
const { Buffer } = require('buffer');
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SEQUENCE = [
  ['welcome', 'Saluto', 4200],
  ['neutral', 'Idle: respiro, battito di ciglia, sguardo', 9000],
  ['happy', 'Felice', 3600],
  ['thinking', 'Pensierosa', 3600],
  ['success', 'Lista completata', 4200],
  ['recipe', 'Ricetta (Mina Chef)', 3800],
  ['reminder', 'Promemoria', 4200],
];

(async () => {
  const [base, out] = process.argv.slice(2);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mina-video-'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const root = base.replace(/\/$/, '');
  // primo avvio: lascia finire l'animazione iniziale dell'app (poi non ricompare)
  await p.goto(root + '/mina');
  await p.waitForTimeout(10000);
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let recording = false;
  cdp.on('Page.screencastFrame', async (f) => {
    if (recording) {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp });
    }
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1280, everyNthFrame: 1 });
  for (const [pose, , ms] of SEQUENCE) {
    recording = false;
    await p.goto(`${root}/mina?posa=${pose}`);
    await p.waitForTimeout(700); // caricamento: non registrato
    recording = true;
    await p.waitForTimeout(ms);
  }
  // interazione: tocco su Mina
  await p.mouse.click(195, 300);
  await p.waitForTimeout(2600);
  recording = false;
  await cdp.send('Page.stopScreencast');
  await b.close();
  // fotogrammi con orario → durata reale di ciascuno; i tagli tra le pose si chiudono (nessuna pausa)
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const d = next && next.ts - frames[i].ts < 1 ? next.ts - frames[i].ts : 1 / 30;
    list.push(`file '${frames[i].file}'\nduration ${Math.max(0.001, d).toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', 'fps=30,scale=780:1280,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.stdout.write(`${frames.length} fotogrammi → ${out}\n`);
})();
