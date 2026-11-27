/**
 * Tavola di Mina 2.0: tutte le pose (statiche, come appaiono a fine gesto) ed espressioni, in un PNG.
 *   npx tsx scripts/mascot/sheet-mina2.ts <out.png> [pose singole: cartella]
 * Con il secondo argomento esporta anche un PNG trasparente 1024 px per posa (asset per i video).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { minaStaticSvg, type Eyes, type Mouth } from '../../src/ui/mascot/mina2/art';
import { MINA_POSES, POSES, REST } from '../../src/ui/mascot/mina2/poses';

const CELL = 300;

async function cell(svgText: string, label: string): Promise<OverlayOptions[]> {
  void label;
  const png = await sharp(Buffer.from(svgText), { density: 300 }).resize(CELL - 20, Math.round((CELL - 20) * 1.16)).png().toBuffer();
  return [{ input: png }];
}

async function main() {
  const [out, dir] = process.argv.slice(2);
  const items: { svg: string; label: string }[] = MINA_POSES.map((p) => ({ svg: minaStaticSvg(POSES[p].look), label: p }));
  const eyes: Eyes[] = ['open', 'happy', 'closed', 'wink', 'laugh', 'star', 'heart', 'surprised'];
  const mouths: Mouth[] = ['smile', 'grin', 'small', 'o', 'hmm', 'smile', 'grin', 'o'];
  eyes.forEach((e, i) => {
    const variant = i % 2 ? 'chef' : 'classic';
    items.push({ svg: minaStaticSvg({ variant, eyes: e, mouth: mouths[i], armL: REST[variant].l, armR: REST[variant].r }), label: `${e}/${mouths[i]}` });
  });
  const cols = 6;
  const rows = Math.ceil(items.length / cols);
  const H = Math.round(CELL * 1.16);
  const comps: OverlayOptions[] = [];
  for (let i = 0; i < items.length; i++) {
    const [c] = await cell(items[i].svg, items[i].label);
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="24"><text x="${CELL / 2}" y="17" font-size="16" text-anchor="middle" font-family="Arial" fill="#20352A">${items[i].label}</text></svg>`;
    comps.push({ ...c, left: (i % cols) * CELL + 10, top: Math.floor(i / cols) * (H + 24) + 4 });
    comps.push({ input: Buffer.from(labelSvg), left: (i % cols) * CELL, top: Math.floor(i / cols) * (H + 24) + H });
  }
  await sharp({ create: { width: cols * CELL, height: rows * (H + 24), channels: 4, background: '#FBFCFA' } })
    .composite(comps)
    .png()
    .toFile(out);
  if (dir) {
    mkdirSync(dir, { recursive: true });
    for (const p of MINA_POSES) {
      await sharp(Buffer.from(minaStaticSvg(POSES[p].look, { shadow: false })), { density: 600 })
        .resize(1024)
        .png()
        .toFile(join(dir, `mina2_${p}.png`));
    }
  }
  process.stdout.write(`ok ${items.length} celle\n`);
}

void main();
