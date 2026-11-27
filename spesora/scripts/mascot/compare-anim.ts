/**
 * Confronto a pari scala: foglio di riferimento · posa statica · animazione a metà movimento · gesto completo.
 *   npx tsx scripts/mascot/compare-anim.ts <out.png> <voce: 0=Mina 2.0, 1=Mina Chef> <metà.png> <fine.png>
 * Il foglio viene riportato nel riquadro del disegno di Mina (stessa similitudine di compare-ref.ts, calcolata sugli
 * angoli della borsa); i due fotogrammi vengono dall'app reale, ritagliati sul riquadro di Mina
 * (scripts/screenshots/capture-mina-frames.cjs): tutte e quattro le colonne hanno quindi la stessa scala.
 */
import { readFileSync } from 'node:fs';
import sharp, { type OverlayOptions } from 'sharp';
import { RIG, VIEW, VIEWBOX, minaStaticSvg } from '../../src/ui/mascot/mina2/art';
import { ITEMS } from './compare-ref';

type P = [number, number];

function fit(a: P[], b: P[]) {
  const n = a.length;
  const ma = a.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  const mb = b.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  let sxx = 0;
  let sxy = 0;
  let norm = 0;
  for (let i = 0; i < n; i++) {
    const ax = a[i][0] - ma[0];
    const ay = a[i][1] - ma[1];
    const bx = b[i][0] - mb[0];
    const by = b[i][1] - mb[1];
    sxx += ax * bx + ay * by;
    sxy += ax * by - ay * bx;
    norm += ax * ax + ay * ay;
  }
  const c = sxx / norm;
  const s = sxy / norm;
  return { c, s, tx: mb[0] - (c * ma[0] - s * ma[1]), ty: mb[1] - (s * ma[0] + c * ma[1]) };
}

const rotate = (p: P, deg: number, o: { x: number; y: number }): P => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - o.x;
  const dy = p[1] - o.y;
  return [o.x + dx * Math.cos(a) - dy * Math.sin(a), o.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

async function main() {
  const [out, which, mid, end] = process.argv.slice(2);
  const it = ITEMS[Number(which)];
  const W = 420;
  const H = Math.round((W * VIEW.h) / VIEW.w);
  const lean = it.look.lean ?? 0;
  const ours = it.ourPts.map((p) => rotate(p, lean, RIG[it.look.variant].leanPivot));
  const t = fit(ours, it.refPts);
  // inversa della similitudine: dal foglio (pixel) al disegno di Mina (unità)
  const k2 = t.c * t.c + t.s * t.s;
  const inv = [t.c / k2, -t.s / k2, t.s / k2, t.c / k2, -(t.c * t.tx + t.s * t.ty) / k2, (t.s * t.tx - t.c * t.ty) / k2];
  const sheetPng = await sharp(it.ref).png().toBuffer();
  const refSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${VIEWBOX}"><rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" fill="#FBF7EE"/><image width="${(await sharp(it.ref).metadata()).width}" height="${(await sharp(it.ref).metadata()).height}" transform="matrix(${inv.join(' ')})" xlink:href="data:image/png;base64,${sheetPng.toString('base64')}"/></svg>`;
  const tiles = [
    await sharp(Buffer.from(refSvg)).resize(W, H).png().toBuffer(),
    await sharp({ create: { width: W, height: H, channels: 4, background: '#FBF7EE' } })
      .composite([{ input: await sharp(Buffer.from(minaStaticSvg(it.look)), { density: 300 }).resize(W, H).png().toBuffer() }])
      .png()
      .toBuffer(),
    await sharp(readFileSync(mid)).resize(W, H).flatten({ background: '#FFFFFF' }).png().toBuffer(),
    await sharp(readFileSync(end)).resize(W, H).flatten({ background: '#FFFFFF' }).png().toBuffer(),
  ];
  const labels = ['Foglio (prima fila)', 'Posa statica nell’app', 'App: a metà movimento', 'App: gesto completo'];
  const head = 36;
  const comps: OverlayOptions[] = [];
  tiles.forEach((tile, i) => {
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${head}"><text x="8" y="25" font-size="18" font-family="DejaVu Sans, Arial" font-weight="bold" fill="#1D4A32">${labels[i]}</text></svg>`), left: i * (W + 10), top: 0 });
    comps.push({ input: tile, left: i * (W + 10), top: head });
  });
  await sharp({ create: { width: 4 * W + 30, height: H + head, channels: 4, background: '#FFFFFF' } })
    .composite(comps)
    .png()
    .toFile(out);
  process.stdout.write(`${out}\n`);
}

void main();
