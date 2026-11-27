/**
 * Confronto del logo vettoriale con il logo approvato (ritaglio del riferimento ingrandito 4×).
 *   npx tsx scripts/brand/compare-logo.ts <out.png>
 * Righe: riferimento · logo dell'app · sovrapposizione (app al 55% sopra il riferimento).
 * Le coordinate del disegno coincidono con i pixel del ritaglio, quindi non serve alcun allineamento.
 */
import sharp from 'sharp';
import { minaLogoSvg } from '../../src/ui/brand/logoArt';

const REF = 'docs/mina/riferimenti/logo_riferimento_4x.png';

async function main() {
  const out = process.argv[2] ?? 'docs/mina/confronti/logo_confronto.png';
  const full = (o: string) => minaLogoSvg().replace(/viewBox="[^"]*"/, `viewBox="0 0 1240 400" width="1240" height="400"${o}`);
  const ours = await sharp(Buffer.from(full(''))).png().toBuffer();
  const half = await sharp(Buffer.from(full(' opacity="0.55"'))).png().toBuffer();
  const ref = await sharp(REF).png().toBuffer();
  const oursBg = await sharp({ create: { width: 1240, height: 400, channels: 4, background: '#FDF7F0' } }).composite([{ input: ours }]).png().toBuffer();
  const over = await sharp(ref).composite([{ input: half }]).png().toBuffer();
  await sharp({ create: { width: 1240, height: 1220, channels: 4, background: '#FFFFFF' } })
    .composite([
      { input: ref, top: 0, left: 0 },
      { input: oursBg, top: 410, left: 0 },
      { input: over, top: 820, left: 0 },
    ])
    .png()
    .toFile(out);
  process.stdout.write(`${out}\n`);
}

void main();
