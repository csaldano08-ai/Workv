import sharp, { type Metadata } from 'sharp';
import { IMAGE } from './config';

/** Controlli tecnici automatici e ottimizzazione per l'app. */

export interface TechnicalReport {
  ok: boolean;
  width: number;
  height: number;
  notes: string[];
}

export async function technicalCheck(source: Buffer): Promise<TechnicalReport> {
  const notes: string[] = [];
  let meta: Metadata;
  try {
    meta = await sharp(source).metadata();
  } catch {
    return { ok: false, width: 0, height: 0, notes: ['File immagine non decodificabile'] };
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < IMAGE.minSourceWidth) notes.push(`Larghezza insufficiente (${width}px)`);
  const ratio = width / Math.max(1, height);
  if (Math.abs(ratio - 4 / 3) > 0.25) notes.push(`Proporzioni lontane da 4:3 (${ratio.toFixed(2)}): verrà ritagliata al centro`);
  const stats = await sharp(source).stats();
  const spread = stats.channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
  if (spread < 12) notes.push('Immagine quasi uniforme: probabile generazione vuota');
  const ok = width >= IMAGE.minSourceWidth && spread >= 12;
  return { ok, width, height, notes };
}

/** Versione per le card: 800×600 JPEG progressivo, ritaglio centrale 4:3. */
export async function toCardJpeg(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(IMAGE.cardWidth, IMAGE.cardHeight, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: IMAGE.jpegQuality, progressive: true, mozjpeg: true })
    .toBuffer();
}

export async function toThumbJpeg(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(IMAGE.thumbWidth, IMAGE.thumbHeight, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();
}

/** Hash percettivo (dHash 8×8, 64 bit) per riconoscere immagini duplicate tra ricette diverse. */
export async function perceptualHash(image: Buffer): Promise<string> {
  const { data } = await sharp(image).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}
