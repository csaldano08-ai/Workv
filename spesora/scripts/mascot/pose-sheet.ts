import sharp from 'sharp';
import { minaStaticSvg } from '../../src/ui/mascot/mina2/art';
import { POSES } from '../../src/ui/mascot/mina2/poses';
const [out, list, cellArg] = process.argv.slice(2);
const names = list.split(',');
const cell = Number(cellArg ?? 300);
(async () => {
  const tiles = await Promise.all(names.map(async (n) => {
    const svg = minaStaticSvg((POSES as any)[n].look, { viewBox: '-20 -30 240 260' });
    const img = await sharp(Buffer.from(svg), { density: 300 }).resize(cell, Math.round(cell * 260 / 240)).png().toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="24"><text x="6" y="18" font-size="16" font-family="DejaVu Sans" fill="#333">${n}</text></svg>`);
    return sharp({ create: { width: cell, height: Math.round(cell * 260 / 240) + 24, channels: 4, background: '#FBF6EE' } }).composite([{ input: label, top: 0, left: 0 }, { input: img, top: 24, left: 0 }]).png().toBuffer();
  }));
  const h = Math.round(cell * 260 / 240) + 24;
  const cols = Math.min(names.length, 5);
  const rows = Math.ceil(names.length / cols);
  await sharp({ create: { width: cols * cell, height: rows * h, channels: 4, background: '#FFFFFF' } }).composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * cell, top: Math.floor(i / cols) * h }))).png().toFile(out);
})();
