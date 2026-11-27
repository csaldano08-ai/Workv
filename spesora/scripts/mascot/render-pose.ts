/**
 * Disegna una posa di Mina (statica, come nel codice) in un PNG, anche ritagliata, per i controlli di qualità.
 *   npx tsx scripts/mascot/render-pose.ts <posa> <out.png> [viewBox "x y w h"] [larghezza px]
 */
import sharp from 'sharp';
import { minaStaticSvg } from '../../src/ui/mascot/mina2/art';
import { POSES, resolvePose } from '../../src/ui/mascot/mina2/poses';

const [pose, out, vb, width = '1000'] = process.argv.slice(2);
const svg = minaStaticSvg(POSES[resolvePose(pose)].look, { viewBox: vb || undefined });
void sharp(Buffer.from(svg), { density: 600 })
  .resize(Number(width))
  .png()
  .toFile(out)
  .then(() => process.stdout.write(`${out}\n`));
