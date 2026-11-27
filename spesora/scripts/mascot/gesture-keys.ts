/**
 * Pose chiave di un gesto disegnate dallo scheletro (inizio, intermedia, estensione massima, ritorno, riposo):
 * controllo che le braccia restino continue e attaccate in ogni fase.
 *   npx tsx scripts/mascot/gesture-keys.ts <out.png>
 */
import sharp from 'sharp';
import { minaStaticSvg, type MinaLook } from '../../src/ui/mascot/mina2/art';
import { ARM, CHEF_ARM, POSES } from '../../src/ui/mascot/mina2/poses';

const base = POSES.neutral.look;
const chef = POSES.recipe.look;
const ROWS: { label: string; look: MinaLook }[] = [
  { label: 'saluto · inizio (riposo)', look: base },
  { label: 'saluto · braccio aperto', look: { ...base, armR: ARM.liftWaveR } },
  { label: 'saluto · mano in alto', look: { ...base, armR: ARM.waveR, mouth: 'grin' } },
  { label: 'saluto · ritorno', look: { ...base, armR: ARM.liftWaveR } },
  { label: 'saluto · riposo', look: base },
  { label: 'festa · braccia su', look: POSES.success.look },
  { label: 'pensierosa', look: POSES.thinking.look },
  { label: 'chef · riposo', look: { ...chef, armR: CHEF_ARM.restR, armL: CHEF_ARM.restL } },
  { label: 'chef · cucchiaio su', look: POSES.cooking.look },
  { label: 'chef · mescola', look: POSES.mixing.look },
];

async function main() {
  const out = process.argv[2];
  const cell = 300;
  const h = Math.round((cell * 260) / 240);
  const tiles = await Promise.all(
    ROWS.map(async (r) => {
      const img = await sharp(Buffer.from(minaStaticSvg(r.look, { viewBox: '-20 -30 240 260' })), { density: 300 }).resize(cell, h).png().toBuffer();
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="26"><text x="6" y="19" font-size="16" font-family="DejaVu Sans" fill="#333">${r.label}</text></svg>`);
      return sharp({ create: { width: cell, height: h + 26, channels: 4, background: '#FBF6EE' } }).composite([{ input: label, top: 0, left: 0 }, { input: img, top: 26, left: 0 }]).png().toBuffer();
    }),
  );
  const cols = 5;
  await sharp({ create: { width: cols * cell, height: Math.ceil(ROWS.length / cols) * (h + 26), channels: 4, background: '#FFFFFF' } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * cell, top: Math.floor(i / cols) * (h + 26) })))
    .png()
    .toFile(out);
}

void main();
