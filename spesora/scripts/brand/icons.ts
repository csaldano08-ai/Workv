/**
 * Icone e splash di MINA generati dal disegno vettoriale di Mina 2.0 e dal logo.
 *   npx tsx scripts/brand/icons.ts
 * - assets/icon.png (iOS e store, 1024): solo Mina 2.0 su fondo avorio, senza scritta (iOS applica la maschera).
 * - assets/android-icon-foreground.png (1024, trasparente): Mina dentro l'area sicura dell'icona adattiva
 *   (cerchio di 66 dp su 108: la figura sta in un cerchio di 70 dp, nessuna parte essenziale viene tagliata).
 * - assets/android-icon-background.png (1024): fondo avorio pieno.
 * - assets/android-icon-monochrome.png (1024): sagoma per le icone a tema di Android 13+ (contorni pieni,
 *   superfici chiare semitrasparenti: il viso resta leggibile).
 * - assets/favicon.png (48) e assets/splash-icon.png (1024, Mina sopra il logo, fondo trasparente).
 */
import sharp, { type Sharp } from 'sharp';
import { brand } from '../../src/theme/tokens';
import { minaStaticSvg, type MinaLook } from '../../src/ui/mascot/mina2/art';
import { ARM } from '../../src/ui/mascot/mina2/poses';
import { LOGO_RATIO, minaLogoSvg } from '../../src/ui/brand/logoArt';

/** Mina dell'icona: come nel riferimento, saluta con la destra, sorride, borsa appena inclinata, senza gambe. */
const ICON_LOOK: MinaLook = { variant: 'classic', eyes: 'open', mouth: 'grin', armL: ARM.restL, armR: ARM.waveR, lean: -5 };

async function mascot(px: number, look: MinaLook, legs: boolean): Promise<Buffer> {
  // riquadro più largo del disegno: con l'inclinazione la lattuga e il pane escono dal riquadro standard
  const svg = minaStaticSvg(look, { shadow: false, legs, viewBox: '-30 -30 260 270' });
  const raw = await sharp(Buffer.from(svg), { density: 600 }).resize(px * 2, px * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  // ritaglio stretto sulla figura, poi ridimensionata al lato richiesto
  return sharp(raw).trim({ threshold: 1 }).resize(px, px, { fit: 'inside' }).png().toBuffer();
}

async function place(canvas: number, bg: string | null, fig: Buffer, cy = 0.5): Promise<Sharp> {
  const m = await sharp(fig).metadata();
  const left = Math.round((canvas - (m.width ?? 0)) / 2);
  const top = Math.round(canvas * cy - (m.height ?? 0) / 2);
  const base = sharp({ create: { width: canvas, height: canvas, channels: 4, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([{ input: fig, left, top }]);
}

async function main() {
  // iOS: figura grande (75% del lato, margini per la maschera arrotondata), appena sopra il centro come nel riferimento
  const iosFig = await mascot(770, ICON_LOOK, false);
  const ios = await (await place(1024, brand.iconBg, iosFig, 0.52)).png().toBuffer();
  await sharp(ios).flatten({ background: brand.iconBg }).png().toFile('assets/icon.png');

  // Android: cerchio sicuro di 66 dp su 108 → la figura sta in un riquadro di circa 48 dp (45% della tela)
  const andFig = await mascot(Math.round(1024 * 0.47), ICON_LOOK, false);
  await (await place(1024, null, andFig, 0.5)).png().toFile('assets/android-icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: brand.iconBg } }).png().toFile('assets/android-icon-background.png');

  // monocromatica: opacità dai toni scuri (contorni, occhi, bocca) e trasparenza parziale sulle superfici chiare
  const fg = await sharp(await (await place(1024, null, andFig, 0.5)).png().toBuffer()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = fg;
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3] / 255;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const alpha = a * (lum < 0.5 ? 1 : 0.38);
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile('assets/android-icon-monochrome.png');

  // favicon
  const fav = await (await place(192, brand.iconBg, await mascot(164, ICON_LOOK, false), 0.52)).png().toBuffer();
  await sharp(fav).resize(48, 48).flatten({ background: brand.iconBg }).png().toFile('assets/favicon.png');

  // splash: Mina (con le gambe, come nel benvenuto) sopra il logo, fondo trasparente (il colore è in app.json)
  const splashMina = await mascot(560, { ...ICON_LOOK, legs: 'walk', emote: 'sparkles' }, true);
  const logoW = 760;
  const logo = await sharp(Buffer.from(minaLogoSvg()), { density: 300 }).resize(logoW, Math.round(logoW / LOGO_RATIO)).png().toBuffer();
  const sm = await sharp(splashMina).metadata();
  const lm = await sharp(logo).metadata();
  const H = 1024;
  const gap = 36;
  const total = (sm.height ?? 0) + gap + (lm.height ?? 0);
  const top = Math.round((H - total) / 2);
  await sharp({ create: { width: 1024, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: splashMina, left: Math.round((1024 - (sm.width ?? 0)) / 2), top },
      { input: logo, left: Math.round((1024 - (lm.width ?? 0)) / 2), top: top + (sm.height ?? 0) + gap },
    ])
    .png()
    .toFile('assets/splash-icon.png');
  process.stdout.write('icone e splash aggiornati\n');
}

void main();
