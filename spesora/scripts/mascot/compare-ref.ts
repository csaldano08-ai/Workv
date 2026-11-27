/**
 * Confronto a pari scala tra i fogli di riferimento e il disegno di Mina nel codice.
 *   npx tsx scripts/mascot/compare-ref.ts <out.png> [fase: statica|tutte]
 * Per ogni posa: il ritaglio del foglio, la posa dell'app disegnata nello stesso riquadro e la sovrapposizione
 * (app al 50% sopra il foglio). L'allineamento è una similitudine (scala, rotazione, spostamento) calcolata sugli
 * angoli della borsa: così si vedono le differenze vere di proporzioni, tratto, viso e arti.
 */
import sharp, { type OverlayOptions } from 'sharp';
import { RIG, minaStaticSvg, type MinaLook } from '../../src/ui/mascot/mina2/art';
import { POSES } from '../../src/ui/mascot/mina2/poses';

type P = [number, number];
interface Item {
  label: string;
  ref: string;
  /** Ritaglio del foglio: x0, y0, x1, y1 (pixel del foglio). */
  crop: [number, number, number, number];
  /** Angoli della borsa nel foglio (pixel del foglio). */
  refPts: P[];
  look: MinaLook;
  /** Gli stessi angoli nel disegno dell'app (unità del disegno, prima dell'inclinazione della posa). */
  ourPts: P[];
}

const SHEET = 'docs/restyling/riferimenti/mina2_foglio_approvato.webp';
const CHEF = 'docs/restyling/riferimenti/mina_chef_style_reference.png';
// angoli della borsa: Mina 2.0 (scatola BOX) e Mina Chef (CHEF_BOX), in alto a sinistra, in alto a destra, in basso a destra
const CLASSIC_BOX: P[] = [
  [37, 80],
  [161, 79],
  [157.5, 172],
  [43, 173],
];
const CHEF_BOX: P[] = [
  [47, 99],
  [139.3, 82],
  [145, 176],
];

export const ITEMS: Item[] = [
  {
    label: 'Mina 2.0 — saluto',
    ref: SHEET,
    crop: [40, 90, 500, 545],
    refPts: [
      [124, 290],
      [393, 242],
      [410, 452],
      [155, 474],
    ],
    look: POSES.welcome.look,
    ourPts: CLASSIC_BOX,
  },
  {
    label: 'Mina Chef — cucchiaio',
    ref: CHEF,
    crop: [40, 470, 350, 830],
    refPts: [
      [95, 644],
      [239, 611],
      [253.5, 769],
    ],
    look: POSES.cooking.look,
    ourPts: CHEF_BOX,
  },
];

/** Similitudine (scala, rotazione, spostamento) ai minimi quadrati che porta `a` su `b`. */
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
  // x' = c·x − s·y + tx ; y' = s·x + c·y + ty
  return { c, s, tx: mb[0] - (c * ma[0] - s * ma[1]), ty: mb[1] - (s * ma[0] + c * ma[1]), scale: Math.hypot(c, s), angle: (Math.atan2(s, c) * 180) / Math.PI };
}

function rotate(p: P, deg: number, o: { x: number; y: number }): P {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - o.x;
  const dy = p[1] - o.y;
  return [o.x + dx * Math.cos(a) - dy * Math.sin(a), o.y + dx * Math.sin(a) + dy * Math.cos(a)];
}

export async function compareRow(it: Item, cell = 460) {
  const [x0, y0, x1, y1] = it.crop;
  const w = x1 - x0;
  const h = y1 - y0;
  const k = cell / w;
  const lean = it.look.lean ?? 0;
  const ours = it.ourPts.map((p) => rotate(p, lean, RIG[it.look.variant].leanPivot));
  const refLocal = it.refPts.map(([x, y]) => [(x - x0) * k, (y - y0) * k] as P);
  const t = fit(ours, refLocal);
  const inner = minaStaticSvg(it.look, { shadow: false }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const H = Math.round(h * k);
  const art = (opacity: number) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${H}" viewBox="0 0 ${cell} ${H}"><g opacity="${opacity}" transform="matrix(${t.c} ${t.s} ${-t.s} ${t.c} ${t.tx} ${t.ty})">${inner}</g></svg>`);
  const ref = await sharp(it.ref).extract({ left: x0, top: y0, width: w, height: h }).resize(cell, H).png().toBuffer();
  const ourPng = await sharp({ create: { width: cell, height: H, channels: 4, background: '#FBF7EE' } })
    .composite([{ input: await sharp(art(1)).png().toBuffer() }])
    .png()
    .toBuffer();
  const over = await sharp(ref)
    .composite([{ input: await sharp(art(0.5)).png().toBuffer() }])
    .png()
    .toBuffer();
  return { tiles: [ref, ourPng, over], H, fit: t };
}

async function main() {
  const [out] = process.argv.slice(2);
  const cell = 460;
  const rows = await Promise.all(ITEMS.map((it) => compareRow(it, cell)));
  const head = 34;
  const total = rows.reduce((s, r) => s + r.H + head, 0);
  const comps: OverlayOptions[] = [];
  let y = 0;
  rows.forEach((r, i) => {
    const t = `${ITEMS[i].label}: foglio · app · sovrapposizione (app al 50%) — scala ${r.fit.scale.toFixed(3)}, rotazione ${r.fit.angle.toFixed(1)}°`;
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell * 3 + 20}" height="${head}"><text x="8" y="23" font-size="17" font-family="DejaVu Sans, Arial" font-weight="bold" fill="#1D4A32">${t}</text></svg>`), left: 0, top: y });
    r.tiles.forEach((tile, j) => comps.push({ input: tile, left: j * (cell + 10), top: y + head }));
    y += r.H + head;
  });
  await sharp({ create: { width: cell * 3 + 20, height: total, channels: 4, background: '#FFFFFF' } })
    .composite(comps)
    .png()
    .toFile(out);
  for (const [i, r] of rows.entries()) process.stdout.write(`${ITEMS[i].label}: scala ${r.fit.scale.toFixed(3)} rotazione ${r.fit.angle.toFixed(1)}°\n`);
}

if (require.main === module) void main();
