/* Registra le micro-animazioni (2 per concept) in out/animations/concept-X_aN.mp4 (780×1688, 30 fps). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const LIST = [['A', 'a1', 'week'], ['A', 'a2', 'shop'], ['B', 'a1', 'home'], ['B', 'a2', 'shop'], ['C', 'a1', 'week'], ['C', 'a2', 'home'], ['D', 'a1', 'week'], ['D', 'a2', 'shop']];
(async () => {
  const out = path.resolve(__dirname, '../out/animations');
  const tmp = path.join(out, 'tmp');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [k, a, scr] of LIST) {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(__dirname, `../src/concept-${k}.html`));
    await p.addStyleTag({ content: `.wrap{padding:0!important;gap:0!important} .screen:not(#${scr}){display:none!important} body{background:#000}` });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => { const s = document.querySelector('#sel'); if (s) { const d = document.querySelectorAll('#week .day')[1]; s.style.left = d.offsetLeft + 'px'; } });
    await p.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(p);
    const frames = [];
    cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(tmp, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, ts: f.metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 });
    await p.waitForTimeout(300);
    const t0 = Date.now() / 1000;
    await p.evaluate((name) => window.anims[name](), a);
    await p.waitForTimeout(200);
    const t1 = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    await ctx.close();
    // tempi reali: il primo fotogramma copre l'attesa iniziale, l'ultimo resta fino alla fine (pause comprese)
    const vis = frames.filter((fr) => fr.ts >= t0 - 0.2);
    const use = vis.length ? vis : frames.slice(-1);
    const list = use.map((fr, i) => {
      const from = i === 0 ? Math.min(fr.ts, t0) : fr.ts;
      const to = use[i + 1] ? use[i + 1].ts : t1;
      return `file '${fr.file}'\nduration ${Math.max(0.001, to - from).toFixed(4)}`;
    });
    list.push(`file '${use[use.length - 1].file}'`);
    fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
    const file = path.join(out, `concept-${k}_${a}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-vf', 'fps=30,scale=780:1688,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', file]);
    console.log(file, frames.length, 'fotogrammi');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close();
})();
